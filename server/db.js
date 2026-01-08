import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

// Verificação de Segurança
if (!hasDatabaseUrl) {
  console.error("❌ ERRO CRÍTICO: DATABASE_URL não encontrada!");
  console.error("👉 Defina DATABASE_URL no .env (local) ou nas variáveis do Railway.");
} else {
  console.log("✅ DATABASE_URL detectada. Tentando conectar...");
}

// Detecta se é produção (Railway define NODE_ENV=production automaticamente)
const isProduction = process.env.NODE_ENV === 'production';

const pool = hasDatabaseUrl
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      // SSL ativo apenas em produção para segurança no Railway
      // Desativado localmente para evitar erros de conexão "self signed certificate"
      ssl: isProduction ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 5000
    })
  : null;

// Teste de conexão com log informativo
if (pool) {
  pool.connect()
    .then(client => {
      console.log(`✅ Conexão com o Banco de Dados estabelecida! (Modo: ${isProduction ? 'Produção/SSL' : 'Local/Sem SSL'})`);
      client.release();
    })
    .catch(err => {
      console.error("❌ Falha ao conectar no Banco:", err.message);
      if (!isProduction) {
          console.warn("💡 Dica: Verifique se seu Postgres local está rodando e se a URL está correta.");
      }
    });
}

export const query = (text, params) => {
  if (!pool) {
    const error = new Error('DATABASE_URL não configurada.');
    error.code = 'MISSING_DATABASE_URL';
    return Promise.reject(error);
  }
  return pool.query(text, params);
};
export const getClient = async () => {
  if (!pool) {
    const error = new Error('DATABASE_URL não configurada.');
    error.code = 'MISSING_DATABASE_URL';
    return Promise.reject(error);
  }
  return pool.connect();
};
