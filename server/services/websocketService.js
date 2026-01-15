import { WebSocketServer } from 'ws';
import { eventService, CHANNELS } from './eventService.js';

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });

  const clients = new Set();

  wss.on('connection', (ws) => {
    console.log('🔌 Novo cliente WebSocket conectado');
    clients.add(ws);

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'subscribe') {
          console.log(`📡 Cliente inscrito no canal: ${data.channel}`);
          ws.channel = data.channel;
        }
      } catch (err) {
        console.error('Erro ao processar mensagem WS:', err);
      }
    });

    ws.on('close', () => {
      console.log('🔌 Cliente WebSocket desconectado');
      clients.delete(ws);
    });
  });

  // Integrar com Redis events
  eventService.subscribe(CHANNELS.PROJECT_UPDATED, (payload) => {
    broadcast(CHANNELS.PROJECT_UPDATED, payload);
  });

  function broadcast(channel, payload) {
    const message = JSON.stringify({ channel, payload });
    clients.forEach((client) => {
      if (client.readyState === 1 && (!client.channel || client.channel === channel)) {
        client.send(message);
      }
    });
  }

  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;

    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  console.log('✅ WebSocket Server inicializado em /ws');
  return wss;
}
