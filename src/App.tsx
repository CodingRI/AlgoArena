import FloatingPanel from '@/draggable/FloatingPanel';
import ExplanationOverlay from '@/overlays/ExplanationOverlay';
import { useExplanationStore } from '@/store/voiceStore';

// ─── Dev Preview Wrapper ──────────────────────────────────────────────────────
// In production (Chrome Extension), FloatingPanel is injected into the
// LeetCode page via content.ts using a Shadow DOM root.
// Here we render it on a fake LeetCode-looking background for dev previewing.

const DevPreviewBackground = () => (
  <div
    className="fixed inset-0 -z-10 flex items-center justify-center"
    style={{
      background: 'linear-gradient(180deg, #0a0a0f 0%, #0d0b1a 100%)',
      fontFamily: '"DM Sans", system-ui, sans-serif',
    }}
  >
    {/* Fake LeetCode chrome */}
    <div className="w-full max-w-5xl mx-auto px-6 py-8 opacity-20 pointer-events-none">
      <div className="flex gap-6">
        {/* Problem panel */}
        <div className="w-[45%] space-y-3">
          <div className="h-6 bg-zinc-700 rounded w-1/3" />
          <div className="h-4 bg-zinc-800 rounded w-full" />
          <div className="h-4 bg-zinc-800 rounded w-5/6" />
          <div className="h-4 bg-zinc-800 rounded w-4/5" />
          <div className="mt-4 h-3 bg-zinc-800 rounded w-2/3" />
          <div className="h-3 bg-zinc-800 rounded w-3/4" />
          <div className="h-3 bg-zinc-800 rounded w-1/2" />
          <div className="mt-4 h-20 bg-zinc-900 rounded border border-zinc-800" />
        </div>
        {/* Editor panel */}
        <div className="flex-1 space-y-2">
          <div className="h-8 bg-zinc-900 rounded flex gap-2 p-2 border border-zinc-800">
            <div className="h-4 bg-zinc-700 rounded w-16" />
            <div className="h-4 bg-zinc-800 rounded w-12" />
          </div>
          <div className="h-64 bg-zinc-900 rounded border border-zinc-800 p-3 space-y-2">
            <div className="h-3 bg-zinc-800 rounded w-1/3" />
            <div className="h-3 bg-zinc-800 rounded w-1/2" />
            <div className="h-3 bg-zinc-800 rounded w-2/5" />
            <div className="h-3 bg-zinc-700 rounded w-3/5 ml-4" />
            <div className="h-3 bg-zinc-700 rounded w-1/2 ml-4" />
          </div>
        </div>
      </div>
    </div>

    {/* Watermark */}
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
      <p className="text-zinc-700 text-xs font-mono">
        LeetCode Collab — Dev Preview Mode
      </p>
      <p className="text-zinc-800 text-[10px] font-mono mt-0.5">
        In production, this panel injects into leetcode.com via Chrome Extension
      </p>
    </div>
  </div>
);

const App = () => {
  const { session } = useExplanationStore();

  return (
    <>
      <DevPreviewBackground />
      <FloatingPanel />
      <ExplanationOverlay isOpen={!!session?.isActive} />
    </>
  );
};

export default App;
