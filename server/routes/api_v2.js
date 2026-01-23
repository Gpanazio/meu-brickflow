import express from 'express';
import { query, getClient } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const generateId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// File Storage Config
const UPLOAD_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || './uploads'; // Use Railway volume or local fallback
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

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

        // Check for property existence (allows empty strings)
        if (Object.prototype.hasOwnProperty.call(req.body, 'name')) { updates.push(`name = $${idx++}`); values.push(name); }
        if (Object.prototype.hasOwnProperty.call(req.body, 'description')) { updates.push(`description = $${idx++}`); values.push(description); }
        if (Object.prototype.hasOwnProperty.call(req.body, 'color')) { updates.push(`color = $${idx++}`); values.push(color); }

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
    let client;
    try {
        client = await getClient();
    } catch (err) {
        console.error('Error acquiring client:', err);
        return res.status(500).json({ error: 'Failed to acquire database client' });
    }

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
        const GOAL_LISTS = ['Curto Prazo', 'Médio Prazo', 'Longo Prazo'];
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
        if (tabs.includes('goals')) {
            for (const title of GOAL_LISTS) {
                const listId = generateId('list');
                await client.query(
                    'INSERT INTO lists (id, sub_project_id, title, order_index, type) VALUES ($1, $2, $3, $4, $5)',
                    [listId, id, title, listIdx++, 'GOALS']
                );
            }
        }

        await client.query('COMMIT');
        res.json(subProject);
    } catch (err) {
        if (client) await client.query('ROLLBACK').catch(() => { });
        console.error('Subproject Create Error:', err);
        res.status(500).json({ error: 'Failed to create subproject' });
    } finally {
        if (client) client.release();
    }
});

