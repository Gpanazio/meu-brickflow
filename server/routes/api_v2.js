import express from 'express';
import { query } from '../db.js';
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
