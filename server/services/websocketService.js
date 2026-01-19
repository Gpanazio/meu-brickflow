import { WebSocketServer } from 'ws';
import { eventService, CHANNELS } from './eventService.js';
import { parseCookies } from '../utils/helpers.js';
import { sessionService } from './sessionService.js';

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });

  const clients = new Set();

  wss.on('connection', (ws, req) => {
    // Session is already validated in upgrade
    console.log(`🔌 Novo cliente WebSocket conectado. User: ${req.user?.username || 'unknown'}`);
    clients.add(ws);

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'subscribe') {
          console.log(`📡 Cliente inscrito no canal: ${data.channel} (User: ${req.user.username})`);
          ws.channel = data.channel;
        }
      } catch (err) {
        console.error('Erro ao processar mensagem WS:', err);
      }
    });

    ws.on('close', () => {
      // console.log('🔌 Cliente WebSocket desconectado'); // Reduce log noise
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

  server.on('upgrade', async (request, socket, head) => {
    const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;

    if (pathname === '/ws') {
      try {
        const cookies = parseCookies(request.headers.cookie);
        const sessionId = cookies.bf_session;

        if (!sessionId) {
          console.warn('⛔ WS recusado: Sem cookie de sessão');
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        const session = await sessionService.get(sessionId);
        if (!session) {
          console.warn('⛔ WS recusado: Sessão inválida ou expirada');
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        // Attach user info to request for connection handler
        request.user = { username: session.userId };

        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      } catch (err) {
        console.error('⛔ WS Error durante auth:', err);
        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        socket.destroy();
      }
    } else {
      socket.destroy();
    }
  });

  console.log('✅ WebSocket Server inicializado em /ws (Authentication Required)');
  return wss;
}
