import { renderHook, act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { useUsers } from '../useUsers'
import { toast } from 'sonner'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const apiUsers = [
  { username: 'admin', pin: '1234', displayName: 'Admin' },
  { username: 'fran', pin: '1234', displayName: 'Fran' }
]

function useUsersHarness() {
  const [users, setUsers] = useState(apiUsers)
  return useUsers(users, setUsers)
}

function wrapper({ children }) {
  return children
}

describe('useUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    /* eslint-disable-next-line no-undef */
    global.fetch = vi.fn(async (url) => {
      if (url === '/api/health') {
        return { ok: true, json: async () => ({ status: 'ok' }) }
      }

      if (url === '/api/auth/me') {
        return { ok: true, json: async () => ({ user: null }) }
      }

      if (url === '/api/auth/login') {
        return { ok: false, json: async () => ({ error: 'Usuário ou PIN incorretos.' }) }
      }

      if (url === '/api/auth/register') {
        return { ok: false, json: async () => ({ error: 'Usuário já existe.' }) }
      }

      return { ok: false, status: 404, json: async () => ({}) }
    })
  })

  it('should initialize without user', async () => {
    const { result } = renderHook(() => useUsersHarness(), { wrapper })

    await waitFor(() => {
      expect(result.current.showLoginModal).toBe(true)
    })

    expect(result.current.currentUser).toBeNull()
  })

  it('notifies when login credentials are invalid', async () => {
    const { result } = renderHook(() => useUsersHarness(), { wrapper })

    await waitFor(() => {
      expect(result.current.isDatabaseReady).toBe(true)
    })

    await act(async () => {
      await result.current.handleLogin('foo', '1234')
    })

    expect(toast.error).toHaveBeenCalledWith('Usuário ou PIN incorretos.')
  })

  it('notifies when creating existing user', async () => {
    const { result } = renderHook(() => useUsersHarness(), { wrapper })

    await waitFor(() => {
      expect(result.current.isDatabaseReady).toBe(true)
    })

    await act(async () => {
      await result.current.handleCreateUser({
        username: 'admin',
        displayName: 'Admin',
        pin: '1234'
      })
    })

    expect(toast.error).toHaveBeenCalledWith('Usuário já existe.')
  })
})
