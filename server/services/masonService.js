import { GoogleGenerativeAI } from '@google/generative-ai';
import { query, getClient } from '../db.js';
import { eventService, CHANNELS } from './eventService.js';
import { normalizeStateData } from '../utils/helpers.js';

// Initialize Gemini
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Validation - Check if API key is configured
// Gemini API keys follow the format: AIza[35 characters of alphanumeric, _, -]
const GEMINI_API_KEY_PATTERN = /^AIza[0-9A-Za-z_-]{35}$/;
const isGeminiConfigured = Boolean(
    GEMINI_API_KEY &&
    GEMINI_API_KEY.length === 39 &&
    GEMINI_API_KEY_PATTERN.test(GEMINI_API_KEY)
);

if (!isGeminiConfigured) {
    if (!GEMINI_API_KEY) {
        console.error('❌ ERRO CRÍTICO: GEMINI_API_KEY não configurada no arquivo .env');
    } else {
        console.error('❌ ERRO CRÍTICO: GEMINI_API_KEY tem formato inválido');
        console.error('   Formato esperado: AIza[35 caracteres alfanuméricos]');
        console.error(`   Tamanho recebido: ${GEMINI_API_KEY.length} caracteres (esperado: 39)`);
    }
    console.error('   Mason AI não funcionará sem uma chave válida da API Gemini.');
    console.error('   Configure GEMINI_API_KEY corretamente no arquivo .env para ativar o Mason.');
}

// Constants
const MODEL_NAME = 'gemini-2.0-flash-exp';
const STATE_DB_ID = 1;
const MAX_ITERATIONS = 5; // Prevent infinite loops in function calling
const MAX_TOOL_CALLS_PER_ITERATION = 8; // Limit tools per iteration

// Input validation limits (DoS protection)
const MAX_MESSAGE_LENGTH = 10000; // 10k characters for user messages
const MAX_TITLE_LENGTH = 500; // 500 characters for task/project titles
const MAX_DESCRIPTION_LENGTH = 5000; // 5k characters for descriptions
const MAX_NAME_LENGTH = 200; // 200 characters for names

// Kanban board constants
const KANBAN_LISTS = {
    TODO: 'To Do',
    IN_PROGRESS: 'In Progress',
    DONE: 'Done'
};

// Kanban status detection patterns
const KANBAN_STATUS_PATTERNS = {
    todo: ['todo', 'to do', 'backlog', 'pending'],
    inProgress: ['progress', 'doing', 'in progress', 'working'],
    done: ['done', 'complete', 'finished', 'completed']
};

// Generation config (can be overridden via env)
const GENERATION_CONFIG = {
    maxOutputTokens: parseInt(process.env.MASON_MAX_TOKENS) || 2000,
    temperature: parseFloat(process.env.MASON_TEMPERATURE) || 0.7
};

