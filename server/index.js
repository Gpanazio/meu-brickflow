import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import { getClient, hasDatabaseUrl, query } from './db.js';

const isProd = process.env.NODE_ENV === 'production';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Behind Railway/other proxies
app.set('trust proxy', 1);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// In dev we may rely on Vite proxy; this CORS config allows direct calls too.
app.use(cors(isProd ? undefined : { origin: true, credentials: true }));

// --- FUNÇÕES AUXILIARES ---
const normalizeStateData = (state) => {
  if (!state) return null;
  if (Array.isArray(state)) return { projects: state };
  if (Array.isArray(state.projects)) return state;
  return state;
};

const parseCookies = (cookieHeader) => {
  if (!cookieHeader || typeof cookieHeader !== 'string') return {};
  const result = {};
  cookieHeader.split(';').forEach((part) => {
    const [rawKey, ...rest] = part.trim().split('=');
    if (!rawKey) return;
    const key = rawKey.trim();
    const value = rest.join('=');
    result[key] = decodeURIComponent(value);
  });
  return result;
};

const isRequestSecure = (req) => {
  const protoHeader = req?.headers?.['x-forwarded-proto'];
  const proto = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader;
  const normalizedProto = String(proto || '')
    .split(',')[0]
    .trim()
    .toLowerCase();

  return Boolean(req?.secure) || normalizedProto === 'https';
};

