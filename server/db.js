import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

// --- CONFIGURAÇÃO DE SEGURANÇA E CONEXÃO ---
const connectionString = process.env.DATABASE_URL || '';
const isLocalConnection = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

// Se for conexão remota (Railway/Supabase), forçamos SSL.
// Se for local, desligamos para evitar erros de certificado.
const useSSL = hasDatabaseUrl && !isLocalConnection;

if (!hasDatabaseUrl) {
  console.error("❌ ERRO: DATABASE_URL não definida! O sistema funcionará apenas offline.");
} else {
  console.log(`✅ Configurando Banco de Dados...`);
  console.log(`   - Modo: ${isLocalConnection ? 'Local' : 'Remoto (Nuvem)'}`);
  console.log(`   - SSL: ${useSSL ? 'ATIVO' : 'INATIVO'}`);
}

const pool = hasDatabaseUrl
  ? new Pool({
      connectionString,
      ssl: useSSL ? { rejectUnauthorized: false } : false,
      
      // AUMENTADO PARA 60 SEGUNDOS
      // Bancos gratuitos do Railway podem levar até 30s para "acordar"
      connectionTimeoutMillis: 60000, 
      
      // Fecha conexões inativas após 30s para não lotar o banco
      idleTimeoutMillis: 30000,
      
      // Limite de conexões simultâneas (evita erro de "too many connections" no plano free)
      max: 10 
    })
  : null;

// --- TESTE DE CONEXÃO AO INICIAR ---
if (pool) {
  // Tenta conectar sem travar o boot do servidor
  (async () => {
    let retries = 3;
    while (retries > 0) {
      try {
        const client = await pool.connect();
        console.log('✅ CONEXÃO ESTABELECIDA COM SUCESSO!');
        const res = await client.query('SELECT NOW()');
        console.log(`   - Data do Servidor: ${res.rows[0].now}`);
        client.release();
        break;
      } catch (err) {
        retries--;
        console.error(`⚠️ Tentativa de conexão falhou (${3 - retries}/3): ${err.message}`);
        if (err.message.includes('timeout')) {
          console.log("⏳ O banco pode estar 'dormindo'. Aguardando 5s antes de tentar de novo...");
        }
        if (retries === 0) {
          console.error("❌ FALHA CRÍTICA: Não foi possível conectar ao banco após 3 tentativas.");
          console.error("👉 Verifique sua internet ou acesse o dashboard do Railway para ver se o serviço está ativo.");
        } else {
          await new Promise(res => setTimeout(res, 5000));
        }
      }
    }
  })();
}

export const query = (text, params) => {
  if (!pool) {
    // Retorna erro silencioso ou loga, mas não quebra a promessa se for opcional
    return Promise.reject(new Error('DATABASE_URL não configurada.'));
  }
  return pool.query(text, params);
};

export const getClient = async () => {
  if (!pool) {
    throw new Error('DATABASE_URL não configurada.');
  }
  return pool.connect();
};
