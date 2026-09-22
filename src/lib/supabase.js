import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && key)

// null when keys are missing, so the UI can still render (and say why nothing saves).
export const supabase = isConfigured
  ? createClient(url, key, { auth: { flowType: 'pkce' } })
  : null
