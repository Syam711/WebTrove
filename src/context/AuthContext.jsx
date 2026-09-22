import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase, isConfigured } from '../lib/supabase'

const AuthContext = createContext(null)
const NOT_CONFIGURED = {
  error: { message: 'Supabase keys are missing. Add them to your .env file and restart.' },
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(isConfigured)
  const [demo, setDemo] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      loading,
      demo,
      startDemo: () => setDemo(true),
      async signIn(email, password) {
        if (!supabase) return NOT_CONFIGURED
        return supabase.auth.signInWithPassword({ email, password })
      },
      async signUp(email, password) {
        if (!supabase) return NOT_CONFIGURED
        return supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/app` },
        })
      },
      async signInWithGoogle() {
        if (!supabase) return NOT_CONFIGURED
        return supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${window.location.origin}/app` },
        })
      },
      async signOut() {
        setDemo(false)
        if (supabase) await supabase.auth.signOut()
      },
    }),
    [session, loading, demo]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
