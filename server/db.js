import pg from 'pg';
import dotenv from 'dotenv';

// Carrega .env apenas se existir (local)
dotenv.config();

const { Pool } = pg;

// Pega a URL do ambiente
const connectionString = process.env.DATABASE_URL || '';
export const hasDatabaseUrl = Boolean(connectionString);

const createMissingDatabaseUrlError = () => {
  const error = new Error('DATABASE_URL não configurada.');
  error.code = 'MISSING_DATABASE_URL';
  return error;
};

const normalizeSslSetting = (value) => {
  if (!value) return 'auto';
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on', 'enabled'].includes(normalized)) return 'true';
  if (['0', 'false', 'no', 'off', 'disabled'].includes(normalized)) return 'false';
  return 'auto';
};

// --- DETECÇÃO DE AMBIENTE ---
// 1. Localhost: Rodando no seu PC
const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
// 2. Railway Internal: Rodando DENTRO do servidor do Railway
const isRailwayInternal = connectionString.includes('railway.internal');

// Permite override via env para casos onde a detecção falha.
// Valores aceitos: true/false/auto
const sslSetting = normalizeSslSetting(process.env.DATABASE_SSL);

// Lógica de SSL:
// ATENÇÃO: Nunca usar SSL na rede interna do Railway (pode causar timeout)
// Usar SSL apenas se for acesso externo (ex: do seu PC para o Railway)
const inferredUseSSL = hasDatabaseUrl && !isLocal && !isRailwayInternal;
const useSSL = sslSetting === 'true' ? true : sslSetting === 'false' ? false : inferredUseSSL;

if (!hasDatabaseUrl) {
  console.error('❌ ERRO CRÍTICO: DATABASE_URL não encontrada! O servidor não vai conectar.');
} else {
  // Mascara a senha para logar com segurança
  const maskedUrl = connectionString.replace(/:([^:@]+)@/, ':****@');
  console.log('✅ Inicializando Banco de Dados...');
  console.log(`   - URL: ${maskedUrl}`);
  console.log(
    `   - Ambiente: ${isLocal ? 'Local' : isRailwayInternal ? 'Railway (Rede Interna)' : 'Remoto (Rede Pública)'}`
  );
  console.log(`   - SSL: ${useSSL ? 'ATIVO' : 'INATIVO'}${sslSetting !== 'auto' ? ' (override DATABASE_SSL)' : ''}`);
}

let pool = null;

if (hasDatabaseUrl) {
  pool = new Pool({
    connectionString,
    ssl: useSSL ? { rejectUnauthorized: false } : false,
    // Timeouts ajustados para resiliência
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 20
  });

  // Teste rápido de conexão
  pool
    .connect()
    .then((client) => {
      console.log('✅ Conexão com o Banco estabelecida com SUCESSO!');
      client.release();
    })
    .catch((err) => {
      console.error('❌ FALHA AO CONECTAR:', err.message);
    });
}

export const query = (text, params) => {
  if (!pool) return Promise.reject(createMissingDatabaseUrlError());
  return pool.query(text, params);
};

export const getClient = async () => {
  if (!pool) throw createMissingDatabaseUrlError();
  return pool.connect();
};