const setSessionCookie = (req, res, sessionId) => {
  const maxAge = 30 * 24 * 60 * 60; // 30 days in seconds
  const parts = [
    `bf_session=${encodeURIComponent(sessionId)}`,
    `Max-Age=${maxAge}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax'
  ];

  // Secure cookies only work over HTTPS.
  if (isProd && isRequestSecure(req)) {
    parts.push('Secure');
  }

  res.setHeader('Set-Cookie', parts.join('; '));
};

const clearSessionCookie = (req, res) => {
  const parts = ['bf_session=', 'Max-Age=0', 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (isProd && isRequestSecure(req)) {
    parts.push('Secure');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
};


// --- MIDDLEWARE DE LOGGING ---
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

const withVersion = (state, version) => {
  if (!state) return null;
  return { ...state, version };
};

const getAllMasterUsers = async () => {
  try {
    const { rows } = await query(`
      SELECT username, password as pin, display_name, role, avatar, color 
      FROM master_users
    `);
    
    return rows.map(u => ({
      username: u.username,
      displayName: u.display_name || u.username,
      role: u.role || 'member',
      pin: u.pin, 
      avatar: u.avatar || '',
      color: u.color || 'zinc'
    }));
  } catch (err) {
    // Silently fail if table doesn't exist yet (initDB will fix)
    // or if we really can't connect.
    return [];
  }
};

const getStateRow = async () => {
  let stateData = null;
  let version = 0;

  const { rows } = await query('SELECT data, version FROM brickflow_state WHERE id = 1');
  if (rows.length > 0) {
    stateData = normalizeStateData(rows[0].data);
    version = rows[0].version ?? 1;
  } else {
    const fallback = await query('SELECT data, version FROM brickflow_state ORDER BY id DESC LIMIT 1');
    if (fallback.rows.length > 0) {
      stateData = normalizeStateData(fallback.rows[0].data);
      version = fallback.rows[0].version ?? 1;
    }
  }

  // Inject Master Users as the Single Source of Truth
  const masterUsers = await getAllMasterUsers();
  if (masterUsers.length > 0) {
    if (!stateData) {
      stateData = { projects: [], version: 0 };
    }
    stateData.users = masterUsers;
  }

  return { data: stateData, version };
};

const sanitizeUser = (user) => {
  if (!user || typeof user !== 'object') return null;
  const { pin, ...rest } = user;
  return rest;
};

const stripUserPinsFromState = (state) => {
  if (!state || typeof state !== 'object') return state;
  const users = Array.isArray(state.users) ? state.users : [];
  if (users.length === 0) return state;
  return {
    ...state,
    users: users.map(sanitizeUser)
  };
};

const requireAuth = async (req, res, next) => {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const sessionId = cookies.bf_session;
    if (!sessionId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { rows } = await query(
      'SELECT id, user_id, expires_at FROM brickflow_sessions WHERE id = $1',
      [sessionId]
    );

    if (rows.length === 0) {
      clearSessionCookie(req, res);

      return res.status(401).json({ error: 'Invalid session' });
    }

    const session = rows[0];
    const expiresAt = session.expires_at ? new Date(session.expires_at) : null;
    if (expiresAt && Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) {
      await query('DELETE FROM brickflow_sessions WHERE id = $1', [sessionId]);
      clearSessionCookie(req, res);

      return res.status(401).json({ error: 'Session expired' });
    }

    const stateRow = await getStateRow();
    const users = stateRow.data?.users || [];
    const user = users.find((u) => u.username === session.user_id);
    if (!user) {
      await query('DELETE FROM brickflow_sessions WHERE id = $1', [sessionId]);
      clearSessionCookie(req, res);

      return res.status(401).json({ error: 'User not found' });
    }

    req.user = sanitizeUser(user);
    next();
  } catch (err) {
    console.error('❌ AUTH ERROR:', err);

    if (err?.code === 'MISSING_DATABASE_URL') {
      return res.status(503).json({ error: 'Database unavailable', details: err.message });
    }

    res.status(500).json({ error: 'Auth failure', code: err?.code, details: err?.message });
  }
};

// --- ROTAS DA API ---

// Health Check: Verifica se o servidor e o banco estão vivos
app.get('/api/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', timestamp: new Date() });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      code: err?.code,
      message: err?.message
    });
  }
});

// Auth: retorna usuário da sessão (sem erro 401 se não estiver logado para evitar log sujo no console)
app.get('/api/auth/me', async (req, res) => {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const sessionId = cookies.bf_session;
    if (!sessionId) {
      return res.json({ user: null });
    }

    const { rows } = await query('SELECT id, user_id, expires_at FROM brickflow_sessions WHERE id = $1', [
      sessionId
    ]);

    if (rows.length === 0) {
      clearSessionCookie(req, res);
      return res.json({ user: null });
    }

    const session = rows[0];
    const expiresAt = session.expires_at ? new Date(session.expires_at) : null;
    if (expiresAt && Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) {
      await query('DELETE FROM brickflow_sessions WHERE id = $1', [sessionId]);
      clearSessionCookie(req, res);
      return res.json({ user: null });
    }

    const stateRow = await getStateRow();
    const users = stateRow.data?.users || [];
    const user = users.find((u) => u.username === session.user_id);
    if (!user) {
      await query('DELETE FROM brickflow_sessions WHERE id = $1', [sessionId]);
      clearSessionCookie(req, res);
      return res.json({ user: null });
    }

    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error('❌ ERRO AUTH ME:', err);
    if (err?.code === 'MISSING_DATABASE_URL') {
      return res.status(503).json({ error: 'Database unavailable' });
    }
    res.status(500).json({ error: 'Internal error', details: err.message });
  }
});

// Auth: login (30 dias)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, pin } = req.body || {};
    if (!username || !pin) {
      return res.status(400).json({ error: 'Dados inválidos' });
    }

    const stateRow = await getStateRow();
    const users = stateRow.data?.users || [];
    const user = users.find((u) => (u.username || '').toLowerCase() === String(username).toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Usuário ou PIN incorretos.' });
    }

    const storedPin = user.pin;
    let ok = false;
    if (typeof storedPin === 'string' && storedPin.startsWith('$2')) {
      ok = await bcrypt.compare(String(pin), storedPin);
    } else {
      ok = String(storedPin) === String(pin);
    }

    if (!ok) {
      return res.status(401).json({ error: 'Usuário ou PIN incorretos.' });
    }

    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await query(
      'INSERT INTO brickflow_sessions (id, user_id, expires_at) VALUES ($1, $2, $3)',
      [sessionId, user.username, expiresAt]
    );

    setSessionCookie(req, res, sessionId);

    res.json({ ok: true, user: sanitizeUser(user) });
  } catch (err) {
    console.error('❌ ERRO LOGIN:', err);

    if (err?.code === 'MISSING_DATABASE_URL') {
      return res.status(503).json({ error: 'Database unavailable', details: err.message });
    }

    res.status(500).json({ error: 'Erro ao autenticar', code: err?.code, details: err?.message });
  }
});

// Auth: logout
app.post('/api/auth/logout', requireAuth, async (req, res) => {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const sessionId = cookies.bf_session;
    if (sessionId) {
      await query('DELETE FROM brickflow_sessions WHERE id = $1', [sessionId]);
    }
    clearSessionCookie(req, res);

    res.json({ ok: true });
  } catch (err) {
    console.error('❌ ERRO LOGOUT:', err);
    clearSessionCookie(req, res);

    res.status(500).json({ error: 'Erro ao deslogar', details: err.message });
  }
});

// Bootstrap: cria novo usuário no master_users
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, pin, displayName, role } = req.body || {};
    if (!username || !pin) {
      return res.status(400).json({ error: 'Dados inválidos' });
    }

    const existingCheck = await query('SELECT 1 FROM master_users WHERE username = $1', [username]);
    if (existingCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Usuário já existe.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(String(pin), salt);

    await query(
      'INSERT INTO master_users (username, password, display_name, role, color) VALUES ($1, $2, $3, $4, $5)',
      [username, hashed, displayName || String(username), role || 'member', 'zinc']
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('❌ ERRO REGISTER:', err);

    if (err?.code === 'MISSING_DATABASE_URL') {
      return res.status(503).json({ error: 'Database unavailable', details: err.message });
    }

    res.status(500).json({ error: 'Erro ao registrar', code: err?.code, details: err?.message });
  }
});

// GET: Busca estado atual
app.get('/api/projects', async (req, res) => {
  try {
    const { rows } = await query('SELECT data, version FROM brickflow_state WHERE id = 1');
    
    if (rows.length > 0) {
      const normalized = normalizeStateData(rows[0].data);
      res.json(withVersion(normalized, rows[0].version ?? 1));
    } else {
      // Tenta fallback para registros antigos se a tabela principal estiver vazia
      const fallback = await query('SELECT data, version FROM brickflow_state ORDER BY id DESC LIMIT 1');
      if (fallback.rows.length > 0) {
        const normalized = normalizeStateData(fallback.rows[0].data);
        res.json(withVersion(normalized, fallback.rows[0].version ?? 1));
      } else {
        // Primeira inicialização
        res.json(null);
      }
    }
  } catch (err) {
    console.error('❌ ERRO NA ROTA GET /api/projects:', err);
    
    if (err.code === 'MISSING_DATABASE_URL') {
      return res.status(503).json({ error: 'DATABASE_URL não configurada', code: err?.code, details: err?.message });
    }
    
    // Auto-healing: Se a tabela (42P01) ou coluna (42703) não existe, tenta inicializar/migrar
    if (err.code === '42P01' || err.code === '42703') {
       console.log(`⚠️ Erro de esquema detectado (${err.code}). Tentando inicializar/migrar banco...`);
       await initDB();
       return res.json(null);
    }
    
    res.status(500).json({ error: 'Erro interno ao buscar dados', code: err?.code, details: err?.message });
  }
});

// POST: Salva novo estado
app.post('/api/projects', async (req, res) => {
  const { data, client_request_id, version } = req.body;

  if (!data || !client_request_id || typeof version !== 'number') {
    return res.status(400).json({ error: 'Dados inválidos' });
  }

  let client;
  try {
    client = await getClient();
    await client.query('BEGIN');
    
    const stateResult = await client.query('SELECT version FROM brickflow_state WHERE id = 1 FOR UPDATE');
    const currentVersion = stateResult.rows.length > 0 ? stateResult.rows[0].version ?? 0 : 0;

    if (version !== currentVersion) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Conflito de versão', currentVersion });
    }

    const normalizedData = normalizeStateData(data) ?? { projects: [] };
    const nextVersion = currentVersion + 1;
    const nextState = { ...normalizedData, version: nextVersion };

    // Criptografa senhas de novos usuários
    if (nextState.users) {
      nextState.users = await Promise.all(nextState.users.map(async (user) => {
        if (user.pin && !user.pin.startsWith('$2b$')) {
          const salt = await bcrypt.genSalt(10);
          user.pin = await bcrypt.hash(user.pin, salt);
        }
        return user;
      }));
    }

    // Salva evento e estado
    await client.query(
      'INSERT INTO brickflow_events (client_request_id, data) VALUES ($1, $2)',
      [client_request_id, JSON.stringify(nextState)]
    );
    await client.query(
      `INSERT INTO brickflow_state (id, data, updated_at, version)
       VALUES (1, $1, CURRENT_TIMESTAMP, $2)
       ON CONFLICT (id) DO UPDATE
       SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP, version = EXCLUDED.version`,
      [JSON.stringify(nextState), nextVersion]
    );
    
    await client.query('COMMIT');
    res.json({ ack: true, version: nextVersion });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('❌ ERRO AO SALVAR:', err.message);
    res.status(500).json({ error: 'Erro ao salvar dados' });
  } finally {
    if (client) client.release();
  }
});

// GET: Histórico de eventos (changelog)
app.get('/api/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const { rows } = await query(
      `SELECT id, data, created_at
       FROM brickflow_events
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      events: rows.map(row => ({
        id: row.id,
        data: row.data,
        timestamp: row.created_at
      })),
      hasMore: rows.length === limit
    });
  } catch (err) {
    console.error('❌ ERRO NA ROTA GET /api/history:', err.message);
    res.status(500).json({ error: 'Erro ao buscar histórico', details: err.message });
  }
});

