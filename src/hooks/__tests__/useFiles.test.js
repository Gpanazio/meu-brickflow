import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

function wrapper({ children }) {
  return children
}

describe('useFiles', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should start with empty list', async () => {
    const { useFiles } = await import('../useFiles')
    const { result } = renderHook(() => useFiles(null, null, {}), { wrapper })
    expect(result.current.files).toEqual([])
  })
})
