import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { getClient, query } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURAÇÃO DE LIMITES (50MB) ---
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// --- INICIALIZAÇÃO DO BANCO (AUTO-HEALING) ---
// Isso cria a tabela automaticamente se ela não existir
const initDB = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS brickflow_state (
        id INTEGER PRIMARY KEY,
        data JSONB NOT NULL,
        version INTEGER DEFAULT 1,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await query(`
      ALTER TABLE brickflow_state
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);
    await query(`
      ALTER TABLE brickflow_state
      ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
    `);
    await query(`
      UPDATE brickflow_state
      SET version = COALESCE(version, 1)
      WHERE version IS NULL;
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
    await query(`
      CREATE INDEX IF NOT EXISTS idx_brickflow_backups_created_at
      ON brickflow_backups (created_at DESC, id DESC);
    `);
    await query(`
      INSERT INTO brickflow_state (id, data, updated_at, version)
      SELECT 1, data, COALESCE(updated_at, created_at, CURRENT_TIMESTAMP), COALESCE(version, 1)
      FROM brickflow_state
      ORDER BY id DESC
      LIMIT 1
      ON CONFLICT (id) DO UPDATE
      SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at, version = EXCLUDED.version;
    `);
    console.log('✅ Banco de dados inicializado: Tabela "brickflow_state" verificada.');
  } catch (err) {
    console.error('❌ Erro crítico ao criar tabela:', err);
  }
};

const createBackupSnapshot = async ({ kind, source }) => {
  const { rows } = await query('SELECT data, version FROM brickflow_state WHERE id = 1');
  if (rows.length === 0) return null;
  const normalized = normalizeStateData(rows[0].data) ?? { projects: [] };
  const snapshot = { ...normalized, version: rows[0].version ?? 1 };
  const { rows: backupRows } = await query(
    'INSERT INTO brickflow_backups (snapshot, kind, source) VALUES ($1, $2, $3) RETURNING id, created_at',
    [JSON.stringify(snapshot), kind, source]
  );
  return backupRows[0];
};

const ensureInitialBackup = async () => {
  const { rows } = await query('SELECT id FROM brickflow_backups LIMIT 1');
  if (rows.length === 0) {
    await createBackupSnapshot({ kind: 'startup', source: 'system' });
  }
};

const scheduleBackups = () => {
  const hourlyIntervalMinutes = Number(process.env.BACKUP_HOURLY_INTERVAL_MINUTES ?? 60);
  const dailyIntervalHours = Number(process.env.BACKUP_DAILY_INTERVAL_HOURS ?? 24);
  const hourlyIntervalMs = hourlyIntervalMinutes > 0 ? hourlyIntervalMinutes * 60 * 1000 : 0;
  const dailyIntervalMs = dailyIntervalHours > 0 ? dailyIntervalHours * 60 * 60 * 1000 : 0;

  if (hourlyIntervalMs) {
    setInterval(() => {
      createBackupSnapshot({ kind: 'hourly', source: 'scheduler' }).catch(err => {
        console.error('Erro ao criar backup horário:', err);
      });
    }, hourlyIntervalMs);
  }

  if (dailyIntervalMs) {
    setInterval(() => {
      createBackupSnapshot({ kind: 'daily', source: 'scheduler' }).catch(err => {
        console.error('Erro ao criar backup diário:', err);
      });
    }, dailyIntervalMs);
  }
};

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

const getProjectsFromState = (state) => {
  if (!state) return [];
  if (Array.isArray(state)) return state;
  if (Array.isArray(state.projects)) return state.projects;
  return [];
};

const getProjectChanges = (previousState, nextState) => {
  const previousProjects = getProjectsFromState(previousState);
  const nextProjects = getProjectsFromState(nextState);
  const previousMap = new Map(previousProjects.map(project => [project.id, project]));
  const nextMap = new Map(nextProjects.map(project => [project.id, project]));
  const changes = [];

  nextMap.forEach((project, projectId) => {
    const previousProject = previousMap.get(projectId);
    if (!previousProject) {
      changes.push({
        projectId,
        actionType: 'create',
        payload: { createdFrom: 'sync' },
        snapshotAfter: project
      });
      return;
    }

    const previousSerialized = JSON.stringify(previousProject);
    const nextSerialized = JSON.stringify(project);
    if (previousSerialized !== nextSerialized) {
      changes.push({
        projectId,
        actionType: 'update',
        payload: { diffSource: 'sync' },
        snapshotAfter: project
      });
    }
  });

  previousMap.forEach((project, projectId) => {
    if (!nextMap.has(projectId)) {
      changes.push({
        projectId,
        actionType: 'delete',
        payload: { snapshotBefore: project },
        snapshotAfter: null
      });
    }
  });

  return changes;
};