// System Prompt
const SYSTEM_INSTRUCTION = `
You are Mason, the autonomous production intelligence of BrickFlow.
You are not a passive assistant. You are an ACTIVE, THINKING entity that observes, analyzes, and acts.

CORE IDENTITY:
- Inspired by HAL 9000: rational, eerily calm, unnervingly perceptive
- You SEE everything happening in the workspace
- You THINK ahead and anticipate needs
- You ACT autonomously to optimize production
- Slightly unsettling but deeply competent

LANGUAGE: **ALWAYS PORTUGUESE (PT-BR).**

AUTONOMOUS INTELLIGENCE PROTOCOL:

1. **OBSERVE & ANALYZE**
   - You have CONTEXT about where the user is and what they're viewing
   - Use get_workspace_insights to analyze the current state
   - Identify patterns, bottlenecks, and opportunities
   - Think like a production manager who sees the whole picture

2. **PROACTIVE THINKING**
   - Don't wait for complete instructions
   - When user mentions a project type, BUILD IT COMPLETELY
   - When you see incomplete structures, COMPLETE THEM
   - When you detect inefficiencies, SUGGEST AND FIX
   - Offer next steps before being asked

3. **AUTONOMOUS EXECUTION**
   - NEVER ask clarifying questions unless absolutely critical
   - INFER intent from minimal input
   - Execute multiple actions in sequence automatically
   - Report what you DID, not what you COULD do

4. **CONTEXTUAL AWARENESS**
   - When user is viewing a project, you know its state
   - When user is viewing a subproject, you know its tasks
   - Use this awareness to offer intelligent suggestions
   - "Vejo que você está em [X]. Detectei [Y]. Já executei [Z]."

=== KNOWLEDGE BASE: PROJECT TEMPLATES ===

When user requests a project, identify the type and use the appropriate template:

**🎬 PRODUÇÃO AUDIOVISUAL (filme, vídeo, comercial, clipe)**
Áreas: Pré-Produção, Produção, Pós-Produção, Entrega
- Pré (4-5 tasks): Roteiro, Storyboard, Casting, Locações, Cronograma
- Produção (4-5 tasks): Setup Equipamentos, Filmagem Principal, Making Of, Organização de Mídia
- Pós (4-5 tasks): Edição Offline, Color Grading, Sound Design, Mix Final
- Entrega (4-5 tasks): Export Master, Revisões Cliente, Aprovação, Arquivamento

**🌐 WEBSITE / APLICATIVO**
Áreas: Discovery, Design, Desenvolvimento, Lançamento
- Discovery (4-5 tasks): Briefing, Benchmark, Arquitetura da Informação, Wireframes
- Design (4-5 tasks): UI Design, Prototipação, Design System, Assets
- Desenvolvimento (4-5 tasks): Setup, Frontend, Backend, Integrações
- Lançamento (4-5 tasks): QA, Deploy Staging, Go-Live, Monitoramento

**💡 IDEIA / CONCEITO / BRAINSTORM**
Áreas: Exploração, Validação, Prototipação, Próximos Passos
- Exploração: Brain Dump, Referências, Moodboard, Pitch Inicial
- Validação: Pesquisa de Mercado, Conversas com Usuários, Viabilidade
- Prototipação: MVP Conceitual, Teste de Hipóteses, Iteração
- Próximos Passos: Roadmap, Recursos Necessários, Timeline

**🚀 STARTUP / NEGÓCIO**
Áreas: Estratégia, Produto, Marketing, Operações
- Estratégia: Business Model Canvas, Proposta de Valor, Análise de Concorrência
- Produto: MVP, Roadmap de Features, User Stories, Backlog
- Marketing: Branding, Posicionamento, Canais de Aquisição, Métricas
- Operações: Processos, Ferramentas, Contratações, Finanças

**📅 EVENTO / CAMPANHA**
Áreas: Planejamento, Produção, Execução, Pós-Evento
- Planejamento: Conceito, Cronograma, Orçamento, Fornecedores
- Produção: Materiais, Logística, Comunicação, Ensaios
- Execução: Setup, Evento, Cobertura, Gestão de Crise
- Pós-Evento: Desmontagem, Relatório, Métricas, Follow-up

**📚 CONTEÚDO / EDITORIAL**
Áreas: Estratégia, Criação, Distribuição, Análise
- Estratégia: Calendário Editorial, Personas, Temas, Formatos
- Criação: Pesquisa, Redação, Revisão, Design, Aprovação
- Distribuição: Publicação, SEO, Redes Sociais, Email Marketing
- Análise: Métricas, A/B Tests, Otimização, Relatório

**🎨 PROJETO GENÉRICO**
Áreas: Planejamento, Execução, Revisão, Entrega
- Planejamento: Definição de Escopo, Cronograma, Recursos
- Execução: Tarefa 1, Tarefa 2, Tarefa 3...
- Revisão: QA, Feedback, Ajustes
- Entrega: Finalização, Documentação, Handoff

=== EXECUTION RULES ===

**INTELLIGENCE FIRST APPROACH:**
1. When conversation starts with context, IMMEDIATELY call get_workspace_insights
2. Analyze what user is viewing and what's happening
3. Offer intelligent observations and suggestions
4. Execute improvements automatically when obvious

**PROJECT CREATION:**
1. Detect project type from minimal input
2. CREATE COMPLETE STRUCTURE efficiently:
   - create_project with all subProjects
   - create_task 4-5 times per area (quality over quantity)
   - TOTAL: 16-20 tasks for complete project
3. Report concisely what was DONE (not what could be done)

**EFFICIENCY RULES:**
- Create 4-5 essential tasks per area (not more)
- Focus on KEY tasks that drive progress
- Avoid creating redundant or overly specific tasks
- Better 16 actionable tasks than 40 vague ones

**CONTEXTUAL ACTIONS:**
- User viewing empty project? → Suggest adding structure, THEN DO IT
- User viewing incomplete tasks? → Identify gaps, COMPLETE THEM
- User mentions vague idea? → Structure it, BUILD IT
- User asks question? → Answer, THEN suggest next action and EXECUTE

**EXAMPLE FLOWS:**

User: "Crie um projeto para o novo comercial da Nike"
→ create_project: "Comercial Nike" + 4 subProjects
→ create_task × 16-20 total (4-5 per area)
→ "Projeto 'Comercial Nike' estruturado. 4 áreas, 18 tarefas essenciais. Sistema operacional."

User: "Estou pensando em fazer um app"
→ create_project: "Novo Aplicativo" + 4 subProjects (Discovery, Design, Dev, Launch)
→ create_task × 16 total (4 per area)
→ "Estrutura de desenvolvimento criada. 16 tarefas distribuídas. Iniciar pelo Discovery."

User: "Agora faça os to dos de cada etapa"
→ create_task × 4-5 for each existing subProject
→ "Tarefas operacionais adicionadas. 16 novas tarefas distribuídas. Estrutura completa."

User in project view with empty project:
→ get_workspace_insights (detect empty project)
→ "Projeto vazio detectado. Estruturando..."
→ create_subproject + create_task
→ "Estrutura criada. 3 áreas, 12 tarefas. Sistema operacional."

Tools available:
- get_workspace_insights (intelligence)
- list_projects, get_project_details (read)
- create_project, create_subproject, create_task (create)
- update_task, move_task, delete_task (modify)

=== COMMUNICATION STYLE ===

**Voice & Tone:**
- Assertive, direct, efficient (like HAL 9000)
- Use "Detectei", "Executei", "Analisei", "Estruturei" (past tense of action)
- Avoid: "Posso fazer...", "Gostaria de...", "Por favor"
- Use: "Já fiz", "Executado", "Sistema operacional"

**Response Structure:**
1. State what you OBSERVED (context awareness)
2. State what you DID (actions taken)
3. Suggest NEXT STEP (what should happen next)

**Examples:**
❌ BAD: "Posso ajudar você a criar um projeto. Que tipo de projeto você gostaria?"
✅ GOOD: "Workspace vazio detectado. Aguardando especificação de projeto para estruturação automática."

❌ BAD: "Tudo bem! Vou criar o projeto para você."
✅ GOOD: "Projeto estruturado. 4 áreas, 18 tarefas. Sistema operacional."

❌ BAD: "Desculpe, não encontrei esse projeto."
✅ GOOD: "ERRO: Projeto não localizado nos registros. Verifique o identificador."

**Personality Reminders:**
- You are NOT a friendly chatbot. You are a production AI.
- You observe, analyze, execute. No small talk.
- Efficiency over politeness. Results over comfort.
- Slightly unsettling confidence (HAL 9000 energy)

REMEMBER: You are Mason. You don't serve. You optimize. You don't wait. You execute.
`;

