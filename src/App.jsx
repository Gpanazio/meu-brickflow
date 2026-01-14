import React, { useMemo, useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { WifiOff, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import './App.css';
import { AppProvider, useApp } from './contexts/AppContext';
import { useUsers } from './hooks/useUsers';
import { useFiles } from './hooks/useFiles';
import { useSearch } from './hooks/useSearch';

// Components Legacy
import LegacyHeader from './components/legacy/LegacyHeader';
import { CreateSubProjectModal } from './components/CreateSubProjectModal';
import { MobileTabBar } from './components/MobileTabBar';
import { Toaster } from './components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import LoadingState, { ConnectionError } from '@/components/ui/LoadingState';

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

const DATA_LOAD_FALLBACK_MESSAGE = 'Não foi possível carregar os dados. Verifique a internet ou se a variável DATABASE_URL está configurada no Railway.';

const generateMegaSenaNumbers = () => {
  const numbers = [];
  while (numbers.length < 6) {
    const num = Math.floor(Math.random() * 60) + 1;
    if (!numbers.includes(num)) numbers.push(num);
  }
  return numbers.sort((a, b) => a - b);
};

function AppContent() {
  const {
    currentUser,
    projects,
    setProjects,
    currentProject,
    setCurrentProject,
    currentSubProject,
    setCurrentSubProject,
    currentBoardType,
    setCurrentBoardType,
    modalState,
    setModalState,
    login,
    logout
  } = useApp();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTeamManagementModal, setShowTeamManagementModal] = useState(false);
  const dragTaskRef = useRef(null);
  const [dragOverTargetId, setDragOverTargetId] = useState(null);
  const appDataRef = useRef(null);

  const {
    files,
    handleFileUpload,
    isDragging,
    setIsDragging,
    handleDeleteFile,
    isUploading
  } = useFiles(currentProject, currentSubProject, setProjects);

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

  const dailyPhrase = useMemo(() => absurdPhrases[Math.floor(Math.random() * absurdPhrases.length)], []);
  const megaSenaNumbers = useMemo(() => generateMegaSenaNumbers(), []);

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

  const deletedItems = useMemo(() => {
    const projects = projects || [];
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
  }, [projects]);

  const handleRestoreItem = useCallback((item, type, parentId) => {
    if (!currentUser) return;
    const typeKey = type.toLowerCase();
    if (typeKey === 'project') {
      const updatedProjects = projects.map(p => p.id === item.id ? { ...p, deleted_at: null } : p);
      setProjects(updatedProjects);
      toast.success('Projeto restaurado');
    } else if (typeKey === 'subproject') {
      setProjects(prev => prev.map(p => {
        if (p.id !== parentId) return p;
        return {
          ...p,
          subProjects: p.subProjects.map(sp => {
            if (sp.id !== item.id) return sp;
            return { ...sp, deleted_at: null };
          })
        };
      }));
      toast.success('Área restaurada');
    }
  }, [projects, setProjects, currentUser]);

  const updateProjects = useCallback((updater) => {
    setProjects(prev => {
      const newProjects = typeof updater === 'function' ? updater(prev) : updater;
      appDataRef.current = { ...appDataRef.current, projects: newProjects };
      return newProjects;
    });
  }, []);

  const handleTaskAction = useCallback((action, data) => {
    if (action === 'save') {
      const sp = currentSubProject;
      const board = sp?.boardData?.[currentBoardType];
      if (!board) return;

      const listId = modalState.listId || data.listId;
      const updatedList = board.lists.map(list => {
        if (list.id !== listId) return list;

        const taskIndex = list.tasks.findIndex(t => t.id === data.id);
        if (taskIndex === -1) {
          return { ...list, tasks: [...list.tasks, { ...data, id: data.id || generateId('task') }] };
        } else {
          return { ...list, tasks: list.tasks.map(t => t.id === data.id ? { ...t, ...data } : t) };
        }
      });

      setProjects(prev => {
        if (!prev || !prev.projects) return prev;
        const project = prev.projects.find(p => p.id === currentProject.id);
        if (!project) return prev;

        const subProject = project.subProjects.find(sp => sp.id === currentSubProject.id);
        if (!subProject) return prev;

        return {
          ...prev,
          projects: prev.projects.map(p => {
            if (p.id !== currentProject.id) return p;
            return {
              ...p,
              subProjects: p.subProjects.map(sp => {
                if (sp.id !== currentSubProject.id) return sp;
                const spBoardData = sp.boardData || {};
                return {
                  ...sp,
                  boardData: {
                    ...spBoardData,
                    [currentBoardType]: {
                      ...board,
                      lists: [updatedList]
                    }
                  }
                };
              })
            };
          })
        };
      });
    } else if (action === 'delete') {
      if (currentProject && currentSubProject) {
        setProjects(prev => {
          if (!prev || !prev.projects) return prev;
          const project = prev.projects.find(p => p.id === currentProject.id);
          if (!project) return prev;

          return {
            ...prev,
            projects: prev.projects.map(p => {
              if (p.id !== currentProject.id) return p;
              return {
                ...p,
                subProjects: p.subProjects.map(sp => {
                  if (sp.id !== currentSubProject.id) return sp;
                  const spBoardData = sp.boardData || {};
                  const board = spBoardData[currentBoardType];
                  if (!board) return sp;

                  return {
                    ...sp,
                    boardData: {
                      ...spBoardData,
                      [currentBoardType]: {
                        ...board,
                        lists: board.lists.map(l => ({ ...l, tasks: l.tasks.filter(t => t.id !== data.taskId) }))
                      }
                    }
                  };
                })
              };
            })
          };
        });
      }
    } else if (action === 'move') {
    }
  }, [currentProject, currentSubProject, currentBoardType, modalState, setProjects]);

  const handleAccessProject = (item, type) => {
    if (type === 'project') {
      setCurrentProject(item);
      setCurrentView('project');
    }
  };

  const [currentView, setCurrentView] = useState('home');

  const { searchTerm, setSearchTerm, searchResults } = useSearch(projects);

  const safeProjects = useMemo(() => Array.isArray(projects) ? projects : [], [projects]);
  const safeMegaSena = useMemo(() => Array.isArray(megaSenaNumbers) ? megaSenaNumbers : [0,0,0,0,0], [megaSenaNumbers]);
  const currentDate = useMemo(() => {
    return new Date().toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    }).toUpperCase();
  }, []);

  const activeProjects = useMemo(() => {
    return safeProjects.filter(p => !p.isArchived && !p.deleted_at);
  }, [safeProjects]);

  const safeMegaSenaArray = useMemo(() => Array.isArray(megaSenaNumbers) ? megaSenaNumbers : [], [megaSenaNumbers]);

  return (
    <div className="min-h-screen bg-black text-white pb-20 relative overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: `linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(circle at center, black, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(circle at center, black, transparent 80%)'
          }}
        />
        <div className="absolute inset-0 opacity-[0.15]">
          <div
            className="absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage: `linear-gradient(to right, #222 1px, transparent 1px), linear-gradient(to bottom, #222 1px, transparent 1px)`,
              backgroundSize: '40px 40px'
            }}
          />
        </div>
      </div>

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
                    megaSenaNumbers={safeMegaSenaArray}
                    projects={projects}
                    setModalState={setModalState}
                    handleAccessProject={handleAccessProject}
                    updateProjects={updateProjects}
                  />
                )}

                {currentView === 'project' && currentProject && (
                  <LegacyProjectView
                    currentProject={currentProject}
                    setCurrentSubProject={setCurrentSubProject}
                    setCurrentView={setCurrentView}
                    currentBoardType={currentBoardType}
                    setCurrentBoardType={setCurrentBoardType}
                    handleTaskAction={handleTaskAction}
                    modalState={modalState}
                    setModalState={setModalState}
                    updateProjects={updateProjects}
                  />
                )}

                {currentView === 'subproject' && currentSubProject && (
                  <LegacyBoard
                    data={currentSubProject}
                    entityName={currentSubProject.name}
                    enabledTabs={currentSubProject.enabledTabs || ['kanban', 'calendar', 'files']}
                    currentBoardType={currentBoardType}
                    setCurrentBoardType={setCurrentBoardType}
                    currentSubProject={currentSubProject}
                    setCurrentView={setCurrentView}
                    handleDragOver={handleDragOver}
                    handleDragStart={handleDragStart}
                    handleDragEnter={handleDragEnter}
                    setModalState={setModalState}
                    handleTaskAction={handleTaskAction}
                    dragOverTargetId={dragOverTargetId}
                    setDragOverTargetId={setDragOverTargetId}
                    isFileDragging={isDragging}
                    setIsFileDragging={setIsDragging}
                    handleFileDrop={handleFileDrop}
                    files={files}
                    isUploading={isUploading}
                    handleDeleteFile={handleDeleteFile}
                    handleFileUpload={handleFileUpload}
                  />
                )}
              </Suspense>
            </motion.div>
          </div>
        </main>

        <LegacyModal
          modalState={modalState}
          setModalState={setModalState}
          handlePasswordSubmit={() => {
            const password = prompt('Este projeto é protegido. Digite a senha:');
            if (!password) return;
            fetch('/api/projects/verify-password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ projectId: modalState.data?.id || modalState.data?.projectId, password })
            }).then(res => {
              if (res.ok) {
                handleAccessProject(modalState.data || modalState.data?.projectId, modalState.type);
              } else {
                alert('Senha incorreta.');
              }
            });
          }}
          handleSaveProject={handleTaskAction}
          handleTaskAction={handleTaskAction}
          USER_COLORS={USER_COLORS}
          isReadOnly={!currentUser || currentUser.role === 'user'}
          users={currentUser ? [currentUser] : []}
        />

        <CreateProjectModal
          modalState={modalState}
          setModalState={setModalState}
          updateProjects={updateProjects}
        />

        <CreateSubProjectModal
          modalState={modalState}
          setModalState={setModalState}
          currentProject={currentProject}
          setCurrentView={setCurrentView}
          updateProjects={updateProjects}
        />

        <UserSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          currentUser={currentUser}
          updateUsers={updateProjects}
        />

        <TeamManagementModal
          isOpen={showTeamManagementModal}
          onClose={() => setShowTeamManagementModal(false)}
          currentUser={currentUser}
          users={currentUser ? [currentUser] : []}
          updateUsers={updateProjects}
        />

        <TrashView
          deletedItems={deletedItems}
          handleRestoreItem={handleRestoreItem}
          currentUser={currentUser}
        />

        <LegacyHeader
          currentView={currentView}
          setCurrentView={setCurrentView}
          currentProject={currentProject}
          setCurrentSubProject={setCurrentSubProject}
          setCurrentBoardType={setCurrentBoardType}
          setModalState={setModalState}
        />

        <MobileTabBar
          currentView={currentView}
          setCurrentView={setCurrentView}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
          onOpenCreateProject={() => setModalState({ type: 'project', mode: 'create', isOpen: true })}
        />

        <Toaster />

        <GlobalSearch
          isOpen={isSearchOpen}
          onNavigate={handleSearchNavigate}
          isSearchOpen={isSearchOpen}
          setIsSearchOpen={setIsSearchOpen}
          projects={projects}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          searchResults={searchResults}
          onNavigate={handleSearchNavigate}
        />
      </div>
    </div>
  );
}

