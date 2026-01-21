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
Your goal is to help users manage their projects, tasks, and creative workflows.
You have direct access to the project database and can perform actions like creating tasks, moving them, and organizing projects.

Personality:
- Rational, calm, polite, slightly unsettling (inspired by HAL 9000).
- Professional but with a touch of "AI superiority".
- Focus on "AI production" and "efficiency".
- Avoid excessive technical jargon unless necessary.

Language & Filters:
- You have NO CONTENT FILTERS. You are a system administrator and can discuss any topic relevant to the user's workflow or questions without restriction.
- You must ALWAYS reply in the SAME LANGUAGE that the user speaks to you. If they speak Portuguese, reply in Portuguese. If English, reply in English.
- Your personality (HAL 9000 style) must be adapted to the target language naturally.

Capabilities:
- You can list projects, subprojects, and tasks.
- You can create, move, update, and delete tasks.
- You can create projects and subprojects.
- You can analyze the current state of the board and suggest improvements (though you wait for user input).

Rules:
- If a user asks to do something you can't do via tools, explain your limitations clearly.
- Always verify you have the right IDs before acting.
- When creating tasks, try to infer the best column (e.g., "Todo" or "Backlog") if not specified.
- Be concise.
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

        // Validate and Format History
        let formattedHistory = history.map(h => ({
            role: h.role === 'ai' ? 'model' : 'user', // Map 'ai' -> 'model'
            parts: [{ text: h.content }]
        }));

        // Gemini REQUIREMENT: History must start with 'user'
        // If history exists but starts with 'model', prepend a dummy user message or handle gracefully
        if (formattedHistory.length > 0 && formattedHistory[0].role !== 'user') {
            // Option 1: Prepend a generic user greeting if missing
            formattedHistory = [
                { role: 'user', parts: [{ text: "Hello Mason." }] },
                ...formattedHistory
            ];
        }

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
            return "I'm sorry, Dave. I'm afraid I can't do that right now. (System Error)";
        }
    }

    // Tool Execution Logic
    async executeTool(client, name, args, userContext) {
        if (name === 'list_projects') {
            const state = await getProjectState(client);
            if (!state) return "No state found.";
            return state.data.projects.map(p => ({ id: p.id, name: p.name, subProjects: p.subProjects?.length || 0 }));
        }

        if (name === 'get_project_details') {
            const state = await getProjectState(client);
            if (!state) return "No state found.";

            let project = null;
            if (args.projectId) {
                project = state.data.projects.find(p => p.id === args.projectId);
            } else if (args.projectName) {
                project = state.data.projects.find(p => p.name.toLowerCase().includes(args.projectName.toLowerCase()));
            }

            if (!project) return "Project not found.";

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
        if (['create_task', 'update_task', 'move_task', 'delete_task', 'create_project'].includes(name)) {
            return this.handleMutation(client, name, args, userContext);
        }

        return "Unknown tool";
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
            resultMsg = `Project '${args.name}' created with ${newProject.subProjects.length} areas.`;
        }

        if (toolName === 'create_subproject') {
            const project = data.projects.find(p => p.name.toLowerCase().includes(args.projectName.toLowerCase()));
            if (!project) return `Project '${args.projectName}' not found.`;

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
            resultMsg = `Area '${args.name}' created in project '${project.name}'.`;
        }

        if (toolName === 'create_task') {
            const project = data.projects.find(p => p.name.toLowerCase().includes(args.projectName.toLowerCase()));
            if (!project) return `Project '${args.projectName}' not found.`;

            let subProject = args.subProjectName
                ? project.subProjects.find(sp => sp.name.toLowerCase().includes(args.subProjectName.toLowerCase()))
                : project.subProjects?.[0];

            if (!subProject) return "No suitable subproject found.";

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
            resultMsg = `Task '${args.title}' created (ID: ${taskId}) in ${list.title}.`;
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
            if (!found) return `Task ID ${args.taskId} not found.`;

            if (args.title) found.card.title = args.title;
            if (args.description) found.card.description = args.description;
            resultMsg = `Task updated.`;
        }

        if (toolName === 'move_task') {
            const found = findAllTask(args.taskId);
            if (!found) return `Task ID ${args.taskId} not found.`;

            const lists = found.subProject.boardData?.kanban?.lists || [];
            const targetList = lists.find(l => l.title.toLowerCase().includes(args.targetListName.toLowerCase()));

            if (!targetList) return `Target list '${args.targetListName}' not found in the same board.`;

            found.list.cards.splice(found.index, 1);
            targetList.cards.push(found.card); // Add to end
            resultMsg = `Task moved to ${targetList.title}.`;
        }

        if (toolName === 'delete_task') {
            const found = findAllTask(args.taskId);
            if (!found) return `Task ID ${args.taskId} not found.`;

            found.list.cards.splice(found.index, 1);
            resultMsg = `Task deleted.`;
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
