import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebSocket() {
  const [ws, setWs] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const reconnectTimeoutRef = useRef(null);
  const wsRef = useRef(null);
  const messageQueueRef = useRef([]);

  useEffect(() => {
    let mounted = true;
    let websocket = null;

    const connect = () => {
      // Don't connect if already have an open connection
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        return;
      }

      try {
        const isPlatform = import.meta.env.VITE_IS_PLATFORM === 'true';
        let wsUrl;

        if (isPlatform) {
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          wsUrl = `${protocol}//${window.location.host}/ws`;
        } else {
          const token = localStorage.getItem('auth-token');
          if (!token) {
            console.warn('No authentication token found for WebSocket connection');
            return;
          }
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          wsUrl = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;
        }

        websocket = new WebSocket(wsUrl);
        wsRef.current = websocket;

        websocket.onopen = () => {
          if (!mounted) {
            // Component unmounted while connecting - close silently
            websocket.close();
            return;
          }
          console.log('[WS] Connected');
          setIsConnected(true);
          setWs(websocket);

          // Flush queued messages
          while (messageQueueRef.current.length > 0) {
            const queuedMessage = messageQueueRef.current.shift();
            console.log('[WS] Sending queued message:', queuedMessage.type);
            websocket.send(JSON.stringify(queuedMessage));
          }
          setPendingCount(0);
        };

        websocket.onmessage = (event) => {
          if (!mounted) return;
          try {
            const data = JSON.parse(event.data);
            setMessages(prev => [...prev, data]);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        websocket.onclose = (event) => {
          console.log('[WS] Disconnected, code:', event.code);
          if (!mounted) return;

          setIsConnected(false);
          setWs(null);
          wsRef.current = null;

          // Reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mounted) {
              console.log('[WS] Attempting reconnect...');
              connect();
            }
          }, 3000);
        };

        websocket.onerror = (error) => {
          console.error('[WS] Error:', error);
        };

      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
      }
    };

    connect();

    return () => {
      mounted = false;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (websocket) {
        websocket.close();
      }
    };
  }, []);

  const sendMessage = useCallback((message) => {
    const currentWs = wsRef.current;
    if (currentWs && currentWs.readyState === WebSocket.OPEN) {
      console.log('[WS] Sending:', message.type);
      currentWs.send(JSON.stringify(message));
    } else {
      console.log('[WS] Queuing message (not connected):', message.type);

      // Limit queue size to prevent memory issues during extended disconnection
      if (messageQueueRef.current.length >= 100) {
        console.warn('[WS] Message queue full, dropping oldest message');
        messageQueueRef.current.shift();
      }

      messageQueueRef.current.push(message);
      setPendingCount(messageQueueRef.current.length);
    }
  }, []);

  return {
    ws,
    sendMessage,
    messages,
    isConnected,
    pendingCount
  };
}
