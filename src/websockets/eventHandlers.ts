/**
 * Socket Event Handlers — Placeholder
 * Wire these up to your Zustand store when backend is ready.
 */

import { SOCKET_EVENTS } from '@/constants';
import socketService from './socketService';
import type { ChatMessage, JoinRequest, Member } from '@/types';

export const roomSocketHandlers = {
  onRoomUpdate: (callback: (room: unknown) => void) =>
    socketService.on(SOCKET_EVENTS.ROOM_UPDATE, callback),

  onMemberJoin: (callback: (member: Member) => void) =>
    socketService.on(SOCKET_EVENTS.ROOM_JOIN, callback),

  onMemberLeave: (callback: (memberId: string) => void) =>
    socketService.on(SOCKET_EVENTS.ROOM_LEAVE, callback),

  onJoinRequest: (callback: (request: JoinRequest) => void) =>
    socketService.on(SOCKET_EVENTS.JOIN_REQUEST_RECEIVED, callback),
};

export const chatSocketHandlers = {
  onMessage: (callback: (message: ChatMessage) => void) =>
    socketService.on(SOCKET_EVENTS.CHAT_MESSAGE, callback),

  onTypingStart: (callback: (userId: string) => void) =>
    socketService.on(SOCKET_EVENTS.CHAT_TYPING_START, callback),

  onTypingStop: (callback: (userId: string) => void) =>
    socketService.on(SOCKET_EVENTS.CHAT_TYPING_STOP, callback),
};

export const voiceSocketHandlers = {
  onSpeaking: (callback: (userId: string) => void) =>
    socketService.on(SOCKET_EVENTS.VOICE_SPEAKING, callback),

  onMute: (callback: (userId: string) => void) =>
    socketService.on(SOCKET_EVENTS.VOICE_MUTE, callback),
};

export const explanationSocketHandlers = {
  onExplanationStart: (callback: (session: unknown) => void) =>
    socketService.on(SOCKET_EVENTS.EXPLANATION_START, callback),

  onExplanationEnd: (callback: () => void) =>
    socketService.on(SOCKET_EVENTS.EXPLANATION_END, callback),

  onCanvasUpdate: (callback: (data: string) => void) =>
    socketService.on(SOCKET_EVENTS.CANVAS_UPDATE, callback),

  onLaserMove: (callback: (pos: { x: number; y: number }) => void) =>
    socketService.on(SOCKET_EVENTS.LASER_MOVE, callback),
};
