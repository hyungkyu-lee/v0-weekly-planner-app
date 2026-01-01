"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import { createContext, useContext, useEffect, useState, useRef } from "react"

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const initialized = useRef(false)
  const renderCount = useRef(0)

  useEffect(() => {
    if (initialized.current) {
      console.log("[v0] AuthProvider: Already initialized, skipping")
      return
    }

    initialized.current = true
    console.log("[v0] AuthProvider: Initializing (ONLY ONCE)")
    const supabase = createClient()

    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        console.log("[v0] AuthProvider: Session loaded -", session?.user?.email || "No user")
        setUser(session?.user ?? null)
        setLoading(false)
      } catch (error) {
        console.error("[v0] AuthProvider: Error getting session:", error)
        setUser(null)
        setLoading(false)
      }
    }

    initAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[v0] AuthProvider: Auth state changed -", event, session?.user?.email || "No user")
      setUser(session?.user ?? null)
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "INITIAL_SESSION") {
        setLoading(false)
      }
    })

    return () => {
      console.log("[v0] AuthProvider: Cleanup called")
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    window.location.href = "/auth/login"
  }

  renderCount.current += 1
  console.log(
    `[v0] AuthProvider: Render #${renderCount.current} - loading: ${loading}, user: ${user?.email || "No user"}`,
  )

  return <AuthContext.Provider value={{ user, loading, signOut }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
