import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

describe('LegacyApp', () => {
  beforeEach(() => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, json: async () => [] }))
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('should be defined', async () => {
    const LegacyApp = (await import('../LegacyApp.jsx')).default
    expect(LegacyApp).toBeTypeOf('function')
  })

  it('shows SudokuGame for user Fran', async () => {
    const LegacyApp = (await import('../LegacyApp.jsx')).default
    localStorage.setItem(
      'brickflow-current-user',
      JSON.stringify({ displayName: 'Fran', userKey: '1', username: 'fran' })
    )
    render(<LegacyApp />)
    expect(screen.getByTestId('sudoku-game')).toBeInTheDocument()
  })

  it('does not show SudokuGame for other users', async () => {
    const LegacyApp = (await import('../LegacyApp.jsx')).default
    localStorage.setItem(
      'brickflow-current-user',
      JSON.stringify({ displayName: 'Bob', userKey: '2', username: 'bob' })
    )
    render(<LegacyApp />)
    expect(screen.queryByTestId('sudoku-game')).toBeNull()
  })
})
