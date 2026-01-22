import React, { useState, useEffect, useCallback, useRef, lazy, Suspense, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { motion } from 'framer-motion';
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
const BlackBoxDrawer = lazy(() => import('@/components/BlackBoxDrawer'));
const MasonFloating = lazy(() => import('@/components/MasonFloating')); // New import

// ...

// Hooks & Utils
import { useUsers, useFiles, useRealtime, useTaskActions } from './hooks';
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
  const [isBlackBoxOpen, setIsBlackBoxOpen] = useState(false);
  const [isMasonOpen, setIsMasonOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionError, setConnectionError] = useState(false);


  const [dailyPhrase, setDailyPhrase] = useState('');
  const [megaSenaNumbers, setMegaSenaNumbers] = useState([]);

  const mockAuditLogs = [
    {
      id: 'evt-1049',
      user: 'Gabriel',
      timestamp: new Date().toISOString(),
      actionType: 'MOVE_TASK',
      message: "Moveu 'Refatorar UI' de Doing para Done",
      diff: { before: "status: doing", after: "status: done" }
    },
    {
      id: 'evt-1048',
      user: 'Lufe',
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      actionType: 'UPDATE_DESC',
      message: "Atualizou a descrição de 'Integração API'",
      diff: { before: "Integração básica", after: "Integração básica com suporte a WebSocket" }
    },
    {
      id: 'evt-1047',
      user: 'Ana',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      actionType: 'CREATE_TASK',
      message: "Criou nova tarefa 'Implementar Black Box Drawer'",
      diff: null
    },
    {
      id: 'evt-1046',
      user: 'Carlos',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      actionType: 'MOVE_TASK',
      message: "Moveu 'Fix bug login' de Todo para In Progress",
      diff: { before: "status: todo", after: "status: in_progress" }
    },
    {
      id: 'evt-1045',
      user: 'Maria',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      actionType: 'DELETE_FILE',
      message: "Removeu arquivo 'backup_v2.zip' do servidor",
      diff: { before: "file: backup_v2.zip (5.2MB)", after: "deleted" }
    }
  ];

  const handleUndoAction = (log) => {
    if (confirm(`ATENÇÃO: Reverter esta ação pode causar perda de dados subsequentes.\n\nDeseja reverter a ação "${log.actionType}" de ${log.user}?`)) {
      toast.info("Iniciando protocolo de reversão...");
    }
  };

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

  const {
    files,
    filteredFiles,
    handleFileUpload,
    isDragging,
    setIsDragging,
    handleDeleteFile,
    handleMoveFile,
    isUploading,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    sortBy,
    setSortBy,
    // Folders
    folders,
    filteredFolders,
    currentFolderId,
    currentFolder,
    currentFolderPath,
    navigateToFolder,
    navigateUp,
    handleCreateFolder,
    handleRenameFolder,
    handleDeleteFolder,
    handleChangeFolderColor
  } = useFiles(latestCurrentProject, latestCurrentSubProject, updateProjects);

  /* 
     REFACTOR NOTE: 
     Task management logic has been extracted to useTaskActions hook.
     This reduces App.jsx complexity significantly.
  */
  const { handleTaskAction } = useTaskActions(
    latestCurrentProject,
    latestCurrentSubProject,
    currentBoardType,
    updateProjects,
    modalState,
    setModalState
  );

  const handleDragStart = (e, item, type, listId) => {
    if (!item?.id) return;
    if (type === 'task') {
      dragTaskRef.current = { type: 'task', taskId: item.id, fromListId: listId };
      e.dataTransfer.setData('type', 'task');
    } else if (type === 'list') {
      const index = latestCurrentSubProject?.boardData?.[currentBoardType]?.lists?.findIndex(l => l.id === item.id);
      dragTaskRef.current = { type: 'list', listId: item.id, fromIndex: index };
      e.dataTransfer.setData('type', 'list');
    }
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (e, targetId, dropType) => {
    e?.preventDefault?.();
    const drag = dragTaskRef.current;
    if (!drag) return;

    if (drag.type === 'task' && dropType === 'list') {
      if (drag.fromListId === targetId) return;
      handleTaskAction('move', { taskId: drag.taskId, fromListId: drag.fromListId, toListId: targetId });
    } else if (drag.type === 'list' && dropType === 'list') {
      const lists = latestCurrentSubProject?.boardData?.[currentBoardType]?.lists || [];
      const toIndex = lists.findIndex(l => l.id === targetId);
      if (drag.fromIndex === toIndex || toIndex === -1) return;
      handleTaskAction('reorderColumns', { fromIndex: drag.fromIndex, toIndex });
    } else if (drag.type === 'subproject' && dropType === 'subproject') {
      const subProjects = latestCurrentProject?.subProjects || [];
      const toIndex = subProjects.findIndex(sp => sp.id === targetId);
      if (drag.fromIndex === toIndex || toIndex === -1) return;
      handleTaskAction('reorderSubProjects', { fromIndex: drag.fromIndex, toIndex });
    }
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

  const currentEntity = useMemo(() => {
    if (currentView === 'subproject') {
      return latestCurrentSubProject;
    }
    return latestCurrentProject;
  }, [currentView, latestCurrentProject, latestCurrentSubProject]);

  const boardDataRaw = currentEntity?.boardData?.[currentBoardType] || { lists: [] };

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

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-red-900/50 selection:text-white overflow-hidden">
      {/* DEBUG: Verificar se currentUser tem avatar */}

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
        onOpenBlackBox={() => setIsBlackBoxOpen(true)}
        onOpenMason={() => setIsMasonOpen(true)}
        projects={appData.projects}
        onNavigate={handleSearchNavigate}
        isSearchOpen={isSearchOpen}
        setIsSearchOpen={setIsSearchOpen}
      />

      <main className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-y-auto p-0 md:p-8 pt-4 md:pt-6 pb-20 md:pb-8 custom-scrollbar safe-area-pb">
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
                    handleDragStart={(e, item, type) => {
                      if (type !== 'subproject') return;
                      const index = latestCurrentProject.subProjects?.findIndex(sp => sp.id === item.id);
                      dragTaskRef.current = { type: 'subproject', subProjectId: item.id, fromIndex: index };
                      e.dataTransfer.setData('type', 'subproject');
                    }}
                    handleDragOver={handleDragOver}
                    handleDrop={handleDrop}
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
                    filteredFiles={filteredFiles}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    typeFilter={typeFilter}
                    setTypeFilter={setTypeFilter}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    handleFileUploadWithFeedback={handleFileUpload}
                    isUploading={isUploading}
                    isFileDragging={isDragging}
                    setIsFileDragging={setIsDragging}
                    handleDeleteFile={handleDeleteFile}
                    handleMoveFile={handleMoveFile}
                    // Folders
                    folders={folders}
                    filteredFolders={filteredFolders}
                    currentFolderId={currentFolderId}
                    currentFolder={currentFolder}
                    currentFolderPath={currentFolderPath}
                    navigateToFolder={navigateToFolder}
                    navigateUp={navigateUp}
                    handleCreateFolder={handleCreateFolder}
                    handleRenameFolder={handleRenameFolder}
                    handleDeleteFolder={handleDeleteFolder}
                    handleChangeFolderColor={handleChangeFolderColor}
                  />
                )}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <Suspense fallback={null}>
        <CreateProjectModal
          isOpen={modalState.isOpen && modalState.type === 'project' && (modalState.mode === 'create' || modalState.mode === 'edit')}
          onClose={() => setModalState({ isOpen: false })}
          mode={modalState.mode}
          initialData={modalState.data}
          onCreate={(data) => {
            if (modalState.mode === 'edit') {
              updateProjects(prev => prev.map(p => p.id === modalState.data.id ? { ...p, ...data } : p));
            } else {
              const newProj = { id: generateId('proj'), ...data, members: [], isArchived: false };
              updateProjects(prev => [...prev, newProj]);
            }
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
            currentUser={currentUser}
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

        <BlackBoxDrawer
          isOpen={isBlackBoxOpen}
          onOpenChange={setIsBlackBoxOpen}
          logs={mockAuditLogs}
          onUndo={handleUndoAction}
        />

        <MasonFloating
          clientContext={{
            view: currentView,
            projectId: currentProject?.id || null,
            projectName: currentProject?.name || null,
            subProjectId: currentSubProject?.id || null,
            subProjectName: currentSubProject?.name || null,
            user: currentUser?.name || 'User'
          }}
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
