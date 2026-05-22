import { motion } from 'framer-motion';
import { ChevronUp, Mic, MicOff, Users } from 'lucide-react';
import NotificationBadge from '@/components/ui/NotificationBadge';
import VoiceIndicator from '@/components/ui/VoiceIndicator';
import SocketStatus from '@/components/ui/SocketStatus';
import { useChatStore } from '@/store/chatStore';
import { useVoiceStore } from '@/store/voiceStore';
import { useRoomStore } from '@/store/roomStore';
import { usePanelStore } from '@/store/panelStore';

interface Props {
  onDragStart: (e: React.MouseEvent) => void;
  isDragging: boolean;
}

const CollapsedBar = ({ onDragStart, isDragging }: Props) => {
  const { unreadCount } = useChatStore();
  const { voice, toggleMute } = useVoiceStore();
  const { currentRoom } = useRoomStore();
  const { expandPanel } = usePanelStore();

  const memberCount = currentRoom?.members.length ?? 0;
  const isConnected = !!currentRoom;

  return (
    <motion.div
      className="flex items-center gap-2 px-3 h-full w-full cursor-grab active:cursor-grabbing select-none"
      onMouseDown={onDragStart}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {/* Logo / Brand */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center shadow-glow-sm">
          <span className="text-[9px] font-bold text-white font-mono">LC</span>
        </div>
        <span className="text-xs font-semibold text-white/80 font-display tracking-wide hidden sm:block">
          Collab
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-white/10 flex-shrink-0" />

      {/* Room status */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <SocketStatus status={isConnected ? 'connected' : 'disconnected'} />
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

      {/* Mute button */}
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={(e) => { e.stopPropagation(); toggleMute(); }}
        onMouseDown={(e) => e.stopPropagation()}
        className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-colors
          ${voice.isMuted
            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
            : 'bg-white/5 text-zinc-300 hover:bg-white/10'
          }`}
      >
        {voice.isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
      </motion.button>

      {/* Expand button with badge */}
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
