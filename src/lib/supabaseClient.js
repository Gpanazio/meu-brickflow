import { createClient } from '@supabase/supabase-js'
import { debugLog } from '../utils/debugLog'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [
    !supabaseUrl && 'VITE_SUPABASE_URL',
    !supabaseAnonKey && 'VITE_SUPABASE_ANON_KEY'
  ]
    .filter(Boolean)
    .join(' and ')
  const message = `Missing environment variable(s): ${missing}`
  console.warn(message)
  throw new Error(message)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function handleSupabaseError(error, context = 'Supabase') {
  if (error) {
    debugLog(`⚠️ Erro em ${context}:`, error.message)
  }
}
