import React from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'
import ResponsibleUsersButton from '../../components/ResponsibleUsersButton'

expect.extend(matchers)

afterEach(() => {
  cleanup()
})

describe('responsibleUsers', () => {
  it('lists assigned users when present', () => {
    render(<ResponsibleUsersButton users={['alice', 'bob']} />)
    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(screen.getByText(/alice/)).toBeInTheDocument()
    expect(screen.getByText(/bob/)).toBeInTheDocument()
  })

  it('renders nothing when no users are assigned', () => {
    render(<ResponsibleUsersButton users={[]} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})

