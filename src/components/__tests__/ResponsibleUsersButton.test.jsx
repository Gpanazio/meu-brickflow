import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import ResponsibleUsersButton from '../ResponsibleUsersButton'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

describe('ResponsibleUsersButton', () => {
  it('shows responsible users when clicked', () => {
    render(<ResponsibleUsersButton users={['alice', 'bob']} />)
    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(screen.getByText(/alice/)).toBeInTheDocument()
    expect(screen.getByText(/bob/)).toBeInTheDocument()
  })
})