// GET: Lista de backups
app.get('/api/backups', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, kind, source, created_at,
              octet_length(snapshot::text) as size_bytes
       FROM brickflow_backups
       ORDER BY created_at DESC
       LIMIT 100`
    );

    res.json({
      backups: rows.map(row => ({
        id: row.id,
        kind: row.kind,
        source: row.source,
        timestamp: row.created_at,
        sizeBytes: parseInt(row.size_bytes)
      }))
    });
  } catch (err) {
    console.error('❌ ERRO NA ROTA GET /api/backups:', err.message);
    res.status(500).json({ error: 'Erro ao buscar backups', details: err.message });
  }
});

// POST: Criar backup manual
app.post('/api/backups', async (req, res) => {
  try {
    const { rows: stateRows } = await query('SELECT data, version FROM brickflow_state WHERE id = 1');

    if (stateRows.length === 0) {
      return res.status(404).json({ error: 'Nenhum estado disponível para backup' });
    }

    const snapshot = withVersion(stateRows[0].data, stateRows[0].version);

    await query(
      `INSERT INTO brickflow_backups (snapshot, kind, source)
       VALUES ($1, $2, $3)
       RETURNING id, created_at`,
      [JSON.stringify(snapshot), 'manual', 'user']
    );

    res.json({ success: true, message: 'Backup criado com sucesso' });
  } catch (err) {
    console.error('❌ ERRO AO CRIAR BACKUP:', err.message);
    res.status(500).json({ error: 'Erro ao criar backup', details: err.message });
  }
});

// GET: Restaurar backup específico
app.get('/api/backups/:id', async (req, res) => {
  try {
    const backupId = parseInt(req.params.id);
    const { rows } = await query(
      'SELECT snapshot, created_at FROM brickflow_backups WHERE id = $1',
      [backupId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Backup não encontrado' });
    }

    res.json({
      snapshot: rows[0].snapshot,
      timestamp: rows[0].created_at
    });
  } catch (err) {
    console.error('❌ ERRO AO BUSCAR BACKUP:', err.message);
    res.status(500).json({ error: 'Erro ao buscar backup', details: err.message });
  }
});

// POST: Restaurar backup
app.post('/api/backups/:id/restore', async (req, res) => {
  let client;
  try {
    const backupId = parseInt(req.params.id);
    client = await getClient();
    await client.query('BEGIN');

    const { rows: backupRows } = await client.query(
      'SELECT snapshot FROM brickflow_backups WHERE id = $1',
      [backupId]
    );

    if (backupRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Backup não encontrado' });
    }

    const snapshot = backupRows[0].snapshot;
    const { rows: stateRows } = await client.query(
      'SELECT version FROM brickflow_state WHERE id = 1 FOR UPDATE'
    );

    const currentVersion = stateRows.length > 0 ? stateRows[0].version ?? 0 : 0;
    const nextVersion = currentVersion + 1;
    const restoredState = { ...snapshot, version: nextVersion };

    await client.query(
      `INSERT INTO brickflow_state (id, data, updated_at, version)
       VALUES (1, $1, CURRENT_TIMESTAMP, $2)
       ON CONFLICT (id) DO UPDATE
       SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP, version = EXCLUDED.version`,
      [JSON.stringify(restoredState), nextVersion]
    );

    await client.query('COMMIT');
    res.json({ success: true, version: nextVersion, message: 'Backup restaurado com sucesso' });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('❌ ERRO AO RESTAURAR BACKUP:', err.message);
    res.status(500).json({ error: 'Erro ao restaurar backup', details: err.message });
  } finally {
    if (client) client.release();
  }
});

// GET: Itens na lixeira
app.get('/api/trash', async (req, res) => {
  try {
    const { rows } = await query('SELECT data, version FROM brickflow_state WHERE id = 1');

    if (rows.length === 0) {
      return res.json({ projects: [], subProjects: [] });
    }

    const state = normalizeStateData(rows[0].data);
    const projects = state?.projects || [];

    const trashedProjects = projects.filter(p => p.deleted_at);
    const trashedSubProjects = projects.flatMap(p =>
      (p.subProjects || [])
        .filter(sp => sp.deleted_at)
        .map(sp => ({ ...sp, parentProjectId: p.id, parentProjectName: p.name }))
    );

    res.json({
      projects: trashedProjects,
      subProjects: trashedSubProjects
    });
  } catch (err) {
    console.error('❌ ERRO NA ROTA GET /api/trash:', err.message);
    res.status(500).json({ error: 'Erro ao buscar lixeira', details: err.message });
  }
});

// POST: Restaurar item da lixeira
app.post('/api/trash/restore', async (req, res) => {
  const { itemId, itemType } = req.body; // itemType: 'project' ou 'subProject'

  if (!itemId || !itemType) {
    return res.status(400).json({ error: 'itemId e itemType são obrigatórios' });
  }

  let client;
  try {
    client = await getClient();
    await client.query('BEGIN');

    const { rows: stateRows } = await client.query(
      'SELECT data, version FROM brickflow_state WHERE id = 1 FOR UPDATE'
    );

    if (stateRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Estado não encontrado' });
    }

    const state = normalizeStateData(stateRows[0].data);
    const currentVersion = stateRows[0].version ?? 0;
    let projects = state?.projects || [];

    if (itemType === 'project') {
      projects = projects.map(p =>
        p.id === itemId ? { ...p, deleted_at: null } : p
      );
    } else if (itemType === 'subProject') {
      projects = projects.map(p => ({
        ...p,
        subProjects: (p.subProjects || []).map(sp =>
          sp.id === itemId ? { ...sp, deleted_at: null } : sp
        )
      }));
    }

    const nextVersion = currentVersion + 1;
    const nextState = { ...state, projects, version: nextVersion };

    await client.query(
      `INSERT INTO brickflow_state (id, data, updated_at, version)
       VALUES (1, $1, CURRENT_TIMESTAMP, $2)
       ON CONFLICT (id) DO UPDATE
       SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP, version = EXCLUDED.version`,
      [JSON.stringify(nextState), nextVersion]
    );

    await client.query('COMMIT');
    res.json({ success: true, version: nextVersion });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('❌ ERRO AO RESTAURAR ITEM:', err.message);
    res.status(500).json({ error: 'Erro ao restaurar item', details: err.message });
  } finally {
    if (client) client.release();
  }
});

// DELETE: Deletar permanentemente da lixeira
app.delete('/api/trash/:itemId', async (req, res) => {
  const { itemId } = req.params;
  const { itemType } = req.query; // 'project' ou 'subProject'

  if (!itemType) {
    return res.status(400).json({ error: 'itemType query parameter é obrigatório' });
  }

  let client;
  try {
    client = await getClient();
    await client.query('BEGIN');

    const { rows: stateRows } = await client.query(
      'SELECT data, version FROM brickflow_state WHERE id = 1 FOR UPDATE'
    );

    if (stateRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Estado não encontrado' });
    }

    const state = normalizeStateData(stateRows[0].data);
    const currentVersion = stateRows[0].version ?? 0;
    let projects = state?.projects || [];

    if (itemType === 'project') {
      projects = projects.filter(p => p.id !== itemId);
    } else if (itemType === 'subProject') {
      projects = projects.map(p => ({
        ...p,
        subProjects: (p.subProjects || []).filter(sp => sp.id !== itemId)
      }));
    }

    const nextVersion = currentVersion + 1;
    const nextState = { ...state, projects, version: nextVersion };

    await client.query(
      `INSERT INTO brickflow_state (id, data, updated_at, version)
       VALUES (1, $1, CURRENT_TIMESTAMP, $2)
       ON CONFLICT (id) DO UPDATE
       SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP, version = EXCLUDED.version`,
      [JSON.stringify(nextState), nextVersion]
    );

    await client.query('COMMIT');
    res.json({ success: true, version: nextVersion });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('❌ ERRO AO DELETAR PERMANENTEMENTE:', err.message);
    res.status(500).json({ error: 'Erro ao deletar item', details: err.message });
  } finally {
    if (client) client.release();
  }
});

// --- INICIALIZAÇÃO E SERVIDOR ---

const initDB = async () => {
  try {
    // Criação das tabelas se não existirem
    await query(`
      CREATE TABLE IF NOT EXISTS brickflow_state (
        id INTEGER PRIMARY KEY,
        data JSONB NOT NULL,
        version INTEGER DEFAULT 1,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Migração robusta: Garante que a coluna version existe
    try {
      const checkColumn = await query("SELECT column_name FROM information_schema.columns WHERE table_name='brickflow_state' AND column_name='version'");
      if (checkColumn.rows.length === 0) {
        await query('ALTER TABLE brickflow_state ADD COLUMN version INTEGER DEFAULT 1');
        console.log('✨ Coluna "version" adicionada com sucesso.');
      }
    } catch (e) {
      console.error('⚠️ Erro ao verificar/adicionar coluna version:', e.message);
    }

    await query(`
      CREATE TABLE IF NOT EXISTS brickflow_events (
        id BIGSERIAL PRIMARY KEY,
        client_request_id TEXT NOT NULL UNIQUE,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS brickflow_backups (
        id BIGSERIAL PRIMARY KEY,
        snapshot JSONB NOT NULL,
        kind TEXT NOT NULL DEFAULT 'hourly',
        source TEXT NOT NULL DEFAULT 'scheduler',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS brickflow_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Master Users & Seeding
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS master_users (
          username TEXT PRIMARY KEY,
          password TEXT NOT NULL,
          display_name TEXT,
          role TEXT DEFAULT 'member',
          avatar TEXT,
          color TEXT
        );
      `);
      
      // Seed Gabriel
      await query(`
        INSERT INTO master_users (username, password, display_name, role, color)
        VALUES ('Gabriel', '$2b$10$V5RIP3w.qoyLKbMx9EZWDu8d/0UCbp5aJUhyK0SkrQzfQ5eh9qJXW', 'Gabriel', 'owner', 'red')
        ON CONFLICT (username) DO UPDATE 
        SET role = 'owner', password = EXCLUDED.password;
      `);
      console.log('✅ Tabela master_users verificada e usuário Gabriel garantido.');
    } catch (e) {
      console.error('⚠️ Erro ao configurar master_users:', e.message);
    }

    console.log('✅ Tabelas verificadas/criadas com sucesso.');
  } catch (err) {
    console.error('❌ Erro ao inicializar tabelas:', err.message);
  }
};

const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Inicializa banco e servidor
if (hasDatabaseUrl) {
  initDB();
}

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
