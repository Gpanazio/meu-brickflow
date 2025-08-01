import { renderHook } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useBoards } from '../useBoards'

function wrapper({ children }) {
  return children
}

describe('useBoards', () => {
  it('returns empty data when no project', () => {
    const { result } = renderHook(() =>
      useBoards('home', null, null, 'kanban', v => v, () => {}, () => {}),
      { wrapper }
    )
    expect(result.current.getCurrentBoardData()).toEqual({})
  })
})
