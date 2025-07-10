import { useState, useEffect, useCallback } from 'react';
import './App.css';
import logoImage from './assets/brickflowbranco.png';

// Constantes
const absurdPhrases = [
    "Hoje é um ótimo dia para conversar com suas plantas sobre seus planos de carreira.",
    "Lembre-se: o sucesso é como uma pizza de abacaxi - controverso, mas alguns adoram.",
    "Sua produtividade hoje será proporcional ao número de vezes que você piscar com o olho esquerdo.",
    "O universo conspira a seu favor, especialmente se você usar meias de cores diferentes.",
    "Hoje você descobrirá que a resposta para todos os seus problemas está no manual de instruções do micro-ondas.",
];
const generateMegaSenaNumbers = () => {
    const numbers = new Set();
    while (numbers.size < 6) {
        numbers.add(Math.floor(Math.random() * 60) + 1);
    }
    return Array.from(numbers).sort((a, b) => a - b);
};
const avatarOptions = ['👨‍💼', '👩‍💼', '👨‍💻', '👩‍💻', '😎', '🤓', '😊', '🤔', '😴', '🤯', '🥳', '🤠', '🐱', '🐶', '🐼', '🦊', '🐸', '🐧', '🦉', '🐨', '🦁', '🐯', '🐵', '🐺', '🦄', '🐙', '🦖', '🐢', '🍕', '🍔', '🌮', '🍩', '🧀', '🥑', '🍎', '🍌', '☕', '🍺', '🍷', '🥤', '🍪', '🥨', '🥯', '🧁', '💻', '📱', '⌚', '🖥️', '⌨️', '🖱️', '💾', '📀', '📎', '📌', '✂️', '📏', '📐', '🔍', '💡', '🔋', '🚀', '⭐', '🎯', '💎', '🏆', '🎪', '🎭', '🎨', '🎸', '🎺', '🎲', '🎮', '🎳', '⚽', '🏀', '🎾', '🌱', '🌸', '🌺', '🌻', '🌙', '☀️', '⚡', '🌈', '🔥', '💧', '🌪️', '❄️', '🌊', '🏔️', '🌋', '🌍', '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '✈️', '🚁', '🚂', '🚇', '🛸', '🚲', '🛴', '⛵', '🔮', '🎩', '🧙‍♂️', '🧙‍♀️', '🦸‍♂️', '🦸‍♀️', '🧚‍♂️', '🧚‍♀️', '👑', '💍', '🗿'];
const userColors = ['blue', 'red', 'green', 'purple', 'orange', 'cyan', 'pink', 'yellow'];

// --- ESTRUTURA DE DADOS COM NOMES EDITÁVEIS ---
const createInitialBoardData = () => [
    { id: `board-todo-${Date.now()}`, name: 'To-Do', type: 'lists', lists: [{ id: `list-1-${Date.now()}`, title: 'A Fazer', tasks: [] }, { id: `list-2-${Date.now()}`, title: 'Em Progresso', tasks: [] }, { id: `list-3-${Date.now()}`, title: 'Concluído', tasks: [] }] },
    { id: `board-kanban-${Date.now()}`, name: 'Kanban', type: 'lists', lists: [{ id: `list-k1-${Date.now()}`, title: 'Backlog', tasks: [] }, { id: `list-k2-${Date.now()}`, title: 'Desenvolvimento', tasks: [] }, { id: `list-k3-${Date.now()}`, title: 'Finalizado', tasks: [] }] },
    { id: `board-goals-${Date.now()}`, name: 'Metas', type: 'goals', objectives: [] },
    { id: `board-files-${Date.now()}`, name: 'Arquivos', type: 'files', files: [] }
];

const getInitialProjects = (userKey) => [
    {
        id: 'brick-adm', name: 'BRICK - ADM', description: 'Gestão administrativa e operacional', color: 'red', isProtected: true, password: 'Brick$2025-FGL', isArchived: false, createdBy: userKey,
        subProjects: [
            { id: 'rh-brick', name: 'Recursos Humanos', description: 'Gestão de pessoas e talentos', color: 'purple', isProtected: false, isArchived: false, createdBy: userKey, boardData: createInitialBoardData() },
            { id: 'financeiro-brick', name: 'Financeiro', description: 'Controle financeiro e orçamentário', color: 'green', isProtected: false, isArchived: false, createdBy: userKey, boardData: createInitialBoardData() }
        ],
        boardData: createInitialBoardData()
    },
    // ... outros projetos aqui
];


function App() {
    // Estados
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [projects, setProjects] = useState([]);
    const [currentView, setCurrentView] = useState('home');
    const [currentProject, setCurrentProject] = useState(null);
    const [currentSubProject, setCurrentSubProject] = useState(null);
    const [currentBoardId, setCurrentBoardId] = useState(null);
    const [editingListTitle, setEditingListTitle] = useState({ listId: null, boardId: null });
    const [draggedTask, setDraggedTask] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);
    const [showLoginModal, setShowLoginModal] = useState(true);
    const [showCreateUserModal, setShowCreateUserModal] = useState(false);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [targetListId, setTargetListId] = useState(null);
    const [dailyPhrase, setDailyPhrase] = useState('');
    const [megaSenaNumbers, setMegaSenaNumbers] = useState([]);
    const [showDropdown, setShowDropdown] = useState(null);
    const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });
    const [showNewProjectModal, setShowNewProjectModal] = useState(false);
    const [showEditProjectModal, setShowEditProjectModal] = useState(false);
    const [showNewSubProjectModal, setShowNewSubProjectModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [pendingProject, setPendingProject] = useState(null);
    const [editingProject, setEditingProject] = useState(null);
    const [allUsers, setAllUsers] = useState([]);

    // Configuração do Supabase
    const SUPABASE_URL = 'https://ujpvyslrosmismgbcczl.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqcHZ5c2xyb3NtaXNtZ2JjY3psIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NzU5MDgsImV4cCI6MjA2NjM1MTkwOH0.XkgwQ4VF7_7plt8-cw9VsatX4WwLolZEO6a6YtovUFs';

    // Função de atualização imutável
    const updateProjects = useCallback((updateFunction) => {
        setProjects(prev => updateFunction(JSON.parse(JSON.stringify(prev))));
    }, []);

    // Efeitos
    useEffect(() => {
        // Lógica de inicialização...
    }, []);

    useEffect(() => {
        if (currentSubProject?.boardData?.length > 0) {
            setCurrentBoardId(currentSubProject.boardData[0].id);
        } else {
            setCurrentBoardId(null);
        }
    }, [currentSubProject]);

    useEffect(() => {
        if (projects.length > 0 && isLoggedIn) {
            const timeoutId = setTimeout(() => { /* syncWithSupabase(projects) */ }, 500);
            return () => clearTimeout(timeoutId);
        }
    }, [projects, isLoggedIn]);

    // Lógica de Edição de Títulos
    const handleUpdateListTitle = (newTitle, boardId, listId) => {
        if (!newTitle.trim() || !listId || !boardId) {
            setEditingListTitle({ listId: null, boardId: null });
            return;
        }
        updateProjects(draft => {
            const project = draft.find(p => p.id === currentProject.id);
            const subProject = project?.subProjects.find(sp => sp.id === currentSubProject.id);
            const board = subProject?.boardData.find(b => b.id === boardId);
            const list = board?.lists.find(l => l.id === listId);
            if (list) {
                list.title = newTitle;
            }
            return draft;
        });
        setEditingListTitle({ listId: null, boardId: null });
    };

    // Obter dados do quadro atual
    const getCurrentBoardData = useCallback(() => {
        if (!currentSubProject || !currentBoardId) return null;
        return currentSubProject.boardData?.find(board => board.id === currentBoardId) || null;
    }, [currentSubProject, currentBoardId]);
    
    // Funções de Drag and Drop
    const handleDragStart = (e, task, listId) => { setDraggedTask({ task, sourceListId: listId }); };
    const handleDragEnter = (e, targetIndex) => { e.preventDefault(); setDragOverIndex(targetIndex); };
    const handleDragOver = (e) => e.preventDefault();
    const handleDragLeave = (e) => { e.preventDefault(); setDragOverIndex(null); };
    const handleDropOnList = (e, targetListId) => { e.preventDefault(); setDragOverIndex(null); handleDrop(e, targetListId); };
    const handleDrop = (e, targetListId) => {
        e.preventDefault();
        const currentBoard = getCurrentBoardData();
        if (!draggedTask || !currentBoard || currentBoard.type !== 'lists') return;

        const sourceListIndex = currentBoard.lists.findIndex(list => list.id === draggedTask.sourceListId);
        const targetListIndex = currentBoard.lists.findIndex(list => list.id === targetListId);
        if (sourceListIndex === -1 || targetListIndex === -1) return;

        const newBoardData = JSON.parse(JSON.stringify(currentBoard));
        const sourceList = newBoardData.lists[sourceListIndex];
        const taskIndex = sourceList.tasks.findIndex(t => t.id === draggedTask.task.id);
        if (taskIndex === -1) return;
        
        const [movedTask] = sourceList.tasks.splice(taskIndex, 1);
        const targetList = newBoardData.lists[targetListIndex];
        
        if (dragOverIndex !== null) {
            targetList.tasks.splice(dragOverIndex, 0, movedTask);
        } else {
            targetList.tasks.push(movedTask);
        }
        
        updateProjects(draft => {
            const project = draft.find(p => p.id === currentProject.id);
            const subProject = project?.subProjects.find(sp => sp.id === currentSubProject.id);
            if (subProject) {
                subProject.boardData = subProject.boardData.map(b => b.id === currentBoardId ? newBoardData : b);
            }
            return draft;
        });

        setDraggedTask(null);
        setDragOverIndex(null);
    };

    // Demais Handlers (lógica principal do seu app)
    const handleAddTask = (listId, taskData) => { /* ... sua lógica de add task aqui ... */ };
    const handleEditTask = (taskData) => { /* ... sua lógica de edit task aqui ... */ };
    const handleBack = () => { if (currentView === 'subproject') { setCurrentView('project'); setCurrentSubProject(null); } else if (currentView === 'project') { setCurrentView('home'); setCurrentProject(null); } };
    const handleAccessProject = (project) => { setCurrentProject(project); setCurrentView('project'); };
    const handleAccessSubProject = (subProject) => { setCurrentSubProject(subProject); setCurrentView('subproject'); };
    
    // ... todos os outros handlers que você tinha no seu arquivo funcional

    // Renderização
    const currentBoard = getCurrentBoardData();

    // JSX para o App
    return (
        <div className="app">
            {/* Se não estiver logado, mostre o modal de login */}
            {!isLoggedIn && (
                 <div className="modal-overlay">
                    <div className="modal">
                      <h2>🧱 Entrar no BrickFlow</h2>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.target);
                        // handleLogin(formData.get('username'), formData.get('pin'));
                        // Linha abaixo é para teste, REMOVA DEPOIS
                        setIsLoggedIn(true); setShowLoginModal(false);
                      }}>
                        <div className="form-group">
                          <label>Nome/Código:</label>
                          <input type="text" name="username" placeholder="Ex: JOAO" required />
                        </div>
                        <div className="form-group">
                          <label>PIN (4 dígitos):</label>
                          <input type="password" name="pin" placeholder="1234" maxLength="4" required />
                        </div>
                        <div className="modal-actions">
                          <button type="submit" className="btn-primary">Entrar</button>
                          <button type="button" className="btn-secondary" onClick={() => { setShowLoginModal(false); setShowCreateUserModal(true); }}>
                            Criar Usuário
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
            )}

            {isLoggedIn && (
                <>
                    <header className="main-header">
                        <div className="header-content">
                            <div className="header-left">
                                {currentView !== 'home' && (
                                    <button className="back-btn" onClick={handleBack}>← Voltar</button>
                                )}
                                <img src={logoImage} alt="BrickFlow" className="logo" />
                                <h1>{currentSubProject?.name || currentProject?.name || 'BrickFlow'}</h1>
                            </div>
                            <div className="header-right">
                                {/* ... user info e botões de ação do header ... */}
                            </div>
                        </div>
                    </header>
                    <main className="main-content">
                        {currentView === 'home' && (
                            <div className="projects-grid">
                                {projects.map(project => (
                                    <div key={project.id} className={`project-card color-${project.color}`} onClick={() => handleAccessProject(project)}>
                                        <h3>{project.name}</h3>
                                        <p>{project.description}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {currentView === 'project' && currentProject && (
                            <div className="subprojects-grid">
                                {currentProject.subProjects.map(subProject => (
                                    <div key={subProject.id} className={`project-card color-${subProject.color}`} onClick={() => handleAccessSubProject(subProject)}>
                                        <h3>{subProject.name}</h3>
                                        <p>{subProject.description}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {currentView === 'subproject' && currentSubProject && (
                            <div className="subproject-view">
                                <div className="board-type-selector">
                                    {currentSubProject.boardData?.map(board => (
                                        <button key={board.id} className={`board-type-btn ${currentBoardId === board.id ? 'active' : ''}`} onClick={() => setCurrentBoardId(board.id)}>
                                            {board.name}
                                        </button>
                                    ))}
                                </div>
                                <div className="board-content">
                                    {currentBoard?.type === 'lists' && (
                                        <div className="lists-container">
                                            {currentBoard.lists.map(list => (
                                                <div key={list.id} className="list" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={(e) => handleDropOnList(e, list.id)}>
                                                    <div className="list-header">
                                                        {editingListTitle.listId === list.id ? (
                                                            <input
                                                                type="text"
                                                                defaultValue={list.title}
                                                                autoFocus
                                                                onBlur={(e) => handleUpdateListTitle(e.target.value, currentBoard.id, list.id)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') handleUpdateListTitle(e.target.value, currentBoard.id, list.id);
                                                                    if (e.key === 'Escape') setEditingListTitle({ listId: null, boardId: null });
                                                                }}
                                                                className="list-title-input"
                                                            />
                                                        ) : (
                                                            <h3 onClick={() => setEditingListTitle({ listId: list.id, boardId: currentBoard.id })}>{list.title}</h3>
                                                        )}
                                                        <span className="task-count">{list.tasks?.length || 0}</span>
                                                        <button className="btn-add-task" onClick={() => { setTargetListId(list.id); setShowTaskModal(true); }}>+</button>
                                                    </div>
                                                    <div className="tasks-container">
                                                        {list.tasks.map((task, index) => (
                                                            <div key={task.id} className={`task-card ${task.completed ? 'completed' : ''}`} draggable onDragStart={(e) => handleDragStart(e, task, list.id)} onDragEnter={(e) => handleDragEnter(e, index)} onClick={() => { setEditingTask(task); setShowTaskModal(true); }}>
                                                                <h4>{task.title}</h4>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </main>
                    {/* ... O resto dos seus modais ... */}
                </>
            )}
        </div>
    );
}

export default App;