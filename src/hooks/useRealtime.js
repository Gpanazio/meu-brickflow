import { useEffect, useRef, useCallback, useState } from 'react';

const MAX_RECONNECT_ATTEMPTS = 5;

// =====================================================
// SINGLETON WEBSOCKET MANAGER
// All hooks share a single WebSocket connection
// =====================================================

class WebSocketManager {
    constructor() {
        this.ws = null;
        this.listeners = new Map(); // channel -> Set of callbacks
        this.reconnectAttempts = 0;
        this.reconnectTimer = null;
        this.isConnecting = false;
        this.shouldReconnect = true;
    }

    connect() {
        if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
            return;
        }

        this.isConnecting = true;
        this.shouldReconnect = true;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const port = window.location.port ? `:${window.location.port}` : '';
        const wsUrl = `${protocol}//${host}${port}/ws`;

        console.log(`🔌 WebSocket: Conectando a ${wsUrl}...`);

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('✅ WebSocket: Conexão estabelecida');
                this.isConnecting = false;
                this.reconnectAttempts = 0;

                // Resubscribe all active channels
                this.listeners.forEach((_, channel) => {
                    this.ws.send(JSON.stringify({ type: 'subscribe', channel }));
                    console.log(`📡 WebSocket: Resubscrito em ${channel}`);
                });
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const callbacks = this.listeners.get(data.channel);
                    if (callbacks) {
                        callbacks.forEach(cb => cb(data.payload));
                    }
                } catch (err) {
                    console.error('❌ WebSocket: Erro ao parsear mensagem:', err);
                }
            };

            this.ws.onclose = () => {
                console.log('❌ WebSocket: Conexão fechada');
                this.ws = null;
                this.isConnecting = false;

                if (this.shouldReconnect && this.listeners.size > 0) {
                    this.scheduleReconnect();
                }
            };

            this.ws.onerror = (err) => {
                console.error('❌ WebSocket: Erro:', err);
                this.isConnecting = false;
                // onclose will handle reconnection
            };
        } catch (err) {
            console.error('❌ WebSocket: Falha ao criar conexão:', err);
            this.isConnecting = false;
            this.scheduleReconnect();
        }
    }

    scheduleReconnect() {
        if (!this.shouldReconnect) return;
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

        if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.warn('⚠️ WebSocket: Máximo de tentativas atingido. Reconexão desabilitada.');
            return;
        }

        // Exponential backoff: 3s, 6s, 12s, 24s, max 30s
        const delay = Math.min(3000 * Math.pow(2, this.reconnectAttempts), 30000);
        console.log(`🔄 WebSocket: Reconectando em ${delay / 1000}s (tentativa ${this.reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);

        this.reconnectTimer = setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
        }, delay);
    }

    subscribe(channel, callback) {
        if (!this.listeners.has(channel)) {
            this.listeners.set(channel, new Set());
        }
        this.listeners.get(channel).add(callback);

        // Connect if not already connected
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.connect();
        } else {
            // Already connected, just subscribe to new channel
            this.ws.send(JSON.stringify({ type: 'subscribe', channel }));
            console.log(`📡 WebSocket: Inscrito em ${channel}`);
        }

        // Return unsubscribe function
        return () => {
            const callbacks = this.listeners.get(channel);
            if (callbacks) {
                callbacks.delete(callback);
                if (callbacks.size === 0) {
                    this.listeners.delete(channel);
                }
            }

            // Close connection if no more listeners
            if (this.listeners.size === 0 && this.ws) {
                console.log('🔌 WebSocket: Sem listeners ativos, fechando conexão');
                this.shouldReconnect = false;
                this.ws.close();
                this.ws = null;
                if (this.reconnectTimer) {
                    clearTimeout(this.reconnectTimer);
                    this.reconnectTimer = null;
                }
            }
        };
    }

    getState() {
        return {
            isConnected: this.ws?.readyState === WebSocket.OPEN,
            activeChannels: Array.from(this.listeners.keys()),
            reconnectAttempts: this.reconnectAttempts
        };
    }
}

// Global singleton instance
const wsManager = new WebSocketManager();

// =====================================================
// REACT HOOK
// =====================================================

export function useRealtime(channel, onMessage) {
    const [isConnected, setIsConnected] = useState(wsManager.ws?.readyState === WebSocket.OPEN);
    const callbackRef = useRef(onMessage);

    // Keep callback ref updated
    useEffect(() => {
        callbackRef.current = onMessage;
    }, [onMessage]);

    useEffect(() => {
        // Wrapper to use latest callback
        const wrappedCallback = (payload) => {
            callbackRef.current(payload);
        };

        const unsubscribe = wsManager.subscribe(channel, wrappedCallback);

        // Update connected state periodically
        const checkConnection = setInterval(() => {
            const newState = wsManager.ws?.readyState === WebSocket.OPEN;
            setIsConnected(prev => prev !== newState ? newState : prev);
        }, 1000);

        return () => {
            unsubscribe();
            clearInterval(checkConnection);
        };
    }, [channel]);

    const reconnect = useCallback(() => {
        wsManager.reconnectAttempts = 0;
        wsManager.shouldReconnect = true;
        wsManager.connect();
    }, []);

    return { isConnected, reconnect };
}
