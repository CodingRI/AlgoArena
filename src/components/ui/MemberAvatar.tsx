import { motion } from 'framer-motion';
import { AVATARS } from '@/constants';
import type { AvatarOption } from '@/types';

interface Props {
  avatar: AvatarOption;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isSpeaking?: boolean;
  isMuted?: boolean;
  isOnline?: boolean;
  showStatus?: boolean;
  className?: string;
}

const SIZES = { xs: 'w-6 h-6 text-xs', sm: 'w-8 h-8 text-sm', md: 'w-10 h-10 text-base', lg: 'w-12 h-12 text-lg' };
const DOT_SIZES = { xs: 'w-1.5 h-1.5', sm: 'w-2 h-2', md: 'w-2.5 h-2.5', lg: 'w-3 h-3' };

const MemberAvatar = ({
  avatar,
  name,
  size = 'md',
  isSpeaking = false,
  isMuted = false,
  isOnline = true,
  showStatus = true,
  className = '',
}: Props) => {
  const config = AVATARS[avatar];

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      {/* Speaking ring */}
      {isSpeaking && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ boxShadow: `0 0 0 2px ${config.color}` }}
          animate={{ boxShadow: [`0 0 0 2px ${config.color}`, `0 0 0 5px ${config.glow}`, `0 0 0 2px ${config.color}`] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      )}

      <div
        className={`${SIZES[size]} rounded-full flex items-center justify-center
          bg-galaxy-700 border border-white/10 relative overflow-hidden`}
        style={isSpeaking ? { boxShadow: `0 0 12px ${config.glow}` } : undefined}
        title={name}
      >
        <span>{config.emoji}</span>
      </div>

      {/* Status dot */}
      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 ${DOT_SIZES[size]} rounded-full border border-galaxy-800
            ${isOnline ? 'bg-emerald-400' : 'bg-zinc-500'}`}
        />
      )}

      {/* Muted indicator */}
      {isMuted && (
        <span className={`absolute -top-0.5 -right-0.5 ${DOT_SIZES[size]} rounded-full bg-red-500 border border-galaxy-800`} />
      )}
    </div>
  );
};

export default MemberAvatar;
