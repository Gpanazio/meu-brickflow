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
import LegacyHeader from './components/legacy/LegacyHeader';
import LegacyHome from './components/legacy/LegacyHome';
import LegacyProjectView from './components/legacy/LegacyProjectView';
import LegacyBoard from './components/legacy/LegacyBoard';
import LegacyModal from './components/legacy/LegacyModal';

// --- COMPONENTES UI ---
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Textarea } from './components/ui/textarea';
import { Card, CardContent, CardTitle } from './components/ui/card';
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

  const currentEntity = currentSubProject || currentProject;
  const boardData = currentEntity ? getCurrentBoardData() : {};
  const entityName = currentEntity?.name || '';
  const enabledTabs = currentEntity?.enabledTabs || ['kanban'];

  return (
    <div className="min-h-screen bg-black text-foreground flex flex-col font-sans selection:bg-red-900/50 selection:text-white overflow-hidden">
      <LegacyHeader
        currentView={currentView}
        setCurrentView={setCurrentView}
        currentProject={currentProject}
        isSyncing={isSyncing}
        currentUser={currentUser}
        handleSwitchUser={handleSwitchUser}
        handleLogout={handleLogout}
      />
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
                <LegacyHome
                  currentUser={currentUser}
                  dailyPhrase={dailyPhrase}
                  megaSenaNumbers={megaSenaNumbers}
                  projects={projects}
                  setModalState={setModalState}
                  handleDragStart={handleDragStart}
                  handleDragOver={handleDragOver}
                  handleDrop={handleDrop}
                  handleAccessProject={handleAccessProject}
                  handleDeleteProject={handleDeleteProject}
                  COLOR_VARIANTS={COLOR_VARIANTS}
                />
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
                <LegacyProjectView
                  currentProject={currentProject}
                  setCurrentView={setCurrentView}
                  setModalState={setModalState}
                  handleAccessProject={handleAccessProject}
                  handleDeleteProject={handleDeleteProject}
                  COLOR_VARIANTS={COLOR_VARIANTS}
                />
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
                <LegacyBoard
                  data={boardData}
                  entityName={entityName}
                  enabledTabs={enabledTabs}
                  currentBoardType={currentBoardType}
                  setCurrentBoardType={setCurrentBoardType}
                  currentSubProject={currentSubProject}
                  currentProject={currentProject}
                  setCurrentView={setCurrentView}
                  handleDragOver={handleDragOver}
                  handleDrop={handleDrop}
                  handleDragStart={handleDragStart}
                  handleDragEnter={handleDragEnter}
                  setModalState={setModalState}
                  dragOverTargetId={dragOverTargetId}
                  handleTaskAction={handleTaskAction}
                  isFileDragging={isFileDragging}
                  setIsFileDragging={setIsFileDragging}
                  handleFileDrop={handleFileDrop}
                  isUploading={isUploading}
                  handleFileUploadWithFeedback={handleFileUploadWithFeedback}
                  files={files}
                  handleDeleteFile={handleDeleteFile}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* MODAL GLOBAL */}
      <LegacyModal
        modalState={modalState}
        setModalState={setModalState}
        handlePasswordSubmit={handlePasswordSubmit}
        handleSaveProject={handleSaveProject}
        handleTaskAction={handleTaskAction}
        USER_COLORS={USER_COLORS}
      />
    </div>
  );
}

export default LegacyApp;
