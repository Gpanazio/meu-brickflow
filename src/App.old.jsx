import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WifiOff } from 'lucide-react';
import './App.css';

// Components Legacy (mantidos por compatibilidade visual)
import LegacyHome from './components/legacy/LegacyHome';
import LegacyProjectView from './components/legacy/LegacyProjectView';
import LegacyBoard from './components/legacy/LegacyBoard';
import LegacyHeader from './components/legacy/LegacyHeader';
import LegacyModal from './components/legacy/LegacyModal';
import CreateProjectModal from './components/CreateProjectModal';
import { CreateSubProjectModal } from './components/CreateSubProjectModal';
import { MobileTabBar } from './components/MobileTabBar';
import { SyncNotificationContainer } from './components/SyncNotification';
import { Toaster } from './components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Novos Componentes Extraídos
import UserSettingsModal from '@/components/modals/UserSettingsModal';
import TeamManagementModal from '@/components/modals/TeamManagementModal';
import TrashView from '@/components/views/TrashView';

// Hooks & Utils
import { useUsers, useFiles } from './hooks';
import { generateId } from '@/utils/ids';
import { absurdPhrases } from '@/utils/phrases';
import { COLOR_VARIANTS, USER_COLORS } from '@/constants/theme';

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
  // --- STATE ---
  const [appData, setAppData] = useState(null);
  const appDataRef = useRef(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [currentView, setCurrentView] = useState('home');
  const [currentProject, setCurrentProject] = useState(null);
  const [currentSubProject, setCurrentSubProject] = useState(null);
  const [currentBoardType, setCurrentBoardType] = useState('kanban');

  // Modals & UI
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

  // Data & History
  const [projectHistory, setProjectHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [backups, setBackups] = useState([]);
  const [isBackupsLoading, setIsBackupsLoading] = useState(false);
  const [backupError, setBackupError] = useState(false);
  const [isBackupRestoring, setIsBackupRestoring] = useState(false);
  const [trashItems, setTrashItems] = useState({ projects: [], subProjects: [] });
  const [isTrashLoading, setIsTrashLoading] = useState(false);
  const [trashError, setTrashError] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  // Drag & Drop
  const dragTaskRef = useRef(null);
  const [dragOverTargetId, setDragOverTargetId] = useState(null);
  const [dragOverListId, setDragOverListId] = useState(null);

  const currentUserRef = useRef(null);

  const addNotification = useCallback((type, message, duration = 3000) => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, type, message, duration }]);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // --- INIT ---
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
        addNotification('warning', 'Conflito de sincronização! Recarregue a página.');
        return;
      }
      
      if (response.ok) {
        const result = await response.json();
        setAppData(prev => {
           const next = { ...prev, version: result.version };
           appDataRef.current = next;
           return next;
        });
        addNotification('success', 'Salvo com sucesso', 1500);
        setConnectionError(false);
      }
    } catch (e) {
      console.error("Erro save:", e);
      setConnectionError(true);
      addNotification('error', 'Falha ao salvar dados.');
    } finally {
      setIsSyncing(false);
    }
  }, [addNotification]);

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
    handleCreateUser,
    handleLogout,
    handleSwitchUser,
    showCreateUserModal,
    setShowCreateUserModal
  } = useUsers(appData?.users, updateUsers);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const { files, handleFileUpload, isDragging, setIsDragging, handleDeleteFile, isUploading } = 
    useFiles(currentProject, currentSubProject, updateProjects);

  // --- HANDLERS ---

  const handleSaveProject = useCallback((formData) => {
    if (modalState.type === 'project') {
      updateProjects(prev => prev.map(p => p.id === modalState.data.id ? { ...p, ...formData } : p));
    } else if (modalState.type === 'subProject') {
      const targetProjId = currentProject.id;
      updateProjects(prev => prev.map(p => 
        p.id === targetProjId 
          ? { ...p, subProjects: p.subProjects.map(sp => sp.id === modalState.data.id ? { ...sp, ...formData } : sp) } 
          : p
      ));
    }
    se
