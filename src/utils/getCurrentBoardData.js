export function getCurrentBoardData(currentProject, currentBoardType) {
  if (!currentProject || !currentBoardType) return null;

  switch (currentBoardType) {
    case 'todo':
      return currentProject.todo;
    case 'kanban':
      return currentProject.kanban;
    case 'timeline':
      return currentProject.timeline;
    case 'goals':
      return currentProject.goals;
    default:
      return null;
  }
}
