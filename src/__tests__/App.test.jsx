import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'
import App from '../App.jsx'

vi.mock('../lib/supabaseClient', () => {
  const buildSelectResponse = () => {
    const response = { data: [], error: null }
    const builder = {
      limit: vi.fn(() => builder),
      then: (resolve) => Promise.resolve(response).then(resolve)
    }
    return builder
  }

  return {
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn(() => buildSelectResponse()),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        insert: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    },
    hasSupabaseConfig: false
  }
})

expect.extend(matchers)

describe('App', () => {
  beforeEach(() => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, json: async () => [] }))
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('should be defined', () => {
    expect(App).toBeTypeOf('function')
  })

  it('shows SudokuGame for user Fran', async () => {
    localStorage.setItem(
      'brickflow-current-user',
      JSON.stringify({ displayName: 'Fran', userKey: '1', username: 'fran' })
    )
    render(<App />)
    expect(await screen.findByTestId('sudoku-game')).toBeInTheDocument()
  })

  it('does not show SudokuGame for other users', async () => {
    localStorage.setItem(
      'brickflow-current-user',
      JSON.stringify({ displayName: 'Bob', userKey: '2', username: 'bob' })
    )
    render(<App />)
    await waitFor(() => {
      expect(screen.queryByTestId('sudoku-game')).toBeNull()
    })
  })
})
