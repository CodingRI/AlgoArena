import { motion } from 'framer-motion';
import { Hand } from 'lucide-react';
import { useRoomStore } from '@/store/roomStore';

const RaiseHandButton = () => {
  const { currentUser, raiseHand, lowerHand } = useRoomStore();
  const isRaised = currentUser.hasRaisedHand;

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={isRaised ? lowerHand : raiseHand}
      className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold
        transition-all duration-300 font-display
        ${isRaised
          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
          : 'bg-white/5 text-zinc-400 border border-white/10 hover:bg-violet-500/10 hover:text-violet-300 hover:border-violet-500/20'
        }`}
    >
      <motion.span
        animate={isRaised ? { rotate: [0, -15, 15, -10, 0] } : {}}
        transition={{ duration: 0.5 }}
        className="text-sm"
      >
        ✋
      </motion.span>
      {isRaised ? 'Lower Hand' : 'Raise Hand to Explain'}
    </motion.button>
  );
};

export default RaiseHandButton;
