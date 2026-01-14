import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { WifiOff, Loader2 } from 'lucide-react';
import './App.css';

// Components Legacy
import LegacyHeader from './components/legacy/LegacyHeader';
import { CreateSubProjectModal } from './components/CreateSubProjectModal';
import { MobileTabBar } from './components/MobileTabBar';
import { Toaster } from './components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
import { useUsers, useFiles } from './hooks';
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

export default function App() {
  const [appData, setAppData] = useState(null);
  const appDataRef = useRef(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [currentView, setCurrentView] = useState('home');
  const [currentProject, setCurrentProject] = useState(null);
  const [currentSubProject, setCurrentSubProject] = useState(null);
  const [currentBoardType, setCurrentBoardType] = useState('kanban');

  const [modalState, setModalState] = useState({ type: null, isOpen: false, data: null, mode: 'create' });
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTeamManagementModal, setShowTeamManagementModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [connectionErrorMessage, setConnectionErrorMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSlowLoad, setShowSlowLoad] = useState(false);
  
  const [dailyPhrase, setDailyPhrase] = useState('');
  const [megaSenaNumbers, setMegaSenaNumbers] = useState([]);
  
  const dragTaskRef = useRef(null);
  const [dragOverTargetId, setDragOverTargetId] = useState(null);

  const currentUserRef = useRef(null);

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

  const updateProjects = (updater) => {
    setAppData(prev => {
      const newProjects = typeof updater === 'function' ? updater(prev.projects) : updater;
      const newState = { ...prev, projects: newProjects };
      appDataRef.current = newState;
      saveDataToApi(newState);
      return newState;
    });
  };

  const updateUsers = (newUsersList) => {
    setAppData(prev => {
      const newState = { ...prev, users: newUsersList };
      saveDataToApi(newState);
      return newState;
    });
  };

  const {
    currentUser,
    isLoggedIn,
    isAuthLoading,
    authError,
    handleLogin,
    handleLogout,
    handleSwitchUser
  } = useUsers(appData?.users, updateUsers);

  useEffect(() => {
    setDailyPhrase(absurdPhrases[Math.floor(Math.random() * absurdPhrases.length)]);
    setMegaSenaNumbers(generateMegaSenaNumbers());
    
    const slowLoadTimer = setTimeout(() => setShowSlowLoad(true), 3000);
    
    const loadData = async () => {
      try {
        const response = await fetch('/api/projects');
        if (!response.ok) throw new Error("Falha na API");
        
        let data = await response.json();
        if (!data) data = INITIAL_STATE;
        
        if (!data.users) data.users = [];
        if (!data.projects) data.projects = [];
        if (typeof data.version !== 'number') data.version = 0;

        setAppData(data);
      } catch (err) {
        console.error("Erro load:", err);
        setConnectionError(true);
        setConnectionErrorMessage(DATA_LOAD_FALLBACK_MESSAGE);
        setAppData(INITIAL_STATE);
      } finally {
        setIsLoading(false);
        clearTimeout(slowLoadTimer);
      }
    };
    
    loadData();
    return () => clearTimeout(slowLoadTimer);
  }, []);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const { files, handleFileUpload, isDragging, setIsDragging, handleDeleteFile, isUploading } = 
    useFiles(currentProject, currentSubProject, updateProjects);

  const handleTaskAction = useCallback((action, data) => {
    if (action === 'save') {
        const taskData = data;
        const listId = modalState.listId || data.listId;
        
        if (currentProject && currentSubProject && listId) {
             updateProjects(prev => prev.map(p => {
                if (p.id !== currentProject.id) return p;
                return {
                    ...p,
                    subProjects: p.subProjects.map(sp => {
                        if (sp.id !== currentSubProject.id) return sp;
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
         if (currentProject && currentSubProject) {
             updateProjects(prev => prev.map(p => {
                 if (p.id !== currentProject.id) return p;
                 return {
                     ...p,
                     subProjects: p.subProjects.map(sp => {
                         if (sp.id !== currentSubProject.id) return sp;
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
       const drag = dragTaskRef.current;
       if (drag && currentProject && currentSubProject) {
         // Implement drag move logic if needed
       }
    }
  }, [currentProject, currentSubProject, currentBoardType, modalState, generateId]);
  
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

  if ((!appData || isAuthLoading) && !connectionError) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-center p-4">
        <div className="text-zinc-500 font-mono animate-pulse uppercase tracking-widest">
          {isAuthLoading ? 'Conectando ao Banco...' : 'Iniciando Sistema...'}
        </div>
        {showSlowLoad && <p className="text-zinc-700 text-xs font-mono">O servidor está acordando...</p>}
      </div>
    );
  }

  if (connectionError && !appData) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-red-600 gap-4 p-8 text-center">
        <WifiOff className="w-16 h-16" />
        <h1 className="text-2xl font-black uppercase">Falha na Conexão</h1>
        <p className="text-zinc-500 text-sm max-w-md">{connectionErrorMessage || DATA_LOAD_FALLBACK_MESSAGE}</p>
        <Button onClick={() => window.location.reload()} className="bg-white text-black font-bold">Tentar Novamente</Button>
      </div>
    );
  }

  if (!isLoggedIn) {
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
            <Input name="username" placeholder="ID" required className="h-12 bg-zinc-950 border-zinc-800 text-white" />
            <Input name="pin" type="password" placeholder="PIN" required className="h-12 text-center tracking-[0.5em] bg-zinc-950 border-zinc-800 text-white" />
            <Button type="submit" className="w-full bg-white text-zinc-950 hover:bg-zinc-200 uppercase font-bold tracking-widest h-12">Entrar</Button>
          </form>
        </div>
      </div>
    );
  }

  const currentEntity = currentView === 'subproject' ? currentSubProject : currentProject;
  const boardDataRaw = currentEntity?.boardData?.[currentBoardType] || { lists: [] };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-red-900/50 selection:text-white overflow-hidden">
      <LegacyHeader
        currentView={currentView}
        setCurrentView={setCurrentView}
        currentProject={currentProject}
        isSyncing={isSyncing}
        currentUser={currentUser}
        handleSwitchUser={handleSwitchUser}
        handleLogout={handleLogout}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenTeamManagement={() => setShowTeamManagementModal(true)}
        projects={appData.projects}
        isSearchOpen={isSearchOpen}
        setIsSearchOpen={setIsSearchOpen}
      />

      <main className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-y-auto p-0 md:p-8 pt-6 pb-20 md:pb-8 custom-scrollbar">
          <Suspense fallback={<LoadingView />}>
            {currentView === 'home' && (
              <LegacyHome
                currentUser={currentUser}
                dailyPhrase={dailyPhrase}
                megaSenaNumbers={megaSenaNumbers}
                projects={appData.projects}
                setModalState={setModalState}
                handleAccessProject={(item, type) => {
                    if (type === 'project') {
                        setCurrentProject(item);
                        setCurrentView('project');
                    }
                }}
                handleDeleteProject={(item) => {
                    const deletedAt = new Date().toISOString();
                    updateProjects(prev => prev.map(p => p.id === item.id ? { ...p, deleted_at: deletedAt } : p));
                }}
                isLoading={isLoading}
                COLOR_VARIANTS={COLOR_VARIANTS}
                handleDragStart={handleDragStart}
                handleDragOver={handleDragOver}
                handleDrop={handleDrop}
              />
            )}

            {currentView === 'trash' && (
               <TrashView 
                  trashItems={[]} 
                  isLoading={false}
                  onReturnHome={() => setCurrentView('home')}
                  onRestoreItem={(item) => {
                     console.log("Restore item:", item);
                  }}
               />
            )}
            
            {currentView === 'project' && currentProject && (
               <LegacyProjectView 
                  currentProject={currentProject}
                  setCurrentView={setCurrentView}
                  setModalState={setModalState}
                  COLOR_VARIANTS={COLOR_VARIANTS}
                  handleAccessProject={(sub) => {
                      setCurrentSubProject(sub);
                      setCurrentView('subproject');
                      setCurrentBoardType(sub.enabledTabs?.[0] || 'kanban');
                  }}
                  history={[]}
                  isHistoryLoading={false}
                  historyError={null}
               />
            )}
            
             {currentView === 'subproject' && currentSubProject && (
              <LegacyBoard 
                 data={boardDataRaw} 
                 entityName={currentSubProject.name}
                 enabledTabs={currentSubProject.enabledTabs || []}
                 currentBoardType={currentBoardType}
                 setCurrentBoardType={setCurrentBoardType}
                 currentSubProject={currentSubProject}
                 currentProject={currentProject}
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
               updateProjects(prev => prev.map(p => p.id === currentProject.id ? { ...p, subProjects: [...(p.subProjects||[]), { id: generateId('sub'), ...data }] } : p));
           }}
        />
        
        {modalState.type === 'task' && (
            <LegacyModal 
               modalState={modalState}
               setModalState={setModalState}
               handleTaskAction={handleTaskAction}
               isReadOnly={false}
               users={appData.users}
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
