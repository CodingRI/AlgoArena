import { create } from 'zustand';
import type { Room, Member, JoinRequest, Language, AvatarOption, KnownRoom } from '@/types';
import { SOCKET_EVENTS } from '@/constants';
import { getOrCreateUserId, getOrSetUserName, loadKnownRooms, saveKnownRooms } from '@/utils';
import socketService from '@/websockets/socketService';
import { roomService } from '@/services/roomService';
import { registerSocketHandlers } from '@/websockets/storeHandlers';
import { usePanelStore } from '@/store/panelStore';
import { useChatStore } from '@/store/chatStore';

const LS_ROOM_KEY = 'algo-arena-room-id';

// Persist a stable user identity across sessions
const persistedUserId = getOrCreateUserId();
const persistedUserName = getOrSetUserName();

const defaultCurrentUser: Member = {
  id: persistedUserId,
  name: persistedUserName,
  avatar: 'hacker',
  role: 'member',
  status: 'online',
  language: 'python',
  isSpeaking: false,
  isMuted: false,
  isInExplanationMode: false,
  hasRaisedHand: false,
  joinedAt: Date.now(),
};

export type JoinRequestStatus = 'idle' | 'pending' | 'accepted' | 'rejected';

function upsertKnownRoom(rooms: KnownRoom[], next: KnownRoom): KnownRoom[] {
  const rest = rooms.filter((r) => r.roomId !== next.roomId);
  return [next, ...rest];
}

interface RoomStore {
  currentRoom: Room | null;
  currentUser: Member;
  isInRoom: boolean;
  joinRequestStatus: JoinRequestStatus;
  knownRooms: KnownRoom[];
  socketCleanup: (() => void) | null;

  createRoom: (
    name: string,
    language: Language,
    avatar: AvatarOption,
    hostName: string
  ) => Promise<Room>;
  joinRoom: (
    roomId: string,
    name: string,
    avatar: AvatarOption,
    language: Language
  ) => Promise<JoinRequest>;
  rejoinRoom: (roomId: string) => Promise<JoinRequest>;
  leaveRoom: () => void;
  setRoom: (room: Room) => void;
  setJoinRequestStatus: (status: JoinRequestStatus) => void;
  handleJoinRejected: () => void;
  handleKicked: () => void;
  kickMember: (userId: string) => void;
  pruneKnownRooms: () => Promise<void>;
  wasKicked: boolean;
  clearKickNotice: () => void;

  // Called on app mount — reconnects to a room if one was active before a refresh. */
  initFromStorage: () => Promise<void>;

  acceptJoinRequest: (requestId: string) => void;
  rejectJoinRequest: (requestId: string) => void;

  updateMember: (memberId: string, updates: Partial<Member>) => void;
  removeMember: (memberId: string) => void;

  deleteRoom: () => Promise<void>;
  handleRoomDeleted: () => void;

  raiseHand: () => void;
  lowerHand: () => void;
}

let socketHandlerCleanup: (() => void) | null = null;

function rememberFromRoom(room: Room, user: Member): KnownRoom {
  const me = room.members.find((m) => m.id === user.id);
  return {
    roomId: room.id,
    roomName: room.name,
    name: me?.name ?? user.name,
    avatar: me?.avatar ?? user.avatar,
    language: me?.language ?? user.language,
  };
}

