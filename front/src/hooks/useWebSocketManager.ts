'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppSelector } from '../store/hooks';

const BASE_DELAY = 1000;
const MAX_DELAY = 30000;
const MAX_ATTEMPTS = 10;
const PING_INTERVAL = 30000;
const PONG_TIMEOUT = 5000;

export const useWebSocketManager = <TRecv = unknown, TSend = unknown>(url: string) => {
  const [messages, setMessages] = useState<TRecv[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const token = useAppSelector((state) => state.auth.token);
  const attemptsRef = useRef(0);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pongTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  useEffect(() => {
    if (!token || !url) return;
    unmountedRef.current = false;
    attemptsRef.current = 0;

    const connect = () => {
      if (unmountedRef.current) return;

      wsRef.current = new WebSocket(`${url}?token=${token}`);

      wsRef.current.onopen = () => {
        if (unmountedRef.current) return;
        setIsConnected(true);
        attemptsRef.current = 0;

        // Start heartbeat
        pingTimerRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'ping' }));
            pongTimerRef.current = setTimeout(() => {
              wsRef.current?.close();
            }, PONG_TIMEOUT);
          }
        }, PING_INTERVAL);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as any;
          if (data.type === 'pong') {
            if (pongTimerRef.current) clearTimeout(pongTimerRef.current);
            return;
          }
          setMessages((prev) => [...prev, data as TRecv]);
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      wsRef.current.onclose = () => {
        if (unmountedRef.current) return;
        setIsConnected(false);
        if (pingTimerRef.current) clearInterval(pingTimerRef.current);
        if (pongTimerRef.current) clearTimeout(pongTimerRef.current);

        if (attemptsRef.current >= MAX_ATTEMPTS) return;

        const jitter = Math.random() * 1000;
        const delay = Math.min(MAX_DELAY, BASE_DELAY * Math.pow(2, attemptsRef.current)) + jitter;
        attemptsRef.current += 1;
        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      wsRef.current.onerror = () => wsRef.current?.close();
    };

    connect();

    return () => {
      unmountedRef.current = true;
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
      if (pongTimerRef.current) clearTimeout(pongTimerRef.current);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [url, token]);

  const sendMessage = (msg: TSend) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  return { messages, isConnected, sendMessage, wsRef };
};
