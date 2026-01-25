import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebSocket() {
  const [ws, setWs] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef(null);
  const wsRef = useRef(null); // Track actual WebSocket instance for cleanup
  const isMountedRef = useRef(true); // Track if component is still mounted
  const connectionIdRef = useRef(0); // Track connection ID to ignore stale events

  const connect = useCallback(() => {
    // Don't connect if already connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    // Increment connection ID to invalidate any pending events from old connections
    const thisConnectionId = ++connectionIdRef.current;

    try {
      const isPlatform = import.meta.env.VITE_IS_PLATFORM === 'true';

      // Construct WebSocket URL
      let wsUrl;

      if (isPlatform) {
        // Platform mode: Use same domain as the page (goes through proxy)
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${window.location.host}/ws`;
      } else {
        // OSS mode: Connect to same host:port that served the page
        const token = localStorage.getItem('auth-token');
        if (!token) {
          console.warn('No authentication token found for WebSocket connection');
          return;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;
      }

      // Close any existing connection before creating a new one
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      const websocket = new WebSocket(wsUrl);
      wsRef.current = websocket;

      websocket.onopen = () => {
        // Ignore if this is a stale connection or component unmounted
        if (thisConnectionId !== connectionIdRef.current || !isMountedRef.current) {
          websocket.close();
          return;
        }
        setIsConnected(true);
        setWs(websocket);
      };

      websocket.onmessage = (event) => {
        // Ignore if stale or unmounted
        if (thisConnectionId !== connectionIdRef.current || !isMountedRef.current) return;
        try {
          const data = JSON.parse(event.data);
          setMessages(prev => [...prev, data]);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      websocket.onclose = () => {
        // Ignore events from stale connections - critical for React StrictMode
        if (thisConnectionId !== connectionIdRef.current) return;
        if (!isMountedRef.current) return;

        setIsConnected(false);
        setWs(null);
        wsRef.current = null;

        // Attempt to reconnect after 3 seconds if still mounted and still current
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current && thisConnectionId === connectionIdRef.current) {
            connect();
          }
        }, 3000);
      };

      websocket.onerror = (error) => {
        // Ignore errors from stale connections
        if (thisConnectionId !== connectionIdRef.current) return;
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      // Increment connection ID to invalidate any pending events
      connectionIdRef.current++;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Close WebSocket using ref (not stale closure)
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const sendMessage = (message) => {
    if (ws && isConnected) {
      ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected');
    }
  };

  return {
    ws,
    sendMessage,
    messages,
    isConnected
  };
}
