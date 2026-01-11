import { create } from 'zustand';

// Helper to generate IDs
const generateId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useProjectStore = create((set, get) => ({
  appData: {
    projects: [],
    users: [],
    version: 0
  },
  
  // UI State
  currentView: 'home',
  currentProject: null,
  currentSubProject: null,
  currentBoardType: 'kanban',
  
  // Actions
  setAppData: (data) => set({ appData: data }),
  
  setCurrentView: (view) => set({ currentView: view }),
  setCurrentProject: (project) => set({ currentProject: project }),
  setCurrentSubProject: (subProject) => set({ currentSubProject: subProject }),
  setCurrentBoardType: (type) => set({ currentBoardType: type }),

  // Sync
  saveHandler: null,
  registerSaveHandler: (handler) => set({ saveHandler: handler }),
  triggerSave: () => {
    const state = get();
    if (state.saveHandler && state.appData) {
      state.saveHandler(state.appData);
    }
  },

  // Deep Update Helper
  updateProjects: (updater) => {
    set((state) => {
      const newProjects = typeof updater === 'function' 
        ? updater(state.appData.projects)
        : updater;
      
      return {
        appData: {
          ...state.appData,
          projects: newProjects
        }
      };
    });
    get().triggerSave();
  },

  // Task Actions
  moveTask: (sourceListId, targetListId, taskId, newIndex) => {
    set((state) => {
      const { currentProject, currentSubProject, currentBoardType } = state;
      if (!currentProject || !currentSubProject) return state;

      const newProjects = state.appData.projects.map(p => {
        if (p.id !== currentProject.id) return p;

        return {
          ...p,
          subProjects: p.subProjects.map(sp => {
            if (sp.id !== currentSubProject.id) return sp;

            const board = sp.boardData[currentBoardType];
            if (!board || !board.lists) return sp;

            // Deep copy lists
            const newLists = board.lists.map(l => ({ ...l, tasks: [...l.tasks] }));

            // Find source and target lists
            const sourceList = newLists.find(l => l.id === sourceListId);
            const targetList = newLists.find(l => l.id === targetListId);

            if (!sourceList || !targetList) return sp;

            // Find and remove task from source
            const taskIndex = sourceList.tasks.findIndex(t => t.id === taskId);
            if (taskIndex === -1) return sp;
            
            const [task] = sourceList.tasks.splice(taskIndex, 1);

            // Add to target at newIndex
            targetList.tasks.splice(newIndex, 0, task);

            return {
              ...sp,
              boardData: {
                ...sp.boardData,
                [currentBoardType]: {
                  ...board,
                  lists: newLists
                }
              }
            };
          })
        };
      });

      return {
        appData: { ...state.appData, projects: newProjects }
      };
    });
    get().triggerSave();
  },

  handleTaskAction: (action, data, listId) => {
    set((state) => {
      const { currentProject, currentSubProject, currentBoardType } = state;
      if (!currentProject || !currentSubProject) return state;

      const newProjects = state.appData.projects.map(p => {
        if (p.id !== currentProject.id) return p;

        return {
          ...p,
          subProjects: p.subProjects.map(sp => {
            if (sp.id !== currentSubProject.id) return sp;

            const board = { ...sp.boardData[currentBoardType] };
            if (!board.lists) board.lists = [];

            let newLists = [...board.lists];

            if (action === 'delete') {
               newLists = newLists.map(l => ({
                 ...l,
                 tasks: l.tasks.filter(t => t.id !== data.taskId)
               }));
            } else if (action === 'archive') {
               newLists = newLists.map(l => ({
                 ...l,
                 tasks: l.tasks.map(t => t.id === data.taskId ? { ...t, isArchived: true } : t)
               }));
            } else if (action === 'save') {
               const targetListId = listId || data.listId;
               const taskData = data.id ? data : { ...data, id: generateId('task'), responsibleUsers: [] };
               
               newLists = newLists.map(l => {
                 if (l.id !== targetListId) return l;
                 const taskExists = l.tasks.some(t => t.id === taskData.id);
                 return {
                   ...l,
                   tasks: taskExists 
                     ? l.tasks.map(t => t.id === taskData.id ? { ...t, ...taskData } : t)
                     : [...l.tasks, taskData]
                 };
               });
            }

            return {
              ...sp,
              boardData: {
                ...sp.boardData,
                [currentBoardType]: {
                  ...board,
                  lists: newLists
                }
              }
            };
          })
        };
      });

      return {
        appData: { ...state.appData, projects: newProjects }
      };
    });
    get().triggerSave();
  },

  handleListAction: (action, listId) => {
    set((state) => {
      const { currentProject, currentSubProject, currentBoardType } = state;
      const newProjects = state.appData.projects.map(p => {
        if (p.id !== currentProject.id) return p;
        return {
          ...p,
          subProjects: p.subProjects.map(sp => {
            if (sp.id !== currentSubProject.id) return sp;
            const board = { ...sp.boardData[currentBoardType] };
            
            if (action === 'archive-cards') {
              board.lists = board.lists.map(l => l.id === listId ? { ...l, tasks: l.tasks.map(t => ({...t, isArchived: true})) } : l);
            } else if (action === 'delete-list') {
              board.lists = board.lists.filter(l => l.id !== listId);
            } else if (action === 'add-list') {
              const newList = { id: generateId('list'), title: 'NOVA LISTA', tasks: [] };
              board.lists = [...board.lists, newList];
            }
            
            return { ...sp, boardData: { ...sp.boardData, [currentBoardType]: board } };
          })
        };
      });
      return { appData: { ...state.appData, projects: newProjects } };
    });
    get().triggerSave();
  }
}));
