export default function ProjectCard({ project, onSelect }) {
  return (
    <div className="project-card" onClick={() => onSelect(project)}>
      <h3>{project.name}</h3>
      {project.description && <p>{project.description}</p>}
    </div>
  )
}
