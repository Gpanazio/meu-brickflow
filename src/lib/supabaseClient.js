import { createClient } from '@supabase/supabase-js'
import { debugLog } from '../utils/debugLog'

export const VITE_SUPABASE_URL_KEY = 'VITE_SUPABASE_URL'
export const VITE_SUPABASE_ANON_KEY_NAME = 'VITE_SUPABASE_ANON_KEY'

const isTestEnv = import.meta.env.MODE === 'test'

// Verificação explícita das variáveis
const envUrl = import.meta.env.VITE_SUPABASE_URL
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const missingVariables = []
if (!envUrl) missingVariables.push(VITE_SUPABASE_URL_KEY)
if (!envKey) missingVariables.push(VITE_SUPABASE_ANON_KEY_NAME)

// Logs de diagnóstico para ajudar a debugar no Railway
console.log('[Supabase Setup] Ambiente:', import.meta.env.MODE)
console.log('[Supabase Setup] URL detectada:', envUrl ? 'Sim (********)' : 'NÃO')
console.log('[Supabase Setup] Key detectada:', envKey ? 'Sim (********)' : 'NÃO')

const supabaseUrl = envUrl || (isTestEnv ? 'http://localhost:54321' : '')
const supabaseAnonKey = envKey || (isTestEnv ? 'test-anon-key' : '')
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)

if (missingVariables.length > 0) {
  const message = `⚠️ Erro Crítico: Variáveis de ambiente faltando: ${missingVariables.join(' e ')}. Verifique se no Railway elas começam com VITE_.`
  console.error(message)
}

export const supabaseConfigError = hasSupabaseConfig
  ? ''
  : `Supabase desconectado. Faltando: ${missingVariables.join(' e ')}.`

export { hasSupabaseConfig }

/**
 * Creates a resolved no-op Supabase response object.
 */
export const createNoopResult = (data = []) =>
  Promise.resolve({
    data,
    error: {
      message: supabaseConfigError || 'Supabase não configurado corretamente.'
    }
  })

/**
 * Creates a no-op query builder mimic.
 */
export const createNoopBuilder = (defaultData = []) => {
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

/**
 * Creates a no-op realtime channel.
 */
export const createNoopChannel = () => {
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
    console.error(`[${context}] Erro:`, error.message || error)
    debugLog(`⚠️ Erro em ${context}:`, error.message)
  }
}
