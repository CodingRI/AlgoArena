import { motion } from 'framer-motion';
import { ChevronDown, Copy, Settings, Users, Check, LogOut } from 'lucide-react';
import { useState } from 'react';
import SocketStatus from '@/components/ui/SocketStatus';
import { useRoomStore } from '@/store/roomStore';
import { usePanelStore } from '@/store/panelStore';
import { LANGUAGES } from '@/constants';

const RoomHeader = () => {
  const { currentRoom, leaveRoom } = useRoomStore();
  const { collapsePanel, toggleSettings, setActiveTab } = usePanelStore();
  const [copied, setCopied] = useState(false);

  const copyRoomId = () => {
    if (!currentRoom) return;
    navigator.clipboard.writeText(currentRoom.id).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const langConfig = LANGUAGES.find((l) => l.value === currentRoom?.language);

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5 flex-shrink-0">
      {/* Logo */}
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-700
        flex items-center justify-center shadow-glow-sm flex-shrink-0">
        <span className="text-[10px] font-bold text-white font-mono">LC</span>
      </div>

      {/* Room info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-white truncate font-display">
            {currentRoom?.name ?? 'LeetCode Collab'}
          </span>
          {langConfig && (
            <span
              className="text-[9px] px-1 py-0.5 rounded font-mono flex-shrink-0"
              style={{ background: `${langConfig.color}22`, color: langConfig.color }}
            >
              {langConfig.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <SocketStatus status="connected" showLabel />
          {currentRoom && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={copyRoomId}
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
          className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <Users className="w-3.5 h-3.5" />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={toggleSettings}
          className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={collapsePanel}
          className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </motion.button>
      </div>
    </div>
  );
};

export default RoomHeader;
