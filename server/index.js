import express from 'express';
import cors from 'cors';
import path from 'path';
import bcrypt from 'bcrypt';
import helmet from 'helmet';
import process from 'process';
import { randomUUID } from 'crypto';

// Imports Modulares
import { getClient, hasDatabaseUrl, query } from './db.js';
import { requireAuth } from './middleware/auth.js';
import { authLimiter, apiLimiter, writeLimiter } from './middleware/rateLimit.js';
import { 
  LoginSchema, 
  RegisterSchema, 
  SaveProjectSchema,
  VerifyProjectPasswordSchema
} from './utils/schemas.js';
import { 
  isProd, 
  normalizeStateData, 
  parseCookies, 
  setSessionCookie, 
  getDistPath 
} from './utils/helpers.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Simple Cache Store
let stateCache = null;
let stateCacheTime = 0;
const CACHE_TTL = 60000; // 1 minute

// Security Middleware
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://api.dicebear.com", "https://*.githubusercontent.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://flow.brick.mov", "https://*.railway.app"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// CORS configuration - Applied ONLY to /api
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(',')
  .map(o => o.trim())
  .filter(o => o.length > 0);

app.use('/api', (req, res, next) => {
  const origin = req.headers.origin;
  const host = req.headers.host;
  
  // Whitelist from env
  const isWhitelisted = origin ? allowedOrigins.includes(origin) : true;
  
  // Specific check for the known production domain to avoid issues with Host vs Origin mismatch
  const isKnownProd = origin === 'https://flow.brick.mov';
  
  // Check if it's same-origin manually if host is available
  let isSameOrigin = false;
  if (origin && host) {
    const protocol = isProd ? 'https' : req.protocol;
    isSameOrigin = origin === `${protocol}://${host}`;
  }

  const shouldAllow = !isProd || isWhitelisted || isKnownProd || isSameOrigin || !origin;

  if (shouldAllow) {
    cors({
      origin: origin || true,
      credentials: true
    })(req, res, next);
  } else {
    console.warn(`[CORS] Rejected: ${origin}. Whitelist: ${allowedOrigins.join(', ')}`);
    res.status(403).json({ error: 'CORS Policy: Origin not allowed' });
  }
});

// Apply general API rate limit
app.use('/api/', apiLimiter);

app.get('/api/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', secure: req.secure, env: process.env.NODE_ENV });
  } catch (err) {
    console.error('Health check error:', err);
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

app.post('/api/auth/login', authLimiter, async (req, res) => {
  const result = LoginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.errors[0].message });
  }

  const { username, pin } = result.data;

  try {
    const { rows } = await query('SELECT username, password_hash, name, role, avatar, color FROM master_users WHERE username = $1', [username]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(pin, rows[0].password_hash);
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

app.post('/api/auth/register', authLimiter, async (req, res) => {
  const result = RegisterSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.errors[0].message });
  }

  const { username, pin, name, role, email, avatar, color } = result.data;

  try {
    const { rows: existing } = await query('SELECT username FROM master_users WHERE username = $1', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const passwordHash = await bcrypt.hash(pin, 10);
    await query(
      'INSERT INTO master_users (username, password_hash, name, role, email, avatar, color) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [username, passwordHash, name, role || 'user', email || '', avatar || '', color || '#000000']
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
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
        const now = Date.now();
        if (stateCache && (now - stateCacheTime < CACHE_TTL)) {
            return res.json(stateCache);
        }

        const { rows } = await query('SELECT data, version FROM brickflow_state WHERE id = 1');
        if (rows.length > 0) {
            const data = normalizeStateData(rows[0].data);
            // Hide project passwords in response
            if (data.projects) {
              data.projects = data.projects.map(p => ({ ...p, password: p.password ? '****' : '' }));
            }
            const result = { ...data, version: rows[0].version };
            
            // Update Cache
            stateCache = result;
            stateCacheTime = now;
            
            res.json(result);
        } else {
            res.json(null);
        }
    } catch (err) {
        console.error('Fetch projects error:', err);
        res.status(500).json({ error: 'Failed to fetch state' });
    }
});

app.post('/api/projects', requireAuth, writeLimiter, async (req, res) => {
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

        // Project Password Hashing Logic
        // Compare with currentState to see if passwords changed and need hashing
        if (data.projects) {
          data.projects = await Promise.all(data.projects.map(async (p) => {
            const existingProj = currentState?.projects?.find(ep => ep.id === p.id);
            // If password exists and it's not the hashed placeholder and changed from existing
            if (p.password && p.password !== '****' && p.password !== existingProj?.password) {
              p.password = await bcrypt.hash(p.password, 10);
            } else if (p.password === '****' && existingProj) {
              p.password = existingProj.password; // Preserve existing hash
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
        
        // Invalidate Cache
        stateCache = null;
        
        res.json({ ok: true, version: nextVersion });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Save error:', err);
        res.status(500).json({ error: 'Internal Error' });
    } finally {
        client.release();
    }
});

app.post('/api/projects/verify-password', apiLimiter, async (req, res) => {
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
        if (!project.password) return res.json({ ok: true }); // No password needed

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

// Global Error Handler
app.use((err, req, res) => {
    if (err.message === 'Not allowed by CORS') {
        res.status(403).json({ error: 'CORS Policy: Origin not allowed' });
    } else {
        console.error('Unhandled Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

if (hasDatabaseUrl) {
    // A conexão é testada e gerenciada dentro de db.js com suporte a fallback
}

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
