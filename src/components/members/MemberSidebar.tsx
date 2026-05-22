import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Hand, Mic, MicOff, Circle } from 'lucide-react';
import MemberAvatar from '@/components/ui/MemberAvatar';
import VoiceIndicator from '@/components/ui/VoiceIndicator';
import RaiseHandButton from '@/components/room/RaiseHandButton';
import { useRoomStore } from '@/store/roomStore';
import { useVoiceStore } from '@/store/voiceStore';
import { LANGUAGES } from '@/constants';
import type { Member } from '@/types';

const MemberRow = ({ member }: { member: Member }) => {
  const { voice } = useVoiceStore();
  const isSpeaking = voice.activeSpeakers.includes(member.id);
  const langConfig = LANGUAGES.find((l) => l.value === member.language);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-2.5 px-3 py-2 mx-1 rounded-lg transition-colors hover:bg-white/[0.03]
        ${isSpeaking ? 'bg-emerald-500/5 border border-emerald-500/10' : ''}`}
    >
      <MemberAvatar
        avatar={member.avatar}
        name={member.name}
        size="sm"
        isSpeaking={isSpeaking}
        isMuted={member.isMuted}
        isOnline={member.status === 'online'}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-medium text-zinc-200 truncate font-display">
            {member.name}
          </span>
          {member.role === 'host' && (
            <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />
          )}
          {member.hasRaisedHand && (
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="text-[11px]"
            >
              ✋
            </motion.span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {langConfig && (
            <span className="text-[9px] font-mono" style={{ color: langConfig.color }}>
              {langConfig.label}
            </span>
          )}
          {member.isInExplanationMode && (
            <span className="text-[9px] text-violet-400 font-mono">presenting</span>
          )}
        </div>
      </div>

      {/* Voice state */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {isSpeaking ? (
          <VoiceIndicator isActive isMuted={false} size="sm" />
        ) : member.isMuted ? (
          <MicOff className="w-3 h-3 text-red-400/60" />
        ) : (
          <div className="w-3 h-3" />
        )}
      </div>
    </motion.div>
  );
};

const MemberSidebar = () => {
  const { currentRoom, currentUser } = useRoomStore();
  const members = currentRoom?.members ?? [];
  const onlineMembers = members.filter((m) => m.status === 'online');
  const offlineMembers = members.filter((m) => m.status !== 'online');

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto py-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(139,92,246,0.2) transparent' }}>
        {/* Online */}
        <div className="mb-1">
          <div className="flex items-center gap-1.5 px-3 py-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.6)]" />
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
              Online — {onlineMembers.length}
            </span>
          </div>
          <AnimatePresence>
            {onlineMembers.map((m) => <MemberRow key={m.id} member={m} />)}
          </AnimatePresence>
        </div>

        {/* Offline */}
        {offlineMembers.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 mt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
                Away — {offlineMembers.length}
              </span>
            </div>
            {offlineMembers.map((m) => (
              <div key={m.id} className="opacity-50">
                <MemberRow member={m} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Raise Hand button at bottom */}
      <div className="px-3 py-2.5 border-t border-white/5">
        <RaiseHandButton />
      </div>
    </div>
  );
};

export default MemberSidebar;
