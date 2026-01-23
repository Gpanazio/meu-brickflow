import express from 'express';
import { query, getClient } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const generateId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const router = express.Router();

// --- PROJECTS ---

// GET /api/v2/projects (List)
router.get('/projects', requireAuth, async (req, res) => {
    try {
        const { rows } = await query('SELECT * FROM projects WHERE is_archived = false ORDER BY created_at DESC');
        // Fetch members if needed, for now returning basic info
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// GET /api/v2/projects/:id (Details)
router.get('/projects/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { rows: projects } = await query('SELECT * FROM projects WHERE id = $1', [id]);
        if (projects.length === 0) return res.status(404).json({ error: 'Project not found' });

        // Fetch subprojects
        const { rows: subProjects } = await query('SELECT * FROM sub_projects WHERE project_id = $1 ORDER BY order_index ASC', [id]);

        // Reconstruct full tree for legacy compatibility if needed
        // For now returning structured data
        res.json({ ...projects[0], subProjects });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch project' });
    }
});

// POST /api/v2/projects (Create)
router.post('/projects', requireAuth, async (req, res) => {
    try {
        const { name, description, color } = req.body;
        const id = generateId('proj');
        const { rows } = await query(
            'INSERT INTO projects (id, name, description, color) VALUES ($1, $2, $3, $4) RETURNING *',
            [id, name, description, color]
        );
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

// PUT /api/v2/projects/:id (Update)
router.put('/projects/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, color } = req.body;

        const updates = [];
        const values = [];
        let idx = 1;

        if (name) { updates.push(`name = $${idx++}`); values.push(name); }
        if (description !== undefined) { updates.push(`description = $${idx++}`); values.push(description); }
        if (color) { updates.push(`color = $${idx++}`); values.push(color); }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id);
        const { rows, rowCount } = await query(
            `UPDATE projects SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
            values
        );

        if (rowCount === 0) return res.status(404).json({ error: 'Project not found' });

        res.json(rows[0]);
    } catch (err) {
        console.error('Project Update Error:', err);
        res.status(500).json({ error: 'Failed to update project' });
    }
});

// DELETE /api/v2/projects/:id (Delete)
router.delete('/projects/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        // Ensure cascading deletion or cleanup if not handled by DB constraints
        // For now, attempting direct delete. Ideally schema has ON DELETE CASCADE.
        const { rowCount } = await query('DELETE FROM projects WHERE id = $1', [id]);

        if (rowCount === 0) return res.status(404).json({ error: 'Project not found' });

        res.json({ success: true, message: 'Project deleted successfully' });
    } catch (err) {
        console.error('Project Delete Error:', err);
        res.status(500).json({ error: 'Failed to delete project. Check for dependencies.' });
    }
});

// --- SUBPROJECTS ---

// POST /api/v2/projects/:projectId/subprojects (Create Subproject)
router.post('/projects/:projectId/subprojects', requireAuth, async (req, res) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');

        const { projectId } = req.params;
        const { name, description, enabledTabs } = req.body;
        const id = generateId('sub');

        // Get max order index for this project
        const { rows: orderRows } = await client.query(
            'SELECT COALESCE(MAX(order_index), -1) as max_order FROM sub_projects WHERE project_id = $1',
            [projectId]
        );
        const newOrder = orderRows[0].max_order + 1;

        // Build board_config from enabledTabs
        const boardConfig = { enabledTabs: enabledTabs ?? ['kanban', 'files'] };

        const { rows } = await client.query(
            'INSERT INTO sub_projects (id, project_id, name, description, board_config, order_index) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [id, projectId, name, description, JSON.stringify(boardConfig), newOrder]
        );

        const subProject = rows[0];

        // Create default lists based on enabled tabs
        const KANBAN_LISTS = ['BACKLOG', 'EM PROGRESSO', 'CONCLUÍDO'];
        const TODO_LISTS = ['A FAZER', 'FAZENDO', 'CONCLUÍDO'];
        const tabs = enabledTabs ?? ['kanban', 'files'];

        let listIdx = 0;
        if (tabs.includes('kanban')) {
            for (const title of KANBAN_LISTS) {
                const listId = generateId('list');
                await client.query(
                    'INSERT INTO lists (id, sub_project_id, title, order_index, type) VALUES ($1, $2, $3, $4, $5)',
                    [listId, id, title, listIdx++, 'KANBAN']
                );
            }
        }
        if (tabs.includes('todo')) {
            for (const title of TODO_LISTS) {
                const listId = generateId('list');
                await client.query(
                    'INSERT INTO lists (id, sub_project_id, title, order_index, type) VALUES ($1, $2, $3, $4, $5)',
                    [listId, id, title, listIdx++, 'TODO']
                );
            }
        }

        await client.query('COMMIT');
        res.json(subProject);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Subproject Create Error:', err);
        res.status(500).json({ error: 'Failed to create subproject' });
    } finally {
        client.release();
    }
});

// PUT /api/v2/subprojects/:id (Update Subproject)
router.put('/subprojects/:id', requireAuth, async (req, res) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');

        const { id } = req.params;
        const { name, description, enabledTabs } = req.body;

        const updates = [];
        const values = [];
        let idx = 1;

        if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
            updates.push(`name = $${idx++}`);
            values.push(name);
        }
        if (Object.prototype.hasOwnProperty.call(req.body, 'description')) {
            updates.push(`description = $${idx++}`);
            values.push(description);
        }
        if (Object.prototype.hasOwnProperty.call(req.body, 'enabledTabs')) {
            const boardConfig = { enabledTabs: enabledTabs ?? [] };
            updates.push(`board_config = $${idx++}`);
            values.push(JSON.stringify(boardConfig));
        }

        if (updates.length === 0) {
            await client.query('ROLLBACK');
            client.release();
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id);
        const { rows, rowCount } = await client.query(
            `UPDATE sub_projects SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
            values
        );

        if (rowCount === 0) {
            await client.query('ROLLBACK');
            client.release();
            return res.status(404).json({ error: 'Subproject not found' });
        }

        // If enabledTabs changed, create missing lists for newly enabled tabs
        if (Object.prototype.hasOwnProperty.call(req.body, 'enabledTabs') && enabledTabs) {
            // Get existing list types for this subproject
            const { rows: existingLists } = await client.query(
                'SELECT DISTINCT type FROM lists WHERE sub_project_id = $1',
                [id]
            );
            const existingTypes = new Set(existingLists.map(l => l.type));

            const KANBAN_LISTS = ['BACKLOG', 'EM PROGRESSO', 'CONCLUÍDO'];
            const TODO_LISTS = ['A FAZER', 'FAZENDO', 'CONCLUÍDO'];

            // Get max order_index
            const { rows: orderRows } = await client.query(
                'SELECT COALESCE(MAX(order_index), -1) as max_order FROM lists WHERE sub_project_id = $1',
                [id]
            );
            let listIdx = orderRows[0].max_order + 1;

            // Create KANBAN lists if enabled but don't exist
            if (enabledTabs.includes('kanban') && !existingTypes.has('KANBAN')) {
                for (const title of KANBAN_LISTS) {
                    const listId = generateId('list');
                    await client.query(
                        'INSERT INTO lists (id, sub_project_id, title, order_index, type) VALUES ($1, $2, $3, $4, $5)',
                        [listId, id, title, listIdx++, 'KANBAN']
                    );
                }
            }

            // Create TODO lists if enabled but don't exist
            if (enabledTabs.includes('todo') && !existingTypes.has('TODO')) {
                for (const title of TODO_LISTS) {
                    const listId = generateId('list');
                    await client.query(
                        'INSERT INTO lists (id, sub_project_id, title, order_index, type) VALUES ($1, $2, $3, $4, $5)',
                        [listId, id, title, listIdx++, 'TODO']
                    );
                }
            }
        }

        await client.query('COMMIT');
        res.json(rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Subproject Update Error:', err);
        res.status(500).json({ error: 'Failed to update subproject' });
    } finally {
        client.release();
    }
});

// DELETE /api/v2/subprojects/:id (Delete Subproject)
router.delete('/subprojects/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { rowCount } = await query('DELETE FROM sub_projects WHERE id = $1', [id]);

        if (rowCount === 0) return res.status(404).json({ error: 'Subproject not found' });

        res.json({ success: true, message: 'Subproject deleted successfully' });
    } catch (err) {
        console.error('Subproject Delete Error:', err);
        res.status(500).json({ error: 'Failed to delete subproject' });
    }
});

