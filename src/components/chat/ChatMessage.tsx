import { motion } from 'framer-motion';
import MemberAvatar from '@/components/ui/MemberAvatar';
import { formatTime } from '@/utils';
import type { ChatMessage as ChatMessageType } from '@/types';
import { LANGUAGES } from '@/constants';

interface Props {
  message: ChatMessageType;
  isOwn: boolean;
  showAvatar: boolean;
}

const CodeBlock = ({ content, language }: { content: string; language?: string }) => {
  const langConfig = LANGUAGES.find((l) => l.value === language);

  return (
    <div className="mt-1 rounded-lg overflow-hidden border border-white/10">
      {langConfig && (
        <div
          className="px-2.5 py-1 flex items-center gap-1.5"
          style={{ background: `${langConfig.color}18` }}
        >
          <div className="w-2 h-2 rounded-full" style={{ background: langConfig.color }} />
          <span className="text-[9px] font-mono font-medium" style={{ color: langConfig.color }}>
            {langConfig.label}
          </span>
        </div>
      )}
      <pre className="bg-galaxy-900/80 px-3 py-2.5 text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
        {content}
      </pre>
    </div>
  );
};

const ChatMessageItem = ({ message, isOwn, showAvatar }: Props) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-2 px-3 py-1 group hover:bg-white/[0.02] rounded-lg mx-1 ${isOwn ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 w-7 mt-0.5">
        {showAvatar ? (
          <MemberAvatar avatar={message.senderAvatar} name={message.senderName} size="sm" showStatus={false} />
        ) : null}
      </div>

      {/* Bubble */}
      <div className={`flex-1 min-w-0 ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        {showAvatar && (
          <div className={`flex items-baseline gap-1.5 mb-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
            <span className="text-[11px] font-semibold text-zinc-300 font-display">
              {isOwn ? 'You' : message.senderName}
            </span>
            <span className="text-[9px] text-zinc-600 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
              {formatTime(message.timestamp)}
            </span>
          </div>
        )}

        <div
          className={`max-w-[95%] rounded-xl px-3 py-2 text-[12px] leading-relaxed
            ${isOwn
              ? 'bg-violet-500/20 text-violet-100 rounded-tr-sm border border-violet-500/20'
              : 'bg-white/5 text-zinc-200 rounded-tl-sm border border-white/5'
            }`}
        >
          {message.type === 'code' ? (
            <CodeBlock content={message.content} language={message.language} />
          ) : (
            <span>{message.content}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ChatMessageItem;
