import { useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, MessageSquare, Mic, MicOff, Users } from 'lucide-react';
import NotificationBadge from '@/components/ui/NotificationBadge';
import VoiceIndicator from '@/components/ui/VoiceIndicator';
import SocketStatus from '@/components/ui/SocketStatus';
import { useChatStore } from '@/store/chatStore';
import { useVoiceStore } from '@/store/voiceStore';
import { useRoomStore } from '@/store/roomStore';
import { usePanelStore } from '@/store/panelStore';
import { onlineMemberCount } from '@/utils';
import socketService from '@/websockets/socketService';
import type { SocketStatus as SocketStatusType } from '@/types';

interface Props {
  onDragStart: (e: React.MouseEvent) => void;
  isDragging: boolean;
}

const CollapsedBar = ({ onDragStart }: Props) => {
  const { unreadCount } = useChatStore();
  const { voice, toggleMute, isVoiceEnabled, toggleVoice } = useVoiceStore();
  const { currentRoom } = useRoomStore();
  const { expandPanel, setActiveTab } = usePanelStore();

  const memberCount = onlineMemberCount(currentRoom);
  const isConnected = !!currentRoom;
  const wsStatus: SocketStatusType = !currentRoom
    ? 'disconnected'
    : socketService.isConnected ? 'connected' : 'connecting';

  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
    onDragStart(e);
  };

  const handleBarClick = (e: React.MouseEvent) => {
    if (!pointerDownPos.current) { expandPanel(); return; }
    const dx = Math.abs(e.clientX - pointerDownPos.current.x);
    const dy = Math.abs(e.clientY - pointerDownPos.current.y);
    pointerDownPos.current = null;
    if (dx <= 5 && dy <= 5) expandPanel(); // genuine click, not a drag
  };

  const handleMicClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isVoiceEnabled) {
      toggleVoice();
    } else {
      toggleMute();
    }
  };

  return (
    <motion.div
      className="flex items-center gap-2 px-3 h-full w-full select-none"
      onMouseDown={handleMouseDown}
      onClick={handleBarClick}
      style={{ cursor: 'pointer' }}
    >
      {/* Logo / Brand */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center shadow-glow-sm">
          <span className="text-[9px] font-bold text-white font-mono">AA</span>
        </div>
        <span className="text-xs font-semibold text-white/80 font-display tracking-wide hidden sm:block">
          Arena
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-white/10 flex-shrink-0" />

      {/* Room status */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <SocketStatus status={wsStatus} />
        {currentRoom && (
          <span className="text-[11px] text-zinc-300 truncate font-mono">
            {currentRoom.name}
          </span>
        )}
      </div>

      {/* Voice indicator */}
      {isConnected && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <VoiceIndicator isActive={voice.activeSpeakers.length > 0} isMuted={voice.isMuted} size="sm" />
        </div>
      )}

      {/* Member count */}
      {isConnected && memberCount > 0 && (
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Users className="w-3 h-3 text-zinc-400" />
          <span className="text-[10px] text-zinc-400 font-mono">{memberCount}</span>
        </div>
      )}

      {unreadCount > 0 && (
        <motion.button
          type="button"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: [1, 0.7, 1] }}
          transition={{ opacity: { duration: 1.3, repeat: Infinity } }}
          onClick={(e) => {
            e.stopPropagation();
            setActiveTab('chat');
            expandPanel();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          title="Open new messages"
          className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-violet-500/20 border border-violet-400/30 flex-shrink-0"
        >
          <MessageSquare className="w-3 h-3 text-violet-300" />
          <span className="text-[10px] text-violet-200 font-mono font-semibold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        </motion.button>
      )}

      {/* Mic / voice button — stopPropagation prevents bar click from also expanding */}
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={handleMicClick}
        onMouseDown={(e) => e.stopPropagation()}
        title={!isVoiceEnabled ? 'Enable voice' : voice.isMuted ? 'Unmute' : 'Mute'}
        className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-colors
          ${!isVoiceEnabled
            ? 'bg-white/5 text-zinc-600 hover:bg-white/10 hover:text-zinc-400'
            : voice.isMuted
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
          }`}
      >
        {isVoiceEnabled && !voice.isMuted ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
      </motion.button>

      {/* Expand button — calls expandPanel directly; stops propagation so the
          bar's handleBarClick doesn't also fire (would double-expand). */}
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={(e) => { e.stopPropagation(); expandPanel(); }}
        onMouseDown={(e) => e.stopPropagation()}
        className="flex-shrink-0 relative w-6 h-6 rounded-md bg-violet-500/20 text-violet-300
          hover:bg-violet-500/30 flex items-center justify-center transition-colors"
      >
        <ChevronUp className="w-3.5 h-3.5" />
        <NotificationBadge count={unreadCount} />
      </motion.button>
    </motion.div>
  );
};

export default CollapsedBar;
