const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url) {
  throw new Error('Environment variable VITE_SUPABASE_URL is required')
}

if (!anonKey) {
  throw new Error('Environment variable VITE_SUPABASE_ANON_KEY is required')
}

export const SUPABASE_URL = url
export const SUPABASE_ANON_KEY = anonKey

export default { SUPABASE_URL, SUPABASE_ANON_KEY }
