import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ArrowLeft, Upload, RotateCcw, Sparkles,
  X, ChevronDown, Settings, WifiOff, Save, Power, Edit, Trash2
} from 'lucide-react';
import './App.css';

// --- IMPORTS ---
import LegacyHome from './components/legacy/LegacyHome';
import LegacyProjectView from './components/legacy/LegacyProjectView';
import LegacyBoard from './components/legacy/LegacyBoard';
import LegacyHeader from './components/legacy/LegacyHeader';
import LegacyModal from './components/legacy/LegacyModal';
import CreateProjectModal from './components/CreateProjectModal'; // COMPONENTE IMPORTADO
import { CreateSubProjectModal } from './components/CreateSubProjectModal';
import { MobileTabBar } from './components/MobileTabBar';
import { SyncNotificationContainer } from './components/SyncNotification';
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

const VIEW_STORAGE_KEY = 'brickflow:lastViewState';
const DATA_LOAD_FALLBACK_MESSAGE = 'Não foi possível carregar os dados. Verifique a internet ou se a variável DATABASE_URL está configurada no Railway.';

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md" onClick={() => onOpenChange(false)} />
      <div className="relative z-[60] grid w-full max-w-lg gap-4 glass-panel p-0 shadow-2xl duration-200 sm:rounded-none max-h-[90vh] overflow-y-auto custom-scrollbar border-0">
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

const USER_COLORS = ['blue', 'red', 'green', 'purple', 'orange', 'zinc'];

