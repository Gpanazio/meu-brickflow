import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import logoImage from './assets/brickflowbranco.png';
import { debugLog } from './utils/debugLog';
import { formatFileSize } from './utils/formatFileSize';
import { absurdPhrases } from './utils/phrases';
import { supabase } from './lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

import ResponsibleUsersButton from './components/ResponsibleUsersButton';
import SudokuGame from './components/SudokuGame';
import { useFiles } from './hooks/useFiles';

// --- COMPONENTES UI ---
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Textarea } from './components/ui/textarea';
import { Card, CardContent } from './components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './components/ui/dialog';
import { Separator } from './components/ui/separator';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs';
import { Checkbox } from './components/ui/checkbox';
import { Label } from './components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from './components/ui/dropdown-menu';
import { 
  MoreVertical, Plus, ArrowLeft, LogOut, Upload, 
  Trash2, Eye, FolderOpen, Lock, RotateCcw,
  ListTodo, KanbanSquare, FileText, Goal, Sparkles, Dna
} from 'lucide-react';

// --- CONFIGURAÇÕES & CONSTANTES ---
const ALL_TABS = [
  { id: 'todo', label: 'LISTA', icon: ListTodo },
  { id: 'kanban', label: 'KANBAN', icon: KanbanSquare },
  { id: 'files', label: 'ARQUIVOS', icon: FileText },
  { id: 'goals', label: 'METAS', icon: Goal }
];

const USER_COLORS = ['blue', 'red', 'green', 'purple', 'orange', 'cyan', 'pink', 'yellow'];