// GET /api/v2/subprojects/:id (Board Data)
router.get('/subprojects/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { rows: subProjects } = await query('SELECT * FROM sub_projects WHERE id = $1', [id]);
        if (subProjects.length === 0) return res.status(404).json({ error: 'Subproject not found' });

        const subProject = subProjects[0];

        // Fetch Lists
        const { rows: lists } = await query('SELECT * FROM lists WHERE sub_project_id = $1 ORDER BY order_index ASC', [id]);

        // Fetch Cards for these lists
        const listIds = lists.map(l => l.id);
        let cards = [];
        if (listIds.length > 0) {
            // Postgres: ANY($1) for array
            const { rows } = await query('SELECT * FROM cards WHERE list_id = ANY($1) ORDER BY order_index ASC', [listIds]);
            cards = rows;
        }

        // Construct Board Data for Frontend (Kanban/Todo compatible)
        const listsWithCards = lists.map(list => ({
            ...list,
            cards: cards.filter(c => c.list_id === list.id)
        }));

        // Split into types if needed or just return unified
        res.json({ ...subProject, lists: listsWithCards });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch subproject' });
    }
});

// --- TASKS (CARDS) ---

// POST /api/v2/tasks (Create)
router.post('/tasks', requireAuth, async (req, res) => {
    try {
        const { listId, title, description } = req.body;
        const id = generateId('card');

        // Get max order index
        const { rows: orderRows } = await query('SELECT COALESCE(MAX(order_index), 0) as max_order FROM cards WHERE list_id = $1', [listId]);
        const newOrder = orderRows[0].max_order + 1;

        const { rows } = await query(
            'INSERT INTO cards (id, list_id, title, description, order_index) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [id, listId, title, description, newOrder]
        );
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// PUT /api/v2/tasks/:id/move (Move - Drag & Drop)
router.put('/tasks/:id/move', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { toListId, newIndex } = req.body;

        // Simple implementation: Update list_id and order_index
        // Ideally requires reordering other items, but floating point order_index can simplify this (not implemented yet, strictly integers usually)
        // For now assuming we just verify list existence

        await query('UPDATE cards SET list_id = $1, order_index = $2, updated_at = NOW() WHERE id = $3', [toListId, newIndex, id]);

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to move task' });
    }
});

export default router;
