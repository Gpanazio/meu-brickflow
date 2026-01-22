import { useState, useMemo } from 'react';

export function useSearch(projects) {
  const [searchTerm, setSearchTerm] = useState('');

  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) {
      return [];
    }

    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const results = [];

    (projects || []).forEach(project => {
      if ((project.name || '').toLowerCase().includes(lowerCaseSearchTerm)) {
        results.push({ type: 'Project', ...project });
      }

      (project.subProjects || []).forEach(subProject => {
        if ((subProject.name || '').toLowerCase().includes(lowerCaseSearchTerm)) {
          results.push({ type: 'SubProject', ...subProject, parentProject: project, parentProjectId: project.id });
        }

        const boardData = subProject.boardData || {};
        Object.entries(boardData).forEach(([boardType, board]) => {
          (board.lists || []).forEach(list => {
            (list.tasks || []).forEach(task => {
              if ((task.title || '').toLowerCase().includes(lowerCaseSearchTerm)) {
                results.push({ type: 'Task', ...task, parentProject: project, parentSubProject: subProject, boardType, listId: list.id });
              }
            });
          });
        });
      });
    });

    return results;
  }, [searchTerm, projects]);

  return { searchTerm, setSearchTerm, searchResults };
}
