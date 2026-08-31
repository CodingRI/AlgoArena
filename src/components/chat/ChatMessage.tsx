import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy } from 'lucide-react';
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
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="mt-1 rounded-lg overflow-hidden border border-white/10 min-w-[160px]">
      <div
        className="px-2.5 py-1 flex items-center gap-1.5"
        style={{ background: langConfig ? `${langConfig.color}18` : 'rgba(255,255,255,0.04)' }}
      >
        {langConfig && (
          <>
            <div className="w-2 h-2 rounded-full" style={{ background: langConfig.color }} />
            <span className="text-[9px] font-mono font-medium" style={{ color: langConfig.color }}>
              {langConfig.label}
            </span>
          </>
        )}
        <button
          onClick={copy}
          className="ml-auto flex items-center gap-1 text-[9px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Copy code"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="bg-galaxy-900/80 px-3 py-2.5 text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
        {content}
      </pre>
    </div>
  );
};

const SystemMessage = ({ content }: { content: string }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.2 }}
    className="flex items-center justify-center px-3 py-1.5"
  >
    <span className="text-[10px] text-zinc-500 font-mono px-3 py-1 rounded-full bg-white/[0.03] border border-white/5">
      {content}
    </span>
  </motion.div>
);

const ChatMessageItem = ({ message, isOwn, showAvatar }: Props) => {
  if (message.type === 'system') {
    return <SystemMessage content={message.content} />;
  }

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
            <span className="text-[11px] font-semibold text-zinc-300 font-display truncate max-w-[140px]">
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
