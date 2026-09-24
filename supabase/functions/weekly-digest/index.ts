// weekly-digest — sends each user a short email with a few links worth revisiting.
//
// Unlike enrich-link, this doesn't run as any one user: it's meant to be triggered on a
// schedule (see the setup notes in README.md) and reads every user's data with the
// service role key, sending each of them their own picks from rediscover_links_for().
//
// Needs two project secrets before it will send anything:
//   RESEND_API_KEY   — from resend.com (or swap sendEmail() below for another provider)
//   RESEND_FROM      — a "Name <you@yourdomain.com>" address on a domain verified in Resend
// Set them with:
//   supabase secrets set RESEND_API_KEY=... RESEND_FROM="Recall <hello@yourdomain.com>"

import { createClient } from 'npm:@supabase/supabase-js@2'

const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:5173'
const RESEND_KEY = Deno.env.get('RESEND_API_KEY')
const FROM = Deno.env.get('RESEND_FROM')
const PICKS_PER_USER = 3

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

function emailHtml(name: string, links: { title: string | null; domain: string; url: string; note: string | null }[]) {
  const rows = links.map((l) => `
    <tr><td style="padding:18px 0;border-top:1px solid #ddd6c8;">
      <p style="margin:0;font:13px system-ui,sans-serif;color:#6b655b;">${esc(l.domain)}</p>
      <p style="margin:6px 0 0;font:22px/1.3 Georgia,serif;">
        <a href="${esc(l.url)}" style="color:#1f1d1a;text-decoration:none;">${esc(l.title || l.domain)}</a>
      </p>
      ${l.note ? `<p style="margin:6px 0 0;font:italic 15px Georgia,serif;color:#6b655b;">“${esc(l.note)}”</p>` : ''}
    </td></tr>`).join('')

  return `<!doctype html><html><body style="margin:0;background:#f6f2ea;color:#1f1d1a;">
    <table role="presentation" width="100%"><tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" style="max-width:480px;">
        <tr><td style="font:24px Georgia,serif;padding-bottom:4px;">Recall<span style="color:#b5532f;">.</span></td></tr>
        <tr><td style="font:15px system-ui,sans-serif;color:#6b655b;padding-bottom:8px;">
          A few things you saved and might want back, ${esc(name)}.
        </td></tr>
        ${rows}
        <tr><td style="padding-top:28px;">
          <a href="${esc(APP_URL)}/app" style="display:inline-block;background:#b5532f;color:#fffaf3;
            font:500 15px system-ui,sans-serif;padding:10px 20px;border-radius:6px;text-decoration:none;">
            Open your library
          </a>
        </td></tr>
        <tr><td style="padding-top:36px;font:12.5px system-ui,sans-serif;color:#8a8377;">
          You're getting this because you have a Recall account.
          <a href="${esc(APP_URL)}/app/settings" style="color:#8a8377;">Change email preferences</a>.
        </td></tr>
      </table>
    </td></tr></table>
  </body></html>`
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })
  if (!res.ok) throw new Error(`Resend responded ${res.status}: ${await res.text()}`)
}

Deno.serve(async (req) => {
  // A shared secret (not the anon key) stops random callers from triggering mail to every user.
  const auth = req.headers.get('Authorization')
  const expected = Deno.env.get('DIGEST_TRIGGER_SECRET')
  if (expected && auth !== `Bearer ${expected}`) return json({ error: 'Not authorized.' }, 401)

  if (!RESEND_KEY || !FROM) {
    return json({ error: 'RESEND_API_KEY and RESEND_FROM are not set for this project yet.' }, 501)
  }

  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,   // service role: this runs for every user, not just one
  )

  // Sends to every user with an account. There is no unsubscribe or opt-in yet — see
  // README "Before this goes live" before pointing this at real users.
  const { data: users, error: userErr } = await supa.auth.admin.listUsers()
  if (userErr) return json({ error: userErr.message }, 500)

  const results: Record<string, string> = {}
  for (const user of users.users) {
    if (!user.email) continue
    try {
      // rediscover_links_for is a separate, locked-down function: only the service role can
      // call it, and it takes the user id as an argument instead of relying on RLS (which the
      // service role bypasses). See migration 0006 for why rediscover_links itself isn't used here.
      const { data: links, error: linksErr } = await supa
        .rpc('rediscover_links_for', { target_user_id: user.id, lim: PICKS_PER_USER })
      if (linksErr || !links?.length) { results[user.email] = linksErr ? `error: ${linksErr.message}` : 'nothing to send'; continue }

      const name = (user.user_metadata?.name as string) || user.email.split('@')[0]
      await sendEmail(user.email, 'A few things worth another look', emailHtml(name, links))
      results[user.email] = `sent (${links.length})`
    } catch (e) {
      results[user.email] = `failed: ${e instanceof Error ? e.message : String(e)}`
    }
  }
  return json({ sent: Object.values(results).filter((v) => v.startsWith('sent')).length, results })
})
