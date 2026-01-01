"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import { createContext, useContext, useEffect, useState } from "react"

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
  const router = useRouter()

  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log("[v0] AuthProvider: Initializing Supabase client")
        const supabase = createClient()

        console.log("[v0] AuthProvider: Getting user")
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) {
          console.error("[v0] AuthProvider: Error getting user:", userError)
        } else {
          console.log("[v0] AuthProvider: User:", user ? `✓ Logged in as ${user.email}` : "✗ Not logged in")
          setUser(user)
        }

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
          console.log("[v0] AuthProvider: Auth state changed:", session?.user ? "User logged in" : "User logged out")
          setUser(session?.user ?? null)
        })

        setLoading(false)

        return () => subscription.unsubscribe()
      } catch (err) {
        console.error("[v0] AuthProvider: Fatal error:", err)
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  const signOut = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push("/auth/login")
    } catch (err) {
      console.error("[v0] AuthProvider: Error signing out:", err)
    }
  }

  return <AuthContext.Provider value={{ user, loading, signOut }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
