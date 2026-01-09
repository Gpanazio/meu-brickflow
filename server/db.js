import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const publicDatabaseUrl = process.env.DATABASE_PUBLIC_URL;
const privateDatabaseUrl = process.env.DATABASE_URL;

export const hasDatabaseUrl = Boolean(publicDatabaseUrl || privateDatabaseUrl);

// --- CONFIGURAÇÃO DE SEGURANÇA E CONEXÃO ---
const connectionString = publicDatabaseUrl || privateDatabaseUrl || '';
// Verifica se é localhost OU se é IP local (192.168...)
const isLocalConnection = 
  connectionString.includes('localhost') || 
  connectionString.includes('127.0.0.1') ||
  connectionString.includes('@postgres:5432'); // Caso docker interno

const isRailwayInternal = connectionString.includes('.railway.internal');

// Se for conexão remota (Railway/Supabase), forçamos SSL.
const useSSL = hasDatabaseUrl && !isLocalConnection && !isRailwayInternal;

if (!hasDatabaseUrl) {
  console.error("❌ ERRO: DATABASE_URL não definida!");
} else {
  // Mascara a senha para logar a URL e ajudar no debug
  const maskedUrl = connectionString.replace(/:([^:@]+)@/, ':****@');
  const sourceLabel = publicDatabaseUrl ? 'DATABASE_PUBLIC_URL' : 'DATABASE_URL';
  console.log(`✅ Configurando Banco de Dados...`);
  console.log(`   - Fonte: ${sourceLabel}`);
  console.log(`   - URL: ${maskedUrl}`);
  console.log(`   - Modo: ${isLocalConnection ? 'Local' : isRailwayInternal ? 'Railway Internal' : 'Remoto (Nuvem)'}`);
  console.log(`   - SSL: ${useSSL ? 'ATIVO' : 'INATIVO'}`);
}

const pool = hasDatabaseUrl
  ? new Pool({
      connectionString,
      ssl: useSSL ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 30000, // 30s
      idleTimeoutMillis: 30000,
      max: 10,
      // Configuração importante para evitar queda em proxies (Railway Public URL)
      keepAlive: true 
    })
  : null;

// --- TESTE DE CONEXÃO AO INICIAR ---
if (pool) {
  (async () => {
    // Tenta até 5 vezes com espera progressiva
    for (let i = 1; i <= 5; i++) {
      try {
        console.log(`🔄 Tentativa de conexão ${i}/5...`);
        const client = await pool.connect();
        const res = await client.query('SELECT NOW()');
        console.log(`✅ CONEXÃO SUCESSO! Data do DB: ${res.rows[0].now}`);
        client.release();
        return; // Sai da função se der certo
      } catch (err) {
        console.error(`⚠️ Falha na tentativa ${i}: ${err.message}`);
        if (i < 5) {
          const waitTime = i * 2000; // 2s, 4s, 6s...
          console.log(`⏳ Aguardando ${waitTime/1000}s...`);
          await new Promise(res => setTimeout(res, waitTime));
        } else {
          console.error("❌ FALHA CRÍTICA: Verifique se DATABASE_PUBLIC_URL (ou DATABASE_URL) usa a 'Public Networking' do Railway.");
        }
      }
    }
  })();
}

export const query = (text, params) => {
  if (!pool) return Promise.reject(new Error('DATABASE_URL não configurada.'));
  return pool.query(text, params);
};

export const getClient = async () => {
  if (!pool) throw new Error('DATABASE_URL não configurada.');
  return pool.connect();
};
