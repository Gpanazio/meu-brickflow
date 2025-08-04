import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../../lib/supabaseClient', () => {
  const supabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null })
  }
  return { supabase, handleSupabaseError: vi.fn(), __esModule: true }
})

import { useFiles } from '../useFiles'

function wrapper({ children }) {
  return children
}

describe('useFiles', () => {
  it('should start with empty list', () => {
    const { result } = renderHook(() => useFiles(null, null, {}), { wrapper })
    expect(result.current.files).toEqual([])
  })

  it('filters files by project and subproject', () => {
    const { result } = renderHook(() => useFiles({ id: 1 }, { id: 2 }, {}), { wrapper })

    act(() => {
      result.current.setFiles([
        { projectId: 1, subProjectId: 2 },
        { projectId: 3, subProjectId: 2 }
      ])
    })

    expect(result.current.getCurrentFiles()).toEqual([
      { projectId: 1, subProjectId: 2 }
    ])

    act(() => {
      result.current.setFiles([
        { projectId: 3, subProjectId: 2 }
      ])
    })

    expect(result.current.getCurrentFiles()).toEqual([])
  })

  it('allows updating dragging state', () => {
    const { result } = renderHook(() => useFiles(null, null, {}), { wrapper })

    act(() => {
      result.current.setIsDragging(true)
    })

    expect(result.current.isDragging).toBe(true)
  })
})