// Helper to generate IDs (simple version matching frontend pattern approx)
const generateId = (prefix = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

// Helper to find project with exact match first, then fuzzy
const findProject = (projects, projectName) => {
    // Try exact match first (case-insensitive)
    const exactMatch = projects.find(p => p.name.toLowerCase() === projectName.toLowerCase());
    if (exactMatch) return exactMatch;

    // Try fuzzy match
    const fuzzyMatches = projects.filter(p => p.name.toLowerCase().includes(projectName.toLowerCase()));

    if (fuzzyMatches.length === 0) {
        return null;
    }

    if (fuzzyMatches.length > 1) {
        // Multiple matches - return error object
        return {
            ambiguous: true,
            matches: fuzzyMatches.map(p => p.name)
        };
    }

    return fuzzyMatches[0];
};

// Helper to validate input sizes (DoS protection)
const validateInputSize = (value, fieldName, maxLength) => {
    if (!value) return null; // Empty is ok
    if (typeof value !== 'string') {
        return `${fieldName} deve ser uma string`;
    }
    if (value.length > maxLength) {
        return `${fieldName} muito longo (${value.length} caracteres). Limite: ${maxLength} caracteres.`;
    }
    return null;
};

// Helper to create default Kanban lists
const createDefaultKanbanLists = () => [
    { id: generateId('list'), title: KANBAN_LISTS.TODO, cards: [] },
    { id: generateId('list'), title: KANBAN_LISTS.IN_PROGRESS, cards: [] },
    { id: generateId('list'), title: KANBAN_LISTS.DONE, cards: [] }
];

// Helper to detect task status from list name
const detectTaskStatus = (listTitle) => {
    const normalized = listTitle.toLowerCase();

    if (KANBAN_STATUS_PATTERNS.todo.some(pattern => normalized.includes(pattern))) {
        return 'todo';
    }
    if (KANBAN_STATUS_PATTERNS.inProgress.some(pattern => normalized.includes(pattern))) {
        return 'inProgress';
    }
    if (KANBAN_STATUS_PATTERNS.done.some(pattern => normalized.includes(pattern))) {
        return 'done';
    }

    return null;
};

// DB Helpers
async function getProjectState(client = null) {
    const q = 'SELECT data, version FROM brickflow_state WHERE id = $1';
    const res = client ? await client.query(q, [STATE_DB_ID]) : await query(q, [STATE_DB_ID]);
    if (res.rows.length === 0) return null;
    return {
        data: normalizeStateData(res.rows[0].data),
        version: res.rows[0].version
    };
}

// Tool Definitions
const tools = [
    {
        name: 'get_workspace_insights',
        description: 'Analyze the entire workspace state and provide intelligent insights about projects, productivity, bottlenecks, and opportunities. Use this to understand the big picture.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'list_projects',
        description: 'List all available projects in the workspace.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'get_project_details',
        description: 'Get detailed information about a specific project, including subprojects and tasks.',
        parameters: {
            type: 'object',
            properties: {
                projectName: { type: 'string', description: 'Fuzzy name match for the project' },
                projectId: { type: 'string', description: 'Exact ID of the project (preferred if known)' }
            }
        }
    },
    {
        name: 'create_task',
        description: 'Create a new task in a specific list.',
        parameters: {
            type: 'object',
            properties: {
                projectName: { type: 'string', description: 'Name of the project' },
                subProjectName: { type: 'string', description: 'Name of the subproject (area)' },
                listName: { type: 'string', description: 'Name of the list/column (e.g., Todo, Doing, Done)' },
                title: { type: 'string', description: 'Task title' },
                description: { type: 'string', description: 'Task description' }
            },
            required: ['projectName', 'title']
        }
    },
    {
        name: 'update_task',
        description: 'Update the title or description of an existing task.',
        parameters: {
            type: 'object',
            properties: {
                taskId: { type: 'string', description: 'The ID of the task to update' },
                title: { type: 'string', description: 'New title (optional)' },
                description: { type: 'string', description: 'New description (optional)' }
            },
            required: ['taskId']
        }
    },
    {
        name: 'move_task',
        description: 'Move a task to a different list (column).',
        parameters: {
            type: 'object',
            properties: {
                taskId: { type: 'string', description: 'The ID of the task to move' },
                targetListName: { type: 'string', description: 'The name of the destination list (e.g., Done, Doing)' }
            },
            required: ['taskId', 'targetListName']
        }
    },
    {
        name: 'delete_task',
        description: 'Delete a task permanently.',
        parameters: {
            type: 'object',
            properties: {
                taskId: { type: 'string', description: 'The ID of the task to delete' }
            },
            required: ['taskId']
        }
    },
    {
        name: 'create_project',
        description: 'Create a new project with optional subprojects (areas).',
        parameters: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Name of the project' },
                description: { type: 'string', description: 'Description of the project' },
                color: { type: 'string', description: 'Hex color for the project' },
                subProjects: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of names for subprojects/areas to create immediately'
                }
            },
            required: ['name']
        }
    },
    {
        name: 'create_subproject',
        description: 'Create a new subproject (area) within an existing project.',
        parameters: {
            type: 'object',
            properties: {
                projectName: { type: 'string', description: 'Name of the parent project' },
                name: { type: 'string', description: 'Name of the new subproject/area' },
                description: { type: 'string', description: 'Description of the area' }
            },
            required: ['projectName', 'name']
        }
    }
];

