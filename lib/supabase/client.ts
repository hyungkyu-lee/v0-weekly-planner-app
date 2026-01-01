import { createBrowserClient } from "@supabase/ssr"

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

// Supabase configuration - anon key is public by design
// Real security comes from Row Level Security (RLS) policies in the database
const SUPABASE_CONFIG = {
  url: "https://uhucfnnhzbvlatjhtthv.supabase.co",
  anonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVodWNmbm5oemJ2bGF0amh0dGh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyMzM4NTMsImV4cCI6MjA4MjgwOTg1M30._GdPJJxUNpTXKTvSJtx07kiGOjxBx9KVA12GQqnnwyc",
}

export function createClient() {
  if (supabaseClient) {
    return supabaseClient
  }

  supabaseClient = createBrowserClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })

  return supabaseClient
}
