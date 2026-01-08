import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

// Verifica se é uma conexão local ou remota para ajustar o SSL
const connectionString = process.env.DATABASE_URL || '';
const isLocalConnection = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
// Se não for local (ou seja, é Railway/Supabase/etc), força SSL
const useSSL = hasDatabaseUrl && !isLocalConnection;

if (!hasDatabaseUrl) {
  console.error("❌ ERRO CRÍTICO: DATABASE_URL não encontrada!");
} else {
  console.log(`✅ DATABASE_URL detectada. Modo SSL: ${useSSL ? 'ATIVO' : 'INATIVO'}`);
}

const pool = hasDatabaseUrl
  ? new Pool({
      connectionString,
      // Força SSL se for remoto, mesmo rodando localmente
      ssl: useSSL ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000 // Aumentado para evitar timeouts em conexões lentas
    })
  : null;

// Teste de conexão ao iniciar
if (pool) {
  pool.connect()
    .then(client => {
      console.log('✅ Conexão com o Banco de Dados estabelecida com sucesso!');
      client.release();
    })
    .catch(err => {
      console.error("❌ FALHA CRÍTICA NO BANCO:", err.message);
      console.error("💡 Dica: Se estiver usando Railway, verifique se a internet está ok.");
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
