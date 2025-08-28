import { renderHook, act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUsers } from '../useUsers'
import { toast } from 'sonner'

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))
vi.mock('../../lib/supabaseClient', () => ({
  supabase: { from: vi.fn() },
  handleSupabaseError: vi.fn()
}))

import { supabase } from '../../lib/supabaseClient'

function wrapper({ children }) {
  return children
}

describe('useUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabase.from.mockReset()
    supabase.from.mockReturnValue({
      select: () => Promise.resolve({ data: [], error: null })
    })
    localStorage.clear()
  })

  it('should initialize without user', () => {
    const { result } = renderHook(() => useUsers(), { wrapper })
    expect(result.current.currentUser).toBeNull()
  })

  it('notifies when login user not found', async () => {
    supabase.from.mockReturnValue({
      select: () => {
        const chain = {
          eq: () => chain,
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
          then: (resolve) => resolve({ data: [], error: null })
        }
        return chain
      }
    })

    const { result } = renderHook(() => useUsers(), { wrapper })
    await act(async () => {
      await result.current.handleLogin('foo', '1234')
    })

    expect(toast.error).toHaveBeenCalledWith(
      'Usuário não encontrado! Clique em "Criar Usuário" para se cadastrar.'
    )
  })

  it('notifies when creating existing user', async () => {
    supabase.from.mockReturnValue({
      select: () => Promise.resolve({ data: [{ username: 'foo' }], error: null })
    })

    const { result } = renderHook(() => useUsers(), { wrapper })
    await act(async () => {
      await result.current.handleCreateUser({
        username: 'foo',
        displayName: 'Foo',
        avatar: '',
        color: '',
        pin: '1234'
      })
    })

    expect(toast.error).toHaveBeenCalledWith(
      'Este usuário já existe! Tente fazer login ou escolha outro nome.'
    )
  })
})
