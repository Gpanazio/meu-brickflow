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
