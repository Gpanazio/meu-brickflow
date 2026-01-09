/**
 * Busca todas as tarefas atribuídas a um usuário específico
 * @param {Array} projects - Array de projetos
 * @param {string} username - Username do usuário
 * @returns {Array} Array de tarefas com metadados de contexto
 */
export function getUserTasks(projects, username) {
  if (!projects || !username) return [];

  const tasks = [];

  projects.forEach(project => {
    // Ignora projetos deletados ou arquivados
    if (project.deleted_at || project.isArchived) return;

    (project.subProjects || []).forEach(subProject => {
      // Ignora sub-projetos deletados ou arquivados
      if (subProject.deleted_at || subProject.isArchived) return;

      // Itera sobre todos os tipos de board (kanban, todo, etc)
      const boardData = subProject.boardData || {};
      Object.entries(boardData).forEach(([boardType, board]) => {
        if (!board.lists) return;

        board.lists.forEach(list => {
          if (!list.tasks) return;

          list.tasks.forEach(task => {
            // Verifica se o usuário está na lista de responsáveis
            if (task.responsibleUsers && task.responsibleUsers.includes(username)) {
              tasks.push({
                ...task,
                // Metadados para navegação
                projectId: project.id,
                projectName: project.name,
                projectColor: project.color,
                subProjectId: subProject.id,
                subProjectName: subProject.name,
                boardType: boardType,
                listId: list.id,
                listTitle: list.title
              });
            }
          });
        });
      });
    });
  });

  return tasks;
}
