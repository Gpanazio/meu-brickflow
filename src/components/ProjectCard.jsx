import PropTypes from 'prop-types'

export default function ProjectCard({ project, onSelect }) {
  return (
    <div className="project-card" onClick={() => onSelect(project)}>
      <h3>{project.name}</h3>
      {project.description && <p>{project.description}</p>}
    </div>
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
