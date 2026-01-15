import { useCallback } from 'react';
import { generateId } from '@/utils/ids';

export function useTaskActions(
    latestCurrentProject,
    latestCurrentSubProject,
    currentBoardType,
    updateProjects,
    modalState,
    setModalState
) {
    const handleTaskAction = useCallback((action, data) => {
        // SAVE (Create/Update Task)
        if (action === 'save') {
            const taskData = data;
            const listId = modalState.listId || data.listId;

            if (latestCurrentProject && latestCurrentSubProject && listId) {
                updateProjects(prev => prev.map(p => {
                    if (p.id !== latestCurrentProject.id) return p;
                    return {
                        ...p,
                        subProjects: p.subProjects.map(sp => {
                            if (sp.id !== latestCurrentSubProject.id) return sp;
                            const board = sp.boardData?.[currentBoardType];
                            if (!board) return sp;

                            return {
                                ...sp,
                                boardData: {
                                    ...sp.boardData,
                                    [currentBoardType]: {
                                        ...board,
                                        lists: board.lists.map(list => {
                                            if (list.id !== listId) return list;
                                            const taskIndex = list.tasks.findIndex(t => t.id === taskData.id);
                                            if (taskIndex === -1) {
                                                return { ...list, tasks: [...list.tasks, { ...taskData, id: taskData.id || generateId('task') }] };
                                            } else {
                                                return { ...list, tasks: list.tasks.map(t => t.id === taskData.id ? { ...t, ...taskData } : t) };
                                            }
                                        })
                                    }
                                }
                            };
                        })
                    };
                }));
            }
            setModalState({ isOpen: false, type: null });

            // DELETE TASK
        } else if (action === 'delete') {
            if (latestCurrentProject && latestCurrentSubProject) {
                updateProjects(prev => prev.map(p => {
                    if (p.id !== latestCurrentProject.id) return p;
                    return {
                        ...p,
                        subProjects: p.subProjects.map(sp => {
                            if (sp.id !== latestCurrentSubProject.id) return sp;
                            const board = sp.boardData?.[currentBoardType];
                            if (!board) return sp;
                            return {
                                ...sp,
                                boardData: {
                                    ...sp.boardData,
                                    [currentBoardType]: {
                                        ...board,
                                        lists: board.lists.map(l => ({ ...l, tasks: l.tasks.filter(t => t.id !== data.taskId) }))
                                    }
                                }
                            };
                        })
                    };
                }));
            }

            // MOVE TASK
        } else if (action === 'move') {
            const { taskId, fromListId, toListId } = data;
            if (latestCurrentProject && latestCurrentSubProject) {
                updateProjects(prev => prev.map(p => {
                    if (p.id !== latestCurrentProject.id) return p;
                    return {
                        ...p,
                        subProjects: p.subProjects.map(sp => {
                            if (sp.id !== latestCurrentSubProject.id) return sp;
                            const board = sp.boardData?.[currentBoardType];
                            if (!board) return sp;

                            // Encontrar a tarefa
                            let taskToMove = null;
                            board.lists.forEach(l => {
                                const t = l.tasks.find(t => t.id === taskId);
                                if (t) taskToMove = t;
                            });

                            if (!taskToMove) return sp;

                            return {
                                ...sp,
                                boardData: {
                                    ...sp.boardData,
                                    [currentBoardType]: {
                                        ...board,
                                        lists: board.lists.map(list => {
                                            if (list.id === fromListId) {
                                                return { ...list, tasks: list.tasks.filter(t => t.id !== taskId) };
                                            }
                                            if (list.id === toListId) {
                                                return { ...list, tasks: [...list.tasks, taskToMove] };
                                            }
                                            return list;
                                        })
                                    }
                                }
                            };
                        })
                    };
                }));
            }

            // ADD COLUMN
        } else if (action === 'addColumn') {
            if (latestCurrentProject && latestCurrentSubProject) {
                updateProjects(prev => prev.map(p => {
                    if (p.id !== latestCurrentProject.id) return p;
                    return {
                        ...p,
                        subProjects: p.subProjects.map(sp => {
                            if (sp.id !== latestCurrentSubProject.id) return sp;
                            const board = sp.boardData?.[currentBoardType];
                            if (!board) return sp;

                            return {
                                ...sp,
                                boardData: {
                                    ...sp.boardData,
                                    [currentBoardType]: {
                                        ...board,
                                        lists: [...board.lists, { id: generateId('list'), title: data.title, tasks: [] }]
                                    }
                                }
                            };
                        })
                    };
                }));
            }

            // DELETE COLUMN
        } else if (action === 'deleteColumn') {
            if (latestCurrentProject && latestCurrentSubProject) {
                updateProjects(prev => prev.map(p => {
                    if (p.id !== latestCurrentProject.id) return p;
                    return {
                        ...p,
                        subProjects: p.subProjects.map(sp => {
                            if (sp.id !== latestCurrentSubProject.id) return sp;
                            const board = sp.boardData?.[currentBoardType];
                            if (!board) return sp;

                            return {
                                ...sp,
                                boardData: {
                                    ...sp.boardData,
                                    [currentBoardType]: {
                                        ...board,
                                        lists: board.lists.filter(l => l.id !== data.listId)
                                    }
                                }
                            };
                        })
                    };
                }));
            }

            // UPDATE COLUMN
        } else if (action === 'updateColumn') {
            if (latestCurrentProject && latestCurrentSubProject) {
                updateProjects(prev => prev.map(p => {
                    if (p.id !== latestCurrentProject.id) return p;
                    return {
                        ...p,
                        subProjects: p.subProjects.map(sp => {
                            if (sp.id !== latestCurrentSubProject.id) return sp;
                            const board = sp.boardData?.[currentBoardType];
                            if (!board) return sp;

                            return {
                                ...sp,
                                boardData: {
                                    ...sp.boardData,
                                    [currentBoardType]: {
                                        ...board,
                                        lists: board.lists.map(l => l.id === data.listId ? { ...l, ...data.updates } : l)
                                    }
                                }
                            };
                        })
                    };
                }));
            }

            // REORDER COLUMNS
        } else if (action === 'reorderColumns') {
            if (latestCurrentProject && latestCurrentSubProject) {
                updateProjects(prev => prev.map(p => {
                    if (p.id !== latestCurrentProject.id) return p;
                    return {
                        ...p,
                        subProjects: p.subProjects.map(sp => {
                            if (sp.id !== latestCurrentSubProject.id) return sp;
                            const board = sp.boardData?.[currentBoardType];
                            if (!board) return sp;

                            const newLists = [...board.lists];
                            const [movedList] = newLists.splice(data.fromIndex, 1);
                            newLists.splice(data.toIndex, 0, movedList);

                            return {
                                ...sp,
                                boardData: {
                                    ...sp.boardData,
                                    [currentBoardType]: { ...board, lists: newLists }
                                }
                            };
                        })
                    };
                }));
            }

            // REORDER SUBPROJECTS
        } else if (action === 'reorderSubProjects') {
            if (latestCurrentProject) {
                updateProjects(prev => prev.map(p => {
                    if (p.id !== latestCurrentProject.id) return p;
                    const newSubProjects = [...(p.subProjects || [])];
                    const [movedSub] = newSubProjects.splice(data.fromIndex, 1);
                    newSubProjects.splice(data.toIndex, 0, movedSub);

                    return {
                        ...p,
                        subProjects: newSubProjects
                    };
                }));
            }
        }
    }, [currentBoardType, latestCurrentProject, latestCurrentSubProject, modalState.listId, setModalState, updateProjects]);

    return { handleTaskAction };
}
