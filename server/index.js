import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Aumentamos o limite para 50mb para aceitar seus uploads de arquivos (base64)
app.use(express.json({ limit: '50mb' }));
app.use(cors());

// --- API: Carregar Dados ---
app.get('/api/projects', async (req, res) => {
  try {
    // Pega o último backup salvo
    const { rows } = await query('SELECT data FROM brickflow_state ORDER BY id DESC LIMIT 1');
    if (rows.length > 0) {
      res.json(rows[0].data);
    } else {
      res.json([]); // Começa vazio se não tiver nada
    }
  } catch (err) {
    console.error('Erro ao buscar projetos:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// --- API: Salvar Dados (COM TRAVA DE SEGURANÇA) ---
app.post('/api/projects', async (req, res) => {
  const { data } = req.body;

  // TRAVA DE SEGURANÇA DO BACKEND
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.warn("Tentativa de salvar dados vazios bloqueada pelo servidor.");
    return res.status(400).json({ error: 'SEGURANÇA: O servidor recusou salvar uma lista vazia.' });
  }

  try {
    // Salva uma NOVA linha (histórico eterno = backup infinito)
    await query('INSERT INTO brickflow_state (data) VALUES ($1)', [JSON.stringify(data)]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao salvar:', err);
    res.status(500).json({ error: 'Erro ao salvar' });
  }
});

// --- SERVIR O FRONTEND (React) ---
// Qualquer rota que não seja /api, entrega o site
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 BrickFlow Server rodando na porta ${PORT}`);
});
