import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  count: number;
  className?: string;
}

const NotificationBadge = ({ count, className = '' }: Props) => (
  <AnimatePresence>
    {count > 0 && (
      <motion.span
        key="badge"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full
          bg-gradient-to-br from-violet-500 to-indigo-600
          text-white text-[10px] font-bold font-mono
          flex items-center justify-center
          shadow-[0_0_8px_rgba(139,92,246,0.7)]
          ${className}`}
      >
        {count > 9 ? '9+' : count}
      </motion.span>
    )}
  </AnimatePresence>
);

export default NotificationBadge;
