import { useEffect, useRef, useCallback, useState } from 'react';

const MAX_RECONNECT_ATTEMPTS = 5;

export function useRealtime(channel, onMessage) {
    const wsRef = useRef(null);
    const reconnectTimerRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const shouldReconnectRef = useRef(true); // Flag to control reconnection
    const [isConnected, setIsConnected] = useState(false);

    const connectRef = useRef();

    const scheduleReconnect = useCallback(() => {
        if (!shouldReconnectRef.current) return; // Don't reconnect if flag is false
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);

        const attempt = reconnectAttemptsRef.current;
        if (attempt >= MAX_RECONNECT_ATTEMPTS) {
            console.warn(`⚠️ WebSocket: máximo de tentativas atingido para ${channel}. Reconexão desabilitada.`);
            return;
        }

        // Exponential backoff: 3s, 6s, 12s, 24s, max 30s
        const delay = Math.min(3000 * Math.pow(2, attempt), 30000);

        reconnectTimerRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            if (connectRef.current) connectRef.current();
        }, delay);
    }, [channel]);

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Use location.hostname to avoid including the port in development
        const host = window.location.hostname;
        const port = window.location.port ? `:${window.location.port}` : '';
        const wsUrl = `${protocol}//${host}${port}/ws`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log(`✅ WebSocket conectado: ${channel}`);
            ws.send(JSON.stringify({ type: 'subscribe', channel }));
            setIsConnected(true);
            reconnectAttemptsRef.current = 0; // Reset backoff on successful connection
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
            scheduleReconnect(); // Only onclose schedules reconnect
        };

        ws.onerror = (err) => {
            console.error('❌ Erro WebSocket:', err);
            // Don't schedule reconnect here - onclose will handle it
        };

        wsRef.current = ws;
    }, [channel, onMessage, scheduleReconnect]);

    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    const disconnect = useCallback(() => {
        shouldReconnectRef.current = false; // Prevent reconnection after unmount
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
        reconnectAttemptsRef.current = 0;
    }, []);

    useEffect(() => {
        shouldReconnectRef.current = true; // Enable reconnection on mount
        connect();

        return () => {
            disconnect();
        };
    }, [channel, connect, disconnect]);

    return { isConnected, disconnect, reconnect: connect };
}
