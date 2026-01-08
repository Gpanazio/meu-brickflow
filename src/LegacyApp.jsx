import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import logoImage from './assets/brickflowbranco.png';
import { debugLog } from './utils/debugLog';
import { formatFileSize } from './utils/formatFileSize';
import { absurdPhrases } from './utils/phrases';
import { supabase, hasSupabaseConfig, supabaseConfigError, missingVariables } from './lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

import ResponsibleUsersButton from './components/ResponsibleUsersButton';
import SudokuGame from './components/SudokuGame';
import { useFiles } from './hooks/useFiles';

// --- COMPONENTES SHADCN UI (Estilizados via CSS Global para Brutalismo) ---
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Textarea } from './components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './components/ui/dialog';
import { Badge } from './components/ui/badge';
import { ScrollArea } from './components/ui/scroll-area';
import { Separator } from './components/ui/separator';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs';
import { Checkbox } from './components/ui/checkbox';
import { Label } from './components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from './components/ui/dropdown-menu';
import { 
  Settings, MoreVertical, Plus, ArrowLeft, LogOut, Upload, 
  Trash2, Download, Eye, LayoutGrid, 
  FolderOpen, Calendar, Target, Lock, Sparkles, Dna, RotateCcw,
  ListTodo, KanbanSquare, FileText, Goal
} from 'lucide-react';

// --- CONFIGURAÇÕES ---
const ALL_TABS = [
  { id: 'todo', label: 'LISTA', icon: ListTodo },
  { id: 'kanban', label: 'KANBAN', icon: KanbanSquare },
  { id: 'files', label: 'ARQUIVOS', icon: FileText },
  { id: 'goals', label: 'METAS', icon: Goal }
];

const USER_COLORS = ['blue', 'red', 'green', 'purple', 'orange', 'cyan', 'pink', 'yellow'];

const generateMegaSenaNumbers = () => {
  const numbers = [];
  while (numbers.length < 6) {
    const num = Math.floor(Math.random() * 60) + 1;
    if (!numbers.includes(num)) {
      numbers.push(num);
    }
  }
  return numbers.sort((a, b) => a - b);
};

const generateId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// COMPONENTE: MONOLITO LOADING
const MonolithLoader = ({ text }) => (
  <div className="flex flex-col items-center justify-center gap-6 animate-in fade-in zoom-in duration-700">
    <div className="w-12 h-24 bg-black border border-zinc-800 shadow-[0_0_30px_rgba(220,38,38,0.2)] animate-monolith-pulse"></div>
    <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-600 animate-pulse">{text}</span>
  </div>
);

