import { createBrowserClient } from "@supabase/ssr"

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (supabaseClient) {
    return supabaseClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_PLANNERSUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_PLANNERSUPABASE_ANON_KEY!

  console.log("[v0] Creating Supabase client with URL:", supabaseUrl ? "✓ URL found" : "✗ URL missing")
  console.log("[v0] Anon key:", supabaseAnonKey ? "✓ Key found" : "✗ Key missing")

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[v0] Missing Supabase credentials!")
    throw new Error("Missing Supabase environment variables")
  }

  supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
  return supabaseClient
}
