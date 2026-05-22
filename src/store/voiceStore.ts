import { create } from 'zustand';
import type { ExplanationSession, RaiseHandRequest, VoiceState } from '@/types';

interface VoiceStore {
  voice: VoiceState;
  toggleMute: () => void;
  setActiveSpeaker: (userId: string, isSpeaking: boolean) => void;
  setVoiceStatus: (status: VoiceState['status']) => void;
}

interface ExplanationStore {
  session: ExplanationSession | null;
  raiseHandRequests: RaiseHandRequest[];
  myRole: 'presenter' | 'follower' | 'observer' | null;
  isFollowingPresenter: boolean;
  laserPosition: { x: number; y: number } | null;

  startSession: (presenterId: string, roomId: string) => void;
  endSession: () => void;
  setMyRole: (role: ExplanationStore['myRole']) => void;
  toggleFollowPresenter: () => void;
  setLaserPosition: (pos: { x: number; y: number } | null) => void;
  addRaiseHandRequest: (req: RaiseHandRequest) => void;
  resolveRaiseHand: (reqId: string, accepted: boolean) => void;
}

export const useVoiceStore = create<VoiceStore>((set) => ({
  voice: {
    status: 'connected',
    isMuted: false,
    activeSpeakers: ['user-2'],
    volume: 80,
  },

  toggleMute: () =>
    set((state) => ({
      voice: { ...state.voice, isMuted: !state.voice.isMuted },
    })),

  setActiveSpeaker: (userId, isSpeaking) =>
    set((state) => ({
      voice: {
        ...state.voice,
        activeSpeakers: isSpeaking
          ? [...state.voice.activeSpeakers, userId]
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

  startSession: (presenterId, roomId) => {
    const session: ExplanationSession = {
      id: `session-${Date.now()}`,
      roomId,
      presenterId,
      followers: [],
      observers: [],
      startedAt: Date.now(),
      isActive: true,
      canvasData: null,
      laserPosition: null,
    };
    set({ session, myRole: presenterId === 'current-user' ? 'presenter' : 'follower' });
  },

  endSession: () => set({ session: null, myRole: null, isFollowingPresenter: false }),

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
}));
