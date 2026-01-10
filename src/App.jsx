import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ArrowLeft, Upload, RotateCcw, Sparkles,
  X, ChevronDown, Settings, WifiOff, Save, Power
} from 'lucide-react';
import './App.css';

// --- IMPORTS ---
import LegacyHome from './components/legacy/LegacyHome';
import LegacyProjectView from './components/legacy/LegacyProjectView';
import LegacyBoard from './components/legacy/LegacyBoard';
import LegacyHeader from './components/legacy/LegacyHeader';
import { CreateProjectModal } from './components/CreateProjectModal'; // COMPONENTE IMPORTADO
import { CreateSubProjectModal } from './components/CreateSubProjectModal';
import { SyncNotificationContainer } from './components/SyncNotification';
import { GuestInviteModal } from './components/GuestInviteModal';
import { Toaster } from './components/ui/sonner';
import { useUsers, useFiles } from './hooks';
import SudokuGame from './components/SudokuGame';
import { absurdPhrases } from './utils/phrases'; 

// --- UTILS ---
function cn(...classes) { return classes.filter(Boolean).join(' '); }

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatBackupTimestamp = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

const generateId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const NO_SENSE_AVATARS = [
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Pizza",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Banana",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Ghost",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Alien",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Robot",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Droid",
  "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Beep",
  "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Boop",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Retro",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Glitch",
  "https://api.dicebear.com/7.x/big-smile/svg?seed=Happy",
  "https://api.dicebear.com/7.x/big-smile/svg?seed=Joy",
];

const generateMegaSenaNumbers = () => {
  const numbers = [];
  while (numbers.length < 6) {
    const num = Math.floor(Math.random() * 60) + 1;
    if (!numbers.includes(num)) numbers.push(num);
  }
  return numbers.sort((a, b) => a - b);
};

// --- UI COMPONENTS LOCAIS ---
const Button = React.forwardRef(({ className, variant = "default", size = "default", ...props }, ref) => {
  const variants = {
    default: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
    destructive: "bg-red-900 text-white hover:bg-red-800",
    outline: "border border-zinc-800 bg-black hover:bg-zinc-900 text-zinc-300",
    ghost: "hover:bg-zinc-900 text-zinc-400 hover:text-white",
    white: "bg-white text-zinc-950 hover:bg-zinc-200 font-bold", 
  };
  const sizes = { default: "h-10 px-4 py-2", sm: "h-9 rounded-md px-3 text-sm", lg: "h-12 rounded-md px-8 text-base", icon: "h-10 w-10" };
  const manualContrastFix = className?.includes('bg-white') ? 'text-zinc-950' : '';
  return <button ref={ref} className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700 disabled:pointer-events-none disabled:opacity-50", variants[variant], sizes[size], manualContrastFix, className)} {...props} />;
});
Button.displayName = "Button";

const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input type={type} className={cn("flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-600 disabled:cursor-not-allowed disabled:opacity-50 text-zinc-100", className)} ref={ref} {...props} />
));
Input.displayName = "Input";

// Dialog Components
const Dialog = ({ open, onOpenChange, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md" onClick={() => onOpenChange(false)} />
      <div className="relative z-50 grid w-full max-w-lg gap-4 glass-panel p-0 shadow-2xl duration-200 sm:rounded-none max-h-[90vh] overflow-y-auto custom-scrollbar border-0">
        {children}
      </div>
    </div>
  );
};
const DialogContent = ({ className, children }) => <div className={cn("", className)}>{children}</div>;

const Select = ({ value, onValueChange, name, defaultValue }) => (
  <div className="relative">
    <select name={name} defaultValue={defaultValue || value} onChange={(e) => onValueChange && onValueChange(e.target.value)} className="flex h-10 w-full items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm shadow-sm ring-offset-black placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 text-white appearance-none">
      <option value="blue">Blue</option><option value="red">Red</option><option value="green">Green</option><option value="purple">Purple</option><option value="orange">Orange</option>
      <option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option>
    </select>
    <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50 text-white pointer-events-none" />
  </div>
);

const Checkbox = React.forwardRef(({ className, checked, onCheckedChange, defaultChecked, ...props }, ref) => (
  <input type="checkbox" ref={ref} defaultChecked={defaultChecked} checked={checked} onChange={(e) => onCheckedChange && onCheckedChange(e.target.checked)} className={cn("peer h-5 w-5 shrink-0 rounded-sm border border-zinc-800 ring-offset-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 checked:bg-white checked:text-black accent-white", className)} {...props} />
));
Checkbox.displayName = "Checkbox";

const Label = React.forwardRef(({ className, ...props }, ref) => (
  <label ref={ref} className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-zinc-300", className)} {...props} />
));
Label.displayName = "Label";

const Avatar = ({ className, children }) => <div className={cn("relative flex h-12 w-12 shrink-0 overflow-hidden rounded-full border border-zinc-800", className)}>{children}</div>;
const AvatarImage = ({ src, className }) => <img src={src} alt="Avatar" className={cn("aspect-square h-full w-full object-cover", className)} />;
const AvatarFallback = ({ className, children }) => <div className={cn("flex h-full w-full items-center justify-center rounded-full bg-zinc-900 font-medium", className)}>{children}</div>;

