import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatMessageItem from './ChatMessage';
import ChatInput from './ChatInput';
import { useChatStore } from '@/store/chatStore';
import { useRoomStore } from '@/store/roomStore';
import { useAutoScroll } from '@/hooks';
import MemberAvatar from '@/components/ui/MemberAvatar';

const TypingIndicator = ({ users }: { users: { id: string; name: string }[] }) => {
  if (users.length === 0) return null;
  const label =
    users.length === 1
      ? `${users[0].name} is typing...`
      : `${users.map((u) => u.name).join(', ')} are typing...`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="flex items-center gap-2 px-4 py-1.5"
    >
      <div className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1 h-1 rounded-full bg-violet-400"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
      <span className="text-[10px] text-zinc-500 italic">{label}</span>
    </motion.div>
  );
};

const ChatPanel = () => {
  const { messages, typingUsers, markAllRead } = useChatStore();
  const { currentUser } = useRoomStore();
  const bottomRef = useAutoScroll([messages.length]);

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

        <AnimatePresence>
          <TypingIndicator users={typingUsers} />
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      <ChatInput />
    </div>
  );
};

export default ChatPanel;