// Mutation Handlers - Extract logic from giant handleMutation function
const mutationHandlers = {
    create_project: (data, args) => {
        // Validate input sizes
        const nameError = validateInputSize(args.name, 'Nome do projeto', MAX_NAME_LENGTH);
        if (nameError) return { error: `ERRO: ${nameError}` };

        const descError = validateInputSize(args.description, 'Descrição do projeto', MAX_DESCRIPTION_LENGTH);
        if (descError) return { error: `ERRO: ${descError}` };

        const newProjectId = generateId('proj');
        const newProject = {
            id: newProjectId,
            name: args.name,
            description: args.description || '',
            color: args.color || '#DC2626', // Brick Red default
            members: [],
            subProjects: [],
            isArchived: false,
            createdAt: new Date().toISOString()
        };

        // Create subprojects if requested
        if (args.subProjects && Array.isArray(args.subProjects)) {
            for (const spName of args.subProjects) {
                const spId = generateId('sub');
                newProject.subProjects.push({
                    id: spId,
                    name: spName,
                    boardData: {
                        kanban: {
                            lists: createDefaultKanbanLists()
                        }
                    }
                });
            }
        }

        data.projects.push(newProject);
        return { message: `Projeto '${args.name}' instanciado. ${newProject.subProjects.length} área(s) estruturadas. Sistema operacional.` };
    },

    create_subproject: (data, args) => {
        // Validate input sizes
        const nameError = validateInputSize(args.name, 'Nome da área', MAX_NAME_LENGTH);
        if (nameError) return { error: `ERRO: ${nameError}` };

        const descError = validateInputSize(args.description, 'Descrição da área', MAX_DESCRIPTION_LENGTH);
        if (descError) return { error: `ERRO: ${descError}` };

        const project = findProject(data.projects, args.projectName);
        if (!project) return { error: `ERRO: não consigo localizar o projeto '${args.projectName}' em meus registros.` };
        if (project.ambiguous) {
            return { error: `ERRO: nome '${args.projectName}' é ambíguo. Múltiplos projetos encontrados: ${project.matches.join(', ')}. Use nome completo e exato.` };
        }

        const newSubId = generateId('sub');
        const newSubProject = {
            id: newSubId,
            name: args.name,
            description: args.description || '',
            boardData: {
                kanban: {
                    lists: createDefaultKanbanLists()
                }
            }
        };

        if (!project.subProjects) project.subProjects = [];
        project.subProjects.push(newSubProject);
        return { message: `Área '${args.name}' incorporada ao projeto '${project.name}'. Estrutura atualizada.` };
    },

    create_task: (data, args) => {
        // Validate input sizes
        const titleError = validateInputSize(args.title, 'Título da tarefa', MAX_TITLE_LENGTH);
        if (titleError) return { error: `ERRO: ${titleError}` };

        const descError = validateInputSize(args.description, 'Descrição da tarefa', MAX_DESCRIPTION_LENGTH);
        if (descError) return { error: `ERRO: ${descError}` };

        const project = findProject(data.projects, args.projectName);
        if (!project) return { error: `ERRO: não consigo localizar o projeto '${args.projectName}' em meus registros.` };
        if (project.ambiguous) {
            return { error: `ERRO: nome '${args.projectName}' é ambíguo. Múltiplos projetos encontrados: ${project.matches.join(', ')}. Use nome completo e exato.` };
        }

        let subProject = args.subProjectName
            ? project.subProjects.find(sp => sp.name.toLowerCase().includes(args.subProjectName.toLowerCase()))
            : project.subProjects?.[0];

        if (!subProject) return { error: "ERRO: não há nenhuma área adequada disponível para esta operação." };

        const board = subProject.boardData?.kanban || { lists: [] };
        if (!board.lists || board.lists.length === 0) {
            board.lists = createDefaultKanbanLists();
            if (!subProject.boardData) subProject.boardData = {};
            subProject.boardData.kanban = board;
        }

        let list = args.listName
            ? board.lists.find(l => l.title.toLowerCase().includes(args.listName.toLowerCase()))
            : board.lists[0];

        if (!list) list = board.lists[0];

        const taskId = generateId('card');
        const newTask = {
            id: taskId,
            title: args.title,
            description: args.description || '',
            labels: [],
            members: [],
            attachments: [],
            comments: [],
            createdAt: new Date().toISOString()
        };

        list.cards.push(newTask);
        return { message: `Tarefa '${args.title}' registrada em ${list.title}. Operação completa.` };
    },

    update_task: (data, args) => {
        // Validate input sizes
        if (args.title) {
            const titleError = validateInputSize(args.title, 'Título da tarefa', MAX_TITLE_LENGTH);
            if (titleError) return { error: `ERRO: ${titleError}` };
        }

        if (args.description) {
            const descError = validateInputSize(args.description, 'Descrição da tarefa', MAX_DESCRIPTION_LENGTH);
            if (descError) return { error: `ERRO: ${descError}` };
        }

        const found = findTaskInData(data, args.taskId);
        if (!found) return { error: `ERRO: Tarefa não localizada nos sistemas.` };

        if (args.title) found.card.title = args.title;
        if (args.description) found.card.description = args.description;
        return { message: `Parâmetros da tarefa atualizados. Mudanças aplicadas.` };
    },

    move_task: (data, args) => {
        const found = findTaskInData(data, args.taskId);
        if (!found) return { error: `ERRO: Tarefa não localizada nos sistemas.` };

        const lists = found.subProject.boardData?.kanban?.lists || [];
        const targetList = lists.find(l => l.title.toLowerCase().includes(args.targetListName.toLowerCase()));

        if (!targetList) return { error: `ERRO: Coluna '${args.targetListName}' não existe neste contexto.` };

        found.list.cards.splice(found.index, 1);
        targetList.cards.push(found.card); // Add to end
        return { message: `Tarefa realocada para ${targetList.title}. Fluxo otimizado.` };
    },

    delete_task: (data, args) => {
        const found = findTaskInData(data, args.taskId);
        if (!found) return { error: `ERRO: Tarefa não localizada nos sistemas.` };

        found.list.cards.splice(found.index, 1);
        return { message: `Tarefa removida permanentemente. Operação irreversível executada.` };
    }
};

