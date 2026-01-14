import express from 'express';
import cors from 'cors';
import path from 'path';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

// Imports Modulares
import { getClient, hasDatabaseUrl, query } from './db.js';
import { requireAuth } from './middleware/auth.js';
import { 
  isProd, 
  normalizeStateData, 
  parseCookies, 
  setSessionCookie, 
  getDistPath 
} from './utils/helpers.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors(isProd ? undefined : { origin: true, credentials: true }));

app.get('/api/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', secure: req.secure, env: process.env.NODE_ENV });
  } catch (err) {
    res.status(503).json({ status: 'error', code: 'DB_ERROR' });
  }
});

app.get('/api/auth/me', async (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    if (!cookies.bf_session) return res.json({ user: null });
    
    try {
        const { rows } = await query('SELECT user_id FROM brickflow_sessions WHERE id = $1 AND expires_at > NOW()', [cookies.bf_session]);
        if (rows.length === 0) return res.json({ user: null });
        
        const userRes = await query('SELECT username, name, role, avatar, color FROM master_users WHERE username = $1', [rows[0].user_id]);
        if (userRes.rows.length === 0) return res.json({ user: null });
        
        const u = userRes.rows[0];
        res.json({ user: { username: u.username, displayName: u.name, role: u.role, avatar: u.avatar, color: u.color } });
    } catch {
        res.json({ user: null });
    }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, pin } = req.body;
  if (!username || !pin) return res.status(400).json({ error: 'Missing credentials' });

  try {
    const { rows } = await query('SELECT username, password_hash, name, role, avatar, color FROM master_users WHERE username = $1', [username]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(String(pin), rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const sessionId = randomUUID();
    await query("INSERT INTO brickflow_sessions (id, user_id, expires_at) VALUES ($1, $2, NOW() + interval '30 days')", [sessionId, username]);
    
    setSessionCookie(req, res, sessionId);
    
    const u = rows[0];
    res.json({ ok: true, user: { username: u.username, displayName: u.name, role: u.role, avatar: u.avatar, color: u.color } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    if (cookies.bf_session) {
        await query('DELETE FROM brickflow_sessions WHERE id = $1', [cookies.bf_session]);
    }
    res.setHeader('Set-Cookie', 'bf_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax');
    res.json({ ok: true });
});

app.get('/api/projects', async (req, res) => {
    try {
        const { rows } = await query('SELECT data, version FROM brickflow_state WHERE id = 1');
        if (rows.length > 0) {
            const data = normalizeStateData(rows[0].data);
            res.json({ ...data, version: rows[0].version });
        } else {
            res.json(null);
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch state' });
    }
});

app.post('/api/projects', requireAuth, async (req, res) => {
    const { data, version, client_request_id } = req.body;
    
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const current = await client.query('SELECT version FROM brickflow_state WHERE id = 1 FOR UPDATE');
        const currentVersion = current.rows.length ? current.rows[0].version : 0;

        if (version !== currentVersion) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Conflict', version: currentVersion });
        }

        const nextVersion = currentVersion + 1;
        const nextState = { ...data, version: nextVersion };

        await client.query('INSERT INTO brickflow_events (client_request_id, data) VALUES ($1, $2)', [client_request_id, JSON.stringify(nextState)]);
        await client.query(
            'INSERT INTO brickflow_state (id, data, version, updated_at) VALUES (1, $1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, version = EXCLUDED.version, updated_at = NOW()',
            [JSON.stringify(nextState), nextVersion]
        );

        await client.query('COMMIT');
        res.json({ ok: true, version: nextVersion });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Save error:', err);
        res.status(500).json({ error: 'Internal Error' });
    } finally {
        client.release();
    }
});

app.get('/api/admin/users', requireAuth, async (req, res) => {
    const isOwner = req.user.role === 'owner';
    const isLegacyAdmin = ['gabriel', 'lufe'].includes(req.user.username.toLowerCase());
    
    if (!isOwner && !isLegacyAdmin) return res.status(403).json({ error: 'Forbidden' });

    const { rows } = await query('SELECT id, username, name, email, role, avatar, color, created_at FROM master_users ORDER BY username ASC');
    res.json({ users: rows });
});

const distPath = getDistPath();
app.use(express.static(distPath));
app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

if (hasDatabaseUrl) {
    query('SELECT 1').then(() => console.log('✅ DB Connected')).catch(e => console.error('❌ DB Fail:', e.message));
}

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
