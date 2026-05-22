import { motion } from 'framer-motion';

interface Props {
  isActive: boolean;
  isMuted: boolean;
  size?: 'sm' | 'md';
}

const VoiceIndicator = ({ isActive, isMuted, size = 'md' }: Props) => {
  const barCount = size === 'sm' ? 3 : 4;
  const heights = ['40%', '70%', '100%', '60%'];

  if (isMuted) {
    return (
      <div className={`flex items-center gap-0.5 ${size === 'sm' ? 'h-3' : 'h-4'}`}>
        {Array.from({ length: barCount }).map((_, i) => (
          <div
            key={i}
            className={`${size === 'sm' ? 'w-[2px]' : 'w-[3px]'} rounded-full bg-zinc-600`}
            style={{ height: heights[i] }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-0.5 ${size === 'sm' ? 'h-3' : 'h-4'}`}>
      {Array.from({ length: barCount }).map((_, i) => (
        <motion.div
          key={i}
          className={`${size === 'sm' ? 'w-[2px]' : 'w-[3px]'} rounded-full`}
          style={{
            background: isActive ? 'rgb(52, 211, 153)' : 'rgb(99, 102, 241)',
            height: heights[i],
          }}
          animate={
            isActive
              ? {
                  scaleY: [1, 0.4 + Math.random() * 1.2, 0.6, 1],
                  opacity: [1, 0.8, 1],
                }
              : { scaleY: 1 }
          }
          transition={{
            duration: 0.6 + i * 0.1,
            repeat: isActive ? Infinity : 0,
            delay: i * 0.08,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

export default VoiceIndicator;
