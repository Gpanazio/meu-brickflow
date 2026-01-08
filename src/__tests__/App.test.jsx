import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'
import App from '../App.jsx'

expect.extend(matchers)

const apiState = {
  users: [
    { username: 'admin', pin: '1234', displayName: 'Admin', color: 'red', avatar: '' },
    { username: 'fran', pin: '1234', displayName: 'Fran', color: 'purple', avatar: '' }
  ],
  projects: []
}

describe('App', () => {
  beforeEach(() => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => apiState
      })
    )
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(App).toBeTypeOf('function')
  })

  it('shows SudokuGame for user Fran', async () => {
    localStorage.setItem('brickflow-session-user', JSON.stringify(apiState.users[1]))
    render(<App />)
    expect(await screen.findByTestId('sudoku-game')).toBeInTheDocument()
  })

  it('does not show SudokuGame for other users', async () => {
    localStorage.setItem('brickflow-session-user', JSON.stringify(apiState.users[0]))
    render(<App />)
    await waitFor(() => {
      expect(screen.queryByTestId('sudoku-game')).toBeNull()
    })
  })
})
