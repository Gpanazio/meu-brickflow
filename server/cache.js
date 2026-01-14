import { createClient } from 'redis';
import process from 'process';

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: { keepAlive: 30000 }
});

await redis.connect().catch(err => {
  console.error('❌ Erro ao conectar Redis:', err);
});

export const cache = {
  async get(key) {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error(`❌ Erro ao ler cache [${key}]:`, err);
      return null;
    }
  },

  async set(key, value, ttl = 60) {
    try {
      await redis.set(key, JSON.stringify(value), { EX: ttl });
      console.log(`✅ Cache SET [${key}]: TTL ${ttl}s`);
    } catch (err) {
      console.error(`❌ Erro ao escrever cache [${key}]:`, err);
    }
  },

  async del(key) {
    try {
      await redis.del(key);
      console.log(`🗑️ Cache DEL [${key}]`);
    } catch (err) {
      console.error(`❌ Erro ao deletar cache [${key}]:`, err);
    }
  },

  async invalidate(pattern) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
        console.log(`🗑️ Cache INVALIDATE [${pattern}]: ${keys.length} chaves removidas`);
      }
    } catch (err) {
      console.error(`❌ Erro ao invalidar cache [${pattern}]:`, err);
    }
  },

  async ping() {
    try {
      await redis.ping();
      return { status: 'ok' };
    } catch (err) {
      console.error('❌ Erro ao fazer ping Redis:', err);
      return { status: 'error', message: err.message };
    }
  },

  async disconnect() {
    try {
      await redis.quit();
      console.log('✅ Redis desconectado');
    } catch (err) {
      console.error('❌ Erro ao desconectar Redis:', err);
    }
  }
};
