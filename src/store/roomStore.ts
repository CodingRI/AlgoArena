import { create } from 'zustand';
import type { Room, Member, JoinRequest } from '@/types';
import { MOCK_ROOM, MOCK_CURRENT_USER } from '@/mock/data';

interface RoomStore {
  currentRoom: Room | null;
  currentUser: Member;
  isInRoom: boolean;

  // Actions
  createRoom: (name: string, language: Room['language']) => Room;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  setRoom: (room: Room) => void;

  // Request management (host)
  acceptJoinRequest: (requestId: string) => void;
  rejectJoinRequest: (requestId: string) => void;

  // Member management
  updateMember: (memberId: string, updates: Partial<Member>) => void;
  removeMember: (memberId: string) => void;

  // Hand raising
  raiseHand: () => void;
  lowerHand: () => void;
}

export const useRoomStore = create<RoomStore>((set, get) => ({
  currentRoom: MOCK_ROOM, // Start with mock room for dev
  currentUser: MOCK_CURRENT_USER,
  isInRoom: true, // Mock: already in room

  createRoom: (name, language) => {
    const roomId = `COLLAB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const newRoom: Room = {
      id: roomId,
      name,
      hostId: get().currentUser.id,
      members: [{ ...get().currentUser, role: 'host' }],
      status: 'active',
      language,
      createdAt: Date.now(),
      maxMembers: 8,
      isLocked: false,
      pendingRequests: [],
      explanationSession: null,
    };
    set({ currentRoom: newRoom, isInRoom: true });
    return newRoom;
  },

  joinRoom: (roomId) => {
    console.log('[Room] Joining room:', roomId);
    // PLACEHOLDER: socket emit join request
    // socketService.send(SOCKET_EVENTS.JOIN_REQUEST_SEND, { roomId })
  },

  leaveRoom: () => {
    set({ currentRoom: null, isInRoom: false });
  },

  setRoom: (room) => set({ currentRoom: room }),

  acceptJoinRequest: (requestId) => {
    set((state) => {
      if (!state.currentRoom) return state;
      return {
        currentRoom: {
          ...state.currentRoom,
          pendingRequests: state.currentRoom.pendingRequests.map((r) =>
            r.id === requestId ? { ...r, status: 'accepted' as const } : r
          ),
        },
      };
    });
  },

  rejectJoinRequest: (requestId) => {
    set((state) => {
      if (!state.currentRoom) return state;
      return {
        currentRoom: {
          ...state.currentRoom,
          pendingRequests: state.currentRoom.pendingRequests.map((r) =>
            r.id === requestId ? { ...r, status: 'rejected' as const } : r
          ),
        },
      };
    });
  },

  updateMember: (memberId, updates) => {
    set((state) => {
      if (!state.currentRoom) return state;
      return {
        currentRoom: {
          ...state.currentRoom,
          members: state.currentRoom.members.map((m) =>
            m.id === memberId ? { ...m, ...updates } : m
          ),
        },
      };
    });
  },

  removeMember: (memberId) => {
    set((state) => {
      if (!state.currentRoom) return state;
      return {
        currentRoom: {
          ...state.currentRoom,
          members: state.currentRoom.members.filter((m) => m.id !== memberId),
        },
      };
    });
  },

  raiseHand: () => {
    const { currentUser } = get();
    set((state) => ({
      currentUser: { ...state.currentUser, hasRaisedHand: true },
    }));
    console.log('[Room] Hand raised by', currentUser.id);
  },

  lowerHand: () => {
    set((state) => ({ currentUser: { ...state.currentUser, hasRaisedHand: false } }));
  },
}));
