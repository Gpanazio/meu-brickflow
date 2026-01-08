import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  MoreVertical, Plus, ArrowLeft, LogOut, Upload, 
  Trash2, Eye, FolderOpen, Lock, RotateCcw,
  ListTodo, KanbanSquare, FileText, Goal, Sparkles, Dna,
  X, Check, ChevronDown, Settings, Calendar, WifiOff, Save,
  RefreshCw, Power
} from 'lucide-react';
import './App.css';

import LegacyHome from './components/legacy/LegacyHome';
import LegacyProjectView from './components/legacy/LegacyProjectView';
import LegacyBoard from './components/legacy/LegacyBoard';
import { useUsers } from './hooks/useUsers'; 
import { useFiles } from './hooks/useFiles'; 
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

const generateId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const NO_SENSE_AVATARS = [
  "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=400&auto=format&fit=crop&q=60", 
  "https://images.unsplash.com/photo-1513245543132-31f507417b26?w=400&auto=format&fit=crop&q=60", 
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Felix", 
  "https://api.dicebear.com/7.x/bottts/svg?seed=Glitch", 
  "https://images.unsplash.com/photo-1541364983171-a8ba01e95cfc?w=400&auto=format&fit=crop&q=60", 
  "https://images.unsplash.com/photo-1596727147705-54a9d6ed27e6?w=400&auto=format&fit=crop&q=60", 
];

const generateMegaSenaNumbers = () => {
  const numbers = [];
  while (numbers.length < 6) {
    const num = Math.floor(Math.random() * 60) + 1;
    if (!numbers.includes(num)) numbers.push(num);
  }
  return numbers.sort((a, b) => a - b);
};

