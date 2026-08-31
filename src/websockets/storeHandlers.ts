import { SOCKET_EVENTS } from '@/constants';
import socketService from './socketService';
import { useRoomStore } from '@/store/roomStore';
import { useChatStore } from '@/store/chatStore';
import { useVoiceStore, useExplanationStore } from '@/store/voiceStore';
import { usePanelStore, useSettingsStore } from '@/store/panelStore';
import { playChatChime, playNotificationPing } from '@/utils/sounds';
import type { Room, ChatMessage, JoinRequest, AvatarOption } from '@/types';

function syncExplanationSession(room: Room) {
  const serverSession = room.explanationSession;
  const expStore = useExplanationStore.getState();

  if (serverSession?.isActive && !expStore.session?.isActive) {
    const currentUserId = useRoomStore.getState().currentUser.id;
    expStore.startSession(
      serverSession.presenterId,
      room.id,
      serverSession.canvasData ?? null,
    );
    expStore.setMyRole(serverSession.presenterId === currentUserId ? 'presenter' : 'follower');
  } else if (serverSession?.isActive && expStore.session?.isActive) {
    useExplanationStore.setState((state) => ({
      session: state.session
        ? {
            ...state.session,
            canvasData: serverSession.canvasData ?? state.session.canvasData,
          }
        : null,
    }));
  } else if (!serverSession?.isActive && expStore.session?.isActive) {
    expStore.endSession();
  }
}

export function registerSocketHandlers(): () => void {
  const unsubs: Array<() => void> = [];

  const on = <T>(event: string, handler: (data: T) => void) => {
    unsubs.push(socketService.on<T>(event, handler));
  };

  // ── Room events ────────────────────────────────────────────────────────────

  // Full room state snapshot sent on initial WS connect
  on<Room>(SOCKET_EVENTS.ROOM_STATE, (room) => {
    useRoomStore.getState().setRoom(room);
    syncExplanationSession(room);
  });

  // Incremental room update (member join/leave, hand raise, status change…)
  on<Room>(SOCKET_EVENTS.ROOM_UPDATE, (room) => {
    const prev = useRoomStore.getState().currentRoom;
    const myId = useRoomStore.getState().currentUser.id;
    if (prev) {
      const newlyRaised = room.members.some((m) => {
        if (m.id === myId || !m.hasRaisedHand) return false;
        const before = prev.members.find((p) => p.id === m.id);
        return !before?.hasRaisedHand;
      });
      if (newlyRaised) playNotificationPing();
    }
    useRoomStore.getState().setRoom(room);
    syncExplanationSession(room);
  });

  // ── Join request events (for the requester) ────────────────────────────────

  on<{ requestId: string }>('join_request:accepted', ({ requestId }) => {
    console.log('[WS] Join request accepted:', requestId);
    useRoomStore.getState().setJoinRequestStatus('accepted');
    usePanelStore.getState().setActiveTab('chat');
  });

  on<{ requestId: string }>('join_request:rejected', ({ requestId }) => {
    console.warn('[WS] Join request rejected:', requestId);
    useRoomStore.getState().handleJoinRejected();
  });

  on<JoinRequest>(SOCKET_EVENTS.JOIN_REQUEST_RECEIVED, (req) => {
    console.log('[WS] New join request from', req.name);
    playNotificationPing();
    const room = useRoomStore.getState().currentRoom;
    if (!room) return;
    const already = room.pendingRequests.some((r) => r.id === req.id);
    if (already) return;
    useRoomStore.getState().setRoom({
      ...room,
      pendingRequests: [...(room.pendingRequests ?? []), req],
    });
  });

  on<{ userId: string }>(SOCKET_EVENTS.JOIN_REQUEST_CANCELLED, ({ userId }) => {
    const room = useRoomStore.getState().currentRoom;
    if (!room) return;
    useRoomStore.getState().setRoom({
      ...room,
      pendingRequests: room.pendingRequests.filter(
        (r) => !(r.userId === userId && r.status === 'pending')
      ),
    });
  });

  on<{}>(SOCKET_EVENTS.ROOM_KICKED, () => {
    useRoomStore.getState().handleKicked();
  });

  on<{}>('room:deleted', () => {
    console.log('[WS] Room was deleted by host');
    useRoomStore.getState().handleRoomDeleted();
  });

  // ── Hand approved (targeted: only the approved member receives this) ───────

  on<{ userId: string }>('hand:approved', () => {
    useExplanationStore.getState().setApprovedToExplain(true);
  });

  // ── Chat events ────────────────────────────────────────────────────────────

  on<ChatMessage>(SOCKET_EVENTS.CHAT_MESSAGE, (msg) => {
    useChatStore.getState().clearTyping(msg.senderId);
    useChatStore.getState().receiveMessage(msg);

    const settings = useSettingsStore.getState().settings;
    const panel = usePanelStore.getState();
    const chatOpen = panel.panelState === 'expanded' && panel.activeTab === 'chat';
    const isSystem = msg.type === 'system';
    // Focus mode silences chat only — join/hand-raise pings stay on.
    if (
      !chatOpen &&
      !isSystem &&
      !settings.muteNotifications &&
      !settings.muteChatSounds
    ) {
      playChatChime();
    }
  });

  on<{ userId: string; userName: string; avatar?: AvatarOption }>(
    SOCKET_EVENTS.CHAT_TYPING_START,
    ({ userId, userName, avatar }) => {
      useChatStore.getState().setTyping({ id: userId, name: userName, avatar });
    }
  );

  on<{ userId: string }>(SOCKET_EVENTS.CHAT_TYPING_STOP, ({ userId }) => {
    useChatStore.getState().clearTyping(userId);
  });

  // ── Voice events ────────────────────────────────────────────────────────────

  on<{ userId: string; isSpeaking: boolean }>(SOCKET_EVENTS.VOICE_SPEAKING, ({ userId, isSpeaking }) => {
    useVoiceStore.getState().setActiveSpeaker(userId, isSpeaking);
  });

  return () => unsubs.forEach((u) => u());
}
