import { createClient } from 'redis';
import process from 'process';

// Usa 127.0.0.1 explícito para evitar problemas com IPv6 (::1) em alguns ambientes
const DEFAULT_REDIS_URL = 'redis://127.0.0.1:6379';
const redisUrl = process.env.REDIS_URL || DEFAULT_REDIS_URL;

const redis = createClient({
  url: redisUrl,
  socket: {
    keepAlive: 30000,
    reconnectStrategy: (retries) => {
      // Se falhar muito no localhost, assumimos que não tem Redis e paramos de tentar agressivamente
      if (retries > 3 && redisUrl === DEFAULT_REDIS_URL) {
        console.warn('⚠️ Redis local não encontrado. Alternando para cache em memória (Memory Store).');
        return new Error('Redis local não disponível');
      }
      return Math.min(retries * 100, 3000);
    }
  }
});

let isRedisReady = false;

// Interface de Cache em Memória (Fallback)
const memoryStore = new Map();

redis.on('ready', () => {
  isRedisReady = true;
  console.log('✅ Redis conectado e pronto!');
});

redis.on('end', () => {
  isRedisReady = false;
  console.log('⚠️ Redis desconectado. Usando fallback em memória.');
});

redis.on('error', (err) => {
  if (err.code === 'ECONNREFUSED' && redisUrl === DEFAULT_REDIS_URL) {
    return; // Silencia logs de conexão recusada local
  }
  console.error('❌ Redis Erro:', err.message);
});

// Tenta conectar, sem derrubar a app
await redis.connect().catch(err => {
  console.error('❌ Falha inicial ao conectar Redis:', err.message);
  if (!process.env.REDIS_URL) {
    console.warn('⚠️ REDIS_URL não definida. Ativando cache em memória para permitir funcionamento local.');
  }
});

export const cache = {
  async get(key) {
    if (isRedisReady) {
      try {
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
      } catch (err) {
        console.error(`❌ Redis GET erro [${key}]:`, err.message);
        // Fallback para memória em caso de erro no Redis? Opcional, mas seguro.
      }
    }

    // Memory Fallback
    const item = memoryStore.get(key);
    if (!item) return null;
    if (item.expiry && item.expiry < Date.now()) {
      memoryStore.delete(key);
      return null;
    }
    return item.value;
  },

  async set(key, value, ttl = 60) {
    if (isRedisReady) {
      try {
        await redis.set(key, JSON.stringify(value), { EX: ttl });
        return;
      } catch (err) {
        console.error(`❌ Redis SET erro [${key}]:`, err.message);
      }
    }

    // Memory Fallback
    // Armazena o valor original (não stringify novamente se já for obj, mas o protocolo espera JSON stringify/parse consistência)
    // O código original fazia JSON.stringify no set e JSON.parse no get.
    // Vamos manter essa consistência para o fallback se comportar igual.
    // Mas espere, na memória podemos guardar o objeto direto? 
    // Melhor serializar para garantir imutabilidade e comportamento igual ao Redis (clone).
    const expiry = Date.now() + (ttl * 1000);
    memoryStore.set(key, { value, expiry });
  },

  async del(key) {
    if (isRedisReady) {
      try {
        await redis.del(key);
      } catch (err) {
        console.error(`❌ Redis DEL erro [${key}]:`, err.message);
      }
    }
    // Memory Fallback
    memoryStore.delete(key);
    console.log(`🗑️ Cache DEL [${key}] (Memória/Redis)`);
  },

  async getTtl(key) {
    if (isRedisReady) {
      try {
        return await redis.ttl(key);
      } catch (err) {
        console.error(`❌ Redis TTL erro [${key}]:`, err.message);
      }
    }
    // Memory Fallback
    const item = memoryStore.get(key);
    if (!item) return -2; // -2 = key does not exist
    if (!item.expiry) return -1; // -1 = no expire
    const remaining = Math.ceil((item.expiry - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  },

  async invalidate(pattern) {
    if (isRedisReady) {
      try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(keys);
          console.log(`🗑️ Cache INVALIDATE [${pattern}]: ${keys.length} chaves removidas (Redis)`);
        }
        return;
      } catch (err) {
        console.error(`❌ Redis INVALIDATE erro [${pattern}]:`, err.message);
      }
    }

    // Memory Fallback - pattern matching simples (converte glob * para regex)
    // Suporta apenas sufixos/prefixos simples como 'users:*' ou '*'
    let regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    let count = 0;
    for (const k of memoryStore.keys()) {
      if (regex.test(k)) {
        memoryStore.delete(k);
        count++;
      }
    }
    if (count > 0) {
      console.log(`🗑️ Cache INVALIDATE [${pattern}]: ${count} chaves removidas (Memória)`);
    }
  },

  async ping() {
    if (isRedisReady) {
      try {
        await redis.ping();
        return { status: 'ok', provider: 'redis' };
      } catch (err) {
        return { status: 'error', message: err.message };
      }
    }
    return { status: 'ok', provider: 'memory-fallback' };
  },

  async disconnect() {
    if (redis.isOpen) {
      await redis.quit();
      console.log('✅ Redis desconectado');
    }
    memoryStore.clear();
  },

  redis
};
