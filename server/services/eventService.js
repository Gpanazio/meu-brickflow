import { cache } from '../cache.js';
import { EventEmitter } from 'events';

// In-memory fallback for when Redis is not available
const localEmitter = new EventEmitter();
localEmitter.setMaxListeners(100); // Increase limit for many subscribers

export const eventService = {
  async publish(channel, data) {
    try {
      // Try Redis first
      if (cache.redis?.isReady) {
        await cache.redis.publish(channel, JSON.stringify(data));
        console.log(`📢 PUBLISH [${channel}] (Redis):`, data);
      } else {
        // Fallback to local emitter
        localEmitter.emit(channel, data);
        console.log(`📢 PUBLISH [${channel}] (Local):`, data);
      }
    } catch (err) {
      console.error(`❌ Erro ao publicar evento [${channel}]:`, err);
      // Try local emitter as last resort
      localEmitter.emit(channel, data);
    }
  },

  subscribe(channel, callback) {
    // Try Redis first
    if (cache.redis?.isReady) {
      const subscriber = cache.redis.duplicate();

      if (!subscriber) {
        console.warn('⚠️ Redis subscriber não disponível, usando fallback local');
        localEmitter.on(channel, callback);
        console.log(`✅ SUBSCRIBED [${channel}] (Local Fallback)`);
        return () => localEmitter.off(channel, callback);
      }

      try {
        subscriber.connect().then(() => {
          subscriber.subscribe(channel, (message) => {
            try {
              const data = JSON.parse(message);
              callback(data);
            } catch (err) {
              console.error(`❌ Erro ao parse evento [${channel}]:`, err);
            }
          });
          console.log(`✅ SUBSCRIBED [${channel}] (Redis)`);
        }).catch(err => {
          console.warn(`⚠️ Falha ao conectar subscriber Redis, usando local: ${err.message}`);
          localEmitter.on(channel, callback);
        });

        return () => {
          subscriber.unsubscribe(channel).catch(() => { });
          subscriber.quit().catch(() => { });
        };
      } catch (err) {
        console.error(`❌ Erro ao inscrever no canal [${channel}]:`, err);
        localEmitter.on(channel, callback);
        return () => localEmitter.off(channel, callback);
      }
    }

    // Use local emitter if Redis not available
    localEmitter.on(channel, callback);
    console.log(`✅ SUBSCRIBED [${channel}] (Local - Redis não disponível)`);
    return () => localEmitter.off(channel, callback);
  },

  // Expose local emitter for direct use in websocket service
  localEmitter
};

export const CHANNELS = {
  PROJECT_UPDATED: 'brickflow:project:updated',
  TASK_CREATED: 'brickflow:task:created',
  TASK_COMPLETED: 'brickflow:task:completed',
  TASK_DELETED: 'brickflow:task:deleted',
  USER_JOINED: 'brickflow:user:joined',
  USER_LOGGED_IN: 'brickflow:user:login',
  USER_LOGGED_OUT: 'brickflow:user:logout',
  PROJECT_CREATED: 'brickflow:project:created',
  PROJECT_DELETED: 'brickflow:project:deleted',
  SUBPROJECT_CREATED: 'brickflow:subproject:created',
  SUBPROJECT_UPDATED: 'brickflow:subproject:updated',
  SUBPROJECT_DELETED: 'brickflow:subproject:deleted',
  TASK_UPDATED: 'brickflow:task:updated',
  LIST_CREATED: 'brickflow:list:created',
  LIST_UPDATED: 'brickflow:list:updated',
  LIST_DELETED: 'brickflow:list:deleted'
};

