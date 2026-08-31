import { create } from 'zustand';
import type { ExplanationSession, RaiseHandRequest, VoiceState } from '@/types';
import { SOCKET_EVENTS } from '@/constants';
import socketService from '@/websockets/socketService';

interface VoiceStore {
  voice: VoiceState;
  isVoiceEnabled: boolean;
  toggleMute: () => void;
  toggleVoice: () => void;
  setActiveSpeaker: (userId: string, isSpeaking: boolean) => void;
  setVoiceStatus: (status: VoiceState['status']) => void;
}

interface ExplanationStore {
  session: ExplanationSession | null;
  raiseHandRequests: RaiseHandRequest[];
  myRole: 'presenter' | 'follower' | 'observer' | null;
  isFollowingPresenter: boolean;
  laserPosition: { x: number; y: number } | null;
  /** True once the admin has approved this user's hand raise. Cleared on session start/end. */
  approvedToExplain: boolean;

  /** Local-only: sets the session state (called from storeHandlers when room:update arrives). */
  startSession: (presenterId: string, roomId: string, canvasData?: string | null) => void;
  /** Emits explanation:start via WS (server will broadcast room:update). */
  requestStartSession: (presenterId: string, roomId: string) => void;
  /** Emits explanation:end via WS (server will broadcast room:update). */
  requestEndSession: (roomId: string) => void;
  /** Clears the session entirely (called when room:update shows no active session). */
  endSession: () => void;
  /** A follower exits the overlay locally without ending the session for everyone. */
  exitAsFollower: () => void;
  setMyRole: (role: ExplanationStore['myRole']) => void;
  toggleFollowPresenter: () => void;
  setLaserPosition: (pos: { x: number; y: number } | null) => void;
  addRaiseHandRequest: (req: RaiseHandRequest) => void;
  resolveRaiseHand: (reqId: string, accepted: boolean) => void;
  setApprovedToExplain: (approved: boolean) => void;
}

export const useVoiceStore = create<VoiceStore>((set) => ({
  voice: {
    status: 'disconnected',
    isMuted: false,
    activeSpeakers: [],
    volume: 80,
  },
  isVoiceEnabled: false,

  toggleMute: () => {
    set((state) => {
      const nowMuted = !state.voice.isMuted;
      socketService.send(
        nowMuted ? SOCKET_EVENTS.VOICE_MUTE : SOCKET_EVENTS.VOICE_UNMUTE,
        {}
      );
      return { voice: { ...state.voice, isMuted: nowMuted } };
    });
  },

  toggleVoice: () =>
    set((state) => ({
      isVoiceEnabled: !state.isVoiceEnabled,
      voice: {
        ...state.voice,
        status: state.isVoiceEnabled ? 'disconnected' : 'connecting',
      },
    })),

  setActiveSpeaker: (userId, isSpeaking) =>
    set((state) => ({
      voice: {
        ...state.voice,
        activeSpeakers: isSpeaking
          ? state.voice.activeSpeakers.includes(userId)
            ? state.voice.activeSpeakers
            : [...state.voice.activeSpeakers, userId]
          : state.voice.activeSpeakers.filter((id) => id !== userId),
      },
    })),

  setVoiceStatus: (status) =>
    set((state) => ({ voice: { ...state.voice, status } })),
}));

export const useExplanationStore = create<ExplanationStore>((set) => ({
  session: null,
  raiseHandRequests: [],
  myRole: null,
  isFollowingPresenter: false,
  laserPosition: null,
  approvedToExplain: false,

  startSession: (presenterId, roomId, canvasData = null) => {
    const session: ExplanationSession = {
      id: `session-${Date.now()}`,
      roomId,
      presenterId,
      followers: [],
      observers: [],
      startedAt: Date.now(),
      isActive: true,
      canvasData,
      laserPosition: null,
    };
    // The socket handler assigns the role using the actual persisted user ID.
    set({ session });
  },

  requestStartSession: (presenterId, roomId) => {
    socketService.send(SOCKET_EVENTS.EXPLANATION_START, { presenterId });
    set({ approvedToExplain: false });
  },

  requestEndSession: (roomId) => {
    socketService.send(SOCKET_EVENTS.EXPLANATION_END, {});
    // Local state is cleared when room:update arrives with session=null
  },

  endSession: () => set({ session: null, myRole: null, isFollowingPresenter: false, approvedToExplain: false }),

  exitAsFollower: () => set({ myRole: null }),

  setMyRole: (role) => set({ myRole: role }),

  toggleFollowPresenter: () =>
    set((state) => ({ isFollowingPresenter: !state.isFollowingPresenter })),

  setLaserPosition: (pos) => set({ laserPosition: pos }),

  addRaiseHandRequest: (req) =>
    set((state) => ({ raiseHandRequests: [...state.raiseHandRequests, req] })),

  resolveRaiseHand: (reqId, accepted) =>
    set((state) => ({
      raiseHandRequests: state.raiseHandRequests.filter((r) => r.id !== reqId),
    })),

  setApprovedToExplain: (approved) => set({ approvedToExplain: approved }),
}));
