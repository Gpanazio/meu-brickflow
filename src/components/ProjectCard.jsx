import React from 'react'
import PropTypes from 'prop-types'

export default function ProjectCard({ project, onSelect }) {
  const handleKeyDown = e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect(project)
    }
  }

  return (
    <button
      type="button"
      className="project-card"
      onClick={() => onSelect(project)}
      onKeyDown={handleKeyDown}
    >
      <h3>{project.name}</h3>
      {project.description && <p>{project.description}</p>}
    </button>
  )
}

ProjectCard.propTypes = {
  project: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
  }).isRequired,
  onSelect: PropTypes.func.isRequired,
}
