import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Copy, Settings, Users, Check, LogOut, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import SocketStatus from '@/components/ui/SocketStatus';
import { useRoomStore } from '@/store/roomStore';
import { usePanelStore } from '@/store/panelStore';
import { LANGUAGES } from '@/constants';
import socketService from '@/websockets/socketService';
import type { SocketStatus as SocketStatusType } from '@/types';

const RoomHeader = () => {
  const { currentRoom, leaveRoom } = useRoomStore();
  const { collapsePanel, toggleSettings, setActiveTab } = usePanelStore();
  const [copied, setCopied] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  // Derive real connection status from the socket service
  const wsStatus: SocketStatusType = !currentRoom
    ? 'disconnected'
    : socketService.isConnected
      ? 'connected'
      : 'connecting';

  const copyRoomId = () => {
    if (!currentRoom) return;
    navigator.clipboard.writeText(currentRoom.id).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = () => {
    leaveRoom();
    setConfirmLeave(false);
  };

  const langConfig = LANGUAGES.find((l) => l.value === currentRoom?.language);

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5 flex-shrink-0">
      {/* Logo */}
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-700
        flex items-center justify-center shadow-glow-sm flex-shrink-0">
        <span className="text-[10px] font-bold text-white font-mono">AA</span>
      </div>

      {/* Room info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-white truncate font-display">
            {currentRoom?.name ?? 'AlgoArena'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <SocketStatus status={wsStatus} showLabel />
          {currentRoom && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={copyRoomId}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors font-mono"
            >
              {copied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
              <span>{copied ? 'Copied!' : currentRoom.id}</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => setActiveTab('members')}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <Users className="w-3.5 h-3.5" />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={toggleSettings}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
        </motion.button>

        {/* Leave Room */}
        {currentRoom && (
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => setConfirmLeave(true)}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-6 h-6 rounded-md bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 hover:text-red-300 transition-colors"
            title="Leave room"
          >
            <LogOut className="w-3.5 h-3.5" />
          </motion.button>
        )}

        {/* Collapse */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={collapsePanel}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </motion.button>
      </div>

      {/* Leave confirmation mini-modal */}
      <AnimatePresence>
        {confirmLeave && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            className="absolute top-12 right-2 z-50 w-52 p-3 rounded-xl
              bg-galaxy-800 border border-red-500/30 shadow-xl"
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
              <span className="text-[11px] font-semibold text-zinc-200 font-display">Leave room?</span>
            </div>
            <p className="text-[10px] text-zinc-500 mb-3 font-mono">
              You'll be disconnected and need to rejoin.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmLeave(false)}
                className="flex-1 py-1.5 rounded-lg text-[10px] font-mono bg-white/5 text-zinc-400 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLeave}
                className="flex-1 py-1.5 rounded-lg text-[10px] font-mono bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
              >
                Leave
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RoomHeader;
