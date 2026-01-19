import { randomUUID } from 'crypto';
import { cache } from '../cache.js';

const SESSION_PREFIX = 'session:';
const SESSION_TTL = 2592000; // 30 dias em segundos

export const sessionService = {
  async create(userId) {
    try {
      const sessionId = randomUUID();
      const key = SESSION_PREFIX + sessionId;
      const data = JSON.stringify({ userId, createdAt: Date.now() });

      await cache.set(key, data, SESSION_TTL);
      console.log('✅ Sessão criada');
      return sessionId;
    } catch (err) {
      console.error('❌ Erro ao criar sessão:', err);
      throw err;
    }
  },

  async get(sessionId) {
    try {
      const key = SESSION_PREFIX + sessionId;
      const data = await cache.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error('❌ Erro ao buscar sessão:', err);
      return null;
    }
  },

  async delete(sessionId) {
    try {
      const key = SESSION_PREFIX + sessionId;
      await cache.del(key);
      console.log('🗑️ Sessão deletada');
    } catch (err) {
      console.error('❌ Erro ao deletar sessão:', err);
    }
  },

  async refresh(sessionId) {
    try {
      const key = SESSION_PREFIX + sessionId;
      const ttl = await cache.getTtl(key);
      if (ttl > 0) {
        await cache.set(key, await cache.get(key), SESSION_TTL);
        console.log('🔄 Sessão renovada');
      }
    } catch (err) {
      console.error('❌ Erro ao renovar sessão:', err);
    }
  }
};
