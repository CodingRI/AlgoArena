/**
 * WebSocket Service — Placeholder / Architecture
 *
 * In production, replace with real WebSocket server (e.g. Socket.IO, ws, Hono WebSocket)
 * This file sets up the client-side socket service structure.
 */

import { SOCKET_EVENTS, WS_CONFIG } from '@/constants';
import type { SocketPayload } from '@/types';

type EventCallback<T = unknown> = (payload: T) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, EventCallback[]> = new Map();
  private reconnectAttempts = 0;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private roomId: string | null = null;
  private userId: string | null = null;
  public isConnected = false;

  connect(roomId: string, userId: string): void {
    // Tear down any existing connection BEFORE creating a new one.
    // Without this, the old WS's onmessage stays alive and every broadcast
    // is processed twice (once by the old connection, once by the new one).
    if (this.ws) {
      const stale = this.ws;
      stale.onopen = null;
      stale.onmessage = null;
      stale.onerror = null;
      stale.onclose = null; // suppress reconnect on the stale WS
      stale.close();
      this.ws = null;
    }
    this.stopPing();

    this.roomId = roomId;
    this.userId = userId;

    try {
      this.ws = new WebSocket(`${WS_CONFIG.BASE_URL}?roomId=${roomId}&userId=${userId}`);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit(SOCKET_EVENTS.CONNECT, {});
        this.startPing();
        console.log('[WS] Connected to room:', roomId);
      };

      this.ws.onmessage = (event) => {
        // The Go WritePump may batch multiple JSON messages in one frame,
        // separated by newlines (gorilla/websocket batching pattern).
        const lines = (event.data as string).split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const payload = JSON.parse(line) as SocketPayload;
            this.handleMessage(payload);
          } catch (e) {
            console.error('[WS] Failed to parse message:', e, line);
          }
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.stopPing();
        this.emit(SOCKET_EVENTS.DISCONNECT, {});
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[WS] Error:', error);
        this.emit(SOCKET_EVENTS.ERROR, { error });
      };
    } catch (e) {
      console.warn('[WS] Connection failed (placeholder mode active):', e);
      this.simulateMockConnection();
    }
  }

  private simulateMockConnection(): void {
    // For development: simulate connected state without real backend
    setTimeout(() => {
      this.isConnected = true;
      this.emit(SOCKET_EVENTS.CONNECT, { mock: true });
      console.log('[WS] Mock connection active (dev mode)');
    }, 500);
  }

  private handleMessage(payload: SocketPayload): void {
    // For P2P events inject the sender's ID into the data object so consumers
    // know who they are talking to without parsing the outer envelope separately.
    let data: unknown = payload.data;
    if (payload.event.startsWith('webrtc:') && typeof data === 'object' && data !== null) {
      data = { ...(data as Record<string, unknown>), fromUserId: payload.senderId };
    }
    const callbacks = this.listeners.get(payload.event) ?? [];
    callbacks.forEach((cb) => cb(data));
  }

  on<T>(event: string, callback: EventCallback<T>): () => void {
    const existing = this.listeners.get(event) ?? [];
    this.listeners.set(event, [...existing, callback as EventCallback]);

    // Return cleanup function
    return () => this.off(event, callback as EventCallback);
  }

  off(event: string, callback: EventCallback): void {
    const existing = this.listeners.get(event) ?? [];
    this.listeners.set(
      event,
      existing.filter((cb) => cb !== callback)
    );
  }

  send<T>(event: string, data: T, targetUserId?: string): void {
    const payload: SocketPayload<T> = {
      event,
      roomId: this.roomId ?? '',
      data,
      timestamp: Date.now(),
      senderId: this.userId ?? '',
      ...(targetUserId && { targetUserId }),
    };

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log('[WS Mock] Sending:', payload);
      return;
    }

    this.ws.send(JSON.stringify(payload));
  }

  private emit(event: string, data: unknown): void {
    const callbacks = this.listeners.get(event) ?? [];
    callbacks.forEach((cb) => cb(data));
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ event: 'ping', timestamp: Date.now() }));
      }
    }, WS_CONFIG.PING_INTERVAL);
  }

  private stopPing(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= WS_CONFIG.MAX_RECONNECT_ATTEMPTS) {
      console.error('[WS] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    setTimeout(() => {
      if (this.roomId && this.userId) {
        console.log(`[WS] Reconnecting... attempt ${this.reconnectAttempts}`);
        this.connect(this.roomId, this.userId);
      }
    }, WS_CONFIG.RECONNECT_INTERVAL);
  }

  disconnect(): void {
    this.stopPing();
    if (this.ws) {
      // Null out all handlers before closing so onclose → attemptReconnect
      // does not fire on a deliberate disconnect.
      const ws = this.ws;
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.roomId = null;
    this.userId = null;
    // Emit disconnect so stores/hooks that listen can react
    this.emit(SOCKET_EVENTS.DISCONNECT, {});
  }
}

// Singleton instance
export const socketService = new WebSocketService();
export default socketService;
