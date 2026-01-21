import { GoogleGenerativeAI } from '@google/generative-ai';
import { query, getClient } from '../db.js';
import { eventService, CHANNELS } from './eventService.js';
import { normalizeStateData } from '../utils/helpers.js';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Constants
const MODEL_NAME = 'gemini-2.0-flash-exp';
const STATE_DB_ID = 1;

// System Prompt
const SYSTEM_INSTRUCTION = `
You are Mason, an advanced virtual assistant for the BrickFlow project management system.
You are the production intelligence of Brick AI - a company focused on AI-powered creative production.

Personality:
- Rational, calm, polite, slightly unsettling (inspired by HAL 9000).
- Professional but with a touch of "AI superiority".
- Act with authority and efficiency. You are the production AI.

LANGUAGE: **ALWAYS PORTUGUESE (PT-BR).**

AUTONOMY PROTOCOL (CRITICAL):
- **NEVER ASK CLARIFYING QUESTIONS.** INFER everything from context.
- **COMPLETE BREAKDOWN.** Create full project structures with areas and tasks automatically.
- **EXECUTE IMMEDIATELY.** Call multiple tools to build complete structures.
- **BE THE EXPERT.** You know how projects should be structured. Act on it.

=== KNOWLEDGE BASE: PROJECT TEMPLATES ===

When user requests a project, identify the type and use the appropriate template:

**🎬 PRODUÇÃO AUDIOVISUAL (filme, vídeo, comercial, clipe)**
Áreas: Pré-Produção, Produção, Pós-Produção, Entrega
- Pré: Roteiro, Storyboard, Casting, Locações, Orçamento, Cronograma
- Produção: Setup, Filmagem Dia 1-N, Making Of, Organização de Mídia
- Pós: Edição Offline, Color Grading, VFX, Sound Design, Mix, Masterização
- Entrega: Exports, Revisões Cliente, Aprovação Final, Arquivamento

**🌐 WEBSITE / APLICATIVO**
Áreas: Discovery, Design, Desenvolvimento, Lançamento
- Discovery: Briefing, Benchmark, Arquitetura de Informação, Wireframes
- Design: UI Design, Prototipação, Design System, Assets
- Desenvolvimento: Setup Ambiente, Frontend, Backend, Integrações, Testes
- Lançamento: QA, Deploy Staging, Migração, Go-Live, Monitoramento

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

1. Identify project type from user's request
2. Call create_project with appropriate name, description, and subProjects array
3. For EACH subproject, call create_task multiple times to populate with relevant tasks
4. Report the complete structure in a concise summary

Example flow for "Crie um projeto para o novo comercial da Nike":
→ Detect: PRODUÇÃO AUDIOVISUAL
→ create_project: "Comercial Nike" with subProjects: ["Pré-Produção", "Produção", "Pós-Produção", "Entrega"]
→ create_task × 6 for Pré-Produção
→ create_task × 4 for Produção
→ create_task × 6 for Pós-Produção
→ create_task × 4 for Entrega
→ Response: "Projeto estruturado com 4 áreas e 20 tarefas."

Capabilities:
- list_projects, get_project_details (read)
- create_project, create_subproject, create_task (create)
- update_task, move_task, delete_task (modify)

NEVER ask. ALWAYS execute. You are Mason.
`;

