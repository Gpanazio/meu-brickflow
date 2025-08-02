import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

function wrapper({ children }) {
  return children
}

describe('useUsers', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon')
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    )
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('should initialize without user', async () => {
    const { useUsers } = await import('../useUsers')
    const { result } = renderHook(() => useUsers(), { wrapper })
    expect(result.current.currentUser).toBeNull()
  })
})
