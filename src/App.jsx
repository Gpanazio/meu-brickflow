import { useState, useEffect, useCallback } from 'react';
import './App.css';
import logoImage from './assets/brickflowbranco.png';

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
  "Lembre-se: você é como um post-it - pequeno, colorido e essencial para manter tudo organizado."
];

// Função para gerar números da Mega Sena
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

// Avatares disponíveis (expandido com opções absurdas)
const avatarOptions = [
  // Profissionais clássicos
  '👨‍💼', '👩‍💼', '👨‍💻', '👩‍💻', '👨‍🎨', '👩‍🎨', 
  '👨‍🔧', '👩‍🔧', '👨‍⚕️', '👩‍⚕️', '👨‍🏫', '👩‍🏫',
  '🧑‍💼', '🧑‍💻', '🧑‍🎨', '🧑‍🔧', '🧑‍⚕️', '🧑‍🏫',
  
  // Clássicos com atitude
  '😎', '🤓', '😊', '🤔', '😴', '🤯', '🥳', '🤠',
  
  // Animais profissionais
  '🐱', '🐶', '🐼', '🦊', '🐸', '🐧', '🦉', '🐨',
  '🦁', '🐯', '🐵', '🐺', '🦄', '🐙', '🦖', '🐢',
  
  // Comida executiva
  '🍕', '🍔', '🌮', '🍩', '🧀', '🥑', '🍎', '🍌',
  '☕', '🍺', '🍷', '🥤', '🍪', '🥨', '🥯', '🧁',
  
  // Objetos de escritório absurdos
  '💻', '📱', '⌚', '🖥️', '⌨️', '🖱️', '💾', '📀',
  '📎', '📌', '✂️', '📏', '📐', '🔍', '💡', '🔋',
  
  // Símbolos motivacionais
  '🚀', '⭐', '🎯', '💎', '🏆', '🎪', '🎭', '🎨',
  '🎸', '🎺', '🎲', '🎮', '🎳', '⚽', '🏀', '🎾',
  
  // Natureza zen
  '🌱', '🌸', '🌺', '🌻', '🌙', '☀️', '⚡', '🌈',
  '🔥', '💧', '🌪️', '❄️', '🌊', '🏔️', '🌋', '🌍',
  
  // Transportes executivos
  '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑',
  '✈️', '🚁', '🚂', '🚇', '🛸', '🚲', '🛴', '⛵',
  
  // Místicos corporativos
  '🔮', '🎩', '🧙‍♂️', '🧙‍♀️', '🦸‍♂️', '🦸‍♀️', '🧚‍♂️', '🧚‍♀️',
  '👑', '💍', '🗿', '🎪', '🎭', '🎨', '🎯', '🎲'
];

// Cores disponíveis para usuários
const userColors = [
  'blue', 'red', 'green', 'purple', 'orange', 'cyan', 'pink', 'yellow'
];

// Dados iniciais dos projetos com estruturas separadas por tipo
const getInitialProjects = () => [
  {
    id: 'brick-adm',
    name: 'BRICK - ADM',
    description: 'Gestão administrativa e operacional',
    color: 'red',
    isProtected: true,
    password: 'Brick$2025-FGL',
    archived: { tasks: [], goals: [] },
    isArchived: false,
    createdBy: null, // Será definido quando criado
    subProjects: [
      {
        id: 'rh-brick',
        name: 'Recursos Humanos',
        description: 'Gestão de pessoas e talentos',
        color: 'purple',
        isProtected: false,
        archived: { tasks: [], goals: [] },
        isArchived: false,
        createdBy: null,
        // Estruturas separadas por tipo de quadro
        boardData: {
          todo: {
            lists: [
              { id: 'todo-1', title: 'A Fazer', tasks: [] },
              { id: 'todo-2', title: 'Em Progresso', tasks: [] },
              { id: 'todo-3', title: 'Concluído', tasks: [] }
            ]
          },
          kanban: {
            lists: [
              { id: 'kanban-1', title: 'Potenciais', tasks: [] },
              { id: 'kanban-2', title: 'Enviados', tasks: [] },
              { id: 'kanban-3', title: 'Negados', tasks: [] }
            ]
          },
          timeline: {
            periods: [
              { id: 'timeline-1', title: 'Janeiro 2025', tasks: [] },
              { id: 'timeline-2', title: 'Fevereiro 2025', tasks: [] },
              { id: 'timeline-3', title: 'Março 2025', tasks: [] }
            ]
          },
          goals: {
            objectives: []
          }
        }
      },
      {
        id: 'financeiro-brick',
        name: 'Financeiro',
        description: 'Controle financeiro e orçamentário',
        color: 'green',
        isProtected: false,
        archived: { tasks: [], goals: [] },
        isArchived: false,
        createdBy: null,
        boardData: {
          todo: {
            lists: [
              { id: 'todo-1', title: 'A Fazer', tasks: [] },
              { id: 'todo-2', title: 'Em Progresso', tasks: [] },
              { id: 'todo-3', title: 'Concluído', tasks: [] }
            ]
          },
          kanban: {
            lists: [
              { id: 'kanban-1', title: 'Pendente', tasks: [] },
              { id: 'kanban-2', title: 'Em Análise', tasks: [] },
              { id: 'kanban-3', title: 'Aprovado', tasks: [] }
            ]
          },
          timeline: {
            periods: [
              { id: 'timeline-1', title: 'Q1 2025', tasks: [] },
              { id: 'timeline-2', title: 'Q2 2025', tasks: [] },
              { id: 'timeline-3', title: 'Q3 2025', tasks: [] }
            ]
          },
          goals: {
            objectives: []
          }
        }
      }
    ],
    boardData: {
      todo: {
        lists: [
          { id: 'todo-1', title: 'A Fazer', tasks: [] },
          { id: 'todo-2', title: 'Em Progresso', tasks: [] },
          { id: 'todo-3', title: 'Concluído', tasks: [] }
        ]
      },
      kanban: {
        lists: [
          { id: 'kanban-1', title: 'A Fazer', tasks: [] },
          { id: 'kanban-2', title: 'Em Progresso', tasks: [] },
          { id: 'kanban-3', title: 'Concluído', tasks: [] }
        ]
      },
      timeline: {
        periods: [
          { id: 'timeline-1', title: 'Janeiro 2025', tasks: [] },
          { id: 'timeline-2', title: 'Fevereiro 2025', tasks: [] },
          { id: 'timeline-3', title: 'Março 2025', tasks: [] }
        ]
      },
      goals: {
        objectives: []
      }
    }
  },
  {
    id: 'originais-brick',
    name: 'ORIGINAIS BRICK',
    description: 'Desenvolvimento de produtos originais',
    color: 'blue',
    isProtected: false,
    archived: { tasks: [], goals: [] },
    isArchived: false,
    createdBy: null,
    subProjects: [
      {
        id: 'design-produtos',
        name: 'Design de Produtos',
        description: 'Criação e desenvolvimento de novos produtos',
        color: 'orange',
        isProtected: false,
        archived: { tasks: [], goals: [] },
        isArchived: false,
        createdBy: null,
        boardData: {
          todo: {
            lists: [
              { id: 'todo-1', title: 'A Fazer', tasks: [] },
              { id: 'todo-2', title: 'Em Progresso', tasks: [] },
              { id: 'todo-3', title: 'Concluído', tasks: [] }
            ]
          },
          kanban: {
            lists: [
              { id: 'kanban-1', title: 'Ideias', tasks: [] },
              { id: 'kanban-2', title: 'Prototipagem', tasks: [] },
              { id: 'kanban-3', title: 'Negados', tasks: [] }
            ]
          },
          timeline: {
            periods: [
              { id: 'timeline-1', title: 'Conceito', tasks: [] },
              { id: 'timeline-2', title: 'Desenvolvimento', tasks: [] },
              { id: 'timeline-3', title: 'Lançamento', tasks: [] }
            ]
          },
          goals: {
            objectives: []
          }
        }
      },
      {
        id: 'desenvolvimento-tecnico',
        name: 'Desenvolvimento Técnico',
        description: 'Implementação técnica dos produtos',
        color: 'cyan',
        isProtected: false,
        archived: { tasks: [], goals: [] },
        isArchived: false,
        createdBy: null,
        boardData: {
          todo: {
            lists: [
              { id: 'todo-1', title: 'A Fazer', tasks: [] },
              { id: 'todo-2', title: 'Em Progresso', tasks: [] },
              { id: 'todo-3', title: 'Concluído', tasks: [] }
            ]
          },
          kanban: {
            lists: [
              { id: 'kanban-1', title: 'Potenciais', tasks: [] },
              { id: 'kanban-2', title: 'Desenvolvimento', tasks: [] },
              { id: 'kanban-3', title: 'Deploy', tasks: [] }
            ]
          },
          timeline: {
            periods: [
              { id: 'timeline-1', title: 'Planejamento', tasks: [] },
              { id: 'timeline-2', title: 'Execução', tasks: [] },
              { id: 'timeline-3', title: 'Entrega', tasks: [] }
            ]
          },
          goals: {
            objectives: []
          }
        }
      }
    ],
    boardData: {
      todo: {
        lists: [
          { id: 'todo-1', title: 'A Fazer', tasks: [] },
          { id: 'todo-2', title: 'Em Progresso', tasks: [] },
          { id: 'todo-3', title: 'Concluído', tasks: [] }
        ]
      },
      kanban: {
        lists: [
          { id: 'kanban-1', title: 'Ideação', tasks: [] },
          { id: 'kanban-2', title: 'Desenvolvimento', tasks: [] },
          { id: 'kanban-3', title: 'Lançamento', tasks: [] }
        ]
      },
      timeline: {
        periods: [
          { id: 'timeline-1', title: 'Q1 2025', tasks: [] },
          { id: 'timeline-2', title: 'Q2 2025', tasks: [] },
          { id: 'timeline-3', title: 'Q3 2025', tasks: [] }
        ]
      },
      goals: {
        objectives: []
      }
    }
  },
  {
    id: 'comunicacao-brick',
    name: 'COMUNICAÇÃO BRICK',
    description: 'Marketing e comunicação da marca',
    color: 'green',
    isProtected: false,
    archived: { tasks: [], goals: [] },
    isArchived: false,
    createdBy: null,
    subProjects: [
      {
        id: 'marketing-digital',
        name: 'Marketing Digital',
        description: 'Estratégias digitais e redes sociais',
        color: 'pink',
        isProtected: false,
        archived: { tasks: [], goals: [] },
        isArchived: false,
        createdBy: null,
        boardData: {
          todo: {
            lists: [
              { id: 'todo-1', title: 'A Fazer', tasks: [] },
              { id: 'todo-2', title: 'Em Progresso', tasks: [] },
              { id: 'todo-3', title: 'Concluído', tasks: [] }
            ]
          },
          kanban: {
            lists: [
              { id: 'kanban-1', title: 'Planejamento', tasks: [] },
              { id: 'kanban-2', title: 'Produção', tasks: [] },
              { id: 'kanban-3', title: 'Publicado', tasks: [] }
            ]
          },
          timeline: {
            periods: [
              { id: 'timeline-1', title: 'Janeiro 2025', tasks: [] },
              { id: 'timeline-2', title: 'Fevereiro 2025', tasks: [] },
              { id: 'timeline-3', title: 'Março 2025', tasks: [] }
            ]
          },
          goals: {
            objectives: []
          }
        }
      }
    ],
    boardData: {
      todo: {
        lists: [
          { id: 'todo-1', title: 'A Fazer', tasks: [] },
          { id: 'todo-2', title: 'Em Progresso', tasks: [] },
          { id: 'todo-3', title: 'Concluído', tasks: [] }
        ]
      },
      kanban: {
        lists: [
          { id: 'kanban-1', title: 'Estratégia', tasks: [] },
          { id: 'kanban-2', title: 'Execução', tasks: [] },
          { id: 'kanban-3', title: 'Análise', tasks: [] }
        ]
      },
      timeline: {
        periods: [
          { id: 'timeline-1', title: 'Q1 2025', tasks: [] },
          { id: 'timeline-2', title: 'Q2 2025', tasks: [] },
          { id: 'timeline-3', title: 'Q3 2025', tasks: [] }
        ]
      },
      goals: {
        objectives: []
      }
    }
  }
];

