import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import MemberAvatar from '@/components/ui/MemberAvatar';
import { useRoomStore } from '@/store/roomStore';
import { LANGUAGES } from '@/constants';
import type { JoinRequest } from '@/types';
import { timeAgo } from '@/utils';

const JoinRequestCard = ({ request }: { request: JoinRequest }) => {
  const { acceptJoinRequest, rejectJoinRequest } = useRoomStore();
  const langConfig = LANGUAGES.find((l) => l.value === request.language);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      className="mx-2 mb-2 p-2.5 rounded-xl bg-galaxy-700/60 border border-violet-500/20
        shadow-[0_0_16px_rgba(139,92,246,0.1)] backdrop-blur-sm"
    >
      <div className="flex items-center gap-2.5">
        <MemberAvatar avatar={request.avatar} name={request.name} size="sm" showStatus={false} />
        <div className="flex-1 min-w-0">
          <span className="text-[12px] font-semibold text-zinc-200 block truncate font-display">
            {request.name}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            {langConfig && (
              <span className="text-[9px] font-mono" style={{ color: langConfig.color }}>
                {langConfig.label}
              </span>
            )}
            <span className="text-[9px] text-zinc-600 font-mono">
              {timeAgo(request.requestedAt)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => rejectJoinRequest(request.id)}
            className="w-7 h-7 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25
              flex items-center justify-center transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => acceptJoinRequest(request.id)}
            className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25
              flex items-center justify-center transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>

      <p className="text-[10px] text-zinc-500 mt-1.5 font-mono">
        wants to join the room
      </p>
    </motion.div>
  );
};

export default JoinRequestCard;
