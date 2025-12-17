import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import logoImage from './assets/brickflowbranco.png';
import { debugLog } from './utils/debugLog';
import { formatFileSize } from './utils/formatFileSize';
import ResponsibleUsersButton from './components/ResponsibleUsersButton';
import SudokuGame from './components/SudokuGame';
import { useFiles } from './hooks/useFiles';

// --- COMPONENTES SHADCN UI (VISUAL BRUTAL) ---
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
  Trash2, Download, Eye, CheckSquare, LayoutGrid, 
  FolderOpen, Calendar, Target, FileText, Lock, Unlock, Sparkles, Dna
} from 'lucide-react';

// --- CONFIGURAÇÕES E DADOS ---
const DEFAULT_TABS = ['todo', 'kanban', 'files', 'goals'];
const USER_COLORS = ['blue', 'red', 'green', 'purple', 'orange', 'cyan', 'pink', 'yellow'];
const AVATAR_OPTIONS = ['👨‍💼', '👩‍💼', '👨‍💻', '👩‍💻', '🚀', '⭐', '🎯', '🦁', '🤖', '💀'];

// Frases absurdas para "Sorte do dia"
const absurdPhrases = [
  "Hoje é um ótimo dia para conversar com suas plantas sobre seus planos de carreira.",
  "Lembre-se: o sucesso é como uma pizza de abacaxi - controverso, mas alguns adoram.",
  "Sua produtividade hoje será proporcional ao número de vezes que você piscar com o olho esquerdo.",
  "O universo conspira a seu favor, especialmente se você usar meias de cores diferentes.",
  "Hoje você descobrirá que a resposta para todos os seus problemas está no manual de instruções do micro-ondas.",
  "Sua energia positiva hoje atrairá oportunidades como um ímã atrai clipes de papel perdidos.",
  "Lembre-se: cada tarefa concluída é um passo mais próximo de se tornar um ninja de escritório.",
  "O segredo do sucesso hoje é fingir que você entende o que está fazendo até realmente entender.",
  "Sua criatividade hoje fluirá como ketchup numa garrafa nova - devagar, mas com força total.",
  "Hoje é o dia perfeito para reorganizar sua mesa como se fosse um altar sagrado da produtividade.",
  "Lembre-se: você é como um café expresso - pequeno, mas com energia suficiente para mover montanhas.",
  "Sua sorte hoje depende de quantas vezes você conseguir dizer 'sinergias' numa reunião sem rir.",
  "O universo hoje sussurrará segredos de produtividade através do barulho da impressora.",
  "Hoje você descobrirá que a procrastinação é apenas sua mente fazendo aquecimento para a genialidade.",
  "Sua aura profissional hoje brilhará mais que uma tela de computador às 3h da manhã.",
  "Lembre-se: cada e-mail não lido é uma oportunidade de praticar a arte da ignorância seletiva.",
  "Hoje é um excelente dia para tratar suas tarefas como pokémons - você precisa capturar todas.",
  "Sua intuição hoje será mais precisa que o GPS recalculando rota pela quinta vez.",
  "O sucesso hoje virá disfarçado de uma reunião que poderia ter sido um e-mail.",
  "Lembre-se: você é como um post-it - pequeno, colorido e essencial para manter tudo organizado.",
  "Hoje é um ótimo dia para responder e-mails com enigmas em vez de respostas diretas.",
  "Use o elevador hoje como se fosse um portal interdimensional — apenas entre confiante.",
  "A produtividade bate diferente quando você finge que está num reality show de escritórios.",
  "Lembre-se: todo post-it é um grito de socorro com cola.",
  "Hoje, tente resolver um problema usando apenas frases motivacionais e uma garrafinha d’água.",
  "Seu café está te observando — e julgando suas decisões.",
  "Confie na sua intuição, especialmente se ela vier com gráficos e uma apresentação em PowerPoint.",
  "Cada clique hoje será interpretado como uma declaração de guerra pelo seu mouse.",
  "Hoje é um bom dia para se declarar gerente do caos e seguir em frente.",
  "Se algo der errado hoje, acuse Mercúrio retrógrado e siga com classe.",
  "Sua senha de Wi-Fi pode estar influenciando seu destino.",
  "A impressora está em greve e exige um aumento em toner.",
  "Cada reunião desnecessária cancela uma encarnação futura sua.",
  "Hoje você vai digitar algo genial... e o Word vai travar.",
  "Nada como uma planilha em branco para lembrar que a vida é cheia de possibilidades — e obrigações."
];

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
  // --- ESTADOS ---
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  
  const [projects, setProjects] = useState([]);
  const [currentView, setCurrentView] = useState('home');
  const [currentProject, setCurrentProject] = useState(null);
  const [currentSubProject, setCurrentSubProject] = useState(null);
  const [currentBoardType, setCurrentBoardType] = useState('kanban');
  
  // Controle unificado de modais
  const [modalState, setModalState] = useState({ type: null, isOpen: false, data: null });
  
  // Drag & Drop
  const [draggedItem, setDraggedItem] = useState(null);

  // Estados da Sorte
  const [dailyPhrase, setDailyPhrase] = useState('');
  const [megaSenaNumbers, setMegaSenaNumbers] = useState([]);

  // Configuração Supabase
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Hook de Arquivos
  const { files, handleFileUpload: originalHandleFileUpload } = useFiles(
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
    
    // Gerar sorte do dia
    setDailyPhrase(absurdPhrases[Math.floor(Math.random() * absurdPhrases.length)]);
    setMegaSenaNumbers(generateMegaSenaNumbers());
  }, []);

  useEffect(() => {
    if (projects.length > 0 && isLoggedIn && currentUser) {
      localStorage.setItem(`brickflow-projects-${currentUser.userKey}`, JSON.stringify(projects));
    }
  }, [projects, isLoggedIn, currentUser]);

  // --- FUNÇÕES AUXILIARES ---
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

  // --- HANDLERS (LÓGICA) ---
  const handleLogin = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const user = allUsers.find(u => u.username === formData.get('username') && u.pin === formData.get('pin'));
    
    if (user) {
      const userData = { ...user, userKey: `${user.username}-${user.pin}` };
      setCurrentUser(userData);
      setIsLoggedIn(true);
      localStorage.setItem('brickflow-current-user', JSON.stringify(userData));
      loadUserProjects(userData.userKey);
    } else {
      alert("Credenciais inválidas");
    }
  };

  const handleCreateProject = (formData) => {
    const newProject = {
      id: generateId('proj'),
      ...formData,
      isProtected: formData.isProtected === 'on',
      subProjects: [],
      createdAt: new Date().toISOString(),
      createdBy: currentUser.userKey,
      enabledTabs: [...DEFAULT_TABS],
      boardData: initializeBoardData()
    };
    updateProjectsState([...projects, newProject]);
    setModalState({ isOpen: false, type: null });
  };

  const initializeBoardData = () => ({
    todo: { lists: [{ id: 'l1', title: 'A Fazer', tasks: [] }, { id: 'l2', title: 'Fazendo', tasks: [] }, { id: 'l3', title: 'Feito', tasks: [] }] },
    kanban: { lists: [{ id: 'k1', title: 'Backlog', tasks: [] }, { id: 'k2', title: 'Em Progresso', tasks: [] }, { id: 'k3', title: 'Concluído', tasks: [] }] },
    timeline: { periods: [{ id: 'p1', title: 'Q1', tasks: [] }] },
    goals: { objectives: [] }
  });

  const handleTaskAction = (action, data) => {
    const target = currentView === 'subproject' ? currentSubProject : currentProject;
    const isEdit = !!modalState.data?.task;
    
    const updatedProjects = projects.map(p => {
      if (p.id !== (currentProject?.id || target.id)) return p;
      
      const updateEntity = (entity) => {
        const board = entity.boardData[currentBoardType];
        
        if (action === 'save') {
          if (isEdit) {
             board.lists = board.lists.map(l => ({
               ...l,
               tasks: l.tasks.map(t => t.id === modalState.data.task.id ? { ...t, ...data } : t)
             }));
          } else {
            const listId = modalState.data?.listId || board.lists[0].id;
            board.lists = board.lists.map(l => l.id === listId ? { ...l, tasks: [...l.tasks, { id: generateId('task'), ...data }] } : l);
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
    
    if (currentView === 'subproject') {
        const proj = updatedProjects.find(p => p.id === currentProject.id);
        setCurrentSubProject(proj.subProjects.find(s => s.id === currentSubProject.id));
    } else if (currentView === 'project') {
        setCurrentProject(updatedProjects.find(p => p.id === currentProject.id));
    }

    setModalState({ isOpen: false, type: null });
  };

  // --- RENDERIZADORES ---

  // 1. TELA DE LOGIN
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
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-zinc-300">Usuário</Label>
                <Input name="username" placeholder="Ex: JOAO" className="bg-zinc-950 border-zinc-800 focus:ring-red-500/20" required />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">PIN de Acesso</Label>
                <Input name="pin" type="password" placeholder="••••" maxLength={4} className="bg-zinc-950 border-zinc-800 text-center tracking-widest" required />
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-red-600 text-white font-medium shadow-lg shadow-red-900/20">
                Entrar no Sistema
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center border-t border-zinc-800/50 pt-6">
            <Button variant="link" className="text-zinc-500 hover:text-zinc-300 text-xs" onClick={() => alert('Fale com o administrador')}>
              Esqueceu suas credenciais?
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // 2. HEADER
  const renderHeader = () => (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/60">
      <div className="container flex h-16 items-center justify-between mx-auto px-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setCurrentView('home')}>
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/20">
              <span className="font-bold text-white text-lg">B</span>
            </div>
            <span className="font-bold text-lg tracking-tight hidden md:inline-block">BrickFlow</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-1">
            <Button variant="ghost" className={`text-zinc-400 hover:text-white hover:bg-zinc-800/50 ${currentView === 'home' ? 'text-white bg-zinc-800/50' : ''}`} onClick={() => setCurrentView('home')}>
              <LayoutGrid className="mr-2 h-4 w-4" /> Dashboard
            </Button>
            {currentProject && (
              <>
                <span className="text-zinc-700">/</span>
                <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-zinc-800/50" onClick={() => setCurrentView('project')}>
                  {currentProject.name}
                </Button>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 px-3 py-1.5 bg-zinc-900 rounded-full border border-zinc-800 shadow-sm">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-zinc-800 text-zinc-300 text-xs">{currentUser?.displayName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium text-zinc-300 hidden sm:inline-block">{currentUser?.displayName}</span>
          </div>
          <Button variant="outline" size="icon" className="h-9 w-9 border-zinc-800 bg-transparent text-zinc-400 hover:text-red-400 hover:border-red-900/30 hover:bg-red-950/10" onClick={() => { setIsLoggedIn(false); }}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );

  // 3. DASHBOARD (HOME)
  const renderHome = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Sorte do Dia (Design Brutal) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="col-span-2 bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10"><Sparkles className="w-24 h-24 text-primary" /></div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-zinc-100">
              <Sparkles className="w-5 h-5 text-primary" /> Sorte do Dia
            </CardTitle>
            <CardDescription className="text-zinc-400 text-base italic">
              "{dailyPhrase}"
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-zinc-100 text-sm uppercase tracking-wider">
              <Dna className="w-4 h-4 text-emerald-500" /> Mega Sena
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              {megaSenaNumbers.map((num, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-900/50 text-emerald-400 flex items-center justify-center font-mono font-bold text-sm shadow-sm">
                  {num.toString().padStart(2, '0')}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2 border-b border-zinc-800">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Visão Geral</h1>
          <p className="text-zinc-400 max-w-lg">Gerencie seus projetos estratégicos e acompanhe o progresso das metas da equipe.</p>
        </div>
        <Button onClick={() => setModalState({ type: 'newProject', isOpen: true })} className="bg-white text-black hover:bg-zinc-200 font-medium shadow-lg shadow-white/5">
          <Plus className="mr-2 h-4 w-4" /> Novo Projeto
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.filter(p => !p.isArchived).map(project => (
          <Card 
            key={project.id}
            onClick={() => { setCurrentProject(project); setCurrentView('project'); }}
            className="group relative overflow-hidden bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all duration-300 hover:shadow-2xl hover:shadow-black/50 cursor-pointer"
          >
            <div className={`absolute top-0 left-0 w-1.5 h-full bg-${project.color}-500/80 group-hover:bg-${project.color}-500 transition-colors`} />
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <CardHeader className="pl-6 pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl font-bold text-zinc-100 group-hover:text-white transition-colors">{project.name}</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-zinc-500 hover:text-white hover:bg-zinc-800">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-zinc-950 border-zinc-800">
                    <DropdownMenuLabel>Ações do Projeto</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-zinc-800" />
                    <DropdownMenuItem> <Settings className="mr-2 h-4 w-4" /> Configurações</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-400 focus:text-red-400 focus:bg-red-950/20"> <Trash2 className="mr-2 h-4 w-4" /> Arquivar</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardDescription className="line-clamp-2 text-zinc-500 group-hover:text-zinc-400 transition-colors">
                {project.description || "Sem descrição definida."}
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-6 pt-4">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-zinc-950 border-zinc-800 text-zinc-400 group-hover:border-zinc-600 transition-colors">
                  {project.subProjects?.length || 0} Áreas
                </Badge>
                {project.isProtected && (
                  <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                    <Lock className="w-3 h-3 mr-1" /> Privado
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        
        {/* Card de Adicionar Novo */}
        <button 
          onClick={() => setModalState({ type: 'newProject', isOpen: true })}
          className="flex flex-col items-center justify-center h-full min-h-[180px] rounded-xl border border-dashed border-zinc-800 bg-zinc-950/30 hover:bg-zinc-900/50 hover:border-zinc-700 transition-all group"
        >
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:border-zinc-600 transition-all">
            <Plus className="h-6 w-6 text-zinc-500 group-hover:text-zinc-300" />
          </div>
          <span className="text-sm font-medium text-zinc-500 group-hover:text-zinc-300">Criar Novo Projeto</span>
        </button>
      </div>
    </div>
  );

  // 4. VISUALIZAÇÃO DO PROJETO (SUBPROJETOS)
  const renderProjectView = () => (
    <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setCurrentView('home')} className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            {currentProject.name}
            {currentProject.isProtected && <Lock className="h-5 w-5 text-zinc-600" />}
          </h1>
          <p className="text-zinc-400">{currentProject.description}</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="border-zinc-800 hover:bg-zinc-800" onClick={() => { setCurrentSubProject(null); setCurrentBoardType('kanban'); setCurrentView('subproject'); }}>
             <LayoutGrid className="mr-2 h-4 w-4" /> Quadro Geral
           </Button>
           <Button onClick={() => setModalState({ type: 'newSubProject', isOpen: true })} className="bg-primary hover:bg-red-600">
             <Plus className="mr-2 h-4 w-4" /> Nova Área
           </Button>
        </div>
      </div>

      <Separator className="bg-zinc-800" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {currentProject.subProjects?.filter(s => !s.isArchived).map(sub => (
          <Card 
            key={sub.id}
            onClick={() => { setCurrentSubProject(sub); setCurrentView('subproject'); }}
            className="group cursor-pointer bg-zinc-900 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/50 transition-all duration-300"
          >
            <CardHeader>
              <div className="flex justify-between items-start mb-2">
                <div className={`p-2 rounded-lg bg-${sub.color || 'zinc'}-500/10 text-${sub.color || 'zinc'}-500`}>
                  <FolderOpen className="h-5 w-5" />
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-600 hover:text-white -mt-1 -mr-2">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
              <CardTitle className="text-lg text-zinc-200 group-hover:text-white">{sub.name}</CardTitle>
              <CardDescription>{sub.description}</CardDescription>
            </CardHeader>
            <CardFooter className="pt-2">
               <span className="text-xs text-zinc-500 font-mono">ID: {sub.id.slice(0,8)}</span>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );

  // 5. QUADRO DE TAREFAS (KANBAN / LISTA)
  const renderBoard = () => {
    const data = getCurrentBoardData();
    const entityName = currentSubProject ? currentSubProject.name : currentProject.name;

    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => setCurrentView(currentSubProject ? 'project' : 'home')} className="border-zinc-800 text-zinc-400">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                {entityName}
              </h2>
              {currentSubProject && <p className="text-xs text-zinc-500">{currentProject.name}</p>}
            </div>
          </div>
          
          <Tabs value={currentBoardType} onValueChange={setCurrentBoardType} className="w-auto">
            <TabsList className="bg-zinc-900 border border-zinc-800 p-1">
              <TabsTrigger value="kanban" className="data-[state=active]:bg-zinc-800">Kanban</TabsTrigger>
              <TabsTrigger value="todo" className="data-[state=active]:bg-zinc-800">Lista</TabsTrigger>
              <TabsTrigger value="files" className="data-[state=active]:bg-zinc-800">Arquivos</TabsTrigger>
              <TabsTrigger value="goals" className="data-[state=active]:bg-zinc-800">Metas</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* ÁREA DE CONTEÚDO DO QUADRO */}
        <div className="flex-1 bg-zinc-950/50 border border-zinc-800 rounded-xl overflow-hidden relative">
          <div className="absolute inset-0 p-4 overflow-auto">
            
            {/* KANBAN BOARD */}
            {currentBoardType === 'kanban' && (
              <div className="flex h-full gap-6 min-w-max pb-2">
                {data.lists?.map(list => (
                  <div key={list.id} className="w-80 flex flex-col h-full bg-zinc-900/30 rounded-xl border border-zinc-800/50">
                    <div className="p-3 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-900/50 rounded-t-xl">
                      <span className="font-semibold text-sm text-zinc-300">{list.title}</span>
                      <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 h-5 px-1.5 text-[10px]">{list.tasks?.length || 0}</Badge>
                    </div>
                    
                    <div className="flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar">
                      {list.tasks?.map(task => (
                        <Card 
                          key={task.id} 
                          onClick={() => setModalState({ type: 'task', isOpen: true, data: { task, listId: list.id } })}
                          className="bg-zinc-900 border-zinc-800 shadow-sm hover:border-zinc-600 hover:shadow-md transition-all cursor-pointer group"
                        >
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start gap-2 mb-2">
                              <span className="text-sm font-medium text-zinc-200 leading-snug group-hover:text-primary transition-colors">{task.title}</span>
                              {task.priority === 'high' && <div className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0 mt-1.5 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />}
                            </div>
                            <div className="flex items-center justify-between mt-3">
                              {task.responsibleUsers?.length > 0 ? (
                                <ResponsibleUsersButton users={task.responsibleUsers} />
                              ) : <span className="text-[10px] text-zinc-700">Sem responsável</span>}
                              {task.endDate && (
                                <span className="text-[10px] text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <Calendar className="h-2.5 w-2.5" /> {new Date(task.endDate).toLocaleDateString().slice(0,5)}
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      
                      <Button variant="ghost" className="w-full text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900 border border-dashed border-zinc-800 hover:border-zinc-700 h-9 text-xs"
                        onClick={() => setModalState({ type: 'task', isOpen: true, data: { listId: list.id } })}>
                        <Plus className="h-3 w-3 mr-2" /> Adicionar Card
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TODO LIST (Visual Alternativo) */}
            {currentBoardType === 'todo' && (
              <div className="max-w-4xl mx-auto space-y-6">
                {data.lists?.map(list => (
                  <div key={list.id} className="space-y-2">
                    <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider pl-1">{list.title}</h3>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg divide-y divide-zinc-800">
                      {list.tasks?.map(task => (
                        <div key={task.id} className="p-3 flex items-center gap-4 hover:bg-zinc-800/50 transition-colors group">
                          <Checkbox className="border-zinc-700 data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                          <div className="flex-1 min-w-0" onClick={() => setModalState({ type: 'task', isOpen: true, data: { task, listId: list.id } })}>
                            <p className="text-sm font-medium text-zinc-200 truncate group-hover:text-white cursor-pointer">{task.title}</p>
                            {task.description && <p className="text-xs text-zinc-600 truncate">{task.description}</p>}
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-[10px] border-zinc-800 text-zinc-500 h-5">{task.priority || 'Normal'}</Badge>
                          </div>
                        </div>
                      ))}
                      {list.tasks?.length === 0 && <div className="p-4 text-center text-xs text-zinc-700">Lista vazia</div>}
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs text-zinc-500 hover:text-zinc-300 pl-1" onClick={() => setModalState({ type: 'task', isOpen: true, data: { listId: list.id } })}>
                      <Plus className="h-3 w-3 mr-1" /> Adicionar tarefa em {list.title}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* ARQUIVOS */}
            {currentBoardType === 'files' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                  <div>
                    <h3 className="text-lg font-medium text-white">Central de Arquivos</h3>
                    <p className="text-sm text-zinc-500">Gerencie documentos e ativos do projeto.</p>
                  </div>
                  <label>
                    <Button className="cursor-pointer bg-zinc-100 text-zinc-900 hover:bg-zinc-200" asChild>
                      <span><Upload className="mr-2 h-4 w-4" /> Upload</span>
                    </Button>
                    <Input type="file" className="hidden" multiple onChange={originalHandleFileUpload} />
                  </label>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {files?.filter(f => f.subProjectId === (currentSubProject?.id || null)).map(file => (
                    <Card key={file.id} className="group bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-all hover:-translate-y-1">
                      <CardContent className="p-4 flex flex-col items-center text-center gap-3 relative">
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-zinc-500 hover:text-red-500" onClick={() => {/* delete logic */}}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="h-14 w-14 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-2xl shadow-inner">
                          {file.type?.includes('image') ? '🖼️' : '📄'}
                        </div>
                        <div className="w-full overflow-hidden">
                          <p className="text-sm font-medium text-zinc-300 truncate w-full" title={file.name}>{file.name}</p>
                          <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold mt-1">{formatFileSize(file.size)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 w-full mt-2">
                          <Button size="sm" variant="secondary" className="h-7 text-xs bg-zinc-800 hover:bg-zinc-700">Ver</Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs border-zinc-700 hover:bg-zinc-800">Baixar</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {(!files || files.length === 0) && (
                  <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
                    <Upload className="h-10 w-10 text-zinc-700 mb-4" />
                    <p className="text-zinc-500 font-medium">Nenhum arquivo encontrado</p>
                    <p className="text-zinc-600 text-sm">Arraste arquivos aqui ou use o botão de upload</p>
                  </div>
                )}
              </div>
            )}

            {/* METAS (GOALS) */}
            {currentBoardType === 'goals' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.objectives?.map(goal => (
                  <Card key={goal.id} className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <CardTitle className="text-lg">{goal.title}</CardTitle>
                        <span className="text-2xl font-bold text-zinc-700">{goal.progress || 0}%</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden mb-4">
                        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${goal.progress || 0}%` }} />
                      </div>
                      <p className="text-sm text-zinc-500">{goal.description}</p>
                    </CardContent>
                    <CardFooter className="border-t border-zinc-800 pt-4 flex justify-between">
                      <Badge variant="outline" className="border-zinc-700">Em andamento</Badge>
                      <Button variant="ghost" size="sm" className="text-xs h-7">Atualizar Progresso</Button>
                    </CardFooter>
                  </Card>
                ))}
                <Button variant="outline" className="h-auto min-h-[150px] border-dashed border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900 flex flex-col gap-2"
                  onClick={() => setModalState({ type: 'task', isOpen: true, data: { isGoal: true } })}>
                  <Target className="h-8 w-8 text-zinc-600" />
                  <span className="text-zinc-500">Definir Nova Meta</span>
                </Button>
              </div>
            )}

          </div>
        </div>
      </div>
    );
  };

  // --- MODAIS (Dialogs) ---
  
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20 selection:text-primary">
      {renderHeader()}
      <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8 pt-6">
        {currentView === 'home' && renderHome()}
        {currentView === 'project' && renderProjectView()}
        {currentView === 'subproject' && renderBoard()}
      </main>

      {/* Modal Genérico para Criação/Edição */}
      <Dialog open={modalState.isOpen} onOpenChange={(open) => !open && setModalState({ ...modalState, isOpen: false })}>
        <DialogContent className="sm:max-w-[500px] bg-zinc-950 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {modalState.type === 'newProject' && 'Novo Projeto Estratégico'}
              {modalState.type === 'newSubProject' && 'Nova Área / Sub-projeto'}
              {modalState.type === 'task' && (modalState.data?.task ? 'Editar Tarefa' : 'Criar Nova Tarefa')}
            </DialogTitle>
            <DialogDescription className="text-zinc-500">
              Preencha os detalhes abaixo para continuar.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = Object.fromEntries(new FormData(e.target));
            if (modalState.type === 'newProject') handleCreateProject(formData);
            if (modalState.type === 'task') handleTaskAction('save', formData);
            // Outros handlers...
          }} className="space-y-4 py-4">
            
            {(modalState.type === 'newProject' || modalState.type === 'newSubProject') && (
              <>
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input name="name" required className="bg-zinc-900 border-zinc-800 focus:border-primary/50" placeholder="Ex: Campanha Q3" />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea name="description" className="bg-zinc-900 border-zinc-800" placeholder="Objetivos e escopo..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cor</Label>
                    <Select name="color" defaultValue="blue">
                      <SelectTrigger className="bg-zinc-900 border-zinc-800"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        {USER_COLORS.map(c => <SelectItem key={c} value={c}><div className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full bg-${c}-500`}/>{c}</div></SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end pb-2">
                    <div className="flex items-center gap-2">
                      <Checkbox id="prot" name="isProtected" />
                      <Label htmlFor="prot" className="cursor-pointer">Proteger com Senha</Label>
                    </div>
                  </div>
                </div>
              </>
            )}

            {modalState.type === 'task' && (
              <>
                <div className="space-y-2">
                  <Label>Título da Tarefa</Label>
                  <Input name="title" defaultValue={modalState.data?.task?.title} required className="bg-zinc-900 border-zinc-800 text-lg font-medium" />
                </div>
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select name="priority" defaultValue={modalState.data?.task?.priority || 'medium'}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-800"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta (Urgente)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data de Entrega</Label>
                  <Input type="date" name="endDate" defaultValue={modalState.data?.task?.endDate} className="bg-zinc-900 border-zinc-800" />
                </div>
              </>
            )}

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setModalState({ ...modalState, isOpen: false })}>Cancelar</Button>
              <Button type="submit" className="bg-primary hover:bg-red-600 text-white">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default LegacyApp;
