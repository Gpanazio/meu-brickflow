import { useEffect, useRef, useCallback, useState } from 'react';

export function useRealtime(channel, onMessage) {
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  const connectRef = useRef();

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = setTimeout(() => {
      if (connectRef.current) connectRef.current();
    }, 3000);
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const ws = new WebSocket(`${protocol}//${host}/ws`);

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
  }, [channel, onMessage, scheduleReconnect]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

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

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [channel, connect, disconnect]);

  return { isConnected, disconnect, reconnect: connect };
}
