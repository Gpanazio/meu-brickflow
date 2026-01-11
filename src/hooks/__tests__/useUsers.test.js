import { renderHook, act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEffect, useState } from 'react'
import { useUsers } from '../useUsers'
import { toast } from 'sonner'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const apiState = {
  users: [
    { username: 'admin', pin: '1234', displayName: 'Admin' },
    { username: 'fran', pin: '1234', displayName: 'Fran' }
  ],
  projects: []
}

function useUsersFromApi() {
  const [data, setData] = useState(null)

  useEffect(() => {
    let isMounted = true
    fetch('/api/projects')
      .then((response) => response.json())
      .then((responseData) => {
        if (isMounted) {
          setData(responseData)
        }
      })
    return () => {
      isMounted = false
    }
  }, [])

  const updateGlobalUsers = (newUsers) => {
    setData((prev) => ({ ...prev, users: newUsers }))
  }

  return useUsers(data?.users, updateGlobalUsers)
}

function wrapper({ children }) {
  return children
}

describe('useUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => apiState
      })
    )
    localStorage.clear()
  })

  it('should initialize without user', async () => {
    const { result } = renderHook(() => useUsersFromApi(), { wrapper })

    await waitFor(() => {
      expect(result.current.showLoginModal).toBe(true)
    })

    expect(result.current.currentUser).toBeNull()
  })

  it('notifies when login credentials are invalid', async () => {
    const { result } = renderHook(() => useUsersFromApi(), { wrapper })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/projects')
    })

    await act(async () => {
      await result.current.handleLogin('foo', '1234')
    })

    expect(toast.error).toHaveBeenCalledWith('Usuário ou PIN incorretos.')
  })

  it('notifies when creating existing user', async () => {
    const { result } = renderHook(() => useUsersFromApi(), { wrapper })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/projects')
    })

    await act(async () => {
      await result.current.handleCreateUser({
        username: 'admin',
        displayName: 'Admin',
        avatar: '',
        color: '',
        pin: '1234'
      })
    })

    expect(toast.error).toHaveBeenCalledWith('Este nome de usuário já está em uso.')
  })
})
