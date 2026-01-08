import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
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
    console.log('✅ Banco de dados inicializado: Tabela "brickflow_state" verificada.');
  } catch (err) {
    console.error('❌ Erro crítico ao criar tabela:', err);
  }
};

// --- API ROUTES ---

// Rota para buscar o estado atual
app.get('/api/projects', async (req, res) => {
  try {
    const { rows } = await query('SELECT data FROM brickflow_state WHERE id = 1');
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
  const { data, client_request_id } = req.body;

  if (!data || !client_request_id) {
    return res.status(400).json({ error: 'Dados inválidos' });
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');
    const insertEvent = await client.query(
      'INSERT INTO brickflow_events (client_request_id, data) VALUES ($1, $2) RETURNING id',
      [client_request_id, JSON.stringify(data)]
    );
    await client.query(
      `INSERT INTO brickflow_state (id, data, updated_at)
       VALUES (1, $1, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE
       SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP`,
      [JSON.stringify(data)]
    );
    await client.query('COMMIT');
    res.json({ ack: true, change_id: insertEvent.rows[0].id });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      try {
        const { rows } = await query(
          'SELECT id FROM brickflow_events WHERE client_request_id = $1',
          [client_request_id]
        );
        if (rows.length > 0) {
          return res.json({ ack: true, change_id: rows[0].id });
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
