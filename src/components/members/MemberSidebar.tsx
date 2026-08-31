import { motion, AnimatePresence } from 'framer-motion';
import { Crown, MicOff, Radio, StopCircle, UserMinus } from 'lucide-react';
import MemberAvatar from '@/components/ui/MemberAvatar';
import VoiceIndicator from '@/components/ui/VoiceIndicator';
import RaiseHandButton from '@/components/room/RaiseHandButton';
import HandRaiseCard from '@/components/room/HandRaiseCard';
import { useRoomStore } from '@/store/roomStore';
import { useVoiceStore, useExplanationStore } from '@/store/voiceStore';
import { LANGUAGES } from '@/constants';
import type { Member } from '@/types';
import { Hand } from 'lucide-react';
const MemberRow = ({ member, canKick, onKick }: { member: Member; canKick?: boolean; onKick?: () => void }) => {
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
          <span className="text-[12px] font-medium text-zinc-200 truncate font-display max-w-[120px]">
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
              <Hand className="w-3.5 h-3.5" />
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

      <div className="flex items-center gap-1 flex-shrink-0">
        {canKick && onKick && (
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={onKick}
            title="Remove from room"
            className="w-6 h-6 rounded-md flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <UserMinus className="w-3 h-3" />
          </motion.button>
        )}
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

const ExplanationControls = () => {
  const { currentRoom, currentUser } = useRoomStore();
  const { session, requestStartSession, requestEndSession, myRole, approvedToExplain } = useExplanationStore();
  const isSessionActive = !!session?.isActive;
  const isPresenter = myRole === 'presenter';
  const isAdmin = currentRoom?.hostId === currentUser.id;
  // Admin can always start; members need explicit approval from admin first
  const canStart = isAdmin || approvedToExplain;

  if (!currentRoom) return null;

  if (isSessionActive && isPresenter) {
    return (
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => requestEndSession(currentRoom.id)}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold
          bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 transition-all font-display"
      >
        <StopCircle className="w-3.5 h-3.5" />
        End Explanation
      </motion.button>
    );
  }

  if (isSessionActive) {
    return (
      <div className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs
        bg-violet-500/10 text-violet-400 border border-violet-500/20 font-mono">
        <motion.div className="w-2 h-2 rounded-full bg-red-400"
          animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
        Session in progress
      </div>
    );
  }

  return (
    <motion.button
      whileTap={canStart ? { scale: 0.95 } : {}}
      onClick={() => canStart && requestStartSession(currentUser.id, currentRoom.id)}
      disabled={!canStart}
      title={!canStart ? 'Raise your hand and wait for admin approval' : undefined}
      className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold
        transition-all font-display
        ${canStart
          ? 'bg-violet-500/10 text-violet-300 border border-violet-500/20 hover:bg-violet-500/20 hover:border-violet-500/40'
          : 'bg-white/[0.03] text-zinc-600 border border-white/5 cursor-not-allowed'
        }`}
    >
      <Radio className="w-3.5 h-3.5" />
      {approvedToExplain && !isAdmin ? 'Start Explanation ✓' : 'Start Explanation'}
    </motion.button>
  );
};

const MemberSidebar = () => {
  const { currentRoom, currentUser, kickMember } = useRoomStore();
  const members = (currentRoom?.members ?? []).filter((m) => !m.explicitlyLeft);
  const onlineMembers = members.filter((m) => m.status === 'online');
  const offlineMembers = members.filter((m) => m.status !== 'online');

  const isHost = currentRoom?.hostId === currentUser.id;
  // Members who have raised their hand (shown as approval cards for host only)
  const raisedHandMembers = members.filter((m) => m.hasRaisedHand && m.id !== currentUser.id);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Hand raise approvals — host only */}
      <AnimatePresence>
        {isHost && raisedHandMembers.map((m) => (
          <HandRaiseCard key={m.id} member={m} />
        ))}
      </AnimatePresence>

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
            {onlineMembers.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                canKick={isHost && m.id !== currentUser.id}
                onKick={() => kickMember(m.id)}
              />
            ))}
          </AnimatePresence>
        </div>

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
                <MemberRow
                  member={m}
                  canKick={isHost && m.id !== currentUser.id}
                  onKick={() => kickMember(m.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-3 py-2.5 border-t border-white/5 space-y-2">
        <ExplanationControls />
        <RaiseHandButton />
      </div>
    </div>
  );
};

export default MemberSidebar;
