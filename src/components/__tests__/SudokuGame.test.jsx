import React from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import SudokuGame from '../SudokuGame.jsx'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

describe('SudokuGame overlay', () => {
  afterEach(() => {
    cleanup()
  })
  it('shows overlay initially', () => {
    render(<SudokuGame />)
    expect(screen.getByTestId('sudoku-warning')).toBeInTheDocument()
  })

  it('continues game when choosing to play', () => {
    render(<SudokuGame />)
    fireEvent.click(
      screen.getByText('Estou ciente que preciso trabalhar, mas escolho jogar')
    )
    expect(screen.queryByTestId('sudoku-warning')).toBeNull()
    expect(screen.getByText('Reiniciar')).toBeInTheDocument()
  })

  it('hides game when choosing to work', () => {
    render(<SudokuGame />)
    fireEvent.click(
      screen.getByText('Obrigado por me lembrar, prefiro trabalhar a jogar')
    )
    expect(screen.queryByTestId('sudoku-warning')).toBeNull()
    expect(screen.getByTestId('work-message')).toBeInTheDocument()
  })
})

describe('SudokuGame prefilled cells', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders preset value as read-only', () => {
    render(<SudokuGame />)
    fireEvent.click(
      screen.getByText('Estou ciente que preciso trabalhar, mas escolho jogar')
    )
    const cell = screen.getAllByRole('textbox')[0]
    expect(cell).toHaveValue('5')
    expect(cell).toHaveAttribute('readOnly')
  })
})