export const useRoomStore = create<RoomStore>((set, get) => ({
  currentRoom: null,
  currentUser: defaultCurrentUser,
  isInRoom: false,
  joinRequestStatus: 'idle',
  knownRooms: loadKnownRooms(),
  wasKicked: false,
  socketCleanup: null,

  createRoom: async (name, language, avatar, hostName) => {
    const { currentUser } = get();
    const userId = currentUser.id;

    getOrSetUserName(hostName);
    set((s) => ({ currentUser: { ...s.currentUser, name: hostName, avatar, language } }));

    useChatStore.getState().clearMessages();

    const room = await roomService.createRoom(name, language, userId, hostName, avatar);

    localStorage.setItem(LS_ROOM_KEY, room.id);
    const known = rememberFromRoom(room, { ...get().currentUser, name: hostName, avatar, language });
    const knownRooms = upsertKnownRoom(get().knownRooms, known);
    saveKnownRooms(knownRooms);

    set({ currentRoom: room, isInRoom: true, joinRequestStatus: 'idle', knownRooms, wasKicked: false });

    if (socketHandlerCleanup) socketHandlerCleanup();
    socketHandlerCleanup = registerSocketHandlers();
    socketService.connect(room.id, userId);

    usePanelStore.getState().setActiveTab('members');

    return room;
  },

  joinRoom: async (roomId, name, avatar, language) => {
    const { currentUser, knownRooms } = get();
    const userId = currentUser.id;
    const known = knownRooms.find((r) => r.roomId === roomId);

    // Returning members must reuse the identity they originally joined with.
    const joinName = known?.name ?? name;
    const joinAvatar = known?.avatar ?? avatar;
    const joinLanguage = known?.language ?? language;

    if (!known) {
      getOrSetUserName(joinName);
      set((s) => ({
        currentUser: { ...s.currentUser, name: joinName, avatar: joinAvatar, language: joinLanguage },
      }));
    }

    useChatStore.getState().clearMessages();

    const joinRequest = await roomService.joinRoom(roomId, userId, joinName, joinAvatar, joinLanguage);

    if (socketHandlerCleanup) socketHandlerCleanup();
    socketHandlerCleanup = registerSocketHandlers();

    if (joinRequest.status === 'accepted') {
      set((s) => ({
        currentUser: {
          ...s.currentUser,
          name: joinRequest.name,
          avatar: joinRequest.avatar,
          language: joinRequest.language,
        },
        joinRequestStatus: 'accepted',
        wasKicked: false,
      }));
      localStorage.setItem(LS_ROOM_KEY, roomId);
      usePanelStore.getState().setActiveTab('chat');
    } else {
      set({ joinRequestStatus: 'pending', wasKicked: false });
    }

    socketService.connect(roomId, userId);
    return joinRequest;
  },

  rejoinRoom: async (roomId) => {
    const known = get().knownRooms.find((r) => r.roomId === roomId);
    if (!known) {
      throw new Error('No saved identity for this room');
    }
    return get().joinRoom(roomId, known.name, known.avatar, known.language);
  },

  leaveRoom: () => {
    const { currentRoom, currentUser, knownRooms, joinRequestStatus } = get();
    if (joinRequestStatus === 'pending') {
      socketService.send(SOCKET_EVENTS.JOIN_REQUEST_CANCEL, {});
    }
    if (currentRoom) {
      socketService.send(SOCKET_EVENTS.ROOM_LEAVE, { userId: currentUser.id });
      const known = rememberFromRoom(currentRoom, currentUser);
      const next = upsertKnownRoom(knownRooms, known);
      saveKnownRooms(next);
      set({ knownRooms: next });
    }
    socketService.disconnect();
    if (socketHandlerCleanup) {
      socketHandlerCleanup();
      socketHandlerCleanup = null;
    }
    localStorage.removeItem(LS_ROOM_KEY);
    useChatStore.getState().clearMessages();
    usePanelStore.getState().setActiveTab('room');
    set({ currentRoom: null, isInRoom: false, joinRequestStatus: 'idle' });
  },

  setRoom: (room) => {
    const { currentUser, joinRequestStatus, knownRooms } = get();
    const me = room.members.find((m) => m.id === currentUser.id);
    if (!me) {
      if (get().isInRoom) {
        get().handleKicked();
      }
      return;
    }
    const known = rememberFromRoom(room, { ...currentUser, ...me });
    const nextKnown = upsertKnownRoom(knownRooms, known);
    saveKnownRooms(nextKnown);
    localStorage.setItem(LS_ROOM_KEY, room.id);
    set({
      currentRoom: room,
      isInRoom: true,
      knownRooms: nextKnown,
      currentUser: {
        ...currentUser,
        name: me.name,
        avatar: me.avatar,
        language: me.language,
        role: me.role,
        status: me.status,
        hasRaisedHand: me.hasRaisedHand,
      },
      joinRequestStatus: joinRequestStatus === 'pending' ? 'accepted' : joinRequestStatus,
    });
  },

  setJoinRequestStatus: (status) => set({ joinRequestStatus: status }),

  handleJoinRejected: () => {
    socketService.disconnect();
    if (socketHandlerCleanup) {
      socketHandlerCleanup();
      socketHandlerCleanup = null;
    }
    localStorage.removeItem(LS_ROOM_KEY);
    useChatStore.getState().clearMessages();
    usePanelStore.getState().setActiveTab('room');
    set({ currentRoom: null, isInRoom: false, joinRequestStatus: 'rejected' });
  },

  handleKicked: () => {
    const { currentRoom, knownRooms } = get();
    const next = currentRoom ? knownRooms.filter((r) => r.roomId !== currentRoom.id) : knownRooms;
    saveKnownRooms(next);
    socketService.disconnect();
    if (socketHandlerCleanup) {
      socketHandlerCleanup();
      socketHandlerCleanup = null;
    }
    localStorage.removeItem(LS_ROOM_KEY);
    useChatStore.getState().clearMessages();
    usePanelStore.getState().setActiveTab('room');
    set({
      currentRoom: null,
      isInRoom: false,
      joinRequestStatus: 'idle',
      knownRooms: next,
      wasKicked: true,
    });
  },

  clearKickNotice: () => set({ wasKicked: false }),

  kickMember: (userId) => {
    const { currentRoom, currentUser } = get();
    if (!currentRoom || currentRoom.hostId !== currentUser.id) return;
    if (userId === currentUser.id) return;
    socketService.send(SOCKET_EVENTS.ROOM_KICK, { userId });
  },

  pruneKnownRooms: async () => {
    const { knownRooms, currentRoom } = get();
    if (knownRooms.length === 0) return;
    const surviving: KnownRoom[] = [];
    await Promise.all(
      knownRooms.map(async (known) => {
        if (currentRoom?.id === known.roomId) {
          surviving.push(known);
          return;
        }
        try {
          const room = await roomService.getRoomState(known.roomId);
          if (room) surviving.push(known);
        } catch {
          surviving.push(known);
        }
      })
    );
    saveKnownRooms(surviving);
    set({ knownRooms: surviving });
  },

  initFromStorage: async () => {
    const { currentRoom } = get();
    if (currentRoom) return;

    const storedRoomId = localStorage.getItem(LS_ROOM_KEY);
    if (!storedRoomId) return;

    try {
      const room = await roomService.getRoomState(storedRoomId);
      if (!room) {
        localStorage.removeItem(LS_ROOM_KEY);
        return;
      }
      const userId = persistedUserId;
      const isMember = room.members.some((m) => m.id === userId && !m.explicitlyLeft);

      if (!isMember) {
        localStorage.removeItem(LS_ROOM_KEY);
        return;
      }

      const me = room.members.find((m) => m.id === userId);
      if (me) {
        set((s) => ({
          currentUser: {
            ...s.currentUser,
            name: me.name,
            avatar: me.avatar,
            language: me.language,
            role: me.role,
          },
        }));
      }

      set({ currentRoom: room, isInRoom: true, joinRequestStatus: 'idle' });

      if (socketHandlerCleanup) socketHandlerCleanup();
      socketHandlerCleanup = registerSocketHandlers();
      socketService.connect(room.id, userId);
    } catch {
      localStorage.removeItem(LS_ROOM_KEY);
    }
  },

  acceptJoinRequest: (requestId) => {
    const { currentRoom } = get();
    if (!currentRoom) return;
    socketService.send(SOCKET_EVENTS.JOIN_REQUEST_ACCEPT, { requestId });
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
    const { currentRoom } = get();
    if (!currentRoom) return;
    socketService.send(SOCKET_EVENTS.JOIN_REQUEST_REJECT, { requestId });
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

  deleteRoom: async () => {
    const { currentRoom } = get();
    if (!currentRoom) return;
    await roomService.deleteRoom(currentRoom.id);
    get().handleRoomDeleted();
  },

  handleRoomDeleted: () => {
    const { currentRoom, knownRooms } = get();
    const next = currentRoom ? knownRooms.filter((r) => r.roomId !== currentRoom.id) : knownRooms;
    saveKnownRooms(next);
    socketService.disconnect();
    if (socketHandlerCleanup) {
      socketHandlerCleanup();
      socketHandlerCleanup = null;
    }
    localStorage.removeItem(LS_ROOM_KEY);
    useChatStore.getState().clearMessages();
    set({ currentRoom: null, isInRoom: false, joinRequestStatus: 'idle', knownRooms: next });
    usePanelStore.getState().setActiveTab('room');
  },

  raiseHand: () => {
    const { currentRoom, currentUser } = get();
    if (!currentRoom) return;
    socketService.send(SOCKET_EVENTS.HAND_RAISE, {});
    set((s) => ({ currentUser: { ...s.currentUser, hasRaisedHand: true } }));
  },

  lowerHand: () => {
    const { currentRoom } = get();
    if (!currentRoom) return;
    socketService.send(SOCKET_EVENTS.HAND_LOWER, {});
    set((s) => ({ currentUser: { ...s.currentUser, hasRaisedHand: false } }));
  },
}));