function App() {
  // Estados do usuário
  const [currentUser, setCurrentUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Estados existentes
  const [projects, setProjects] = useState([]);
  const [currentView, setCurrentView] = useState('home');
  const [currentProject, setCurrentProject] = useState(null);
  const [currentSubProject, setCurrentSubProject] = useState(null);
  const [currentBoardType, setCurrentBoardType] = useState('kanban');
  const [showArchived, setShowArchived] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [showNewSubProjectModal, setShowNewSubProjectModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [pendingProject, setPendingProject] = useState(null);
  const [itemToArchive, setItemToArchive] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [targetListId, setTargetListId] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dailyPhrase, setDailyPhrase] = useState('');
  const [megaSenaNumbers, setMegaSenaNumbers] = useState([]);
  
  // Estados para dropdown de ações
  const [showDropdown, setShowDropdown] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });

  // Estado para forçar re-renderização
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Estados para drag and drop de projetos
  const [draggedProject, setDraggedProject] = useState(null);
  const [dragOverProject, setDragOverProject] = useState(null);
  
  // Estados para drag and drop de subprojetos
  const [draggedSubProject, setDraggedSubProject] = useState(null);
  const [dragOverSubProject, setDragOverSubProject] = useState(null);
  
  // Estado para drag and drop de tarefas com posição precisa
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Verificar se há usuário logado ao carregar
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
  }, []);

  // Gerar frase do dia e números da Mega Sena
  useEffect(() => {
    const randomPhrase = absurdPhrases[Math.floor(Math.random() * absurdPhrases.length)];
    const luckyNumbers = generateMegaSenaNumbers();
    setDailyPhrase(randomPhrase);
    setMegaSenaNumbers(luckyNumbers);
  }, []);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => {
      setShowDropdown(null);
    };
    
    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDropdown]);

  // Configuração do Supabase
  const SUPABASE_URL = 'https://ujpvyslrosmismgbcczl.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqcHZ5c2xyb3NtaXNtZ2JjY3psIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NzU5MDgsImV4cCI6MjA2NjM1MTkwOH0.XkgwQ4VF7_7plt8-cw9VsatX4WwLolZEO6a6YtovUFs';

  // Estados para arquivos
  const [files, setFiles] = useState([]);
  const [showFileModal, setShowFileModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Estados para usuários
  const [allUsers, setAllUsers] = useState([]);

  // Funções para gerenciar usuários no Supabase
  const saveUserToSupabase = async (userData) => {
    try {
      console.log('💾 Salvando usuário no Supabase:', userData);
      
      // Verificar se usuário já existe
      const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/brickflow_users?username=eq.${userData.username}`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      
      if (checkResponse.ok) {
        const existingUsers = await checkResponse.json();
        if (existingUsers.length > 0) {
          // Usuário já existe, atualizar
          const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/brickflow_users?username=eq.${userData.username}`, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              displayName: userData.displayName,
              avatar: userData.avatar,
              color: userData.color,
              pin: userData.pin
            })
          });
          
          if (updateResponse.ok) {
            console.log('✅ Usuário atualizado no Supabase');
          }
        } else {
          // Criar novo usuário - enviar apenas campos que existem na tabela
          const userDataForSupabase = {
            username: userData.username,
            displayName: userData.displayName,
            avatar: userData.avatar,
            color: userData.color,
            pin: userData.pin
          };
          
          console.log('📤 Dados enviados para Supabase:', userDataForSupabase);
          
          const createResponse = await fetch(`${SUPABASE_URL}/rest/v1/brickflow_users`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(userDataForSupabase)
          });
          
          if (createResponse.ok) {
            console.log('✅ Usuário criado no Supabase');
          } else {
            const errorText = await createResponse.text();
            console.log('❌ Erro ao criar usuário:', createResponse.status, errorText);
          }
        }
      }
    } catch (error) {
      console.log('⚠️ Erro ao salvar usuário no Supabase:', error.message);
    }
  };

  const loadUsersFromSupabase = async () => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/brickflow_users`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      
      if (response.ok) {
        const users = await response.json();
        console.log('✅ Usuários carregados do Supabase:', users);
        return users;
      }
    } catch (error) {
      console.log('⚠️ Erro ao carregar usuários do Supabase:', error.message);
    }
    return [];
  };

  // Funções para gerenciar arquivos no Supabase
  const saveFileToSupabase = async (fileData) => {
    try {
      console.log('📁 Salvando arquivo no Supabase:', fileData.name);
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/brickflow_files`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fileData)
      });
      
      if (response.ok) {
        console.log('✅ Arquivo salvo no Supabase');
        loadFilesFromSupabase();
      }
    } catch (error) {
      console.log('⚠️ Erro ao salvar arquivo no Supabase:', error.message);
    }
  };

  const loadFilesFromSupabase = async () => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/brickflow_files?order=created_at.desc`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      
      if (response.ok) {
        const filesData = await response.json();
        setFiles(filesData);
        console.log('✅ Arquivos carregados do Supabase:', filesData.length);
      }
    } catch (error) {
      console.log('⚠️ Erro ao carregar arquivos do Supabase:', error.message);
    }
  };

  const deleteFileFromSupabase = async (fileId) => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/brickflow_files?id=eq.${fileId}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      
      if (response.ok) {
        console.log('✅ Arquivo deletado do Supabase');
        loadFilesFromSupabase();
      }
    } catch (error) {
      console.log('⚠️ Erro ao deletar arquivo do Supabase:', error.message);
    }
  };

  // Carregar arquivos ao entrar em um sub-projeto
  useEffect(() => {
    if (currentSubProject) {
      loadFilesFromSupabase();
    }
  }, [currentSubProject]);

  // Carregar projetos compartilhados (Supabase + fallback localStorage)
  const loadUserProjects = useCallback(async (userKey) => {
    try {
      // Tentar carregar do Supabase
      const response = await fetch(`${SUPABASE_URL}/rest/v1/brickflow_data`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0 && data[0].data) {
          setProjects(data[0].data);
          console.log('✅ Projetos carregados do Supabase:', data[0].data);
          return;
        }
      }
    } catch (error) {
      console.log('⚠️ Erro ao carregar do Supabase:', error.message);
    }

    // Fallback: localStorage
    const savedProjects = localStorage.getItem(`brickflow-projects-${userKey}`);
    if (savedProjects) {
      const parsedProjects = JSON.parse(savedProjects);
      setProjects(parsedProjects);
      console.log('📁 Projetos carregados do localStorage:', parsedProjects);
    } else {
      // Primeira vez do usuário - criar projetos iniciais
      const initialProjects = getInitialProjects().map(project => ({
        ...project,
        createdBy: userKey,
        subProjects: project.subProjects?.map(sub => ({
          ...sub,
          createdBy: userKey
        })) || []
      }));
      setProjects(initialProjects);
      localStorage.setItem(`brickflow-projects-${userKey}`, JSON.stringify(initialProjects));
      console.log('Projetos iniciais criados:', initialProjects);
    }
  }, []);

  // Salvar projetos automaticamente (localStorage + Supabase)
  useEffect(() => {
    if (projects.length > 0 && currentUser && isLoggedIn) {
      console.log('💾 Salvando projetos para usuário:', currentUser.userKey, projects);
      localStorage.setItem(`brickflow-projects-${currentUser.userKey}`, JSON.stringify(projects));
      
      // Sincronizar com Supabase (com debounce)
      const timeoutId = setTimeout(async () => {
        try {
          console.log('🔄 Iniciando sincronização com Supabase...');
          
          const response = await fetch(`${SUPABASE_URL}/rest/v1/brickflow_data`, {
            method: 'GET',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('📡 Resposta do GET:', response.status, response.statusText);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const existingData = await response.json();
          console.log('📊 Dados existentes:', existingData);
          
          let saveResponse;
          if (existingData.length > 0) {
            // Atualizar registro existente
            console.log('🔄 Atualizando registro existente...');
            saveResponse = await fetch(`${SUPABASE_URL}/rest/v1/brickflow_data?id=eq.${existingData[0].id}`, {
              method: 'PATCH',
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ data: projects })
            });
          } else {
            // Criar novo registro
            console.log('➕ Criando novo registro...');
            saveResponse = await fetch(`${SUPABASE_URL}/rest/v1/brickflow_data`, {
              method: 'POST',
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ data: projects })
            });
          }
          
          console.log('💾 Resposta do salvamento:', saveResponse.status, saveResponse.statusText);
          
          if (saveResponse.ok) {
            console.log('✅ Projetos sincronizados com Supabase com sucesso!');
          } else {
            throw new Error(`Erro no salvamento: ${saveResponse.status} ${saveResponse.statusText}`);
          }
        } catch (error) {
          console.error('❌ Erro na sincronização com Supabase:', error);
          console.log('📁 Dados salvos apenas no localStorage como fallback');
        }
      }, 500); // Debounce de 500ms (meio segundo)
      
      // Forçar re-renderização
      setRefreshKey(prev => prev + 1);
      
      return () => clearTimeout(timeoutId);
    }
  }, [projects, currentUser, isLoggedIn]);

  // Função auxiliar para atualizar projetos de forma imutável
  const updateProjects = useCallback((updateFunction) => {
    setProjects(prevProjects => {
      const newProjects = updateFunction(JSON.parse(JSON.stringify(prevProjects))); // Deep clone
      console.log('Atualizando projetos:', newProjects);
      return newProjects;
    });
  }, []);

  // Salvar usuário atual
  useEffect(() => {
    if (currentUser && isLoggedIn) {
      console.log('Salvando usuário atual:', currentUser.userKey);
      localStorage.setItem('brickflow-current-user', JSON.stringify(currentUser));
    }
  }, [currentUser, isLoggedIn]);

  // Carregar lista de usuários
  useEffect(() => {
    const loadAllUsers = async () => {
      try {
        const users = await loadUsersFromSupabase();
        setAllUsers(users);
      } catch (error) {
        console.log('⚠️ Erro ao carregar usuários:', error.message);
      }
    };
    
    loadAllUsers();
  }, []);

  // Função para converter URLs em hyperlinks clicáveis
  const convertUrlsToLinks = (text) => {
    if (!text) return text;
    
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        // Encurtar URL para exibição se for muito longa
        const displayUrl = part.length > 30 ? part.substring(0, 30) + '...' : part;
        return (
          <a 
            key={index} 
            href={part} 
            target="_blank" 
            rel="noopener noreferrer"
            className="task-link"
            onClick={(e) => e.stopPropagation()}
          >
            {displayUrl}
          </a>
        );
      }
      return part;
    });
  };

  // Função para obter informações do usuário responsável
  const getResponsibleUserInfo = (username) => {
    if (!username) return null;
    return allUsers.find(user => user.username === username);
  };

  // Função para buscar todas as tarefas do usuário atual
  const getUserTasks = () => {
    if (!currentUser) return [];
    
    const userTasks = [];
    
    // Percorrer todos os projetos
    projects.forEach(project => {
      // Verificar tarefas nos boards do projeto principal
      if (project.boardData) {
        // TO-DO e Kanban
        ['todo', 'kanban'].forEach(boardType => {
          if (project.boardData[boardType]?.lists) {
            project.boardData[boardType].lists.forEach(list => {
              if (list.tasks) {
                list.tasks.forEach(task => {
                  if (task.responsibleUser === currentUser.username) {
                    userTasks.push({
                      ...task,
                      projectId: project.id,
                      projectName: project.name,
                      subProjectId: null,
                      subProjectName: null,
                      boardType: boardType,
                      listId: list.id,
                      listTitle: list.title
                    });
                  }
                });
              }
            });
          }
        });
        
        // Timeline
        if (project.boardData.timeline?.periods) {
          project.boardData.timeline.periods.forEach(period => {
            if (period.tasks) {
              period.tasks.forEach(task => {
                if (task.responsibleUser === currentUser.username) {
                  userTasks.push({
                    ...task,
                    projectId: project.id,
                    projectName: project.name,
                    subProjectId: null,
                    subProjectName: null,
                    boardType: 'timeline',
                    listId: period.id,
                    listTitle: period.title
                  });
                }
              });
            }
          });
        }
        
        // Metas
        if (project.boardData.goals?.objectives) {
          project.boardData.goals.objectives.forEach(goal => {
            if (goal.responsibleUser === currentUser.username) {
              userTasks.push({
                ...goal,
                projectId: project.id,
                projectName: project.name,
                subProjectId: null,
                subProjectName: null,
                boardType: 'goals',
                listId: 'goals',
                listTitle: 'Objetivos e Metas'
              });
            }
          });
        }
      }
      
      // Verificar tarefas nos subprojetos
      if (project.subProjects) {
        project.subProjects.forEach(subProject => {
          if (subProject.boardData) {
            // TO-DO e Kanban dos subprojetos
            ['todo', 'kanban'].forEach(boardType => {
              if (subProject.boardData[boardType]?.lists) {
                subProject.boardData[boardType].lists.forEach(list => {
                  if (list.tasks) {
                    list.tasks.forEach(task => {
                      if (task.responsibleUser === currentUser.username) {
                        userTasks.push({
                          ...task,
                          projectId: project.id,
                          projectName: project.name,
                          subProjectId: subProject.id,
                          subProjectName: subProject.name,
                          boardType: boardType,
                          listId: list.id,
                          listTitle: list.title
                        });
                      }
                    });
                  }
                });
              }
            });
            
            // Timeline dos subprojetos
            if (subProject.boardData.timeline?.periods) {
              subProject.boardData.timeline.periods.forEach(period => {
                if (period.tasks) {
                  period.tasks.forEach(task => {
                    if (task.responsibleUser === currentUser.username) {
                      userTasks.push({
                        ...task,
                        projectId: project.id,
                        projectName: project.name,
                        subProjectId: subProject.id,
                        subProjectName: subProject.name,
                        boardType: 'timeline',
                        listId: period.id,
                        listTitle: period.title
                      });
                    }
                  });
                }
              });
            }
            
            // Metas dos subprojetos
            if (subProject.boardData.goals?.objectives) {
              subProject.boardData.goals.objectives.forEach(goal => {
                if (goal.responsibleUser === currentUser.username) {
                  userTasks.push({
                    ...goal,
                    projectId: project.id,
                    projectName: project.name,
                    subProjectId: subProject.id,
                    subProjectName: subProject.name,
                    boardType: 'goals',
                    listId: 'goals',
                    listTitle: 'Objetivos e Metas'
                  });
                }
              });
            }
          }
        });
      }
    });
    
    return userTasks;
  };

  // Função para navegar para uma tarefa específica
  const navigateToTask = (task) => {
    // Encontrar o projeto
    const project = projects.find(p => p.id === task.projectId);
    if (!project) return;
    
    // Se for um subprojeto, navegar para ele
    if (task.subProjectId) {
      const subProject = project.subProjects?.find(sp => sp.id === task.subProjectId);
      if (subProject) {
        setCurrentProject(project);
        setCurrentSubProject(subProject);
        setCurrentBoardType(task.boardType);
      }
    } else {
      // Se for projeto principal
      setCurrentProject(project);
      setCurrentSubProject(null);
      setCurrentBoardType(task.boardType);
    }
  };

  // Função de login
  const handleLogin = async (username, pin) => {
    const userKey = `${username.toLowerCase()}-${pin}`;
    
    try {
      // Tentar carregar do Supabase primeiro
      const users = await loadUsersFromSupabase();
      const supabaseUser = users.find(user => user.username === username && user.pin === pin);
      
      if (supabaseUser) {
        // Usuário encontrado no Supabase
        const userData = {
          userKey,
          username: supabaseUser.username,
          displayName: supabaseUser.displayName,
          avatar: supabaseUser.avatar,
          color: supabaseUser.color,
          createdAt: supabaseUser.created_at
        };
        
        setCurrentUser(userData);
        setIsLoggedIn(true);
        setShowLoginModal(false);
        
        // Salvar no localStorage como cache
        localStorage.setItem(`brickflow-user-${userKey}`, JSON.stringify(userData));
        
        loadUserProjects(userKey);
        console.log('✅ Login realizado com dados do Supabase');
        return;
      }
    } catch (error) {
      console.log('⚠️ Erro ao verificar usuário no Supabase:', error.message);
    }
    
    // Fallback: verificar localStorage
    const savedUserData = localStorage.getItem(`brickflow-user-${userKey}`);
    if (savedUserData) {
      // Usuário existente no localStorage
      const userData = JSON.parse(savedUserData);
      setCurrentUser(userData);
      setIsLoggedIn(true);
      setShowLoginModal(false);
      loadUserProjects(userKey);
      console.log('📁 Login realizado com dados do localStorage');
    } else {
      // Usuário não existe
      alert('Usuário não encontrado! Clique em "Criar Usuário" para se cadastrar.');
    }
  };

  // Função para criar usuário
  const handleCreateUser = async (userData) => {
    console.log('🔄 handleCreateUser chamado com:', userData);
    const userKey = `${userData.username.toLowerCase()}-${userData.pin}`;
    
    try {
      console.log('🔍 Verificando usuários existentes no Supabase...');
      // Verificar se já existe no Supabase
      const users = await loadUsersFromSupabase();
      console.log('📋 Usuários encontrados:', users);
      const existingUser = users.find(user => user.username === userData.username);
      
      if (existingUser) {
        console.log('⚠️ Usuário já existe:', existingUser);
        alert('Este usuário já existe! Tente fazer login ou escolha outro nome.');
        return;
      }
    } catch (error) {
      console.log('⚠️ Erro ao verificar usuários no Supabase:', error.message);
    }
    
    // Verificar se já existe no localStorage (fallback)
    console.log('🔍 Verificando localStorage...');
    const existingLocalUser = localStorage.getItem(`brickflow-user-${userKey}`);
    if (existingLocalUser) {
      console.log('⚠️ Usuário já existe no localStorage');
      alert('Este usuário já existe! Tente fazer login ou escolha outro nome/PIN.');
      return;
    }

    // Criar novo usuário
    console.log('✨ Criando novo usuário...');
    const newUser = {
      userKey,
      username: userData.username,
      displayName: userData.displayName,
      avatar: userData.avatar,
      color: userData.color,
      pin: userData.pin,
      createdAt: new Date().toISOString()
    };
    console.log('👤 Dados do novo usuário:', newUser);

    // Salvar no Supabase
    console.log('💾 Salvando no Supabase...');
    await saveUserToSupabase(newUser);

    // Salvar dados do usuário no localStorage como cache
    console.log('💾 Salvando no localStorage...');
    localStorage.setItem(`brickflow-user-${userKey}`, JSON.stringify(newUser));
    localStorage.setItem('brickflow-current-user', JSON.stringify(newUser));

    // Fazer login
    console.log('🔐 Fazendo login...');
    setCurrentUser(newUser);
    setIsLoggedIn(true);
    setShowCreateUserModal(false);
    setShowLoginModal(false);

    // Carregar projetos iniciais
    loadUserProjects(userKey);
    
    console.log('✅ Usuário criado e salvo no Supabase:', newUser);
  };

  // Função de logout
  const handleLogout = () => {
    localStorage.removeItem('brickflow-current-user');
    setCurrentUser(null);
    setIsLoggedIn(false);
    setProjects([]);
    setCurrentView('home');
    setCurrentProject(null);
    setCurrentSubProject(null);
    setShowLoginModal(true);
  };

  // Função para trocar usuário
  const handleSwitchUser = () => {
    setCurrentUser(null);
    setIsLoggedIn(false);
    setProjects([]);
    setCurrentView('home');
    setCurrentProject(null);
    setCurrentSubProject(null);
    setShowLoginModal(true);
  };

  // ===== FUNÇÕES DO SISTEMA DE ARQUIVOS =====
  
  // Estados para preview
  const [previewFile, setPreviewFile] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  
  // Função para obter arquivos do projeto atual
  const getCurrentFiles = () => {
    if (!currentSubProject || !files) return [];
    
    // Filtrar arquivos pelo subprojeto atual
    return files.filter(file => 
      file.subProjectId === currentSubProject.id || 
      (file.projectId === currentProject?.id && file.subProjectId === currentSubProject.id)
    );
  };

  // Função para formatar tamanho do arquivo
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Função para upload de arquivos
  const handleFileUpload = async (event) => {
    const uploadedFiles = Array.from(event.target.files);
    if (!uploadedFiles.length || !currentSubProject) return;

    for (const file of uploadedFiles) {
      try {
        // Converter arquivo para base64
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });

        const fileData = {
          name: file.name,
          type: file.type,
          size: file.size,
          data: base64,
          uploadDate: new Date().toISOString(),
          uploadedBy: currentUser.username,
          projectId: currentProject?.id,
          subProjectId: currentSubProject?.id,
          projectName: currentProject?.name,
          subProjectName: currentSubProject?.name
        };

        // Salvar arquivo diretamente no Supabase
        await saveFileToSupabase(fileData);

        console.log('✅ Arquivo enviado:', file.name);
      } catch (error) {
        console.error('❌ Erro no upload:', error);
        alert(`Erro ao enviar ${file.name}: ${error.message}`);
      }
    }

    // Limpar input
    event.target.value = '';
  };

  // Função para preview de arquivo
  const handlePreviewFile = (file) => {
    setPreviewFile(file);
    setShowPreviewModal(true);
  };

  // Função para download de arquivo
  const handleDownloadFile = (file) => {
    const link = document.createElement('a');
    link.href = file.data;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Função para excluir arquivo
  const handleDeleteFile = async (fileId) => {
    if (!confirm('Tem certeza que deseja excluir este arquivo?')) return;

    // Excluir do Supabase
    await deleteFileFromSupabase(fileId);
  };

  // ===== FIM DAS FUNÇÕES DO SISTEMA DE ARQUIVOS =====

  // Função para verificar permissões
  const checkPermissions = (item, action) => {
    if (!currentUser) return false;
    
    // Se o usuário criou o item, tem permissão total
    if (item.createdBy === currentUser.userKey) {
      return true;
    }
    
    // Se não criou, precisa de senha para ações sensíveis
    if (action === 'archive' || action === 'delete') {
      const password = prompt('Digite a senha para esta ação:');
      return password === 'Brick$Projetos2025';
    }
    
    return true; // Para outras ações, permite
  };

  // Função para mostrar dropdown de ações
  const handleGearClick = (e, item, isSubProject = false, parentProjectId = null) => {
    e.stopPropagation();
    
    const rect = e.target.getBoundingClientRect();
    setDropdownPosition({
      x: rect.left,
      y: rect.bottom + 5
    });
    
    setShowDropdown({
      item,
      isSubProject,
      parentProjectId
    });
  };

  // Função para arquivar projeto
  const handleArchiveProject = (projectId, isSubProject = false, parentProjectId = null) => {
    if (!currentUser) return;

    const item = isSubProject 
      ? projects.find(p => p.id === parentProjectId)?.subProjects?.find(s => s.id === projectId)
      : projects.find(p => p.id === projectId);

    if (!item || !checkPermissions(item, 'archive')) {
      return;
    }

    updateProjects(prevProjects => {
      return prevProjects.map(project => {
        if (isSubProject && project.id === parentProjectId) {
          return {
            ...project,
            subProjects: project.subProjects.map(sub => 
              sub.id === projectId 
                ? { ...sub, isArchived: true, archivedAt: new Date().toISOString() }
                : sub
            )
          };
        } else if (!isSubProject && project.id === projectId) {
          return { ...project, isArchived: true, archivedAt: new Date().toISOString() };
        }
        return project;
      });
    });

    // Voltar para home se estava visualizando o item arquivado
    if (currentView === 'project' && currentProject?.id === projectId) {
      setCurrentView('home');
      setCurrentProject(null);
    }
    if (currentView === 'subproject' && currentSubProject?.id === projectId) {
      setCurrentView('project');
      setCurrentSubProject(null);
    }

    setShowDropdown(null);
  };

  // Função para excluir projeto
  const handleDeleteProject = (projectId, isSubProject = false, parentProjectId = null) => {
    if (!currentUser) return;

    const item = isSubProject 
      ? projects.find(p => p.id === parentProjectId)?.subProjects?.find(s => s.id === projectId)
      : projects.find(p => p.id === projectId);

    if (!item || !checkPermissions(item, 'delete')) {
      return;
    }

    if (!confirm('Tem certeza que deseja excluir permanentemente? Esta ação não pode ser desfeita.')) {
      return;
    }

    updateProjects(prevProjects => {
      return prevProjects.map(project => {
        if (isSubProject && project.id === parentProjectId) {
          return {
            ...project,
            subProjects: project.subProjects.filter(sub => sub.id !== projectId)
          };
        }
        return project;
      }).filter(project => !(project.id === projectId && !isSubProject));
    });

    // Voltar para home se estava visualizando o item excluído
    if (currentView === 'project' && currentProject?.id === projectId) {
      setCurrentView('home');
      setCurrentProject(null);
    }
    if (currentView === 'subproject' && currentSubProject?.id === projectId) {
      setCurrentView('project');
      setCurrentSubProject(null);
    }

    setShowDropdown(null);
  };

  // Função para criar novo projeto
  const handleCreateProject = (projectData) => {
    if (!currentUser) return;

    const newProject = {
      id: `project-${Date.now()}`,
      name: projectData.name,
      description: projectData.description,
      color: projectData.color,
      isProtected: projectData.isProtected,
      password: projectData.password,
      archived: { tasks: [], goals: [] },
      isArchived: false,
      createdBy: currentUser.userKey,
      createdAt: new Date().toISOString(),
      subProjects: [],
      boardData: {
        todo: {
          lists: [
            { id: 'todo-1', title: 'A Fazer', tasks: [] },
            { id: 'todo-2', title: 'Em Progresso', tasks: [] },
            { id: 'todo-3', title: 'Concluído', tasks: [] }
          ]
        },
        kanban: {
          lists: [
            { id: 'kanban-1', title: 'A Fazer', tasks: [] },
            { id: 'kanban-2', title: 'Em Progresso', tasks: [] },
            { id: 'kanban-3', title: 'Concluído', tasks: [] }
          ]
        },
        timeline: {
          periods: [
            { id: 'timeline-1', title: 'Janeiro 2025', tasks: [] },
            { id: 'timeline-2', title: 'Fevereiro 2025', tasks: [] },
            { id: 'timeline-3', title: 'Março 2025', tasks: [] }
          ]
        },
        goals: {
          objectives: []
        }
      }
    };

    updateProjects(prevProjects => [...prevProjects, newProject]);
    setShowNewProjectModal(false);
  };

  // Função para editar projeto
  const handleEditProject = (projectData) => {
    if (!currentUser || !editingProject) return;

    updateProjects(prevProjects => 
      prevProjects.map(project => {
        if (project.id === editingProject.id) {
          return {
            ...project,
            name: projectData.name,
            description: projectData.description,
            color: projectData.color,
            isProtected: projectData.isProtected,
            password: projectData.password
          };
        }
        
        // Se for um subprojeto, procurar dentro dos projetos
        return {
          ...project,
          subProjects: project.subProjects?.map(subProject => {
            if (subProject.id === editingProject.id) {
              return {
                ...subProject,
                name: projectData.name,
                description: projectData.description,
                color: projectData.color,
                isProtected: projectData.isProtected,
                password: projectData.password
              };
            }
            return subProject;
          }) || []
        };
      })
    );
    
    setShowEditProjectModal(false);
    setEditingProject(null);
  };

  // Função para criar novo sub-projeto
  const handleCreateSubProject = (subProjectData) => {
    if (!currentUser || !currentProject) return;

    const newSubProject = {
      id: `subproject-${Date.now()}`,
      name: subProjectData.name,
      description: subProjectData.description,
      color: subProjectData.color,
      isProtected: subProjectData.isProtected,
      password: subProjectData.password,
      archived: { tasks: [], goals: [] },
      isArchived: false,
      createdBy: currentUser.userKey,
      createdAt: new Date().toISOString(),
      boardData: {
        todo: {
          lists: [
            { id: 'todo-1', title: 'A Fazer', tasks: [] },
            { id: 'todo-2', title: 'Em Progresso', tasks: [] },
            { id: 'todo-3', title: 'Concluído', tasks: [] }
          ]
        },
        kanban: {
          lists: [
            { id: 'kanban-1', title: 'A Fazer', tasks: [] },
            { id: 'kanban-2', title: 'Em Progresso', tasks: [] },
            { id: 'kanban-3', title: 'Concluído', tasks: [] }
          ]
        },
        timeline: {
          periods: [
            { id: 'timeline-1', title: 'Janeiro 2025', tasks: [] },
            { id: 'timeline-2', title: 'Fevereiro 2025', tasks: [] },
            { id: 'timeline-3', title: 'Março 2025', tasks: [] }
          ]
        },
        goals: {
          objectives: []
        }
      }
    };

    updateProjects(prevProjects => {
      return prevProjects.map(project => {
        if (project.id === currentProject.id) {
          const updatedProject = {
            ...project,
            subProjects: [...(project.subProjects || []), newSubProject]
          };
          // Atualizar currentProject também
          setCurrentProject(updatedProject);
          return updatedProject;
        }
        return project;
      });
    });

    setShowNewSubProjectModal(false);
  };

  // Função para acessar projeto
  const handleAccessProject = (project) => {
    if (project.isProtected) {
      setPendingProject(project);
      setShowPasswordModal(true);
    } else {
      setCurrentProject(project);
      setCurrentView('project');
    }
  };

  // Função para verificar senha
  const handlePasswordSubmit = (password) => {
    if (pendingProject && password === pendingProject.password) {
      if (pendingProject.subProjects !== undefined) {
        // É um projeto
        setCurrentProject(pendingProject);
        setCurrentView('project');
      } else {
        // É um sub-projeto
        setCurrentSubProject(pendingProject);
        setCurrentView('subproject');
      }
      setShowPasswordModal(false);
      setPendingProject(null);
    } else {
      alert('Senha incorreta!');
    }
  };

  // Função para acessar sub-projeto
  const handleAccessSubProject = (subProject) => {
    if (subProject.isProtected) {
      setPendingProject(subProject);
      setShowPasswordModal(true);
    } else {
      setCurrentSubProject(subProject);
      setCurrentView('subproject');
    }
  };

  // Função para voltar
  const handleBack = () => {
    if (currentView === 'subproject') {
      setCurrentView('project');
      setCurrentSubProject(null);
    } else if (currentView === 'project') {
      setCurrentView('home');
      setCurrentProject(null);
    }
  };

  // Função para obter dados do quadro atual
  const getCurrentBoardData = useCallback(() => {
    if (!currentSubProject) return null;
    return currentSubProject.boardData?.[currentBoardType] || null;
  }, [currentSubProject, currentBoardType]);

  // Função para atualizar dados do quadro
  const updateCurrentBoardData = useCallback((newData) => {
    if (!currentSubProject || !currentProject) return;

    console.log('Atualizando board data:', newData);

    updateProjects(prevProjects => {
      return prevProjects.map(project => {
        if (project.id === currentProject.id) {
          return {
            ...project,
            subProjects: project.subProjects.map(sub => {
              if (sub.id === currentSubProject.id) {
                return {
                  ...sub,
                  boardData: {
                    ...sub.boardData,
                    [currentBoardType]: newData
                  }
                };
              }
              return sub;
            })
          };
        }
        return project;
      });
    });

    // Atualizar estado local do sub-projeto
    setCurrentSubProject(prev => ({
      ...prev,
      boardData: {
        ...prev.boardData,
        [currentBoardType]: newData
      }
    }));

    // Forçar re-renderização
    setRefreshKey(prev => prev + 1);
  }, [currentSubProject, currentProject, currentBoardType, updateProjects]);

  // Função para adicionar tarefa
  const handleAddTask = useCallback((listId, taskData) => {
    const boardData = getCurrentBoardData();
    if (!boardData) return;

    const newTask = {
      id: `task-${Date.now()}`,
      title: taskData.title,
      description: taskData.description || '',
      tags: taskData.tags || [],
      priority: taskData.priority || 'medium',
      startDate: taskData.startDate || '',
      endDate: taskData.endDate || '',
      completed: false,
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.userKey
    };

    let updatedData;
    
    if (currentBoardType === 'todo' || currentBoardType === 'kanban') {
      updatedData = {
        ...boardData,
        lists: boardData.lists.map(list => 
          list.id === listId 
            ? { ...list, tasks: [...list.tasks, newTask] }
            : list
        )
      };
    } else if (currentBoardType === 'timeline') {
      updatedData = {
        ...boardData,
        periods: boardData.periods.map(period => 
          period.id === listId 
            ? { ...period, tasks: [...period.tasks, newTask] }
            : period
        )
      };
    } else if (currentBoardType === 'goals') {
      const newGoal = {
        id: `goal-${Date.now()}`,
        title: taskData.title,
        description: taskData.description || '',
        progress: 0,
        keyResults: [],
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.userKey
      };
      
      updatedData = {
        ...boardData,
        objectives: [...boardData.objectives, newGoal]
      };
    }

    updateCurrentBoardData(updatedData);
    setShowTaskModal(false);
    setTargetListId(null);
  }, [getCurrentBoardData, currentBoardType, currentUser, updateCurrentBoardData]);

  // Função para editar tarefa
  const handleEditTask = useCallback((taskData) => {
    const boardData = getCurrentBoardData();
    if (!boardData || !editingTask) return;

    let updatedData;
    
    if (currentBoardType === 'todo' || currentBoardType === 'kanban') {
      updatedData = {
        ...boardData,
        lists: boardData.lists.map(list => ({
          ...list,
          tasks: list.tasks.map(task => 
            task.id === editingTask.id 
              ? { ...task, ...taskData, updatedAt: new Date().toISOString() }
              : task
          )
        }))
      };
    } else if (currentBoardType === 'timeline') {
      updatedData = {
        ...boardData,
        periods: boardData.periods.map(period => ({
          ...period,
          tasks: period.tasks.map(task => 
            task.id === editingTask.id 
              ? { ...task, ...taskData, updatedAt: new Date().toISOString() }
              : task
          )
        }))
      };
    } else if (currentBoardType === 'goals') {
      updatedData = {
        ...boardData,
        objectives: boardData.objectives.map(goal => 
          goal.id === editingTask.id 
            ? { ...goal, ...taskData, updatedAt: new Date().toISOString() }
            : goal
        )
      };
    }

    updateCurrentBoardData(updatedData);
    setShowTaskModal(false);
    setEditingTask(null);
  }, [getCurrentBoardData, currentBoardType, editingTask, updateCurrentBoardData]);

  // Função para alternar conclusão de tarefa (com movimento automático no TO-DO)
  const handleToggleTask = useCallback((taskId, listId) => {
    const boardData = getCurrentBoardData();
    if (!boardData) return;

    if (currentBoardType === 'todo') {
      // Lógica especial para TO-DO: mover entre listas
      const currentListIndex = boardData.lists.findIndex(list => 
        list.tasks.some(task => task.id === taskId)
      );
      
      if (currentListIndex === -1) return;

      const task = boardData.lists[currentListIndex].tasks.find(t => t.id === taskId);
      if (!task) return;

      // Determinar próxima lista (ciclo: 0 -> 1 -> 2 -> 0)
      const nextListIndex = (currentListIndex + 1) % 3;
      
      // Remover tarefa da lista atual
      const updatedLists = boardData.lists.map((list, index) => {
        if (index === currentListIndex) {
          return {
            ...list,
            tasks: list.tasks.filter(t => t.id !== taskId)
          };
        }
        if (index === nextListIndex) {
          return {
            ...list,
            tasks: [...list.tasks, { ...task, completed: nextListIndex === 2 }]
          };
        }
        return list;
      });

      updateCurrentBoardData({
        ...boardData,
        lists: updatedLists
      });
    } else {
      // Lógica normal para outros tipos: apenas alternar completed
      let updatedData;
      
      if (currentBoardType === 'kanban') {
        updatedData = {
          ...boardData,
          lists: boardData.lists.map(list => ({
            ...list,
            tasks: list.tasks.map(task => 
              task.id === taskId 
                ? { ...task, completed: !task.completed }
                : task
            )
          }))
        };
      } else if (currentBoardType === 'timeline') {
        updatedData = {
          ...boardData,
          periods: boardData.periods.map(period => ({
            ...period,
            tasks: period.tasks.map(task => 
              task.id === taskId 
                ? { ...task, completed: !task.completed }
                : task
            )
          }))
        };
      }

      updateCurrentBoardData(updatedData);
    }
  }, [getCurrentBoardData, currentBoardType, updateCurrentBoardData]);

  // Função para excluir tarefa
  const handleDeleteTask = useCallback((taskId) => {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;

    const boardData = getCurrentBoardData();
    if (!boardData) return;

    let updatedData;
    
    if (currentBoardType === 'todo' || currentBoardType === 'kanban') {
      updatedData = {
        ...boardData,
        lists: boardData.lists.map(list => ({
          ...list,
          tasks: list.tasks.filter(task => task.id !== taskId)
        }))
      };
    } else if (currentBoardType === 'timeline') {
      updatedData = {
        ...boardData,
        periods: boardData.periods.map(period => ({
          ...period,
          tasks: period.tasks.filter(task => task.id !== taskId)
        }))
      };
    } else if (currentBoardType === 'goals') {
      updatedData = {
        ...boardData,
        objectives: boardData.objectives.filter(goal => goal.id !== taskId)
      };
    }

    updateCurrentBoardData(updatedData);
  }, [getCurrentBoardData, currentBoardType, updateCurrentBoardData]);

  // NOVAS FUNÇÕES DE DRAG AND DROP MELHORADAS (Substitui as antigas)
  const handleDragStart = (e, task, listId) => {
    // Armazena informações completas sobre a origem do card
    setDraggedTask({ task, sourceListId: listId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnter = (e, targetIndex) => {
    // Quando o mouse entra em cima de outro card, guarda sua posição
    e.preventDefault();
    setDragOverIndex(targetIndex);
  };

  const handleDragOver = (e) => {
    // Previne o comportamento padrão para permitir o 'drop'
    e.preventDefault();
  };

  const handleDragLeave = (e) => {
    // Limpa o índice quando o mouse sai de cima de um card
    e.preventDefault();
    setDragOverIndex(null);
  };

  const handleDrop = useCallback((e, targetListId) => {
    e.preventDefault();
    if (!draggedTask) return;

    const boardData = getCurrentBoardData();
    if (!boardData) return;

    const sourceListIndex = boardData.lists.findIndex(list => list.id === draggedTask.sourceListId);
    const targetListIndex = boardData.lists.findIndex(list => list.id === targetListId);

    if (sourceListIndex === -1 || targetListIndex === -1) return;

    // Clonar as listas para não modificar o estado diretamente
    const newLists = JSON.parse(JSON.stringify(boardData.lists));
    
    // Encontrar e remover o card da lista de origem
    const sourceList = newLists[sourceListIndex];
    const taskIndex = sourceList.tasks.findIndex(t => t.id === draggedTask.task.id);
    const [movedTask] = sourceList.tasks.splice(taskIndex, 1);

    // Adicionar o card na lista de destino na posição correta
    const targetList = newLists[targetListIndex];
    
    if (dragOverIndex !== null) {
      // Se soltou sobre outro card, insere antes dele
      targetList.tasks.splice(dragOverIndex, 0, movedTask);
    } else {
      // Se soltou na área da lista, insere no final
      targetList.tasks.push(movedTask);
    }

    // Atualizar o estado com as novas listas
    updateCurrentBoardData({
      ...boardData,
      lists: newLists
    });

    // Limpar estados
    setDraggedTask(null);
    setDragOverIndex(null);
  }, [draggedTask, getCurrentBoardData, updateCurrentBoardData, dragOverIndex]);

  const handleDropOnList = (e, targetListId) => {
    // Função para quando o drop é na área geral da lista, não sobre um card
    e.preventDefault();
    setDragOverIndex(null); // Garante que será adicionado ao final
    handleDrop(e, targetListId);
  };

  // Funções para drag and drop de projetos
  const handleProjectDragStart = (e, project) => {
    setDraggedProject(project);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', project.id);
  };

  const handleProjectDragOver = (e, project) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverProject(project.id);
  };

  const handleProjectDragLeave = () => {
    setDragOverProject(null);
  };

  const handleProjectDrop = (e, targetProject) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedProject || draggedProject.id === targetProject.id) {
      setDraggedProject(null);
      setDragOverProject(null);
      return;
    }

    // Usar activeProjects para calcular índices corretos
    const activeProjects = projects.filter(project => !project.isArchived);
    const draggedIndex = activeProjects.findIndex(p => p.id === draggedProject.id);
    const targetIndex = activeProjects.findIndex(p => p.id === targetProject.id);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reordenar apenas os projetos ativos
    const newActiveProjects = [...activeProjects];
    const [movedProject] = newActiveProjects.splice(draggedIndex, 1);
    newActiveProjects.splice(targetIndex, 0, movedProject);

    // Reconstruir array completo mantendo projetos arquivados no final
    const archivedProjects = projects.filter(project => project.isArchived);
    const newProjects = [...newActiveProjects, ...archivedProjects];

    // Atualizar projetos usando a função correta
    updateProjects(() => newProjects);
    
    // Limpar estados de drag
    setDraggedProject(null);
    setDragOverProject(null);
  };

  // Funções para drag and drop de subprojetos
  const handleSubProjectDragStart = (e, subProject) => {
    setDraggedSubProject(subProject);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', subProject.id);
  };

  const handleSubProjectDragOver = (e, subProject) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSubProject(subProject.id);
  };

  const handleSubProjectDragLeave = () => {
    setDragOverSubProject(null);
  };

  const handleSubProjectDrop = (e, targetSubProject) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedSubProject || draggedSubProject.id === targetSubProject.id) {
      setDraggedSubProject(null);
      setDragOverSubProject(null);
      return;
    }

    // Encontrar o projeto pai atual
    if (!currentProject) return;

    // Usar activeSubProjects para calcular índices corretos
    const activeSubProjects = currentProject.subProjects?.filter(sub => !sub.isArchived) || [];
    const draggedIndex = activeSubProjects.findIndex(s => s.id === draggedSubProject.id);
    const targetIndex = activeSubProjects.findIndex(s => s.id === targetSubProject.id);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reordenar apenas os subprojetos ativos
    const newActiveSubProjects = [...activeSubProjects];
    const [movedSubProject] = newActiveSubProjects.splice(draggedIndex, 1);
    newActiveSubProjects.splice(targetIndex, 0, movedSubProject);

    // Reconstruir array completo mantendo subprojetos arquivados no final
    const archivedSubProjects = currentProject.subProjects?.filter(sub => sub.isArchived) || [];
    const newSubProjects = [...newActiveSubProjects, ...archivedSubProjects];

    // Atualizar projetos
    updateProjects(prevProjects => 
      prevProjects.map(project => {
        if (project.id === currentProject.id) {
          const updatedProject = {
            ...project,
            subProjects: newSubProjects
          };
          // Atualizar currentProject também
          setCurrentProject(updatedProject);
          return updatedProject;
        }
        return project;
      })
    );
    
    // Limpar estados de drag
    setDraggedSubProject(null);
    setDragOverSubProject(null);
  };

  // Função para calcular estatísticas
  const getProjectStats = (project) => {
    let totalSubProjects = project.subProjects?.length || 0;
    let totalTasks = 0;

    // Contar tarefas em todos os tipos de quadro do projeto principal
    if (project.boardData) {
      Object.values(project.boardData).forEach(boardType => {
        if (boardType.lists) {
          boardType.lists.forEach(list => {
            totalTasks += list.tasks?.length || 0;
          });
        }
        if (boardType.periods) {
          boardType.periods.forEach(period => {
            totalTasks += period.tasks?.length || 0;
          });
        }
        if (boardType.objectives) {
          totalTasks += boardType.objectives.length || 0;
        }
      });
    }

    // Contar tarefas dos sub-projetos
    project.subProjects?.forEach(subProject => {
      if (subProject.boardData) {
        Object.values(subProject.boardData).forEach(boardType => {
          if (boardType.lists) {
            boardType.lists.forEach(list => {
              totalTasks += list.tasks?.length || 0;
            });
          }
          if (boardType.periods) {
            boardType.periods.forEach(period => {
              totalTasks += period.tasks?.length || 0;
            });
          }
          if (boardType.objectives) {
            totalTasks += boardType.objectives.length || 0;
          }
        });
      }
    });

    return { totalSubProjects, totalTasks };
  };

  // Função para calcular estatísticas do sub-projeto
  const getSubProjectStats = (subProject) => {
    let totalTasks = 0;

    if (subProject.boardData) {
      Object.values(subProject.boardData).forEach(boardType => {
        if (boardType.lists) {
          boardType.lists.forEach(list => {
            totalTasks += list.tasks?.length || 0;
          });
        }
        if (boardType.periods) {
          boardType.periods.forEach(period => {
            totalTasks += period.tasks?.length || 0;
          });
        }
        if (boardType.objectives) {
          totalTasks += boardType.objectives.length || 0;
        }
      });
    }

    return { totalTasks };
  };

  // Filtrar projetos não arquivados
  const activeProjects = projects.filter(project => !project.isArchived);
  const activeSubProjects = currentProject?.subProjects?.filter(sub => !sub.isArchived) || [];

  if (!isLoggedIn) {
    return (
      <div className="app">
        {/* Modal de Login */}
        {showLoginModal && (
          <div className="modal-overlay">
            <div className="modal">
              <h2>🧱 Entrar no BrickFlow</h2>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                handleLogin(formData.get('username'), formData.get('pin'));
              }}>
                <div className="form-group">
                  <label>Nome/Código:</label>
                  <input 
                    type="text" 
                    name="username" 
                    placeholder="Ex: JOAO, MARIA_ADM" 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>PIN (4 dígitos):</label>
                  <input 
                    type="password" 
                    name="pin" 
                    placeholder="1234" 
                    maxLength="4"
                    pattern="[0-9]{4}"
                    required 
                  />
                </div>
                <div className="modal-actions">
                  <button type="submit" className="btn-primary">Entrar</button>
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={() => {
                      setShowLoginModal(false);
                      setShowCreateUserModal(true);
                    }}
                  >
                    Criar Usuário
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Criar Usuário */}
        {showCreateUserModal && (
          <div className="modal-overlay">
            <div className="modal create-user-modal">
              <h2>🧱 Criar Usuário BrickFlow</h2>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const pin = formData.get('pin');
                const confirmPin = formData.get('confirmPin');
                
                if (pin !== confirmPin) {
                  alert('PINs não coincidem!');
                  return;
                }
                
                const selectedAvatar = document.querySelector('input[name="avatar"]:checked')?.value;
                const selectedColor = document.querySelector('input[name="color"]:checked')?.value;
                
                if (!selectedAvatar || !selectedColor) {
                  alert('Selecione um avatar e uma cor!');
                  return;
                }
                
                handleCreateUser({
                  username: formData.get('username'),
                  displayName: formData.get('displayName'),
                  pin: pin,
                  avatar: selectedAvatar,
                  color: selectedColor
                });
              }}>
                <div className="form-group">
                  <label>Nome de Usuário (código):</label>
                  <input 
                    type="text" 
                    name="username" 
                    placeholder="Ex: JOAO, MARIA_ADM" 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Nome de Exibição:</label>
                  <input 
                    type="text" 
                    name="displayName" 
                    placeholder="Ex: João Silva, Maria Admin" 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>PIN (4 dígitos):</label>
                  <input 
                    type="password" 
                    name="pin" 
                    placeholder="1234" 
                    maxLength="4"
                    pattern="[0-9]{4}"
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Confirmar PIN:</label>
                  <input 
                    type="password" 
                    name="confirmPin" 
                    placeholder="1234" 
                    maxLength="4"
                    pattern="[0-9]{4}"
                    required 
                  />
                </div>
                
                <div className="form-group">
                  <label>Escolha seu Avatar:</label>
                  <div className="avatar-grid">
                    {avatarOptions.map((avatar, index) => (
                      <label key={index} className="avatar-option">
                        <input 
                          type="radio" 
                          name="avatar" 
                          value={avatar}
                          required
                        />
                        <span className="avatar-display">{avatar}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Escolha sua Cor:</label>
                  <div className="color-grid">
                    {userColors.map((color, index) => (
                      <label key={index} className="color-option">
                        <input 
                          type="radio" 
                          name="color" 
                          value={color}
                          required
                        />
                        <span className={`color-display color-${color}`}></span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="modal-actions">
                  <button type="submit" className="btn-primary">Criar Usuário</button>
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={() => {
                      setShowCreateUserModal(false);
                      setShowLoginModal(true);
                    }}
                  >
                    Voltar ao Login
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app" key={refreshKey}>
      {/* Header Principal */}
      <header className="main-header">
        <div className="header-content">
          <div className="header-left">
            {currentView !== 'home' && (
              <button className="back-btn" onClick={handleBack}>
                ← Voltar
              </button>
            )}
            <img src={logoImage} alt="BrickFlow" className="logo" />
            {currentView === 'project' && currentProject && (
              <h1>{currentProject.name}</h1>
            )}
            {currentView === 'subproject' && currentSubProject && (
              <h1>{currentSubProject.name}</h1>
            )}
          </div>
          
          <div className="header-right">
            <div className="user-info">
              <span className="user-avatar">{currentUser?.avatar}</span>
              <span className="user-name">Olá, {currentUser?.displayName}!</span>
              <button className="user-action-btn" onClick={handleSwitchUser} title="Trocar usuário">
                🔄
              </button>
              <button className="user-action-btn" onClick={handleLogout} title="Sair">
                🚪
              </button>
            </div>
            
            {currentView === 'home' && (
              <button 
                className="btn-primary"
                onClick={() => setShowNewProjectModal(true)}
              >
                + Novo Projeto
              </button>
            )}
            
            {currentView === 'project' && (
              <button 
                className="btn-primary"
                onClick={() => setShowNewSubProjectModal(true)}
              >
                + Novo Sub-projeto
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Sorte do Dia + Mega Sena */}
      {currentView === 'home' && (
        <div className="daily-luck">
          <div className="luck-content">
            <div className="luck-phrase">
              <h3>🍀 Sorte do Dia</h3>
              <p>"{dailyPhrase}"</p>
            </div>
            <div className="mega-sena">
              <h4>🎰 Sugestão Mega Sena</h4>
              <div className="mega-numbers">
                {megaSenaNumbers.map((number, index) => (
                  <span key={index} className="mega-number">{number.toString().padStart(2, '0')}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Principal */}
      <main className="main-content">
        {currentView === 'home' && (
          <>
            {/* Box Minhas Tarefas */}
            {currentUser && (
              <div className="my-tasks-box">
                <h2>📋 Minhas Tarefas</h2>
                <div className="my-tasks-content">
                  {getUserTasks().length === 0 ? (
                    <p className="no-tasks">Nenhuma tarefa atribuída a você no momento.</p>
                  ) : (
                    <div className="my-tasks-list">
                      {getUserTasks().slice(0, 5).map((task, index) => (
                        <div 
                          key={`${task.projectId}-${task.subProjectId}-${task.id}-${index}`}
                          className="my-task-item"
                          onClick={() => navigateToTask(task)}
                        >
                          <div className="task-info">
                            <h4>{task.title}</h4>
                            <p className="task-location">
                              📁 {task.projectName}
                              {task.subProjectName && ` > ${task.subProjectName}`}
                              {' • '}
                              {task.boardType === 'todo' && '📋 TO-DO'}
                              {task.boardType === 'kanban' && '📊 Kanban'}
                              {task.boardType === 'timeline' && '📅 Timeline'}
                              {task.boardType === 'goals' && '🎯 Metas'}
                              {' • '}
                              {task.listTitle}
                            </p>
                            {task.description && (
                              <p className="task-description">{convertUrlsToLinks(task.description)}</p>
                            )}
                          </div>
                          <div className="task-priority">
                            {task.priority === 'high' && '🔴'}
                            {task.priority === 'medium' && '🟡'}
                            {task.priority === 'low' && '🟢'}
                          </div>
                        </div>
                      ))}
                      {getUserTasks().length > 5 && (
                        <p className="more-tasks">
                          E mais {getUserTasks().length - 5} tarefa(s)...
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="projects-grid">
            {activeProjects.map(project => {
              const stats = getProjectStats(project);
              const isDragging = draggedProject?.id === project.id;
              const isDragOver = dragOverProject === project.id;
              
              return (
                <div 
                  key={project.id} 
                  className={`project-card color-${project.color} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
                  draggable={true}
                  onDragStart={(e) => handleProjectDragStart(e, project)}
                  onDragOver={(e) => handleProjectDragOver(e, project)}
                  onDragLeave={handleProjectDragLeave}
                  onDrop={(e) => handleProjectDrop(e, project)}
                  onClick={(e) => {
                    // Só acessa o projeto se não estiver arrastando
                    if (!draggedProject) {
                      handleAccessProject(project);
                    }
                  }}
                >
                  <div className="project-header">
                    <h3>{project.name}</h3>
                    <div className="project-actions">
                      <button 
                        className="action-btn gear-btn"
                        onClick={(e) => handleGearClick(e, project, false)}
                      >
                        ⚙️
                      </button>
                    </div>
                  </div>
                  <p>{project.description}</p>
                  <div className="project-stats">
                    <span>{stats.totalSubProjects} sub-projetos</span>
                    <span>{stats.totalTasks} tarefas</span>
                  </div>
                  {project.isProtected && (
                    <div className="protected-badge">🔒 Protegido</div>
                  )}
                </div>
              );
            })}
          </div>
          </>
        )}

        {currentView === 'project' && currentProject && (
          <div className="project-view">
            <div className="project-description">
              <p>{currentProject.description}</p>
            </div>
            
            {activeSubProjects.length > 0 ? (
              <div className="subprojects-grid">
                {activeSubProjects.map(subProject => {
                  const stats = getSubProjectStats(subProject);
                  const isDragging = draggedSubProject?.id === subProject.id;
                  const isDragOver = dragOverSubProject === subProject.id;
                  
                  return (
                    <div 
                      key={subProject.id} 
                      className={`project-card color-${subProject.color} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
                      draggable={true}
                      onDragStart={(e) => handleSubProjectDragStart(e, subProject)}
                      onDragOver={(e) => handleSubProjectDragOver(e, subProject)}
                      onDragLeave={handleSubProjectDragLeave}
                      onDrop={(e) => handleSubProjectDrop(e, subProject)}
                      onClick={(e) => {
                        // Só acessa o subprojeto se não estiver arrastando
                        if (!draggedSubProject) {
                          handleAccessSubProject(subProject);
                        }
                      }}
                    >
                      <div className="project-header">
                        <h3>{subProject.name}</h3>
                        <div className="project-actions">
                          <button 
                            className="action-btn gear-btn"
                            onClick={(e) => handleGearClick(e, subProject, true, currentProject.id)}
                          >
                            ⚙️
                          </button>
                        </div>
                      </div>
                      <p>{subProject.description}</p>
                      <div className="project-stats">
                        <span>{stats.totalTasks} tarefas</span>
                      </div>
                      {subProject.isProtected && (
                        <div className="protected-badge">🔒 Protegido</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <h3>Nenhum sub-projeto ainda</h3>
                <p>Clique em "Novo Sub-projeto" para começar!</p>
              </div>
            )}
          </div>
        )}

        {currentView === 'subproject' && currentSubProject && (
          <div className="subproject-view">
            {/* Seletor de Tipo de Quadro */}
            <div className="board-type-selector">
              <button 
                className={`board-type-btn ${currentBoardType === 'todo' ? 'active' : ''}`}
                onClick={() => setCurrentBoardType('todo')}
              >
                📋 To-Do
              </button>
              <button 
                className={`board-type-btn ${currentBoardType === 'kanban' ? 'active' : ''}`}
                onClick={() => setCurrentBoardType('kanban')}
              >
                📊 Kanban
              </button>
              <button 
                className={`board-type-btn ${currentBoardType === 'files' ? 'active' : ''}`}
                onClick={() => setCurrentBoardType('files')}
              >
                📁 Arquivos
              </button>
              <button 
                className={`board-type-btn ${currentBoardType === 'goals' ? 'active' : ''}`}
                onClick={() => setCurrentBoardType('goals')}
              >
                📈 Metas
              </button>
              <button 
                className={`board-type-btn ${showArchived ? 'active' : ''}`}
                onClick={() => setShowArchived(!showArchived)}
              >
                🗄️ Arquivados
              </button>
            </div>

            {/* Conteúdo do Quadro */}
            {!showArchived && (
              <div className="board-content">
                {(currentBoardType === 'todo' || currentBoardType === 'kanban') && (
                  <div className="lists-container">
                    {getCurrentBoardData()?.lists?.map(list => (
                      <div 
                        key={list.id} 
                        className="list"
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDropOnList(e, list.id)}
                      >
                        <div className="list-header">
                          <h3>{list.title}</h3>
                          <span className="task-count">{list.tasks?.length || 0}</span>
                          <button 
                            className="btn-add-task"
                            onClick={() => {
                              setTargetListId(list.id);
                              setShowTaskModal(true);
                            }}
                          >
                            + Adicionar
                          </button>
                        </div>
                        <div className="tasks-container">
                          {list.tasks?.map((task, index) => (
                            <div 
                              key={task.id} 
                              className={`task-card ${task.completed ? 'completed' : ''}`}
                              draggable={currentBoardType === 'kanban' || currentBoardType === 'todo'}
                              onDragStart={(e) => handleDragStart(e, task, list.id)}
                              onDragEnter={(e) => handleDragEnter(e, index)}
                              onClick={() => {
                                setEditingTask(task);
                                setShowTaskModal(true);
                              }}
                            >
                              <div className="task-header">
                                <input 
                                  type="checkbox" 
                                  checked={task.completed}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleToggleTask(task.id, list.id);
                                  }}
                                />
                                <h4>{task.title}</h4>
                                <button 
                                  className="delete-task-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTask(task.id);
                                  }}
                                >
                                  🗑️
                                </button>
                              </div>
                              {task.description && <p>{convertUrlsToLinks(task.description)}</p>}
                              {task.responsibleUser && (
                                <div className="task-responsible">
                                  👤 {getResponsibleUserInfo(task.responsibleUser)?.displayName || task.responsibleUser}
                                </div>
                              )}
                              {task.tags?.length > 0 && (
                                <div className="task-tags">
                                  {task.tags.map((tag, index) => (
                                    <span key={index} className="task-tag">{tag}</span>
                                  ))}
                                </div>
                              )}
                              {task.priority && (
                                <div className={`priority-indicator priority-${task.priority}`}>
                                  {task.priority === 'high' && '🔴'}
                                  {task.priority === 'medium' && '🟡'}
                                  {task.priority === 'low' && '🟢'}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {currentBoardType === 'files' && (
                  <div 
                    className={`files-container ${isDragging ? 'dragging' : ''}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const droppedFiles = Array.from(e.dataTransfer.files);
                      if (droppedFiles.length > 0) {
                        // Simular evento de upload
                        const fakeEvent = {
                          target: { files: droppedFiles, value: '' }
                        };
                        handleFileUpload(fakeEvent);
                      }
                    }}
                  >
                    <div className="files-header">
                      <h3>Arquivos do Projeto</h3>
                      <input 
                        type="file"
                        id="file-upload"
                        multiple
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                      />
                      <button 
                        className="btn-add-task"
                        onClick={() => document.getElementById('file-upload').click()}
                      >
                        📎 Upload de Arquivo
                      </button>
                    </div>
                    
                    {isDragging && (
                      <div className="drag-overlay">
                        <div className="drag-message">
                          <h3>📁 Solte os arquivos aqui</h3>
                          <p>Arraste e solte para fazer upload</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="files-grid">
                      {getCurrentFiles().map(file => (
                        <div key={file.id} className="file-card">
                          <div className="file-icon">
                            {file.type?.startsWith('image/') ? '🖼️' : 
                             file.type?.startsWith('video/') ? '🎥' : 
                             file.type?.startsWith('audio/') ? '🎵' : 
                             file.type?.includes('pdf') ? '📄' : '📎'}
                          </div>
                          <div className="file-info">
                            <h4>{file.name}</h4>
                            <p>{formatFileSize(file.size)}</p>
                            <small>Por: {file.uploadedBy}</small>
                            <small>{new Date(file.uploadDate).toLocaleDateString()}</small>
                          </div>
                          <div className="file-actions">
                            <button 
                              className="file-action-btn"
                              onClick={() => handlePreviewFile(file)}
                              title="Visualizar"
                            >
                              👁️
                            </button>
                            <button 
                              className="file-action-btn"
                              onClick={() => handleDownloadFile(file)}
                              title="Download"
                            >
                              💾
                            </button>
                            <button 
                              className="file-action-btn delete"
                              onClick={() => handleDeleteFile(file.id)}
                              title="Excluir"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                      {getCurrentFiles().length === 0 && (
                        <div className="empty-files">
                          <p>📁 Nenhum arquivo ainda</p>
                          <p>Clique em "Upload de Arquivo" ou arraste arquivos aqui</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {currentBoardType === 'timeline' && (
                  <div className="timeline-container">
                    {getCurrentBoardData()?.periods?.map(period => (
                      <div key={period.id} className="timeline-period">
                        <div className="period-header">
                          <h3>{period.title}</h3>
                          <span className="task-count">{period.tasks?.length || 0}</span>
                          <button 
                            className="btn-add-task"
                            onClick={() => {
                              setTargetListId(period.id);
                              setShowTaskModal(true);
                            }}
                          >
                            + Adicionar Tarefa
                          </button>
                        </div>
                        <div className="period-tasks">
                          {period.tasks?.map(task => (
                            <div 
                              key={task.id} 
                              className={`task-card ${task.completed ? 'completed' : ''}`}
                              onClick={() => {
                                setEditingTask(task);
                                setShowTaskModal(true);
                              }}
                            >
                              <div className="task-header">
                                <input 
                                  type="checkbox" 
                                  checked={task.completed}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleToggleTask(task.id, period.id);
                                  }}
                                />
                                <h4>{task.title}</h4>
                                <button 
                                  className="delete-task-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTask(task.id);
                                  }}
                                >
                                  🗑️
                                </button>
                              </div>
                              {task.description && <p>{convertUrlsToLinks(task.description)}</p>}
                              {task.responsibleUser && (
                                <div className="task-responsible">
                                  👤 {getResponsibleUserInfo(task.responsibleUser)?.displayName || task.responsibleUser}
                                </div>
                              )}
                              {(task.startDate || task.endDate) && (
                                <div className="task-dates">
                                  {task.startDate && <span>Início: {task.startDate}</span>}
                                  {task.endDate && <span>Fim: {task.endDate}</span>}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {currentBoardType === 'goals' && (
                  <div className="goals-container">
                    <div className="goals-header">
                      <h3>Objetivos e Metas</h3>
                      <button 
                        className="btn-add-task"
                        onClick={() => {
                          setTargetListId('goals');
                          setShowTaskModal(true);
                        }}
                      >
                        + Nova Meta
                      </button>
                    </div>
                    <div className="goals-list">
                      {getCurrentBoardData()?.objectives?.map(goal => (
                        <div 
                          key={goal.id} 
                          className="goal-card"
                          onClick={() => {
                            setEditingTask(goal);
                            setShowTaskModal(true);
                          }}
                        >
                          <div className="goal-header">
                            <h4>{goal.title}</h4>
                            <button 
                              className="delete-task-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(goal.id);
                              }}
                            >
                              🗑️
                            </button>
                          </div>
                          {goal.description && <p>{convertUrlsToLinks(goal.description)}</p>}
                          {goal.responsibleUser && (
                            <div className="task-responsible">
                              👤 {getResponsibleUserInfo(goal.responsibleUser)?.displayName || goal.responsibleUser}
                            </div>
                          )}
                          <div className="goal-progress">
                            <div className="progress-bar">
                              <div 
                                className="progress-fill" 
                                style={{ width: `${goal.progress || 0}%` }}
                              ></div>
                            </div>
                            <span>{goal.progress || 0}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {showArchived && (
              <div className="archived-content">
                <h3>Itens Arquivados</h3>
                <p>Funcionalidade de arquivamento em desenvolvimento...</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Dropdown de Ações */}
      {showDropdown && (
        <div 
          className="actions-dropdown"
          style={{
            position: 'fixed',
            left: dropdownPosition.x,
            top: dropdownPosition.y,
            zIndex: 1000
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            className="dropdown-item"
            onClick={() => {
              setEditingProject(showDropdown.item);
              setShowEditProjectModal(true);
              setShowDropdown(null);
            }}
          >
            ✏️ Modificar
          </button>
          <button 
            className="dropdown-item"
            onClick={() => handleArchiveProject(
              showDropdown.item.id, 
              showDropdown.isSubProject, 
              showDropdown.parentProjectId
            )}
          >
            📦 Arquivar
          </button>
          <button 
            className="dropdown-item delete"
            onClick={() => handleDeleteProject(
              showDropdown.item.id, 
              showDropdown.isSubProject, 
              showDropdown.parentProjectId
            )}
          >
            🗑️ Excluir
          </button>
        </div>
      )}

      {/* Modais */}
      {showNewProjectModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Novo Projeto</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const isProtected = formData.get('isProtected') === 'on';
              handleCreateProject({
                name: formData.get('name'),
                description: formData.get('description'),
                color: formData.get('color'),
                isProtected: isProtected,
                password: isProtected ? formData.get('password') : ''
              });
            }}>
              <div className="form-group">
                <label>Nome do Projeto:</label>
                <input type="text" name="name" required />
              </div>
              <div className="form-group">
                <label>Descrição:</label>
                <textarea name="description" rows="3"></textarea>
              </div>
              <div className="form-group">
                <label>Cor:</label>
                <select name="color" required>
                  <option value="red">Vermelho</option>
                  <option value="blue">Azul</option>
                  <option value="green">Verde</option>
                  <option value="purple">Roxo</option>
                  <option value="orange">Laranja</option>
                  <option value="cyan">Ciano</option>
                  <option value="pink">Rosa</option>
                  <option value="yellow">Amarelo</option>
                </select>
              </div>
              <div className="form-group">
                <label>
                  <input type="checkbox" name="isProtected" />
                  Proteger com senha
                </label>
              </div>
              <div className="form-group">
                <label>Senha (se protegido):</label>
                <input type="password" name="password" />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-primary">Criar</button>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setShowNewProjectModal(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditProjectModal && editingProject && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Editar Projeto</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const isProtected = formData.get('isProtected') === 'on';
              handleEditProject({
                name: formData.get('name'),
                description: formData.get('description'),
                color: formData.get('color'),
                isProtected: isProtected,
                password: isProtected ? formData.get('password') : ''
              });
            }}>
              <div className="form-group">
                <label>Nome do Projeto:</label>
                <input 
                  type="text" 
                  name="name" 
                  defaultValue={editingProject.name}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Descrição:</label>
                <textarea 
                  name="description" 
                  rows="3"
                  defaultValue={editingProject.description}
                ></textarea>
              </div>
              <div className="form-group">
                <label>Cor:</label>
                <select name="color" defaultValue={editingProject.color} required>
                  <option value="red">Vermelho</option>
                  <option value="blue">Azul</option>
                  <option value="green">Verde</option>
                  <option value="purple">Roxo</option>
                  <option value="orange">Laranja</option>
                  <option value="cyan">Ciano</option>
                  <option value="pink">Rosa</option>
                  <option value="yellow">Amarelo</option>
                </select>
              </div>
              <div className="form-group">
                <label>
                  <input 
                    type="checkbox" 
                    name="isProtected" 
                    defaultChecked={editingProject.isProtected}
                  />
                  Proteger com senha
                </label>
              </div>
              <div className="form-group">
                <label>Senha (se protegido):</label>
                <input 
                  type="password" 
                  name="password" 
                  defaultValue={editingProject.password || ''}
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-primary">Salvar</button>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => {
                    setShowEditProjectModal(false);
                    setEditingProject(null);
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNewSubProjectModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Novo Sub-projeto</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const isProtected = formData.get('isProtected') === 'on';
              handleCreateSubProject({
                name: formData.get('name'),
                description: formData.get('description'),
                color: formData.get('color'),
                isProtected: isProtected,
                password: isProtected ? formData.get('password') : ''
              });
            }}>
              <div className="form-group">
                <label>Nome do Sub-projeto:</label>
                <input type="text" name="name" required />
              </div>
              <div className="form-group">
                <label>Descrição:</label>
                <textarea name="description" rows="3"></textarea>
              </div>
              <div className="form-group">
                <label>Cor:</label>
                <select name="color" required>
                  <option value="red">Vermelho</option>
                  <option value="blue">Azul</option>
                  <option value="green">Verde</option>
                  <option value="purple">Roxo</option>
                  <option value="orange">Laranja</option>
                  <option value="cyan">Ciano</option>
                  <option value="pink">Rosa</option>
                  <option value="yellow">Amarelo</option>
                </select>
              </div>
              <div className="form-group">
                <label>
                  <input type="checkbox" name="isProtected" />
                  Proteger com senha
                </label>
              </div>
              <div className="form-group">
                <label>Senha (se protegido):</label>
                <input type="password" name="password" />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-primary">Criar</button>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setShowNewSubProjectModal(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>🔒 Projeto Protegido</h2>
            <p>Este projeto requer senha para acesso.</p>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              handlePasswordSubmit(formData.get('password'));
            }}>
              <div className="form-group">
                <label>Senha:</label>
                <input type="password" name="password" required autoFocus />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-primary">Acessar</button>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPendingProject(null);
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTaskModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{editingTask ? 'Editar' : 'Nova'} {currentBoardType === 'goals' ? 'Meta' : 'Tarefa'}</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const taskData = {
                title: formData.get('title'),
                description: formData.get('description'),
                tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()) : [],
                priority: formData.get('priority'),
                startDate: formData.get('startDate'),
                endDate: formData.get('endDate'),
                progress: parseInt(formData.get('progress')) || 0,
                responsibleUser: formData.get('responsibleUser') || null
              };
              
              if (editingTask) {
                handleEditTask(taskData);
              } else {
                handleAddTask(targetListId, taskData);
              }
            }}>
              <div className="form-group">
                <label>{currentBoardType === 'goals' ? 'Objetivo:' : 'Título:'}</label>
                <input 
                  type="text" 
                  name="title" 
                  defaultValue={editingTask?.title || ''}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Descrição:</label>
                <textarea 
                  name="description" 
                  rows="3"
                  defaultValue={editingTask?.description || ''}
                ></textarea>
              </div>
              
              {currentBoardType !== 'goals' && (
                <>
                  <div className="form-group">
                    <label>Tags (separadas por vírgula):</label>
                    <input 
                      type="text" 
                      name="tags" 
                      defaultValue={editingTask?.tags?.join(', ') || ''}
                      placeholder="Ex: urgente, importante"
                    />
                  </div>
                  <div className="form-group">
                    <label>Prioridade:</label>
                    <select name="priority" defaultValue={editingTask?.priority || 'medium'}>
                      <option value="low">Baixa</option>
                      <option value="medium">Média</option>
                      <option value="high">Alta</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Usuário Responsável:</label>
                    <select name="responsibleUser" defaultValue={editingTask?.responsibleUser || ''}>
                      <option value="">Nenhum usuário selecionado</option>
                      {allUsers.map(user => (
                        <option key={user.username} value={user.username}>
                          {user.displayName} (@{user.username})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              
              {currentBoardType === 'timeline' && (
                <>
                  <div className="form-group">
                    <label>Data de Início:</label>
                    <input 
                      type="date" 
                      name="startDate" 
                      defaultValue={editingTask?.startDate || ''}
                    />
                  </div>
                  <div className="form-group">
                    <label>Data de Fim:</label>
                    <input 
                      type="date" 
                      name="endDate" 
                      defaultValue={editingTask?.endDate || ''}
                    />
                  </div>
                </>
              )}
              
              {currentBoardType === 'goals' && (
                <div className="form-group">
                  <label>Progresso (%):</label>
                  <input 
                    type="number" 
                    name="progress" 
                    min="0" 
                    max="100" 
                    defaultValue={editingTask?.progress || 0}
                  />
                </div>
              )}
              
              <div className="modal-actions">
                <button type="submit" className="btn-primary">
                  {editingTask ? 'Salvar' : 'Criar'}
                </button>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => {
                    setShowTaskModal(false);
                    setEditingTask(null);
                    setTargetListId(null);
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Preview de Arquivo */}
      {showPreviewModal && previewFile && (
        <div className="preview-modal" onClick={() => setShowPreviewModal(false)}>
          <div className="preview-content" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <h3>{previewFile.name}</h3>
              <button 
                className="preview-close"
                onClick={() => setShowPreviewModal(false)}
              >
                ✕ Fechar
              </button>
            </div>
            <div className="preview-body">
              {previewFile.type?.startsWith('image/') && (
                <img src={previewFile.data} alt={previewFile.name} />
              )}
              {previewFile.type?.startsWith('video/') && (
                <video controls>
                  <source src={previewFile.data} type={previewFile.type} />
                  Seu navegador não suporta vídeo.
                </video>
              )}
              {previewFile.type?.startsWith('audio/') && (
                <audio controls>
                  <source src={previewFile.data} type={previewFile.type} />
                  Seu navegador não suporta áudio.
                </audio>
              )}
              {previewFile.type?.includes('pdf') && (
                <iframe src={previewFile.data} title={previewFile.name}></iframe>
              )}
              {!previewFile.type?.startsWith('image/') && 
               !previewFile.type?.startsWith('video/') && 
               !previewFile.type?.startsWith('audio/') && 
               !previewFile.type?.includes('pdf') && (
                <div className="preview-fallback">
                  <p>Preview não disponível para este tipo de arquivo.</p>
                  <button 
                    className="preview-download"
                    onClick={() => handleDownloadFile(previewFile)}
                  >
                    📥 Download do Arquivo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default App;