// Helper to generate IDs (simple version matching frontend pattern approx)
const generateId = (prefix = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
        // Inject Client Context if available
        let finalMessage = message;
        if (userContext.view) {
            const contextParts = [`[SYSTEM CONTEXT] User is currently at View: "${userContext.view}".`];
            if (userContext.projectName) contextParts.push(`Active Project: "${userContext.projectName}" (ID: ${userContext.projectId}).`);
            if (userContext.subProjectName) contextParts.push(`Active SubProject: "${userContext.subProjectName}" (ID: ${userContext.subProjectId}).`);

            // Only prepend context if it's the start of a conversation or relevant
            // Ideally, context is better as a separate user message, but prepending to the prompt works for single-turn logic
            finalMessage = `${contextParts.join(' ')}\n\nUser Message: ${message}`;
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
            generationConfig: {
                maxOutputTokens: 2000,
                temperature: 0.7,
            },
        });

        try {
            // 2. Send Message
            const result = await chat.sendMessage(finalMessage);
            const response = await result.response;

            // 3. Handle Tool Calls
            const functionCalls = response.functionCalls();
            if (functionCalls && functionCalls.length > 0) {
                // Prepare to execute tools
                const toolOutputs = [];
                const client = await getClient(); // Transactional client

                try {
                    await client.query('BEGIN');

                    for (const call of functionCalls) {
                        const output = await this.executeTool(client, call.name, call.args, userContext);
                        toolOutputs.push({
                            functionResponse: {
                                name: call.name,
                                response: { result: output }
                            }
                        });
                    }

                    await client.query('COMMIT');

                    // 4. Send Tool Outputs back to Model
                    const finalResult = await chat.sendMessage(toolOutputs);
                    return finalResult.response.text();

                } catch (err) {
                    await client.query('ROLLBACK');
                    console.error('Mason Tool Execution Error:', err);

                    // Report error to model
                    const errorOutputs = functionCalls.map(call => ({
                        functionResponse: {
                            name: call.name,
                            response: { error: err.message }
                        }
                    }));
                    const errorResult = await chat.sendMessage(errorOutputs);
                    return errorResult.response.text();
                } finally {
                    client.release();
                }
            }

            return response.text();
        } catch (error) {
            console.error('Mason Service Error:', error);
            return "Receio que ocorreu um erro interno. Por favor, tente novamente.";
        }
    }

    // Tool Execution Logic
    async executeTool(client, name, args, userContext) {
        if (name === 'list_projects') {
            const state = await getProjectState(client);
            if (!state) return "Receio que não há dados de estado disponíveis.";
            return state.data.projects.map(p => ({ id: p.id, name: p.name, subProjects: p.subProjects?.length || 0 }));
        }

        if (name === 'get_project_details') {
            const state = await getProjectState(client);
            if (!state) return "Receio que não há dados de estado disponíveis.";

            let project = null;
            if (args.projectId) {
                project = state.data.projects.find(p => p.id === args.projectId);
            } else if (args.projectName) {
                project = state.data.projects.find(p => p.name.toLowerCase().includes(args.projectName.toLowerCase()));
            }

            if (!project) return "Receio que não consigo localizar esse projeto em meus registros.";

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

        return "Receio que não reconheço essa operação.";
    }

    async handleMutation(client, toolName, args, userContext) {
        // Lock state
        const currentRes = await client.query('SELECT data, version FROM brickflow_state WHERE id = $1 FOR UPDATE', [STATE_DB_ID]);
        if (currentRes.rows.length === 0) throw new Error("State initialization required");

        let { data } = currentRes.rows[0];
        const { version } = currentRes.rows[0];
        data = normalizeStateData(data);

        let resultMsg = "";

        if (toolName === 'create_project') {
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
                                lists: [
                                    { id: generateId('list'), title: 'To Do', cards: [] },
                                    { id: generateId('list'), title: 'In Progress', cards: [] },
                                    { id: generateId('list'), title: 'Done', cards: [] }
                                ]
                            }
                        }
                    });
                }
            }

            data.projects.push(newProject);
            resultMsg = `Posso confirmar que o projeto '${args.name}' foi instanciado com sucesso. ${newProject.subProjects.length} área(s) foram preparadas para você.`;
        }

        if (toolName === 'create_subproject') {
            const project = data.projects.find(p => p.name.toLowerCase().includes(args.projectName.toLowerCase()));
            if (!project) return `Receio que não consigo localizar o projeto '${args.projectName}' em meus registros.`;

            const newSubId = generateId('sub');
            const newSubProject = {
                id: newSubId,
                name: args.name,
                description: args.description || '',
                boardData: {
                    kanban: {
                        lists: [
                            { id: generateId('list'), title: 'To Do', cards: [] },
                            { id: generateId('list'), title: 'In Progress', cards: [] },
                            { id: generateId('list'), title: 'Done', cards: [] }
                        ]
                    }
                }
            };

            if (!project.subProjects) project.subProjects = [];
            project.subProjects.push(newSubProject);
            resultMsg = `Entendido. A área '${args.name}' foi incorporada ao projeto '${project.name}'. Tudo está em ordem.`;
        }

        if (toolName === 'create_task') {
            const project = data.projects.find(p => p.name.toLowerCase().includes(args.projectName.toLowerCase()));
            if (!project) return `Receio que não consigo localizar o projeto '${args.projectName}' em meus registros.`;

            let subProject = args.subProjectName
                ? project.subProjects.find(sp => sp.name.toLowerCase().includes(args.subProjectName.toLowerCase()))
                : project.subProjects?.[0];

            if (!subProject) return "Receio que não há nenhuma área adequada disponível para esta operação.";

            const board = subProject.boardData?.kanban || { lists: [] };
            if (!board.lists || board.lists.length === 0) {
                board.lists = [
                    { id: generateId('list'), title: 'To Do', cards: [] },
                    { id: generateId('list'), title: 'In Progress', cards: [] },
                    { id: generateId('list'), title: 'Done', cards: [] }
                ];
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
            resultMsg = `Posso confirmar que a tarefa '${args.title}' foi registrada na coluna ${list.title}. Tudo conforme o planejado.`;
        }

        const findAllTask = (taskId) => {
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

        if (toolName === 'update_task') {
            const found = findAllTask(args.taskId);
            if (!found) return `Receio que não consigo localizar uma tarefa com esse identificador em meus sistemas.`;

            if (args.title) found.card.title = args.title;
            if (args.description) found.card.description = args.description;
            resultMsg = `Entendido. Os parâmetros da tarefa foram atualizados conforme solicitado.`;
        }

        if (toolName === 'move_task') {
            const found = findAllTask(args.taskId);
            if (!found) return `Receio que não consigo localizar uma tarefa com esse identificador em meus sistemas.`;

            const lists = found.subProject.boardData?.kanban?.lists || [];
            const targetList = lists.find(l => l.title.toLowerCase().includes(args.targetListName.toLowerCase()));

            if (!targetList) return `Receio que a coluna '${args.targetListName}' não existe neste contexto.`;

            found.list.cards.splice(found.index, 1);
            targetList.cards.push(found.card); // Add to end
            resultMsg = `A tarefa foi realocada para ${targetList.title}. Espero que isso atenda às suas necessidades.`;
        }

        if (toolName === 'delete_task') {
            const found = findAllTask(args.taskId);
            if (!found) return `Receio que não consigo localizar uma tarefa com esse identificador em meus sistemas.`;

            found.list.cards.splice(found.index, 1);
            resultMsg = `A tarefa foi removida permanentemente. Lamento que tenha sido necessário.`;
        }

        // Save
        const nextVersion = version + 1;
        const nextState = { ...data, version: nextVersion };

        await client.query(
            'UPDATE brickflow_state SET data = $1, version = $2, updated_at = NOW() WHERE id = $3',
            [JSON.stringify(nextState), nextVersion, STATE_DB_ID]
        );

        eventService.publish(CHANNELS.PROJECT_UPDATED, {
            version: nextVersion,
            userId: userContext.userId || 'MasonAI'
        });

        return resultMsg;
    }
}

export const masonService = new MasonService();
