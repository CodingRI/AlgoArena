import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatMessageItem from './ChatMessage';
import ChatInput from './ChatInput';
import { useChatStore, type TypingUser } from '@/store/chatStore';
import { useRoomStore } from '@/store/roomStore';
import { useAutoScroll } from '@/hooks';
import MemberAvatar from '@/components/ui/MemberAvatar';
import type { AvatarOption } from '@/types';

const TypingDots = () => (
  <span className="inline-flex items-center gap-[3px]" aria-hidden>
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        className="block w-[4px] h-[4px] rounded-full bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.7)]"
        animate={{ y: [0, -4, 0], opacity: [0.3, 1, 0.3], scale: [0.85, 1.15, 0.85] }}
        transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.14, ease: 'easeInOut' }}
      />
    ))}
  </span>
);

const TypingRow = ({
  user,
  avatar,
}: {
  user: TypingUser;
  avatar: AvatarOption;
}) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 8, scale: 0.94 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, x: -10, scale: 0.94 }}
    transition={{ type: 'spring', stiffness: 420, damping: 28 }}
    className="flex items-end gap-1.5 px-3 py-0.5"
  >
    <MemberAvatar avatar={avatar} name={user.name} size="xs" showStatus={false} />
    <div
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl rounded-bl-sm
        bg-violet-500/10 border border-violet-400/20
        shadow-[0_0_14px_rgba(139,92,246,0.14)]"
    >
      <TypingDots />
      <span className="text-[10px] text-zinc-400">
        <span className="font-medium text-zinc-200">{user.name}</span>
        <span className="italic"> is typing</span>
      </span>
    </div>
  </motion.div>
);

const TypingIndicator = ({ users }: { users: TypingUser[] }) => {
  const { currentRoom, currentUser } = useRoomStore();
  const others = users.filter((u) => u.id !== currentUser.id);
  if (others.length === 0) return null;

  return (
    <div className="flex flex-col gap-0.5 pb-1">
      <AnimatePresence initial={false}>
        {others.map((user) => {
          const member = currentRoom?.members.find((m) => m.id === user.id);
          const avatar = user.avatar ?? member?.avatar ?? 'ghost';
          return <TypingRow key={user.id} user={user} avatar={avatar} />;
        })}
      </AnimatePresence>
    </div>
  );
};

const ChatPanel = () => {
  const { messages, typingUsers, markAllRead } = useChatStore();
  const { currentUser } = useRoomStore();
  const bottomRef = useAutoScroll([messages.length, typingUsers.length]);

  useEffect(() => {
    markAllRead();
  }, [markAllRead]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-2 space-y-0.5" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(139,92,246,0.3) transparent' }}>
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => {
            const prevMsg = messages[idx - 1];
            const showAvatar = !prevMsg || prevMsg.senderId !== msg.senderId || msg.timestamp - prevMsg.timestamp > 120000;
            return (
              <ChatMessageItem
                key={msg.id}
                message={msg}
                isOwn={msg.senderId === currentUser.id}
                showAvatar={showAvatar}
              />
            );
          })}
        </AnimatePresence>

        <TypingIndicator users={typingUsers} />

        <div ref={bottomRef} />
      </div>

      <ChatInput />
    </div>
  );
};

export default ChatPanel;
