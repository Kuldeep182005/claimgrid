import { useEffect, useRef, useState, useCallback } from 'react';
import type { ConnectionState, ServerGameEvent } from '../types/websocket';

interface UseWebSocketOptions {
  playerId?: string;
  onEvent?: (event: ServerGameEvent) => void;
  onReconnect?: () => void;
}

export function useWebSocket({ playerId, onEvent, onReconnect }: UseWebSocketOptions) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('CONNECTING');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  const pingTimestampRef = useRef<number>(0);
  const reconnectAttemptsRef = useRef<number>(0);
  const wasConnectedRef = useRef<boolean>(false);

  // Keep onEvent and onReconnect in refs updated via effect
  const onEventRef = useRef(onEvent);
  const onReconnectRef = useRef(onReconnect);
  const connectRef = useRef<() => void>(() => {});

  useEffect(() => {
    onEventRef.current = onEvent;
    onReconnectRef.current = onReconnect;
  }, [onEvent, onReconnect]);

  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const query = playerId ? `?playerId=${encodeURIComponent(playerId)}` : '';
    const url = `${protocol}//${host}/ws/game${query}`;

    setConnectionState(wasConnectedRef.current ? 'RECONNECTING' : 'CONNECTING');

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionState('CONNECTED');
      const hadPreviouslyConnected = wasConnectedRef.current;
      wasConnectedRef.current = true;
      reconnectAttemptsRef.current = 0;

      // Start ping keepalive every 25 seconds
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          pingTimestampRef.current = performance.now();
          ws.send(JSON.stringify({ type: 'PING' }));
        }
      }, 25000);

      // If this was a reconnection after disconnect, notify to resync REST snapshot
      if (hadPreviouslyConnected && onReconnectRef.current) {
        onReconnectRef.current();
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ServerGameEvent;
        if (data.type === 'PONG') {
          if (pingTimestampRef.current > 0) {
            setLatencyMs(Math.round(performance.now() - pingTimestampRef.current));
          }
          return;
        }

        if (onEventRef.current) {
          onEventRef.current(data);
        }
      } catch {
        // Safe isolation of malformed incoming messages
      }
    };

    ws.onclose = () => {
      setConnectionState('DISCONNECTED');
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }

      // Exponential backoff reconnect: 1s, 2s, 4s, max 8s
      const delay = Math.min(1000 * Math.pow(1.8, reconnectAttemptsRef.current), 8000);
      reconnectAttemptsRef.current += 1;

      reconnectTimeoutRef.current = window.setTimeout(() => {
        connectRef.current();
      }, delay);
    };

    ws.onerror = () => {
      // ws.onclose will handle cleanup and reconnection
    };
  }, [playerId]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    connect();

    // Reconnect immediately if network returns online
    const handleOnline = () => {
      if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
        connect();
      }
    };
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent reconnect on unmount
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendPing = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      pingTimestampRef.current = performance.now();
      wsRef.current.send(JSON.stringify({ type: 'PING' }));
    }
  }, []);

  return {
    connectionState,
    latencyMs,
    sendPing,
  };
}
