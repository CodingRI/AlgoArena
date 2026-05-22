import { motion, AnimatePresence } from 'framer-motion';
import { X, Radio, Eye, EyeOff, Pointer } from 'lucide-react';
import ExcalidrawPlaceholder from './ExcalidrawPlaceholder';
import MemberAvatar from '@/components/ui/MemberAvatar';
import { useExplanationStore } from '@/store/voiceStore';
import { useRoomStore } from '@/store/roomStore';
import { AVATARS } from '@/constants';

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

const FollowPresenterToggle = () => {
  const { isFollowingPresenter, toggleFollowPresenter } = useExplanationStore();

  return (
    <motion.button
      whileTap={{ scale: 0.93 }}
      onClick={toggleFollowPresenter}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all
        ${isFollowingPresenter
          ? 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-300'
          : 'bg-white/5 border border-white/10 text-zinc-400 hover:text-zinc-200'
        }`}
    >
      {isFollowingPresenter ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
      {isFollowingPresenter ? 'Following' : 'Follow Presenter'}
    </motion.button>
  );
};

const MiniParticipants = () => {
  const { currentRoom } = useRoomStore();
  const members = currentRoom?.members.slice(0, 5) ?? [];

  return (
    <div className="flex items-center gap-1">
      {members.map((m, i) => (
        <motion.div
          key={m.id}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          style={{ marginLeft: i > 0 ? -8 : 0 }}
        >
          <MemberAvatar avatar={m.avatar} name={m.name} size="xs" showStatus={false} />
        </motion.div>
      ))}
      {(currentRoom?.members.length ?? 0) > 5 && (
        <span className="text-[10px] text-zinc-500 ml-1 font-mono">
          +{(currentRoom?.members.length ?? 0) - 5}
        </span>
      )}
    </div>
  );
};

interface Props {
  isOpen: boolean;
}

const ExplanationOverlay = ({ isOpen }: Props) => {
  const { session, endSession, myRole } = useExplanationStore();
  const { currentRoom } = useRoomStore();
  const presenter = currentRoom?.members.find((m) => m.id === session?.presenterId);
  const presenterName = presenter?.name ?? 'Unknown';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex flex-col"
          style={{ background: 'rgba(3, 2, 10, 0.92)', backdropFilter: 'blur(4px)' }}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
            <PresenterBadge name={presenterName} />

            <div className="flex items-center gap-2">
              <MiniParticipants />

              {myRole === 'follower' && <FollowPresenterToggle />}

              {myRole === 'presenter' && (
                <motion.div whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-500/20 border border-violet-500/30 text-xs text-violet-300">
                  <Pointer className="w-3.5 h-3.5" />
                  Laser Pointer
                </motion.div>
              )}

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={endSession}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/15 border border-red-500/20
                  text-xs text-red-400 hover:bg-red-500/25 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Exit
              </motion.button>
            </div>
          </div>

          {/* Canvas area */}
          <div className="flex-1 min-h-0">
            <ExcalidrawPlaceholder />
          </div>

          {/* Bottom status */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-white/5 flex-shrink-0">
            <span className="text-[10px] text-zinc-600 font-mono">
              Explanation Mode — {myRole === 'presenter' ? 'You are presenting' : `Following ${presenterName}`}
            </span>
            <span className="text-[10px] text-zinc-700 font-mono">
              canvas sync • scroll sync • tab sync
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ExplanationOverlay;
