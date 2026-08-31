import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Code2, Mic, MicOff, X } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { useVoiceStore } from '@/store/voiceStore';
import { useRoomStore } from '@/store/roomStore';
import { useTypingIndicator } from '@/hooks';
import type { Language } from '@/types';
import { CHAT_MAX_CONTENT, LANGUAGES, SOCKET_EVENTS } from '@/constants';
import socketService from '@/websockets/socketService';

const ChatInput = () => {
  const { sendMessage } = useChatStore();
  const { voice, isVoiceEnabled, toggleMute, toggleVoice } = useVoiceStore();
  const { currentUser, currentRoom } = useRoomStore();
  const [text, setText] = useState('');
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [codeLang, setCodeLang] = useState<Language>(currentUser.language);
  const [rateLimited, setRateLimited] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const emitTypingStart = useCallback(() => {
    if (!currentRoom) return;
    socketService.send(SOCKET_EVENTS.CHAT_TYPING_START, {
      userId: currentUser.id,
      userName: currentUser.name,
      avatar: currentUser.avatar,
    });
  }, [currentRoom, currentUser]);

  const emitTypingStop = useCallback(() => {
    if (!currentRoom) return;
    socketService.send(SOCKET_EVENTS.CHAT_TYPING_STOP, { userId: currentUser.id });
  }, [currentRoom, currentUser.id]);

  const { onInput: onTypingInput, stopImmediately } = useTypingIndicator(
    emitTypingStart,
    emitTypingStop
  );

  const handleMicClick = () => {
    if (!isVoiceEnabled) {
      toggleVoice();
      return;
    }
    toggleMute();
  };

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (trimmed.length > CHAT_MAX_CONTENT) return;

    stopImmediately();
    const sent = sendMessage({
      roomId: currentRoom?.id ?? '',
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      type: isCodeMode ? 'code' : 'text',
      content: trimmed,
      language: isCodeMode ? codeLang : undefined,
    });

    if (!sent) {
      setRateLimited(true);
      setTimeout(() => setRateLimited(false), 1800);
      return;
    }

    setText('');
    setIsCodeMode(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isCodeMode) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="px-2 py-2 border-t border-white/5 flex-shrink-0">
      <AnimatePresence>
        {isCodeMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-2 overflow-hidden"
          >
            <div className="flex items-center gap-1 mb-1.5 flex-wrap">
              <span className="text-[10px] text-zinc-500 font-mono">Language:</span>
              {LANGUAGES.slice(0, 5).map((l) => (
                <button
                  key={l.value}
                  onClick={() => setCodeLang(l.value)}
                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono transition-colors
                    ${codeLang === l.value ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  style={codeLang === l.value ? { background: `${l.color}30`, color: l.color } : {}}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`flex items-end gap-1.5 rounded-xl border bg-galaxy-800/60 backdrop-blur-sm transition-colors
        ${isCodeMode ? 'border-indigo-500/30' : 'border-white/10 focus-within:border-violet-500/30'}`}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            const value = e.target.value;
            setText(value);
            if (value.trim()) onTypingInput();
            else stopImmediately();
          }}
          onKeyDown={onKeyDown}
          placeholder={isCodeMode ? 'Paste your code...' : 'Message... (Enter to send)'}
          rows={isCodeMode ? 4 : 1}
          className={`flex-1 bg-transparent px-3 py-2.5 text-[12px] text-zinc-200 placeholder-zinc-600
            resize-none outline-none leading-relaxed min-h-[36px] max-h-32
            ${isCodeMode ? 'font-mono' : 'font-sans'}`}
          style={{ scrollbarWidth: 'none' }}
        />

        <div className="flex items-center gap-1 p-1.5">
          {/* Code toggle */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => setIsCodeMode(!isCodeMode)}
            className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors
              ${isCodeMode ? 'bg-indigo-500/30 text-indigo-300' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
          >
            {isCodeMode ? <X className="w-3 h-3" /> : <Code2 className="w-3 h-3" />}
          </motion.button>

          {/* Mic toggle */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleMicClick}
            title={!isVoiceEnabled ? 'Enable voice' : voice.isMuted ? 'Unmute' : 'Mute'}
            className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors
              ${!isVoiceEnabled
                ? 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                : voice.isMuted
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-emerald-500/15 text-emerald-400'
              }`}
          >
            {isVoiceEnabled && !voice.isMuted
              ? <Mic className="w-3 h-3" />
              : <MicOff className="w-3 h-3" />}
          </motion.button>

          {/* Send */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={send}
            disabled={!text.trim()}
            className={`w-6 h-6 rounded-md flex items-center justify-center transition-all
              ${text.trim()
                ? 'bg-violet-500 text-white shadow-glow-sm hover:bg-violet-400'
                : 'text-zinc-600 bg-white/5 cursor-not-allowed'
              }`}
          >
            <Send className="w-3 h-3" />
          </motion.button>
        </div>
      </div>

      <p className={`text-[9px] text-center mt-1 font-mono ${rateLimited ? 'text-amber-400' : 'text-zinc-700'}`}>
        {rateLimited
          ? 'Slow down — too many messages'
          : isCodeMode
            ? 'Shift+Enter for newline · Click send'
            : 'Enter to send · Shift+Enter for newline'}
      </p>
    </div>
  );
};

export default ChatInput;