const COLOR_VARIANTS = {
  blue: { bg: 'bg-blue-600', text: 'text-blue-500', border: 'border-blue-900' },
  red: { bg: 'bg-red-600', text: 'text-red-500', border: 'border-red-900' },
  green: { bg: 'bg-green-600', text: 'text-green-500', border: 'border-green-900' },
  purple: { bg: 'bg-purple-600', text: 'text-purple-500', border: 'border-purple-900' },
  orange: { bg: 'bg-orange-600', text: 'text-orange-500', border: 'border-orange-900' },
  cyan: { bg: 'bg-cyan-600', text: 'text-cyan-500', border: 'border-cyan-900' },
  pink: { bg: 'bg-pink-600', text: 'text-pink-500', border: 'border-pink-900' },
  yellow: { bg: 'bg-yellow-600', text: 'text-yellow-500', border: 'border-yellow-900' },
  zinc: { bg: 'bg-zinc-600', text: 'text-zinc-500', border: 'border-zinc-900' }
};

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
             debugLog("✅ Sync OK");
          }
        } catch (error) { 
          console.error("Erro sync:", error); 
        } finally { 
          setIsSyncing(false); 
        }
      }, 2000);
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
    if (!target) return {};
    
    if (!target.boardData) {
        return initializeBoardData()[currentBoardType];
    }
    
    return target.boardData[currentBoardType] || initializeBoardData()[currentBoardType];
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
        <Card className="w-full max-w-sm border-zinc-900 bg-black shadow-2xl rounded-none">
          <div className="p-8 space-y-6">
            <div className="text-center space-y-2">
              <img src={logoImage} alt="BrickFlow" className="h-10 w-auto mx-auto mb-4 opacity-90" />
              <h1 className="text-lg font-bold tracking-widest text-white uppercase">BrickFlow OS</h1>
              <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">Acesso Restrito</p>
            </div>
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
              <Input name="username" placeholder="ID" className="bg-zinc-950 border-zinc-800 rounded-none text-zinc-300 placeholder:text-zinc-700 h-10" required />
              <Input name="pin" type="password" placeholder="PIN" maxLength={4} className="bg-zinc-950 border-zinc-800 rounded-none text-center tracking-[0.5em] text-white placeholder:text-zinc-700 h-10" required />
              <Button type="submit" className="w-full bg-white text-black hover:bg-zinc-200 rounded-none uppercase text-xs font-bold tracking-widest h-10">Entrar</Button>
            </form>
          </div>
        </Card>
      </div>
    );
  }

  const renderHeader = () => (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-900 bg-black/95 backdrop-blur">
      <div className="container flex h-14 items-center justify-between mx-auto px-4 md:px-8">
        <div className="flex items-center gap-4">
          <div onClick={() => setCurrentView('home')} className="cursor-pointer hover:opacity-70 transition-opacity">
             <img src={logoImage} alt="BrickFlow" className="h-5 w-auto" />
          </div>
          <Separator orientation="vertical" className="h-3 bg-zinc-800" />
          <nav className="flex items-center gap-2">
            <Button variant="ghost" className={`uppercase tracking-widest text-[10px] font-bold rounded-none h-8 px-2 ${currentView === 'home' ? 'text-white' : 'text-zinc-600'}`} onClick={() => setCurrentView('home')}>Central</Button>
            {currentProject && (
              <>
                <span className="text-zinc-800">/</span>
                <Button variant="ghost" className="uppercase tracking-widest text-[10px] font-bold text-zinc-600 hover:text-white rounded-none h-8 px-2" onClick={() => setCurrentView('project')}>{currentProject.name}</Button>
              </>
            )}
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          {isSyncing && <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 rounded-none p-0 hover:bg-zinc-900">
                <Avatar className="h-5 w-5 rounded-none"><AvatarFallback className="bg-zinc-900 text-zinc-500 text-[9px] rounded-none">{currentUser?.displayName?.charAt(0)}</AvatarFallback></Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48 bg-black border-zinc-800 rounded-none shadow-xl" align="end">
              <DropdownMenuLabel className="p-3">
                <p className="text-xs font-bold text-white uppercase tracking-tight">{currentUser?.displayName}</p>
                <p className="text-[9px] text-zinc-600 font-mono tracking-widest">@{currentUser?.username}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-900" />
              <DropdownMenuItem onClick={handleSwitchUser} className="focus:bg-zinc-900 focus:text-white cursor-pointer uppercase text-[9px] tracking-widest h-8"><RotateCcw className="mr-2 h-3 w-3" /> Trocar</DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-red-900 focus:text-red-600 focus:bg-zinc-900 cursor-pointer uppercase text-[9px] tracking-widest h-8"><LogOut className="mr-2 h-3 w-3" /> Sair</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );

  const renderHome = () => (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
      
      {/* HEADER: Boas Vindas e Data */}
      <div className="border-b border-zinc-900 pb-8">
         <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight mb-2">
           Olá, <span className="text-zinc-700">{currentUser?.displayName}</span>
         </h1>
         <p className="text-[10px] text-zinc-600 font-mono tracking-widest uppercase">
           {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
         </p>
      </div>

      {/* DASHBOARD WIDGETS: Separados e Geométricos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-zinc-900 border border-zinc-900">
        
        {/* Widget Sorte do Dia - Maior Destaque */}
        <div className="md:col-span-2 bg-black p-8 flex flex-col justify-between min-h-[160px] group hover:bg-zinc-950/30 transition-colors">
           <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-3 h-3 text-red-600" />
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">Sorte do Dia</span>
           </div>
           <p className="text-lg md:text-xl text-zinc-300 font-light italic leading-relaxed">
             "{dailyPhrase}"
           </p>
        </div>

        {/* Widget Mega Sena - Lateral */}
        <div className="bg-black p-8 flex flex-col justify-between min-h-[160px] group hover:bg-zinc-950/30 transition-colors">
           <div className="flex items-center gap-2 mb-4">
              <Dna className="w-3 h-3 text-emerald-600" />
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">Probabilidade</span>
           </div>
           <div className="grid grid-cols-3 gap-2">
              {megaSenaNumbers.map(n => (
                <div key={n} className="aspect-square flex items-center justify-center border border-zinc-800 text-zinc-400 font-mono text-xs group-hover:border-emerald-900 group-hover:text-emerald-500 transition-colors cursor-default">
                  {n.toString().padStart(2, '0')}
                </div>
              ))}
           </div>
        </div>
      </div>

      {currentUser?.displayName === 'Fran' && <SudokuGame />}

      {/* LISTA DE PROJETOS */}
      <div className="space-y-4">
        <div className="flex justify-between items-end pb-2 border-b border-zinc-900">
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2">Projetos Ativos</h2>
          <Button onClick={() => setModalState({ type: 'project', mode: 'create', isOpen: true })} className="bg-white hover:bg-zinc-200 text-black h-8 px-4 text-[10px] uppercase font-bold tracking-widest rounded-none mb-2"><Plus className="mr-1 h-3 w-3" /> Novo</Button>
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 opacity-30">
            <h1 className="text-4xl font-black text-zinc-800 uppercase tracking-tighter">VAZIO</h1>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-l border-zinc-900">
            {projects.filter(p => !p.isArchived).map(project => {
              const colors = COLOR_VARIANTS[project.color || 'blue'];
              return (
                <div 
                  key={project.id} 
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, project, 'project')}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, project.id, 'project')}
                  onClick={() => handleAccessProject(project)} 
                  className="group relative aspect-video border-r border-b border-zinc-900 bg-black hover:bg-zinc-950 transition-all cursor-pointer p-6 flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start w-full">
                    <div className={`w-2 h-2 ${colors.bg}`}></div>
                    {project.isProtected && <Lock className="w-3 h-3 text-zinc-800" />}
                  </div>

                  <div className="space-y-2 relative z-10">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-none group-hover:translate-x-1 transition-transform">
                      {project.name}
                    </h3>
                    <p className="text-zinc-600 text-[10px] font-mono leading-tight line-clamp-2">
                      {project.description || "SEM DESCRIÇÃO"}
                    </p>
                  </div>

                  <div className="flex justify-between items-end opacity-40 group-hover:opacity-100 transition-opacity">
                     <span className="text-[9px] text-zinc-700 font-mono uppercase tracking-widest">{project.subProjects?.length || 0} ÁREAS</span>
                     
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-800 hover:text-white rounded-none"><MoreVertical className="h-3 w-3" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-black border-zinc-800 rounded-none">
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); setModalState({ type: 'project', mode: 'edit', isOpen: true, data: project }); }} className="text-[10px] uppercase tracking-widest h-8 cursor-pointer">Editar</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-900 focus:text-red-600 focus:bg-zinc-900 text-[10px] uppercase tracking-widest cursor-pointer h-8" onClick={e => { e.stopPropagation(); handleDeleteProject(project); }}>Eliminar</DropdownMenuItem>
                        </DropdownMenuContent>
                     </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const renderProjectView = () => (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col gap-6 border-b border-zinc-900 pb-6">
        <div className="flex justify-between items-center">
           <Button variant="outline" onClick={() => setCurrentView('home')} className="border-zinc-800 bg-black hover:bg-zinc-900 text-zinc-500 hover:text-white rounded-none h-8 px-3 uppercase text-[10px] tracking-widest"><ArrowLeft className="mr-2 h-3 w-3" /> Voltar</Button>
           <Button onClick={() => setModalState({ type: 'subProject', mode: 'create', isOpen: true })} className="bg-white hover:bg-zinc-200 text-black rounded-none uppercase text-[10px] font-bold tracking-widest h-8 px-4"><Plus className="mr-2 h-3 w-3" /> Nova Área</Button>
        </div>
        
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            {currentProject.name} 
            {currentProject.isProtected && <Lock className="h-6 w-6 text-zinc-800"/>}
          </h1>
          <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest mt-2">{currentProject.description}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-900 border border-zinc-900">
        {currentProject.subProjects?.filter(s => !s.isArchived).map(sub => {
          const colors = COLOR_VARIANTS[sub.color || 'zinc'];
          return (
            <div key={sub.id} onClick={() => handleAccessProject(sub, 'subproject')} className="group cursor-pointer bg-black hover:bg-zinc-950 transition-colors p-6 flex flex-col justify-between h-48">
              <div className="flex justify-between items-start">
                 <FolderOpen className={`h-5 w-5 ${colors.text} opacity-50 group-hover:opacity-100 transition-opacity`} />
                 <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-800 hover:text-white rounded-none"><MoreVertical className="h-3 w-3" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-black border-zinc-800 rounded-none">
                    <DropdownMenuItem onClick={e => { e.stopPropagation(); setModalState({ type: 'subProject', mode: 'edit', isOpen: true, data: sub }); }} className="text-[10px] uppercase tracking-widest h-8 cursor-pointer">Editar</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-900 focus:text-red-600 text-[10px] uppercase tracking-widest h-8 cursor-pointer" onClick={e => { e.stopPropagation(); handleDeleteProject(sub, true); }}>Excluir</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div>
                 <CardTitle className="text-lg font-bold uppercase tracking-tight text-white mb-1">{sub.name}</CardTitle>
                 <span className="text-zinc-600 text-[9px] font-mono uppercase tracking-widest line-clamp-1">{sub.description || "---"}</span>
              </div>
            </div>
          );
        })}
        <div 
          onClick={() => setModalState({ type: 'subProject', mode: 'create', isOpen: true })}
          className="bg-black flex flex-col items-center justify-center cursor-pointer group hover:bg-zinc-900/30 transition-colors h-48"
        >
          <Plus className="h-6 w-6 text-zinc-800 group-hover:text-zinc-500 mb-2 transition-colors" />
          <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-800 group-hover:text-zinc-500">Adicionar</span>
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
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-zinc-900 pb-4 gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setCurrentView(currentSubProject ? 'project' : 'home')} className="text-zinc-500 hover:text-white uppercase text-[10px] tracking-widest rounded-none px-0"><ArrowLeft className="mr-2 h-3 w-3" /> Voltar</Button>
            <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">{entityName}</h2>
          </div>
          <Tabs value={currentBoardType} onValueChange={setCurrentBoardType}>
            <TabsList className="bg-transparent border-b border-transparent rounded-none h-8 p-0 gap-4">
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
              <div className="flex h-full gap-0 border-l border-zinc-900 min-w-max">
                {data.lists ? data.lists.map(list => (
                  <div key={list.id} className="w-72 flex flex-col h-full bg-black border-r border-zinc-900"
                       onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, list.id, 'list')}>
                    <div className="p-4 border-b border-zinc-900 flex justify-between items-center">
                      <span className="font-bold text-[10px] uppercase tracking-[0.2em] text-zinc-500">{list.title}</span>
                      <span className="text-zinc-700 text-[10px] font-mono">{list.tasks?.length.toString().padStart(2, '0') || '00'}</span>
                    </div>
                    <div className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar bg-black">
                      {list.tasks?.map(task => (
                        <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task, 'task', list.id)}
                              onDragEnter={(e) => handleDragEnter(e, task.id)}
                              onClick={() => setModalState({ type: 'task', mode: 'edit', isOpen: true, data: task, listId: list.id })}
                              className={`bg-zinc-950 border border-zinc-900 hover:border-zinc-700 cursor-grab active:cursor-grabbing p-4 group transition-all ${dragOverTargetId === task.id ? 'border-t-2 border-t-red-600' : ''}`}>
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-xs font-bold text-zinc-300 group-hover:text-white transition-colors uppercase leading-tight">{task.title}</span>
                              {task.priority === 'high' && <div className="h-1 w-1 bg-red-600 shrink-0" />}
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-zinc-900/50 mt-2">
                              {task.responsibleUsers?.length > 0 && <ResponsibleUsersButton users={task.responsibleUsers} />}
                              {task.endDate && <span className="text-[9px] text-zinc-600 font-mono">{new Date(task.endDate).toLocaleDateString().slice(0,5)}</span>}
                            </div>
                        </div>
                      ))}
                      <Button variant="ghost" className="w-full border border-dashed border-zinc-900 text-zinc-700 hover:text-white hover:bg-zinc-950 rounded-none h-10 uppercase text-[9px] tracking-widest"
                        onClick={() => setModalState({ type: 'task', mode: 'create', isOpen: true, data: { listId: list.id } })}>
                        <Plus className="h-3 w-3 mr-2" /> Adicionar
                      </Button>
                    </div>
                  </div>
                )) : <div className="p-8 text-zinc-500 text-xs">Nenhum dado encontrado para este quadro.</div>}
              </div>
            )}

            {/* TODO LIST */}
            {currentBoardType === 'todo' && (
              <div className="max-w-4xl mx-auto space-y-8">
                {data.lists ? data.lists.map(list => (
                  <div key={list.id} className="space-y-0">
                    <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em] mb-2 pl-4 border-l-2 border-red-600">{list.title}</h3>
                    <div className="bg-black border-t border-zinc-900">
                      {list.tasks?.map(task => (
                        <div key={task.id} className="p-3 flex items-center gap-4 border-b border-zinc-900 hover:bg-zinc-950/50 transition-colors group">
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
                      <Button variant="ghost" className="w-full text-[10px] text-zinc-600 hover:text-white justify-start h-10 px-4 uppercase tracking-widest rounded-none hover:bg-zinc-950" onClick={() => setModalState({ type: 'task', mode: 'create', isOpen: true, data: { listId: list.id } })}>
                        <Plus className="h-3 w-3 mr-2" /> Inserir Dados
                      </Button>
                    </div>
                  </div>
                )) : <div className="p-8 text-zinc-500 text-xs">Lista não inicializada.</div>}
              </div>
            )}

            {/* FILES */}
            {currentBoardType === 'files' && (
              <div 
                className={`min-h-[400px] relative transition-all duration-300 p-0 ${isFileDragging ? 'bg-zinc-950 border-2 border-dashed border-red-900' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsFileDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsFileDragging(false); }}
                onDrop={handleFileDrop}
              >
                {(isFileDragging || isUploading) && (
                  <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/90 backdrop-blur-sm">
                    {isUploading ? (
                       <div className="animate-pulse text-white text-xs uppercase tracking-widest">Carregando...</div>
                    ) : (
                       <div className="text-center animate-pulse">
                          <Upload className="w-8 h-8 text-white mx-auto mb-4" />
                          <p className="text-white font-mono text-xs uppercase tracking-[0.5em]">Solte para Upload</p>
                       </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center bg-zinc-950 p-6 border-b border-zinc-900 mb-6">
                  <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">Arquivos</h3>
                  </div>
                  <div className="relative">
                    <Input 
                      type="file" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                      multiple 
                      onChange={handleFileUploadWithFeedback} 
                    />
                    <Button className="bg-white text-black hover:bg-zinc-200 uppercase tracking-widest text-[10px] font-bold rounded-none h-10 px-6">
                      <Upload className="mr-2 h-4 w-4" /> Upload
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-px bg-zinc-900 border border-zinc-900">
                  {files?.filter(f => f.subProjectId === (currentSubProject?.id || null)).map(file => (
                    <div key={file.id} className="bg-black hover:bg-zinc-950 transition-all group relative aspect-square flex flex-col items-center justify-center p-4">
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-zinc-600 hover:text-red-600 rounded-none" onClick={() => handleDeleteFile(file.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                      </div>
                      <div className="mb-3 opacity-50 group-hover:opacity-100 transition-opacity">
                        {file.type?.includes('image') ? <Eye className="w-6 h-6 text-white"/> : <FileText className="w-6 h-6 text-white"/>}
                      </div>
                      <p className="text-[10px] text-zinc-500 font-mono truncate w-full text-center group-hover:text-white transition-colors">{file.name}</p>
                      <p className="text-[8px] text-zinc-700 uppercase tracking-widest mt-1">{formatFileSize(file.size)}</p>
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {renderHome()}
              </motion.div>
            )}
            {currentView === 'project' && (
              <motion.div 
                key="project"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
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
                transition={{ duration: 0.2 }}
              >
                {renderBoard()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* MODAL GLOBAL */}
      <Dialog open={modalState.isOpen} onOpenChange={(open) => !open && setModalState({ ...modalState, isOpen: false })}>
        <DialogContent className="sm:max-w-[400px] bg-black border border-zinc-800 text-zinc-100 p-0 gap-0 shadow-2xl rounded-none">
          <DialogHeader className="p-6 border-b border-zinc-900">
            <DialogTitle className="text-lg font-black uppercase tracking-tight">
              {modalState.type === 'project' && (modalState.mode === 'create' ? 'Novo Projeto' : 'Configurar')}
              {modalState.type === 'subProject' && (modalState.mode === 'create' ? 'Nova Área' : 'Editar Área')}
              {modalState.type === 'password' && 'Acesso Restrito'}
              {modalState.type === 'task' && (modalState.mode === 'edit' ? 'Editar' : 'Novo Item')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-6">
            {modalState.type === 'password' ? (
              <form onSubmit={(e) => { e.preventDefault(); handlePasswordSubmit(new FormData(e.target).get('password')); }}>
                <div className="space-y-4">
                  <Input type="password" name="password" placeholder="SENHA" autoFocus className="bg-zinc-950 border-zinc-800 rounded-none h-12 text-center text-lg tracking-[0.5em] uppercase focus:border-white text-white placeholder:text-zinc-800" />
                  <Button type="submit" className="w-full bg-white text-black hover:bg-zinc-200 rounded-none h-12 uppercase font-bold tracking-widest text-xs">Entrar</Button>
                </div>
              </form>
            ) : (
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = Object.fromEntries(new FormData(e.target));
                if (modalState.type === 'project' || modalState.type === 'subProject') handleSaveProject(formData);
                if (modalState.type === 'task') handleTaskAction('save', formData);
              }} className="space-y-4">
                
                {(modalState.type === 'project' || modalState.type === 'subProject') && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Nome</Label>
                      <Input name="name" defaultValue={modalState.data?.name} required className="bg-zinc-950 border-zinc-800 rounded-none h-10 focus:border-white text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Descrição</Label>
                      <Textarea name="description" defaultValue={modalState.data?.description} className="bg-zinc-950 border-zinc-800 rounded-none min-h-[80px] text-zinc-300 focus:border-white" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Cor</Label>
                        <Select name="color" defaultValue={modalState.data?.color || "blue"}>
                          <SelectTrigger className="bg-zinc-950 border-zinc-800 rounded-none h-10"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-black border-zinc-800 rounded-none">
                            {USER_COLORS.map(c => <SelectItem key={c} value={c} className="uppercase text-[10px] tracking-widest cursor-pointer">{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end pb-3 gap-3">
                        <Checkbox id="prot" name="isProtected" defaultChecked={modalState.data?.isProtected} className="rounded-none border-zinc-700" />
                        <Label htmlFor="prot" className="text-[10px] text-zinc-400 cursor-pointer uppercase tracking-widest">Senha</Label>
                      </div>
                    </div>
                    {modalState.data?.isProtected && (
                       <Input name="password" type="password" defaultValue={modalState.data?.password} placeholder="Senha do projeto" className="bg-zinc-950 border-zinc-800 rounded-none h-10" />
                    )}
                  </>
                )}

                {modalState.type === 'task' && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Título</Label>
                      <Input name="title" defaultValue={modalState.data?.title} required className="bg-zinc-950 border-zinc-800 rounded-none h-12 text-base font-bold text-white focus:border-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Prioridade</Label>
                          <Select name="priority" defaultValue={modalState.data?.priority || 'medium'}>
                              <SelectTrigger className="bg-zinc-950 border-zinc-800 rounded-none h-10 text-xs uppercase"><SelectValue /></SelectTrigger>
                              <SelectContent className="bg-black border-zinc-800 rounded-none">
                                  <SelectItem value="low" className="text-[10px]">Baixa</SelectItem>
                                  <SelectItem value="medium" className="text-[10px]">Média</SelectItem>
                                  <SelectItem value="high" className="text-[10px] text-red-500">Alta</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Data</Label>
                          <Input type="date" name="endDate" defaultValue={modalState.data?.endDate} className="bg-zinc-950 border-zinc-800 rounded-none h-10 text-xs uppercase text-zinc-300" />
                      </div>
                    </div>
                  </>
                )}

                <DialogFooter className="pt-6 border-t border-zinc-900 gap-2">
                  <Button type="button" variant="ghost" onClick={() => setModalState({ ...modalState, isOpen: false })} className="hover:bg-zinc-900 hover:text-white text-zinc-500 rounded-none uppercase text-[10px] tracking-widest h-10 px-4">Cancelar</Button>
                  <Button type="submit" className="bg-white text-black hover:bg-zinc-200 rounded-none uppercase text-[10px] font-bold tracking-widest h-10 px-6">Salvar</Button>
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
