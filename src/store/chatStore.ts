import { create } from 'zustand';
import type { ChatMessage, Language } from '@/types';
import { MOCK_MESSAGES } from '@/mock/data';

interface ChatStore {
  messages: ChatMessage[];
  typingUsers: { id: string; name: string }[];
  unreadCount: number;
  isChatVisible: boolean;

  // Actions
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp' | 'isRead'>) => void;
  markAllRead: () => void;
  setTyping: (user: { id: string; name: string }) => void;
  clearTyping: (userId: string) => void;
  toggleChatVisibility: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: MOCK_MESSAGES,
  typingUsers: [],
  unreadCount: MOCK_MESSAGES.filter((m) => !m.isRead).length,
  isChatVisible: true,

  addMessage: (msgData) => {
    const newMessage: ChatMessage = {
      ...msgData,
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      isRead: get().isChatVisible,
    };

    set((state) => ({
      messages: [...state.messages, newMessage],
      unreadCount: get().isChatVisible ? state.unreadCount : state.unreadCount + 1,
    }));
  },

  markAllRead: () => {
    set((state) => ({
      messages: state.messages.map((m) => ({ ...m, isRead: true })),
      unreadCount: 0,
    }));
  },

  setTyping: (user) => {
    set((state) => {
      const exists = state.typingUsers.some((u) => u.id === user.id);
      if (exists) return state;
      return { typingUsers: [...state.typingUsers, user] };
    });

    // Auto clear typing after 3s
    setTimeout(() => get().clearTyping(user.id), 3000);
  },

  clearTyping: (userId) => {
    set((state) => ({
      typingUsers: state.typingUsers.filter((u) => u.id !== userId),
    }));
  },

  toggleChatVisibility: () => {
    set((state) => {
      if (!state.isChatVisible) {
        // Mark all as read when opening
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
