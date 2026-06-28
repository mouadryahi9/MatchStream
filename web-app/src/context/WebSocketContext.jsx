import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";

const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
const WS_BASE = `${proto}//${window.location.host}/ws`;

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const ws = useRef(null);
  const listeners = useRef(new Map());
  const reconnectTimeout = useRef(null);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    ws.current = new WebSocket(WS_BASE);

    ws.current.onopen = () => setConnected(true);

    ws.current.onclose = () => {
      setConnected(false);
      reconnectTimeout.current = setTimeout(connect, 3000);
    };

    ws.current.onerror = () => {
      ws.current?.close();
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
        if (data.type) {
          const callbacks = listeners.current.get(data.type) || [];
          callbacks.forEach((cb) => cb(data));
        }
      } catch {}
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimeout.current);
      ws.current?.close();
    };
  }, [connect]);

  const subscribe = useCallback((eventType, callback) => {
    const existing = listeners.current.get(eventType) || [];
    listeners.current.set(eventType, [...existing, callback]);
    return () => {
      const updated = (listeners.current.get(eventType) || []).filter((cb) => cb !== callback);
      if (updated.length === 0) listeners.current.delete(eventType);
      else listeners.current.set(eventType, updated);
    };
  }, []);

  const sendMessage = useCallback((data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  }, []);

  return (
    <WebSocketContext.Provider value={{ connected, lastMessage, subscribe, sendMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error("useWebSocket must be used within WebSocketProvider");
  return ctx;
}
