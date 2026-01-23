import express from 'express';
import { query, getClient } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { writeLimiter, apiLimiter } from '../middleware/rateLimit.js';
import { userService } from '../services/userService.js';
import { SaveProjectSchema, VerifyProjectPasswordSchema } from '../utils/schemas.js';
import { cache } from '../cache.js';

import { normalizeStateData } from '../utils/helpers.js';
import bcrypt from 'bcrypt';
import { eventService, CHANNELS } from '../services/eventService.js';

const router = express.Router();

let stateCache = null;
let stateCacheTime = 0;
const CACHE_TTL = 60000;
const PROJECTS_CACHE_KEY = 'projects:state';
const PROJECTS_CACHE_TTL_SECONDS = 300;

const isValidProjectsCache = (cachedEntry) => {
  if (!cachedEntry || typeof cachedEntry !== 'object' || Array.isArray(cachedEntry)) {
    return false;
  }
  if (!Array.isArray(cachedEntry.projects)) {
    return false;
  }
  if (typeof cachedEntry.version !== 'number') {
    return false;
  }
  return true;
};

export const resetProjectsStateCache = () => {
  stateCache = null;
  stateCacheTime = 0;
};

router.get('/', requireAuth, async (req, res) => {
  try {
    const now = Date.now();
    const cachedResponse = await cache.get(PROJECTS_CACHE_KEY);
    if (cachedResponse) {
      if (!isValidProjectsCache(cachedResponse)) {
        await cache.del(PROJECTS_CACHE_KEY);
      } else {
        return res.json(cachedResponse);
      }
    }

    // Invalidate cache if older than TTL
    // NOTE: We might want to be more aggressive with cache invalidation for users, 
    // but for now 60s is fine as userService has its own cache.
    // However, if we want real-time user updates, we should fetch users every time 
    // or rely on the frontend to fetch /api/users independently.
    // For this "quick fix" maintaining the "monolith" structure, we will inject 
    // the users into the response.

    let stateResult = null;

    if (stateCache && (now - stateCacheTime < CACHE_TTL)) {
      stateResult = { ...stateCache };
    } else {
      const { rows } = await query('SELECT data, version FROM brickflow_state WHERE id = 1');
      if (rows.length > 0) {
        const data = normalizeStateData(rows[0].data);
        if (data.projects) {
          data.projects = data.projects.map(p => ({ ...p, password: p.password ? '****' : '' }));
        }
        stateResult = { ...data, version: rows[0].version };

        // Update Internal Cache
        stateCache = stateResult;
        stateCacheTime = now;
      }
    }

    if (stateResult) {
      // --- CRITICAL FIX: INJECT USERS FROM DB ---
      // The 'users' array in the JSON state is deprecated/unreliable.
      // We overwrite it with the actual users from master_users table.
      try {
        const dbUsers = await userService.getAll();
        // Map to ensure format compatibility if needed, though userService returns compatible structure
        stateResult.users = dbUsers.map(u => ({
          id: u.id,
          username: u.username,
          name: u.displayName || u.name, // Ensure displayName is present
          avatar: u.avatar,
          color: u.color
        }));
      } catch (userErr) {
        console.error('Failed to inject DB users into state:', userErr);
        // Fallback to existing state users if DB fetch fails (graceful degradation)
      }

      await cache.set(PROJECTS_CACHE_KEY, stateResult, PROJECTS_CACHE_TTL_SECONDS);
      res.json(stateResult);
    } else {
      res.json(null);
    }
  } catch (err) {
    console.error('Fetch projects error:', err);
    res.status(500).json({ error: 'Failed to fetch state' });
  }
});

router.post('/', requireAuth, writeLimiter, async (req, res) => {
  const result = SaveProjectSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.errors[0].message });
  }

  const { data, version, client_request_id } = result.data;

  const client = await getClient();
  try {
    await client.query('BEGIN');
    const current = await client.query('SELECT data, version FROM brickflow_state WHERE id = 1 FOR UPDATE');
    const currentVersion = current.rows.length ? current.rows[0].version : 0;
    const currentState = current.rows.length ? current.rows[0].data : null;

    if (version !== currentVersion) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Conflict', version: currentVersion });
    }

    if (data.projects) {
      data.projects = await Promise.all(data.projects.map(async (p) => {
        const existingProj = currentState?.projects?.find(ep => ep.id === p.id);
        if (p.password && p.password !== '****' && p.password !== existingProj?.password) {
          p.password = await bcrypt.hash(p.password, 10);
        } else if (p.password === '****' && existingProj) {
          p.password = existingProj.password;
        }
        return p;
      }));
    }

    const nextVersion = currentVersion + 1;
    const nextState = { ...data, version: nextVersion };

    await client.query('INSERT INTO brickflow_events (client_request_id, data) VALUES ($1, $2)', [client_request_id, JSON.stringify(nextState)]);
    await client.query(
      'INSERT INTO brickflow_state (id, data, version, updated_at) VALUES (1, $1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, version = EXCLUDED.version, updated_at = NOW()',
      [JSON.stringify(nextState), nextVersion]
    );

    await client.query('COMMIT');

    stateCache = null;

    // Publish update for real-time sync
    await eventService.publish(CHANNELS.PROJECT_UPDATED, {
      version: nextVersion,
      userId: req.user?.username || 'system'
    });

    res.json({ ok: true, version: nextVersion });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Save error:', err);
    res.status(500).json({ error: 'Internal Error' });
  } finally {
    client.release();
  }
});

router.post('/verify-password', requireAuth, apiLimiter, async (req, res) => {
  const result = VerifyProjectPasswordSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.errors[0].message });
  }

  const { projectId, password } = result.data;

  try {
    const { rows } = await query('SELECT data FROM brickflow_state WHERE id = 1');
    if (rows.length === 0) return res.status(404).json({ error: 'State not found' });

    const data = normalizeStateData(rows[0].data);
    const project = data.projects?.find(p => p.id === projectId);

    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!project.password) return res.json({ ok: true });

    const valid = await bcrypt.compare(password, project.password);
    if (valid) {
      res.json({ ok: true });
    } else {
      res.status(401).json({ error: 'Invalid password' });
    }
  } catch (err) {
    console.error('Verify password error:', err);
    res.status(500).json({ error: 'Internal Error' });
  }
});

export default router;
