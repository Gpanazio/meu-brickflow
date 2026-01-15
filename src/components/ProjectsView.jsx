import PropTypes from 'prop-types'
import ProjectCard from './ProjectCard'

export default function ProjectsView({ projects, onSelect }) {
  if (!projects || projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-dashed border-zinc-800 rounded-lg bg-white/5">
        <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Nenhum projeto disponível.</p>
      </div>
    )
  }

  // Refatorado para usar Grid System do Tailwind
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
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