// PUT /api/v2/subprojects/:id (Update Subproject)
router.put('/subprojects/:id', requireAuth, async (req, res) => {
    let client;
    try {
        client = await getClient();
    } catch (err) {
        console.error('Error acquiring client:', err);
        return res.status(500).json({ error: 'Failed to acquire database client' });
    }

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
            if (client) {
                await client.query('ROLLBACK').catch(() => { });
                client.release();
            }
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id);
        const { rows, rowCount } = await client.query(
            `UPDATE sub_projects SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
            values
        );

        if (rowCount === 0) {
            if (client) {
                await client.query('ROLLBACK').catch(() => { });
                client.release();
            }
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
            const GOAL_LISTS = ['Curto Prazo', 'Médio Prazo', 'Longo Prazo'];

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
            // Create GOALS lists if enabled but don't exist
            if (enabledTabs.includes('goals') && !existingTypes.has('GOALS')) {
                for (const title of GOAL_LISTS) {
                    const listId = generateId('list');
                    await client.query(
                        'INSERT INTO lists (id, sub_project_id, title, order_index, type) VALUES ($1, $2, $3, $4, $5)',
                        [listId, id, title, listIdx++, 'GOALS']
                    );
                }
            }
        }

        await client.query('COMMIT');
        res.json(rows[0]);
    } catch (err) {
        if (client) await client.query('ROLLBACK').catch(() => { });
        console.error('Subproject Update Error:', err);
        res.status(500).json({ error: 'Failed to update subproject' });
    } finally {
        if (client) client.release();
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
        // Fetch lists with cards
        const { rows: lists } = await query('SELECT * FROM lists WHERE sub_project_id = $1 ORDER BY order_index ASC', [id]);
        const listIds = lists.map(l => l.id);
        let cards = [];
        if (listIds.length > 0) {
            const { rows } = await query('SELECT * FROM cards WHERE list_id = ANY($1) ORDER BY order_index ASC', [listIds]);
            cards = rows;
        }
        const listsWithCards = lists.map(list => ({
            ...list,
            cards: cards.filter(c => c.list_id === list.id)
        }));

        // Fetch Files & Folders for this subproject
        const { rows: files } = await query('SELECT * FROM files WHERE sub_project_id = $1 ORDER BY upload_date DESC', [id]);
        const { rows: folders } = await query('SELECT * FROM folders WHERE sub_project_id = $1 ORDER BY name ASC', [id]);

        // Construct legacy-compatible structure
        // The BoardPage expects data.boardData.files.files/folders
        // We inject this structure
        const boardData = {
            ...(subProject.board_config || {}),
            files: {
                files: files,
                folders: folders
            }
        };

        res.json({
            ...subProject,
            lists: listsWithCards,
            boardData: boardData // Override/Merge to provide files to Frontend
        });

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

// --- FILES ---

// POST /api/v2/files/upload (Upload)
router.post('/files/upload', requireAuth, upload.array('files', 10), async (req, res) => {
    let client;
    try {
        const files = req.files;
        const { projectId, subProjectId, folderId } = req.body;

        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        client = await getClient();
        await client.query('BEGIN');

        const insertedFiles = [];

        for (const file of files) {
            const id = generateId('file');
            const filePath = file.path; // Absolute path on disk
            const size = file.size;
            const type = file.mimetype;
            const name = file.originalname; // Or sanitize this

            const { rows } = await client.query(
                'INSERT INTO files (id, project_id, sub_project_id, folder_id, name, type, size, path, upload_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *',
                [id, projectId, subProjectId || null, folderId || null, name, type, size, filePath]
            );
            insertedFiles.push(rows[0]);
        }

        await client.query('COMMIT');
        res.json(insertedFiles);

    } catch (err) {
        if (client) await client.query('ROLLBACK').catch(() => { });
        console.error('File Upload Error:', err);
        res.status(500).json({ error: 'Failed to upload files' });
    } finally {
        if (client) client.release();
    }
});

// GET /api/v2/files/:id/download (Download/Serve)
router.get('/files/:id/download', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await query('SELECT * FROM files WHERE id = $1', [id]);

        if (rows.length === 0) return res.status(404).json({ error: 'File not found' });
        const fileRecord = rows[0];

        // Check if file exists on disk
        if (fileRecord.path && fs.existsSync(fileRecord.path)) {
            res.download(fileRecord.path, fileRecord.name);
        } else {
            // Fallback for legacy base64 data (migration support)
            if (fileRecord.data) {
                const fileBuffer = Buffer.from(fileRecord.data.split(',')[1], 'base64');
                res.writeHead(200, {
                    'Content-Type': fileRecord.type,
                    'Content-Length': fileBuffer.length,
                    'Content-Disposition': `attachment; filename="${fileRecord.name}"`
                });
                res.end(fileBuffer);
            } else {
                res.status(404).json({ error: 'Physical file not found' });
            }
        }

    } catch (err) {
        console.error('File Download Error:', err);
        res.status(500).json({ error: 'Failed to download file' });
    }
});

// DELETE /api/v2/files/:id (Delete)
router.delete('/files/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await query('DELETE FROM files WHERE id = $1 RETURNING *', [id]);

        if (rows.length === 0) return res.status(404).json({ error: 'File not found' });
        const fileRecord = rows[0];

        // Delete from disk
        if (fileRecord.path && fs.existsSync(fileRecord.path)) {
            try {
                fs.unlinkSync(fileRecord.path);
            } catch (fsErr) {
                console.warn(`Failed to delete file from disk: ${fileRecord.path}`, fsErr);
            }
        }

        res.json({ success: true, message: 'File deleted' });
    } catch (err) {
        console.error('File Delete Error:', err);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});

// --- FOLDERS ---

// POST /api/v2/folders (Create)
router.post('/folders', requireAuth, async (req, res) => {
    try {
        const { projectId, subProjectId, parentId, name, color } = req.body;
        const id = generateId('folder');

        const { rows } = await query(
            'INSERT INTO folders (id, project_id, sub_project_id, parent_id, name, color) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [id, projectId, subProjectId, parentId || null, name, color || 'default']
        );
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create folder' });
    }
});

// PUT /api/v2/folders/:id (Rename/Color)
router.put('/folders/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, color } = req.body;
        // TODO: Implement selective update
        const { rows } = await query(
            'UPDATE folders SET name = COALESCE($1, name), color = COALESCE($2, color), updated_at = NOW() WHERE id = $3 RETURNING *',
            [name, color, id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Folder not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update folder' });
    }
});

// DELETE /api/v2/folders/:id (Delete)
router.delete('/folders/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        // Postgres ON DELETE CASCADE should handle children folders and files linked to this folder
        // HOWEVER, we need to delete physical files for all deleted file records.
        // Complex query needed to find all affected files first, or just rely on a periodic cleanup job / ignoring orphaned files.
        // For MVP: recursive delete logic is safer in code if we want to ensure disk cleanup.

        // 1. Find all descendant folders (recursive CTE)
        // 2. Find all files in these folders
        // 3. Delete files from disk
        // 4. Delete root folder (cascade takes care of DB records)

        // Simplified approach: Just delete DB record, leave potential orphaned files for now (or implement robust cleanup later)
        // Or fetch files linked to this folder directly:
        const { rows: filesToDelete } = await query('SELECT path FROM files WHERE folder_id = $1', [id]);

        await query('DELETE FROM folders WHERE id = $1', [id]); // Cascade deletes subfolders/files in DB

        // Cleanup disk
        filesToDelete.forEach(f => {
            if (f.path && fs.existsSync(f.path)) fs.unlinkSync(f.path);
        });

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete folder' });
    }
});
