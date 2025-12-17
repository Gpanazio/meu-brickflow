import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import logoImage from './assets/brickflowbranco.png';
import { debugLog } from './utils/debugLog';
import { formatFileSize } from './utils/formatFileSize';
// Import das frases
import { absurdPhrases } from './utils/phrases'; 

import ResponsibleUsersButton from './components/ResponsibleUsersButton';
import SudokuGame from './components/SudokuGame';
import { useFiles } from './hooks/useFiles';

// --- COMPONENTES SHADCN UI ---
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
  { id: 'todo', label: 'Lista', icon: ListTodo },
  { id: 'kanban', label: 'Kanban', icon: KanbanSquare },
  { id: 'files', label: 'Arquivos', icon: FileText },
  { id: 'goals', label: 'Metas', icon: Goal }
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

function LegacyApp() {
  // --- ESTADOS DO USUÁRIO ---
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  
  // --- ESTADOS DE DADOS ---
  const [projects, setProjects] = useState([]);
  const [currentView, setCurrentView] = useState('home');
  const [currentProject, setCurrentProject] = useState(null);
  const [currentSubProject, setCurrentSubProject] = useState(null);
  const [currentBoardType, setCurrentBoardType] = useState('kanban');
  const [isSyncing, setIsSyncing] = useState(false);
  
  // --- ESTADOS DE UI ---
  const [dailyPhrase, setDailyPhrase] = useState('');
  const [megaSenaNumbers, setMegaSenaNumbers] = useState([]);
  const [pendingAccessItem, setPendingAccessItem] = useState(null); 
  
  const [modalState, setModalState] = useState({
    type: null, // 'project' (new/edit), 'subProject', 'password', 'task'
    isOpen: false,
    data: null, // Dados para edição
    mode: 'create' // 'create' ou 'edit'
  });

  // --- ESTADOS DE DRAG & DROP ---
  const [dragState, setDragState] = useState({
    isDragging: false,
    itemType: null, 
    itemData: null,
    sourceContainerId: null
  });

  // Configuração Supabase
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Hook de Arquivos
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

  // --- EFEITOS ---
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

  // --- SINCRONIZAÇÃO COM SUPABASE ---
  // Debounce para evitar salvar a cada letra digitada
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    if (projects.length > 0 && isLoggedIn && currentUser) {
      // Salva localmente imediatamente para UI rápida
      localStorage.setItem(`brickflow-projects-${currentUser.userKey}`, JSON.stringify(projects));
      
      // Limpa timeout anterior
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      // Define novo timeout para salvar no banco
      saveTimeoutRef.current = setTimeout(async () => {
        setIsSyncing(true);
        try {
          // 1. Busca o ID do registro do usuário (se existir)
          const searchRes = await fetch(`${SUPABASE_URL}/rest/v1/brickflow_data?select=id`, {
             headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
          });
          
          if(searchRes.ok) {
             const existing = await searchRes.json();
             
             if (existing.length > 0) {
               // UPDATE
               await fetch(`${SUPABASE_URL}/rest/v1/brickflow_data?id=eq.${existing[0].id}`, {
                 method: 'PATCH',
                 headers: { 
                   'apikey': SUPABASE_KEY, 
                   'Authorization': `Bearer ${SUPABASE_KEY}`,
                   'Content-Type': 'application/json',
                   'Prefer': 'return=minimal'
                 },
                 body: JSON.stringify({ data: projects })
               });
             } else {
               // CREATE
               await fetch(`${SUPABASE_URL}/rest/v1/brickflow_data`, {
                 method: 'POST',
                 headers: { 
                   'apikey': SUPABASE_KEY, 
                   'Authorization': `Bearer ${SUPABASE_KEY}`,
                   'Content-Type': 'application/json',
                   'Prefer': 'return=minimal'
                 },
                 body: JSON.stringify({ data: projects }) // Assumindo que a coluna 'data' é JSONB
               });
             }
             debugLog("✅ Dados sincronizados com Supabase");
          }
        } catch (error) {
          console.error("Erro ao sincronizar:", error);
        } finally {
          setIsSyncing(false);
        }
      }, 1000); // 1 segundo de delay
    }
  }, [projects, isLoggedIn, currentUser]);

  // --- HELPERS ---
  const loadAllUsers = async () => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/brickflow_users`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      if (response.ok) setAllUsers(await response.json());
    } catch (error) { debugLog('Erro users', error); }
  };

  const loadUserProjects = async (userKey) => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/brickflow_data`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0 && data[0].data) {
          setProjects(data[0].data);
          return;
        }
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
    todo: { lists: [{ id: 'l1', title: 'A Fazer', tasks: [] }, { id: 'l2', title: 'Fazendo', tasks: [] }, { id: 'l3', title: 'Feito', tasks: [] }] },
    kanban: { lists: [{ id: 'k1', title: 'Backlog', tasks: [] }, { id: 'k2', title: 'Em Progresso', tasks: [] }, { id: 'k3', title: 'Concluído', tasks: [] }] },
    timeline: { periods: [{ id: 'p1', title: 'Q1', tasks: [] }] },
    goals: { objectives: [] }
  });

  // --- AÇÕES DO USUÁRIO ---
  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('brickflow-current-user');
    setCurrentUser(null);
  };

  const handleSwitchUser = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  // --- AÇÕES DE PROJETO (CRUD + SENHA) ---
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
    // Garante que a view inicial seja uma das tabs habilitadas
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

  // HANDLER UNIFICADO PARA CRIAR E EDITAR PROJETOS/SUBPROJETOS
  const handleSaveProject = (formData) => {
    const isEdit = modalState.mode === 'edit';
    const isSub = modalState.type === 'subProject'; // Contexto atual (criando/editando sub ou proj?)
    
    // Captura as tabs selecionadas
    const selectedTabs = ALL_TABS.filter(tab => formData[`view_${tab.id}`] === 'on').map(t => t.id);
    // Se nenhuma selecionada, usa o padrão
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
        // --- EDIÇÃO ---
        const targetId = modalState.data.id;
        
        const updatedProjects = projects.map(p => {
            // Se estamos editando um projeto principal
            if (p.id === targetId && !isSub) {
                return { ...p, ...projectData };
            }
            
            // Se estamos editando um subprojeto
            if (p.subProjects && p.subProjects.length > 0) {
                const updatedSubs = p.subProjects.map(sp => {
                    if (sp.id === targetId) {
                        return { ...sp, ...projectData };
                    }
                    return sp;
                });
                return { ...p, subProjects: updatedSubs };
            }
            
            return p;
        });
        
        updateProjectsState(updatedProjects);
        
        // Atualiza a referência atual se estivermos dentro dela
        if (currentProject?.id === targetId) {
            setCurrentProject(updatedProjects.find(p => p.id === targetId));
        }
        if (currentSubProject?.id === targetId) {
            const parent = updatedProjects.find(p => p.subProjects.some(sp => sp.id === targetId));
            setCurrentSubProject(parent.subProjects.find(sp => sp.id === targetId));
        }

    } else {
        // --- CRIAÇÃO ---
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
            // Adicionar Subprojeto ao Projeto Atual
            const updatedProjects = projects.map(p => 
                p.id === currentProject.id 
                ? { ...p, subProjects: [...(p.subProjects || []), newItem] } 
                : p
            );
            updateProjectsState(updatedProjects);
            setCurrentProject(updatedProjects.find(p => p.id === currentProject.id));
        } else {
            // Adicionar Novo Projeto Principal
            updateProjectsState([...projects, newItem]);
        }
    }
    
    setModalState({ isOpen: false, type: null });
  };

  const handleDeleteProject = (item, isSub = false) => {
    if (!confirm(`Tem certeza que deseja excluir "${item.name}"?`)) return;
    
    if (isSub) {
      const updatedProjects = projects.map(p => 
        p.id === currentProject.id 
          ? { ...p, subProjects: p.subProjects.filter(s => s.id !== item.id) } 
          : p
      );
      updateProjectsState(updatedProjects);
      setCurrentProject(updatedProjects.find(p => p.id === currentProject.id));
    } else {
      updateProjectsState(projects.filter(p => p.id !== item.id));
    }
  };

  // --- DRAG & DROP GERAL ---
  const handleDragStart = (e, item, type, sourceId = null) => {
    e.dataTransfer.effectAllowed = 'move';
    setDragState({
      isDragging: true,
      itemType: type,
      itemData: item,
      sourceContainerId: sourceId
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetId, type) => {
    e.preventDefault();
    if (!dragState.isDragging) return;

    // Drop de Projetos
    if (type === 'project' && dragState.itemType === 'project') {
        const draggedIdx = projects.findIndex(p => p.id === dragState.itemData.id);
        const targetIdx = projects.findIndex(p => p.id === targetId);
        if (draggedIdx === targetIdx) return;

        const newProjects = [...projects];
        const [removed] = newProjects.splice(draggedIdx, 1);
        newProjects.splice(targetIdx, 0, removed);
        updateProjectsState(newProjects);
    }

    // Drop de Tarefas
    if (type === 'list' && dragState.itemType === 'task') {
        const sourceListId = dragState.sourceContainerId;
        const targetListId = targetId;
        if (sourceListId === targetListId) return;

        const task = dragState.itemData;
        const updatedProjects = projects.map(p => {
            if (p.id !== currentProject.id) return p;
            
            const updateBoard = (entity) => {
                const board = { ...entity.boardData };
                const lists = [...board[currentBoardType].lists];
                
                const sIdx = lists.findIndex(l => l.id === sourceListId);
                if (sIdx === -1) return entity;
                const sList = { ...lists[sIdx], tasks: lists[sIdx].tasks.filter(t => t.id !== task.id) };
                lists[sIdx] = sList;

                const tIdx = lists.findIndex(l => l.id === targetListId);
                const tList = { ...lists[tIdx], tasks: [...lists[tIdx].tasks, task] };
                lists[tIdx] = tList;

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

    setDragState({ isDragging: false, itemType: null, itemData: null, sourceContainerId: null });
  };

  // --- DROP DE ARQUIVOS ---
  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsFileDragging(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
        originalHandleFileUpload({ target: { files: droppedFiles, value: '' } });
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

      if (currentView === 'subproject') {
        return { ...p, subProjects: p.subProjects.map(sp => sp.id === currentSubProject.id ? updateEntity(sp) : sp) };
      }
      return updateEntity(p);
    });

    updateProjectsState(updatedProjects);
    
    const newProj = updatedProjects.find(p => p.id === currentProject.id);
    if (currentView === 'subproject') setCurrentSubProject(newProj.subProjects.find(s => s.id === currentSubProject.id));
    else setCurrentProject(newProj);

    if(action === 'save') setModalState({ isOpen: false, type: null });
  };

  // --- RENDERIZADORES ---

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 text-zinc-100 p-4">
        <Card className="w-full max-w-md border-zinc-800 bg-zinc-900/50 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700 shadow-inner">
              <img src={logoImage} alt="BrickFlow" className="w-10 h-10 object-contain opacity-90" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight">BrickFlow OS</CardTitle>
              <CardDescription className="text-zinc-400">Entre para acessar seu workspace</CardDescription>
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
            }} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-zinc-300">Usuário</Label>
                <Input name="username" placeholder="Ex: JOAO" className="bg-zinc-950 border-zinc-800" required />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">PIN</Label>
                <Input name="pin" type="password" placeholder="••••" maxLength={4} className="bg-zinc-950 border-zinc-800 text-center tracking-widest" required />
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-red-600 text-white font-medium">Entrar no Sistema</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderHeader = () => (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/60">
      <div className="container flex h-14 items-center justify-between mx-auto px-4 md:px-8">
        <div className="flex items-center gap-4">
          <div onClick={() => setCurrentView('home')} className="cursor-pointer flex items-center gap-2">
             <img src={logoImage} alt="BrickFlow" className="h-8 w-auto object-contain" />
          </div>
          <Separator orientation="vertical" className="h-6 bg-zinc-800" />
          <nav className="flex items-center gap-2 text-sm">
            <Button variant="ghost" className={currentView === 'home' ? 'text-white' : 'text-zinc-400'} onClick={() => setCurrentView('home')}>Dashboard</Button>
            {currentProject && (
              <>
                <span className="text-zinc-600">/</span>
                <Button variant="ghost" className="text-zinc-400" onClick={() => setCurrentView('project')}>{currentProject.name}</Button>
              </>
            )}
          </nav>
        </div>
        
        {/* Menu do Usuário */}
        <div className="flex items-center gap-4">
          {isSyncing && <span className="text-xs text-zinc-500 animate-pulse">Salvando...</span>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-auto rounded-full gap-2 px-2 hover:bg-zinc-900 border border-transparent hover:border-zinc-800">
                <Avatar className="h-7 w-7"><AvatarFallback>{currentUser?.displayName?.charAt(0)}</AvatarFallback></Avatar>
                <span className="text-xs font-medium text-zinc-300 hidden sm:inline-block">{currentUser?.displayName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-zinc-950 border-zinc-800" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-white">{currentUser?.displayName}</p>
                  <p className="text-xs leading-none text-zinc-500">@{currentUser?.username}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem onClick={handleSwitchUser} className="focus:bg-zinc-900 focus:text-white cursor-pointer">
                <RotateCcw className="mr-2 h-4 w-4" /> Trocar Usuário
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-400 focus:bg-red-950/20 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );

  const renderHome = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Sorte do Dia */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-2 bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10"><Sparkles className="w-24 h-24 text-primary" /></div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-zinc-100"><Sparkles className="w-5 h-5 text-primary" /> Sorte do Dia</CardTitle>
            <CardDescription className="text-zinc-400 italic">"{dailyPhrase}"</CardDescription>
          </CardHeader>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader><CardTitle className="text-sm uppercase tracking-wider flex gap-2"><Dna className="w-4 h-4" /> Mega Sena</CardTitle></CardHeader>
          <CardContent>
            <div className="flex justify-between">{megaSenaNumbers.map((num, i) => (
              <div key={i} className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-900 text-emerald-400 flex items-center justify-center font-bold text-sm">{num}</div>
            ))}</div>
          </CardContent>
        </Card>
      </div>

      {currentUser?.displayName === 'Fran' && <SudokuGame />}

      <div className="flex justify-between items-end border-b border-zinc-800 pb-2">
        <h2 className="text-3xl font-bold">Projetos</h2>
        <Button onClick={() => setModalState({ type: 'project', mode: 'create', isOpen: true })} className="bg-white text-black hover:bg-zinc-200"><Plus className="mr-2 h-4 w-4" /> Novo Projeto</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.filter(p => !p.isArchived).map(project => (
          <Card 
            key={project.id} 
            draggable={true}
            onDragStart={(e) => handleDragStart(e, project, 'project')}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, project.id, 'project')}
            onClick={() => handleAccessProject(project)} 
            className="group relative overflow-hidden bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-all cursor-pointer hover:shadow-xl active:cursor-grabbing"
          >
            <div className={`absolute top-0 left-0 w-1 h-full bg-${project.color}-500 group-hover:w-2 transition-all`} />
            <CardHeader className="pl-6">
              <div className="flex justify-between">
                <CardTitle className="text-xl">{project.name}</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800">
                    <DropdownMenuItem onClick={e => { e.stopPropagation(); setModalState({ type: 'project', mode: 'edit', isOpen: true, data: project }); }}>Editar</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-500" onClick={e => { e.stopPropagation(); handleDeleteProject(project); }}>Excluir</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardDescription>{project.description || "Sem descrição"}</CardDescription>
            </CardHeader>
            <CardContent className="pl-6 flex gap-2">
              <Badge variant="outline" className="bg-zinc-950">{project.subProjects?.length || 0} Áreas</Badge>
              {project.isProtected && <Badge variant="secondary" className="bg-yellow-900/20 text-yellow-500"><Lock className="w-3 h-3 mr-1" /> Privado</Badge>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderProjectView = () => (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setCurrentView('home')}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">{currentProject.name} {currentProject.isProtected && <Lock className="h-5 w-5 text-zinc-500"/>}</h1>
          <p className="text-zinc-400">{currentProject.description}</p>
        </div>
        <div className="ml-auto flex gap-2">
           <Button variant="outline" onClick={() => { setCurrentSubProject(null); setCurrentBoardType('kanban'); setCurrentView('subproject'); }}>Quadro Principal</Button>
           <Button onClick={() => setModalState({ type: 'subProject', mode: 'create', isOpen: true })}><Plus className="mr-2 h-4 w-4" /> Nova Área</Button>
        </div>
      </div>
      <Separator className="bg-zinc-800" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {currentProject.subProjects?.filter(s => !s.isArchived).map(sub => (
          <Card key={sub.id} onClick={() => handleAccessProject(sub, 'subproject')} className="cursor-pointer bg-zinc-900 border-zinc-800 hover:bg-zinc-800/80 transition-all">
            <CardHeader>
              <div className="flex justify-between">
                <div className={`p-2 rounded bg-${sub.color || 'zinc'}-500/20 text-${sub.color || 'zinc'}-500`}><FolderOpen className="h-5 w-5" /></div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800">
                    <DropdownMenuItem onClick={e => { e.stopPropagation(); setModalState({ type: 'subProject', mode: 'edit', isOpen: true, data: sub }); }}>Editar</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-500" onClick={e => { e.stopPropagation(); handleDeleteProject(sub, true); }}>Excluir</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardTitle className="mt-4">{sub.name}</CardTitle>
              <CardDescription>{sub.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderBoard = () => {
    const data = getCurrentBoardData();
    const currentEntity = currentSubProject || currentProject;
    const entityName = currentEntity.name;
    const enabledTabs = currentEntity.enabledTabs || DEFAULT_TABS;

    return (
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setCurrentView(currentSubProject ? 'project' : 'home')}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
            <h2 className="text-2xl font-bold">{entityName}</h2>
          </div>
          <Tabs value={currentBoardType} onValueChange={setCurrentBoardType}>
            <TabsList className="bg-zinc-900 border border-zinc-800">
              {enabledTabs.includes('kanban') && <TabsTrigger value="kanban">Kanban</TabsTrigger>}
              {enabledTabs.includes('todo') && <TabsTrigger value="todo">Lista</TabsTrigger>}
              {enabledTabs.includes('files') && <TabsTrigger value="files">Arquivos</TabsTrigger>}
              {enabledTabs.includes('goals') && <TabsTrigger value="goals">Metas</TabsTrigger>}
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 bg-zinc-950/30 border border-zinc-800 rounded-xl overflow-hidden relative">
          <div className="absolute inset-0 p-4 overflow-auto">
            {/* KANBAN */}
            {currentBoardType === 'kanban' && (
              <div className="flex h-full gap-6 min-w-max">
                {data.lists?.map(list => (
                  <div key={list.id} className="w-80 flex flex-col h-full bg-zinc-900/40 rounded-xl border border-zinc-800/50"
                       onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, list.id, 'list')}>
                    <div className="p-3 border-b border-zinc-800 flex justify-between items-center">
                      <span className="font-semibold text-zinc-300">{list.title}</span>
                      <Badge variant="secondary" className="bg-zinc-800 text-zinc-500">{list.tasks?.length || 0}</Badge>
                    </div>
                    <div className="flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar">
                      {list.tasks?.map(task => (
                        <Card key={task.id} draggable onDragStart={(e) => handleDragStart(e, task, 'task', list.id)}
                              onClick={() => setModalState({ type: 'task', mode: 'edit', isOpen: true, data: task, listId: list.id })}
                              className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 cursor-grab active:cursor-grabbing">
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-sm font-medium text-zinc-200">{task.title}</span>
                              {task.priority === 'high' && <div className="h-2 w-2 rounded-full bg-red-500 shrink-0" />}
                            </div>
                            <div className="flex items-center justify-between text-xs text-zinc-500">
                              {task.responsibleUsers?.length > 0 && <ResponsibleUsersButton users={task.responsibleUsers} />}
                              {task.endDate && <span>{new Date(task.endDate).toLocaleDateString().slice(0,5)}</span>}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      <Button variant="ghost" className="w-full border border-dashed border-zinc-800 text-zinc-500 hover:text-zinc-300"
                        onClick={() => setModalState({ type: 'task', mode: 'create', isOpen: true, data: { listId: list.id } })}>
                        <Plus className="h-3 w-3 mr-2" /> Adicionar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TODO LIST */}
            {currentBoardType === 'todo' && (
              <div className="max-w-4xl mx-auto space-y-6">
                {data.lists?.map(list => (
                  <div key={list.id} className="space-y-2">
                    <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider pl-1">{list.title}</h3>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg divide-y divide-zinc-800">
                      {list.tasks?.map(task => (
                        <div key={task.id} className="p-3 flex items-center gap-4 hover:bg-zinc-800/50 transition-colors">
                          <Checkbox checked={list.title === 'Concluído'} className="border-zinc-700" />
                          <div className="flex-1 cursor-pointer" onClick={() => setModalState({ type: 'task', mode: 'edit', isOpen: true, data: task, listId: list.id })}>
                            <p className="text-sm font-medium text-zinc-200">{task.title}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-600 hover:text-red-500" 
                                  onClick={() => handleTaskAction('delete', { taskId: task.id })}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="ghost" className="w-full text-xs text-zinc-500 justify-start" onClick={() => setModalState({ type: 'task', mode: 'create', isOpen: true, data: { listId: list.id } })}>
                        <Plus className="h-3 w-3 mr-2" /> Adicionar item
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* FILES */}
            {currentBoardType === 'files' && (
              <div 
                className={`space-y-6 min-h-[400px] relative rounded-xl transition-colors ${isFileDragging ? 'bg-zinc-900/50 border-2 border-dashed border-primary/50' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsFileDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsFileDragging(false); }}
                onDrop={handleFileDrop}
              >
                {isFileDragging && (
                  <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                    <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800 shadow-2xl animate-bounce">
                      <Upload className="w-12 h-12 text-primary mx-auto mb-2" />
                      <p className="text-white font-medium">Solte os arquivos aqui</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                  <div><h3 className="text-lg font-medium text-white">Arquivos</h3><p className="text-sm text-zinc-500">Documentos do projeto.</p></div>
                  <div className="relative">
                    <Input 
                      type="file" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                      multiple 
                      onChange={originalHandleFileUpload} 
                    />
                    <Button className="bg-white text-black hover:bg-zinc-200">
                      <Upload className="mr-2 h-4 w-4" /> Upload
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {files?.filter(f => f.subProjectId === (currentSubProject?.id || null)).map(file => (
                    <Card key={file.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-all group relative">
                      <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                          <Button size="icon" variant="destructive" className="h-6 w-6" onClick={() => handleDeleteFile(file.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="h-12 w-12 rounded bg-zinc-950 flex items-center justify-center text-2xl border border-zinc-800">{file.type?.includes('image') ? '🖼️' : '📄'}</div>
                        <div className="w-full"><p className="text-sm font-medium truncate text-zinc-200" title={file.name}>{file.name}</p><p className="text-xs text-zinc-500">{formatFileSize(file.size)}</p></div>
                        <Button variant="outline" size="sm" className="w-full h-7 text-xs border-zinc-800" asChild>
                          <a href={file.data} download={file.name}><Download className="mr-2 h-3 w-3" /> Baixar</a>
                        </Button>
                      </CardContent>
                    </Card>
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
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20 selection:text-primary">
      {renderHeader()}
      <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8 pt-6">
        {currentView === 'home' && renderHome()}
        {currentView === 'project' && renderProjectView()}
        {currentView === 'subproject' && renderBoard()}
      </main>

      {/* MODAL GLOBAL */}
      <Dialog open={modalState.isOpen} onOpenChange={(open) => !open && setModalState({ ...modalState, isOpen: false })}>
        <DialogContent className="sm:max-w-[500px] bg-zinc-950 border-zinc-800 text-zinc-100 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {modalState.type === 'project' && (modalState.mode === 'create' ? 'Novo Projeto' : 'Editar Projeto')}
              {modalState.type === 'subProject' && (modalState.mode === 'create' ? 'Nova Área' : 'Editar Área')}
              {modalState.type === 'password' && 'Acesso Restrito'}
              {modalState.type === 'task' && (modalState.mode === 'edit' ? 'Editar Tarefa' : 'Nova Tarefa')}
            </DialogTitle>
          </DialogHeader>
          
          {modalState.type === 'password' ? (
            <form onSubmit={(e) => { e.preventDefault(); handlePasswordSubmit(new FormData(e.target).get('password')); }}>
              <div className="space-y-4 py-4">
                <p className="text-zinc-400">Este conteúdo é protegido por senha.</p>
                <Input type="password" name="password" placeholder="Senha do projeto" autoFocus className="bg-zinc-900 border-zinc-800" />
                <Button type="submit" className="w-full">Acessar</Button>
              </div>
            </form>
          ) : (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = Object.fromEntries(new FormData(e.target));
              if (modalState.type === 'project' || modalState.type === 'subProject') handleSaveProject(formData);
              if (modalState.type === 'task') handleTaskAction('save', formData);
            }} className="space-y-4 py-4">
              
              {(modalState.type === 'project' || modalState.type === 'subProject') && (
                <>
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input name="name" defaultValue={modalState.data?.name} required className="bg-zinc-900 border-zinc-800" />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea name="description" defaultValue={modalState.data?.description} className="bg-zinc-900 border-zinc-800" />
                  </div>
                  <div className="space-y-3 pt-2">
                    <Label>Visualizações Habilitadas</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {ALL_TABS.map(tab => (
                        <div key={tab.id} className="flex items-center space-x-2 border border-zinc-800 p-2 rounded-md bg-zinc-900/50">
                          <Checkbox 
                            id={`view_${tab.id}`} 
                            name={`view_${tab.id}`} 
                            defaultChecked={!modalState.data || (modalState.data.enabledTabs && modalState.data.enabledTabs.includes(tab.id))}
                          />
                          <Label htmlFor={`view_${tab.id}`} className="flex items-center gap-2 cursor-pointer">
                            <tab.icon className="h-4 w-4 text-zinc-400" /> {tab.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label>Cor</Label>
                      <Select name="color" defaultValue={modalState.data?.color || "blue"}>
                        <SelectTrigger className="bg-zinc-900 border-zinc-800"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                          {USER_COLORS.map(c => <SelectItem key={c} value={c}>{c.toUpperCase()}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end pb-2 gap-2">
                      <Checkbox id="prot" name="isProtected" defaultChecked={modalState.data?.isProtected} />
                      <Label htmlFor="prot">Proteger com Senha</Label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Senha (Opcional)</Label>
                    <Input name="password" type="password" defaultValue={modalState.data?.password} className="bg-zinc-900 border-zinc-800" />
                  </div>
                </>
              )}

              {modalState.type === 'task' && (
                <>
                  <div className="space-y-2"><Label>Título</Label><Input name="title" defaultValue={modalState.data?.title} required className="bg-zinc-900 border-zinc-800" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Prioridade</Label><Select name="priority" defaultValue={modalState.data?.priority || 'medium'}><SelectTrigger className="bg-zinc-900 border-zinc-800"><SelectValue /></SelectTrigger><SelectContent className="bg-zinc-900 border-zinc-800"><SelectItem value="low">Baixa</SelectItem><SelectItem value="medium">Média</SelectItem><SelectItem value="high">Alta</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label>Prazo</Label><Input type="date" name="endDate" defaultValue={modalState.data?.endDate} className="bg-zinc-900 border-zinc-800" /></div>
                  </div>
                </>
              )}

              <DialogFooter><Button type="submit">Salvar</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default LegacyApp;
