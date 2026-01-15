import React, { useState, useEffect, useCallback, useRef, lazy, Suspense, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { motion } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { toast } from 'sonner';
import './App.css';

// Components Legacy
import LegacyHeader from './components/legacy/LegacyHeader';
import { CreateSubProjectModal } from './components/CreateSubProjectModal';
import { MobileTabBar } from './components/MobileTabBar';
import { Toaster } from './components/ui/sonner';

import { AppProvider, useApp } from './contexts/AppContext';

// Novos Componentes Extraídos - Lazy Loaded
const LegacyHome = lazy(() => import('./components/legacy/LegacyHome'));
const LegacyProjectView = lazy(() => import('./components/legacy/LegacyProjectView'));
const LegacyBoard = lazy(() => import('./components/legacy/LegacyBoard'));
const LegacyModal = lazy(() => import('./components/legacy/LegacyModal'));
const CreateProjectModal = lazy(() => import('./components/CreateProjectModal'));
const UserSettingsModal = lazy(() => import('@/components/modals/UserSettingsModal'));
const TeamManagementModal = lazy(() => import('@/components/modals/TeamManagementModal'));
const TrashView = lazy(() => import('@/components/views/TrashView'));

// Hooks & Utils
import { useUsers, useFiles, useRealtime } from './hooks';
import { generateId } from '@/utils/ids';
import { absurdPhrases } from '@/utils/phrases';
import { COLOR_VARIANTS, USER_COLORS } from '@/constants/theme';

const LoadingView = () => (
  <div className="flex-1 flex items-center justify-center p-20">
    <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
  </div>
);

const INITIAL_STATE = {
  users: [],
  projects: [],
  version: 0
};

const generateMegaSenaNumbers = () => {
  const numbers = [];
  while (numbers.length < 6) {
    const num = Math.floor(Math.random() * 60) + 1;
    if (!numbers.includes(num)) numbers.push(num);
  }
  return numbers.sort((a, b) => a - b);
};

function AppShell() {
  const [appData, setAppData] = useState(null);
  const appDataRef = useRef(null);
  const currentUserRef = useRef(null);

  // App Context
  const appContext = useApp();
  const currentView = appContext.currentView;
  const setCurrentView = appContext.setCurrentView;
  const {
    currentUser,
    setCurrentUser,
    currentProject,
    setCurrentProject,
    currentSubProject,
    setCurrentSubProject,
    currentBoardType,
    setCurrentBoardType,
    modalState,
    setModalState
  } = appContext;

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTeamManagementModal, setShowTeamManagementModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionError, setConnectionError] = useState(false);


  const [dailyPhrase, setDailyPhrase] = useState('');
  const [megaSenaNumbers, setMegaSenaNumbers] = useState([]);

  const dragTaskRef = useRef(null);
  const [dragOverTargetId, setDragOverTargetId] = useState(null);

  const saveDataToApi = useCallback(async (newData) => {
    setIsSyncing(true);
    try {
      const requestId = generateId('req');
      const payload = {
        data: newData,
        version: newData?.version ?? 0,
        client_request_id: requestId,
        userId: currentUserRef.current?.username
      };

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.status === 409) {
        console.warn('Conflito de sincronização! Recarregue a página.');
        return;
      }

      if (response.ok) {
        const result = await response.json();
        setAppData(prev => {
          const next = { ...prev, version: result.version };
          appDataRef.current = next;
          return next;
        });
        setConnectionError(false);
      }
    } catch (e) {
      console.error("Erro save:", e);
      setConnectionError(true);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const updateProjects = useCallback((updater) => {
    setAppData(prev => {
      const newProjects = typeof updater === 'function' ? updater(prev.projects) : updater;
      const newState = { ...prev, projects: newProjects };
      appDataRef.current = newState;
      saveDataToApi(newState);
      return newState;
    });
  }, [saveDataToApi]);

  const updateUsers = useCallback((newUsersList) => {
    setAppData(prev => {
      const newState = { ...prev, users: newUsersList };
      saveDataToApi(newState);
      return newState;
    });
  }, [saveDataToApi]);

  const {
    currentUser: _appCurrentUser,
    isLoggedIn,
    isAuthLoading,
    authError,
    handleLogin,
    handleLogout,
    handleSwitchUser
  } = useUsers(appData?.users, updateUsers);

  // Sync currentUser from hook to context
  useEffect(() => {
    if (_appCurrentUser !== currentUser) {
      setCurrentUser(_appCurrentUser);
    }
    currentUserRef.current = _appCurrentUser;
  }, [_appCurrentUser, currentUser, setCurrentUser]);

  const loadData = useCallback(async () => {
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error("Falha na API");

      let data = await response.json();
      if (!data) data = INITIAL_STATE;

      if (!data.users) data.users = [];
      if (!data.projects) data.projects = [];
      if (typeof data.version !== 'number') data.version = 0;

      setAppData(data);
      appDataRef.current = data;
    } catch (err) {
      console.error("Erro load:", err);
      setConnectionError(true);
      setAppData(INITIAL_STATE);
    }
  }, []);

  useEffect(() => {
    setDailyPhrase(absurdPhrases[Math.floor(Math.random() * absurdPhrases.length)]);
    setMegaSenaNumbers(generateMegaSenaNumbers());

    loadData();
  }, [loadData]);

  // Realtime updates
  useRealtime('brickflow:project:updated', useCallback((payload) => {
    // Only fetch if version is newer or from another user
    if (payload.version > (appDataRef.current?.version || 0)) {
      console.log('🔄 Sincronizando nova versão:', payload.version);
      loadData();
    }
  }, [loadData]));

  const latestCurrentProject = useMemo(() => {
    return appData?.projects?.find(p => p.id === currentProject?.id) || currentProject;
  }, [appData?.projects, currentProject]);

  const latestCurrentSubProject = useMemo(() => {
    if (!latestCurrentProject || !currentSubProject) return currentSubProject;
    return latestCurrentProject.subProjects?.find(sp => sp.id === currentSubProject.id) || currentSubProject;
  }, [latestCurrentProject, currentSubProject]);

  const { files, handleFileUpload, isDragging, setIsDragging, handleDeleteFile, isUploading } =
    useFiles(latestCurrentProject, latestCurrentSubProject, updateProjects);

  const handleTaskAction = useCallback((action, data) => {
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
    } else if (action === 'move') {
      // Drag move logic implementation if needed
    }
  }, [latestCurrentProject, latestCurrentSubProject, currentBoardType, modalState, updateProjects, setModalState]);

  const handleDragStart = (e, item, type, listId) => {
    if (type !== 'task' || !item?.id || !listId) return;
    dragTaskRef.current = { taskId: item.id, fromListId: listId };
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (e, toListId, dropType) => {
    e?.preventDefault?.();
    if (dropType !== 'list') return;
    const drag = dragTaskRef.current;
    if (!drag?.taskId || !drag?.fromListId || !toListId) return;
    dragTaskRef.current = null;
  };

  const handleDragEnter = (e, taskId) => {
    if (!taskId) return;
    setDragOverTargetId(taskId);
  };

  const handleSearchNavigate = useCallback((result) => {
    if (result.type === 'Project') {
      setCurrentProject(result);
      setCurrentView('project');
    } else if (result.type === 'SubProject') {
      setCurrentProject(result.parentProject);
      setCurrentSubProject(result);
      setCurrentView('subproject');
      setCurrentBoardType(result.enabledTabs?.[0] || 'kanban');
    } else if (result.type === 'Task') {
      setCurrentProject(result.parentProject);
      setCurrentSubProject(result.parentSubProject);
      setCurrentView('subproject');
      setCurrentBoardType(result.boardType || 'kanban');

      setModalState({
        type: 'task',
        isOpen: true,
        data: result,
        listId: result.listId,
        mode: 'edit'
      });
    }
  }, [setCurrentProject, setCurrentView, setCurrentSubProject, setCurrentBoardType, setModalState]);

  const handleSoftDelete = useCallback((item, type, parentId) => {
    const deletedAt = new Date().toISOString();
    const typeKey = type.toLowerCase();

    if (typeKey === 'project') {
      updateProjects(prev => prev.map(p => p.id === item.id ? { ...p, deleted_at: deletedAt } : p));
      toast.success('Projeto movido para a lixeira');
    } else if (typeKey === 'subproject') {
      updateProjects(prev => prev.map(p => {
        if (p.id !== parentId) return p;
        return {
          ...p,
          subProjects: p.subProjects.map(sp => sp.id === item.id ? { ...sp, deleted_at: deletedAt } : sp)
        };
      }));
      toast.success('Área movida para a lixeira');
    }
  }, [updateProjects]);

  const handleRestoreItem = useCallback((item, type, parentId) => {
    const typeKey = type.toLowerCase();
    if (typeKey === 'project') {
      updateProjects(prev => prev.map(p => p.id === item.id ? { ...p, deleted_at: null } : p));
      toast.success('Projeto restaurado');
    } else if (typeKey === 'subproject') {
      updateProjects(prev => prev.map(p => {
        if (p.id !== parentId) return p;
        return {
          ...p,
          subProjects: p.subProjects.map(sp => sp.id === item.id ? { ...sp, deleted_at: null } : sp)
        };
      }));
      toast.success('Área restaurada');
    }
  }, [updateProjects]);

  const deletedItems = useMemo(() => {
    const projects = appData?.projects || [];
    const deletedProjects = projects.filter(p => p.deleted_at);
    const deletedSubProjects = [];

    projects.forEach(p => {
      (p.subProjects || []).forEach(sp => {
        if (sp.deleted_at) {
          deletedSubProjects.push({ ...sp, parentProjectId: p.id, parentProjectName: p.name });
        }
      });
    });

    return { projects: deletedProjects, subProjects: deletedSubProjects };
  }, [appData?.projects]);

  const handleAccessProject = useCallback((item, type = 'project') => {
    if (type === 'project') {
      setCurrentProject(item);
      setCurrentView('project');
    }
  }, [setCurrentProject, setCurrentView]);

  // Rendering
  if ((!appData || isAuthLoading) && !connectionError) {
    return <LoadingView />;
  }

  // Simplified login view check (assumes component handles logic, or we render simple login)
  if (!isLoggedIn) {
    // Legacy simple login form (simplified for this file)
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-black p-4">
        <Toaster />
        <div className="w-full max-w-sm glass-panel p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-xl font-bold tracking-widest text-white uppercase">BrickFlow OS</h1>
            <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Acesso Restrito</p>
          </div>
          {authError && <p className="text-xs text-red-400 font-bold text-center">{authError}</p>}
          <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.target); handleLogin(fd.get('username'), fd.get('pin')); }} className="space-y-4">
            <input name="username" placeholder="ID" required className="h-12 bg-zinc-950 border border-zinc-800 text-white w-full px-4 rounded" />
            <input name="pin" type="password" placeholder="PIN" required className="h-12 text-center tracking-[0.5em] bg-zinc-950 border border-zinc-800 text-white w-full px-4 rounded" />
            <button type="submit" className="w-full bg-white text-zinc-950 hover:bg-zinc-200 uppercase font-bold tracking-widest h-12 rounded">Entrar</button>
          </form>
        </div>
      </div >
    );
  }

  const currentEntity = useMemo(() => {
    if (currentView === 'subproject') {
      return latestCurrentSubProject;
    }
    return latestCurrentProject;
  }, [currentView, latestCurrentProject, latestCurrentSubProject]);

  const boardDataRaw = currentEntity?.boardData?.[currentBoardType] || { lists: [] };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-red-900/50 selection:text-white overflow-hidden">
      {/* DEBUG: Verificar se currentUser tem avatar */}

      <LegacyHeader
        currentView={currentView}
        setCurrentView={setCurrentView}
        currentProject={currentProject}
        isSyncing={isSyncing}
        currentUser={currentUser} // Pass correct currentUser from context
        handleSwitchUser={handleSwitchUser}
        handleLogout={handleLogout}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenTeamManagement={() => setShowTeamManagementModal(true)}
        projects={appData.projects}
        onNavigate={handleSearchNavigate}
        isSearchOpen={isSearchOpen}
        setIsSearchOpen={setIsSearchOpen}
      />

      <main className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-y-auto p-0 md:p-8 pt-6 pb-20 md:pb-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView + (currentProject?.id || '') + (currentSubProject?.id || '')}
              initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="min-h-full"
            >
              <Suspense fallback={<LoadingView />}>
                {currentView === 'home' && (
                  <LegacyHome
                    currentUser={currentUser}
                    dailyPhrase={dailyPhrase}
                    megaSenaNumbers={megaSenaNumbers}
                    projects={appData.projects}
                    setModalState={setModalState}
                    handleAccessProject={handleAccessProject} // Helper to set view/project
                    handleDeleteProject={(item) => handleSoftDelete(item, 'project')}
                    isLoading={!appData}
                    COLOR_VARIANTS={COLOR_VARIANTS}
                    handleDragStart={handleDragStart}
                    handleDragOver={handleDragOver}
                    handleDrop={handleDrop}
                  />
                )}

                {currentView === 'trash' && (
                  <TrashView
                    trashItems={deletedItems}
                    isLoading={false}
                    onReturnHome={() => setCurrentView('home')}
                    onRestoreItem={(item) => {
                      // handleRestoreItem expects: item, type, parentId
                      // trashItems struct: { ...sp, parentProjectId, parentProjectName, type: 'subproject' }
                      // or { ...p, type: 'project' }
                      handleRestoreItem(item, item.type || (item.parentProjectId ? 'subproject' : 'project'), item.parentProjectId);
                    }}
                  />
                )}

                {currentView === 'project' && latestCurrentProject && (
                  <LegacyProjectView
                    currentProject={latestCurrentProject}
                    setCurrentView={setCurrentView}
                    setModalState={setModalState}
                    COLOR_VARIANTS={COLOR_VARIANTS}
                    handleAccessProject={(sub) => {
                      setCurrentSubProject(sub);
                      setCurrentView('subproject');
                      setCurrentBoardType(sub.enabledTabs?.[0] || 'kanban');
                    }}
                    handleDeleteProject={(item) => handleSoftDelete(item, 'subproject', latestCurrentProject.id)}
                    history={[]}
                    isHistoryLoading={false}
                    historyError={null}
                  />
                )}

                {currentView === 'subproject' && latestCurrentSubProject && (
                  <LegacyBoard
                    data={boardDataRaw}
                    entityName={latestCurrentSubProject.name}
                    enabledTabs={latestCurrentSubProject.enabledTabs || []}
                    currentBoardType={currentBoardType}
                    setCurrentBoardType={setCurrentBoardType}
                    currentSubProject={latestCurrentSubProject}
                    currentProject={latestCurrentProject}
                    setCurrentView={setCurrentView}
                    setModalState={setModalState}
                    handleTaskAction={handleTaskAction}
                    handleDragStart={handleDragStart}
                    handleDragOver={handleDragOver}
                    handleDrop={handleDrop}
                    handleDragEnter={handleDragEnter}
                    dragOverTargetId={dragOverTargetId}
                    files={files}
                    handleFileUploadWithFeedback={handleFileUpload}
                    isUploading={isUploading}
                    isFileDragging={isDragging}
                    setIsFileDragging={setIsDragging}
                    handleDeleteFile={handleDeleteFile}
                  />
                )}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <Suspense fallback={null}>
        <CreateProjectModal
          isOpen={modalState.isOpen && modalState.type === 'project' && modalState.mode === 'create'}
          onClose={() => setModalState({ isOpen: false })}
          onCreate={(data) => {
            const newProj = { id: generateId('proj'), ...data, members: [], isArchived: false };
            updateProjects(prev => [...prev, newProj]);
          }}
        />

        <CreateSubProjectModal
          isOpen={modalState.isOpen && modalState.type === 'subProject' && modalState.mode === 'create'}
          onClose={() => setModalState({ isOpen: false })}
          onCreate={(data) => {
            updateProjects(prev => prev.map(p => p.id === currentProject.id ? { ...p, subProjects: [...(p.subProjects || []), { id: generateId('sub'), ...data }] } : p));
          }}
        />

        {modalState.type === 'task' && (
          <LegacyModal
            modalState={modalState}
            setModalState={setModalState}
            handleTaskAction={handleTaskAction}
            isReadOnly={false}
            users={appData?.users || []}
            USER_COLORS={USER_COLORS}
          />
        )}

        <UserSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          currentUser={currentUser}
          backups={[]}
          isBackupsLoading={false}
          onRefreshBackups={() => { }}
          onRestoreBackup={(id) => {
            console.log("Restore backup:", id);
          }}
          onExportBackup={(id) => {
            console.log("Export backup:", id);
          }}
        />

        <TeamManagementModal
          isOpen={showTeamManagementModal}
          onClose={() => setShowTeamManagementModal(false)}
          currentUser={currentUser}
        />
      </Suspense>

      <MobileTabBar
        currentView={currentView}
        setCurrentView={setCurrentView}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenCreateProject={() => setModalState({ type: 'project', mode: 'create', isOpen: true })}
      />

      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
