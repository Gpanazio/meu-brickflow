import { createClient } from '@supabase/supabase-js'
import { debugLog } from '../utils/debugLog'

export const VITE_SUPABASE_URL_KEY = 'VITE_SUPABASE_URL'
export const VITE_SUPABASE_ANON_KEY_NAME = 'VITE_SUPABASE_ANON_KEY'

const isTestEnv = import.meta.env.MODE === 'test'

const missingVariables = [
  !import.meta.env.VITE_SUPABASE_URL && VITE_SUPABASE_URL_KEY,
  !import.meta.env.VITE_SUPABASE_ANON_KEY && VITE_SUPABASE_ANON_KEY_NAME
].filter(Boolean)

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || (isTestEnv ? 'http://localhost:54321' : '')
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || (isTestEnv ? 'test-anon-key' : '')
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)

if (missingVariables.length > 0) {
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

const createNoopResult = (data = []) =>
  Promise.resolve({
    data,
    error: {
      message: supabaseConfigError || 'Supabase não configurado.'
    }
  })

const createNoopBuilder = (defaultData = []) => {
  const result = createNoopResult(defaultData)
  const builder = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    delete: () => builder,
    upsert: () => builder,
    eq: () => builder,
    limit: () => builder,
    order: () => builder,
    maybeSingle: () => createNoopResult(null),
    then: (...args) => result.then(...args),
    catch: (...args) => result.catch(...args),
    finally: (...args) => result.finally(...args)
  }
  return builder
}

const createNoopChannel = () => {
  const channel = {
    on: () => channel,
    subscribe: () => channel,
    unsubscribe: () => {}
  }
  return channel
}

const noopSupabase = {
  from: () => createNoopBuilder([]),
  channel: () => createNoopChannel()
}

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : noopSupabase

export function handleSupabaseError(error, context = 'Supabase') {
  if (error) {
    debugLog(`⚠️ Erro em ${context}:`, error.message)
  }
}