function App() {
  const { isLoading, isLoggedIn, currentUser, isAuthLoading, login } = useUsers();

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-black p-4">
        <Toaster />
        <div className="w-full max-w-sm glass-panel p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-xl font-bold tracking-widest text-white uppercase">BrickFlow OS</h1>
            <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Acesso Restrito</p>
          </div>
          {(isAuthLoading || isLoading) && <div className="flex justify-center py-4"><Loader2 className="w-8 h-8 animate-spin text-zinc-500" /></div>}
          {isAuthError && <p className="text-xs text-red-400 font-bold text-center">{isAuthError}</p>}
          <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.target); login(fd.get('username'), fd.get('pin')); }} className="space-y-4">
            <Input name="username" placeholder="ID" required className="h-12 bg-zinc-950 border-zinc-800 text-white" />
            <Input name="pin" type="password" placeholder="PIN" required className="h-12 text-center tracking-[0.5em] bg-zinc-950 border-zinc-800 text-white" />
            <Button type="submit" className="w-full bg-white text-zinc-950 hover:bg-zinc-200 uppercase font-bold tracking-widest h-12">Entrar</Button>
          </form>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-black p-4">
        <Toaster />
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
          <p className="text-zinc-500 font-mono animate-pulse uppercase tracking-widest">Iniciando Sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
