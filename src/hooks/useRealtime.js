import { useEffect, useRef, useCallback, useState } from 'react';

export function useRealtime(channel, onMessage) {
    const wsRef = useRef(null);
    const reconnectTimerRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const [isConnected, setIsConnected] = useState(false);

    const connectRef = useRef();

    const scheduleReconnect = useCallback(() => {
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);

        // Exponential backoff: 3s, 6s, 12s, 24s, max 30s
        const attempt = reconnectAttemptsRef.current;
        const delay = Math.min(3000 * Math.pow(2, attempt), 30000);

        console.log(`⏳ Reconectando em ${delay}ms (tentativa ${attempt + 1})...`);

        reconnectTimerRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            if (connectRef.current) connectRef.current();
        }, delay);
    }, []);

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
        reconnectAttemptsRef.current = 0;
    }, []);

    useEffect(() => {
        connect();

        return () => {
            disconnect();
        };
    }, [channel, connect, disconnect]);

    return { isConnected, disconnect, reconnect: connect };
}
