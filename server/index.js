import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { getClient, hasDatabaseUrl, query } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// --- FUNÇÕES AUXILIARES ---
const normalizeStateData = (state) => {
  if (!state) return null;
  if (Array.isArray(state)) return { projects: state };
  if (Array.isArray(state.projects)) return state;
  return state;
};

const withVersion = (state, version) => {
  if (!state) return null;
  return { ...state, version };
};

// --- ROTAS DA API ---

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
    console.error('❌ ERRO NA ROTA GET /api/projects:', err.message);
    
    if (err.code === 'MISSING_DATABASE_URL') {
      return res.status(503).json({ error: 'DATABASE_URL não configurada' });
    }
    
    // Auto-healing: Se a tabela não existe, tenta criar
    if (err.code === '42P01') {
       console.log('⚠️ Tabela não encontrada. Tentando inicializar banco...');
       await initDB();
       return res.json(null);
    }
    
    res.status(500).json({ error: 'Erro interno ao buscar dados', details: err.message });
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
