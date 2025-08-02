import { describe, it, expect, vi, afterEach } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('supabase config', () => {
  it('throws when env variables are missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    await expect(import('../supabase.js')).rejects.toThrow(/VITE_SUPABASE_URL/)
  })

  it('exports variables when present', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon')
    const config = await import('../supabase.js')
    expect(config.SUPABASE_URL).toBe('https://example.supabase.co')
    expect(config.SUPABASE_ANON_KEY).toBe('anon')
  })
})
