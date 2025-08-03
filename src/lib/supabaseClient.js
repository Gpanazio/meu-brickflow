import { createClient } from '@supabase/supabase-js'
import { debugLog } from '../utils/debugLog'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function handleSupabaseError(error, context = 'Supabase') {
  if (error) {
    debugLog(`⚠️ Erro em ${context}:`, error.message)
  }
}