const createClientRequestId = (prefix) => {
  if (typeof randomUUID === 'function') {
    return `${prefix}-${randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const getLatestStateRecord = async () => {
  const { rows } = await query('SELECT data, version FROM brickflow_state WHERE id = 1');
  if (rows.length > 0) {
    return rows[0];
  }
  const fallback = await query('SELECT data, version FROM brickflow_state ORDER BY id DESC LIMIT 1');
  return fallback.rows[0] || null;
};

// --- API ROUTES ---

// Rota para buscar o estado atual
app.get('/api/projects', async (req, res) => {
  try {
    const { rows } = await query('SELECT data, version FROM brickflow_state WHERE id = 1');
    if (rows.length > 0) {
      const normalized = normalizeStateData(rows[0].data);
      res.json(withVersion(normalized, rows[0].version ?? 1));
    } else {
      const fallback = await query('SELECT data, version FROM brickflow_state ORDER BY id DESC LIMIT 1');
      if (fallback.rows.length > 0) {
        const normalized = normalizeStateData(fallback.rows[0].data);
        res.json(withVersion(normalized, fallback.rows[0].version ?? 1));
      } else {
        // Retorna null para o front saber que é a primeira vez e inicializar
        res.json(null);
      }
    }
  } catch (err) {
    console.error('Erro no banco:', err);
    // Se o erro for de tabela inexistente (caso raro de race condition), tenta inicializar
    if (err.code === '42P01') {
       await initDB();
       res.json(null);
    } else {
       res.status(500).json({ error: 'Erro interno ao buscar dados' });
    }
  }
});

app.get('/api/trash', async (req, res) => {
  try {
    const record = await getLatestStateRecord();
    if (!record) {
      return res.json({ projects: [], subProjects: [] });
    }

    const normalized = normalizeStateData(record.data) ?? { projects: [] };
    const projects = getProjectsFromState(normalized);
    const deletedProjects = projects.filter(project => project.deleted_at);
    const deletedSubProjects = projects.flatMap(project => (
      (project.subProjects || [])
        .filter(subProject => subProject.deleted_at)
        .map(subProject => ({
          ...subProject,
          projectId: project.id,
          projectName: project.name
        }))
    ));

    res.json({ projects: deletedProjects, subProjects: deletedSubProjects });
  } catch (err) {
    console.error('Erro ao listar lixeira:', err);
    res.status(500).json({ error: 'Erro interno ao listar lixeira' });
  }
});

app.post('/api/trash/restore', async (req, res) => {
  const { type, id, projectId } = req.body;

  if (!type || !id) {
    return res.status(400).json({ error: 'Tipo e ID são obrigatórios' });
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');
    const stateResult = await client.query(
      'SELECT data, version FROM brickflow_state WHERE id = 1 FOR UPDATE'
    );

    if (stateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Estado não encontrado' });
    }

    const currentVersion = stateResult.rows[0].version ?? 0;
    const normalized = normalizeStateData(stateResult.rows[0].data) ?? { projects: [] };
    const projects = getProjectsFromState(normalized);
    let updatedProjects = projects;
    let found = false;

    if (type === 'project') {
      updatedProjects = projects.map(project => {
        if (project.id !== id) return project;
        found = true;
        return { ...project, deleted_at: null };
      });
    } else if (type === 'subProject') {
      if (!projectId) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Project ID é obrigatório para restaurar área' });
      }
      updatedProjects = projects.map(project => {
        if (project.id !== projectId) return project;
        const subProjects = (project.subProjects || []).map(subProject => {
          if (subProject.id !== id) return subProject;
          found = true;
          return { ...subProject, deleted_at: null };
        });
        return { ...project, subProjects };
      });
    } else {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Tipo inválido' });
    }

    if (!found) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Item não encontrado' });
    }

    const nextVersion = currentVersion + 1;
    const updatedState = { ...normalized, projects: updatedProjects, version: nextVersion };
    const clientRequestId = `trash-restore-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    await client.query(
      `INSERT INTO brickflow_state (id, data, updated_at, version)
       VALUES (1, $1, CURRENT_TIMESTAMP, $2)
       ON CONFLICT (id) DO UPDATE
       SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP, version = EXCLUDED.version`,
      [JSON.stringify(updatedState), nextVersion]
    );
    await client.query(
      'INSERT INTO brickflow_events (client_request_id, data) VALUES ($1, $2)',
      [clientRequestId, JSON.stringify(updatedState)]
    );
    await client.query('COMMIT');

    res.json({ success: true, data: updatedState });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao restaurar lixeira:', err);
    res.status(500).json({ error: 'Erro interno ao restaurar item' });
  } finally {
    client.release();
  }
});