// --- CONFIGURAÇÃO INICIAL ---
const INITIAL_STATE = {
  users: [
    { username: 'admin', pin: '1234', displayName: 'Admin', color: 'red', avatar: '', role: 'owner' },
    { username: 'gabriel', pin: '1234', displayName: 'Gabriel', color: 'blue', avatar: '', role: 'owner' },
    { username: 'fran', pin: '1234', displayName: 'Fran', color: 'purple', avatar: '', role: 'member' }
  ],
  projects: [],
  version: 0
};

const COLOR_VARIANTS = {
  blue: { bg: 'bg-blue-600', text: 'text-blue-500', border: 'border-blue-900' },
  red: { bg: 'bg-red-600', text: 'text-red-500', border: 'border-red-900' },
  green: { bg: 'bg-green-600', text: 'text-green-500', border: 'border-green-900' },
  purple: { bg: 'bg-purple-600', text: 'text-purple-500', border: 'border-purple-900' },
  orange: { bg: 'bg-orange-600', text: 'text-orange-500', border: 'border-orange-900' },
  zinc: { bg: 'bg-zinc-600', text: 'text-zinc-500', border: 'border-zinc-900' }
};

export default function App() {
  const [appData, setAppData] = useState(null); 
  const appDataRef = useRef(null);
  const currentUserRef = useRef(null);
  const saveQueueRef = useRef(Promise.resolve());
  const [currentView, setCurrentView] = useState('home');
  const [currentProject, setCurrentProject] = useState(null);
  const [currentSubProject, setCurrentSubProject] = useState(null);
  const [currentBoardType, setCurrentBoardType] = useState('kanban');
  const [isSyncing, setIsSyncing] = useState(false);
  const [modalState, setModalState] = useState({ type: null, isOpen: false, data: null, mode: 'create' });
  const [connectionError, setConnectionError] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showGuestInviteModal, setShowGuestInviteModal] = useState(false);
  const [dailyPhrase, setDailyPhrase] = useState('');
  const [megaSenaNumbers, setMegaSenaNumbers] = useState([]);
  const [initialLoadSuccess, setInitialLoadSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSlowLoad, setShowSlowLoad] = useState(false);
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

  const addNotification = useCallback((type, message, duration = 3000) => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, type, message, duration }]);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const normalizeApiState = (data) => {
    if (!data) return null;
    if (Array.isArray(data)) {
      return { ...INITIAL_STATE, projects: data };
    }
    return {
      ...INITIAL_STATE,
      ...data,
      version: typeof data.version === 'number' ? data.version : 0
    };
  };

  const createRequestId = () => {
    if (crypto?.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  useEffect(() => {
    if (absurdPhrases && absurdPhrases.length > 0) {
      setDailyPhrase(absurdPhrases[Math.floor(Math.random() * absurdPhrases.length)]);
    } else {
      setDailyPhrase("O servidor comeu sua frase motivacional.");
    }
    setMegaSenaNumbers(generateMegaSenaNumbers());
    
    const slowLoadTimer = setTimeout(() => setShowSlowLoad(true), 3000);

    const loadData = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch('/api/projects', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ Erro detalhado da API:', { 
            status: response.status, 
            statusText: response.statusText,
            errorData 
          });
          throw new Error(errorData.details || errorData.error || "Falha na API");
        }
        let data = await response.json();

        if (!data || (Array.isArray(data) && data.length === 0)) {
          data = INITIAL_STATE;
          await saveDataToApi(data);
        } else if (Array.isArray(data)) {
          data = { ...INITIAL_STATE, projects: data };
          await saveDataToApi(data);
        }
        setAppData(normalizeApiState(data));
        setInitialLoadSuccess(true);
      } catch (err) {
        if (err.name === 'AbortError') {
          console.warn("Timeout ao carregar dados do servidor (30s). Tentando modo offline...");
        } else {
          console.error("Erro ao carregar dados:", err);
        }
        setConnectionError(true);
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
      const requestId = createRequestId();
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
        const conflict = await response.json();
        console.warn('⚠️ CONFLITO DE SINCRONIZAÇÃO DETECTADO:', conflict);
        
        // Notifica o usuário visualmente antes do confirm
        addNotification('warning', 'Conflito de sincronização detectado!', 0);

        // Mostra alerta ao usuário sobre o conflito
        const userChoice = window.confirm(
          'Conflito de Sincronização Detectado!\n\n' +
          'Outra sessão ou usuário fez alterações enquanto você trabalhava.\n\n' +
          'Clique em OK para recarregar e ver as mudanças do servidor (suas alterações locais serão perdidas).\n' +
          'Clique em Cancelar para manter suas alterações locais e tentar salvar novamente.'
        );

        if (userChoice) {
          // Usuário escolheu recarregar do servidor
          const refreshResponse = await fetch('/api/projects');
          if (refreshResponse.ok) {
            const latest = await refreshResponse.json();
            const normalized = normalizeApiState(latest) ?? INITIAL_STATE;
            setAppData(normalized);
            appDataRef.current = normalized;
            addNotification('success', 'Dados atualizados do servidor');
          }
        } else {
          // Usuário escolheu manter mudanças locais
          // Força retry atualizando a versão
          const refreshResponse = await fetch('/api/projects');
          if (refreshResponse.ok) {
            const latest = await refreshResponse.json();
            const normalized = normalizeApiState(latest) ?? INITIAL_STATE;
            // Merge: mantém dados locais mas atualiza versão
            const merged = { ...newData, version: normalized.version };
            appDataRef.current = merged;
            // Tenta salvar novamente
            addNotification('info', 'Tentando salvar novamente...');
            setTimeout(() => enqueueSave(), 100);
          }
        }
        return;
      }
      if (response.ok) {
        const result = await response.json();
        if (typeof result.version === 'number') {
          setAppData(prev => {
            if (!prev) return prev;
            const nextState = { ...prev, version: result.version };
            appDataRef.current = nextState;
            return nextState;
          });
        }
        setConnectionError(false);
        addNotification('success', 'Alterações salvas', 2000);
      }
    } catch (e) {
      console.error("Erro ao salvar:", e);
      setConnectionError(true);
      addNotification('error', 'Erro ao sincronizar. Verifique sua conexão.');
    } finally {
      setIsSyncing(false);
    }
  }, [addNotification]);

  const enqueueSave = useCallback(() => {
    saveQueueRef.current = saveQueueRef.current.then(() => {
      const latest = appDataRef.current;
      if (!latest) return null;
      return saveDataToApi(latest);
    });
    return saveQueueRef.current;
  }, [saveDataToApi]);

  const updateGlobalState = useCallback((updater) => {
    setAppData(prev => {
      const newState = typeof updater === 'function' ? updater(prev) : updater;
      appDataRef.current = newState;
      enqueueSave();
      return newState;
    });
  }, [enqueueSave]);

  const updateProjects = (updater) => {
    updateGlobalState(prev => ({ 
      ...prev, 
      projects: typeof updater === 'function' ? updater(prev.projects) : updater 
    }));
  };

  const updateUsers = (newUsersList) => {
    updateGlobalState(prev => ({ ...prev, users: newUsersList }));
  };

  const { 
    currentUser, isLoggedIn, handleLogin, handleCreateUser, handleLogout, handleSwitchUser,
    showLoginModal, setShowLoginModal, showCreateUserModal, setShowCreateUserModal
  } = useUsers(appData?.users, updateUsers);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const fetchProjectHistory = useCallback(async (projectId) => {
    if (!projectId) return;
    setIsHistoryLoading(true);
    setHistoryError(false);
    try {
      const response = await fetch(`/api/history`);
      if (!response.ok) throw new Error('Falha ao buscar histórico');
      const data = await response.json();
      setProjectHistory(Array.isArray(data.events) ? data.events : []);
    } catch (err) {
      setProjectHistory([]);
      setHistoryError(true);
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  const handleRestoreProject = useCallback(async (eventId) => {
    if (!currentProject?.id) return;
    setIsSyncing(true);
    try {
      const response = await fetch(`/api/projects/${currentProject.id}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, userId: currentUser?.username })
      });
      if (!response.ok) throw new Error('Falha ao restaurar');
      const result = await response.json();
      const normalizedData = normalizeApiState(result.data) ?? INITIAL_STATE;
      setAppData(normalizedData);
      const nextProjects = normalizedData?.projects || [];
      const updatedProject = nextProjects.find(project => project.id === currentProject.id) || null;
      setCurrentProject(updatedProject);
      await fetchProjectHistory(currentProject.id);
    } catch (err) {
      setConnectionError(true);
    } finally {
      setIsSyncing(false);
    }
  }, [currentProject, currentUser, fetchProjectHistory]);

  const fetchBackups = useCallback(async () => {
    setIsBackupsLoading(true);
    setBackupError(false);
    try {
      const response = await fetch('/api/backups');
      if (!response.ok) throw new Error('Falha ao buscar backups');
      const data = await response.json();
      setBackups(Array.isArray(data) ? data : []);
    } catch (err) {
      setBackups([]);
      setBackupError(true);
    } finally {
      setIsBackupsLoading(false);
    }
  }, []);

  const fetchTrash = useCallback(async () => {
    setIsTrashLoading(true);
    setTrashError(false);
    try {
      const response = await fetch('/api/trash');
      if (!response.ok) throw new Error('Falha ao buscar lixeira');
      const data = await response.json();
      setTrashItems({
        projects: Array.isArray(data?.projects) ? data.projects : [],
        subProjects: Array.isArray(data?.subProjects) ? data.subProjects : []
      });
    } catch (err) {
      setTrashItems({ projects: [], subProjects: [] });
      setTrashError(true);
    } finally {
      setIsTrashLoading(false);
    }
  }, []);

  const handleRestoreBackup = useCallback(async (backupId) => {
    if (!backupId) return;
    setIsSyncing(true);
    setIsBackupRestoring(true);
    try {
      const response = await fetch('/api/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupId, userId: currentUser?.username })
      });
      if (!response.ok) throw new Error('Falha ao restaurar backup');
      const result = await response.json();
      const normalizedData = normalizeApiState(result.data) ?? INITIAL_STATE;
      setAppData(normalizedData);
      appDataRef.current = normalizedData;
      const updatedProject = normalizedData.projects?.find(project => project.id === currentProject?.id) || null;
      setCurrentProject(updatedProject);
      setCurrentSubProject(null);
      setCurrentBoardType('kanban');
      setCurrentView(updatedProject ? 'project' : 'home');
      setConnectionError(false);
    } catch (err) {
      setConnectionError(true);
    } finally {
      setIsSyncing(false);
      setIsBackupRestoring(false);
    }
  }, [currentProject, currentUser]);

  const handleRestoreTrashItem = useCallback(async ({ type, id, projectId }) => {
    if (!type || !id) return;
    setIsSyncing(true);
    try {
      const response = await fetch('/api/trash/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, projectId })
      });
      if (!response.ok) throw new Error('Falha ao restaurar item');
      const result = await response.json();
      const normalizedData = normalizeApiState(result.data) ?? INITIAL_STATE;
      setAppData(normalizedData);
      appDataRef.current = normalizedData;
      setConnectionError(false);
      await fetchTrash();
    } catch (err) {
      setConnectionError(true);
    } finally {
      setIsSyncing(false);
    }
  }, [fetchTrash]);

  useEffect(() => {
    if (currentView === 'trash') {
      fetchTrash();
    }
  }, [currentView, fetchTrash]);

  const handleExportBackupFromServer = useCallback((backupId) => {
    const targetBackup = backups.find(backup => backup.id === backupId) || backups[0];
    if (!targetBackup?.snapshot) return;
    const dataStr = JSON.stringify(targetBackup.snapshot, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `brickflow_snapshot_${targetBackup.id}_${new Date(targetBackup.created_at).toISOString().slice(0,10)}.json`);
    linkElement.click();
  }, [backups]);

  const { files, handleFileUpload, isDragging, setIsDragging, handleDeleteFile, isUploading } = 
    useFiles(currentProject, currentSubProject, updateProjects);

  const handleExportBackup = () => {
    if (!appData) return;
    const dataStr = JSON.stringify(appData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `brickflow_full_backup_${new Date().toISOString().slice(0,10)}.json`);
    linkElement.click();
  };

  const handleAccessProject = (item, type = 'project') => {
    if (type === 'project') {
      const freshProject = appData.projects.find(p => p.id === item.id) || item;
      setCurrentProject(freshProject);
      setCurrentView('project');
    } else {
      setCurrentSubProject(item);
      setCurrentView('subproject');
      setCurrentBoardType(item.enabledTabs ? item.enabledTabs[0] : 'kanban');
    }
  };

  const handleTaskClick = (task) => {
    // Encontra o projeto e sub-projeto corretos
    const project = appData.projects.find(p => p.id === task.projectId);
    if (!project) return;

    const subProject = project.subProjects?.find(sp => sp.id === task.subProjectId);
    if (!subProject) return;

    // Navega para o projeto e sub-projeto
    setCurrentProject(project);
    setCurrentSubProject(subProject);
    setCurrentBoardType(task.boardType);
    setCurrentView('subproject');
  };

  // Atualiza currentProject e currentSubProject quando appData.projects muda
  useEffect(() => {
    if (!appData?.projects) return;

    // Atualiza currentProject se ele existir
    if (currentProject?.id) {
      const updatedProject = appData.projects.find(p => p.id === currentProject.id);
      if (updatedProject) {
        setCurrentProject(updatedProject);

        // Atualiza currentSubProject se ele existir
        if (currentSubProject?.id) {
          const updatedSubProject = updatedProject.subProjects?.find(sp => sp.id === currentSubProject.id);
          if (updatedSubProject) {
            setCurrentSubProject(updatedSubProject);
          }
        }
      }
    }
  }, [appData?.projects, currentProject?.id, currentSubProject?.id]);

  useEffect(() => {
    if (currentView === 'project' && currentProject?.id) {
      fetchProjectHistory(currentProject.id);
    } else {
      setProjectHistory([]);
    }
  }, [currentProject, currentView, fetchProjectHistory]);

  useEffect(() => {
    if (showSettingsModal) {
      fetchBackups();
    }
  }, [showSettingsModal, fetchBackups]);

  const handleUpdateUser = (updatedUser) => {
    const newUsersList = appData.users.map(u => u.username === updatedUser.username ? updatedUser : u);
    updateUsers(newUsersList);
  };

  const handleDragStart = () => {};
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = () => {};
  const handleDeleteProject = (item, isSubProject = false) => {
    const deletedAt = new Date().toISOString();
    updateProjects(prev => {
      if (isSubProject) {
        return prev.map(project => ({
          ...project,
          subProjects: (project.subProjects || []).map(subProject => (
            subProject.id === item.id ? { ...subProject, deleted_at: deletedAt } : subProject
          ))
        }));
      }
      return prev.map(project => (
        project.id === item.id ? { ...project, deleted_at: deletedAt } : project
      ));
    });
  };

  if (!appData && !connectionError) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-center p-4">
        <div className="text-zinc-500 font-mono animate-pulse uppercase tracking-widest">Iniciando Sistema...</div>
        {showSlowLoad && (
          <div className="animate-in fade-in zoom-in duration-500 flex flex-col items-center gap-3">
            <p className="text-zinc-700 text-xs font-mono">O servidor está demorando para acordar...</p>
          </div>
        )}
      </div>
    );
  }

  if (connectionError && !appData) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-red-600 gap-4 p-8 text-center">
        <WifiOff className="w-16 h-16" />
        <h1 className="text-2xl font-black uppercase">Falha na Conexão</h1>
        <p className="text-zinc-500 text-sm max-w-md">Não foi possível carregar os dados. Verifique a internet ou se a variável DATABASE_URL está configurada no Railway.</p>
        <div className="flex gap-4">
          <Button onClick={() => window.location.reload()} className="bg-white text-zinc-950 font-bold">Tentar Novamente</Button>
        </div>
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
          <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.target); handleLogin(fd.get('username'), fd.get('pin')); }} className="space-y-4">
            <Input name="username" placeholder="ID (admin)" required className="h-12" />
            <Input name="pin" type="password" placeholder="PIN (1234)" required className="h-12 text-center tracking-[0.5em]" />
            <Button type="submit" className="w-full bg-white text-zinc-950 hover:bg-zinc-200 uppercase font-bold tracking-widest h-12">Entrar</Button>
          </form>
          <div className="text-center pt-2">
            <button type="button" onClick={() => setShowCreateUserModal(true)} className="text-[10px] uppercase tracking-widest text-zinc-600 hover:text-white transition-colors">Criar Nova Conta</button>
          </div>
        </div>
        
        <Dialog open={showCreateUserModal} onOpenChange={setShowCreateUserModal}>
          <div className="glass-panel text-white p-6">
            <h2 className="text-lg font-bold mb-4 uppercase">Novo Usuário</h2>
            <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.target); handleCreateUser(Object.fromEntries(fd)); }} className="space-y-4">
              <Input name="displayName" placeholder="Nome Exibição" required />
              <Input name="username" placeholder="Usuário (ID único)" required />
              <Input name="pin" type="password" placeholder="PIN" required />
              <Button type="submit" className="w-full bg-white text-zinc-950 font-bold">Criar e Salvar</Button>
            </form>
          </div>
        </Dialog>
      </div>
    );
  }

  const currentEntity = currentView === 'subproject' ? currentSubProject : currentProject;
  const boardData = currentEntity?.boardData?.[currentBoardType] || (currentBoardType === 'files' ? { files: [] } : { lists: [] });

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
        onOpenGuestInvite={() => setShowGuestInviteModal(true)}
        onExportBackup={handleExportBackup}
      />

      <main className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-y-auto p-0 md:p-8 pt-6 custom-scrollbar">
          {connectionError && (
            <div className="mb-4 mx-auto max-w-2xl bg-red-950/30 border border-red-900/50 p-3 rounded flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-wide">
                <WifiOff className="w-4 h-4" /> Modo Offline
              </div>
              <button onClick={() => saveDataToApi(appData)} className="text-xs text-white hover:underline flex items-center gap-1">
                <RotateCcw className="w-3 h-3" /> Tentar Reconectar
              </button>
            </div>
          )}

          {currentView === 'home' && (
            <LegacyHome
              currentUser={currentUser}
              dailyPhrase={dailyPhrase}
              megaSenaNumbers={megaSenaNumbers}
              projects={appData.projects}
              setModalState={setModalState}
              handleAccessProject={handleAccessProject}
              handleDeleteProject={handleDeleteProject}
              onTaskClick={handleTaskClick}
              isLoading={isLoading}
              connectionError={connectionError}
              handleDragStart={handleDragStart}
              handleDragOver={handleDragOver}
              handleDrop={handleDrop}
              COLOR_VARIANTS={COLOR_VARIANTS}
            />
          )}

          {currentView === 'trash' && (
            <TrashView
              trashItems={trashItems}
              isLoading={isTrashLoading}
              error={trashError}
              onRestoreItem={handleRestoreTrashItem}
              onReturnHome={() => setCurrentView('home')}
            />
          )}

          {currentView === 'project' && currentProject && (
            <LegacyProjectView
              currentProject={currentProject}
              setCurrentView={setCurrentView}
              setModalState={setModalState}
              handleAccessProject={handleAccessProject}
              handleDeleteProject={(sub) => handleDeleteProject(sub, true)}
              COLOR_VARIANTS={COLOR_VARIANTS}
              history={projectHistory}
              isHistoryLoading={isHistoryLoading}
              historyError={historyError}
              onRestoreEvent={handleRestoreProject}
              users={appData.users}
            />
          )}

          {currentView === 'subproject' && currentSubProject && (
            <LegacyBoard 
              data={boardData} 
              entityName={currentSubProject.name} 
              enabledTabs={currentSubProject.enabledTabs || ['kanban', 'todo', 'files']} 
              currentBoardType={currentBoardType} 
              setCurrentBoardType={setCurrentBoardType} 
              currentSubProject={currentSubProject} 
              currentProject={currentProject} 
              setCurrentView={setCurrentView} 
              setModalState={setModalState} 
              handleTaskAction={(action, data) => {
                 if (action === 'delete') {
                    updateProjects(prev => {
                        return prev.map(p => {
                            if (p.id !== currentProject.id) return p;
                            const updateEntity = (entity) => {
                                const board = entity.boardData[currentBoardType];
                                board.lists = board.lists.map(l => ({ ...l, tasks: l.tasks.filter(t => t.id !== data.taskId) }));
                                return entity;
                            };
                            return { ...p, subProjects: p.subProjects.map(sp => sp.id === currentSubProject.id ? updateEntity(sp) : sp) };
                        });
                    });
                 }
              }} 
              isFileDragging={isDragging} 
              setIsFileDragging={setIsDragging} 
              handleFileDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileUpload(e); }} 
              isUploading={isUploading} 
              handleFileUploadWithFeedback={handleFileUpload} 
              files={files} 
              handleDeleteFile={handleDeleteFile} 
            />
          )}
        </div>
      </main>

      {/* MODAL GLOBAL - CRIAÇÃO DE PROJETO */}
      {modalState.isOpen && modalState.type === 'project' && modalState.mode === 'create' ? (
        <CreateProjectModal 
          isOpen={modalState.isOpen}
          onClose={() => setModalState({ isOpen: false, type: null })}
          onCreate={(projectData) => {
             const { enabledTabs, boardData, ...projectDataWithoutModules } = projectData;
             const newProj = {
               id: generateId('proj'),
               ...projectDataWithoutModules,
               createdAt: new Date().toISOString(),
               createdBy: currentUser.username,
               members: [], // Lista de membros com acesso ao projeto
               isArchived: false,
               deleted_at: null
             };
             updateProjects(prev => [...prev, newProj]);
             setModalState({ isOpen: false, type: null });
          }}
        />
      ) : modalState.isOpen && modalState.type === 'subProject' && modalState.mode === 'create' ? (
        /* MODAL PARA CRIAR SUB-PROJETO */
        <CreateSubProjectModal
          isOpen={modalState.isOpen}
          onClose={() => setModalState({ isOpen: false, type: null })}
          onCreate={(subProjectData) => {
             const targetProjId = currentProject.id;
             const newSub = {
                 id: generateId('sub'),
                 ...subProjectData,
                 isArchived: false,
                 deleted_at: null
             };
             updateProjects(prev => prev.map(p => p.id === targetProjId ? { ...p, subProjects: [...(p.subProjects || []), newSub] } : p));
             setModalState({ isOpen: false, type: null });
          }}
        />
      ) : (
        /* MODAL GENÉRICO PARA EDITAR SUBPROJETOS E GERENCIAR TASKS */
        modalState.isOpen && (
          <Dialog open={modalState.isOpen} onOpenChange={(open) => setModalState(prev => ({ ...prev, isOpen: open }))}>
             <div className="bg-black text-white p-2">
                <h2 className="text-xl font-black uppercase mb-6">{modalState.mode === 'create' ? 'Novo' : 'Editar'} {modalState.type === 'subProject' ? 'Área' : 'Item'}</h2>
                <form onSubmit={(e) => {
                   e.preventDefault();
                   const fd = new FormData(e.target);
                   const data = Object.fromEntries(fd);

                   if (modalState.type === 'subProject') {
                      const targetProjId = currentProject.id;
                      // Only edit mode here, create is handled by CreateSubProjectModal
                      updateProjects(prev => prev.map(p => p.id === targetProjId ? { ...p, subProjects: p.subProjects.map(sp => sp.id === modalState.data.id ? { ...sp, ...data } : sp) } : p));
                   } else if (modalState.type === 'task') {
                      const listId = modalState.listId || modalState.data.listId;
                      const taskData = { ...data, id: modalState.mode === 'create' ? generateId('task') : modalState.data.id, responsibleUsers: [] };
                      updateProjects(prev => {
                          return prev.map(p => {
                              if (p.id !== currentProject.id) return p;
                              return {
                                  ...p,
                                  subProjects: p.subProjects.map(sp => {
                                      if (sp.id !== currentSubProject.id) return sp;
                                      const board = sp.boardData[currentBoardType];
                                      const newLists = board.lists.map(l => {
                                          if (l.id !== listId) return l;
                                          return { ...l, tasks: modalState.mode === 'create' ? [...l.tasks, taskData] : l.tasks.map(t => t.id === taskData.id ? { ...t, ...taskData } : t) };
                                      });
                                      return { ...sp, boardData: { ...sp.boardData, [currentBoardType]: { ...board, lists: newLists } } };
                                  })
                              };
                          });
                      });
                   }
                   setModalState({ isOpen: false, type: null });
                }} className="space-y-6">
                   
                   <div className="space-y-2">
                     <Label>Nome / Título</Label>
                     <Input name={modalState.type === 'task' ? "title" : "name"} defaultValue={modalState.data?.name || modalState.data?.title} required autoFocus className="bg-zinc-950 border-zinc-800 text-white" />
                   </div>
                   
                   {modalState.type !== 'task' && (
                       <div className="space-y-2">
                         <Label>Descrição</Label>
                         <textarea name="description" defaultValue={modalState.data?.description} className="w-full bg-zinc-950 border border-zinc-800 p-3 text-sm text-white rounded-md focus:outline-none focus:ring-1 focus:ring-red-600 min-h-[100px]" />
                       </div>
                   )}

                   {modalState.type === 'subProject' && (
                       <div className="space-y-2">
                           <Label>Cor</Label>
                           <Select name="color" defaultValue={modalState.data?.color || 'blue'} />
                       </div>
                   )}

                   {modalState.type === 'task' && (
                       <div className="space-y-2">
                           <Label>Prioridade</Label>
                           <Select name="priority" defaultValue={modalState.data?.priority || 'medium'} />
                       </div>
                   )}
                   
                   <Button type="submit" className="w-full bg-white text-zinc-950 font-bold uppercase hover:bg-zinc-200">Salvar</Button>
                </form>
             </div>
          </Dialog>
        )
      )}

      <UserSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        currentUser={currentUser}
        onUpdateUser={handleUpdateUser}
        backups={backups}
        isBackupsLoading={isBackupsLoading}
        backupError={backupError}
        isBackupRestoring={isBackupRestoring}
        onRefreshBackups={fetchBackups}
        onRestoreBackup={handleRestoreBackup}
        onExportBackup={handleExportBackupFromServer}
      />

      {showGuestInviteModal && (
        <GuestInviteModal
          onClose={() => setShowGuestInviteModal(false)}
        />
      )}
      <Toaster />
    </div>
  );
}

function UserSettingsModal({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
  backups,
  isBackupsLoading,
  backupError,
  isBackupRestoring,
  onRefreshBackups,
  onRestoreBackup,
  onExportBackup
}) {
  const [avatarPreview, setAvatarPreview] = useState(currentUser?.avatar);
  const fileInputRef = useRef(null);
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => setAvatarPreview(ev.target.result);
        reader.readAsDataURL(file);
    }
  };

  const handleSave = () => { onUpdateUser({ ...currentUser, avatar: avatarPreview }); onClose(); };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
        <div className="relative z-50 w-full max-w-lg glass-panel p-0 shadow-2xl sm:rounded-none overflow-hidden border-0">
          <div className="p-6 border-b border-white/10 flex justify-between items-center">
             <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2"><Settings className="w-5 h-5 text-zinc-500" /> Configurações</h2>
             <button onClick={onClose}><X className="w-5 h-5 text-zinc-500 hover:text-white" /></button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
              <div className="space-y-6">
                <div>
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Avatar do Usuário</h3>
                    <div className="flex items-center gap-4">
                      <Avatar className="w-20 h-20 border-2 border-zinc-800"><AvatarImage src={avatarPreview} /><AvatarFallback className="bg-zinc-900 text-zinc-500 text-2xl font-bold">{currentUser?.displayName?.charAt(0)}</AvatarFallback></Avatar>
                      <div className="space-y-2">
                          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="h-8 text-xs uppercase font-bold tracking-widest"><Upload className="w-3 h-3 mr-2" /> Upload</Button>
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                          <p className="text-[10px] text-zinc-600 font-mono">JPG, PNG ou GIF.</p>
                      </div>
                    </div>
                </div>
              <div>
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Sparkles className="w-3 h-3 text-purple-500" /> Avatares Gerados</h3>
                  <div className="grid grid-cols-6 gap-2">
                  {NO_SENSE_AVATARS.map((url, idx) => (
                      <div key={idx} onClick={() => setAvatarPreview(url)} className={cn("aspect-square rounded-full overflow-hidden cursor-pointer border-2 transition-all hover:scale-105", avatarPreview === url ? "border-red-600 opacity-100" : "border-zinc-800 opacity-60 hover:opacity-100 hover:border-zinc-600")}>
                      <img src={url} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                      </div>
                  ))}
                  </div>
              </div>
              <div>
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Save className="w-3 h-3 text-red-500" /> Backups na Nuvem</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={onRefreshBackups}
                      className="h-8 text-xs uppercase font-bold tracking-widest"
                      disabled={isBackupsLoading}
                    >
                      {isBackupsLoading ? 'Atualizando...' : 'Atualizar'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => onExportBackup()}
                      className="h-8 text-xs uppercase font-bold tracking-widest"
                      disabled={!backups?.length}
                    >
                      Exportar Último
                    </Button>
                  </div>
                  {backupError && (
                    <p className="mt-3 text-[10px] text-red-500 font-mono">Erro ao carregar backups. Tente novamente.</p>
                  )}
                  <div className="mt-4 space-y-3">
                    {isBackupsLoading && (
                      <p className="text-[10px] text-zinc-500 font-mono">Carregando snapshots...</p>
                    )}
                    {!isBackupsLoading && (!backups || backups.length === 0) && (
                      <p className="text-[10px] text-zinc-600 font-mono">Nenhum snapshot disponível ainda.</p>
                    )}
                    {!isBackupsLoading && backups?.map((backup) => (
                      <div key={backup.id} className="border border-zinc-900 rounded-md p-3 flex flex-col gap-2 bg-zinc-950/40">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-zinc-200">Snapshot #{backup.id}</p>
                            <p className="text-[10px] text-zinc-500 font-mono">
                              {formatBackupTimestamp(backup.created_at)} • {backup.kind}
                            </p>
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono">
                            {(backup.snapshot && formatFileSize(JSON.stringify(backup.snapshot).length)) || 'N/A'}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            className="h-7 text-[10px] uppercase font-bold tracking-widest"
                            onClick={() => onExportBackup(backup.id)}
                          >
                            Exportar
                          </Button>
                          <Button
                            variant="destructive"
                            className="h-7 text-[10px] uppercase font-bold tracking-widest"
                            disabled={isBackupRestoring}
                            onClick={() => {
                              if (window.confirm('Deseja restaurar este snapshot? Isso substituirá o estado atual.')) {
                                onRestoreBackup(backup.id);
                              }
                            }}
                          >
                            Restaurar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-zinc-900 bg-zinc-950 flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} className="text-xs font-bold uppercase">Cancelar</Button>
            <Button onClick={handleSave} className="bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-bold uppercase">Salvar</Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

function TrashView({ trashItems, isLoading, error, onRestoreItem, onReturnHome }) {
  const deletedProjects = trashItems?.projects || [];
  const deletedSubProjects = trashItems?.subProjects || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between border-b border-zinc-900 pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight">Lixeira</h1>
          <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest mt-2">
            Itens excluídos ficam aqui até a restauração.
          </p>
        </div>
        <Button variant="outline" onClick={onReturnHome} className="border-zinc-800 bg-black hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-none h-8 px-3 uppercase text-[10px] tracking-widest">
          <ArrowLeft className="mr-2 h-3 w-3" /> Voltar
        </Button>
      </div>

      {error && (
        <div className="border border-red-900/60 bg-red-950/40 p-4 text-[10px] text-red-400 font-mono uppercase tracking-widest">
          Erro ao carregar lixeira. Tente novamente.
        </div>
      )}

      {isLoading && (
        <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
          Carregando itens deletados...
        </div>
      )}

      {!isLoading && !error && deletedProjects.length === 0 && deletedSubProjects.length === 0 && (
        <div className="border border-zinc-900 bg-black/60 p-6 text-center">
          <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
            Nenhum item na lixeira.
          </p>
        </div>
      )}

      {!isLoading && deletedProjects.length > 0 && (
        <div className="border border-zinc-900 bg-black/60 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Projetos</h2>
            <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">{deletedProjects.length} itens</span>
          </div>
          <div className="space-y-3">
            {deletedProjects.map(project => (
              <div key={project.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border border-zinc-900 p-4 bg-black/80">
                <div className="space-y-1">
                  <p className="text-sm font-bold uppercase tracking-widest text-zinc-200">{project.name}</p>
                  <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
                    Excluído em {formatBackupTimestamp(project.deleted_at) || 'data desconhecida'}
                  </p>
                  {project.description && (
                    <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest line-clamp-2">
                      {project.description}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  className="border-zinc-800 bg-black hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-none h-8 px-3 uppercase text-[10px] tracking-widest"
                  onClick={() => onRestoreItem({ type: 'project', id: project.id })}
                >
                  <RotateCcw className="mr-2 h-3 w-3" /> Restaurar
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && deletedSubProjects.length > 0 && (
        <div className="border border-zinc-900 bg-black/60 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Áreas</h2>
            <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">{deletedSubProjects.length} itens</span>
          </div>
          <div className="space-y-3">
            {deletedSubProjects.map(subProject => (
              <div key={subProject.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border border-zinc-900 p-4 bg-black/80">
                <div className="space-y-1">
                  <p className="text-sm font-bold uppercase tracking-widest text-zinc-200">{subProject.name}</p>
                  <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
                    Projeto: {subProject.projectName || 'Sem projeto'}
                  </p>
                  <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
                    Excluído em {formatBackupTimestamp(subProject.deleted_at) || 'data desconhecida'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="border-zinc-800 bg-black hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-none h-8 px-3 uppercase text-[10px] tracking-widest"
                  onClick={() => onRestoreItem({ type: 'subProject', id: subProject.id, projectId: subProject.projectId })}
                >
                  <RotateCcw className="mr-2 h-3 w-3" /> Restaurar
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sistema de Notificações de Sincronização */}
      <SyncNotificationContainer
        notifications={notifications}
        removeNotification={removeNotification}
      />
    </div>
  );
}
