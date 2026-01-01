"use server"

export async function getSupabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_PLANNERSUPABASE_URL!,
    anonKey: process.env.SUPABASE_PUBLISHABLE_KEY! || process.env.SUPABASE_ANON_KEY!,
  }
}