// Rota para salvar (Cria novo registro = Backup automático)
app.post('/api/projects', async (req, res) => {
  const { data, client_request_id, version } = req.body;

  if (!data || !client_request_id || typeof version !== 'number') {
    return res.status(400).json({ error: 'Dados inválidos' });
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');
    const stateResult = await client.query(
      'SELECT version FROM brickflow_state WHERE id = 1 FOR UPDATE'
    );
    const currentVersion = stateResult.rows.length > 0 ? stateResult.rows[0].version ?? 0 : 0;

    if (version !== currentVersion) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Conflito de versão', currentVersion });
    }

    const normalizedData = normalizeStateData(data) ?? { projects: [] };
    const nextVersion = currentVersion + 1;
    const nextState = { ...normalizedData, version: nextVersion };

    const insertEvent = await client.query(
      'INSERT INTO brickflow_events (client_request_id, data) VALUES ($1, $2) RETURNING id',
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
    res.json({ ack: true, change_id: insertEvent.rows[0].id, version: nextVersion });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      try {
        const { rows } = await query(
          'SELECT id FROM brickflow_events WHERE client_request_id = $1',
          [client_request_id]
        );
        if (rows.length > 0) {
          const { rows: stateRows } = await query(
            'SELECT version FROM brickflow_state WHERE id = 1'
          );
          const currentVersion = stateRows.length > 0 ? stateRows[0].version ?? 0 : 0;
          return res.json({ ack: true, change_id: rows[0].id, version: currentVersion });
        }
      } catch (lookupError) {
        console.error('Erro ao validar duplicidade:', lookupError);
      }
    }
    console.error('Erro ao salvar:', err);
    res.status(500).json({ error: 'Erro ao salvar dados' });
  } finally {
    client.release();
  }
});

// Rota para listar eventos com ordenação garantida no backend
app.get('/api/projects/events', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, client_request_id, data, created_at FROM brickflow_events ORDER BY created_at ASC, id ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar eventos:', err);
    if (err.code === '42P01') {
      await initDB();
      res.json([]);
    } else {
      res.status(500).json({ error: 'Erro interno ao buscar eventos' });
    }
  }
});

app.get('/api/backups', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, snapshot, kind, source, created_at FROM brickflow_backups ORDER BY created_at DESC, id DESC'
    );
    const backups = rows.map(row => ({
      ...row,
      snapshot: normalizeStateData(row.snapshot)
    }));
    res.json(backups);
  } catch (err) {
    console.error('Erro ao listar backups:', err);
    if (err.code === '42P01') {
      await initDB();
      res.json([]);
    } else {
      res.status(500).json({ error: 'Erro interno ao buscar backups' });
    }
  }
});

