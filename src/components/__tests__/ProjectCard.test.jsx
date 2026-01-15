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
    isProtected: true
  }

  afterEach(() => {
    cleanup()
  })

  it('renders correctly with BRICK design system', () => {
    const onSelect = vi.fn()
    render(<ProjectCard project={project} onSelect={onSelect} />)

    // Verifica título e descrição
    expect(screen.getByText(/Alpha Protocol/i)).toBeInTheDocument()
    expect(screen.getByText(/Top secret project/i)).toBeInTheDocument()

    // Verifica se o indicador de "LOCKED" aparece (já que isProtected é true)
    expect(screen.getByText(/LOCKED/i)).toBeInTheDocument()
  })

  it('handles click interactions', () => {
    const onSelect = vi.fn()
    render(<ProjectCard project={project} onSelect={onSelect} />)

    // Busca pelo role genérico de button que adicionamos ao PrismaticPanel
    const card = screen.getByRole('button')
    fireEvent.click(card)

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(project)
  })

  it('handles keyboard accessibility (Enter and Space)', () => {
    const onSelect = vi.fn()
    render(<ProjectCard project={project} onSelect={onSelect} />)

    const card = screen.getByRole('button')

    // Test Enter
    fireEvent.keyDown(card, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledTimes(1)

    // Test Space
    fireEvent.keyDown(card, { key: ' ' })
    expect(onSelect).toHaveBeenCalledTimes(2)
  })
})
