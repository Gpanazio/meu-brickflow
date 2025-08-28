import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import ProjectCard from '../ProjectCard.jsx'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

describe('ProjectCard accessibility', () => {
  const project = { id: 1, name: 'Alpha', description: 'Test project' }

  afterEach(() => {
    cleanup()
  })

  it('renders a button with project name', () => {
    const onSelect = vi.fn()
    render(<ProjectCard project={project} onSelect={onSelect} />)
    expect(
      screen.getByRole('button', { name: new RegExp(project.name) })
    ).toBeInTheDocument()
  })

  it('triggers onSelect on Enter and Space', () => {
    const onSelect = vi.fn()
    render(<ProjectCard project={project} onSelect={onSelect} />)
    const card = screen.getByRole('button', { name: new RegExp(project.name) })
    fireEvent.keyDown(card, { key: 'Enter' })
    fireEvent.keyDown(card, { key: ' ' })
    expect(onSelect).toHaveBeenCalledTimes(2)
    expect(onSelect).toHaveBeenNthCalledWith(1, project)
    expect(onSelect).toHaveBeenNthCalledWith(2, project)
  })
})
