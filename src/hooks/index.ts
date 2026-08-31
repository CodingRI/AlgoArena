import { useRef, useEffect, useCallback, useState } from 'react';
import socketService from '@/websockets/socketService';
import { usePanelStore } from '@/store/panelStore';

// ─── useDraggable ────────────────────────────────────────────────────────────

interface DragState {
  isDragging: boolean;
  dragOffset: { x: number; y: number };
}

export const useDraggable = () => {
  const { position, setPosition } = usePanelStore();
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragOffset: { x: 0, y: 0 },
  });

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setDragState({
        isDragging: true,
        dragOffset: { x: e.clientX - position.x, y: e.clientY - position.y },
      });
    },
    [position]
  );

  useEffect(() => {
    if (!dragState.isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      const newX = Math.max(0, Math.min(window.innerWidth - 360, e.clientX - dragState.dragOffset.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 60, e.clientY - dragState.dragOffset.y));
      setPosition({ x: newX, y: newY });
    };

    const onMouseUp = () => {
      setDragState((s) => ({ ...s, isDragging: false }));
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragState.isDragging, dragState.dragOffset, setPosition]);

  return { position, onMouseDown, isDragging: dragState.isDragging };
};

// ─── useSocket ───────────────────────────────────────────────────────────────

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(socketService.isConnected);

  useEffect(() => {
    const unsubConnect = socketService.on('connect', () => setIsConnected(true));
    const unsubDisconnect = socketService.on('disconnect', () => setIsConnected(false));
    return () => {
      unsubConnect();
      unsubDisconnect();
    };
  }, []);

  return { isConnected, socketService };
};

// ─── useTypingIndicator ───────────────────────────────────────────────────────

export const useTypingIndicator = (onTyping: () => void, onStop: () => void, delay = 1500) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const lastEmitRef = useRef(0);
  const onTypingRef = useRef(onTyping);
  const onStopRef = useRef(onStop);
  onTypingRef.current = onTyping;
  onStopRef.current = onStop;

  const stopImmediately = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onStopRef.current();
    }
  }, []);

  const onInput = useCallback(() => {
    const now = Date.now();
    // Emit immediately on first keystroke, then heartbeat every 2s so receivers
    // don't expire a long continuous typing burst.
    if (!isTypingRef.current || now - lastEmitRef.current > 2000) {
      isTypingRef.current = true;
      lastEmitRef.current = now;
      onTypingRef.current();
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      timerRef.current = null;
      onStopRef.current();
    }, delay);
  }, [delay]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (isTypingRef.current) {
        isTypingRef.current = false;
        onStopRef.current();
      }
    },
    []
  );

  return { onInput, stopImmediately };
};

// ─── useClickOutside ─────────────────────────────────────────────────────────

export const useClickOutside = (ref: React.RefObject<HTMLElement>, callback: () => void) => {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) callback();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, callback]);
};

// ─── useAutoScroll ────────────────────────────────────────────────────────────

export const useAutoScroll = (deps: unknown[]) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, deps);
  return bottomRef;
};
