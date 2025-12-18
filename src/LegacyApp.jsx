import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import logoImage from './assets/brickflowbranco.png';
import { debugLog } from './utils/debugLog';
import { formatFileSize } from './utils/formatFileSize';
import { absurdPhrases } from './utils/phrases';
import { supabase } from './lib/supabaseClient';

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
  <div className="flex flex-col items-center justify-center gap-4 animate-in fade-in zoom-in duration-300">
    <div className="w-8 h-16 bg-black border border-zinc-800 shadow-[0_0_15px_rgba(255,255,255,0.1)] animate-monolith-pulse"></div>
    <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">{text}</span>
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
    if (projects.length > 0 && isLoggedIn && currentUser) {
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
    try {
      const { data, error } = await supabase.from('brickflow_users').select('*');
      if (!error && data) setAllUsers(data);
    } catch (error) { debugLog('Erro users', error); }
  };

  const loadUserProjects = async (userKey) => {
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

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-black p-4">
        <Card className="w-full max-w-md border-zinc-800 bg-zinc-950 shadow-2xl glass-panel">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto">
              <img src={logoImage} alt="BrickFlow" className="h-12 w-auto object-contain opacity-90 mx-auto" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight brick-title">BRICKFLOW OS</CardTitle>
              <CardDescription className="text-zinc-500">Do zero ao todo.</CardDescription>
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
              <div className="space-y-2"><Label className="text-zinc-400 text-xs uppercase tracking-wider">Usuário</Label><Input name="username" placeholder="EX: JOAO" className="bg-black border-zinc-800 focus:border-red-600" required /></div>
              <div className="space-y-2"><Label className="text-zinc-400 text-xs uppercase tracking-wider">PIN</Label><Input name="pin" type="password" placeholder="••••" maxLength={4} className="bg-black border-zinc-800 text-center tracking-widest focus:border-red-600" required /></div>
              <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest h-12">Entrar</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderHeader = () => (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-900 bg-black/90 backdrop-blur">
      <div className="container flex h-16 items-center justify-between mx-auto px-4 md:px-8">
        <div className="flex items-center gap-6">
          <div onClick={() => setCurrentView('home')} className="cursor-pointer flex items-center gap-2 hover:opacity-80 transition-opacity">
             <img src={logoImage} alt="BrickFlow" className="h-8 w-auto object-contain" />
          </div>
          <Separator orientation="vertical" className="h-6 bg-zinc-800" />
          <nav className="flex items-center gap-2 text-sm">
            <Button variant="ghost" className={`uppercase tracking-wider text-xs font-bold ${currentView === 'home' ? 'text-white' : 'text-zinc-500'}`} onClick={() => setCurrentView('home')}>Dashboard</Button>
            {currentProject && (
              <>
                <span className="text-zinc-700">/</span>
                <Button variant="ghost" className="uppercase tracking-wider text-xs font-bold text-zinc-500 hover:text-white" onClick={() => setCurrentView('project')}>{currentProject.name}</Button>
              </>
            )}
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          {isSyncing && <MonolithLoader text="SYNC" />}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:bg-zinc-900 border border-transparent hover:border-zinc-800">
                <Avatar className="h-8 w-8"><AvatarFallback className="bg-zinc-900 text-zinc-400 text-xs">{currentUser?.displayName?.charAt(0)}</AvatarFallback></Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-zinc-950 border-zinc-800 rounded-none shadow-2xl" align="end">
              <DropdownMenuLabel className="font-normal p-3">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-bold leading-none text-white uppercase">{currentUser?.displayName}</p>
                  <p className="text-xs leading-none text-zinc-600">@{currentUser?.username}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-900" />
              <DropdownMenuItem onClick={handleSwitchUser} className="focus:bg-zinc-900 focus:text-white cursor-pointer uppercase text-xs tracking-wider"><RotateCcw className="mr-2 h-3 w-3" /> Trocar</DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-500 focus:bg-red-950/10 cursor-pointer uppercase text-xs tracking-wider"><LogOut className="mr-2 h-3 w-3" /> Sair</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );

  const renderHome = () => (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-2 bg-zinc-950 border-zinc-900 relative overflow-hidden cinema-card group">
          <div className="absolute top-0 right-0 p-4 opacity-5"><Sparkles className="w-32 h-32 text-red-600" /></div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-zinc-100 uppercase tracking-widest text-sm text-red-600"><Sparkles className="w-4 h-4" /> Sorte do Dia</CardTitle>
            <CardDescription className="text-zinc-300 text-lg font-light leading-relaxed mt-2 group-hover:text-white transition-colors">"{dailyPhrase}"</CardDescription>
          </CardHeader>
        </Card>
        <Card className="bg-zinc-950 border-zinc-900 cinema-card">
          <CardHeader><CardTitle className="text-xs uppercase tracking-widest flex gap-2 text-emerald-600"><Dna className="w-4 h-4" /> Mega Sena</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center h-full pb-8">
            <div className="flex flex-wrap justify-center gap-2">{megaSenaNumbers.map((num, i) => (
              <div key={i} className="w-9 h-9 rounded-none border border-emerald-900/30 bg-emerald-950/10 text-emerald-500 flex items-center justify-center font-mono font-bold text-sm hover:bg-emerald-900/30 hover:border-emerald-500/50 transition-all cursor-default">{num.toString().padStart(2, '0')}</div>
            ))}</div>
          </CardContent>
        </Card>
      </div>

      {currentUser?.displayName === 'Fran' && <SudokuGame />}

      <div className="flex justify-between items-end border-b border-zinc-900 pb-4">
        <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Projetos</h2>
        <Button onClick={() => setModalState({ type: 'project', mode: 'create', isOpen: true })} className="bg-white text-black hover:bg-zinc-300 font-bold uppercase tracking-wider rounded-none h-10 px-6"><Plus className="mr-2 h-4 w-4" /> Novo</Button>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 opacity-20 hover:opacity-40 transition-opacity">
          <h1 className="text-8xl font-black text-zinc-800 uppercase tracking-tighter text-center leading-none">DO ZERO<br/>AO TODO</h1>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.filter(p => !p.isArchived).map(project => (
            <Card 
              key={project.id} 
              draggable={true}
              onDragStart={(e) => handleDragStart(e, project, 'project')}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, project.id, 'project')}
              onClick={() => handleAccessProject(project)} 
              className="group aspect-[4/5] relative overflow-hidden bg-zinc-950 border-zinc-900 hover:border-zinc-700 transition-all cursor-pointer hover:shadow-2xl active:cursor-grabbing flex flex-col justify-between"
            >
              <div className={`absolute top-0 left-0 w-full h-1 bg-${project.color}-600`} />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
              
              <CardHeader className="relative z-10 pt-8">
                <div className="flex justify-between items-start">
                  <Badge variant="outline" className={`bg-${project.color}-950/30 text-${project.color}-500 border-${project.color}-900/50 uppercase text-[10px] tracking-widest rounded-none mb-2`}>
                     {project.subProjects?.length || 0} Áreas
                  </Badge>
                  {project.isProtected && <Lock className="w-3 h-3 text-zinc-600" />}
                </div>
                <CardTitle className="text-3xl font-bold text-white uppercase leading-none break-words">{project.name}</CardTitle>
              </CardHeader>

              <CardContent className="relative z-10">
                <p className="text-zinc-500 line-clamp-3 text-sm">{project.description || "Descrição não definida."}</p>
              </CardContent>

              <CardFooter className="relative z-10 border-t border-zinc-900/50 pt-4 flex justify-between items-center bg-black/20 backdrop-blur-sm">
                 <span className="text-xs text-zinc-700 font-mono uppercase">BRICK.{project.id.slice(-4)}</span>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-600 hover:text-white"><MoreVertical className="h-3 w-3" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-black border-zinc-800 rounded-none">
                      <DropdownMenuItem onClick={e => { e.stopPropagation(); setModalState({ type: 'project', mode: 'edit', isOpen: true, data: project }); }} className="text-xs uppercase tracking-wider">Editar</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600 text-xs uppercase tracking-wider" onClick={e => { e.stopPropagation(); handleDeleteProject(project); }}>Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                 </DropdownMenu>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderProjectView = () => (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300 pb-20">
      <div className="flex items-center gap-6 border-b border-zinc-900 pb-6">
        <Button variant="outline" size="icon" onClick={() => setCurrentView('home')} className="border-zinc-800 bg-black hover:bg-zinc-900 rounded-none h-12 w-12"><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
            {currentProject.name} 
            {currentProject.isProtected && <Lock className="h-6 w-6 text-zinc-700"/>}
          </h1>
          <p className="text-zinc-500 mt-1 max-w-2xl">{currentProject.description}</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="border-zinc-800 hover:bg-zinc-900 rounded-none uppercase text-xs tracking-wider h-12" onClick={() => { setCurrentSubProject(null); setCurrentBoardType('kanban'); setCurrentView('subproject'); }}>Quadro Geral</Button>
           <Button onClick={() => setModalState({ type: 'subProject', mode: 'create', isOpen: true })} className="bg-red-600 hover:bg-red-700 text-white rounded-none uppercase text-xs tracking-wider h-12 px-6"><Plus className="mr-2 h-4 w-4" /> Nova Área</Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {currentProject.subProjects?.filter(s => !s.isArchived).map(sub => (
          <Card key={sub.id} onClick={() => handleAccessProject(sub, 'subproject')} className="group cursor-pointer bg-zinc-950 border-zinc-900 hover:border-red-900/50 transition-all duration-300 hover:bg-zinc-900 rounded-none relative">
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white"><MoreVertical className="h-3 w-3" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-black border-zinc-800 rounded-none">
                  <DropdownMenuItem onClick={e => { e.stopPropagation(); setModalState({ type: 'subProject', mode: 'edit', isOpen: true, data: sub }); }} className="text-xs uppercase">Editar</DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600 text-xs uppercase" onClick={e => { e.stopPropagation(); handleDeleteProject(sub, true); }}>Excluir</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                 <div className={`w-1 h-8 bg-${sub.color || 'zinc'}-600`} />
                 <FolderOpen className={`h-5 w-5 text-${sub.color || 'zinc'}-600`} />
              </div>
              <CardTitle className="text-xl uppercase tracking-wide text-white">{sub.name}</CardTitle>
              <CardDescription className="text-zinc-500 text-sm line-clamp-2">{sub.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
        {/* Card Vazio para Adicionar */}
        <div 
          onClick={() => setModalState({ type: 'subProject', mode: 'create', isOpen: true })}
          className="border border-dashed border-zinc-900 hover:border-zinc-700 bg-transparent flex flex-col items-center justify-center h-full min-h-[200px] cursor-pointer group transition-all"
        >
          <Plus className="h-8 w-8 text-zinc-800 group-hover:text-zinc-600 mb-2 transition-colors" />
          <span className="text-xs uppercase tracking-widest text-zinc-800 group-hover:text-zinc-600">Criar Área</span>
        </div>
      </div>
    </div>
  );

  const renderBoard = () => {
    const data = getCurrentBoardData();
    const currentEntity = currentSubProject || currentProject;
    const entityName = currentEntity.name;
    const enabledTabs = currentEntity.enabledTabs || DEFAULT_TABS;

    return (
      <div className="flex flex-col h-[calc(100vh-6rem)]">
        <div className="flex items-center justify-between mb-6 border-b border-zinc-900 pb-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setCurrentView(currentSubProject ? 'project' : 'home')} className="text-zinc-500 hover:text-white uppercase text-xs tracking-widest"><ArrowLeft className="mr-2 h-3 w-3" /> Voltar</Button>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">{entityName}</h2>
          </div>
          <Tabs value={currentBoardType} onValueChange={setCurrentBoardType}>
            <TabsList className="bg-black border border-zinc-800 rounded-none h-10 p-0">
              {enabledTabs.includes('kanban') && <TabsTrigger value="kanban" className="rounded-none uppercase text-xs tracking-wider h-full data-[state=active]:bg-zinc-900 data-[state=active]:text-white">Kanban</TabsTrigger>}
              {enabledTabs.includes('todo') && <TabsTrigger value="todo" className="rounded-none uppercase text-xs tracking-wider h-full data-[state=active]:bg-zinc-900 data-[state=active]:text-white">Lista</TabsTrigger>}
              {enabledTabs.includes('files') && <TabsTrigger value="files" className="rounded-none uppercase text-xs tracking-wider h-full data-[state=active]:bg-zinc-900 data-[state=active]:text-white">Arquivos</TabsTrigger>}
              {enabledTabs.includes('goals') && <TabsTrigger value="goals" className="rounded-none uppercase text-xs tracking-wider h-full data-[state=active]:bg-zinc-900 data-[state=active]:text-white">Metas</TabsTrigger>}
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-hidden relative bg-black">
          <div className="absolute inset-0 overflow-auto pr-2">
            {/* KANBAN */}
            {currentBoardType === 'kanban' && (
              <div className="flex h-full gap-4 min-w-max pb-4">
                {data.lists?.map(list => (
                  <div key={list.id} className="w-80 flex flex-col h-full bg-zinc-950 border border-zinc-900"
                       onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, list.id, 'list')}>
                    <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-black/50">
                      <span className="font-bold text-xs uppercase tracking-widest text-zinc-400">{list.title}</span>
                      <span className="text-zinc-600 text-xs font-mono">{list.tasks?.length || 0}</span>
                    </div>
                    <div className="flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar">
                      {list.tasks?.map(task => (
                        <Card key={task.id} draggable onDragStart={(e) => handleDragStart(e, task, 'task', list.id)}
                              onDragEnter={(e) => handleDragEnter(e, task.id)}
                              onClick={() => setModalState({ type: 'task', mode: 'edit', isOpen: true, data: task, listId: list.id })}
                              className={`bg-zinc-900/50 border-zinc-800 hover:border-zinc-600 cursor-grab active:cursor-grabbing rounded-none shadow-none group ${dragOverTargetId === task.id ? 'border-t-2 border-t-red-600' : ''}`}>
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">{task.title}</span>
                              {task.priority === 'high' && <div className="h-1.5 w-1.5 rounded-full bg-red-600 shrink-0" />}
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-zinc-600 uppercase tracking-wide">
                              {task.responsibleUsers?.length > 0 && <ResponsibleUsersButton users={task.responsibleUsers} />}
                              {task.endDate && <span>{new Date(task.endDate).toLocaleDateString().slice(0,5)}</span>}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      <Button variant="ghost" className="w-full border border-dashed border-zinc-900 text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900/50 rounded-none h-10 uppercase text-xs tracking-widest"
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
              <div className="max-w-4xl mx-auto space-y-8">
                {data.lists?.map(list => (
                  <div key={list.id} className="space-y-1">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-2 mb-2">{list.title}</h3>
                    <div className="bg-zinc-950 border border-zinc-900 divide-y divide-zinc-900">
                      {list.tasks?.map(task => (
                        <div key={task.id} className="p-3 flex items-center gap-4 hover:bg-zinc-900 transition-colors group">
                          <Checkbox checked={list.title === 'Concluído'} className="border-zinc-800 data-[state=checked]:bg-zinc-700 data-[state=checked]:border-zinc-700 rounded-none" />
                          <div className="flex-1 cursor-pointer" onClick={() => setModalState({ type: 'task', mode: 'edit', isOpen: true, data: task, listId: list.id })}>
                            <p className="text-sm text-zinc-300 group-hover:text-white transition-colors">{task.title}</p>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2">
                            <span className="text-[10px] uppercase text-zinc-600">{task.priority}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-600 hover:text-red-600" 
                                    onClick={() => handleTaskAction('delete', { taskId: task.id })}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button variant="ghost" className="w-full text-xs text-zinc-600 hover:text-zinc-400 justify-start h-10 px-4 uppercase tracking-widest rounded-none" onClick={() => setModalState({ type: 'task', mode: 'create', isOpen: true, data: { listId: list.id } })}>
                        <Plus className="h-3 w-3 mr-2" /> Adicionar item
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* FILES (Com Visual Monolito no Upload) */}
            {currentBoardType === 'files' && (
              <div 
                className={`space-y-6 min-h-[400px] relative transition-colors p-4 ${isFileDragging ? 'bg-zinc-900/30 border border-dashed border-red-900' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsFileDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsFileDragging(false); }}
                onDrop={handleFileDrop}
              >
                {(isFileDragging || isUploading) && (
                  <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/80 backdrop-blur-sm">
                    {isUploading ? (
                       <MonolithLoader text="UPLOADING" />
                    ) : (
                       <div className="text-center animate-bounce">
                          <Upload className="w-16 h-16 text-zinc-500 mx-auto mb-4" />
                          <p className="text-white font-black text-2xl uppercase tracking-widest">Solte os Arquivos</p>
                       </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center bg-zinc-950 p-6 border border-zinc-900">
                  <div>
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">Central de Arquivos</h3>
                    <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">Documentação e Ativos</p>
                  </div>
                  <div className="relative">
                    <Input 
                      type="file" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                      multiple 
                      onChange={handleFileUploadWithFeedback} 
                    />
                    <Button className="bg-white text-black hover:bg-zinc-300 uppercase tracking-widest text-xs font-bold rounded-none h-10 px-6">
                      <Upload className="mr-2 h-4 w-4" /> Upload
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {files?.filter(f => f.subProjectId === (currentSubProject?.id || null)).map(file => (
                    <Card key={file.id} className="bg-zinc-950 border-zinc-900 hover:border-zinc-700 transition-all group relative rounded-none aspect-square flex flex-col items-center justify-center hover:bg-zinc-900/50">
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-zinc-500 hover:text-red-600" onClick={() => handleDeleteFile(file.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                      </div>
                      <div className="mb-3 text-4xl opacity-50 group-hover:opacity-100 transition-opacity grayscale group-hover:grayscale-0">
                        {file.type?.includes('image') ? '🖼️' : file.type?.includes('pdf') ? '📄' : '📦'}
                      </div>
                      <p className="text-xs text-zinc-400 font-medium truncate w-full text-center px-2">{file.name}</p>
                      <p className="text-[9px] text-zinc-600 uppercase tracking-widest mt-1">{formatFileSize(file.size)}</p>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm gap-2">
                         <a href={file.data} download={file.name} className="text-white hover:text-red-500"><Download className="w-5 h-5"/></a>
                      </div>
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
    <div className="min-h-screen bg-black text-foreground flex flex-col font-sans selection:bg-red-900/30 selection:text-white overflow-hidden">
      {renderHeader()}
      <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8 pt-6 h-[calc(100vh-4rem)] overflow-hidden">
        <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
          {currentView === 'home' && renderHome()}
          {currentView === 'project' && renderProjectView()}
          {currentView === 'subproject' && renderBoard()}
        </div>
      </main>

      {/* MODAL GLOBAL */}
      <Dialog open={modalState.isOpen} onOpenChange={(open) => !open && setModalState({ ...modalState, isOpen: false })}>
        <DialogContent className="sm:max-w-[500px] bg-black border-zinc-800 text-zinc-100 max-h-[90vh] overflow-y-auto rounded-none shadow-[0_0_50px_rgba(0,0,0,0.8)]">
          <DialogHeader className="border-b border-zinc-900 pb-4">
            <DialogTitle className="text-xl font-black uppercase tracking-tight">
              {modalState.type === 'project' && (modalState.mode === 'create' ? 'Novo Projeto' : 'Editar Projeto')}
              {modalState.type === 'subProject' && (modalState.mode === 'create' ? 'Nova Área' : 'Editar Área')}
              {modalState.type === 'password' && 'Acesso Restrito'}
              {modalState.type === 'task' && (modalState.mode === 'edit' ? 'Editar Tarefa' : 'Nova Tarefa')}
            </DialogTitle>
          </DialogHeader>
          
          {modalState.type === 'password' ? (
            <form onSubmit={(e) => { e.preventDefault(); handlePasswordSubmit(new FormData(e.target).get('password')); }}>
              <div className="space-y-6 py-6">
                <p className="text-zinc-400 text-sm">Este conteúdo é protegido por senha.</p>
                <Input type="password" name="password" placeholder="SENHA" autoFocus className="bg-zinc-950 border-zinc-800 rounded-none h-12 text-center tracking-[0.5em] uppercase" />
                <Button type="submit" className="w-full bg-white text-black hover:bg-zinc-200 rounded-none h-12 uppercase font-bold tracking-widest">Acessar</Button>
              </div>
            </form>
          ) : (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = Object.fromEntries(new FormData(e.target));
              if (modalState.type === 'project' || modalState.type === 'subProject') handleSaveProject(formData);
              if (modalState.type === 'task') handleTaskAction('save', formData);
            }} className="space-y-6 py-6">
              
              {(modalState.type === 'project' || modalState.type === 'subProject') && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-widest text-zinc-500">Nome</Label>
                    <Input name="name" defaultValue={modalState.data?.name} required className="bg-zinc-950 border-zinc-800 rounded-none h-10 focus:border-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-widest text-zinc-500">Descrição</Label>
                    <Textarea name="description" defaultValue={modalState.data?.description} className="bg-zinc-950 border-zinc-800 rounded-none" />
                  </div>
                  
                  <div className="space-y-3 pt-2 border-t border-zinc-900">
                    <Label className="text-xs uppercase tracking-widest text-zinc-500">Visualizações</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {ALL_TABS.map(tab => (
                        <div key={tab.id} className="flex items-center space-x-3 border border-zinc-900 p-3 bg-zinc-950/50 hover:bg-zinc-900 transition-colors">
                          <Checkbox 
                            id={`view_${tab.id}`} 
                            name={`view_${tab.id}`} 
                            defaultChecked={!modalState.data || (modalState.data.enabledTabs && modalState.data.enabledTabs.includes(tab.id))}
                            className="rounded-none border-zinc-700 data-[state=checked]:bg-white data-[state=checked]:text-black"
                          />
                          <Label htmlFor={`view_${tab.id}`} className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300 uppercase tracking-wide">
                            <tab.icon className="h-3 w-3 text-zinc-500" /> {tab.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 pt-2">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-widest text-zinc-500">Cor</Label>
                      <Select name="color" defaultValue={modalState.data?.color || "blue"}>
                        <SelectTrigger className="bg-zinc-950 border-zinc-800 rounded-none h-10"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-zinc-800 rounded-none">
                          {USER_COLORS.map(c => <SelectItem key={c} value={c} className="uppercase text-xs tracking-wider">{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end pb-3 gap-2">
                      <Checkbox id="prot" name="isProtected" defaultChecked={modalState.data?.isProtected} className="rounded-none border-zinc-700" />
                      <Label htmlFor="prot" className="text-sm text-zinc-300 cursor-pointer">Proteger com Senha</Label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-widest text-zinc-500">Senha (Opcional)</Label>
                    <Input name="password" type="password" defaultValue={modalState.data?.password} className="bg-zinc-950 border-zinc-800 rounded-none h-10" />
                  </div>
                </>
              )}

              {modalState.type === 'task' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-widest text-zinc-500">Título</Label>
                    <Input name="title" defaultValue={modalState.data?.title} required className="bg-zinc-950 border-zinc-800 rounded-none h-12 text-lg font-bold" />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-widest text-zinc-500">Prioridade</Label>
                        <Select name="priority" defaultValue={modalState.data?.priority || 'medium'}>
                            <SelectTrigger className="bg-zinc-950 border-zinc-800 rounded-none"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-zinc-950 border-zinc-800 rounded-none">
                                <SelectItem value="low">BAIXA</SelectItem>
                                <SelectItem value="medium">MÉDIA</SelectItem>
                                <SelectItem value="high">ALTA</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-widest text-zinc-500">Prazo</Label>
                        <Input type="date" name="endDate" defaultValue={modalState.data?.endDate} className="bg-zinc-950 border-zinc-800 rounded-none" />
                    </div>
                  </div>
                </>
              )}

              <DialogFooter className="pt-4 border-t border-zinc-900">
                <Button type="button" variant="ghost" onClick={() => setModalState({ ...modalState, isOpen: false })} className="hover:bg-zinc-900 rounded-none uppercase text-xs tracking-widest">Cancelar</Button>
                <Button type="submit" className="bg-white text-black hover:bg-zinc-200 rounded-none uppercase text-xs font-bold tracking-widest px-8">Salvar</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default LegacyApp;
