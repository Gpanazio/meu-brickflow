import { renderHook } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useFiles } from '../useFiles'

function wrapper({ children }) {
  return children
}

describe('useFiles', () => {
  it('should start with empty list', () => {
    const { result } = renderHook(() => useFiles(null, null, {}), { wrapper })
    expect(result.current.files).toEqual([])
  })
})
