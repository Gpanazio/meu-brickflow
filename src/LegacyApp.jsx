import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import logoImage from './assets/brickflowbranco.png';
import { debugLog } from './utils/debugLog';
import { formatFileSize } from './utils/formatFileSize';
import ResponsibleUsersButton from './components/ResponsibleUsersButton';
import SudokuGame from './components/SudokuGame';
import { useFiles } from './hooks/useFiles';

// Importando componentes Shadcn UI (Visual Brutal)
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Textarea } from './components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './components/ui/dialog';
import { Badge } from './components/ui/badge';
import { ScrollArea } from './components/ui/scroll-area';
import { Separator } from './components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs';
import { Checkbox } from './components/ui/checkbox';
import { Label } from './components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './components/ui/dropdown-menu';
import { Settings, MoreVertical, Plus, ArrowLeft, LogOut, Upload, FileText, Trash2, Download, Eye, Calendar as CalendarIcon, CheckSquare } from 'lucide-react';

// --- CONFIGURAÇÕES E DADOS ESTÁTICOS ---
const DEFAULT_TABS = ['todo', 'kanban', 'files', 'goals'];
const USER_COLORS = ['blue', 'red', 'green', 'purple', 'orange', 'cyan', 'pink', 'yellow'];
const AVATAR_OPTIONS = ['👨‍💼', '👩‍💼', '👨‍💻', '👩‍💻', '🚀', '⭐', '🎯', 'Zw', 'Px', 'Tx'];

// Função auxiliar para gerar IDs únicos
const generateId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

