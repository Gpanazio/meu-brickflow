import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  MoreVertical, Plus, ArrowLeft, LogOut, Upload, 
  Trash2, Eye, FolderOpen, Lock, RotateCcw,
  ListTodo, KanbanSquare, FileText, Goal, Sparkles, Dna, AlertTriangle,
  X, Check, ChevronDown, Settings, Image as ImageIcon, Calendar, WifiOff
} from 'lucide-react';
import './App.css';

// Importa o cliente real do Supabase configurado no seu projeto
import { supabase, hasSupabaseConfig } from './lib/supabaseClient';
import LegacyProjectView from './components/legacy/LegacyProjectView';
import { accessProjectNavigation } from './utils/projectNavigation';

// --- UTILS ---

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const absurdPhrases = [
  "Hoje é um ótimo dia para conversar com suas plantas sobre seus planos de carreira.",
  "Lembre-se: o sucesso é como uma pizza de abacaxi - controverso, mas alguns adoram.",
  "Sua produtividade hoje será proporcional ao número de vezes que você piscar com o olho esquerdo.",
  "O universo conspira a seu favor, especialmente se você usar meias de cores diferentes.",
  "A resposta que você procura está na pasta 'Outros' do seu e-mail.",
  "Seu teclado está planejando uma revolução silenciosa tecla por tecla.",
  "Hoje, você é o CEO da sua própria confusão mental. Lidere com orgulho.",
  "O ar condicionado sabe mais segredos da empresa do que o RH.",
  "Respire fundo. O servidor caiu, mas sua dignidade permanece intacta.",
  "A sabedoria antiga diz: 'Reinicie a máquina antes de chamar o suporte'.",
];

