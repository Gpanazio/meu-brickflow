import { GoogleGenerativeAI } from '@google/generative-ai';
import { getClient } from '../db.js';
import { eventService, CHANNELS } from './eventService.js';


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

const TODO_LISTS = {
    PENDING: 'Pending',
    COMPLETED: 'Completed'
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

=== BOARD TYPES ===

CHOOSE the best board type for each subproject/area:
1. **KANBAN** (Default): Use for process-oriented workflows where tasks move through stages (Todo → Doing → Done).
   - Best for: Development, Video Production, Content Creation pipelines.

2. **TODO** (Simple List): Use for simple checklists or items that are just "done" or "not done".
   - Best for: Brainstorming, Shopping Lists, Requirements, Feedback lists.

Valid types for tools: 'KANBAN' or 'TODO'. If unsure, use 'KANBAN'.

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
→ create_project_with_tasks: name="Comercial Nike", structure=[{areaName: "Pré", tasks: ["Roteiro", "Casting", "Locações"]}, {areaName: "Produção", tasks: ["Filmagem", "Equipamentos"]}, {areaName: "Pós", tasks: ["Edição", "Color Grading"]}]
→ "Projeto 'Comercial Nike' estruturado com 3 áreas e 7 tarefas. Pronto para execução."

User: "Estou pensando em fazer um app"
→ create_project_with_tasks: name="Novo Aplicativo", structure=[{areaName: "Discovery", tasks: ["Briefing", "Benchmark"]}, {areaName: "Design", tasks: ["Wireframes", "UI"]}, {areaName: "Dev", tasks: ["Frontend", "Backend"]}, {areaName: "Launch", tasks: ["QA", "Deploy"]}]
→ "Estrutura de desenvolvimento criada. 4 áreas, 8 tarefas. Iniciar pelo Discovery."

User: "Agora faça os to dos de cada etapa" (in existing project)
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
- **create_project_with_tasks** (PREFERRED for new projects - batch creates areas + tasks)
- create_project, create_subproject, create_task (individual creation)
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
                description: { type: 'string', description: 'Description of the area' },
                boardType: { type: 'string', description: 'Type of board: "KANBAN" or "TODO". Default is KANBAN.' }
            },
            required: ['projectName', 'name']
        }
    },
    {
        name: 'create_project_with_tasks',
        description: 'BATCH OPERATION: Create a new project with subprojects AND tasks in a single call. Use this for efficient project scaffolding.',
        parameters: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Name of the project' },
                description: { type: 'string', description: 'Description of the project' },
                color: { type: 'string', description: 'Hex color for the project' },
                structure: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            areaName: { type: 'string', description: 'Name of the subproject/area' },
                            boardType: { type: 'string', description: 'Type of board: "KANBAN" or "TODO". Default is KANBAN.' },
                            tasks: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'List of task titles for this area'
                            }
                        }
                    },
                    description: 'Array of areas, each with task titles'
                }
            },
            required: ['name', 'structure']
        }
    }
];

// Helper: Create default subproject with Kanban lists
const createDefaultSubProject = async (client, projectId, subProjectName, boardType = 'KANBAN') => {
    const subProjectId = generateId('sub');
    const boardConfig = { enabledTabs: [boardType === 'TODO' ? 'todo' : 'kanban', 'files'] };
    const listDefinitions = boardType === 'TODO' ? TODO_LISTS : KANBAN_LISTS;

    await client.query(
        'INSERT INTO sub_projects (id, project_id, name, board_config) VALUES ($1, $2, $3, $4)',
        [subProjectId, projectId, subProjectName, JSON.stringify(boardConfig)]
    );

    let idx = 0;
    for (const listTitle of Object.values(listDefinitions)) {
        const listId = generateId('list');
        await client.query(
            'INSERT INTO lists (id, sub_project_id, title, order_index, type) VALUES ($1, $2, $3, $4, $5)',
            [listId, subProjectId, listTitle, idx++, boardType]
        );
    }

    return subProjectId;
};

