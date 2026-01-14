import { cache } from '../cache.js';

export const eventService = {
  async publish(channel, data) {
    try {
      await cache.redis?.publish(channel, JSON.stringify(data));
      console.log(`📢 PUBLISH [${channel}]:`, data);
    } catch (err) {
      console.error(`❌ Erro ao publicar evento [${channel}]:`, err);
    }
  },

  subscribe(channel, callback) {
    const subscriber = cache.redis?.duplicate();

    if (!subscriber) {
      console.error('❌ Cliente Redis não disponível para subscribe');
      return () => {};
    }

    try {
      subscriber.subscribe(channel, (message) => {
        try {
          const data = JSON.parse(message);
          callback(data);
        } catch (err) {
          console.error(`❌ Erro ao parse evento [${channel}]:`, err);
        }
      });

      console.log(`✅ SUBSCRIBED [${channel}]`);
      return () => subscriber.unsubscribe(channel);
    } catch (err) {
      console.error(`❌ Erro ao inscrever no canal [${channel}]:`, err);
      return () => {};
    }
  }
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
  SUBPROJECT_UPDATED: 'brickflow:subproject:updated'
};
