import { useEffect, useRef, useCallback, useState } from 'react';

export function useRealtime(channel, onMessage) {
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`ws://localhost:8080/ws`);

    ws.onopen = () => {
      console.log(`✅ WebSocket conectado: ${channel}`);
      ws.send(JSON.stringify({ type: 'subscribe', channel }));
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.channel === channel) {
          onMessage(data.payload);
        }
      } catch (err) {
        console.error('Erro ao parse mensagem WebSocket:', err);
      }
    };

    ws.onclose = () => {
      console.log(`❌ WebSocket desconectado: ${channel}`);
      wsRef.current = null;
      setIsConnected(false);
      scheduleReconnect();
    };

    ws.onerror = (err) => {
      console.error('❌ Erro WebSocket:', err);
      wsRef.current = null;
      setIsConnected(false);
      scheduleReconnect();
    };

    wsRef.current = ws;
  }, [channel]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = setTimeout(() => {
      if (!wsRef.current) {
        connect();
      }
    }, 3000);
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [channel, connect, disconnect]);

  return { isConnected, disconnect, reconnect: connect };
}
