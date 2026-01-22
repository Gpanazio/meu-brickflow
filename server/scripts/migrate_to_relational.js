import { query, getClient } from '../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const normalizeStateData = (dataStr) => {
    if (!dataStr) return { projects: [] };
    if (typeof dataStr === 'object') return dataStr;
    try {
        return JSON.parse(dataStr);
    } catch (e) {
        console.error('Failed to parse state data', e);
        return { projects: [] };
    }
};

async function migrate() {
    console.log('🚀 Starting Migration to Relational Database...');
    const client = await getClient();

    try {
        // 1. Create Tables
        console.log('📦 Creating tables...');
        const sqlSchema = fs.readFileSync(path.join(__dirname, '..', 'migrations', '001_initial_schema.sql'), 'utf8');
        await client.query(sqlSchema);
        console.log('✅ Tables created.');

        // 2. Fetch Legacy Data
        console.log('📥 Fetching legacy JSON blob...');
        const { rows } = await client.query('SELECT data FROM brickflow_state WHERE id = 1');

        if (rows.length === 0) {
            console.log('⚠️ No legacy data found. Skipping data migration.');
            return;
        }

        const data = normalizeStateData(rows[0].data);
        const projects = data.projects || [];
        console.log(`📊 Found ${projects.length} projects to migrate.`);

        // 3. Migrate Data
        await client.query('BEGIN');

        for (const proj of projects) {
            console.log(`   Processing Project: ${proj.name} (${proj.id})`);

            // Insert Project
            await client.query(
                `INSERT INTO projects (id, name, description, color, is_archived, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (id) DO UPDATE SET 
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    color = EXCLUDED.color,
                    is_archived = EXCLUDED.is_archived`,
                [
                    proj.id,
                    proj.name,
                    proj.description || '',
                    proj.color || '#DC2626',
                    proj.isArchived || false,
                    proj.createdAt || new Date()
                ]
            );

            // Process SubProjects
            if (proj.subProjects && Array.isArray(proj.subProjects)) {
                let spOrder = 0;
                for (const sp of proj.subProjects) {
                    const boardConfig = { enabledTabs: sp.enabledTabs || [] };

                    await client.query(
                        `INSERT INTO sub_projects (id, project_id, name, description, board_config, order_index)
                         VALUES ($1, $2, $3, $4, $5, $6)
                         ON CONFLICT (id) DO UPDATE SET
                            name = EXCLUDED.name,
                            description = EXCLUDED.description,
                            board_config = EXCLUDED.board_config`,
                        [sp.id, proj.id, sp.name, sp.description || '', JSON.stringify(boardConfig), spOrder++]
                    );

                    // Process Lists (From boardData.kanban and boardData.todo)
                    const boardData = sp.boardData || {};
                    let listOrder = 0;

                    const processList = async (list, type) => {
                        await client.query(
                            `INSERT INTO lists (id, sub_project_id, title, type, order_index)
                             VALUES ($1, $2, $3, $4, $5)
                             ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title`,
                            [list.id, sp.id, list.title, type, listOrder++]
                        );

                        // Process Cards
                        if (list.cards && Array.isArray(list.cards) || list.tasks && Array.isArray(list.tasks)) {
                            const cards = list.cards || list.tasks || [];
                            let cardOrder = 0;
                            for (const card of cards) {
                                await client.query(
                                    `INSERT INTO cards (id, list_id, title, description, order_index, assignees, labels, attachments, comments, created_at)
                                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                                     ON CONFLICT (id) DO UPDATE SET
                                        title = EXCLUDED.title,
                                        description = EXCLUDED.description,
                                        assignees = EXCLUDED.assignees,
                                        labels = EXCLUDED.labels,
                                        attachments = EXCLUDED.attachments,
                                        comments = EXCLUDED.comments`,
                                    [
                                        card.id,
                                        list.id,
                                        card.title,
                                        card.description || '',
                                        cardOrder++,
                                        JSON.stringify(card.members || card.assignees || []),
                                        JSON.stringify(card.labels || []),
                                        JSON.stringify(card.attachments || []),
                                        JSON.stringify(card.comments || []),
                                        card.createdAt || new Date()
                                    ]
                                );
                            }
                        }
                    };

                    // Migrate Kanban Lists
                    if (boardData.kanban && boardData.kanban.lists) {
                        for (const list of boardData.kanban.lists) {
                            await processList(list, 'KANBAN');
                        }
                    }

                    // Migrate Todo Lists
                    if (boardData.todo && boardData.todo.lists) {
                        for (const list of boardData.todo.lists) {
                            await processList(list, 'TODO');
                        }
                    }
                }
            }
        }

        await client.query('COMMIT');
        console.log('✅ Migration completed successfully!');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Migration Failed:', err);
    } finally {
        client.release();
        process.exit();
    }
}

migrate();