function LegacyApp() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  
  const [projects, setProjects] = useState([]);
  const [currentView, setCurrentView] = useState('home');
  const [currentProject, setCurrentProject] = useState(null);
  const [currentSubProject, setCurrentSubProject] = useState(null);
  const [currentBoardType, setCurrentBoardType] = useState('kanban');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [dailyPhrase, setDailyPhrase] = useState('');
  const [megaSenaNumbers, setMegaSenaNumbers] = useState([]);
  const [pendingAccessItem, setPendingAccessItem] = useState(null); 
  
  const [modalState, setModalState] = useState({
    type: null,
    isOpen: false,
    data: null,
    mode: 'create'
  });

  const [dragState, setDragState] = useState({
    isDragging: false,
    itemType: null, 
    itemData: null,
    sourceContainerId: null
  });
  const [dragOverTargetId, setDragOverTargetId] = useState(null);

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const { 
    files, 
    handleFileUpload: originalHandleFileUpload,
    isDragging: isFileDragging,
    setIsDragging: setIsFileDragging,
    handleDeleteFile
  } = useFiles(
    currentProject,
    currentSubProject,
    currentUser || {}
  );

  const handleFileUploadWithFeedback = async (e) => {
    setIsUploading(true);
    await originalHandleFileUpload(e);
    setIsUploading(false);
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('brickflow-current-user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setCurrentUser(userData);
      setIsLoggedIn(true);
      loadUserProjects(userData.userKey);
    }
    loadAllUsers();
    
    if (absurdPhrases && absurdPhrases.length > 0) {
      setDailyPhrase(absurdPhrases[Math.floor(Math.random() * absurdPhrases.length)]);
    }
    setMegaSenaNumbers(generateMegaSenaNumbers());
  }, []);

  const saveTimeoutRef = useRef(null);
  useEffect(() => {
    if (projects.length > 0 && isLoggedIn && currentUser && hasSupabaseConfig) {
      localStorage.setItem(`brickflow-projects-${currentUser.userKey}`, JSON.stringify(projects));
      
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      saveTimeoutRef.current = setTimeout(async () => {
        setIsSyncing(true);
        try {
          const { data: existing, error: searchError } = await supabase
            .from('brickflow_data')
            .select('id')
            .limit(1);
          
          if (!searchError) {
             const dataPayload = { data: projects };

             if (existing && existing.length > 0) {
               await supabase
                 .from('brickflow_data')
                 .update(dataPayload)
                 .eq('id', existing[0].id);
             } else {
               await supabase
                 .from('brickflow_data')
                 .insert(dataPayload);
             }
             debugLog("✅ Dados sincronizados com Supabase");
          }
        } catch (error) { 
          console.error("Erro fatal ao sincronizar:", error); 
        } finally { 
          setIsSyncing(false); 
        }
      }, 1000);
    }
  }, [projects, isLoggedIn, currentUser]);

  const loadAllUsers = async () => {
    if (!hasSupabaseConfig) return;
    try {
      const { data, error } = await supabase.from('brickflow_users').select('*');
      if (!error && data) setAllUsers(data);
    } catch (error) { debugLog('Erro users', error); }
  };

  const loadUserProjects = async (userKey) => {
    if (!hasSupabaseConfig) return;
    try {
      const { data, error } = await supabase.from('brickflow_data').select('*');
      if (!error && data && data.length > 0 && data[0].data) {
        setProjects(data[0].data);
        return;
      }
    } catch (e) { console.error(e); }
    
    const saved = localStorage.getItem(`brickflow-projects-${userKey}`);
    if (saved) setProjects(JSON.parse(saved));
  };

  const updateProjectsState = (newData) => setProjects(newData);

  const getCurrentBoardData = () => {
    const target = currentView === 'subproject' ? currentSubProject : currentProject;
    return target?.boardData?.[currentBoardType] || {};
  };

  const initializeBoardData = () => ({
    todo: { lists: [{ id: 'l1', title: 'A FAZER', tasks: [] }, { id: 'l2', title: 'FAZENDO', tasks: [] }, { id: 'l3', title: 'FEITO', tasks: [] }] },
    kanban: { lists: [{ id: 'k1', title: 'BACKLOG', tasks: [] }, { id: 'k2', title: 'EM PROGRESSO', tasks: [] }, { id: 'k3', title: 'CONCLUÍDO', tasks: [] }] },
    timeline: { periods: [{ id: 'p1', title: 'Q1', tasks: [] }] },
    goals: { objectives: [] }
  });

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('brickflow-current-user');
    setCurrentUser(null);
  };

  const handleSwitchUser = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  const handleAccessProject = (item, type = 'project') => {
    if (dragState.isDragging) return;
    if (item.isProtected) {
      setPendingAccessItem({ ...item, itemType: type });
      setModalState({ type: 'password', isOpen: true });
    } else {
      enterProject(item, type);
    }
  };

  const enterProject = (item, type) => {
    const firstEnabledTab = item.enabledTabs && item.enabledTabs.length > 0 ? item.enabledTabs[0] : 'kanban';
    if (type === 'project') {
      setCurrentProject(item);
      setCurrentView('project');
    } else {
      setCurrentSubProject(item);
      setCurrentView('subproject');
      setCurrentBoardType(firstEnabledTab);
    }
  };

  const handlePasswordSubmit = (password) => {
    if (pendingAccessItem && password === pendingAccessItem.password) {
      enterProject(pendingAccessItem, pendingAccessItem.itemType);
      setModalState({ isOpen: false, type: null });
      setPendingAccessItem(null);
    } else {
      alert("Senha incorreta!");
    }
  };

  const handleSaveProject = (formData) => {
    const isEdit = modalState.mode === 'edit';
    const isSub = modalState.type === 'subProject';
    
    const selectedTabs = ALL_TABS.filter(tab => formData[`view_${tab.id}`] === 'on').map(t => t.id);
    const enabledTabs = selectedTabs.length > 0 ? selectedTabs : ['kanban'];

    const projectData = {
        name: formData.name,
        description: formData.description,
        color: formData.color,
        isProtected: formData.isProtected === 'on',
        password: formData.isProtected === 'on' ? formData.password : '',
        enabledTabs: enabledTabs
    };

    if (isEdit) {
        const targetId = modalState.data.id;
        const updatedProjects = projects.map(p => {
            if (p.id === targetId && !isSub) return { ...p, ...projectData };
            if (p.subProjects && p.subProjects.length > 0) {
                const updatedSubs = p.subProjects.map(sp => sp.id === targetId ? { ...sp, ...projectData } : sp);
                return { ...p, subProjects: updatedSubs };
            }
            return p;
        });
        
        updateProjectsState(updatedProjects);
        if (currentProject?.id === targetId) setCurrentProject(updatedProjects.find(p => p.id === targetId));
        if (currentSubProject?.id === targetId) {
            const parent = updatedProjects.find(p => p.subProjects.some(sp => sp.id === targetId));
            setCurrentSubProject(parent.subProjects.find(sp => sp.id === targetId));
        }
    } else {
        const newItem = {
            id: generateId(isSub ? 'sub' : 'proj'),
            ...projectData,
            subProjects: [],
            createdAt: new Date().toISOString(),
            createdBy: currentUser.userKey,
            boardData: initializeBoardData(),
            archived: { tasks: [], goals: [] },
            isArchived: false,
        };

        if (isSub) {
            const updatedProjects = projects.map(p => 
                p.id === currentProject.id ? { ...p, subProjects: [...(p.subProjects || []), newItem] } : p
            );
            updateProjectsState(updatedProjects);
            setCurrentProject(updatedProjects.find(p => p.id === currentProject.id));
        } else {
            updateProjectsState([...projects, newItem]);
        }
    }
    setModalState({ isOpen: false, type: null });
  };

  const handleDeleteProject = (item, isSub = false) => {
    if (!confirm(`Tem certeza que deseja excluir "${item.name}"?`)) return;
    if (isSub) {
      const updatedProjects = projects.map(p => 
        p.id === currentProject.id ? { ...p, subProjects: p.subProjects.filter(s => s.id !== item.id) } : p
      );
      updateProjectsState(updatedProjects);
      setCurrentProject(updatedProjects.find(p => p.id === currentProject.id));
    } else {
      updateProjectsState(projects.filter(p => p.id !== item.id));
    }
  };

  const handleDragStart = (e, item, type, sourceId = null) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ id: item.id, type, sourceId }));
    setDragState({ isDragging: true, itemType: type, itemData: item, sourceContainerId: sourceId });
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleDragEnter = (e, targetId) => {
    e.preventDefault();
    if (dragState.isDragging && dragState.itemType === 'task') {
        setDragOverTargetId(targetId);
    }
  };

  const handleDrop = (e, targetContainerId, type) => {
    e.preventDefault();
    setDragOverTargetId(null);
    if (!dragState.isDragging) return;

    if (type === 'list' && dragState.itemType === 'task') {
        const sourceListId = dragState.sourceContainerId;
        const task = dragState.itemData;
        const targetListId = targetContainerId;

        const updatedProjects = projects.map(p => {
            if (p.id !== currentProject.id) return p;
            
            const updateBoard = (entity) => {
                const board = { ...entity.boardData };
                const lists = [...board[currentBoardType].lists];
                
                const sIdx = lists.findIndex(l => l.id === sourceListId);
                if (sIdx === -1) return entity;
                const sourceList = { ...lists[sIdx] };
                sourceList.tasks = sourceList.tasks.filter(t => t.id !== task.id);
                lists[sIdx] = sourceList;

                const tIdx = lists.findIndex(l => l.id === targetListId);
                const targetList = { ...lists[tIdx] };
                
                if (dragOverTargetId && dragOverTargetId !== task.id) {
                    const dropIndex = targetList.tasks.findIndex(t => t.id === dragOverTargetId);
                    if (dropIndex !== -1) targetList.tasks.splice(dropIndex, 0, task);
                    else targetList.tasks.push(task);
                } else {
                    targetList.tasks.push(task);
                }
                
                lists[tIdx] = targetList;
                board[currentBoardType] = { ...board[currentBoardType], lists };
                return { ...entity, boardData: board };
            };

            if (currentView === 'subproject') {
                return { ...p, subProjects: p.subProjects.map(sp => sp.id === currentSubProject.id ? updateBoard(sp) : sp) };
            }
            return updateBoard(p);
        });

        updateProjectsState(updatedProjects);
        const newProj = updatedProjects.find(p => p.id === currentProject.id);
        if (currentView === 'subproject') setCurrentSubProject(newProj.subProjects.find(s => s.id === currentSubProject.id));
        else setCurrentProject(newProj);
    }

    if (type === 'project' && dragState.itemType === 'project') {
        const draggedIdx = projects.findIndex(p => p.id === dragState.itemData.id);
        const targetIdx = projects.findIndex(p => p.id === targetContainerId);
        if (draggedIdx !== -1 && targetIdx !== -1 && draggedIdx !== targetIdx) {
            const newProjects = [...projects];
            const [removed] = newProjects.splice(draggedIdx, 1);
            newProjects.splice(targetIdx, 0, removed);
            updateProjectsState(newProjects);
        }
    }

    setDragState({ isDragging: false, itemType: null, itemData: null, sourceContainerId: null });
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsFileDragging(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
        handleFileUploadWithFeedback({ target: { files: droppedFiles, value: '' } });
    }
  };

  const handleTaskAction = (action, data) => {
    const isEdit = modalState.mode === 'edit';
    const updatedProjects = projects.map(p => {
      if (p.id !== currentProject.id) return p;
      const updateEntity = (entity) => {
        const board = entity.boardData[currentBoardType];
        if (action === 'save') {
          if (isEdit) {
             board.lists = board.lists.map(l => ({ ...l, tasks: l.tasks.map(t => t.id === modalState.data.id ? { ...t, ...data } : t) }));
          } else {
            const listId = modalState.data?.listId || board.lists[0].id;
            board.lists = board.lists.map(l => l.id === listId ? { ...l, tasks: [...l.tasks, { id: generateId('task'), ...data }] } : l);
          }
        } else if (action === 'delete') {
          board.lists = board.lists.map(l => ({ ...l, tasks: l.tasks.filter(t => t.id !== data.taskId) }));
        }
        return entity;
      };
      if (currentView === 'subproject') return { ...p, subProjects: p.subProjects.map(sp => sp.id === currentSubProject.id ? updateEntity(sp) : sp) };
      return updateEntity(p);
    });

    updateProjectsState(updatedProjects);
    const newProj = updatedProjects.find(p => p.id === currentProject.id);
    if (currentView === 'subproject') setCurrentSubProject(newProj.subProjects.find(s => s.id === currentSubProject.id));
    else setCurrentProject(newProj);
    if(action === 'save') setModalState({ isOpen: false, type: null });
  };

  if (!hasSupabaseConfig) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-black p-4">
        <Card className="w-full max-w-xl border-zinc-900 bg-black shadow-2xl">
          <CardHeader className="space-y-6 text-center">
            <div className="mx-auto">
              <img src={logoImage} alt="BrickFlow" className="h-16 w-auto object-contain opacity-90 mx-auto" />
            </div>
            <div>
              <CardTitle className="text-2xl font-black tracking-tighter brick-title text-white">
                SUPABASE DESATIVADO
              </CardTitle>
              <CardDescription className="text-zinc-500 text-xs font-mono uppercase tracking-widest mt-2">
                O app não pode iniciar sem conexão com o Supabase
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border border-zinc-900 bg-zinc-950 p-4 font-mono text-[11px] text-zinc-400">
              {supabaseConfigError}
            </div>
            <div className="text-[11px] text-zinc-500 font-mono uppercase tracking-widest space-y-2">
              <p>Configure as variáveis no ambiente ou no arquivo .env:</p>
              {missingVariables.map((variable) => (
                <p key={variable}>{variable}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-black p-4">
        <Card className="w-full max-w-md border-zinc-900 bg-black shadow-2xl">
          <CardHeader className="text-center space-y-6">
            <div className="mx-auto">
              <img src={logoImage} alt="BrickFlow" className="h-16 w-auto object-contain opacity-90 mx-auto" />
            </div>
            <div>
              <CardTitle className="text-3xl font-black tracking-tighter brick-title text-white">BRICKFLOW OS</CardTitle>
              <CardDescription className="text-zinc-600 text-xs font-mono uppercase tracking-widest mt-2">v.2.0.4 // Acesso Restrito</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                const user = allUsers.find(u => u.username === fd.get('username') && u.pin === fd.get('pin'));
                if (user) {
                  const userData = { ...user, userKey: `${user.username}-${user.pin}` };
                  setCurrentUser(userData);
                  setIsLoggedIn(true);
                  localStorage.setItem('brickflow-current-user', JSON.stringify(userData));
                  loadUserProjects(userData.userKey);
                } else { alert("Credenciais inválidas"); }
            }} className="space-y-6">
              <div className="space-y-2"><Label className="text-zinc-500 text-[10px] uppercase tracking-widest">ID Operador</Label><Input name="username" placeholder="IDENTIFICAÇÃO" className="bg-zinc-950 border-zinc-800 focus:border-white h-12 rounded-none text-zinc-300 placeholder:text-zinc-800" required /></div>
              <div className="space-y-2"><Label className="text-zinc-500 text-[10px] uppercase tracking-widest">Código de Acesso</Label><Input name="pin" type="password" placeholder="••••" maxLength={4} className="bg-zinc-950 border-zinc-800 text-center tracking-[1em] focus:border-white h-12 rounded-none text-white placeholder:text-zinc-800" required /></div>
              <Button type="submit" className="w-full bg-white hover:bg-zinc-200 text-black font-bold uppercase tracking-widest h-14 rounded-none text-xs">Iniciar Sessão</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderHeader = () => (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-900 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/80">
      <div className="container flex h-16 items-center justify-between mx-auto px-4 md:px-8">
        <div className="flex items-center gap-6">
          <div onClick={() => setCurrentView('home')} className="cursor-pointer flex items-center gap-2 hover:opacity-70 transition-opacity">
             <img src={logoImage} alt="BrickFlow" className="h-6 w-auto object-contain" />
          </div>
          <Separator orientation="vertical" className="h-4 bg-zinc-800" />
          <nav className="flex items-center gap-2 text-sm">
            <Button variant="ghost" className={`uppercase tracking-widest text-[10px] font-bold rounded-none ${currentView === 'home' ? 'text-white' : 'text-zinc-600'}`} onClick={() => setCurrentView('home')}>Central</Button>
            {currentProject && (
              <>
                <span className="text-zinc-800">/</span>
                <Button variant="ghost" className="uppercase tracking-widest text-[10px] font-bold text-zinc-600 hover:text-white rounded-none" onClick={() => setCurrentView('project')}>{currentProject.name}</Button>
              </>
            )}
          </nav>
        </div>
        
        <div className="flex items-center gap-6">
          {isSyncing && <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_#dc2626]" />}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-none p-0 hover:bg-zinc-900 border border-transparent hover:border-zinc-800">
                <Avatar className="h-6 w-6 rounded-none"><AvatarFallback className="bg-zinc-900 text-zinc-500 text-[10px] rounded-none">{currentUser?.displayName?.charAt(0)}</AvatarFallback></Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-black border-zinc-800 rounded-none shadow-2xl" align="end">
              <DropdownMenuLabel className="font-normal p-4">
                <div className="flex flex-col space-y-2">
                  <p className="text-sm font-black leading-none text-white uppercase tracking-tight">{currentUser?.displayName}</p>
                  <p className="text-[10px] leading-none text-zinc-600 font-mono tracking-widest">@{currentUser?.username}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-900" />
              <DropdownMenuItem onClick={handleSwitchUser} className="focus:bg-zinc-900 focus:text-white cursor-pointer uppercase text-[10px] tracking-widest h-10"><RotateCcw className="mr-2 h-3 w-3" /> Trocar Operador</DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-red-900 focus:text-red-600 focus:bg-red-950/10 cursor-pointer uppercase text-[10px] tracking-widest h-10"><LogOut className="mr-2 h-3 w-3" /> Encerrar</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );

  const renderHome = () => (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20">
      
      {/* HEADER DE BOAS VINDAS ESTILO TERMINAL */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-0 border-b border-zinc-900 pb-12">
        <div className="col-span-3 pr-12">
           <h1 className="text-6xl md:text-8xl font-black text-white uppercase tracking-tighter leading-none mb-4">
             BEM-VINDO, <br/><span className="text-zinc-800">{currentUser?.displayName}</span>
           </h1>
           <p className="text-zinc-500 text-xs font-mono tracking-widest uppercase max-w-xl leading-relaxed">
             SISTEMA OPERACIONAL BRICK v2.0 // STATUS: ONLINE // "TODO O VAZIO PODE SER PREENCHIDO COM PROPÓSITO."
           </p>
        </div>
        <div className="col-span-1 border-l border-zinc-900 pl-8 flex flex-col justify-end">
           <div className="text-right">
              <span className="block text-[10px] text-zinc-600 font-mono uppercase tracking-widest mb-1">Data Estelar</span>
              <span className="block text-xl font-bold text-white font-mono">{new Date().toLocaleDateString('pt-BR')}</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-zinc-900">
        <div className="col-span-2 border-r border-zinc-900 bg-black relative group p-8 min-h-[200px] flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles className="w-24 h-24 text-white" /></div>
          <div>
            <h3 className="flex items-center gap-2 text-zinc-500 uppercase tracking-widest text-[10px] mb-4"><Sparkles className="w-3 h-3" /> Algoritmo da Sorte</h3>
            <p className="text-zinc-300 text-xl md:text-2xl font-light leading-snug font-serif italic">"{dailyPhrase}"</p>
          </div>
        </div>
        <div className="bg-black p-8 flex flex-col justify-between">
          <h3 className="text-[10px] uppercase tracking-widest flex gap-2 text-emerald-900 mb-4"><Dna className="w-3 h-3" /> Sequência Probabilística</h3>
          <div className="flex flex-wrap gap-2">
            {megaSenaNumbers.map((num, i) => (
              <div key={i} className="w-8 h-8 border border-zinc-800 text-zinc-500 flex items-center justify-center font-mono text-xs hover:border-emerald-900 hover:text-emerald-500 transition-colors cursor-default">{num.toString().padStart(2, '0')}</div>
            ))}
          </div>
        </div>
      </div>

      {currentUser?.displayName === 'Fran' && <SudokuGame />}

      <div className="space-y-0">
        <div className="flex justify-between items-end border-b border-zinc-900 pb-4 mb-0">
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em]">Diretório de Projetos</h2>
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 opacity-20 hover:opacity-40 transition-opacity border-b border-zinc-900">
            <h1 className="text-9xl font-black text-zinc-900 uppercase tracking-tighter text-center leading-none select-none">NULL</h1>
            <Button onClick={() => setModalState({ type: 'project', mode: 'create', isOpen: true })} className="mt-8 bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-white uppercase tracking-widest text-xs font-bold rounded-none h-12 px-8">Inicializar Primeiro Projeto</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-l border-zinc-900">
            {projects.filter(p => !p.isArchived).map(project => (
              <div 
                key={project.id} 
                draggable={true}
                onDragStart={(e) => handleDragStart(e, project, 'project')}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, project.id, 'project')}
                onClick={() => handleAccessProject(project)} 
                className="group relative aspect-[4/5] border-r border-b border-zinc-900 bg-black hover:bg-zinc-950 transition-colors cursor-pointer p-8 flex flex-col justify-between"
              >
                {/* Linha de status superior */}
                <div className="flex justify-between items-start w-full">
                  <div className="flex flex-col gap-1">
                     <span className="text-[9px] font-mono text-zinc-700 uppercase tracking-widest group-hover:text-red-600 transition-colors">
                       ID: {project.id.slice(-6).toUpperCase()}
                     </span>
                     <div className={`h-[2px] w-0 bg-red-600 group-hover:w-full transition-all duration-700 delay-100 ease-in-out`} />
                  </div>
                  {project.isProtected && <Lock className="w-3 h-3 text-zinc-800 group-hover:text-zinc-500 transition-colors" />}
                </div>

                {/* Conteúdo Central */}
                <div className="space-y-6 relative z-10 mt-4">
                  <h3 className="text-4xl lg:text-5xl font-black text-white uppercase tracking-tighter leading-[0.85] break-words">
                    {project.name}
                  </h3>
                  <p className="text-zinc-600 text-[10px] uppercase tracking-wider font-mono leading-relaxed max-w-[90%] opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    {project.description || "DADOS.CONFIDENCIAIS//DESCRIÇÃO_PENDENTE"}
                  </p>
                </div>

                {/* Footer Técnico */}
                <div className="relative z-10 pt-4 flex justify-between items-end">
                   <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-zinc-700 font-mono uppercase tracking-widest">Módulos</span>
                      <span className="text-xl font-bold text-zinc-500">{project.subProjects?.length.toString().padStart(2, '0') || '00'}</span>
                   </div>
                   
                   <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-800 hover:text-white hover:bg-transparent rounded-none"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-black border-zinc-800 rounded-none min-w-[150px]">
                        <DropdownMenuItem onClick={e => { e.stopPropagation(); setModalState({ type: 'project', mode: 'edit', isOpen: true, data: project }); }} className="text-[10px] uppercase tracking-widest focus:bg-zinc-900 cursor-pointer h-10">Configurar</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-900 focus:text-red-600 focus:bg-zinc-900 text-[10px] uppercase tracking-widest cursor-pointer h-10" onClick={e => { e.stopPropagation(); handleDeleteProject(project); }}>Eliminar</DropdownMenuItem>
                      </DropdownMenuContent>
                   </DropdownMenu>
                </div>
              </div>
            ))}
            
            {/* Card de Adicionar - Integrado ao Grid */}
            <div 
              onClick={() => setModalState({ type: 'project', mode: 'create', isOpen: true })}
              className="aspect-[4/5] border-r border-b border-zinc-900 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-950 group transition-colors relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.01)_10px,rgba(255,255,255,0.01)_20px)] opacity-0 group-hover:opacity-100 transition-opacity" />
              <Plus className="h-12 w-12 text-zinc-800 group-hover:text-white mb-6 transition-colors duration-500" />
              <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.3em] group-hover:text-zinc-400">Novo Protocolo</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderProjectView = () => (
    <div className="space-y-12 animate-in slide-in-from-bottom-8 duration-500 pb-20">
      <div className="flex flex-col gap-8 border-b border-zinc-900 pb-8">
        <div className="flex justify-between items-start">
           <Button variant="outline" onClick={() => setCurrentView('home')} className="border-zinc-800 bg-black hover:bg-zinc-900 text-zinc-500 hover:text-white rounded-none h-10 px-4 uppercase text-[10px] tracking-widest"><ArrowLeft className="mr-2 h-3 w-3" /> Voltar</Button>
           <div className="flex gap-0">
              <Button variant="outline" className="border-zinc-800 hover:bg-zinc-900 rounded-none uppercase text-[10px] tracking-widest h-10 text-zinc-500 hover:text-white border-r-0" onClick={() => { setCurrentSubProject(null); setCurrentBoardType('kanban'); setCurrentView('subproject'); }}>Quadro Mestre</Button>
              <Button onClick={() => setModalState({ type: 'subProject', mode: 'create', isOpen: true })} className="bg-white hover:bg-zinc-200 text-black rounded-none uppercase text-[10px] font-bold tracking-widest h-10 px-6"><Plus className="mr-2 h-3 w-3" /> Nova Área</Button>
           </div>
        </div>
        
        <div>
          <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter flex items-center gap-4 mb-2">
            {currentProject.name} 
            {currentProject.isProtected && <Lock className="h-8 w-8 text-zinc-800"/>}
          </h1>
          <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest max-w-2xl leading-relaxed pl-1">{currentProject.description}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border-l border-t border-zinc-900">
        {currentProject.subProjects?.filter(s => !s.isArchived).map(sub => (
          <div key={sub.id} onClick={() => handleAccessProject(sub, 'subproject')} className="group cursor-pointer bg-black border-r border-b border-zinc-900 hover:bg-zinc-950 transition-all duration-300 relative aspect-square p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
               <FolderOpen className={`h-6 w-6 text-${sub.color || 'zinc'}-600 opacity-50 group-hover:opacity-100 transition-opacity`} />
               <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-800 hover:text-white rounded-none"><MoreVertical className="h-3 w-3" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-black border-zinc-800 rounded-none">
                  <DropdownMenuItem onClick={e => { e.stopPropagation(); setModalState({ type: 'subProject', mode: 'edit', isOpen: true, data: sub }); }} className="text-[10px] uppercase tracking-widest h-8 cursor-pointer">Editar</DropdownMenuItem>
                  <DropdownMenuItem className="text-red-900 focus:text-red-600 text-[10px] uppercase tracking-widest h-8 cursor-pointer" onClick={e => { e.stopPropagation(); handleDeleteProject(sub, true); }}>Excluir</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="space-y-2">
               <CardTitle className="text-xl font-bold uppercase tracking-tight text-white group-hover:translate-x-1 transition-transform">{sub.name}</CardTitle>
               <CardDescription className="text-zinc-600 text-[10px] font-mono uppercase tracking-widest line-clamp-2">{sub.description || "SEM DESCRIÇÃO"}</CardDescription>
            </div>

            <div className="w-full h-[1px] bg-zinc-900 group-hover:bg-zinc-700 transition-colors" />
          </div>
        ))}
        {/* Card Vazio para Adicionar */}
        <div 
          onClick={() => setModalState({ type: 'subProject', mode: 'create', isOpen: true })}
          className="border-r border-b border-zinc-900 bg-transparent flex flex-col items-center justify-center aspect-square cursor-pointer group transition-all hover:bg-zinc-950/30"
        >
          <Plus className="h-8 w-8 text-zinc-800 group-hover:text-zinc-500 mb-4 transition-colors" />
          <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-800 group-hover:text-zinc-500">Criar Área</span>
        </div>
      </div>
    </div>
  );

  const renderBoard = () => {
    const data = getCurrentBoardData();
    const currentEntity = currentSubProject || currentProject;
    const entityName = currentEntity.name;
    const enabledTabs = currentEntity.enabledTabs || ['kanban'];

    return (
      <div className="flex flex-col h-[calc(100vh-6rem)]">
        <div className="flex items-center justify-between mb-8 border-b border-zinc-900 pb-4">
          <div className="flex items-baseline gap-4">
            <Button variant="ghost" size="sm" onClick={() => setCurrentView(currentSubProject ? 'project' : 'home')} className="text-zinc-500 hover:text-white uppercase text-[10px] tracking-widest rounded-none px-0"><ArrowLeft className="mr-2 h-3 w-3" /> Voltar</Button>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{entityName}</h2>
          </div>
          <Tabs value={currentBoardType} onValueChange={setCurrentBoardType}>
            <TabsList className="bg-transparent border-b border-transparent rounded-none h-10 p-0 gap-6">
              {enabledTabs.includes('kanban') && <TabsTrigger value="kanban" className="rounded-none uppercase text-[10px] font-bold tracking-widest h-full data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b data-[state=active]:border-red-600 text-zinc-600">Kanban</TabsTrigger>}
              {enabledTabs.includes('todo') && <TabsTrigger value="todo" className="rounded-none uppercase text-[10px] font-bold tracking-widest h-full data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b data-[state=active]:border-red-600 text-zinc-600">Lista</TabsTrigger>}
              {enabledTabs.includes('files') && <TabsTrigger value="files" className="rounded-none uppercase text-[10px] font-bold tracking-widest h-full data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b data-[state=active]:border-red-600 text-zinc-600">Arquivos</TabsTrigger>}
              {enabledTabs.includes('goals') && <TabsTrigger value="goals" className="rounded-none uppercase text-[10px] font-bold tracking-widest h-full data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b data-[state=active]:border-red-600 text-zinc-600">Metas</TabsTrigger>}
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-hidden relative bg-black">
          <div className="absolute inset-0 overflow-auto pr-2">
            {/* KANBAN */}
            {currentBoardType === 'kanban' && (
              <div className="flex h-full gap-0 border-t border-l border-zinc-900 min-w-max">
                {data.lists?.map(list => (
                  <div key={list.id} className="w-80 flex flex-col h-full bg-black border-r border-zinc-900"
                       onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, list.id, 'list')}>
                    <div className="p-6 border-b border-zinc-900 flex justify-between items-center">
                      <span className="font-bold text-[10px] uppercase tracking-[0.2em] text-zinc-500">{list.title}</span>
                      <span className="text-zinc-700 text-[10px] font-mono">{list.tasks?.length.toString().padStart(2, '0') || '00'}</span>
                    </div>
                    <div className="flex-1 p-4 space-y-3 overflow-y-auto custom-scrollbar bg-black">
                      {list.tasks?.map(task => (
                        <Card key={task.id} draggable onDragStart={(e) => handleDragStart(e, task, 'task', list.id)}
                              onDragEnter={(e) => handleDragEnter(e, task.id)}
                              onClick={() => setModalState({ type: 'task', mode: 'edit', isOpen: true, data: task, listId: list.id })}
                              className={`bg-zinc-950 border border-zinc-900 hover:border-zinc-700 cursor-grab active:cursor-grabbing rounded-none shadow-none group transition-all ${dragOverTargetId === task.id ? 'border-t-2 border-t-red-600' : ''}`}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors uppercase tracking-tight leading-tight">{task.title}</span>
                              {task.priority === 'high' && <div className="h-1 w-1 bg-red-600 shrink-0" />}
                            </div>
                            <div className="flex items-center justify-between border-t border-zinc-900/50 pt-2 mt-2">
                              {task.responsibleUsers?.length > 0 && <ResponsibleUsersButton users={task.responsibleUsers} />}
                              {task.endDate && <span className="text-[9px] text-zinc-600 font-mono">{new Date(task.endDate).toLocaleDateString().slice(0,5)}</span>}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      <Button variant="ghost" className="w-full border border-dashed border-zinc-900 text-zinc-700 hover:text-white hover:bg-zinc-950 rounded-none h-12 uppercase text-[10px] tracking-widest"
                        onClick={() => setModalState({ type: 'task', mode: 'create', isOpen: true, data: { listId: list.id } })}>
                        <Plus className="h-3 w-3 mr-2" /> Adicionar Item
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TODO LIST */}
            {currentBoardType === 'todo' && (
              <div className="max-w-5xl mx-auto space-y-12">
                {data.lists?.map(list => (
                  <div key={list.id} className="space-y-0">
                    <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em] mb-4 pl-4 border-l-2 border-red-600">{list.title}</h3>
                    <div className="bg-black border-t border-zinc-900">
                      {list.tasks?.map(task => (
                        <div key={task.id} className="p-4 flex items-center gap-6 border-b border-zinc-900 hover:bg-zinc-950/50 transition-colors group">
                          <Checkbox checked={list.title === 'Concluído'} className="border-zinc-800 data-[state=checked]:bg-white data-[state=checked]:text-black rounded-none w-4 h-4" />
                          <div className="flex-1 cursor-pointer" onClick={() => setModalState({ type: 'task', mode: 'edit', isOpen: true, data: task, listId: list.id })}>
                            <p className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors uppercase tracking-wide">{task.title}</p>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-4">
                            <span className="text-[9px] font-mono uppercase text-zinc-600">{task.priority}</span>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-700 hover:text-red-600 hover:bg-transparent rounded-none" 
                                    onClick={() => handleTaskAction('delete', { taskId: task.id })}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button variant="ghost" className="w-full text-[10px] text-zinc-600 hover:text-white justify-start h-12 px-4 uppercase tracking-widest rounded-none hover:bg-zinc-950" onClick={() => setModalState({ type: 'task', mode: 'create', isOpen: true, data: { listId: list.id } })}>
                        <Plus className="h-3 w-3 mr-2" /> Inserir Dados
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* FILES (Visual Monolítico) */}
            {currentBoardType === 'files' && (
              <div 
                className={`min-h-[500px] relative transition-all duration-500 p-0 ${isFileDragging ? 'bg-zinc-950 border-2 border-dashed border-red-900' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsFileDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsFileDragging(false); }}
                onDrop={handleFileDrop}
              >
                {(isFileDragging || isUploading) && (
                  <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/90 backdrop-blur-sm">
                    {isUploading ? (
                       <MonolithLoader text="TRANSFERINDO DADOS" />
                    ) : (
                       <div className="text-center animate-pulse">
                          <Upload className="w-12 h-12 text-white mx-auto mb-4" />
                          <p className="text-white font-mono text-xs uppercase tracking-[0.5em]">Iniciar Upload</p>
                       </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center bg-zinc-950 p-8 border-b border-zinc-900 mb-8">
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Banco de Dados</h3>
                    <p className="text-[10px] text-zinc-600 mt-2 font-mono uppercase tracking-widest">Arquivos e Documentação Técnica</p>
                  </div>
                  <div className="relative">
                    <Input 
                      type="file" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                      multiple 
                      onChange={handleFileUploadWithFeedback} 
                    />
                    <Button className="bg-white text-black hover:bg-zinc-200 uppercase tracking-widest text-[10px] font-bold rounded-none h-12 px-8">
                      <Upload className="mr-2 h-4 w-4" /> Carregar
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-0 border-t border-l border-zinc-900">
                  {files?.filter(f => f.subProjectId === (currentSubProject?.id || null)).map(file => (
                    <div key={file.id} className="bg-black border-r border-b border-zinc-900 hover:bg-zinc-950 transition-all group relative aspect-square flex flex-col items-center justify-center p-6">
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-zinc-600 hover:text-red-600 rounded-none" onClick={() => handleDeleteFile(file.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                      </div>
                      <div className="mb-4 opacity-30 group-hover:opacity-100 transition-opacity duration-500 scale-90 group-hover:scale-100">
                        {file.type?.includes('image') ? <Eye className="w-8 h-8 text-white"/> : <FileText className="w-8 h-8 text-white"/>}
                      </div>
                      <p className="text-[10px] text-zinc-500 font-mono truncate w-full text-center group-hover:text-white transition-colors">{file.name}</p>
                      <p className="text-[8px] text-zinc-700 uppercase tracking-widest mt-2">{formatFileSize(file.size)}</p>
                      <a href={file.data} download={file.name} className="absolute inset-0 z-10" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-foreground flex flex-col font-sans selection:bg-red-900/50 selection:text-white overflow-hidden">
      {renderHeader()}
      <main className="flex-1 container mx-auto p-0 md:p-8 pt-6 h-[calc(100vh-4rem)] overflow-hidden">
        <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
          <AnimatePresence mode="wait">
            {currentView === 'home' && (
              <motion.div 
                key="home"
                initial={{ opacity: 0, filter: "blur(10px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.98, filter: "blur(5px)" }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                {renderHome()}
              </motion.div>
            )}
            {currentView === 'project' && (
              <motion.div 
                key="project"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                {renderProjectView()}
              </motion.div>
            )}
            {currentView === 'subproject' && (
              <motion.div 
                key="subproject"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {renderBoard()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* MODAL GLOBAL - Brutalista */}
      <Dialog open={modalState.isOpen} onOpenChange={(open) => !open && setModalState({ ...modalState, isOpen: false })}>
        <DialogContent className="sm:max-w-[500px] bg-black border border-zinc-800 text-zinc-100 p-0 gap-0 shadow-[0_0_100px_-20px_rgba(0,0,0,1)] rounded-none">
          <DialogHeader className="p-8 border-b border-zinc-900">
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">
              {modalState.type === 'project' && (modalState.mode === 'create' ? 'Inicializar Projeto' : 'Configurar Projeto')}
              {modalState.type === 'subProject' && (modalState.mode === 'create' ? 'Nova Área' : 'Editar Área')}
              {modalState.type === 'password' && 'Acesso Restrito // Nível 5'}
              {modalState.type === 'task' && (modalState.mode === 'edit' ? 'Dados da Tarefa' : 'Nova Entrada')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-8">
            {modalState.type === 'password' ? (
              <form onSubmit={(e) => { e.preventDefault(); handlePasswordSubmit(new FormData(e.target).get('password')); }}>
                <div className="space-y-8">
                  <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest text-center">Protocolo de Segurança Ativo</p>
                  <Input type="password" name="password" placeholder="SENHA" autoFocus className="bg-black border-zinc-800 rounded-none h-16 text-center text-xl tracking-[0.5em] uppercase focus:border-red-600 focus:ring-0 text-white placeholder:text-zinc-800" />
                  <Button type="submit" className="w-full bg-white text-black hover:bg-zinc-200 rounded-none h-14 uppercase font-bold tracking-widest text-xs">Desbloquear</Button>
                </div>
              </form>
            ) : (
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = Object.fromEntries(new FormData(e.target));
                if (modalState.type === 'project' || modalState.type === 'subProject') handleSaveProject(formData);
                if (modalState.type === 'task') handleTaskAction('save', formData);
              }} className="space-y-6">
                
                {(modalState.type === 'project' || modalState.type === 'subProject') && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Identificação</Label>
                      <Input name="name" defaultValue={modalState.data?.name} required className="bg-zinc-950 border-zinc-800 rounded-none h-12 focus:border-white text-white placeholder:text-zinc-700" placeholder="NOME DO PROJETO" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Detalhes</Label>
                      <Textarea name="description" defaultValue={modalState.data?.description} className="bg-zinc-950 border-zinc-800 rounded-none min-h-[100px] text-zinc-300 focus:border-white placeholder:text-zinc-700" placeholder="DESCRIÇÃO TÉCNICA" />
                    </div>
                    
                    <div className="space-y-4 pt-4 border-t border-zinc-900">
                      <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Módulos Ativos</Label>
                      <div className="grid grid-cols-2 gap-px bg-zinc-900 border border-zinc-900">
                        {ALL_TABS.map(tab => (
                          <div key={tab.id} className="flex items-center space-x-3 p-4 bg-black hover:bg-zinc-950 transition-colors">
                            <Checkbox 
                              id={`view_${tab.id}`} 
                              name={`view_${tab.id}`} 
                              defaultChecked={!modalState.data || (modalState.data.enabledTabs && modalState.data.enabledTabs.includes(tab.id))}
                              className="rounded-none border-zinc-700 data-[state=checked]:bg-white data-[state=checked]:text-black w-4 h-4"
                            />
                            <Label htmlFor={`view_${tab.id}`} className="flex items-center gap-2 cursor-pointer text-[10px] font-bold text-zinc-300 uppercase tracking-wider">
                              <tab.icon className="h-3 w-3 text-zinc-500" /> {tab.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 pt-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Espectro</Label>
                        <Select name="color" defaultValue={modalState.data?.color || "blue"}>
                          <SelectTrigger className="bg-zinc-950 border-zinc-800 rounded-none h-12"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-black border-zinc-800 rounded-none">
                            {USER_COLORS.map(c => <SelectItem key={c} value={c} className="uppercase text-[10px] tracking-widest focus:bg-zinc-900 cursor-pointer">{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end pb-4 gap-3">
                        <Checkbox id="prot" name="isProtected" defaultChecked={modalState.data?.isProtected} className="rounded-none border-zinc-700 w-5 h-5 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600" />
                        <Label htmlFor="prot" className="text-xs text-zinc-300 cursor-pointer uppercase tracking-wider font-bold">Criptografar</Label>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Chave de Segurança</Label>
                      <Input name="password" type="password" defaultValue={modalState.data?.password} className="bg-zinc-950 border-zinc-800 rounded-none h-12 text-white" placeholder="••••••" />
                    </div>
                  </>
                )}

                {modalState.type === 'task' && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Título da Entrada</Label>
                      <Input name="title" defaultValue={modalState.data?.title} required className="bg-zinc-950 border-zinc-800 rounded-none h-14 text-lg font-bold text-white focus:border-white placeholder:text-zinc-700" placeholder="TÍTULO" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                          <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Nível de Prioridade</Label>
                          <Select name="priority" defaultValue={modalState.data?.priority || 'medium'}>
                              <SelectTrigger className="bg-zinc-950 border-zinc-800 rounded-none h-12 text-xs uppercase tracking-wider"><SelectValue /></SelectTrigger>
                              <SelectContent className="bg-black border-zinc-800 rounded-none">
                                  <SelectItem value="low" className="text-[10px] uppercase tracking-widest">Baixa</SelectItem>
                                  <SelectItem value="medium" className="text-[10px] uppercase tracking-widest">Média</SelectItem>
                                  <SelectItem value="high" className="text-[10px] uppercase tracking-widest text-red-500">Crítica</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Prazo Limite</Label>
                          <Input type="date" name="endDate" defaultValue={modalState.data?.endDate} className="bg-zinc-950 border-zinc-800 rounded-none h-12 text-xs uppercase tracking-wider text-zinc-300" />
                      </div>
                    </div>
                  </>
                )}

                <DialogFooter className="pt-8 border-t border-zinc-900 gap-4">
                  <Button type="button" variant="ghost" onClick={() => setModalState({ ...modalState, isOpen: false })} className="hover:bg-zinc-900 hover:text-white text-zinc-500 rounded-none uppercase text-[10px] tracking-widest h-12 px-6">Abortar</Button>
                  <Button type="submit" className="bg-white text-black hover:bg-zinc-200 rounded-none uppercase text-[10px] font-bold tracking-widest h-12 px-8">Confirmar</Button>
                </DialogFooter>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default LegacyApp;
