
import React, { useState, useEffect, useRef, useCallback } from 'react';
import '@excalidraw/excalidraw/index.css';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import socketService from '@/websockets/socketService';
import { SOCKET_EVENTS } from '@/constants';
import { PAGE_SCROLL_EVENT, type PageScrollDetail } from '@/hooks/useScrollSync';

// Dynamic import so Excalidraw's ~1MB bundle only loads when explanation mode opens.
const ExcalidrawLazy = React.lazy(() =>
  import('@excalidraw/excalidraw').then((mod) => ({ default: mod.Excalidraw }))
);

// Throttle helper — returns a function that fires at most once per `ms`.
function throttle<T extends (...args: Parameters<T>) => void>(fn: T, ms: number): T {
  let last = 0;
  return ((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn(...args);
    }
  }) as T;
}

interface Props {
  isPresenter: boolean;
  isInteractive?: boolean;
  /** JSON string of the initial element array (used when a follower joins mid-session). */
  initialElementsJson?: string | null;
  presenterName?: string;
}

interface SyncedCanvasAppState {
  scrollX: number;
  scrollY: number;
  zoom: { value: number };
}

const ExcalidrawCanvas = ({
  isPresenter,
  isInteractive = true,
  initialElementsJson,
  presenterName,
}: Props) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [laserPos, setLaserPos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse the initial elements snapshot for a follower joining mid-session.
  // The transparent scene keeps the underlying LeetCode page visible.
  const initialData = React.useMemo(() => {
    let elements: readonly ExcalidrawElement[] = [];
    try {
      if (initialElementsJson) elements = JSON.parse(initialElementsJson);
    } catch {
      elements = [];
    }
    return {
      elements,
      appState: {
        viewBackgroundColor: 'transparent',
      },
    };
  }, [initialElementsJson]);

  // Hydrate followers who join or reconnect after drawing has already started.
  useEffect(() => {
    if (isPresenter || !excalidrawAPI || !initialElementsJson) return;
    try {
      excalidrawAPI.updateScene({ elements: JSON.parse(initialElementsJson) });
    } catch (error) {
      console.warn('[Canvas] Failed to hydrate saved scene', error);
    }
  }, [isPresenter, excalidrawAPI, initialElementsJson]);

  // ── Follower: receive canvas updates ──────────────────────────────────────
  useEffect(() => {
    if (isPresenter) return;

    const unsubCanvas = socketService.on<{
      elements: string;
      appState?: SyncedCanvasAppState;
    }>(
      SOCKET_EVENTS.CANVAS_UPDATE,
      ({ elements, appState }) => {
        try {
          excalidrawAPI?.updateScene({
            elements: JSON.parse(elements),
            ...(appState ? { appState } : {}),
          });
        } catch (e) {
          console.warn('[Canvas] Failed to apply update', e);
        }
      }
    );

    const unsubLaser = socketService.on<{ x: number; y: number }>(
      SOCKET_EVENTS.LASER_MOVE,
      (pos) => setLaserPos(pos)
    );

    return () => {
      unsubCanvas();
      unsubLaser();
    };
  }, [isPresenter, excalidrawAPI]);

  // Keep annotations anchored to the page as its underlying scroll container
  // moves. updateScene triggers the throttled onChange broadcast, so followers
  // receive the same Excalidraw viewport offset as the presenter.
  useEffect(() => {
    if (!isPresenter || !excalidrawAPI) return;

    const handlePageScroll = (event: Event) => {
      const { deltaTop, deltaLeft } = (event as CustomEvent<PageScrollDetail>).detail;
      const appState = excalidrawAPI.getAppState();
      excalidrawAPI.updateScene({
        appState: {
          scrollX: appState.scrollX - deltaLeft,
          scrollY: appState.scrollY - deltaTop,
        },
      });
    };

    window.addEventListener(PAGE_SCROLL_EVENT, handlePageScroll);
    return () => window.removeEventListener(PAGE_SCROLL_EVENT, handlePageScroll);
  }, [isPresenter, excalidrawAPI]);

  // ── Presenter: emit canvas changes (throttled to ~20 fps) ─────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleChange = useCallback(
    throttle((elements: readonly unknown[], appState: SyncedCanvasAppState) => {
      if (!isPresenter) return;
      socketService.send(SOCKET_EVENTS.CANVAS_UPDATE, {
        elements: JSON.stringify(elements),
        appState: {
          scrollX: appState.scrollX,
          scrollY: appState.scrollY,
          zoom: appState.zoom,
        },
      });
    }, 50),
    [isPresenter]
  );

  // ── Presenter: emit laser pointer position (normalized) ───────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handlePointerUpdate = useCallback(
    throttle((payload: { pointer: { x: number; y: number } | null }) => {
      if (!isPresenter || !payload.pointer || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      socketService.send(SOCKET_EVENTS.LASER_MOVE, {
        x: payload.pointer.x / rect.width,
        y: payload.pointer.y / rect.height,
      });
    }, 30),
    [isPresenter]
  );

  // Laser cursor is shown via the CSS overlay below; no collaborators prop needed.

  return (
    <div
      ref={containerRef}
      className={`excalidraw-canvas-layer absolute inset-0 w-full h-full ${
        isPresenter ? 'excalidraw-presenter' : 'excalidraw-follower'
      } ${
        isPresenter
          ? isInteractive
            ? 'excalidraw-mode-draw'
            : 'excalidraw-mode-page'
          : ''
      }`}
    >
      <React.Suspense
        fallback={
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-400 animate-spin" />
            <span className="text-xs text-zinc-500 font-mono">Loading canvas…</span>
          </div>
        }
      >
        <ExcalidrawLazy
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          initialData={initialData}
          viewModeEnabled={!isPresenter || !isInteractive}
          zenModeEnabled={!isPresenter}
          onChange={handleChange}
          onPointerUpdate={handlePointerUpdate}
          theme="dark"
          UIOptions={{
            canvasActions: {
              export: false,
              saveAsImage: isPresenter,
              loadScene: false,
            },
          }}
        />
      </React.Suspense>

      {/* Fallback laser dot for followers (in case Excalidraw collaborator cursor lags) */}
      {!isPresenter && laserPos && containerRef.current && (
        <div
          className="pointer-events-none absolute rounded-full"
          style={{
            width: 14,
            height: 14,
            left: laserPos.x * containerRef.current.getBoundingClientRect().width - 7,
            top: laserPos.y * containerRef.current.getBoundingClientRect().height - 7,
            background: 'rgba(139,92,246,0.85)',
            boxShadow: '0 0 10px 3px rgba(139,92,246,0.5)',
            transition: 'left 40ms linear, top 40ms linear',
            zIndex: 999,
          }}
        />
      )}
    </div>
  );
};

export default ExcalidrawCanvas;