function LegacyApp() {
  // --- ESTADOS DO USUÁRIO ---
  const [currentUser, setCurrentUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [allUsers, setAllUsers] = useState([]);

  // --- ESTADOS DO SISTEMA ---
  const [projects, setProjects] = useState([]);
  const [currentView, setCurrentView] = useState('home');
  const [currentProject, setCurrentProject] = useState(null);
  const [currentSubProject, setCurrentSubProject] = useState(null);
  const [currentBoardType, setCurrentBoardType] = useState('kanban');
  
  // --- ESTADOS DE UI/MODAIS ---
  const [modalState, setModalState] = useState({
    type: null, // 'newProject', 'editProject', 'newSubProject', 'password', 'task', 'preview'
    isOpen: false,
    data: null // Dados temporários para edição ou contexto
  });

  // --- ESTADOS DE DRAG & DROP ---
  const [dragState, setDragState] = useState({
    isDragging: false,
    item: null,
    sourceId: null,
    type: null // 'project', 'subProject', 'task'
  });

  // Configuração Supabase
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Hook de Arquivos
  const { files, handleFileUpload: originalHandleFileUpload } = useFiles(
    currentProject,
    currentSubProject,
    currentUser || {}
  );

  // --- EFEITOS DE INICIALIZAÇÃO ---
  useEffect(() => {
    const savedUser = localStorage.getItem('brickflow-current-user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setCurrentUser(userData);
      setIsLoggedIn(true);
      loadUserProjects(userData.userKey);
    } else {
      setShowLoginModal(true);
    }
    loadAllUsers();
  }, []);

  // --- FUNÇÕES DE CARREGAMENTO DE DADOS ---
  const loadAllUsers = async () => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/brickflow_users`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      if (response.ok) setAllUsers(await response.json());
    } catch (error) { debugLog('Erro ao carregar usuários', error); }
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
    
    // Fallback LocalStorage
    const saved = localStorage.getItem(`brickflow-projects-${userKey}`);
    if (saved) setProjects(JSON.parse(saved));
  };

  // Persistência automática
  useEffect(() => {
    if (projects.length > 0 && isLoggedIn && currentUser) {
      localStorage.setItem(`brickflow-projects-${currentUser.userKey}`, JSON.stringify(projects));
      // Aqui iria a lógica de debounce para salvar no Supabase
    }
  }, [projects, isLoggedIn, currentUser]);

  // --- HELPERS DE LÓGICA DE NEGÓCIO ---
  
  const updateProjectsState = (newData) => {
    setProjects(newData);
  };

  const getCurrentBoardData = () => {
    const target = currentView === 'subproject' ? currentSubProject : currentProject;
    return target?.boardData?.[currentBoardType] || {};
  };

  const getBreadcrumbs = () => {
    const parts = [];
    if (currentProject) parts.push(currentProject.name);
    if (currentSubProject) parts.push(currentSubProject.name);
    return parts.join(' / ');
  };

  // --- HANDLERS DE AÇÃO ---

  const handleCreateProject = (formData) => {
    const newProject = {
      id: generateId('proj'),
      ...formData,
      subProjects: [],
      createdAt: new Date().toISOString(),
      createdBy: currentUser.userKey,
      enabledTabs: [...DEFAULT_TABS],
      boardData: initializeBoardData()
    };
    updateProjectsState([...projects, newProject]);
    setModalState({ isOpen: false, type: null, data: null });
  };

  const initializeBoardData = () => ({
    todo: { lists: [{ id: 'l1', title: 'A Fazer', tasks: [] }, { id: 'l2', title: 'Fazendo', tasks: [] }, { id: 'l3', title: 'Feito', tasks: [] }] },
    kanban: { lists: [{ id: 'k1', title: 'Backlog', tasks: [] }, { id: 'k2', title: 'Em Progresso', tasks: [] }, { id: 'k3', title: 'Concluído', tasks: [] }] },
    timeline: { periods: [{ id: 'p1', title: 'Q1', tasks: [] }] },
    goals: { objectives: [] }
  });

  const handleTaskSubmit = (taskData) => {
    const target = currentView === 'subproject' ? currentSubProject : currentProject;
    const isEdit = !!modalState.data?.task;
    
    // Lógica simplificada de atualização imutável
    const updatedProjects = projects.map(p => {
      if (p.id !== (currentProject?.id || target.id)) return p;
      
      const updateEntity = (entity) => {
        const board = entity.boardData[currentBoardType];
        
        // Exemplo para Lists (Todo/Kanban)
        if (board.lists) {
          if (isEdit) {
             board.lists = board.lists.map(l => ({
               ...l,
               tasks: l.tasks.map(t => t.id === modalState.data.task.id ? { ...t, ...taskData } : t)
             }));
          } else {
            const listId = modalState.data?.listId || board.lists[0].id;
            board.lists = board.lists.map(l => l.id === listId ? { ...l, tasks: [...l.tasks, { id: generateId('task'), ...taskData }] } : l);
          }
        }
        return entity;
      };

      if (currentView === 'subproject') {
        return { ...p, subProjects: p.subProjects.map(sp => sp.id === currentSubProject.id ? updateEntity(sp) : sp) };
      }
      return updateEntity(p);
    });

    updateProjectsState(updatedProjects);
    
    // Atualizar referencias locais para forçar re-render se necessário
    if (currentView === 'subproject') {
        const proj = updatedProjects.find(p => p.id === currentProject.id);
        const sub = proj.subProjects.find(s => s.id === currentSubProject.id);
        setCurrentSubProject(sub);
    } else if (currentView === 'project') {
        setCurrentProject(updatedProjects.find(p => p.id === currentProject.id));
    }

    setModalState({ isOpen: false, type: null });
  };

  // --- RENDERIZADORES DE UI (COMPONENTIZAÇÃO INTERNA) ---

  // 1. Renderização da Tela Inicial (Grid de Projetos)
  const renderHome = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Dashboard</h2>
          <p className="text-zinc-400">Gerencie seus projetos e metas estratégicas.</p>
        </div>
        <Button 
          onClick={() => setModalState({ type: 'newProject', isOpen: true })} 
          className="bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_-5px_rgba(220,38,38,0.5)]"
        >
          <Plus className="mr-2 h-4 w-4" /> Novo Projeto
        </Button>
      </div>

      {/* Grid de Projetos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.filter(p => !p.isArchived).map(project => (
          <Card 
            key={project.id}
            onClick={() => { setCurrentProject(project); setCurrentView('project'); }}
            className="glass-panel hover-glow cursor-pointer group relative overflow-hidden border-zinc-800 bg-zinc-900/50"
          >
            {/* Faixa de cor decorativa */}
            <div className={`absolute top-0 left-0 w-1 h-full bg-${project.color}-500 opacity-80 group-hover:opacity-100 transition-opacity`} />
            
            <CardHeader className="pl-6">
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl text-zinc-100 group-hover:text-primary transition-colors">
                  {project.name}
                </CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); /* Edit logic */ }}>Editar</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-500" onClick={(e) => { e.stopPropagation(); /* Delete logic */ }}>Excluir</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardDescription className="line-clamp-2 text-zinc-400">
                {project.description || "Sem descrição definida."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 text-xs text-zinc-500">
                <Badge variant="outline" className="bg-zinc-950/50 border-zinc-800">
                  {project.subProjects?.length || 0} Sub-projetos
                </Badge>
                {project.isProtected && <Badge variant="secondary" className="bg-yellow-900/20 text-yellow-500 border-yellow-900/50">Protegido</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
        {projects.length === 0 && (
          <div className="col-span-full py-20 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
            <p>Nenhum projeto encontrado. Crie o primeiro para começar.</p>
          </div>
        )}
      </div>
      
      {/* Minhas Tarefas (Resumo) */}
      <div className="mt-12">
        <h3 className="text-xl font-semibold mb-4 text-zinc-200">Minhas Tarefas Recentes</h3>
        <Card className="bg-zinc-900/30 border-zinc-800">
           <CardContent className="p-0">
             {/* Lista de tarefas simulada ou real usando getUserTasks() */}
             <div className="p-6 text-center text-zinc-500">
                <CheckSquare className="mx-auto h-8 w-8 mb-2 opacity-20" />
                <p>Você está em dia com suas tarefas.</p>
             </div>
           </CardContent>
        </Card>
      </div>
    </div>
  );

  // 2. Renderização da Visão do Projeto (Subprojetos)
  const renderProjectView = () => (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      <div className="flex items-center gap-4 border-b border-zinc-800 pb-6">
        <Button variant="ghost" size="icon" onClick={() => setCurrentView('home')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-white">{currentProject.name}</h1>
          <p className="text-zinc-400">{currentProject.description}</p>
        </div>
        <div className="ml-auto flex gap-2">
           <Button variant="outline" className="border-zinc-700 bg-zinc-900/50" onClick={() => { setCurrentSubProject(null); setCurrentBoardType('kanban'); setCurrentView('subproject'); }}>
             Acessar Quadro Principal
           </Button>
           <Button onClick={() => setModalState({ type: 'newSubProject', isOpen: true })}>
             <Plus className="mr-2 h-4 w-4" /> Sub-projeto
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentProject.subProjects?.filter(s => !s.isArchived).map(sub => (
          <Card 
            key={sub.id}
            onClick={() => { setCurrentSubProject(sub); setCurrentView('subproject'); }}
            className="group cursor-pointer bg-zinc-900/40 border-zinc-800 hover:border-primary/40 transition-all hover:-translate-y-1"
          >
            <CardHeader>
              <CardTitle className="text-lg">{sub.name}</CardTitle>
              <CardDescription>{sub.description}</CardDescription>
            </CardHeader>
            <CardFooter>
               <Badge variant="secondary" className="text-xs bg-zinc-800 text-zinc-400">
                 {/* Stats logic could go here */}
                 Acessar Área
               </Badge>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );

  // 3. Renderização do Quadro (Kanban/Todo/Files)
  const renderBoard = () => {
    const data = getCurrentBoardData();
    const entityName = currentSubProject ? currentSubProject.name : currentProject.name;

    return (
      <div className="h-[calc(100vh-140px)] flex flex-col animate-in fade-in duration-300">
        {/* Header do Quadro */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setCurrentView(currentSubProject ? 'project' : 'home')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span className="text-zinc-500 font-normal text-lg">{currentSubProject ? currentProject.name + ' /' : ''}</span>
              {entityName}
            </h2>
          </div>
          
          <Tabs value={currentBoardType} onValueChange={setCurrentBoardType} className="w-auto">
            <TabsList className="bg-zinc-900 border border-zinc-800">
              <TabsTrigger value="todo">Lista</TabsTrigger>
              <TabsTrigger value="kanban">Kanban</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="files">Arquivos</TabsTrigger>
              <TabsTrigger value="goals">Metas</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Separator className="bg-zinc-800 mb-6" />

        {/* Conteúdo do Quadro */}
        <ScrollArea className="flex-1 bg-zinc-950/30 rounded-xl border border-zinc-800/50 p-4">
          
          {/* Exibição KANBAN */}
          {currentBoardType === 'kanban' && (
            <div className="flex gap-6 h-full min-w-max pb-4">
              {data.lists?.map(list => (
                <div key={list.id} className="w-80 flex flex-col gap-3">
                  <div className="flex justify-between items-center px-2">
                    <span className="font-semibold text-zinc-300">{list.title}</span>
                    <Badge variant="outline" className="text-zinc-500 border-zinc-700">{list.tasks?.length || 0}</Badge>
                  </div>
                  <div className="flex-1 bg-zinc-900/20 rounded-lg p-2 flex flex-col gap-2 min-h-[200px] border border-dashed border-zinc-800/50">
                    {list.tasks?.map(task => (
                      <Card 
                        key={task.id} 
                        className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 cursor-grab active:cursor-grabbing shadow-sm"
                        onClick={() => setModalState({ type: 'task', isOpen: true, data: { task, listId: list.id } })}
                      >
                        <CardContent className="p-3 space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-sm font-medium leading-snug text-zinc-200">{task.title}</span>
                            {task.priority === 'high' && <div className="h-2 w-2 rounded-full bg-red-500 shrink-0 mt-1" />}
                          </div>
                          {task.responsibleUsers?.length > 0 && (
                            <ResponsibleUsersButton users={task.responsibleUsers} />
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    <Button 
                      variant="ghost" 
                      className="w-full text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 border border-transparent hover:border-zinc-800 border-dashed"
                      onClick={() => setModalState({ type: 'task', isOpen: true, data: { listId: list.id } })}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Adicionar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Exibição ARQUIVOS */}
          {currentBoardType === 'files' && (
            <div className="space-y-4">
              <div className="flex justify-between">
                <h3 className="text-lg font-medium">Arquivos do Projeto</h3>
                <label>
                  <Button asChild>
                    <span><Upload className="mr-2 h-4 w-4" /> Upload</span>
                  </Button>
                  <Input type="file" className="hidden" multiple onChange={originalHandleFileUpload} />
                </label>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {files?.filter(f => f.subProjectId === (currentSubProject?.id || null)).map(file => (
                  <Card key={file.id} className="group bg-zinc-900 border-zinc-800 hover:bg-zinc-800/80 transition-colors">
                    <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-zinc-950 flex items-center justify-center text-2xl">
                        {file.type?.includes('image') ? '🖼️' : '📄'}
                      </div>
                      <div className="w-full overflow-hidden">
                        <p className="text-sm font-medium truncate w-full" title={file.name}>{file.name}</p>
                        <p className="text-xs text-zinc-500">{formatFileSize(file.size)}</p>
                      </div>
                      <div className="flex gap-1 w-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-7 w-7"><Eye className="h-3 w-3" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7"><Download className="h-3 w-3" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Fallback para outras views */}
          {['todo', 'timeline', 'goals'].includes(currentBoardType) && (
             <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
               <p>Visualização {currentBoardType} sendo migrada para o novo design system.</p>
             </div>
          )}
        </ScrollArea>
      </div>
    );
  };

  // --- RENDER PRINCIPAL DO APP ---

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-black bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]">
        <Card className="w-full max-w-md border-zinc-800 bg-zinc-900/80 backdrop-blur-md shadow-2xl">
          <CardHeader className="text-center pb-2">
            <img src={logoImage} alt="BrickFlow" className="h-12 mx-auto mb-4 object-contain" />
            <CardTitle className="text-2xl">Bem-vindo de volta</CardTitle>
            <CardDescription>Acesse o sistema operacional da sua equipe.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              // Lógica de login simulada
              const mockUser = allUsers.find(u => u.username === formData.get('username') && u.pin === formData.get('pin'));
              if (mockUser) {
                 const user = { ...mockUser, userKey: `${mockUser.username}-${mockUser.pin}` };
                 setCurrentUser(user);
                 setIsLoggedIn(true);
                 localStorage.setItem('brickflow-current-user', JSON.stringify(user));
                 loadUserProjects(user.userKey);
              } else {
                 alert("Credenciais inválidas");
              }
            }}>
              <div className="space-y-2">
                <Label htmlFor="username">Usuário</Label>
                <Input id="username" name="username" placeholder="Ex: JOAO" required className="bg-zinc-950 border-zinc-700" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pin">PIN</Label>
                <Input id="pin" name="pin" type="password" placeholder="••••" maxLength={4} required className="bg-zinc-950 border-zinc-700" />
              </div>
              <Button type="submit" className="w-full mt-4 bg-primary hover:bg-primary/90">Entrar</Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center border-t border-zinc-800 pt-4">
            <Button variant="link" className="text-zinc-400" onClick={() => setShowCreateUserModal(true)}>
              Primeiro acesso? Criar conta
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-red-500/20">
      
      {/* HEADER GLOBAL */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between mx-auto px-4 md:px-8">
          <div className="flex items-center gap-4">
            <img src={logoImage} alt="Logo" className="h-8 w-auto" />
            <Separator orientation="vertical" className="h-6 bg-zinc-700" />
            <nav className="flex items-center gap-4 text-sm font-medium text-zinc-400">
              <span className={currentView === 'home' ? "text-white" : "hover:text-white cursor-pointer"} onClick={() => setCurrentView('home')}>Home</span>
              {currentProject && <span>/ {currentProject.name}</span>}
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-zinc-900 rounded-full border border-zinc-800">
              <Avatar className="h-6 w-6">
                <AvatarFallback>{currentUser?.avatar || 'U'}</AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium">{currentUser?.displayName}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => { setIsLoggedIn(false); localStorage.removeItem('brickflow-current-user'); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 container mx-auto p-4 md:p-8 pt-6">
        {currentView === 'home' && renderHome()}
        {currentView === 'project' && renderProjectView()}
        {currentView === 'subproject' && renderBoard()}
      </main>

      {/* MODAL DE CRIAÇÃO DE PROJETO (Exemplo de uso do Dialog do Shadcn) */}
      <Dialog open={modalState.type === 'newProject' && modalState.isOpen} onOpenChange={(open) => !open && setModalState({ ...modalState, isOpen: false })}>
        <DialogContent className="sm:max-w-[425px] bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle>Criar Novo Projeto</DialogTitle>
            <DialogDescription>Configure os detalhes do projeto principal.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            handleCreateProject(Object.fromEntries(formData));
          }} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input name="name" required className="bg-zinc-950 border-zinc-700" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea name="description" className="bg-zinc-950 border-zinc-700" />
            </div>
            <div className="space-y-2">
              <Label>Cor de Identificação</Label>
              <Select name="color" defaultValue="blue">
                <SelectTrigger className="bg-zinc-950 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {USER_COLORS.map(c => <SelectItem key={c} value={c}>{c.toUpperCase()}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit">Criar Projeto</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DE TAREFA (Simplificado) */}
      <Dialog open={modalState.type === 'task' && modalState.isOpen} onOpenChange={(open) => !open && setModalState({ ...modalState, isOpen: false })}>
        <DialogContent className="bg-zinc-900 border-zinc-800 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{modalState.data?.task ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleTaskSubmit(Object.fromEntries(new FormData(e.target)));
          }} className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input name="title" defaultValue={modalState.data?.task?.title} required className="bg-zinc-950" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <Select name="priority" defaultValue={modalState.data?.task?.priority || 'medium'}>
                        <SelectTrigger className="bg-zinc-950"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-zinc-900">
                            <SelectItem value="low">Baixa</SelectItem>
                            <SelectItem value="medium">Média</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Prazo</Label>
                    <Input type="date" name="endDate" defaultValue={modalState.data?.task?.endDate} className="bg-zinc-950" />
                </div>
            </div>
            <DialogFooter>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default LegacyApp;