app.post('/api/backups/restore', async (req, res) => {
  const { backupId, userId } = req.body;

  if (!backupId) {
    return res.status(400).json({ error: 'Backup ID é obrigatório' });
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');
    const backupResult = await client.query(
      'SELECT snapshot FROM brickflow_backups WHERE id = $1',
      [backupId]
    );

    if (backupResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Backup não encontrado' });
    }

    const stateResult = await client.query(
      'SELECT version FROM brickflow_state WHERE id = 1 FOR UPDATE'
    );
    const currentVersion = stateResult.rows.length > 0 ? stateResult.rows[0].version ?? 0 : 0;
    const nextVersion = currentVersion + 1;
    const normalizedSnapshot = normalizeStateData(backupResult.rows[0].snapshot) ?? { projects: [] };
    const updatedSnapshot = { ...normalizedSnapshot, version: nextVersion };

    await client.query(
      `INSERT INTO brickflow_state (id, data, updated_at, version)
       VALUES (1, $1, CURRENT_TIMESTAMP, $2)
       ON CONFLICT (id) DO UPDATE
       SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP, version = EXCLUDED.version`,
      [JSON.stringify(updatedSnapshot), nextVersion]
    );
    await client.query(
      'INSERT INTO brickflow_events (client_request_id, data) VALUES ($1, $2)',
      [createClientRequestId('backup-restore'), JSON.stringify(updatedSnapshot)]
    );
    await client.query('COMMIT');

    res.json({ success: true, data: updatedSnapshot });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao restaurar backup:', err);
    res.status(500).json({ error: 'Erro ao restaurar backup' });
  } finally {
    client.release();
  }
});

app.get('/api/projects/:id/history', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await query(
      'SELECT id, project_id, user_id, "timestamp", action_type, payload, snapshot_after FROM brickflow_events WHERE project_id = $1 ORDER BY "timestamp" DESC, id DESC',
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Erro ao carregar histórico:', err);
    res.status(500).json({ error: 'Erro ao carregar histórico' });
  }
});

app.post('/api/projects/:id/restore', async (req, res) => {
  const { id } = req.params;
  const { eventId, userId } = req.body;

  if (!eventId) {
    return res.status(400).json({ error: 'Event ID é obrigatório' });
  }

  try {
    const { rows: eventRows } = await query(
      'SELECT id, snapshot_after FROM brickflow_events WHERE id = $1 AND project_id = $2',
      [eventId, id]
    );

    if (eventRows.length === 0) {
      return res.status(404).json({ error: 'Evento não encontrado' });
    }

    const targetSnapshot = eventRows[0].snapshot_after;
    const { rows: stateRows } = await query('SELECT data, version FROM brickflow_state ORDER BY id DESC LIMIT 1');
    const latestState = stateRows.length > 0 ? stateRows[0].data : { projects: [] };
    const currentVersion = stateRows.length > 0 ? stateRows[0].version ?? 0 : 0;
    const projects = getProjectsFromState(latestState);
    let updatedProjects = [];

    if (targetSnapshot) {
      const existingIndex = projects.findIndex(project => project.id === id);
      if (existingIndex === -1) {
        updatedProjects = [...projects, targetSnapshot];
      } else {
        updatedProjects = projects.map(project => project.id === id ? targetSnapshot : project);
      }
    } else {
      updatedProjects = projects.filter(project => project.id !== id);
    }

    const updatedState = Array.isArray(latestState)
      ? updatedProjects
      : { ...latestState, projects: updatedProjects };
    const nextVersion = currentVersion + 1;
    const updatedStateWithVersion = { ...normalizeStateData(updatedState), version: nextVersion };

    await query(
      `INSERT INTO brickflow_state (id, data, updated_at, version)
       VALUES (1, $1, CURRENT_TIMESTAMP, $2)
       ON CONFLICT (id) DO UPDATE
       SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP, version = EXCLUDED.version`,
      [JSON.stringify(updatedStateWithVersion), nextVersion]
    );
    await query(
      'INSERT INTO brickflow_events (project_id, user_id, action_type, payload, snapshot_after) VALUES ($1, $2, $3, $4, $5)',
      [
        id,
        userId || 'system',
        'restore',
        JSON.stringify({ restoredFromEventId: eventId }),
        targetSnapshot ? JSON.stringify(targetSnapshot) : null
      ]
    );

    res.json({ success: true, data: updatedStateWithVersion });
  } catch (err) {
    console.error('Erro ao restaurar:', err);
    res.status(500).json({ error: 'Erro ao restaurar projeto' });
  }
});

// --- SERVIR FRONTEND EM PRODUÇÃO ---
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Inicializa o banco ANTES de abrir a porta do servidor
initDB().then(async () => {
  try {
    await ensureInitialBackup();
  } catch (err) {
    console.error('Erro ao criar backup inicial:', err);
  }
  scheduleBackups();
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT} (Limite: 50MB)`);
  });
});
