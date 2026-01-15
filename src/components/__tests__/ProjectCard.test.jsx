import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import ProjectCard from '../ProjectCard.jsx'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

describe('ProjectCard Component', () => {
  const project = {
    id: 1,
    name: 'Alpha Protocol',
    description: 'Top secret project',
    color: 'red',
    isProtected: true,
    subProjects: []
  }

  afterEach(() => {
    cleanup()
  })

  it('renders title and description correctly', () => {
    const onSelect = vi.fn()
    render(<ProjectCard project={project} onSelect={onSelect} />)

    // Verifica elementos textuais
    expect(screen.getByText(/Alpha Protocol/i)).toBeInTheDocument()
    expect(screen.getByText(/Top secret project/i)).toBeInTheDocument()
  })

  it('shows LOCKED indicator for protected projects', () => {
    const onSelect = vi.fn()
    render(<ProjectCard project={project} onSelect={onSelect} />)
    expect(screen.getByText(/LOCKED/i)).toBeInTheDocument()
  })

  it('triggers onSelect when clicked', () => {
    const onSelect = vi.fn()
    render(<ProjectCard project={project} onSelect={onSelect} />)

    // ProjectCard agora tem role="button"
    const card = screen.getByRole('button')
    fireEvent.click(card)

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(project)
  })

  it('triggers onSelect on Enter key', () => {
    const onSelect = vi.fn()
    render(<ProjectCard project={project} onSelect={onSelect} />)

    const card = screen.getByRole('button')
    fireEvent.keyDown(card, { key: 'Enter' })

    expect(onSelect).toHaveBeenCalledTimes(1)
  })
})
