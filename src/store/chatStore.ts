import { create } from 'zustand';
import type { AvatarOption, ChatMessage } from '@/types';
import { CHAT_MAX_CONTENT, CHAT_MAX_PER_WINDOW, CHAT_WINDOW_MS, SOCKET_EVENTS } from '@/constants';
import socketService from '@/websockets/socketService';
import { useSettingsStore } from '@/store/panelStore';

const recentSends: number[] = [];

export type TypingUser = { id: string; name: string; avatar?: AvatarOption };

const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();
const TYPING_TTL_MS = 4000;

interface ChatStore {
  messages: ChatMessage[];
  typingUsers: TypingUser[];
  unreadCount: number;
  isChatVisible: boolean;

  // Outgoing — adds locally AND emits via WS
  sendMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp' | 'isRead'>) => boolean;
  // Incoming — adds locally only (called by storeHandlers)
  receiveMessage: (msg: ChatMessage) => void;

  markAllRead: () => void;
  clearMessages: () => void;
  setTyping: (user: TypingUser) => void;
  clearTyping: (userId: string) => void;
  toggleChatVisibility: () => void;
  setChatVisible: (visible: boolean) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  typingUsers: [],
  unreadCount: 0,
  isChatVisible: true,

  sendMessage: (msgData) => {
    const content = msgData.content.trim();
    if (!content || content.length > CHAT_MAX_CONTENT) return false;

    const now = Date.now();
    while (recentSends.length && recentSends[0] < now - CHAT_WINDOW_MS) {
      recentSends.shift();
    }
    if (recentSends.length >= CHAT_MAX_PER_WINDOW) return false;
    recentSends.push(now);

    const newMessage: ChatMessage = {
      ...msgData,
      content,
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: now,
      isRead: true,
    };

    set((state) => ({ messages: [...state.messages, newMessage] }));
    socketService.send(SOCKET_EVENTS.CHAT_MESSAGE, newMessage);
    return true;
  },

  receiveMessage: (msg) => {
    const focusMode = useSettingsStore.getState().settings.muteNotifications;
    set((state) => {
      const skipUnread =
        state.isChatVisible || focusMode || msg.type === 'system';
      return {
        messages: [...state.messages, { ...msg, isRead: skipUnread }],
        unreadCount: skipUnread ? state.unreadCount : state.unreadCount + 1,
      };
    });
  },

  setChatVisible: (visible) => {
    set((state) => {
      if (visible) {
        return {
          isChatVisible: true,
          unreadCount: 0,
          messages: state.messages.map((m) => ({ ...m, isRead: true })),
        };
      }
      return { isChatVisible: false };
    });
  },

  markAllRead: () => {
    set((state) => ({
      messages: state.messages.map((m) => ({ ...m, isRead: true })),
      unreadCount: 0,
    }));
  },

  clearMessages: () => {
    typingTimers.forEach((t) => clearTimeout(t));
    typingTimers.clear();
    set({ messages: [], typingUsers: [], unreadCount: 0 });
  },

  setTyping: (user) => {
    set((state) => {
      if (state.typingUsers.some((u) => u.id === user.id)) return state;
      return { typingUsers: [...state.typingUsers, user] };
    });
    const prev = typingTimers.get(user.id);
    if (prev) clearTimeout(prev);
    typingTimers.set(
      user.id,
      setTimeout(() => get().clearTyping(user.id), TYPING_TTL_MS)
    );
  },

  clearTyping: (userId) => {
    const prev = typingTimers.get(userId);
    if (prev) {
      clearTimeout(prev);
      typingTimers.delete(userId);
    }
    set((state) => ({
      typingUsers: state.typingUsers.filter((u) => u.id !== userId),
    }));
  },

  toggleChatVisibility: () => {
    set((state) => {
      if (!state.isChatVisible) {
        return {
          isChatVisible: true,
          messages: state.messages.map((m) => ({ ...m, isRead: true })),
          unreadCount: 0,
        };
      }
      return { isChatVisible: false };
    });
  },
}));
