import { createClient } from '@supabase/supabase-js'
import { debugLog } from '../utils/debugLog'

const isTestEnv = import.meta.env.MODE === 'test' || process.env.NODE_ENV === 'test'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || (isTestEnv ? 'http://localhost:54321' : '')
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || (isTestEnv ? 'test-anon-key' : '')
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)
const missingVariables = [
  !supabaseUrl && 'VITE_SUPABASE_URL',
  !supabaseAnonKey && 'VITE_SUPABASE_ANON_KEY'
].filter(Boolean)

if (!hasSupabaseConfig) {
  const message = `Missing environment variable(s): ${missingVariables.join(' and ')}`
  console.warn(message)
  if (isTestEnv) {
    console.warn('Using test defaults for Supabase.')
  }
}

export const supabaseConfigError = hasSupabaseConfig
  ? ''
  : `Supabase não configurado. Faltando: ${missingVariables.join(' e ')}.`

export { hasSupabaseConfig }

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export function handleSupabaseError(error, context = 'Supabase') {
  if (error) {
    debugLog(`⚠️ Erro em ${context}:`, error.message)
  }
}
