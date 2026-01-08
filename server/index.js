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
    res.status(500).json({ error: 'Erro interno ao buscar dados' });
  }
});

// Rota para salvar (Cria novo registro = Backup automático)
app.post('/api/projects', async (req, res) => {
  const { data } = req.body;

  // Trava de segurança no backend
  if (!data) {
    return res.status(400).json({ error: 'Dados inválidos' });
  }

  try {
    await query('INSERT INTO brickflow_state (data) VALUES ($1)', [JSON.stringify(data)]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao salvar:', err);
    res.status(500).json({ error: 'Erro ao salvar dados' });
  }
});

// --- FRONTEND (Produção) ---
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT} (Limite: 50MB)`);
});
