import pg from 'pg';
import dotenv from 'dotenv';
import process from 'process';

// Carrega .env apenas se existir (local)
dotenv.config();

const { Pool } = pg;

// Pega a URL do ambiente
// - `DATABASE_URL` (padrão Railway)
// - fallback opcional para quando a URL interna não alcança o DB: `DATABASE_URL_FALLBACK`
const primaryConnectionString = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL || '';
const fallbackConnectionString =
  process.env.DATABASE_URL_FALLBACK ||
  process.env.DATABASE_PUBLIC_URL ||
  process.env.DATABASE_URL_PUBLIC ||
  '';

let activeConnectionString = primaryConnectionString || fallbackConnectionString || '';
export const hasDatabaseUrl = Boolean(activeConnectionString);

const createMissingDatabaseUrlError = () => {
  const error = new Error('DATABASE_URL não configurada (ou fallback ausente).');
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
const parseHostname = (connStr) => {
  try {
    const url = new URL(connStr);
    return url.hostname || '';
  } catch {
    return '';
  }
};

const describeConnection = (connStr) => {
  const hostname = parseHostname(connStr);
  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    connStr.includes('localhost') ||
    connStr.includes('127.0.0.1');

  const isRailwayInternal = hostname.endsWith('railway.internal') || connStr.includes('railway.internal');
  const isRailwayProxy = hostname.endsWith('proxy.rlwy.net') || connStr.includes('proxy.rlwy.net');

  const sslSetting = normalizeSslSetting(process.env.DATABASE_SSL);
  const inferredUseSSL = Boolean(connStr) && !isLocal && !isRailwayInternal;
  const useSSL = sslSetting === 'true' ? true : sslSetting === 'false' ? false : inferredUseSSL;

  const maskedUrl = connStr ? connStr.replace(/:([^:@]+)@/, ':****@') : '';
  const envLabel = isLocal
    ? 'Local'
    : isRailwayInternal
      ? 'Railway (Rede Interna)'
      : isRailwayProxy
        ? 'Railway (Proxy Público)'
        : 'Remoto (Rede Pública)';

  return { hostname, isLocal, isRailwayInternal, isRailwayProxy, sslSetting, useSSL, maskedUrl, envLabel };
};

if (!hasDatabaseUrl) {
  console.error('❌ ERRO CRÍTICO: DATABASE_URL não encontrada! O servidor não vai conectar.');
} else {
  const info = describeConnection(activeConnectionString);
  console.log('✅ Inicializando Banco de Dados...');
  console.log(`   - URL: ${info.maskedUrl}`);
  console.log(`   - Host: ${info.hostname || 'desconhecido'}`);
  console.log(`   - Ambiente: ${info.envLabel}`);
  console.log(`   - SSL: ${info.useSSL ? 'ATIVO' : 'INATIVO'}${info.sslSetting !== 'auto' ? ' (override DATABASE_SSL)' : ''}`);
}

let pool = null;

const createPool = (connStr) => {
  const info = describeConnection(connStr);
   return {
     info,
     pool: new Pool({
       connectionString: connStr,
       ssl: info.useSSL ? { rejectUnauthorized: false } : false,
       connectionTimeoutMillis: 30000,
       idleTimeoutMillis: 60000,
       max: 15,
       min: 3,
       application_name: 'brickflow-prod',
       log: ['error', 'slow']
     })
   };
};

const shouldFallback = (err) => {
  const msg = String(err?.message || '');
  return /timeout/i.test(msg) || err?.code === 'ETIMEDOUT';
};

if (hasDatabaseUrl) {
  const primary = activeConnectionString;
  const primaryHandle = createPool(primary);
  pool = primaryHandle.pool;

  // Teste rápido de conexão (e fallback opcional)
  pool
    .connect()
    .then((client) => {
      console.log('✅ Conexão com o Banco estabelecida com SUCESSO!');
      client.release();
    })
    .catch(async (err) => {
      console.error('❌ FALHA AO CONECTAR:', err.message);

      const canFallback = Boolean(fallbackConnectionString) && fallbackConnectionString !== primaryConnectionString;
      const usingInternal = primaryHandle.info.isRailwayInternal;

      if (canFallback && usingInternal && shouldFallback(err)) {
        try {
          console.warn('⚠️ Timeout no DB interno. Tentando fallback (URL pública)...');
          await pool.end().catch(() => {});

          activeConnectionString = fallbackConnectionString;
          const fallbackHandle = createPool(activeConnectionString);
          pool = fallbackHandle.pool;

          console.log('✅ Reconfigurando conexão:');
          console.log(`   - URL: ${fallbackHandle.info.maskedUrl}`);
          console.log(`   - Host: ${fallbackHandle.info.hostname || 'desconhecido'}`);
          console.log(`   - Ambiente: ${fallbackHandle.info.envLabel}`);
          console.log(`   - SSL: ${fallbackHandle.info.useSSL ? 'ATIVO' : 'INATIVO'}`);

          const client = await pool.connect();
          console.log('✅ Conexão com o fallback estabelecida com SUCESSO!');
          client.release();
        } catch (fallbackErr) {
          console.error('❌ FALHA AO CONECTAR NO FALLBACK:', fallbackErr.message);
        }
      }
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
