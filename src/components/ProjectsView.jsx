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