// --- UI COMPONENTS ---
const Button = React.forwardRef(({ className, variant = "default", size = "default", ...props }, ref) => {
  const variants = {
    default: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
    destructive: "bg-red-900 text-white hover:bg-red-800",
    outline: "border border-zinc-800 bg-black hover:bg-zinc-900 text-zinc-300",
    secondary: "bg-zinc-800 text-zinc-100 hover:bg-zinc-700",
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

const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea className={cn("flex min-h-[80px] w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm shadow-sm placeholder:text-zinc-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-600 disabled:cursor-not-allowed disabled:opacity-50 text-zinc-100", className)} ref={ref} {...props} />
));
Textarea.displayName = "Textarea";

const Label = React.forwardRef(({ className, ...props }, ref) => (
  <label ref={ref} className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-zinc-300", className)} {...props} />
));
Label.displayName = "Label";

const Dialog = ({ open, onOpenChange, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <div className="relative z-50 grid w-full max-w-lg gap-4 border border-zinc-800 bg-black p-6 shadow-lg duration-200 sm:rounded-lg max-h-[90vh] overflow-y-auto custom-scrollbar">
        {children}
        <button onClick={() => onOpenChange(false)} className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-black transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-zinc-700 focus:ring-offset-2 disabled:pointer-events-none bg-zinc-800 text-zinc-400">
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>
  );
};
const DialogContent = ({ className, children }) => <div className={cn("", className)}>{children}</div>;
const DialogHeader = ({ className, ...props }) => <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />;
const DialogFooter = ({ className, ...props }) => <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />;
const DialogTitle = ({ className, ...props }) => <h2 className={cn("text-xl font-semibold leading-none tracking-tight text-white", className)} {...props} />;

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

const DropdownMenu = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => { if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  return <div className="relative inline-block text-left" ref={containerRef}>{React.Children.map(children, child => React.cloneElement(child, { isOpen, setIsOpen }))}</div>;
};

const DropdownMenuTrigger = ({ asChild, children, isOpen, setIsOpen, ...props }) => React.cloneElement(children, { onClick: (e) => { e.stopPropagation(); setIsOpen(!isOpen); if (children.props.onClick) children.props.onClick(e); }, ...props });
const DropdownMenuContent = ({ children, isOpen, align = 'start', className }) => isOpen ? <div className={cn("absolute z-50 min-w-[10rem] overflow-hidden rounded-md border border-zinc-800 bg-black p-1 text-zinc-100 shadow-md animate-in data-[side=bottom]:slide-in-from-top-2", align === 'end' ? 'right-0' : 'left-0', className)}>{children}</div> : null;
const DropdownMenuItem = ({ children, className, onClick, ...props }) => <div className={cn("relative flex cursor-default select-none items-center rounded-sm px-3 py-2 text-sm outline-none transition-colors hover:bg-zinc-900 hover:text-zinc-100 cursor-pointer", className)} onClick={(e) => { if(onClick) onClick(e); }} {...props}>{children}</div>;
const DropdownMenuLabel = ({ className, ...props }) => <div className={cn("px-3 py-2 text-sm font-semibold", className)} {...props} />;
const DropdownMenuSeparator = ({ className, ...props }) => <div className={cn("-mx-1 my-1 h-px bg-zinc-800", className)} {...props} />;

const Avatar = ({ className, children }) => <div className={cn("relative flex h-12 w-12 shrink-0 overflow-hidden rounded-full border border-zinc-800", className)}>{children}</div>;
const AvatarImage = ({ src, className }) => <img src={src} alt="Avatar" className={cn("aspect-square h-full w-full object-cover", className)} />;
const AvatarFallback = ({ className, children }) => <div className={cn("flex h-full w-full items-center justify-center rounded-full bg-zinc-900 font-medium", className)}>{children}</div>;
const Separator = ({ className, orientation = "horizontal" }) => <div className={cn("shrink-0 bg-zinc-800", orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]", className)} />;

// --- CONFIGURAÇÃO INICIAL ---
const INITIAL_STATE = {
  users: [
    { username: 'admin', pin: '1234', displayName: 'Admin', color: 'red', avatar: '' },
    { username: 'fran', pin: '1234', displayName: 'Fran', color: 'purple', avatar: '' }
  ],
  projects: []
};

// --- APP PRINCIPAL ---

export default function App() {
  const [appData, setAppData] = useState(null); 
  const [currentView, setCurrentView] = useState('home');
  const [currentProject, setCurrentProject] = useState(null);
  const [currentSubProject, setCurrentSubProject] = useState(null);
  const [currentBoardType, setCurrentBoardType] = useState('kanban');
  const [isSyncing, setIsSyncing] = useState(false);
  const [modalState, setModalState] = useState({ type: null, isOpen: false, data: null, mode: 'create' });
  const [connectionError, setConnectionError] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [dailyPhrase, setDailyPhrase] = useState('');
  const [megaSenaNumbers, setMegaSenaNumbers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSlowLoad, setShowSlowLoad] = useState(false); // Novo estado para mostrar botão de "Demorando..."

  // --- CARREGAMENTO ---
  useEffect(() => {
    // Carrega frase aleatória
    if (absurdPhrases && absurdPhrases.length > 0) {
      setDailyPhrase(absurdPhrases[Math.floor(Math.random() * absurdPhrases.length)]);
    } else {
      setDailyPhrase("O servidor comeu sua frase motivacional.");
    }
    setMegaSenaNumbers(generateMegaSenaNumbers());
    
    // Timer para mostrar opção de "Forçar Início" se demorar mais que 3s
    const slowLoadTimer = setTimeout(() => setShowSlowLoad(true), 3000);

    const loadData = async () => {
      try {
        // Timeout de 10s para a requisição não ficar presa eternamente
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch('/api/projects', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error("Falha na API");
        let data = await response.json();
        
        if (!data || (Array.isArray(data) && data.length === 0)) {
          data = INITIAL_STATE;
          saveDataToApi(data);
        } else if (Array.isArray(data)) {
          data = { ...INITIAL_STATE, projects: data };
          saveDataToApi(data);
        }
        setAppData(data);
      } catch (err) {
        console.error("Erro:", err);
        setConnectionError(true);
      } finally {
        setIsLoading(false);
        clearTimeout(slowLoadTimer);
      }
    };
    loadData();
    return () => clearTimeout(slowLoadTimer);
  }, []);

  // --- SYNC ---
  const saveDataToApi = async (newData) => {
    setIsSyncing(true);
    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: newData })
      });
    } catch (e) {
      console.error("Erro ao salvar:", e);
      setConnectionError(true);
    } finally {
      setIsSyncing(false);
    }
  };

  const updateGlobalState = useCallback((updater) => {
    setAppData(prev => {
      const newState = typeof updater === 'function' ? updater(prev) : updater;
      saveDataToApi(newState); 
      return newState;
    });
  }, []);

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

  // Função para "descongelar" manualmente se o servidor estiver off
  const forceOfflineMode = () => {
    setAppData(INITIAL_STATE);
    setConnectionError(true); // Marca erro para avisar que não está salvando
    setIsLoading(false);
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

  const handleUpdateUser = (updatedUser) => {
    const newUsersList = appData.users.map(u => u.username === updatedUser.username ? updatedUser : u);
    updateUsers(newUsersList);
  };

  const handleDragStart = () => {};
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = () => {};
  const handleDeleteProject = (item) => updateProjects(prev => prev.filter(p => p.id !== item.id));

  // --- RENDER ---

  // Tela de Carregamento com Escape Hatch
  if (!appData && !connectionError) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="text-zinc-500 font-mono animate-pulse uppercase tracking-widest">Iniciando Sistema...</div>
        {showSlowLoad && (
          <div className="animate-in fade-in zoom-in duration-500 flex flex-col items-center gap-2">
            <p className="text-zinc-700 text-xs font-mono">O servidor está demorando...</p>
            <Button variant="outline" onClick={forceOfflineMode} className="text-xs h-8 border-red-900 text-red-500 hover:bg-red-950 hover:text-white">
              <Power className="w-3 h-3 mr-2" /> Forçar Início Offline
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Tela de Erro de Conexão (agora permite usar o app mesmo assim se tiver dados)
  if (connectionError && !appData) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-red-600 gap-4 p-8 text-center">
        <WifiOff className="w-16 h-16" />
        <h1 className="text-2xl font-black uppercase">Falha na Conexão</h1>
        <p className="text-zinc-500">Não foi possível carregar os dados do servidor.</p>
        <div className="flex gap-4">
          <Button onClick={() => window.location.reload()} className="bg-white text-zinc-950 font-bold">Tentar Novamente</Button>
          <Button variant="outline" onClick={forceOfflineMode} className="border-zinc-700 text-zinc-400 hover:text-white">Modo Offline (Temporário)</Button>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-black p-4">
        <div className="w-full max-w-sm border border-zinc-900 bg-black p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-xl font-bold tracking-widest text-white uppercase">BrickFlow OS</h1>
            <p className="text-xs text-zinc-600 font-mono uppercase tracking-widest">Acesso Restrito</p>
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
          <div className="bg-black text-white">
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
  const boardData = currentEntity?.boardData?.[currentBoardType] || 
    (currentBoardType === 'files' ? { files: [] } : { lists: [] });

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
                <RefreshCw className="w-3 h-3" /> Tentar Reconectar
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
              isLoading={isLoading}
              connectionError={connectionError}
              handleDragStart={handleDragStart}
              handleDragOver={handleDragOver}
              handleDrop={handleDrop}
              COLOR_VARIANTS={COLOR_VARIANTS}
            />
          )}

          {currentView === 'project' && currentProject && (
            <LegacyProjectView
              currentProject={currentProject}
              setCurrentView={setCurrentView}
              setModalState={setModalState}
              handleAccessProject={handleAccessProject}
              handleDeleteProject={(sub) => updateProjects(prev => prev.map(p => p.id === currentProject.id ? {...p, subProjects: p.subProjects.filter(s => s.id !== sub.id)} : p))}
              COLOR_VARIANTS={COLOR_VARIANTS}
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
                 if (action === 'save') { /* Lógica movida para o Modal Global */ }
                 else if (action === 'delete') {
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

      {/* MODAL GLOBAL */}
      {modalState.isOpen && (
        <Dialog open={modalState.isOpen} onOpenChange={(open) => setModalState(prev => ({ ...prev, isOpen: open }))}>
           <div className="bg-black text-white p-2">
             <h2 className="text-xl font-black uppercase mb-6">{modalState.mode === 'create' ? 'Novo' : 'Editar'} {modalState.type === 'project' ? 'Projeto' : 'Item'}</h2>
             
             <form onSubmit={(e) => {
               e.preventDefault();
               const fd = new FormData(e.target);
               const data = Object.fromEntries(fd);
               
               if (modalState.type === 'project') {
                 if (modalState.mode === 'create') {
                    const newProj = { 
                      id: generateId('proj'), 
                      ...data, 
                      subProjects: [], 
                      boardData: {},
                      createdAt: new Date().toISOString(),
                      createdBy: currentUser.username,
                      isArchived: false,
                      isProtected: data.isProtected === 'on',
                      color: data.color || 'blue'
                    };
                    updateProjects(prev => [...prev, newProj]);
                 } else {
                    updateProjects(prev => prev.map(p => p.id === modalState.data.id ? { ...p, ...data, isProtected: data.isProtected === 'on' } : p));
                 }
               } else if (modalState.type === 'subProject') {
                  const targetProjId = currentProject.id;
                  if (modalState.mode === 'create') {
                      const newSub = {
                          id: generateId('sub'),
                          ...data,
                          boardData: { 
                            todo: { lists: [{ id: 'l1', title: 'A FAZER', tasks: [] }, { id: 'l2', title: 'FAZENDO', tasks: [] }, { id: 'l3', title: 'CONCLUÍDO', tasks: [] }] }, 
                            kanban: { lists: [{ id: 'k1', title: 'BACKLOG', tasks: [] }, { id: 'k2', title: 'EM PROGRESSO', tasks: [] }, { id: 'k3', title: 'CONCLUÍDO', tasks: [] }] }, 
                            files: { files: [] }
                          },
                          isArchived: false
                      };
                      updateProjects(prev => prev.map(p => p.id === targetProjId ? { ...p, subProjects: [...(p.subProjects || []), newSub] } : p));
                  }
               } else if (modalState.type === 'task') {
                  const listId = modalState.listId || modalState.data.listId;
                  const taskData = { ...data, id: modalState.mode === 'create' ? generateId('task') : modalState.data.id, responsibleUsers: [] }; // Simplificado
                  
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
               
               {/* Formulário Genérico Simplificado */}
               <div className="space-y-2">
                 <Label>Nome / Título</Label>
                 <Input name="name" defaultValue={modalState.data?.name || modalState.data?.title} required autoFocus className="bg-zinc-950 border-zinc-800" />
               </div>
               {modalState.type !== 'task' && (
                   <div className="space-y-2">
                     <Label>Descrição</Label>
                     <textarea name="description" defaultValue={modalState.data?.description} className="w-full bg-zinc-950 border border-zinc-800 p-3 text-sm text-white rounded-md focus:outline-none focus:ring-1 focus:ring-red-600 min-h-[100px]" />
                   </div>
               )}
               {modalState.type === 'project' && (
                   <div className="space-y-2">
                       <Label>Cor</Label>
                       <Select name="color" defaultValue={modalState.data?.color || 'blue'} />
                   </div>
               )}
               
               <Button type="submit" className="w-full bg-white text-zinc-950 font-bold uppercase hover:bg-zinc-200">Salvar</Button>
             </form>
           </div>
        </Dialog>
      )}

      <UserSettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} currentUser={currentUser} onUpdateUser={handleUpdateUser} />
    </div>
  );
}