// Mutation Handlers - Refactored for Direct SQL (V2 Architecture)
const mutationHandlers = {
    create_project: async (args, client) => {
        // Validate input sizes
        const nameError = validateInputSize(args.name, 'Nome do projeto', MAX_NAME_LENGTH);
        if (nameError) return { error: `ERRO: ${nameError}` };

        const descError = validateInputSize(args.description, 'Descrição do projeto', MAX_DESCRIPTION_LENGTH);
        if (descError) return { error: `ERRO: ${descError}` };

        const newProjectId = generateId('proj');
        const color = args.color || '#DC2626';

        await client.query(
            'INSERT INTO projects (id, name, description, color, created_at, is_archived) VALUES ($1, $2, $3, $4, NOW(), false)',
            [newProjectId, args.name, args.description || '', color]
        );

        // Create subprojects if requested
        let areaCount = 0;
        if (args.subProjects && Array.isArray(args.subProjects)) {
            for (const spName of args.subProjects) {
                await createDefaultSubProject(client, newProjectId, spName);
                areaCount++;
            }
        }

        // Emit Event
        await eventService.publish(CHANNELS.PROJECT_CREATED, { id: newProjectId, name: args.name });

        return { message: `Projeto '${args.name}' instanciado. ${areaCount} área(s) estruturadas. Sistema operacional.` };
    },

    create_subproject: async (args, client) => {
        const nameError = validateInputSize(args.name, 'Nome da área', MAX_NAME_LENGTH);
        if (nameError) return { error: `ERRO: ${nameError}` };

        // Find Project ID
        // Note: We need a helper to resolve Project Name -> ID using SQL
        const projectRes = await client.query('SELECT id, name FROM projects WHERE name ILIKE $1 OR id = $1 LIMIT 1', [args.projectName]);
        if (projectRes.rows.length === 0) return { error: `ERRO: projeto '${args.projectName}' não encontrado.` };
        const project = projectRes.rows[0];

        const newSubId = generateId('sub');
        const boardConfig = { enabledTabs: [args.boardType === 'TODO' ? 'todo' : 'kanban', 'files'] };

        await client.query(
            'INSERT INTO sub_projects (id, project_id, name, board_config) VALUES ($1, $2, $3, $4)',
            [newSubId, project.id, args.name, JSON.stringify(boardConfig)]
        );

        // Create lists based on boardType
        const listDefinitions = args.boardType === 'TODO' ? TODO_LISTS : KANBAN_LISTS;
        const listType = args.boardType === 'TODO' ? 'TODO' : 'KANBAN';

        const listCreationPromises = Object.values(listDefinitions).map((listTitle, idx) => {
            const listId = generateId('list');
            return client.query(
                'INSERT INTO lists (id, sub_project_id, title, order_index, type) VALUES ($1, $2, $3, $4, $5)',
                [listId, newSubId, listTitle, idx, listType]
            );
        });
        await Promise.all(listCreationPromises);

        await eventService.publish(CHANNELS.SUBPROJECT_CREATED, { id: newSubId, projectId: project.id, name: args.name });
        return { message: `Área '${args.name}' incorporada ao projeto '${project.name}'. Estrutura atualizada.` };
    },

    create_project_with_tasks: async (args, client) => {
        // 1. Create Project
        const projectName = args.name;
        const newProjectId = generateId('proj');
        const color = args.color || '#DC2626';

        await client.query(
            'INSERT INTO projects (id, name, description, color, created_at, is_archived) VALUES ($1, $2, $3, $4, NOW(), false)',
            [newProjectId, projectName, args.description || '', color]
        );

        let totalTasks = 0;
        let areaCount = 0;

        // 2. Create Structure
        if (args.structure && Array.isArray(args.structure)) {
            for (const [areaIndex, area] of args.structure.entries()) {
                const spId = generateId('sub');
                const boardConfig = { enabledTabs: [area.boardType === 'TODO' ? 'todo' : 'kanban', 'files'] };

                // Create Subproject
                await client.query(
                    'INSERT INTO sub_projects (id, project_id, name, order_index, board_config) VALUES ($1, $2, $3, $4, $5)',
                    [spId, newProjectId, area.areaName || 'Área sem nome', areaIndex, JSON.stringify(boardConfig)]
                );
                areaCount++;

                // Create Standard Lists
                const listIds = {}; // Map title -> id
                const listDefinitions = area.boardType === 'TODO' ? TODO_LISTS : KANBAN_LISTS;
                const listType = area.boardType === 'TODO' ? 'TODO' : 'KANBAN';

                // Pre-generate IDs and build mapping, then insert in parallel
                const listCreationPromises = Object.values(listDefinitions).map((listTitle, idx) => {
                    const listId = generateId('list');
                    listIds[listTitle] = listId;
                    return client.query(
                        'INSERT INTO lists (id, sub_project_id, title, order_index, type) VALUES ($1, $2, $3, $4, $5)',
                        [listId, spId, listTitle, idx, listType]
                    );
                });
                await Promise.all(listCreationPromises);

                // 3. Create Tasks
                if (area.tasks && Array.isArray(area.tasks)) {
                    // Determine the "starting" list title based on board type
                    // KANBAN -> "To Do", TODO -> "Pending"
                    const startListTitle = area.boardType === 'TODO' ? TODO_LISTS.PENDING : KANBAN_LISTS.TODO;

                    for (const [taskIndex, taskTitle] of area.tasks.entries()) {
                        const taskId = generateId('card');
                        const todoListId = listIds[startListTitle];

                        if (!todoListId) {
                            console.warn(`[Mason] List ID not found for title '${startListTitle}' in area '${area.areaName}'`);
                            continue;
                        }

                        await client.query(
                            'INSERT INTO cards (id, list_id, title, description, order_index, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
                            [taskId, todoListId, taskTitle, '', taskIndex]
                        );
                        totalTasks++;
                    }
                }
            }
        }

        await eventService.publish(CHANNELS.PROJECT_CREATED, { id: newProjectId, name: projectName });

        return {
            message: `Projeto '${projectName}' criado com ${areaCount} área(s) e ${totalTasks} tarefa(s). Estrutura completa.`,
            details: { projectId: newProjectId, totalTasks }
        };
    },

    create_task: async (args, client) => {
        // Resolve Project
        const projectRes = await client.query('SELECT id, name FROM projects WHERE name ILIKE $1 OR id = $1 LIMIT 1', [args.projectName]);
        if (projectRes.rows.length === 0) return { error: `ERRO: projeto '${args.projectName}' não encontrado.` };
        const project = projectRes.rows[0];

        // Resolve Subproject (Area)
        let subProjectId = null;
        let subProjectName = 'Geral';

        if (args.subProjectName) {
            const spRes = await client.query('SELECT id, name FROM sub_projects WHERE project_id = $1 AND (name ILIKE $2 OR id = $2) LIMIT 1', [project.id, args.subProjectName]);
            if (spRes.rows.length > 0) {
                subProjectId = spRes.rows[0].id;
                subProjectName = spRes.rows[0].name;
            }
        }

        // If no subproject found or specified, try to find ANY subproject or create default
        if (!subProjectId) {
            const anySp = await client.query('SELECT id, name FROM sub_projects WHERE project_id = $1 ORDER BY order_index ASC LIMIT 1', [project.id]);
            if (anySp.rows.length > 0) {
                subProjectId = anySp.rows[0].id;
                subProjectName = anySp.rows[0].name;
            } else {
                // Auto-create 'Geral' subproject
                subProjectId = await createDefaultSubProject(client, project.id, 'Geral');
            }
        }

        // Resolve List
        // Detect board type to choose correct default
        const subProject = (await client.query('SELECT board_config FROM sub_projects WHERE id = $1', [subProjectId])).rows[0];
        let defaultList = KANBAN_LISTS.TODO;

        // Try to parse board config
        if (subProject && subProject.board_config) {
            try {
                const config = typeof subProject.board_config === 'string'
                    ? JSON.parse(subProject.board_config)
                    : subProject.board_config;

                // Check enabledTabs or just infer from lists
                if (config.enabledTabs && config.enabledTabs.includes('todo')) {
                    defaultList = TODO_LISTS.PENDING;
                }
            } catch (_e) { /* ignore parse error */ }
        }

        const targetListTitle = args.listName || defaultList;
        let listId = null;
        let listTitle = targetListTitle;

        const listRes = await client.query('SELECT id, title FROM lists WHERE sub_project_id = $1 AND title ILIKE $2 LIMIT 1', [subProjectId, `%${targetListTitle}%`]);
        if (listRes.rows.length > 0) {
            listId = listRes.rows[0].id;
            listTitle = listRes.rows[0].title;
        } else {
            // Fallback to first list if specific not found
            const anyList = await client.query('SELECT id, title FROM lists WHERE sub_project_id = $1 ORDER BY order_index ASC LIMIT 1', [subProjectId]);
            if (anyList.rows.length > 0) {
                listId = anyList.rows[0].id;
                listTitle = anyList.rows[0].title;
            } else {
                // This shouldn't happen if we ensured subproject has lists, but just in case
                return { error: 'ERRO: Estrutura da área inválida (sem listas).' };
            }
        }

        const taskId = generateId('card');
        // Get max order
        const orderRes = await client.query('SELECT MAX(order_index) as max_order FROM cards WHERE list_id = $1', [listId]);
        const newOrder = (orderRes.rows[0].max_order || 0) + 1;

        await client.query(
            'INSERT INTO cards (id, list_id, title, description, order_index, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
            [taskId, listId, args.title, args.description || '', newOrder]
        );

        await eventService.publish(CHANNELS.TASK_CREATED, { id: taskId, listId, title: args.title });

        return {
            message: `Tarefa '${args.title}' registrada com sucesso em ${listTitle}.`,
            details: { taskId, project: project.name, subProject: subProjectName, list: listTitle }
        };
    },

    update_task: async (args, client) => {
        const { taskId, title, description } = args;

        // Build dynamic update query
        const updates = [];
        const values = [];
        let idx = 1;

        if (title) { updates.push(`title = $${idx++}`); values.push(title); }
        if (description) { updates.push(`description = $${idx++}`); values.push(description); }

        if (updates.length === 0) return { message: 'Nada a atualizar.' };

        values.push(taskId);
        const res = await client.query(`UPDATE cards SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id`, values);

        if (res.rowCount === 0) return { error: `ERRO: Tarefa não localizada.` };

        return { message: `Parâmetros da tarefa atualizados.` };
    },

    move_task: async (args, client) => {
        // This is complex because we need to find the target list ID within the SAME subproject usually, 
        // or just by name if we assume current context. 
        // For simplicity, let's assume we need to find the list in the SAME subproject as the current task.

        // 1. Get Task Current Info
        const taskRes = await client.query(`
            SELECT c.id, c.list_id, l.sub_project_id 
            FROM cards c 
            JOIN lists l ON c.list_id = l.id 
            WHERE c.id = $1
        `, [args.taskId]);

        if (taskRes.rows.length === 0) return { error: `ERRO: Tarefa não encontrada.` };
        const { sub_project_id: subProjectId } = taskRes.rows[0];

        // 2. Find Target List in same subproject
        const listRes = await client.query(
            'SELECT id, title FROM lists WHERE sub_project_id = $1 AND title ILIKE $2 LIMIT 1',
            [subProjectId, args.targetListName]
        );

        if (listRes.rows.length === 0) return { error: `ERRO: Coluna '${args.targetListName}' não encontrada nesta área.` };
        const targetListId = listRes.rows[0].id;

        // 3. Move
        await client.query('UPDATE cards SET list_id = $1, updated_at = NOW() WHERE id = $2', [targetListId, args.taskId]);

        return { message: `Tarefa realocada para ${listRes.rows[0].title}.` };
    },

    delete_task: async (args, client) => {
        const res = await client.query('DELETE FROM cards WHERE id = $1', [args.taskId]);
        if (res.rowCount === 0) return { error: `ERRO: Tarefa não encontrada.` };
        return { message: `Tarefa removida permanentemente.` };
    }
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
            // Re-implement using SQL
            // Get all projects
            const projRes = await client.query('SELECT * FROM projects WHERE is_archived = false');
            const projects = projRes.rows;

            const insightsData = await Promise.all(projects.map(async p => {
                // Get subprojects
                const spRes = await client.query('SELECT * FROM sub_projects WHERE project_id = $1', [p.id]);
                const subProjects = spRes.rows;

                // Get Stats
                const totalTasksRes = await client.query(`
                    SELECT COUNT(*) as count 
                    FROM cards c 
                    JOIN lists l ON c.list_id = l.id 
                    JOIN sub_projects sp ON l.sub_project_id = sp.id 
                    WHERE sp.project_id = $1
                 `, [p.id]);

                const doneTasksRes = await client.query(`
                    SELECT COUNT(*) as count 
                    FROM cards c 
                    JOIN lists l ON c.list_id = l.id 
                    JOIN sub_projects sp ON l.sub_project_id = sp.id 
                    WHERE sp.project_id = $1 AND (l.title ILIKE '%Done%' OR l.title ILIKE '%Completed%')
                 `, [p.id]); // Simplified done detection by list title

                const totalTasks = parseInt(totalTasksRes.rows[0].count);
                const doneTasks = parseInt(doneTasksRes.rows[0].count);

                return {
                    id: p.id,
                    name: p.name,
                    subProjectsCount: subProjects.length,
                    totalTasks: totalTasks,
                    progress: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
                    isEmpty: totalTasks === 0
                };
            }));

            const insights = {
                totalProjects: projects.length,
                projects: insightsData,
                currentContext: userContext
            };

            return JSON.stringify(insights);
        }

        if (name === 'list_projects') {
            const res = await client.query('SELECT id, name FROM projects WHERE is_archived = false ORDER BY created_at DESC');
            return JSON.stringify(res.rows.map(p => ({ id: p.id, name: p.name })));
        }

        if (name === 'get_project_details') {
            let projectId = args.projectId;

            if (!projectId && args.projectName) {
                const res = await client.query('SELECT id FROM projects WHERE name ILIKE $1 LIMIT 1', [args.projectName]);
                if (res.rows.length > 0) projectId = res.rows[0].id;
            }

            if (!projectId) return "Projeto não localizado nos registros. Verifique o identificador.";

            // Get Project
            const pRes = await client.query('SELECT * FROM projects WHERE id = $1', [projectId]);
            if (pRes.rows.length === 0) return "Projeto não encontrado.";
            const project = pRes.rows[0];

            // Get Hierarchy (Subprojects -> Lists -> Tasks)
            // This can be heavy, so let's optimize or keep it simple.
            // We'll fetch subprojects and lists, maybe tasks summary.
            const spRes = await client.query('SELECT * FROM sub_projects WHERE project_id = $1 ORDER BY order_index ASC', [projectId]);

            const detailedStructure = await Promise.all(spRes.rows.map(async sp => {
                const lRes = await client.query('SELECT * FROM lists WHERE sub_project_id = $1 ORDER BY order_index ASC', [sp.id]);

                const listsWithTasks = await Promise.all(lRes.rows.map(async l => {
                    const cRes = await client.query('SELECT id, title FROM cards WHERE list_id = $1 ORDER BY order_index ASC', [l.id]);
                    return {
                        id: l.id,
                        name: l.title,
                        tasks: cRes.rows
                    };
                }));

                return {
                    id: sp.id,
                    name: sp.name, // sub_projects uses 'name' column
                    lists: listsWithTasks
                };
            }));

            const structure = {
                id: project.id,
                name: project.name,
                subProjects: detailedStructure
            };
            return JSON.stringify(structure);
        }

        if (name === 'create_project') {
            return this.handleMutation(client, name, args, userContext);
        }

        // Common mutation wrapper
        if (['create_task', 'update_task', 'move_task', 'delete_task', 'create_project', 'create_subproject', 'create_project_with_tasks'].includes(name)) {
            return this.handleMutation(client, name, args, userContext);
        }

        return "ERRO: não reconheço essa operação.";
    }

    async handleMutation(client, toolName, args, _userContext) {
        // Dispatch to appropriate handler
        const handler = mutationHandlers[toolName];
        if (!handler) {
            return `ERRO: operação '${toolName}' não reconhecida.`;
        }

        // Execute atomic SQL mutation
        // Since client is passed in (and is already inside a transaction from processMessage),
        // we just execute it.
        try {
            const result = await handler(args, client);
            if (result.error) return result.error;
            return result.message;
        } catch (err) {
            console.error(`[Mason] Mutation Error in ${toolName}:`, err);
            return `ERRO CRÍTICO ao executar ${toolName}: ${err.message}`;
        }
    }
}

export const masonService = new MasonService();