export default function App() {
  const [appData, setAppData] = useState(null); 
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const appDataRef = useRef(null);
  const currentUserRef = useRef(null);
  const saveQueueRef = useRef(Promise.resolve());
  const [currentView, setCurrentView] = useState('home');
  const [currentProject, setCurrentProject] = useState(null);
  const [currentSubProject, setCurrentSubProject] = useState(null);
  const [currentBoardType, setCurrentBoardType] = useState('kanban');
  const [isSyncing, setIsSyncing] = useState(false);
  const [modalState, setModalState] = useState({ type: null, isOpen: false, data: null, mode: 'create' });

  const dragTaskRef = useRef(null);
  const [dragOverTargetId, setDragOverTargetId] = useState(null);
  const [dragOverListId, setDragOverListId] = useState(null);
  const [connectionError, setConnectionError] = useState(false);
  const [connectionErrorMessage, setConnectionErrorMessage] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTeamManagementModal, setShowTeamManagementModal] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);

  const [userPrefs, setUserPrefs] = useState({ lastViewState: null, cardOrder: {} });
  const [isPrefsLoading, setIsPrefsLoading] = useState(false);
  const [prefsError, setPrefsError] = useState(null);
  const prefsSaveTimerRef = useRef(null);
  const prefsDirtyRef = useRef({});
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
  const [restoreViewState, setRestoreViewState] = useState(null);

  const addNotification = useCallback((type, message, duration = 3000) => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, type, message, duration }]);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

  const mergePrefs = (prev, partial) => {
    const next = {
      ...(isPlainObject(prev) ? prev : {}),
      ...(isPlainObject(partial) ? partial : {})
    };

    if (isPlainObject(partial?.lastViewState)) {
      next.lastViewState = { ...(prev?.lastViewState || {}), ...partial.lastViewState };
    }

    if (isPlainObject(partial?.cardOrder)) {
      next.cardOrder = { ...(prev?.cardOrder || {}), ...partial.cardOrder };
    }

    if (!isPlainObject(next.cardOrder)) next.cardOrder = {};

    return next;
  };

  const persistPrefs = useCallback((partial) => {
    setUserPrefs((prev) => mergePrefs(prev, partial));

    prefsDirtyRef.current = mergePrefs(prefsDirtyRef.current, partial);

    if (!currentUserRef.current?.username) {
      return;
    }

    if (prefsSaveTimerRef.current) {
      clearTimeout(prefsSaveTimerRef.current);
    }

    prefsSaveTimerRef.current = setTimeout(async () => {
      const dirty = prefsDirtyRef.current;
      prefsDirtyRef.current = {};

      try {
        const response = await fetch('/api/users/me/prefs', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: dirty })
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error || 'Erro ao salvar preferências');
        }

        setPrefsError(null);
      } catch (err) {
        setPrefsError(err.message);
      }
    }, 600);
  }, []);

  const handleSaveProject = useCallback((formData) => {
    if (modalState.type === 'project') {
      // Editar projeto existente
      setAppData(prev => ({
        ...prev,
        projects: prev.projects.map(p => p.id === modalState.data.id ? { ...p, ...formData } : p)
      }));
    } else if (modalState.type === 'subProject') {
      // Editar sub-projeto existente
      const targetProjId = currentProject.id;
      setAppData(prev => ({
        ...prev,
        projects: prev.projects.map(p =>
          p.id === targetProjId
            ? {
                ...p,
                subProjects: p.subProjects.map(sp =>
                  sp.id === modalState.data.id ? { ...sp, ...formData } : sp
                )
              }
            : p
        )
      }));
    }
    setModalState({ isOpen: false, type: null });
  }, [currentProject?.id, modalState.type, modalState.data?.id]);

  const handleTaskAction = useCallback((action, data) => {
    if (action === 'save') {
      const taskData = data || {};
      const safeUsers = Array.isArray(appData?.users) ? appData.users : [];

      // Basic Mention Detection
      const allText = (taskData.description || '') + ' ' + (taskData.comments?.map(c => c.text).join(' ') || '');
      const mentions = allText.match(/@(\w+)/g);
      if (mentions) {
        mentions.forEach(m => {
          const username = m.substring(1);
          if (safeUsers.some(u => u.username === username)) {
            addNotification('info', `Usuário @${username} mencionado no card "${taskData.title}"`);
          }
        });
      }

      // Assignment Notification
      if (taskData.responsibleUsers?.length > 0) {
        taskData.responsibleUsers.forEach(username => {
          if (!modalState.data?.responsibleUsers?.includes(username)) {
            addNotification('info', `Card "${taskData.title}" atribuído a @${username}`);
          }
        });
      }

      // Lógica de save real - atualizar o board
      const listId = modalState.listId || data.listId;
      if (currentProject && currentSubProject && listId) {
        setAppData(prev => ({
          ...prev,
          projects: prev.projects.map(p => {
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
                          // Novo task
                          return { ...list, tasks: [...list.tasks, { ...taskData, id: taskData.id || generateId('task') }] };
                        } else {
                          // Update task
                          return {
                            ...list,
                            tasks: list.tasks.map(t => t.id === taskData.id ? { ...t, ...taskData } : t)
                          };
                        }
                      })
                    }
                  }
                };
              })
            };
          })
        }));
      }
      setModalState({ isOpen: false, type: null });
    } else if (action === 'move') {
      const { taskId, fromListId, toListId } = data || {};
      if (!taskId || !fromListId || !toListId || fromListId === toListId) return;

      if (currentProject && currentSubProject) {
        setAppData((prev) => ({
          ...prev,
          projects: prev.projects.map((p) => {
            if (p.id !== currentProject.id) return p;
            return {
              ...p,
              subProjects: p.subProjects.map((sp) => {
                if (sp.id !== currentSubProject.id) return sp;
                const board = sp.boardData?.[currentBoardType];
                if (!board?.lists) return sp;

                let movingTask = null;

                const listsWithoutTask = board.lists.map((list) => {
                  if (list.id !== fromListId) return list;
                  const tasks = Array.isArray(list.tasks) ? list.tasks : [];
                  const idx = tasks.findIndex((t) => t.id === taskId);
                  if (idx === -1) return list;
                  movingTask = tasks[idx];
                  return { ...list, tasks: tasks.filter((t) => t.id !== taskId) };
                });

                if (!movingTask) return sp;

                const listExists = listsWithoutTask.some((l) => l.id === toListId);
                if (!listExists) return sp;

                const nextLists = listsWithoutTask.map((list) => {
                  if (list.id !== toListId) return list;
                  const tasks = Array.isArray(list.tasks) ? list.tasks : [];
                  return { ...list, tasks: [...tasks, movingTask] };
                });

                return {
                  ...sp,
                  boardData: {
                    ...sp.boardData,
                    [currentBoardType]: {
                      ...board,
                      lists: nextLists
                    }
                  }
                };
              })
            };
          })
        }));
      }
    } else if (action === 'delete') {
      // Lógica de delete existente
      if (currentProject && currentSubProject) {
        setAppData(prev => ({
          ...prev,
          projects: prev.projects.map(p => {
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
                      lists: board.lists.map(l => ({
                        ...l,
                        tasks: l.tasks.filter(t => t.id !== data.taskId)
                      }))
                    }
                  }
                };
              })
            };
          })
        }));
      }
    }
  }, [addNotification, appData?.users, modalState.data, modalState.listId, currentProject, currentSubProject, currentBoardType]);

  const normalizeApiState = (data) => {
    if (!data) return null;
    if (Array.isArray(data)) {
      return { ...INITIAL_STATE, projects: data };
    }
    const normalized = {
      ...INITIAL_STATE,
      ...data,
      version: typeof data.version === 'number' ? data.version : 0
    };
    if (!Array.isArray(normalized.users)) {
      normalized.users = INITIAL_STATE.users;
    }
    if (!Array.isArray(normalized.projects)) {
      normalized.projects = [];
    }
    return normalized;
  };

  const createRequestId = () => {
    if (crypto?.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const formatConnectionErrorMessage = useCallback((error, fallback) => {
    if (!error) return fallback;
    if (error.name === 'AbortError') {
      return 'Tempo esgotado ao conectar ao servidor.';
    }
    const message = String(error.message || '').trim();
    if (!message || message === 'Failed to fetch') return fallback;
    return message;
  }, []);

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
        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        const waitForServer = async () => {
          let backoffMs = 500;
          const startedAt = Date.now();
          const maxWaitMs = 120000;

          while (Date.now() - startedAt < maxWaitMs) {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 15000);
              try {
                const response = await fetch('/api/health', { signal: controller.signal });

                if (response.ok) return true;

                if (response.status === 503) {
                  const payload = await response.json().catch(() => null);
                  if (payload?.code === 'MISSING_DATABASE_URL') {
                    return false;
                  }
                }
              } finally {
                clearTimeout(timeoutId);
              }
            } catch {
              // ignore and retry
            }

            await sleep(backoffMs);
            backoffMs = Math.min(5000, Math.floor(backoffMs * 1.5));
          }

          return false;
        };

        const ready = await waitForServer();
        if (!ready) {
          throw new Error('Servidor indisponível');
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000);

        let response;
        try {
          response = await fetch('/api/projects', { signal: controller.signal });
        } finally {
          clearTimeout(timeoutId);
        }

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
          console.warn("Timeout ao carregar dados do servidor. Tentando modo offline...");
        } else {
          console.error("Erro ao carregar dados:", err);
        }
        setConnectionError(true);
        setConnectionErrorMessage(
          formatConnectionErrorMessage(
            err,
            DATA_LOAD_FALLBACK_MESSAGE
          )
        );
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
    if (!appData?.projects || !restoreViewState) return;
    const { view, projectId, subProjectId, boardType } = restoreViewState;
    if (!view || view === 'home') {
      setCurrentView('home');
      setRestoreViewState(null);
      return;
    }

    if (projectId) {
      const project = appData.projects.find((proj) => proj.id === projectId);
      if (project) {
        setCurrentProject(project);
        if (subProjectId) {
          const subProject = project.subProjects?.find((sp) => sp.id === subProjectId);
          if (subProject) {
            setCurrentSubProject(subProject);
            setCurrentBoardType(boardType || subProject.enabledTabs?.[0] || 'kanban');
            setCurrentView('subproject');
            setRestoreViewState(null);
            return;
          }
        }
        setCurrentSubProject(null);
        setCurrentBoardType(boardType || 'kanban');
        setCurrentView('project');
        setRestoreViewState(null);
        return;
      }
    }

    setCurrentProject(null);
    setCurrentSubProject(null);
    setCurrentBoardType('kanban');
    setCurrentView('home');
    setRestoreViewState(null);
  }, [appData?.projects, restoreViewState]);

  useEffect(() => {
    const payload = {
      view: currentView,
      projectId: currentProject?.id || null,
      subProjectId: currentSubProject?.id || null,
      boardType: currentBoardType
    };

    if (!currentUserRef.current?.username) return;

    persistPrefs({ lastViewState: payload });
  }, [currentView, currentProject?.id, currentSubProject?.id, currentBoardType]);

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
        setConnectionErrorMessage(null);
        addNotification('success', 'Alterações salvas', 2000);
      }
    } catch (e) {
      console.error("Erro ao salvar:", e);
      setConnectionError(true);
      setConnectionErrorMessage(formatConnectionErrorMessage(e, 'Erro ao sincronizar. Verifique sua conexão.'));
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

  useEffect(() => {
    let alive = true;

    if (!currentUser?.username || !isLoggedIn) {
      setUserPrefs({ lastViewState: null, cardOrder: {} });
      setRestoreViewState(null);
      return;
    }

    setIsPrefsLoading(true);
    setPrefsError(null);

    fetch('/api/users/me/prefs')
      .then((r) => (r.ok ? r.json() : Promise.resolve({ data: {} })))
      .then((payload) => {
        if (!alive) return;
        const next = mergePrefs({ lastViewState: null, cardOrder: {} }, payload?.data || {});
        setUserPrefs(next);

        if (next?.lastViewState) {
          setRestoreViewState(next.lastViewState);
        }
      })
      .catch((err) => {
        if (!alive) return;
        setPrefsError(String(err?.message || 'Erro ao carregar preferências'));
      })
      .finally(() => {
        if (!alive) return;
        setIsPrefsLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [currentUser?.username, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && connectionError) {
      setConnectionError(false);
      setConnectionErrorMessage(null);
    }
  }, [connectionError, isLoggedIn]);

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
      setConnectionErrorMessage(formatConnectionErrorMessage(err, 'Falha ao restaurar projeto.'));
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
      setConnectionErrorMessage(null);
    } catch (err) {
      setConnectionError(true);
      setConnectionErrorMessage(formatConnectionErrorMessage(err, 'Falha ao restaurar backup.'));
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
      setConnectionErrorMessage(null);
      await fetchTrash();
    } catch (err) {
      setConnectionError(true);
      setConnectionErrorMessage(formatConnectionErrorMessage(err, 'Falha ao restaurar item.'));
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

  const handleSearchNavigation = (result) => {
    switch (result.type) {
      case 'Project':
        setCurrentProject(result);
        setCurrentView('project');
        break;
      case 'SubProject':
        setCurrentProject(result.parentProject);
        setCurrentSubProject(result);
        setCurrentView('subproject');
        break;
      case 'Task':
        setCurrentProject(result.parentProject);
        setCurrentSubProject(result.parentSubProject);
        setCurrentBoardType(result.boardType);
        setCurrentView('subproject');
        break;
      default:
        break;
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

  const makeCardOrderKeyUnsafe = (projectId, subProjectId, boardType, listId) => {
    return `${projectId || 'none'}:${subProjectId || 'none'}:${boardType || 'none'}:${listId || 'none'}`;
  };

  const getOrderedTaskIdsForList = (listId) => {
    const projectId = currentProject?.id;
    const subProjectId = currentSubProject?.id;
    if (!projectId || !subProjectId) return [];

    const board = currentSubProject?.boardData?.[currentBoardType];
    const lists = Array.isArray(board?.lists) ? board.lists : [];
    const list = lists.find((l) => l.id === listId);
    const tasks = Array.isArray(list?.tasks) ? list.tasks : [];

    const key = makeCardOrderKeyUnsafe(projectId, subProjectId, currentBoardType, listId);
    const order = userPrefs?.cardOrder?.[key];
    if (!Array.isArray(order) || order.length === 0) {
      return tasks.map((t) => t.id).filter(Boolean);
    }

    const byId = new Map(tasks.map((t) => [t.id, t]));
    const ids = [];
    order.forEach((id) => {
      if (byId.has(id)) {
        ids.push(id);
        byId.delete(id);
      }
    });
    for (const id of byId.keys()) ids.push(id);
    return ids;
  };

  const handleDragStart = (e, item, type, listId) => {
    if (type !== 'task' || !item?.id || !listId) return;

    dragTaskRef.current = { taskId: item.id, fromListId: listId };

    try {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', JSON.stringify({ taskId: item.id, fromListId: listId }));
    } catch {
      // ignore
    }
  };

  const handleDragEnter = (_e, taskId, listId) => {
    if (!taskId) return;
    setDragOverTargetId(taskId);
    setDragOverListId(listId || null);
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (e, toListId, dropType) => {
    e?.preventDefault?.();

    if (dropType !== 'list') return;

    const drag = dragTaskRef.current;
    if (!drag?.taskId || !drag?.fromListId || !toListId) return;

    const projectId = currentProject?.id;
    const subProjectId = currentSubProject?.id;
    if (!projectId || !subProjectId) return;

    const boardType = currentBoardType;
    const fromListId = drag.fromListId;
    const taskId = drag.taskId;

    const fromKey = makeCardOrderKeyUnsafe(projectId, subProjectId, boardType, fromListId);
    const toKey = makeCardOrderKeyUnsafe(projectId, subProjectId, boardType, toListId);

    const currentToIds = getOrderedTaskIdsForList(toListId).filter((id) => id !== taskId);
    const currentFromIds = fromListId === toListId
      ? currentToIds
      : getOrderedTaskIdsForList(fromListId).filter((id) => id !== taskId);

    const shouldInsertBefore = dragOverListId === toListId && dragOverTargetId && dragOverTargetId !== taskId;
    const insertIndex = shouldInsertBefore
      ? Math.max(0, currentToIds.indexOf(dragOverTargetId))
      : currentToIds.length;

    const nextToIds = [...currentToIds];
    nextToIds.splice(insertIndex < 0 ? nextToIds.length : insertIndex, 0, taskId);

    const cardOrderPatch = {};

    if (fromListId !== toListId) {
      cardOrderPatch[fromKey] = currentFromIds;
      cardOrderPatch[toKey] = nextToIds;
      persistPrefs({ cardOrder: cardOrderPatch });
      handleTaskAction('move', { taskId, fromListId, toListId });
    } else {
      cardOrderPatch[toKey] = nextToIds;
      persistPrefs({ cardOrder: cardOrderPatch });
    }

    dragTaskRef.current = null;
    setDragOverTargetId(null);
    setDragOverListId(null);
  };

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

  if ((!appData || isAuthLoading) && !connectionError) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-center p-4">
        <div className="text-zinc-500 font-mono animate-pulse uppercase tracking-widest">
          {isAuthLoading ? 'Conectando ao Banco...' : 'Iniciando Sistema...'}
        </div>
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
        <p className="text-zinc-500 text-sm max-w-md">
          {connectionErrorMessage || DATA_LOAD_FALLBACK_MESSAGE}
        </p>
        <div className="flex gap-4">
          <Button onClick={() => window.location.reload()} className="bg-white text-zinc-950 font-bold">Tentar Novamente</Button>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    const loginErrorMessage = authError || (connectionError
      ? connectionErrorMessage || 'Não foi possível conectar à API. Verifique se o backend está no ar e se as variáveis `DATABASE_URL` (e opcionalmente `DATABASE_SSL`) estão configuradas no Railway.'
      : null);

    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-black p-4">
        <Toaster />
        <div className="w-full max-w-sm glass-panel p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-xl font-bold tracking-widest text-white uppercase">BrickFlow OS</h1>
            <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Acesso Restrito</p>
          </div>

          {(isAuthLoading || loginErrorMessage) && (
            <div className="text-center">
              {isAuthLoading ? (
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">Verificando servidor...</p>
              ) : (
                <p className="text-xs text-red-400 font-bold">{loginErrorMessage}</p>
              )}
            </div>
          )}
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
  const boardDataRaw = currentEntity?.boardData?.[currentBoardType] || (currentBoardType === 'files' ? { files: { files: [] } } : { lists: [] });

  const makeCardOrderKey = (projectId, subProjectId, boardType, listId) => {
    return `${projectId || 'none'}:${subProjectId || 'none'}:${boardType || 'none'}:${listId || 'none'}`;
  };

  const orderedBoardData = (() => {
    if (!boardDataRaw || typeof boardDataRaw !== 'object') return boardDataRaw;
    if (!Array.isArray(boardDataRaw.lists)) return boardDataRaw;

    const cardOrder = userPrefs?.cardOrder || {};
    const projectId = currentProject?.id || null;
    const subProjectId = currentSubProject?.id || null;
    const boardType = currentBoardType;

    const nextLists = boardDataRaw.lists.map((list) => {
      const tasks = Array.isArray(list?.tasks) ? list.tasks : [];
      const key = makeCardOrderKey(projectId, subProjectId, boardType, list?.id);
      const order = Array.isArray(cardOrder[key]) ? cardOrder[key] : null;
      if (!order) return list;

      const byId = new Map(tasks.map((t) => [t.id, t]));
      const ordered = [];
      order.forEach((id) => {
        if (byId.has(id)) {
          ordered.push(byId.get(id));
          byId.delete(id);
        }
      });
      for (const t of byId.values()) ordered.push(t);

      return { ...list, tasks: ordered };
    });

    return { ...boardDataRaw, lists: nextLists };
  })();

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
        onExportBackup={handleExportBackup}
        projects={appData.projects}
        onSearchNavigate={handleSearchNavigation}
        isSearchOpen={isSearchOpen}
        setIsSearchOpen={setIsSearchOpen}
      />

      <main className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-y-auto p-0 md:p-8 pt-6 pb-20 md:pb-8 custom-scrollbar">
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
               data={orderedBoardData} 
              entityName={currentSubProject.name} 
              enabledTabs={currentSubProject.enabledTabs || ['kanban', 'todo', 'files']} 
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
        /* MODAL COMPLETO - EDITAR SUBPROJETOS E GERENCIAR TASKS */
        <LegacyModal
          modalState={modalState}
          setModalState={setModalState}
          handlePasswordSubmit={() => {}}
          handleSaveProject={handleSaveProject}
          handleTaskAction={handleTaskAction}
          USER_COLORS={USER_COLORS}
          isReadOnly={isReadOnly}
          users={appData?.users}
        />
      )}

       <UserSettingsModal
         isOpen={showSettingsModal}
         onClose={() => setShowSettingsModal(false)}
         currentUser={currentUser}
         users={appData?.users || []}
         onUpdateUser={handleUpdateUser}
         backups={backups}
         isBackupsLoading={isBackupsLoading}
         backupError={backupError}
         isBackupRestoring={isBackupRestoring}
         onRefreshBackups={fetchBackups}
         onRestoreBackup={handleRestoreBackup}
         onExportBackup={handleExportBackupFromServer}
       />

       <TeamManagementModal
         isOpen={showTeamManagementModal}
         onClose={() => setShowTeamManagementModal(false)}
         currentUser={currentUser}
       />

      <MobileTabBar 
        currentView={currentView}
        setCurrentView={setCurrentView}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenCreateProject={() => setModalState({ type: 'project', mode: 'create', isOpen: true })}
        currentUser={currentUser}
      />

      <Toaster />
    </div>
  );
}

function UserSettingsModal({
  isOpen,
  onClose,
  currentUser,
  users,
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
  
  // User Management State (admin)
  const [manageMode, setManageMode] = useState('list'); // 'list', 'create', 'edit'
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ displayName: '', username: '', email: '', avatar: '', pin: '', role: 'member', color: 'zinc' });
  const [isLoadingUserAction, setIsLoadingUserAction] = useState(false);
  const [userActionMessage, setUserActionMessage] = useState({ type: '', text: '' });

  const [adminUsers, setAdminUsers] = useState([]);
  const [isAdminUsersLoading, setIsAdminUsersLoading] = useState(false);
  const [adminUsersError, setAdminUsersError] = useState(null);

  const loadAdminUsers = useCallback(async () => {
    setIsAdminUsersLoading(true);
    setAdminUsersError(null);
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Erro ao carregar usuários');
      }
      const normalized = (data?.users || []).map((row) => ({
        id: row.id,
        username: row.username,
        displayName: row.name || row.username,
        email: row.email || '',
        createdAt: row.created_at,
        role: row.role || 'member',
        avatar: row.avatar || '',
        color: row.color || 'zinc'
      }));
      setAdminUsers(normalized);
    } catch (err) {
      setAdminUsers([]);
      setAdminUsersError(err.message);
    } finally {
      setIsAdminUsersLoading(false);
    }
  }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setAvatarPreview(currentUser?.avatar);
    }
  }, [isOpen, currentUser]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => setAvatarPreview(ev.target.result);
        reader.readAsDataURL(file);
    }
  };

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState(null);

  const handleSave = async () => {
    setIsSavingProfile(true);
    setProfileSaveError(null);

    try {
      const response = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: avatarPreview })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao salvar avatar');
      }

      onClose();
      window.location.reload();
    } catch (err) {
      setProfileSaveError(err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUserAction = async (e) => {
    e.preventDefault();
    setIsLoadingUserAction(true);
    setUserActionMessage({ type: '', text: '' });

    try {
        const isEdit = manageMode === 'edit';
        const endpoint = isEdit ? `/api/admin/users/${editingUser.username}` : '/api/admin/users';
        const method = isEdit ? 'PUT' : 'POST';
        
        const payload = { ...formData };
        if (isEdit && !payload.pin) delete payload.pin; // Don't send empty pin on edit

        const response = await fetch(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erro na operação');

        setUserActionMessage({ type: 'success', text: data.message || 'Sucesso!' });
        
        if (!isEdit) {
          setFormData({ displayName: '', username: '', email: '', avatar: '', pin: '', role: 'member', color: 'zinc' });
        }

        await loadAdminUsers();
        setManageMode('list');
        setEditingUser(null);
    } catch (err) {
        setUserActionMessage({ type: 'error', text: err.message });
    } finally {
        setIsLoadingUserAction(false);
    }
  };

  const handleDeleteUser = async (username) => {
      if (!window.confirm(`Tem certeza que deseja excluir o usuário ${username}?`)) return;
      
      try {
          const response = await fetch(`/api/admin/users/${username}`, { method: 'DELETE' });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || 'Erro ao deletar usuário');

          setUserActionMessage({ type: 'success', text: data.message || 'Usuário deletado.' });
          await loadAdminUsers();
      } catch (err) {
          setUserActionMessage({ type: 'error', text: err.message });
      }
  };

  const startEdit = (user) => {
      setEditingUser(user);
      setFormData({
          displayName: user.displayName,
          username: user.username, // ReadOnly
          email: user.email || '',
          avatar: user.avatar || '',
          pin: '', // Blank by default
          role: user.role,
          color: user.color || 'zinc'
      });
      setManageMode('edit');
      setUserActionMessage({ type: '', text: '' });
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2"><Settings className="w-5 h-5 text-zinc-500" /> Configurações</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-zinc-500 hover:text-white" /></button>
      </div>
      <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
          <div className="space-y-8">
            {/* Seção Pessoal */}
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
      <div className="p-4 border-t border-zinc-900 bg-zinc-950 flex flex-col gap-2">
        {profileSaveError && (
          <p className="text-[10px] text-red-500 font-mono text-center">{profileSaveError}</p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} className="text-xs font-bold uppercase">Cancelar</Button>
          <Button onClick={handleSave} disabled={isSavingProfile} className="bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-bold uppercase">
            {isSavingProfile ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function TeamManagementModal({ isOpen, onClose, currentUser }) {
  const [manageMode, setManageMode] = useState('list');
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ displayName: '', username: '', email: '', avatar: '', pin: '', role: 'member', color: 'zinc' });
  const [isLoadingUserAction, setIsLoadingUserAction] = useState(false);
  const [userActionMessage, setUserActionMessage] = useState({ type: '', text: '' });

  const [adminUsers, setAdminUsers] = useState([]);
  const [isAdminUsersLoading, setIsAdminUsersLoading] = useState(false);
  const [adminUsersError, setAdminUsersError] = useState(null);

  const canManageTeam = ['gabriel', 'lufe'].includes(String(currentUser?.username || '').toLowerCase());

  const loadAdminUsers = useCallback(async () => {
    setIsAdminUsersLoading(true);
    setAdminUsersError(null);
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Erro ao carregar usuários');
      }
      const normalized = (data?.users || []).map((row) => ({
        id: row.id,
        username: row.username,
        displayName: row.name || row.username,
        email: row.email || '',
        createdAt: row.created_at,
        role: row.role || 'member',
        avatar: row.avatar || '',
        color: row.color || 'zinc'
      }));
      setAdminUsers(normalized);
    } catch (err) {
      setAdminUsers([]);
      setAdminUsersError(err.message);
    } finally {
      setIsAdminUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setManageMode('list');
    setEditingUser(null);
    setUserActionMessage({ type: '', text: '' });

    if (canManageTeam) {
      loadAdminUsers();
    }
  }, [isOpen, canManageTeam, loadAdminUsers]);

  const startEdit = (user) => {
    setEditingUser(user);
    setFormData({
      displayName: user.displayName,
      username: user.username,
      email: user.email || '',
      avatar: user.avatar || '',
      pin: '',
      role: user.role || 'member',
      color: user.color || 'zinc'
    });
    setManageMode('edit');
    setUserActionMessage({ type: '', text: '' });
  };

  const handleUserAction = async (e) => {
    e.preventDefault();
    setIsLoadingUserAction(true);
    setUserActionMessage({ type: '', text: '' });

    try {
      const isEdit = manageMode === 'edit';
      const endpoint = isEdit ? `/api/admin/users/${editingUser.username}` : '/api/admin/users';
      const method = isEdit ? 'PUT' : 'POST';

      const payload = { ...formData };
      if (isEdit && !payload.pin) delete payload.pin;

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Erro na operação');

      setUserActionMessage({ type: 'success', text: data.message || 'Sucesso!' });

      if (!isEdit) {
        setFormData({ displayName: '', username: '', email: '', avatar: '', pin: '', role: 'member', color: 'zinc' });
      }

      await loadAdminUsers();
      setManageMode('list');
      setEditingUser(null);
    } catch (err) {
      setUserActionMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoadingUserAction(false);
    }
  };

  const handleDeleteUser = async (username) => {
    if (!window.confirm(`Tem certeza que deseja excluir o usuário ${username}?`)) return;

    try {
      const response = await fetch(`/api/admin/users/${username}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Erro ao deletar usuário');

      setUserActionMessage({ type: 'success', text: data.message || 'Usuário deletado.' });
      await loadAdminUsers();
    } catch (err) {
      setUserActionMessage({ type: 'error', text: err.message });
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="p-6 border-b border-white/10 flex justify-between items-center">
        <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
          <Power className="w-5 h-5 text-green-500" /> Gerenciar Equipe
        </h2>
        <button onClick={onClose}><X className="w-5 h-5 text-zinc-500 hover:text-white" /></button>
      </div>

      {!canManageTeam ? (
        <div className="p-6">
          <p className="text-xs text-zinc-400">Acesso restrito.</p>
        </div>
      ) : (
        <div className="p-6 space-y-4">
          <div className="flex gap-2">
            <button 
              onClick={() => setManageMode('list')}
              className={cn("text-[10px] uppercase font-bold px-2 py-1 rounded transition-colors", manageMode === 'list' ? "bg-white text-black" : "text-zinc-500 hover:text-white")}
            >
              Lista
            </button>
            <button 
              onClick={() => { setManageMode('create'); setEditingUser(null); setFormData({ displayName: '', username: '', email: '', avatar: '', pin: '', role: 'member', color: 'zinc' }); }}
              className={cn("text-[10px] uppercase font-bold px-2 py-1 rounded transition-colors", manageMode === 'create' ? "bg-white text-black" : "text-zinc-500 hover:text-white")}
            >
              Novo
            </button>
          </div>

          {manageMode === 'list' && (
            <div className="space-y-2">
              {isAdminUsersLoading && (
                <p className="text-[10px] text-zinc-500 font-mono">Carregando usuários...</p>
              )}
              {!isAdminUsersLoading && adminUsersError && (
                <p className="text-[10px] text-red-500 font-mono">{adminUsersError}</p>
              )}
              {!isAdminUsersLoading && !adminUsersError && adminUsers.length === 0 && (
                <p className="text-[10px] text-zinc-600 font-mono">Nenhum usuário encontrado em `master_users`.</p>
              )}

              {!isAdminUsersLoading && !adminUsersError && adminUsers.map(u => {
                const colorVariant = COLOR_VARIANTS[u.color] || COLOR_VARIANTS.zinc;
                return (
                  <div key={u.username} className="flex items-center justify-between bg-black/40 border border-zinc-900 p-2 rounded">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border",
                        colorVariant.bg,
                        colorVariant.border,
                        "text-white"
                      )}>
                        {(u.displayName || u.username).charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-200">{u.displayName}</p>
                        <p className="text-[10px] text-zinc-600 font-mono">@{u.username} • {u.role === 'owner' ? 'ADMIN' : 'MEMBRO'}</p>
                        {u.email && (
                          <p className="text-[10px] text-zinc-700 font-mono">{u.email}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white" onClick={() => startEdit(u)}>
                        <Edit className="w-3 h-3" />
                      </Button>
                      {u.username !== currentUser.username && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-red-500" onClick={() => handleDeleteUser(u.username)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {(manageMode === 'create' || manageMode === 'edit') && (
            <form onSubmit={handleUserAction} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Nome</label>
                  <Input value={formData.displayName} onChange={e => setFormData({ ...formData, displayName: e.target.value })} required className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Usuário (ID)</label>
                  <Input value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} required className="h-8 text-xs" disabled={manageMode === 'edit'} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Email</label>
                  <Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="h-8 text-xs" placeholder="nome@empresa.com" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Avatar (URL)</label>
                  <Input value={formData.avatar} onChange={e => setFormData({ ...formData, avatar: e.target.value })} className="h-8 text-xs" placeholder="https://..." />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">{manageMode === 'edit' ? 'Nova Senha (Opcional)' : 'Senha'}</label>
                  <Input type="password" value={formData.pin} onChange={e => setFormData({ ...formData, pin: e.target.value })} required={manageMode === 'create'} className="h-8 text-xs" autoComplete="new-password" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Permissão</label>
                  <div className="relative">
                    <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="flex h-8 w-full items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-zinc-700 text-white appearance-none">
                      <option value="member">Membro</option>
                      <option value="owner">Admin (Owner)</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-2 h-4 w-4 opacity-50 text-white pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Cor do Avatar</label>
                <div className="flex gap-2">
                  {['blue', 'red', 'green', 'purple', 'orange', 'zinc'].map(c => {
                    const colorVariant = COLOR_VARIANTS[c] || COLOR_VARIANTS.zinc;
                    return (
                      <div
                        key={c}
                        onClick={() => setFormData({ ...formData, color: c })}
                        className={cn(
                          "w-6 h-6 rounded-full cursor-pointer border-2 transition-all",
                          formData.color === c ? "border-white scale-110" : "border-transparent opacity-50 hover:opacity-100",
                          colorVariant.bg
                        )}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                {manageMode === 'edit' && (
                  <Button type="button" variant="ghost" className="flex-1 h-8 text-xs font-bold uppercase" onClick={() => setManageMode('list')}>Cancelar</Button>
                )}
                <Button type="submit" disabled={isLoadingUserAction} className="flex-1 bg-white text-zinc-950 font-bold uppercase tracking-widest h-8 text-xs">
                  {isLoadingUserAction ? 'Salvando...' : (manageMode === 'create' ? 'Criar Usuário' : 'Atualizar Usuário')}
                </Button>
              </div>

              {userActionMessage.text && (
                <p className={cn("text-[10px] font-mono text-center", userActionMessage.type === 'success' ? "text-green-500" : "text-red-500")}>
                  {userActionMessage.text}
                </p>
              )}
            </form>
          )}
        </div>
      )}
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