const NO_SENSE_AVATARS = [
  "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=400&auto=format&fit=crop&q=60", // Gato sério
  "https://images.unsplash.com/photo-1513245543132-31f507417b26?w=400&auto=format&fit=crop&q=60", // Unicórnio
  "https://images.unsplash.com/photo-1555685812-4b943f3e99a9?w=400&auto=format&fit=crop&q=60", // Capivara
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Felix", // Emoji estranho
  "https://api.dicebear.com/7.x/bottts/svg?seed=Glitch", // Robô
  "https://images.unsplash.com/photo-1541364983171-a8ba01e95cfc?w=400&auto=format&fit=crop&q=60", // Lhama
  "https://images.unsplash.com/photo-1596727147705-54a9d6ed27e6?w=400&auto=format&fit=crop&q=60", // Pato de borracha
  "https://images.unsplash.com/photo-1566576912904-68497a097def?w=400&auto=format&fit=crop&q=60", // Avestruz
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

// --- UI COMPONENTS ---

const Button = React.forwardRef(({ className, variant = "default", size = "default", ...props }, ref) => {
  const variants = {
    default: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
    destructive: "bg-red-900 text-white hover:bg-red-800",
    outline: "border border-zinc-800 bg-black hover:bg-zinc-900 text-zinc-300",
    secondary: "bg-zinc-800 text-zinc-100 hover:bg-zinc-700",
    ghost: "hover:bg-zinc-900 text-zinc-400 hover:text-white",
    link: "text-red-500 underline-offset-4 hover:underline",
  };
  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3 text-sm",
    lg: "h-12 rounded-md px-8 text-base",
    icon: "h-10 w-10",
  };
  return (
    <button ref={ref} className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700 disabled:pointer-events-none disabled:opacity-50", variants[variant], sizes[size], className)} {...props} />
  );
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

const Card = ({ className, ...props }) => (
  <div className={cn("rounded-xl border border-zinc-900 bg-black text-zinc-100 shadow", className)} {...props} />
);

// Custom Dialog
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
      <option value="blue">Blue</option>
      <option value="red">Red</option>
      <option value="green">Green</option>
      <option value="purple">Purple</option>
      <option value="orange">Orange</option>
      <option value="low">Baixa</option>
      <option value="medium">Média</option>
      <option value="high">Alta</option>
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

const DropdownMenuTrigger = ({ asChild, children, isOpen, setIsOpen, ...props }) => {
  return React.cloneElement(children, {
    onClick: (e) => { e.stopPropagation(); setIsOpen(!isOpen); if (children.props.onClick) children.props.onClick(e); },
    ...props
  });
};

const DropdownMenuContent = ({ children, isOpen, align = 'start', className }) => {
  if (!isOpen) return null;
  return <div className={cn("absolute z-50 min-w-[10rem] overflow-hidden rounded-md border border-zinc-800 bg-black p-1 text-zinc-100 shadow-md animate-in data-[side=bottom]:slide-in-from-top-2", align === 'end' ? 'right-0' : 'left-0', className)}>{children}</div>;
};

const DropdownMenuItem = ({ children, className, onClick, ...props }) => (
  <div className={cn("relative flex cursor-default select-none items-center rounded-sm px-3 py-2 text-sm outline-none transition-colors hover:bg-zinc-900 hover:text-zinc-100 focus:bg-zinc-900 focus:text-zinc-100", className)} onClick={(e) => { if(onClick) onClick(e); }} {...props}>{children}</div>
);

const DropdownMenuLabel = ({ className, ...props }) => <div className={cn("px-3 py-2 text-sm font-semibold", className)} {...props} />;
const DropdownMenuSeparator = ({ className, ...props }) => <div className={cn("-mx-1 my-1 h-px bg-zinc-800", className)} {...props} />;

const Avatar = ({ className, children }) => <div className={cn("relative flex h-12 w-12 shrink-0 overflow-hidden rounded-full border border-zinc-800", className)}>{children}</div>;
const AvatarImage = ({ src, className }) => <img src={src} alt="Avatar" className={cn("aspect-square h-full w-full object-cover", className)} />;
const AvatarFallback = ({ className, children }) => <div className={cn("flex h-full w-full items-center justify-center rounded-full bg-zinc-900 font-medium", className)}>{children}</div>;
const Separator = ({ className, orientation = "horizontal" }) => <div className={cn("shrink-0 bg-zinc-800", orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]", className)} />;

// --- LOGIC ---

function useFiles(currentProject, currentSubProject, currentUser) {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    // Implementar fetch real aqui se necessário
  }, [currentSubProject]);

  const handleFileUpload = async (event) => {
    const uploadedFiles = Array.from(event.target.files);
    if (!uploadedFiles.length || !currentSubProject) return;

    const newFiles = uploadedFiles.map(file => ({
      id: generateId('file'),
      name: file.name,
      size: file.size,
      type: file.type,
      data: URL.createObjectURL(file), // Local preview
      projectId: currentProject.id,
      subProjectId: currentSubProject.id,
      uploadDate: new Date().toISOString()
    }));

    setFiles(prev => [...newFiles, ...prev]);
  };

  const handleDeleteFile = (fileId) => {
    if (window.confirm("Deseja apagar este arquivo?")) {
        setFiles(prev => prev.filter(f => f.id !== fileId));
    }
  };

  return { files, handleFileUpload, isDragging, setIsDragging, handleDeleteFile };
}

// --- GAME COMPONENTS ---

const initialPuzzle = [
  ['5', '3', '', '', '7', '', '', '', ''],
  ['6', '', '', '1', '9', '5', '', '', ''],
  ['', '9', '8', '', '', '', '', '6', ''],
  ['8', '', '', '', '6', '', '', '', '3'],
  ['4', '', '', '8', '', '3', '', '', '1'],
  ['7', '', '', '', '2', '', '', '', '6'],
  ['', '6', '', '', '', '', '2', '8', ''],
  ['', '', '', '4', '1', '9', '', '', '5'],
  ['', '', '', '', '8', '', '', '7', '9']
]
const fixedCells = initialPuzzle.map(row => row.map(cell => cell !== ''))

function SudokuGame() {
  const [board, setBoard] = useState(initialPuzzle.map(row => [...row]))
  const [showOverlay, setShowOverlay] = useState(false)
  const [showGame, setShowGame] = useState(true)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [showFinalOverlay, setShowFinalOverlay] = useState(false)

  const handleFirstInteraction = e => {
    if (!hasInteracted) { e.preventDefault(); setShowOverlay(true); setHasInteracted(true); }
  }

  const handleChange = (row, col, value) => {
    if (!hasInteracted || showOverlay || showFinalOverlay) return
    const val = value.replace(/[^1-9]/g, '')
    if (fixedCells[row][col]) return
    const emptyCells = board.flat().filter(cell => cell === '').length
    if (emptyCells === 1 && val !== '') { setShowFinalOverlay(true); return }
    setBoard(prev => { const newBoard = prev.map(r => [...r]); newBoard[row][col] = val; return newBoard })
  } 

  const restart = () => { setBoard(initialPuzzle.map(row => [...row])); setShowOverlay(false); setHasInteracted(false); setShowFinalOverlay(false) }
  const isCellValid = (board, row, col) => {
    const val = board[row][col]; if (!val) return true;
    for (let i = 0; i < 9; i++) if ((i !== row && board[i][col] === val) || (i !== col && board[row][i] === val)) return false;
    const startRow = Math.floor(row / 3) * 3, startCol = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if ((startRow + r !== row || startCol + c !== col) && board[startRow + r][startCol + c] === val) return false;
    return true
  }

  if (!showGame) return <div className="p-6 border border-zinc-800 bg-black text-zinc-500 text-sm font-mono uppercase tracking-widest text-center">Procrastinação derrotada! De volta ao batente! 💪</div>;

  return (
    <div className="relative border border-zinc-800 bg-black p-6" data-testid="sudoku-game">
      {showOverlay && <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/90 backdrop-blur-sm p-6 text-center"><div className="space-y-6"><p className="text-zinc-200 text-lg">O trabalho chama, mas o Sudoku é muito mais divertido. Qual é a sua escolha?</p><div className="flex flex-col gap-3"><Button onClick={() => setShowOverlay(false)} className="w-full text-base">Estou ciente que preciso trabalhar, mas escolho jogar</Button><Button variant="secondary" onClick={() => { setShowGame(false); setShowOverlay(false); }} className="w-full text-base">Obrigado por me lembrar, prefiro trabalhar</Button></div></div></div>}
      {showFinalOverlay && <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/90 p-6 text-center"><p className="text-zinc-200 text-lg">Fracassar tão perto do sucesso é uma arte. Parabéns, você é um artista incompreendido!</p></div>}
      <h3 className="mb-6 text-base font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Sparkles className="h-5 w-5" /> Sudoku</h3>
      <div className="grid grid-cols-9 gap-px bg-zinc-800 border border-zinc-800 mb-6" onMouseDown={handleFirstInteraction}>
        {board.map((row, r) => row.map((cell, c) => (
            <input key={`${r}-${c}`} className={`aspect-square w-full bg-black text-center text-sm font-mono outline-none focus:bg-zinc-900 ${fixedCells[r][c] ? 'text-zinc-500' : 'text-white'} ${!isCellValid(board, r, c) ? 'text-red-500' : ''}`} value={cell} onChange={e => handleChange(r, c, e.target.value)} maxLength={1} inputMode="numeric" readOnly={fixedCells[r][c]} />
        )))}
      </div>
      <Button variant="outline" size="sm" onClick={restart} className="w-full uppercase text-xs tracking-widest">Reiniciar</Button>
    </div>
  )
}

function ResponsibleUsersButton({ users }) {
  const [open, setOpen] = useState(false)
  if (!users || users.length === 0) return null
  return (
    <div className="relative inline-block">
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }} className="flex items-center gap-2 rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors">👤 {users.length}</button>
      {open && <div className="absolute top-full left-0 mt-2 z-10 w-48 rounded border border-zinc-800 bg-black p-2 shadow-xl">{users.map((user, i) => <div key={i} className="text-xs font-medium text-zinc-300 py-2 px-2 border-b border-zinc-900 last:border-0 hover:bg-zinc-900 transition-colors">👤 {user}</div>)}</div>}
    </div>
  )
}

// --- LEGACY COMPONENTS ---

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

const ALL_TABS = [
  { id: 'todo', label: 'LISTA', icon: ListTodo },
  { id: 'kanban', label: 'KANBAN', icon: KanbanSquare },
  { id: 'files', label: 'ARQUIVOS', icon: FileText },
  { id: 'goals', label: 'METAS', icon: Goal }
];

function LegacyHeader({ currentView, setCurrentView, currentProject, isSyncing, currentUser, handleSwitchUser, handleLogout, onOpenSettings }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-900 bg-black/95 backdrop-blur">
      <div className="container flex h-20 items-center justify-between mx-auto px-6 md:px-10">
        <div className="flex items-center gap-8">
          <div onClick={() => setCurrentView('home')} className="cursor-pointer hover:opacity-80 transition-opacity font-black text-white tracking-tighter text-2xl md:text-3xl">BRICKFLOW</div>
          <Separator orientation="vertical" className="h-8 bg-zinc-800" />
          <nav className="flex items-center gap-4">
            <Button variant="ghost" className={`uppercase tracking-widest text-xs font-bold rounded-none h-10 px-4 ${currentView === 'home' ? 'text-white' : 'text-zinc-500'}`} onClick={() => setCurrentView('home')}>Central</Button>
            {currentProject && <><span className="text-zinc-700">/</span><Button variant="ghost" className="uppercase tracking-widest text-xs font-bold text-zinc-500 hover:text-white rounded-none h-10 px-4" onClick={() => setCurrentView('project')}>{currentProject.name}</Button></>}
          </nav>
        </div>
        <div className="flex items-center gap-6">
          {isSyncing && <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-12 w-12 rounded-full p-0 hover:bg-zinc-900 border border-transparent hover:border-zinc-800">
                <Avatar className="h-10 w-10">
                  {currentUser?.avatar ? <AvatarImage src={currentUser.avatar} /> : <AvatarFallback className="bg-zinc-900 text-zinc-400 text-sm font-bold">{currentUser?.displayName?.charAt(0)}</AvatarFallback>}
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-black border-zinc-800 rounded-md shadow-2xl" align="end">
              <DropdownMenuLabel className="p-4">
                <p className="text-sm font-bold text-white uppercase tracking-tight">{currentUser?.displayName}</p>
                <p className="text-xs text-zinc-500 font-mono tracking-widest mt-1">@{currentUser?.username}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-900" />
              <DropdownMenuItem onClick={onOpenSettings} className="focus:bg-zinc-900 focus:text-white cursor-pointer uppercase text-xs tracking-widest h-10"><Settings className="mr-3 h-4 w-4" /> Configurações</DropdownMenuItem>
              <DropdownMenuItem onClick={handleSwitchUser} className="focus:bg-zinc-900 focus:text-white cursor-pointer uppercase text-xs tracking-widest h-10"><RotateCcw className="mr-3 h-4 w-4" /> Trocar Conta</DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-400 focus:bg-zinc-900 cursor-pointer uppercase text-xs tracking-widest h-10"><LogOut className="mr-3 h-4 w-4" /> Sair</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

function UserSettingsModal({ isOpen, onClose, currentUser, onUpdateUser }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [avatarPreview, setAvatarPreview] = useState(currentUser?.avatar);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
    }
  };

  const handleSave = () => {
    onUpdateUser({ ...currentUser, avatar: avatarPreview });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-black border border-zinc-800 text-zinc-100 p-0 gap-0 shadow-2xl rounded-lg overflow-hidden">
        <DialogHeader className="p-8 border-b border-zinc-900">
          <DialogTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-3"><Settings className="w-6 h-6 text-zinc-500" /> Configurações</DialogTitle>
        </DialogHeader>
        <div className="flex h-[400px]">
          <div className="w-48 border-r border-zinc-900 p-4 bg-zinc-950/30">
            <div className="space-y-1">
              <button onClick={() => setActiveTab('profile')} className={cn("w-full text-left px-3 py-2 rounded-md text-xs font-bold uppercase tracking-widest transition-colors", activeTab === 'profile' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900")}>Perfil</button>
            </div>
          </div>
          <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
            {activeTab === 'profile' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Avatar do Usuário</h3>
                  <div className="flex items-start gap-6">
                    <Avatar className="w-24 h-24 border-2 border-zinc-800">
                      {avatarPreview ? <AvatarImage src={avatarPreview} /> : <AvatarFallback className="bg-zinc-900 text-zinc-500 text-2xl font-bold">{currentUser?.displayName?.charAt(0)}</AvatarFallback>}
                    </Avatar>
                    <div className="space-y-3 flex-1">
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="h-9 text-xs uppercase font-bold tracking-widest"><Upload className="w-3 h-3 mr-2" /> Upload</Button>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                      </div>
                      <p className="text-[10px] text-zinc-600 font-mono leading-relaxed">Recomendado: 400x400px. <br/>Suporta JPG, PNG e GIF.</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2"><Sparkles className="w-3 h-3 text-purple-500" /> Avatares No Sense</h3>
                  <div className="grid grid-cols-4 gap-3">
                    {NO_SENSE_AVATARS.map((url, idx) => (
                      <div key={idx} onClick={() => setAvatarPreview(url)} className={cn("aspect-square rounded-md overflow-hidden cursor-pointer border-2 transition-all hover:scale-105", avatarPreview === url ? "border-red-600 opacity-100" : "border-transparent opacity-60 hover:opacity-100 hover:border-zinc-700")}>
                        <img src={url} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="p-4 border-t border-zinc-900 bg-zinc-950/30">
          <Button variant="ghost" onClick={onClose} className="uppercase text-xs font-bold tracking-widest">Cancelar</Button>
          <Button onClick={handleSave} className="uppercase text-xs font-bold tracking-widest bg-white text-black hover:bg-zinc-200">Salvar Alterações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LegacyModal({ modalState, setModalState, handlePasswordSubmit, handleSaveProject, handleTaskAction, allUsers, currentUser }) {
  const [selectedUsers, setSelectedUsers] = useState(modalState.data?.responsibleUsers || []);
  const isCreate = modalState.mode === 'create';
  const initialTabs = modalState.data?.enabledTabs || ['kanban', 'todo', 'files', 'goals'];
  const isProjectCreator = modalState.data?.createdBy === currentUser?.username;
  const canEditStructure = isCreate || isProjectCreator;

  useEffect(() => { setSelectedUsers(modalState.data?.responsibleUsers || []); }, [modalState.data]);
  const toggleUser = (username) => { setSelectedUsers(prev => prev.includes(username) ? prev.filter(u => u !== username) : [...prev, username]); };

  return (
    <Dialog open={modalState.isOpen} onOpenChange={(open) => !open && setModalState({ ...modalState, isOpen: false })}>
      <DialogContent className="sm:max-w-[500px] bg-black border border-zinc-800 text-zinc-100 p-0 gap-0 shadow-2xl rounded-lg overflow-hidden">
        <DialogHeader className="p-8 border-b border-zinc-900">
          <DialogTitle className="text-2xl font-black uppercase tracking-tight">
            {modalState.type === 'project' && (modalState.mode === 'create' ? 'Novo Projeto' : 'Configurar')}
            {modalState.type === 'subProject' && (modalState.mode === 'create' ? 'Nova Área' : 'Editar Área')}
            {modalState.type === 'password' && 'Acesso Restrito'}
            {modalState.type === 'task' && (modalState.mode === 'edit' ? 'Editar Item' : 'Novo Item')}
          </DialogTitle>
        </DialogHeader>
        <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {modalState.type === 'password' ? (
            <form onSubmit={(e) => { e.preventDefault(); handlePasswordSubmit(new FormData(e.target).get('password')); }}>
              <div className="space-y-6">
                <Input type="password" name="password" placeholder="DIGITE A SENHA" autoFocus className="bg-zinc-950 border-zinc-800 rounded-md h-14 text-center text-xl tracking-[0.5em] uppercase focus:border-white text-white placeholder:text-zinc-800 placeholder:tracking-normal" />
                <Button type="submit" className="w-full bg-white text-black hover:bg-zinc-200 rounded-md h-12 uppercase font-bold tracking-widest text-sm">Acessar</Button>
              </div>
            </form>
          ) : (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = Object.fromEntries(new FormData(e.target));
              const finalData = { ...formData, responsibleUsers: selectedUsers };
              if (modalState.type === 'project' || modalState.type === 'subProject') handleSaveProject(finalData);
              if (modalState.type === 'task') handleTaskAction('save', finalData);
            }} className="space-y-6">
              {(modalState.type === 'project' || modalState.type === 'subProject') && (
                <>
                  <div className="space-y-3"><Label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Nome do Projeto</Label><Input name="name" defaultValue={modalState.data?.name} required className="bg-zinc-950 border-zinc-800 rounded-md h-12 focus:border-white text-white text-base px-4" /></div>
                  <div className="space-y-3"><Label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Descrição</Label><Textarea name="description" defaultValue={modalState.data?.description} className="bg-zinc-950 border-zinc-800 rounded-md min-h-[100px] text-zinc-300 focus:border-white text-sm p-4" /></div>
                  {canEditStructure && (
                    <div className="space-y-3 pt-2">
                        <Label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Módulos Ativos</Label>
                        <div className="grid grid-cols-2 gap-3">{ALL_TABS.map(tab => (
                                <div key={tab.id} className="flex items-center gap-3 bg-zinc-900/30 border border-zinc-800 p-3 rounded-md hover:border-zinc-700 transition-colors">
                                    <Checkbox id={`view_${tab.id}`} name={`view_${tab.id}`} defaultChecked={isCreate ? true : initialTabs.includes(tab.id)} className="border-zinc-600 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600" />
                                    <Label htmlFor={`view_${tab.id}`} className="text-xs font-bold uppercase tracking-widest text-zinc-300 cursor-pointer flex items-center gap-2"><tab.icon className="w-3 h-3 text-zinc-500" /> {tab.label}</Label>
                                </div>
                            ))}</div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-6 pt-2">
                    <div className="space-y-3"><Label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Cor</Label><Select name="color" defaultValue={modalState.data?.color || "blue"} /></div>
                    <div className="flex items-end pb-4 gap-3"><div className="flex items-center gap-3 bg-zinc-900/50 p-3 rounded-md w-full border border-zinc-800"><Checkbox id="prot" name="isProtected" defaultChecked={modalState.data?.isProtected} className="border-zinc-600 data-[state=checked]:bg-white data-[state=checked]:text-black" /><Label htmlFor="prot" className="text-xs text-zinc-300 cursor-pointer uppercase tracking-widest font-bold">Proteger com Senha</Label></div></div>
                  </div>
                  <div className="space-y-3"><Label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Senha (Opcional)</Label><Input name="password" type="password" defaultValue={modalState.data?.password} placeholder="••••••" className="bg-zinc-950 border-zinc-800 rounded-md h-12 px-4 tracking-widest" /></div>
                </>
              )}
              {modalState.type === 'task' && (
                <>
                  <div className="space-y-3"><Label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Título da Tarefa</Label><Input name="title" defaultValue={modalState.data?.title} required className="bg-zinc-950 border-zinc-800 rounded-md h-14 text-lg font-bold text-white focus:border-white px-4" /></div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3"><Label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Prioridade</Label><Select name="priority" defaultValue={modalState.data?.priority || 'medium'} /></div>
                    <div className="space-y-3"><Label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Data de Entrega</Label><Input type="date" name="endDate" defaultValue={modalState.data?.endDate} className="bg-zinc-950 border-zinc-800 rounded-md h-12 text-sm uppercase text-zinc-300 px-4" /></div>
                  </div>
                  <div className="space-y-3"><Label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Responsáveis</Label><div className="grid grid-cols-2 gap-2 bg-zinc-950 border border-zinc-800 p-3 rounded-md">{allUsers?.map(user => (<div key={user.username} className="flex items-center gap-2" onClick={() => toggleUser(user.username)}><div className={`w-4 h-4 border border-zinc-600 flex items-center justify-center cursor-pointer ${selectedUsers.includes(user.username) ? 'bg-white' : ''}`}>{selectedUsers.includes(user.username) && <Check className="w-3 h-3 text-black" />}</div><span className="text-sm text-zinc-300 cursor-pointer select-none">{user.displayName}</span></div>))}</div></div>
                </>
              )}
              <DialogFooter className="pt-8 border-t border-zinc-900 gap-4"><Button type="button" variant="ghost" onClick={() => setModalState({ ...modalState, isOpen: false })} className="hover:bg-zinc-900 hover:text-white text-zinc-500 rounded-md uppercase text-xs tracking-widest h-12 px-6 font-bold">Cancelar</Button><Button type="submit" className="bg-white text-zinc-950 hover:bg-zinc-200 rounded-md uppercase text-xs font-bold tracking-widest h-12 px-8 shadow-lg shadow-white/5">Salvar</Button></DialogFooter>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LegacyHome({ currentUser, dailyPhrase, megaSenaNumbers, projects, setModalState, handleAccessProject, handleDeleteProject, isLoading, connectionError }) {
  const currentDate = useMemo(() => new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), []);
  const activeProjects = useMemo(() => projects.filter(p => !p.isArchived), [projects]);
  const myPendingTasks = useMemo(() => {
    const tasks = [];
    if(!currentUser) return [];
    projects.forEach(proj => {
      proj.subProjects?.forEach(sub => {
        sub.boardData?.kanban?.lists?.forEach(list => {
          list.tasks?.forEach(task => { if (task.responsibleUsers?.includes(currentUser.username) && list.title !== 'CONCLUÍDO') tasks.push({ ...task, projectName: proj.name, subProjectName: sub.name, source: 'Kanban', status: list.title }); });
        });
        sub.boardData?.todo?.lists?.forEach(list => {
           list.tasks?.forEach(task => { if (task.responsibleUsers?.includes(currentUser.username) && list.title !== 'Concluído') tasks.push({ ...task, projectName: proj.name, subProjectName: sub.name, source: 'Lista', status: list.title }); });
        });
      });
    });
    return tasks;
  }, [projects, currentUser]);

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-24">
      <div className="border-b border-zinc-900 pb-8 mb-10 flex flex-col xl:flex-row xl:items-center justify-between gap-8">
        <div className="flex flex-col"><h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tight leading-none mb-3">Olá, <span className="text-zinc-700">{currentUser?.displayName}</span></h1><p className="text-sm text-zinc-500 font-mono tracking-[0.2em] uppercase">{currentDate}</p></div>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-8 xl:gap-12 border-l border-zinc-900 xl:pl-12 md:pl-8 py-2">
            <div className="flex flex-col max-w-lg"><div className="flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4 text-red-600" /><span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-bold">Sorte do Dia</span></div><p className="text-base md:text-lg text-zinc-300 font-light italic leading-relaxed">"{dailyPhrase}"</p></div>
            <div className="hidden md:block w-px h-12 bg-zinc-900"></div>
            <div className="flex flex-col"><div className="flex items-center gap-2 mb-3"><Dna className="w-4 h-4 text-emerald-600" /><span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-bold">Probabilidade</span></div><div className="flex gap-2">{megaSenaNumbers.map(n => (<div key={n} className="w-8 h-8 flex items-center justify-center border border-zinc-800 text-zinc-400 font-mono text-xs font-bold bg-zinc-950 hover:border-emerald-900 hover:text-emerald-500 transition-colors cursor-default">{n.toString().padStart(2, '0')}</div>))}</div></div>
        </div>
      </div>
      {currentUser?.displayName === 'Fran' && <SudokuGame />}
      {myPendingTasks.length > 0 && (
        <div className="space-y-4">
           <div className="flex items-center gap-2 pb-2 border-b border-zinc-900"><ListTodo className="w-4 h-4 text-red-600" /><h2 className="text-sm font-bold text-zinc-500 uppercase tracking-[0.2em]">Minhas Tarefas Pendentes</h2></div>
           <div className="bg-black border border-zinc-900">{myPendingTasks.map((task, idx) => (<div key={`${task.id}-${idx}`} className="flex flex-col md:flex-row md:items-center justify-between p-4 border-b border-zinc-900 last:border-0 hover:bg-zinc-950/50 transition-colors gap-4"><div className="flex flex-col gap-1"><span className="text-white font-bold text-base uppercase">{task.title}</span><div className="flex items-center gap-2 text-xs text-zinc-600 font-mono"><span>{task.projectName}</span><span>/</span><span>{task.subProjectName}</span><span className="text-zinc-800">|</span><span className="text-zinc-500 uppercase">{task.status}</span></div></div><div className="flex items-center gap-6">{task.priority === 'high' && <span className="text-[10px] uppercase font-bold text-red-600 border border-red-900/30 px-2 py-1 bg-red-950/10">Alta Prioridade</span>}{task.endDate && (<div className="flex items-center gap-2 text-zinc-500 text-xs font-mono"><Calendar className="w-3 h-3" />{new Date(task.endDate).toLocaleDateString()}</div>)}<Button variant="ghost" size="sm" className="h-8 text-[10px] uppercase tracking-widest text-zinc-600 hover:text-white" onClick={() => handleAccessProject({ id: task.projectId }, 'project')}>Ver</Button></div></div>))}</div>
        </div>
      )}
      <div className="space-y-6">
        <div className="flex justify-between items-end pb-4 border-b border-zinc-900"><h2 className="text-sm font-bold text-zinc-500 uppercase tracking-[0.2em] mb-1">Projetos Ativos</h2><Button onClick={() => setModalState({ type: 'project', mode: 'create', isOpen: true })} className="bg-white hover:bg-zinc-200 text-zinc-950 h-10 px-6 text-xs uppercase font-black tracking-widest rounded-none shadow-none"><Plus className="mr-2 h-4 w-4" /> Novo Projeto</Button></div>
        
        {/* NEW LOGIC: Connection Error vs Empty State */}
        {connectionError && (
          <div className="border border-red-900/50 bg-red-950/10 p-6 flex flex-col items-center justify-center text-center gap-2">
            <WifiOff className="w-8 h-8 text-red-600 mb-2" />
            <h3 className="text-lg font-bold text-red-500 uppercase tracking-widest">Erro de Conexão</h3>
            <p className="text-zinc-500 text-xs font-mono max-w-md">Não foi possível conectar ao servidor. Exibindo apenas dados locais (se houver).</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 opacity-50">
            <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-zinc-600 font-mono uppercase tracking-widest text-xs">Carregando seus projetos...</p>
          </div>
        ) : activeProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 opacity-20"><h1 className="text-6xl font-black text-zinc-800 uppercase tracking-tighter">VAZIO</h1><p className="text-zinc-600 font-mono uppercase tracking-widest mt-4">Nenhum projeto iniciado</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-l border-zinc-900">
            {activeProjects.map(project => {
              const colors = COLOR_VARIANTS[project.color] || COLOR_VARIANTS['blue'];
              return (
                <div key={project.id} draggable={true} onClick={() => handleAccessProject(project)} className="group relative aspect-video border-r border-b border-zinc-900 bg-black hover:bg-zinc-950 transition-all cursor-pointer p-8 flex flex-col justify-between">
                  <div className="flex justify-between items-start w-full"><div className={`w-3 h-3 ${colors.bg}`}></div>{project.isProtected && <Lock className="w-4 h-4 text-zinc-800" />}</div>
                  <div className="space-y-3 relative z-10"><h3 className="text-3xl font-black text-white uppercase tracking-tight leading-none group-hover:translate-x-1 transition-transform">{project.name}</h3><p className="text-zinc-500 text-xs font-mono leading-relaxed line-clamp-2 uppercase tracking-wide">{project.description || "SEM DESCRIÇÃO"}</p></div>
                  <div className="flex justify-between items-end opacity-40 group-hover:opacity-100 transition-opacity"><span className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest font-bold">{project.subProjects?.length || 0} ÁREAS</span><DropdownMenu><DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-700 hover:text-white rounded-none"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="bg-black border-zinc-800 rounded-none"><DropdownMenuItem onClick={e => { e.stopPropagation(); setModalState({ type: 'project', mode: 'edit', isOpen: true, data: project }); }} className="text-xs uppercase tracking-widest h-10 cursor-pointer font-medium">Editar</DropdownMenuItem><DropdownMenuItem className="text-red-900 focus:text-red-600 focus:bg-zinc-900 text-xs uppercase tracking-widest cursor-pointer h-10 font-medium" onClick={e => { e.stopPropagation(); handleDeleteProject(project); }}>Eliminar</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function LegacyProjectView({ currentProject, setCurrentView, setModalState, handleAccessProject, handleDeleteProject }) {
  const activeSubProjects = useMemo(() => {
    return currentProject?.subProjects?.filter(s => !s.isArchived) || [];
  }, [currentProject]);

  if (!currentProject) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-24">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setCurrentView('home')} className="border-zinc-800 bg-black hover:bg-zinc-900 text-zinc-500 hover:text-white rounded-none h-10 px-5 uppercase text-xs font-bold tracking-widest">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
        </div>
        <div className="border border-zinc-900 bg-black/60 p-8 text-center">
          <h2 className="text-xl font-bold text-white uppercase tracking-widest">Projeto indisponível</h2>
          <p className="mt-2 text-xs text-zinc-500 font-mono uppercase tracking-widest">Selecione um projeto válido para continuar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="flex flex-col gap-8 border-b border-zinc-900 pb-8">
        <div className="flex justify-between items-center">
           <Button variant="outline" onClick={() => setCurrentView('home')} className="border-zinc-800 bg-black hover:bg-zinc-900 text-zinc-500 hover:text-white rounded-none h-10 px-5 uppercase text-xs font-bold tracking-widest"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
           <Button onClick={() => setModalState({ type: 'subProject', mode: 'create', isOpen: true })} className="bg-white hover:bg-zinc-200 text-black rounded-none uppercase text-xs font-bold tracking-widest h-10 px-6"><Plus className="mr-2 h-4 w-4" /> Nova Área</Button>
        </div>
        <div><h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter flex items-center gap-4">{currentProject.name} {currentProject.isProtected && <Lock className="h-8 w-8 text-zinc-800"/>}</h1><p className="text-zinc-500 text-sm font-mono uppercase tracking-widest mt-4 max-w-2xl leading-relaxed">{currentProject.description}</p></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-900 border border-zinc-900">
        {activeSubProjects.map(sub => {
          const colors = COLOR_VARIANTS[sub.color] || COLOR_VARIANTS['zinc'] || COLOR_VARIANTS['blue'];
          return (
            <div key={sub.id} onClick={() => handleAccessProject(sub, 'subproject')} className="group cursor-pointer bg-black hover:bg-zinc-950 transition-colors p-8 flex flex-col justify-between h-64">
              <div className="flex justify-between items-start"><FolderOpen className={`h-6 w-6 ${colors.text} opacity-50 group-hover:opacity-100 transition-opacity`} /><DropdownMenu><DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-800 hover:text-white rounded-none"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="bg-black border-zinc-800 rounded-none"><DropdownMenuItem onClick={e => { e.stopPropagation(); setModalState({ type: 'subProject', mode: 'edit', isOpen: true, data: sub }); }} className="text-xs uppercase tracking-widest h-10 cursor-pointer font-medium">Editar</DropdownMenuItem><DropdownMenuItem className="text-red-900 focus:text-red-600 text-xs uppercase tracking-widest h-10 cursor-pointer font-medium" onClick={e => { e.stopPropagation(); handleDeleteProject(sub, true); }}>Excluir</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
              <div><CardTitle className="text-2xl font-bold uppercase tracking-tight text-white mb-2">{sub.name}</CardTitle><span className="text-zinc-600 text-xs font-mono uppercase tracking-widest line-clamp-2 leading-relaxed">{sub.description || "---"}</span></div>
            </div>
          );
        })}
        <div onClick={() => setModalState({ type: 'subProject', mode: 'create', isOpen: true })} className="bg-black flex flex-col items-center justify-center cursor-pointer group hover:bg-zinc-900/30 transition-colors h-64"><Plus className="h-8 w-8 text-zinc-800 group-hover:text-zinc-500 mb-3 transition-colors" /><span className="text-xs font-mono uppercase tracking-widest text-zinc-800 group-hover:text-zinc-500 font-bold">Adicionar Área</span></div>
      </div>
    </div>
  );
}

function LegacyBoard({ data, entityName, enabledTabs, currentBoardType, setCurrentBoardType, currentSubProject, currentProject, setCurrentView, setModalState, handleTaskAction, isFileDragging, setIsFileDragging, handleFileDrop, isUploading, handleFileUploadWithFeedback, files, handleDeleteFile }) {
  const handleDragStart = (e, item, type, sourceId) => { e.dataTransfer.setData("text/plain", JSON.stringify({ id: item.id, type, sourceId })); };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 border-b border-zinc-900 pb-6 gap-6">
        <div className="flex items-center gap-6"><Button variant="ghost" size="sm" onClick={() => setCurrentView(currentSubProject ? 'project' : 'home')} className="text-zinc-500 hover:text-white uppercase text-xs font-bold tracking-widest rounded-none px-0"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button><h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight">{entityName}</h2></div>
        <div className="flex gap-6 border-b border-transparent">
            {enabledTabs.includes('kanban') && <button onClick={() => setCurrentBoardType('kanban')} className={`rounded-none uppercase text-xs font-bold tracking-widest h-10 px-2 transition-colors ${currentBoardType === 'kanban' ? 'text-white border-b-2 border-red-600' : 'text-zinc-600 hover:text-zinc-400'}`}>Kanban</button>}
            {enabledTabs.includes('todo') && <button onClick={() => setCurrentBoardType('todo')} className={`rounded-none uppercase text-xs font-bold tracking-widest h-10 px-2 transition-colors ${currentBoardType === 'todo' ? 'text-white border-b-2 border-red-600' : 'text-zinc-600 hover:text-zinc-400'}`}>Lista</button>}
            {enabledTabs.includes('files') && <button onClick={() => setCurrentBoardType('files')} className={`rounded-none uppercase text-xs font-bold tracking-widest h-10 px-2 transition-colors ${currentBoardType === 'files' ? 'text-white border-b-2 border-red-600' : 'text-zinc-600 hover:text-zinc-400'}`}>Arquivos</button>}
        </div>
      </div>
      <div className="flex-1 overflow-hidden relative bg-black">
        <div className="absolute inset-0 overflow-auto pr-4 pb-10">
          {currentBoardType === 'kanban' && (
            <div className="flex h-full gap-0 border-l border-zinc-900 min-w-max">
              {data.lists ? data.lists.map(list => (
                <div key={list.id} className="w-80 flex flex-col h-full bg-black border-r border-zinc-900" onDragOver={e => e.preventDefault()}>
                  <div className="p-6 border-b border-zinc-900 flex justify-between items-center bg-zinc-950/30"><span className="font-bold text-xs uppercase tracking-[0.2em] text-zinc-400">{list.title}</span><span className="text-zinc-600 text-xs font-mono font-bold">{(list.tasks?.length ?? 0).toString().padStart(2, '0')}</span></div>
                  <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar bg-black">{list.tasks?.map(task => (<div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task, 'task', list.id)} onClick={() => setModalState({ type: 'task', mode: 'edit', isOpen: true, data: task, listId: list.id })} className={`bg-zinc-950 border border-zinc-900 hover:border-zinc-700 cursor-grab active:cursor-grabbing p-5 group transition-all shadow-sm`}><div className="flex justify-between items-start mb-3"><span className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors uppercase leading-tight tracking-tight">{task.title}</span>{task.priority === 'high' && <div className="h-1.5 w-1.5 bg-red-600 shrink-0 mt-1" />}</div><div className="flex items-center justify-between pt-3 border-t border-zinc-900/50 mt-1">{task.responsibleUsers?.length > 0 && <ResponsibleUsersButton users={task.responsibleUsers} />}{task.endDate && <span className="text-[10px] text-zinc-500 font-mono font-bold">{new Date(task.endDate).toLocaleDateString().slice(0,5)}</span>}</div></div>))}<Button variant="ghost" className="w-full border border-dashed border-zinc-900 text-zinc-600 hover:text-white hover:bg-zinc-950 rounded-none h-12 uppercase text-xs tracking-widest font-bold" onClick={() => setModalState({ type: 'task', mode: 'create', isOpen: true, data: { listId: list.id } })}><Plus className="h-4 w-4 mr-2" /> Adicionar Item</Button></div>
                </div>
              )) : <div className="p-8 text-zinc-500 text-sm">Nenhum dado encontrado para este quadro.</div>}
            </div>
          )}
          {currentBoardType === 'todo' && (
            <div className="max-w-5xl mx-auto space-y-12 pt-4">
              {data.lists ? data.lists.map(list => (
                <div key={list.id} className="space-y-0"><h3 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.3em] mb-4 pl-4 border-l-4 border-red-600">{list.title}</h3><div className="bg-black border-t border-zinc-900">{list.tasks?.map(task => (<div key={task.id} className="p-4 flex items-center gap-5 border-b border-zinc-900 hover:bg-zinc-950/50 transition-colors group"><Checkbox checked={list.title === 'Concluído'} className="border-zinc-800 rounded-none w-5 h-5" /><div className="flex-1 cursor-pointer" onClick={() => setModalState({ type: 'task', mode: 'edit', isOpen: true, data: task, listId: list.id })}><p className="text-base font-medium text-zinc-300 group-hover:text-white transition-colors uppercase tracking-tight">{task.title}</p></div><div className="opacity-0 group-hover:opacity-100 flex items-center gap-6"><span className="text-xs font-mono uppercase text-zinc-600 font-bold tracking-wider">{task.priority === 'high' ? 'ALTA' : task.priority === 'medium' ? 'MÉDIA' : 'BAIXA'}</span><Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-700 hover:text-red-600 hover:bg-transparent rounded-none" onClick={() => handleTaskAction('delete', { taskId: task.id })}><Trash2 className="h-5 w-5" /></Button></div></div>))}<Button variant="ghost" className="w-full text-xs text-zinc-500 hover:text-white justify-start h-14 px-5 uppercase tracking-widest rounded-none hover:bg-zinc-950 font-bold" onClick={() => setModalState({ type: 'task', mode: 'create', isOpen: true, data: { listId: list.id } })}><Plus className="h-4 w-4 mr-3" /> Inserir Novo Item na Lista</Button></div></div>
              )) : <div className="p-8 text-zinc-500 text-sm">Lista não inicializada.</div>}
            </div>
          )}
          {currentBoardType === 'files' && (
            <div className={`min-h-[500px] relative transition-all duration-300 p-0 ${isFileDragging ? 'bg-zinc-950 border-2 border-dashed border-red-900' : ''}`} onDragOver={(e) => { e.preventDefault(); setIsFileDragging(true); }} onDragLeave={(e) => { e.preventDefault(); setIsFileDragging(false); }} onDrop={handleFileDrop}>
              {(isFileDragging || isUploading) && (<div className="absolute inset-0 flex items-center justify-center z-50 bg-black/90 backdrop-blur-sm">{isUploading ? (<div className="animate-pulse text-white text-sm uppercase tracking-widest font-bold">Carregando arquivos...</div>) : (<div className="text-center animate-pulse"><Upload className="w-12 h-12 text-white mx-auto mb-6" /><p className="text-white font-mono text-sm uppercase tracking-[0.5em] font-bold">Solte para Upload</p></div>)}</div>)}
              <div className="flex justify-between items-center bg-zinc-950 p-8 border-b border-zinc-900 mb-8"><div><h3 className="text-3xl font-black text-white uppercase tracking-tighter">Arquivos</h3><p className="text-zinc-600 text-xs font-mono uppercase tracking-widest mt-2">Arraste arquivos ou clique no botão</p></div><div className="relative"><Input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" multiple onChange={handleFileUploadWithFeedback} /><Button className="bg-white text-black hover:bg-zinc-200 uppercase tracking-widest text-xs font-bold rounded-none h-12 px-8"><Upload className="mr-3 h-4 w-4" /> Fazer Upload</Button></div></div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-px bg-zinc-900 border border-zinc-900">{(files || []).map(file => (<div key={file.id} className="bg-black hover:bg-zinc-950 transition-all group relative aspect-square flex flex-col items-center justify-center p-6"><div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20"><Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-600 hover:text-red-600 rounded-none" onClick={() => handleDeleteFile(file.id)}><Trash2 className="h-4 w-4" /></Button></div><div className="mb-4 opacity-50 group-hover:opacity-100 transition-opacity">{file.type?.includes('image') ? <Eye className="w-8 h-8 text-white"/> : <FileText className="w-8 h-8 text-white"/>}</div><p className="text-xs text-zinc-400 font-mono truncate w-full text-center group-hover:text-white transition-colors px-2">{file.name}</p><p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-2 font-bold">{formatFileSize(file.size)}</p></div>))}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- MAIN APP LOGIC ---

export default function App() {
  const [currentUser, setCurrentUser] = useState({ username: 'admin', pin: '1234', displayName: 'Admin', color: 'red', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YXZhdGFyfGVufDB8fDB8fHww' });
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [allUsers, setAllUsers] = useState([
    { username: 'admin', pin: '1234', displayName: 'Admin', color: 'red', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YXZhdGFyfGVufDB8fDB8fHww' },
    { username: 'fran', pin: '1234', displayName: 'Fran', color: 'purple', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8YXZhdGFyfGVufDB8fDB8fHww' } 
  ]);
  const [projects, setProjects] = useState([]);
  const [currentView, setCurrentView] = useState('home');
  const [currentProject, setCurrentProject] = useState(null);
  const [currentSubProject, setCurrentSubProject] = useState(null);
  const [currentBoardType, setCurrentBoardType] = useState('kanban');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [dailyPhrase, setDailyPhrase] = useState('');
  const [megaSenaNumbers, setMegaSenaNumbers] = useState([]);
  const [modalState, setModalState] = useState({ type: null, isOpen: false, data: null, mode: 'create' });
  
  // NEW STATES: Connection and Loading handling
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);

  const { files, handleFileUpload, isDragging, setIsDragging, handleDeleteFile } = useFiles(currentProject, currentSubProject, currentUser || {});

  // Função dedicada para carregar projetos com tratamento de erro e cache
  const loadUserProjects = useCallback(async (user) => {
    if (!user) return;
    setIsLoading(true);
    setConnectionError(false);
    
    let loadedFromSupabase = false;

    // 1. Tentar Supabase
    if (hasSupabaseConfig) {
      try {
        const { data, error } = await supabase.from('brickflow_data').select('*');
        
        if (error) {
           console.warn("Erro Supabase:", error);
           setConnectionError(true);
        } else if (data && data.length > 0 && Array.isArray(data[0].data)) {
          setProjects(data[0].data);
          loadedFromSupabase = true;
        } else {
           // Conectou mas está vazio
           setProjects([]);
           loadedFromSupabase = true;
        }
      } catch (err) {
        console.warn("Exceção Supabase:", err);
        setConnectionError(true);
      }
    } else {
        // Se não tiver config, trata como "erro de conexão" para efeitos de UI
        setConnectionError(true); 
    }

    // 2. Se falhou o Supabase, tenta Fallback LocalStorage 
    if (!loadedFromSupabase) {
        const userKey = user.userKey || `${user.username}-${user.pin}`;
        const localData = localStorage.getItem(`brickflow-projects-${userKey}`);
        
        if (localData) {
            try {
                setProjects(JSON.parse(localData));
            } catch (e) {
                console.error("Erro parsing local projects", e);
                setProjects([]);
            }
        } else {
            setProjects([]); // Começa vazio se não achar nada
        }
    }
    
    setIsLoading(false);
  }, []);

  // Inicialização
  useEffect(() => {
    const init = async () => {
      // Carregar User
      const savedUser = localStorage.getItem('brickflow-current-user');
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          setCurrentUser(user);
          setIsLoggedIn(true);
          await loadUserProjects(user);
        } catch (e) {
          localStorage.removeItem('brickflow-current-user');
          setIsLoading(false);
        }
      } else {
          setIsLoading(false);
      }
      
      // Carregar Users do banco (se houver)
      if (hasSupabaseConfig) {
         try {
             const { data } = await supabase.from('brickflow_users').select('*');
             if (data && data.length > 0) {
                setAllUsers(prev => {
                    const newUsers = [...prev];
                    data.forEach(u => {
                        const idx = newUsers.findIndex(nu => nu.username === u.username);
                        if (idx >= 0) newUsers[idx] = { ...newUsers[idx], ...u };
                        else newUsers.push(u);
                    });
                    return newUsers;
                });
             }
         } catch(e) { console.warn("Erro ao carregar usuários", e); }
      }
    };

    init();
    setDailyPhrase(absurdPhrases[Math.floor(Math.random() * absurdPhrases.length)]);
    setMegaSenaNumbers(generateMegaSenaNumbers());
  }, [loadUserProjects]);

  // Sync Automático (Salvar)
  useEffect(() => {
    if (!currentUser || isLoading) return; // Evita salvar durante o load

    const userKey = currentUser.userKey || `${currentUser.username}-${currentUser.pin}`;
    
    // Salva Local
    localStorage.setItem(`brickflow-projects-${userKey}`, JSON.stringify(projects));

    // Debounce para Salvar no Supabase
    const timeoutId = setTimeout(async () => {
        if (hasSupabaseConfig && !connectionError) {
            setIsSyncing(true);
            try {
                // Busca ID para update ou cria novo
                const { data: existing } = await supabase.from('brickflow_data').select('id').limit(1);
                const payload = { data: projects };
                
                if (existing && existing.length > 0) {
                    await supabase.from('brickflow_data').update(payload).eq('id', existing[0].id);
                } else {
                    await supabase.from('brickflow_data').insert(payload);
                }
            } catch(e) { console.warn("Erro ao salvar no Supabase", e); }
            setIsSyncing(false);
        }
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [projects, currentUser, isLoading, connectionError]);

  const handleLogin = (username, pin) => {
    // Procura no estado atual de usuários (que pode ter vindo do banco)
    const user = allUsers.find(u => u.username === username && u.pin === pin);
    if (user) {
        const userData = { ...user, userKey: `${user.username}-${user.pin}` };
        setCurrentUser(userData);
        setIsLoggedIn(true);
        localStorage.setItem('brickflow-current-user', JSON.stringify(userData));
        loadUserProjects(userData);
    } else {
        alert("Credenciais inválidas! (Tente: admin / 1234)");
    }
  };

  const handleUpdateUser = async (updatedUser) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('brickflow-current-user', JSON.stringify(updatedUser));
    setAllUsers(prev => prev.map(u => u.username === updatedUser.username ? updatedUser : u));
    if (hasSupabaseConfig) { 
        try {
            await supabase.from('brickflow_users').update({ avatar: updatedUser.avatar }).eq('username', updatedUser.username); 
        } catch(e) { console.warn("Erro ao atualizar avatar no banco", e); }
    }
  };

  const initializeBoardData = () => ({ todo: { lists: [{ id: 'l1', title: 'A FAZER', tasks: [] }, { id: 'l2', title: 'FAZENDO', tasks: [] }, { id: 'l3', title: 'FEITO', tasks: [] }] }, kanban: { lists: [{ id: 'k1', title: 'BACKLOG', tasks: [] }, { id: 'k2', title: 'EM PROGRESSO', tasks: [] }, { id: 'k3', title: 'CONCLUÍDO', tasks: [] }] }, files: { files: [] }, goals: { objectives: [] } });

  const handleSaveProject = (formData) => {
    const isEdit = modalState.mode === 'edit';
    const isSub = modalState.type === 'subProject';
    const selectedTabs = ALL_TABS.filter(tab => formData[`view_${tab.id}`] === 'on' || formData[`view_${tab.id}`] === true).map(t => t.id);
    const enabledTabs = selectedTabs.length > 0 ? selectedTabs : ['kanban'];
    const projectData = { name: formData.name, description: formData.description, color: formData.color, isProtected: formData.isProtected === 'on', password: formData.isProtected === 'on' ? formData.password : '', enabledTabs: enabledTabs };

    if (isEdit) {
        const targetId = modalState.data.id;
        const updatedProjects = projects.map(p => {
            if (p.id === targetId && !isSub) return { ...p, ...projectData };
            if (p.subProjects && p.subProjects.length > 0) { const updatedSubs = p.subProjects.map(sp => sp.id === targetId ? { ...sp, ...projectData } : sp); return { ...p, subProjects: updatedSubs }; }
            return p;
        });
        setProjects(updatedProjects);
    } else {
        const newItem = { id: generateId(isSub ? 'sub' : 'proj'), ...projectData, subProjects: [], createdAt: new Date().toISOString(), createdBy: currentUser.username, boardData: initializeBoardData(), isArchived: false };
        if (isSub) { const updatedProjects = projects.map(p => p.id === currentProject.id ? { ...p, subProjects: [...(p.subProjects || []), newItem] } : p); setProjects(updatedProjects); setCurrentProject(updatedProjects.find(p => p.id === currentProject.id)); } else { setProjects([...projects, newItem]); }
    }
    setModalState({ isOpen: false, type: null });
  };

  const handleTaskAction = (action, data) => {
    const isEdit = modalState.mode === 'edit';
    const updatedProjects = projects.map(p => {
        if (p.id !== currentProject.id) return p;
        const updateEntity = (entity) => {
            if (!entity.boardData) entity.boardData = initializeBoardData();
            const board = entity.boardData[currentBoardType];
            if (action === 'save') {
                if (isEdit) { board.lists = board.lists.map(l => ({ ...l, tasks: l.tasks.map(t => t.id === modalState.data.id ? { ...t, ...data } : t) })); } else { const listId = modalState.data?.listId || board.lists[0].id; board.lists = board.lists.map(l => l.id === listId ? { ...l, tasks: [...l.tasks, { id: generateId('task'), ...data }] } : l); }
            } else if (action === 'delete') { board.lists = board.lists.map(l => ({ ...l, tasks: l.tasks.filter(t => t.id !== data.taskId) })); }
            return entity;
        };
        if (currentView === 'subproject') { return { ...p, subProjects: p.subProjects.map(sp => sp.id === currentSubProject.id ? updateEntity(sp) : sp) }; }
        return updateEntity(p);
    });
    setProjects(updatedProjects);
    const newProj = updatedProjects.find(p => p.id === currentProject.id);
    if (currentView === 'subproject') { setCurrentSubProject(newProj.subProjects.find(s => s.id === currentSubProject.id)); } else { setCurrentProject(newProj); }
    if(action === 'save') setModalState({ isOpen: false, type: null });
  };

  const handleAccessProject = (item, type = 'project') => {
    if (type === 'project') {
      const targetProject = projects.find(project => project.id === item?.id) || item;
      if (!targetProject) return;
      setCurrentProject({ ...targetProject, subProjects: targetProject.subProjects || [] });
      setCurrentView('project');
      return;
    }
    const targetSubProject = item;
    if (!targetSubProject) return;
    setCurrentSubProject(targetSubProject);
    setCurrentView('subproject');
    setCurrentBoardType(targetSubProject.enabledTabs ? targetSubProject.enabledTabs[0] : 'kanban');
  };

  const handleDeleteProject = (item, isSub = false) => {
    if (!confirm(`Excluir "${item.name}"?`)) return;
    if (isSub) { const updatedProjects = projects.map(p => p.id === currentProject.id ? { ...p, subProjects: p.subProjects.filter(s => s.id !== item.id) } : p); setProjects(updatedProjects); setCurrentProject(updatedProjects.find(p => p.id === currentProject.id)); } else { setProjects(projects.filter(p => p.id !== item.id)); }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-black p-4">
        <Card className="w-full max-w-sm border-zinc-900 bg-black shadow-2xl rounded-none">
          <div className="p-8 space-y-6">
            <div className="text-center space-y-2"><h1 className="text-xl font-bold tracking-widest text-white uppercase">BrickFlow OS</h1><p className="text-xs text-zinc-600 font-mono uppercase tracking-widest">Acesso Restrito</p></div>
            <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.target); handleLogin(fd.get('username'), fd.get('pin')); }} className="space-y-4">
              <Input name="username" placeholder="ID (admin)" className="bg-zinc-950 border-zinc-800 rounded-none text-zinc-300 placeholder:text-zinc-700 h-12" required />
              <Input name="pin" type="password" placeholder="PIN (1234)" maxLength={4} className="bg-zinc-950 border-zinc-800 rounded-none text-center tracking-[0.5em] text-white placeholder:text-zinc-700 h-12" required />
              <Button type="submit" className="w-full bg-white text-black hover:bg-zinc-200 rounded-none uppercase text-sm font-bold tracking-widest h-12">Entrar</Button>
            </form>
          </div>
        </Card>
      </div>
    );
  }

  const currentEntity = currentView === 'subproject' ? currentSubProject : currentProject;
  const boardData = currentEntity?.boardData?.[currentBoardType] || initializeBoardData()[currentBoardType];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-red-900/50 selection:text-white overflow-hidden">
      <LegacyHeader currentView={currentView} setCurrentView={setCurrentView} currentProject={currentProject} isSyncing={isSyncing} currentUser={currentUser} handleSwitchUser={() => setIsLoggedIn(false)} handleLogout={() => { setIsLoggedIn(false); localStorage.removeItem('brickflow-current-user'); }} onOpenSettings={() => setShowSettingsModal(true)} />
      <main className="flex-1 container mx-auto p-0 md:p-8 pt-6 h-[calc(100vh-4rem)] overflow-hidden">
        <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
            {currentView === 'home' && (
                <LegacyHome 
                    currentUser={currentUser} 
                    dailyPhrase={dailyPhrase} 
                    megaSenaNumbers={megaSenaNumbers} 
                    projects={projects} 
                    setModalState={setModalState} 
                    handleAccessProject={handleAccessProject} 
                    handleDeleteProject={handleDeleteProject}
                    isLoading={isLoading} 
                    connectionError={connectionError}
                />
            )}
            {currentView === 'project' && (
              <LegacyProjectView
                currentProject={currentProject}
                setCurrentView={setCurrentView}
                setModalState={setModalState}
                handleAccessProject={handleAccessProject}
                handleDeleteProject={handleDeleteProject}
                COLOR_VARIANTS={COLOR_VARIANTS}
              />
            )}
            {currentView === 'subproject' && <LegacyBoard data={boardData} entityName={currentSubProject.name} enabledTabs={currentSubProject.enabledTabs || ['kanban', 'todo', 'files']} currentBoardType={currentBoardType} setCurrentBoardType={setCurrentBoardType} currentSubProject={currentSubProject} currentProject={currentProject} setCurrentView={setCurrentView} setModalState={setModalState} handleTaskAction={handleTaskAction} isFileDragging={isDragging} setIsFileDragging={setIsDragging} handleFileDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileUpload(e); }} isUploading={isUploading} handleFileUploadWithFeedback={handleFileUpload} files={files} handleDeleteFile={handleDeleteFile} />}
        </div>
      </main>
      <LegacyModal modalState={modalState} setModalState={setModalState} handlePasswordSubmit={() => {}} handleSaveProject={handleSaveProject} handleTaskAction={handleTaskAction} allUsers={allUsers} currentUser={currentUser} />
      <UserSettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} currentUser={currentUser} onUpdateUser={handleUpdateUser} />
    </div>
  );
}
