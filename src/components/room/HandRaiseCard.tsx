import { motion } from 'framer-motion';
import { Hand, Play, X } from 'lucide-react';
import MemberAvatar from '@/components/ui/MemberAvatar';
import { useRoomStore } from '@/store/roomStore';
import { SOCKET_EVENTS } from '@/constants';
import socketService from '@/websockets/socketService';
import type { Member } from '@/types';
const HandRaiseCard = ({ member }: { member: Member }) => {
  const { currentRoom } = useRoomStore();

  const handleAllow = () => {
    if (!currentRoom) return;
    // Send targeted approval to the specific member; they will then start the session themselves
    socketService.send(SOCKET_EVENTS.HAND_APPROVED, { userId: member.id }, member.id);
    // Clear their raised-hand state from the room
    socketService.send(SOCKET_EVENTS.HAND_DISMISS, { userId: member.id });
  };

  const handleDismiss = () => {
    if (!currentRoom) return;
    socketService.send(SOCKET_EVENTS.HAND_DISMISS, { userId: member.id });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      className="mx-2 mb-2 p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20
        shadow-[0_0_12px_rgba(245,158,11,0.08)] backdrop-blur-sm"
    >
      <div className="flex items-center gap-2.5">
        <div className="relative">
          <MemberAvatar avatar={member.avatar} name={member.name} size="sm" showStatus={false} />
          <motion.div
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500/20
              flex items-center justify-center text-[9px]"
            animate={{ rotate: [0, -15, 15, -10, 10, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 2 }}
          >
            <Hand className="w-3.5 h-3.5" />
          </motion.div>
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-[12px] font-semibold text-zinc-200 block truncate font-display">
            {member.name}
          </span>
          <span className="text-[9px] text-zinc-500 font-mono">wants to explain</span>
        </div>

        <div className="flex items-center gap-1">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleDismiss}
            className="w-7 h-7 rounded-lg bg-zinc-500/15 text-zinc-400 hover:bg-zinc-500/25
              flex items-center justify-center transition-colors"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleAllow}
            className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 hover:bg-amber-500/25
              flex items-center justify-center transition-colors"
            title="Allow to explain"
          >
            <Play className="w-3 h-3 fill-amber-400" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default HandRaiseCard;