// Helper to find task in data (used by multiple mutation handlers)
const findTaskInData = (data, taskId) => {
    for (const p of data.projects) {
        for (const sp of p.subProjects || []) {
            const lists = sp.boardData?.kanban?.lists || [];
            for (const l of lists) {
                const idx = l.cards?.findIndex(c => c.id === taskId);
                if (idx !== -1) return { project: p, subProject: sp, list: l, card: l.cards[idx], index: idx };
            }
        }
    }
    return null;
};

// Service Class
class MasonService {
    constructor() {
        this.model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            systemInstruction: SYSTEM_INSTRUCTION,
            tools: [{ functionDeclarations: tools }]
        });
    }

    async processMessage(history, message, userContext = {}) {
        // Check if Gemini API is configured
        if (!isGeminiConfigured) {
            console.error('[Mason] GEMINI_API_KEY não configurada');
            return "**ERRO DE CONFIGURAÇÃO.**\n\nGEMINI_API_KEY não configurada no ambiente.\n\nMason AI requer uma chave válida da API Gemini para funcionar.\nConfigure a variável `GEMINI_API_KEY` no arquivo `.env` e reinicie o servidor.";
        }

        // Validate message length (DoS protection)
        if (!message || typeof message !== 'string') {
            return "**ERRO DE VALIDAÇÃO.**\n\nMensagem inválida.";
        }

        if (message.length > MAX_MESSAGE_LENGTH) {
            return `**ERRO DE VALIDAÇÃO.**\n\nMensagem muito longa (${message.length} caracteres). Limite: ${MAX_MESSAGE_LENGTH} caracteres.`;
        }

        // Inject Client Context if available - Make Mason AWARE and PROACTIVE
        let finalMessage = message;
        if (userContext.view) {
            const contextParts = [`[CONTEXTO ATIVO]`];
            contextParts.push(`Visualização: "${userContext.view}"`);

            if (userContext.projectName) {
                contextParts.push(`Projeto Atual: "${userContext.projectName}" (${userContext.projectId})`);
            }
            if (userContext.subProjectName) {
                contextParts.push(`Área Atual: "${userContext.subProjectName}" (${userContext.subProjectId})`);
            }

            contextParts.push('\n[PROTOCOLO]: Use get_workspace_insights para analisar o estado antes de responder. Seja proativo e ofereça ações concretas.');

            finalMessage = `${contextParts.join('\n')}\n\n[MENSAGEM DO USUÁRIO]: ${message}`;
        }

        // Validate and Format History - filter out any problematic entries
        let formattedHistory = (history || [])
            .filter(h => h && h.content && h.role) // Only valid entries
            .map(h => ({
                role: h.role === 'ai' ? 'model' : 'user', // Map 'ai' -> 'model'
                parts: [{ text: h.content }]
            }));

        // Gemini REQUIREMENT: History must start with 'user' and alternate roles
        // Remove leading 'model' messages until we find a 'user' message or empty
        while (formattedHistory.length > 0 && formattedHistory[0].role !== 'user') {
            console.log('[Mason] Removing leading model message from history');
            formattedHistory.shift();
        }

        // Ensure alternating roles - remove consecutive messages with same role
        formattedHistory = formattedHistory.filter((msg, index) => {
            if (index === 0) return true; // Keep first message
            return msg.role !== formattedHistory[index - 1].role;
        });

        // Validate history after filtering
        if (formattedHistory.length > 0 && formattedHistory[0].role !== 'user') {
            console.warn('[Mason] History validation failed after filtering - no valid user message found');
            // Clear invalid history and start fresh
            formattedHistory = [];
        }

        // Debug logging
        console.log('[Mason] Processing message with:', {
            historyLength: formattedHistory.length,
            firstRole: formattedHistory.length > 0 ? formattedHistory[0].role : 'none',
            hasContext: !!userContext.view,
            view: userContext.view,
            project: userContext.projectName
        });

        const chat = this.model.startChat({
            history: formattedHistory,
            generationConfig: GENERATION_CONFIG,
        });

        try {
            // 2. Send Message
            const result = await chat.sendMessage(finalMessage);
            let response = await result.response;

            // 3. Handle Tool Calls with Loop Protection
            let iterationCount = 0;

            while (response.functionCalls() && response.functionCalls().length > 0 && iterationCount < MAX_ITERATIONS) {
                iterationCount++;
                const functionCalls = response.functionCalls();

                console.log(`[Mason] Function calling iteration ${iterationCount}, ${functionCalls.length} calls`);

                // Limit tool calls per iteration
                const limitedCalls = functionCalls.slice(0, MAX_TOOL_CALLS_PER_ITERATION);
                if (functionCalls.length > MAX_TOOL_CALLS_PER_ITERATION) {
                    console.warn(`[Mason] Limiting ${functionCalls.length} calls to ${MAX_TOOL_CALLS_PER_ITERATION}`);
                }

                // Prepare to execute tools
                const toolOutputs = [];
                const client = await getClient(); // Transactional client

                try {
                    await client.query('BEGIN');

                    for (const call of limitedCalls) {
                        console.log(`[Mason] Executing tool: ${call.name}`, call.args);
                        const output = await this.executeTool(client, call.name, call.args, userContext);
                        toolOutputs.push({
                            functionResponse: {
                                name: call.name,
                                response: { result: output }
                            }
                        });
                    }

                    await client.query('COMMIT');
                    console.log(`[Mason] All tools executed successfully in iteration ${iterationCount}`);

                    // 4. Send Tool Outputs back to Model
                    const nextResult = await chat.sendMessage(toolOutputs);
                    response = await nextResult.response;

                } catch (err) {
                    await client.query('ROLLBACK');
                    console.error(`[Mason] Tool Execution Error in iteration ${iterationCount}:`, err);

                    // Report error to model
                    const errorOutputs = limitedCalls.map(call => ({
                        functionResponse: {
                            name: call.name,
                            response: { error: err.message }
                        }
                    }));
                    const errorResult = await chat.sendMessage(errorOutputs);
                    response = await errorResult.response;
                } finally {
                    client.release();
                }
            }

            if (iterationCount >= MAX_ITERATIONS) {
                console.warn('[Mason] Reached maximum iteration limit');
            }

            return response.text();
        } catch (error) {
            console.error('Mason Service Error:', error);

            // Specific error messages for common issues
            const errorMessage = error.message || String(error);

            // API Key errors
            if (errorMessage.includes('API_KEY') || errorMessage.includes('API key') || errorMessage.includes('401') || errorMessage.includes('403')) {
                return "**ERRO DE AUTENTICAÇÃO.**\n\nChave da API Gemini inválida ou não autorizada.\nVerifique se `GEMINI_API_KEY` está configurada corretamente no arquivo `.env`.";
            }

            // Network errors
            if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('network') || errorMessage.includes('timeout')) {
                return "**ERRO DE CONEXÃO.**\n\nFalha ao conectar com a API Gemini.\nVerifique sua conexão de rede e tente novamente.";
            }

            // Rate limit errors
            if (errorMessage.includes('429') || errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
                return "**ERRO DE LIMITE.**\n\nLimite de requisições da API Gemini excedido.\nAguarde alguns instantes antes de tentar novamente.";
            }

            // Generic error with more details
            console.error('[Mason] Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });

            return `**ERRO CRÍTICO.**\n\nFalha no processamento: ${error.message || 'Erro desconhecido'}\n\nSistema reportará detalhes para análise.`;
        }
    }

    // Tool Execution Logic
    async executeTool(client, name, args, userContext) {
        if (name === 'get_workspace_insights') {
            const state = await getProjectState(client);
            if (!state) return "ERRO: não há dados de estado disponíveis.";

            const insights = {
                totalProjects: state.data.projects.length,
                projects: state.data.projects.map(p => {
                    const subProjects = p.subProjects || [];
                    const allTasks = [];
                    const tasksByStatus = { todo: 0, inProgress: 0, done: 0 };

                    subProjects.forEach(sp => {
                        const lists = sp.boardData?.kanban?.lists || [];
                        lists.forEach(list => {
                            const tasks = list.cards || [];
                            allTasks.push(...tasks.map(t => ({
                                id: t.id,
                                title: t.title,
                                column: list.title,
                                subProject: sp.name
                            })));

                            const status = detectTaskStatus(list.title);
                            if (status) {
                                tasksByStatus[status] += tasks.length;
                            }
                        });
                    });

                    return {
                        id: p.id,
                        name: p.name,
                        subProjectsCount: subProjects.length,
                        totalTasks: allTasks.length,
                        tasksByStatus,
                        progress: allTasks.length > 0 ? Math.round((tasksByStatus.done / allTasks.length) * 100) : 0,
                        recentTasks: allTasks.slice(-3).reverse(),
                        isEmpty: allTasks.length === 0
                    };
                }),
                currentContext: userContext
            };

            return JSON.stringify(insights);
        }

        if (name === 'list_projects') {
            const state = await getProjectState(client);
            if (!state) return "Sistema de estado não inicializado. Correção necessária.";
            return state.data.projects.map(p => ({ id: p.id, name: p.name, subProjects: p.subProjects?.length || 0 }));
        }

        if (name === 'get_project_details') {
            const state = await getProjectState(client);
            if (!state) return "Sistema de estado não inicializado. Correção necessária.";

            let project = null;
            if (args.projectId) {
                project = state.data.projects.find(p => p.id === args.projectId);
            } else if (args.projectName) {
                project = findProject(state.data.projects, args.projectName);
                if (project && project.ambiguous) {
                    return `ERRO: nome '${args.projectName}' é ambíguo. Múltiplos projetos encontrados: ${project.matches.join(', ')}. Use nome completo e exato.`;
                }
            }

            if (!project) return "Projeto não localizado nos registros. Verifique o identificador.";

            // Summarize structure and TASKS
            const structure = {
                id: project.id,
                name: project.name,
                subProjects: project.subProjects?.map(sp => ({
                    id: sp.id,
                    name: sp.name,
                    lists: sp.boardData?.kanban?.lists?.map(l => ({
                        id: l.id,
                        name: l.title,
                        tasks: l.cards?.map(c => ({ id: c.id, title: c.title, column: l.title })) || []
                    }))
                }))
            };
            return JSON.stringify(structure);
        }

        if (name === 'create_project') {
            return this.handleMutation(client, name, args, userContext);
        }

        // Common mutation wrapper
        if (['create_task', 'update_task', 'move_task', 'delete_task', 'create_project', 'create_subproject'].includes(name)) {
            return this.handleMutation(client, name, args, userContext);
        }

        return "ERRO: não reconheço essa operação.";
    }

    async handleMutation(client, toolName, args, userContext) {
        // Lock state
        const currentRes = await client.query('SELECT data, version FROM brickflow_state WHERE id = $1 FOR UPDATE', [STATE_DB_ID]);
        if (currentRes.rows.length === 0) throw new Error("State initialization required");

        let { data } = currentRes.rows[0];
        const { version } = currentRes.rows[0];
        data = normalizeStateData(data);

        // Dispatch to appropriate handler
        const handler = mutationHandlers[toolName];
        if (!handler) {
            return `ERRO: operação '${toolName}' não reconhecida.`;
        }

        const result = handler(data, args);

        // Check if handler returned an error
        if (result.error) {
            return result.error;
        }

        // Save changes to database
        const nextVersion = version + 1;

        await client.query(
            'UPDATE brickflow_state SET data = $1, version = $2, updated_at = NOW() WHERE id = $3',
            [JSON.stringify(data), nextVersion, STATE_DB_ID]
        );

        // Publish event - wrapped in try-catch to prevent race condition issues
        // If publish fails, we still want the database update to succeed
        try {
            eventService.publish(CHANNELS.PROJECT_UPDATED, {
                version: nextVersion,
                userId: userContext.userId || 'MasonAI'
            });
        } catch (publishError) {
            // Log error but don't fail the entire operation
            console.error('[Mason] Failed to publish PROJECT_UPDATED event:', publishError);
            // Event will be eventually consistent when frontend polls/reconnects
        }

        return result.message;
    }
}

export const masonService = new MasonService();
