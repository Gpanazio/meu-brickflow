import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './db.js';

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
        id SERIAL PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS brickflow_events (
        id SERIAL PRIMARY KEY,
        project_id TEXT NOT NULL,
        user_id TEXT,
        "timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        action_type TEXT NOT NULL,
        payload JSONB,
        snapshot_after JSONB
      );
    `);
    console.log('✅ Banco de dados inicializado: Tabela "brickflow_state" verificada.');
  } catch (err) {
    console.error('❌ Erro crítico ao criar tabela:', err);
  }
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

// --- API ROUTES ---

// Rota para buscar o estado atual
app.get('/api/projects', async (req, res) => {
  try {
    const { rows } = await query('SELECT data FROM brickflow_state ORDER BY id DESC LIMIT 1');
    if (rows.length > 0) {
      res.json(rows[0].data);
    } else {
      // Retorna null para o front saber que é a primeira vez e inicializar
      res.json(null);
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

// Rota para salvar (Cria novo registro = Backup automático)
app.post('/api/projects', async (req, res) => {
  const { data, userId } = req.body;

  if (!data) {
    return res.status(400).json({ error: 'Dados inválidos' });
  }

  try {
    const { rows } = await query('SELECT data FROM brickflow_state ORDER BY id DESC LIMIT 1');
    const previousState = rows.length > 0 ? rows[0].data : null;
    const changes = getProjectChanges(previousState, data);

    await query('INSERT INTO brickflow_state (data) VALUES ($1)', [JSON.stringify(data)]);

    if (changes.length > 0) {
      await Promise.all(
        changes.map(change => query(
          'INSERT INTO brickflow_events (project_id, user_id, action_type, payload, snapshot_after) VALUES ($1, $2, $3, $4, $5)',
          [
            change.projectId,
            userId || 'system',
            change.actionType,
            change.payload ? JSON.stringify(change.payload) : null,
            change.snapshotAfter ? JSON.stringify(change.snapshotAfter) : null
          ]
        ))
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao salvar:', err);
    res.status(500).json({ error: 'Erro ao salvar dados' });
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
    const { rows: stateRows } = await query('SELECT data FROM brickflow_state ORDER BY id DESC LIMIT 1');
    const latestState = stateRows.length > 0 ? stateRows[0].data : { projects: [] };
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

    await query('INSERT INTO brickflow_state (data) VALUES ($1)', [JSON.stringify(updatedState)]);
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

    res.json({ success: true, data: updatedState });
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
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT} (Limite: 50MB)`);
  });
});
