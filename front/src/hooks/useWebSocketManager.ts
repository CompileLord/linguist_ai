'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppSelector } from '../store/hooks';

export const useWebSocketManager = <TRecv = unknown, TSend = unknown>(url: string) => {
  const [messages, setMessages] = useState<TRecv[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const token = useAppSelector((state) => state.auth.token);

  useEffect(() => {
    // Only connect if there's a token and URL
    if (!token || !url) return;

    let reconnectInterval: NodeJS.Timeout;
    const connect = () => {
      wsRef.current = new WebSocket(`${url}?token=${token}`);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        console.log('WS Connected');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as TRecv;
          setMessages((prev) => [...prev, data]);
        } catch (e) {
          console.error('Failed to parse WS message:', e);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        console.log('WS Disconnected. Reconnecting...');
        // Auto-reconnect logic
        reconnectInterval = setTimeout(connect, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WS Error:', error);
        wsRef.current?.close();
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectInterval);
      wsRef.current?.close();
    };
  }, [url, token]);

  const sendMessage = (msg: TSend) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  return { messages, isConnected, sendMessage };
};
