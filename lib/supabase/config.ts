"use server"

export async function getSupabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_PLANNERSUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_PLANNERSUPABASE_PUBLISHABLE_KEY!,
  }
}
