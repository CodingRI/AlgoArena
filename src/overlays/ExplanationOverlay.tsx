import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Radio, MousePointer2, Pencil, Eye } from 'lucide-react';
import ExcalidrawCanvas from './ExcalidrawCanvas';
import { useScrollSync } from '@/hooks/useScrollSync';
import { useExplanationStore } from '@/store/voiceStore';
import { useRoomStore } from '@/store/roomStore';
import { EXTENSION_MOUNT_ID } from '@/constants';

const PresenterBadge = ({ name }: { name: string }) => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-center gap-2 bg-violet-500/20 border border-violet-500/30 backdrop-blur-sm
      px-3 py-1.5 rounded-full shadow-glow"
  >
    <motion.div
      className="w-2 h-2 rounded-full bg-red-400"
      animate={{ opacity: [1, 0.3, 1] }}
      transition={{ duration: 1.2, repeat: Infinity }}
    />
    <Radio className="w-3.5 h-3.5 text-violet-300" />
    <span className="text-xs font-semibold text-violet-200 font-display">{name} is presenting</span>
  </motion.div>
);

interface Props {
  isOpen: boolean;
}

function scrollableElementAtPoint(x: number, y: number): HTMLElement | null {
  const elements = document.elementsFromPoint(x, y);
  for (const element of elements) {
    if (element.id === EXTENSION_MOUNT_ID) continue;
    let current: HTMLElement | null =
      element instanceof HTMLElement ? element : element.parentElement;
    while (current && current !== document.body) {
      const style = window.getComputedStyle(current);
      const canScrollY =
        /(auto|scroll|overlay)/.test(style.overflowY) &&
        current.scrollHeight > current.clientHeight;
      const canScrollX =
        /(auto|scroll|overlay)/.test(style.overflowX) &&
        current.scrollWidth > current.clientWidth;
      if (canScrollY || canScrollX) return current;
      current = current.parentElement;
    }
  }
  return document.scrollingElement as HTMLElement | null;
}

const ExplanationOverlay = ({ isOpen }: Props) => {
  const { session, requestEndSession, myRole } = useExplanationStore();
  const { currentRoom } = useRoomStore();
  const [interactionMode, setInteractionMode] = useState<'draw' | 'page'>('page');
  const [drawingsVisible, setDrawingsVisible] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);
  const presenter = currentRoom?.members.find((m) => m.id === session?.presenterId);
  const presenterName = presenter?.name ?? 'Unknown';
  const isPresenter = myRole === 'presenter';
  const isDrawing = isPresenter && interactionMode === 'draw';

  useScrollSync(isOpen, isPresenter);

  useEffect(() => {
    if (!isOpen) {
      setInteractionMode('page');
      setDrawingsVisible(true);
    }
  }, [isOpen]);

  // Excalidraw consumes wheel events while drawing. Forward ordinary wheel
  // gestures to the LeetCode pane under the pointer, while preserving
  // Ctrl/Cmd+wheel for Excalidraw zoom.
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay || !isDrawing) return;

    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return;
      const target = scrollableElementAtPoint(event.clientX, event.clientY);
      if (!target) return;

      const unit =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 16
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? window.innerHeight
            : 1;
      event.preventDefault();
      event.stopPropagation();
      target.scrollBy({
        left: event.deltaX * unit,
        top: event.deltaY * unit,
      });
    };

    overlay.addEventListener('wheel', handleWheel, { capture: true, passive: false });
    return () => overlay.removeEventListener('wheel', handleWheel, true);
  }, [isDrawing]);

  const handleExit = () => {
    if (myRole === 'presenter') {
      if (currentRoom) requestEndSession(currentRoom.id);
    } else {
      // Followers hide drawings locally; session continues for others
      setDrawingsVisible(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="explanation-overlay fixed inset-0 z-[9999] pointer-events-none"
          style={{ background: 'transparent' }}
        >
          {drawingsVisible ? (
            <>
              {/* Full-viewport transparent drawing layer */}
              <ExcalidrawCanvas
                isPresenter={isPresenter}
                isInteractive={isDrawing}
                initialElementsJson={session?.canvasData ?? null}
                presenterName={presenterName}
              />

              <div className="explanation-session-controls pointer-events-auto absolute top-4 left-4">
                <PresenterBadge name={presenterName} />
              </div>
              <div className="explanation-session-controls pointer-events-auto absolute top-4 right-4 flex items-center gap-2">
                {isPresenter && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setInteractionMode(isDrawing ? 'page' : 'draw')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-colors shadow-xl backdrop-blur-md
                      ${isDrawing
                        ? 'bg-cyan-500/20 border-cyan-400/35 text-cyan-200 hover:bg-cyan-500/30'
                        : 'bg-violet-500/25 border-violet-400/40 text-violet-100 hover:bg-violet-500/35'
                      }`}
                    title={isDrawing ? 'Pass clicks and scrolling through to LeetCode' : 'Return to drawing'}
                  >
                    {isDrawing
                      ? <MousePointer2 className="w-3.5 h-3.5" />
                      : <Pencil className="w-3.5 h-3.5" />}
                    {isDrawing ? 'Use LeetCode page' : 'Draw on page'}
                  </motion.button>
                )}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleExit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-950/85 border border-red-500/25
                    text-xs text-red-400 hover:bg-red-500/20 transition-colors shadow-xl backdrop-blur-md"
                >
                  <X className="w-3.5 h-3.5" />
                  {isPresenter ? 'End Session' : 'Hide drawings'}
                </motion.button>
              </div>
            </>
          ) : (
            /* Drawings are hidden — show a small pill to restore them */
            <div className="pointer-events-auto absolute top-4 right-4">
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setDrawingsVisible(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                  bg-violet-500/25 border border-violet-400/40 text-violet-100 text-xs
                  hover:bg-violet-500/35 transition-colors shadow-xl backdrop-blur-md"
              >
                <Eye className="w-3.5 h-3.5" />
                Show drawings
              </motion.button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ExplanationOverlay;
