export function getCurrentBoardData(project, boardType) {
  if (!project || !boardType) return null;

  switch (boardType) {
    case "todo": return project.todo;
    case "kanban": return project.kanban;
    case "timeline": return project.timeline;
    case "goals": return project.goals;
    default: return null;
  }
}
