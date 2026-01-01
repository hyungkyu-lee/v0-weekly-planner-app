import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_PLANNERSUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_PLANNERSUPABASE_ANON_KEY!

  console.log("[v0] Server: Creating Supabase client with URL:", supabaseUrl ? "✓ URL found" : "✗ URL missing")
  console.log("[v0] Server: Anon key:", supabaseAnonKey ? "✓ Key found" : "✗ Key missing")

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[v0] Server: Missing Supabase credentials!")
    throw new Error("Missing Supabase environment variables")
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The "setAll" method was called from a Server Component.
          // This can be ignored if you have proxy refreshing user sessions.
        }
      },
    },
  })
}
