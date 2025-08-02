import { renderHook } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useUsers } from '../useUsers'

function wrapper({ children }) {
  return children
}

describe('useUsers', () => {
  it('should initialize without user', () => {
    const { result } = renderHook(() => useUsers(), { wrapper })
    expect(result.current.currentUser).toBeNull()
  })
})
