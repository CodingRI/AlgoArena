import { motion } from 'framer-motion';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import type { SocketStatus as SocketStatusType } from '@/types';

interface Props {
  status: SocketStatusType;
  showLabel?: boolean;
}

const STATUS_CONFIG: Record<SocketStatusType, { color: string; glow: string; label: string }> = {
  connected: { color: 'bg-emerald-400', glow: 'shadow-[0_0_6px_rgba(52,211,153,0.6)]', label: 'Live' },
  connecting: { color: 'bg-amber-400', glow: 'shadow-[0_0_6px_rgba(251,191,36,0.6)]', label: 'Connecting' },
  reconnecting: { color: 'bg-amber-400', glow: 'shadow-[0_0_6px_rgba(251,191,36,0.6)]', label: 'Reconnecting' },
  disconnected: { color: 'bg-zinc-500', glow: '', label: 'Offline' },
  error: { color: 'bg-red-400', glow: 'shadow-[0_0_6px_rgba(248,113,113,0.6)]', label: 'Error' },
};

const SocketStatus = ({ status, showLabel = false }: Props) => {
  const config = STATUS_CONFIG[status];
  const isPulsing = status === 'connected';
  const isSpinning = status === 'connecting' || status === 'reconnecting';

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative flex items-center justify-center w-4 h-4">
        {isPulsing && (
          <motion.div
            className={`absolute w-3 h-3 rounded-full ${config.color} opacity-30`}
            animate={{ scale: [1, 2], opacity: [0.3, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
        {isSpinning ? (
          <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
        ) : (
          <div className={`w-2 h-2 rounded-full ${config.color} ${config.glow}`} />
        )}
      </div>
      {showLabel && (
        <span className="text-[10px] font-mono text-zinc-400">{config.label}</span>
      )}
    </div>
  );
};

export default SocketStatus;
