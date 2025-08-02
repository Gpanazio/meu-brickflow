import { render } from '@testing-library/react'
import { describe, it, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'

describe('App', () => {
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

  it('renders without crashing', async () => {
    const App = (await import('../App.jsx')).default
    render(<App />)
  })
})
