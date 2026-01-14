import React from 'react'
/* eslint-disable no-undef */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
    global.fetch = vi.fn((url) => {
      if (url === '/api/health') {
        return Promise.resolve({ ok: true })
      }
      if (url === '/api/projects') {
        return Promise.resolve({ ok: true, json: async () => apiState })
      }
      if (url === '/api/auth/me') {
        // Default to not logged in
        return Promise.resolve({ ok: false, status: 401 })
      }
      return Promise.resolve({ ok: false, status: 404 })
    })
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
    // Mock user being logged in
     
    global.fetch.mockImplementation((url) => {
      if (url === '/api/health') return Promise.resolve({ ok: true })
      if (url === '/api/projects') return Promise.resolve({ ok: true, json: async () => apiState })
      if (url === '/api/auth/me') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ user: apiState.users[1] })
        })
      }
      return Promise.resolve({ ok: false, status: 404 })
    })

    render(<App />)
    // Wait for component to fully load (avoid waitForServer retries)
    const sudokuGame = await screen.findByTestId('sudoku-game', { timeout: 10000 })
    expect(sudokuGame).toBeInTheDocument()
  })

  it('does not show SudokuGame for other users', async () => {
    // Mock admin user being logged in
     
    global.fetch.mockImplementation((url) => {
      if (url === '/api/health') return Promise.resolve({ ok: true })
      if (url === '/api/projects') return Promise.resolve({ ok: true, json: async () => apiState })
      if (url === '/api/auth/me') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ user: apiState.users[0] })
        })
      }
      return Promise.resolve({ ok: false, status: 404 })
    })

    render(<App />)
    await waitFor(() => {
      expect(screen.queryByTestId('sudoku-game')).toBeNull()
    })
  })
})
