import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { SaveProjectSchema, VerifyProjectPasswordSchema } from '../utils/schemas.js';
import { eventService, CHANNELS } from '../services/eventService.js';
import { normalizeStateData } from '../utils/helpers.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await query('SELECT data FROM brickflow_state WHERE id = 1');
    if (rows.length === 0) return res.json({ projects: [] });

    const state = normalizeStateData(JSON.parse(rows[0].data));
    res.json({ projects: state.projects });
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

router.post('/', requireAuth, writeLimiter, async (req, res) => {
  try {
    const result = SaveProjectSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors });
    }

    const { data, version, client_request_id, userId } = req.body;
    const currentVersion = await query('SELECT version FROM brickflow_state WHERE id = 1');
    const currentData = currentVersion.rows[0]?.data ? JSON.parse(currentVersion.rows[0].data) : { projects: [] };

    if (version && version !== currentVersion.rows[0].version) {
      return res.status(409).json({ error: 'Version conflict' });
    }

    await query('UPDATE brickflow_state SET data = $1, version = $2, updated_at = NOW() WHERE id = 1', [JSON.stringify({ ...currentData, projects: data }), version || currentVersion.rows[0].version]);
    res.json({ version: version || currentVersion.rows[0].version });

    await eventService.publish(CHANNELS.PROJECT_UPDATED, {
      projectId: null,
      updatedBy: userId,
      timestamp: Date.now()
    });
  } catch (err) {
    console.error('Error saving projects:', err);
    res.status(500).json({ error: 'Failed to save projects' });
  }
});

router.post('/verify-password', authLimiter, async (req, res) => {
  try {
    const result = VerifyProjectPasswordSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors });
    }

    const { projectId, password } = req.body;
    const { rows } = await query(
      'SELECT password_hash FROM brickflow_state WHERE data @> $1::jsonb ORDER BY updated_at DESC LIMIT 1',
      [JSON.stringify({ projects: [{ id: projectId }] })]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const storedHash = JSON.parse(rows[0].data).projects[0].password_hash;
    const bcrypt = await import('bcrypt').then(m => m.default);
    const isValid = await bcrypt.compare(password, storedHash);

    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    res.json({ valid: true });
  } catch (err) {
    console.error('Error verifying password:', err);
    res.status(500).json({ error: 'Failed to verify password' });
  }
});

export default router;
