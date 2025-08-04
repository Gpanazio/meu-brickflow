import PropTypes from 'prop-types'
import ProjectCard from './ProjectCard'

export default function ProjectsView({ projects, onSelect }) {
  if (!projects || projects.length === 0) {
    return <p>Nenhum projeto disponível.</p>
  }

  return (
    <div className="projects-view">
      {projects.map(project => (
        <ProjectCard key={project.id} project={project} onSelect={onSelect} />
      ))}
    </div>
  )
}

ProjectsView.propTypes = {
  projects: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string.isRequired,
      description: PropTypes.string,
    })
  ),
  onSelect: PropTypes.func.isRequired,
}

ProjectsView.defaultProps = {
  projects: [],
}
