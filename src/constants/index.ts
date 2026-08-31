import { WS_URL } from '@/config/backend';
import type { AvatarConfig, AvatarOption, Language } from '@/types';

// ─── SOCKET EVENT CONSTANTS ──────────────────────────────────────────────────

export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  RECONNECT: 'reconnect',
  ERROR: 'error',

  // Room
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_CLOSE: 'room:close',
  ROOM_UPDATE: 'room:update',
  ROOM_STATE: 'room:state',

  // Join Requests
  JOIN_REQUEST_SEND: 'join_request:send',
  JOIN_REQUEST_ACCEPT: 'join_request:accept',
  JOIN_REQUEST_REJECT: 'join_request:reject',
  JOIN_REQUEST_CANCEL: 'join_request:cancel',
  JOIN_REQUEST_RECEIVED: 'join_request:received',
  JOIN_REQUEST_CANCELLED: 'join_request:cancelled',
  ROOM_KICK: 'room:kick',
  ROOM_KICKED: 'room:kicked',

  // Chat
  CHAT_MESSAGE: 'chat:message',
  CHAT_TYPING_START: 'chat:typing:start',
  CHAT_TYPING_STOP: 'chat:typing:stop',
  CHAT_RATE_LIMITED: 'chat:rate_limited',

  // Voice
  VOICE_JOIN: 'voice:join',
  VOICE_LEAVE: 'voice:leave',
  VOICE_MUTE: 'voice:mute',
  VOICE_UNMUTE: 'voice:unmute',
  VOICE_SPEAKING: 'voice:speaking',

  // Raise Hand / Explanation
  HAND_RAISE: 'hand:raise',
  HAND_LOWER: 'hand:lower',
  HAND_DISMISS: 'hand:dismiss',       // host dismisses a member's raised hand
  HAND_APPROVED: 'hand:approved',     // host approves a hand raise (sent only to that member)
  EXPLANATION_START: 'explanation:start',
  EXPLANATION_END: 'explanation:end',
  EXPLANATION_REQUEST_ACCEPT: 'explanation:request:accept',
  EXPLANATION_REQUEST_REJECT: 'explanation:request:reject',
  FOLLOW_PRESENTER: 'explanation:follow',
  UNFOLLOW_PRESENTER: 'explanation:unfollow',

  // WebRTC signaling (P2P, always paired with targetUserId)
  WEBRTC_OFFER: 'webrtc:offer',
  WEBRTC_ANSWER: 'webrtc:answer',
  WEBRTC_ICE: 'webrtc:ice-candidate',
  WEBRTC_PEER_DISCONNECT: 'webrtc:peer-disconnect',

  // Canvas / Drawing
  CANVAS_UPDATE: 'canvas:update',
  CANVAS_CLEAR: 'canvas:clear',
  LASER_MOVE: 'laser:move',

  // Scroll / Tab Sync
  SCROLL_SYNC: 'sync:scroll',
  TAB_SYNC: 'sync:tab',
} as const;

export type SocketEventKey = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

// ─── WEBSOCKET CONFIG ────────────────────────────────────────────────────────

export const WS_CONFIG = {
  BASE_URL: WS_URL,
  RECONNECT_INTERVAL: 3000,
  MAX_RECONNECT_ATTEMPTS: 5,
  PING_INTERVAL: 25000,
} as const;

// ─── LANGUAGE OPTIONS ────────────────────────────────────────────────────────

export const LANGUAGES: { value: Language; label: string; color: string }[] = [
  { value: 'python', label: 'Python', color: '#3b82f6' },
  { value: 'javascript', label: 'JavaScript', color: '#f59e0b' },
  { value: 'typescript', label: 'TypeScript', color: '#06b6d4' },
  { value: 'java', label: 'Java', color: '#f97316' },
  { value: 'cpp', label: 'C++', color: '#8b5cf6' },
  { value: 'go', label: 'Go', color: '#10b981' },
  { value: 'rust', label: 'Rust', color: '#ef4444' },
  { value: 'kotlin', label: 'Kotlin', color: '#a855f7' },
  { value: 'swift', label: 'Swift', color: '#f43f5e' },
  { value: 'c', label: 'C', color: '#64748b' },
];

// ─── AVATAR CONFIGS ──────────────────────────────────────────────────────────

export const AVATARS: Record<AvatarOption, AvatarConfig> = {
  astronaut: { id: 'astronaut', emoji: '🧑‍🚀', color: '#3b82f6', glow: 'rgba(59,130,246,0.4)' },
  robot: { id: 'robot', emoji: '🤖', color: '#06b6d4', glow: 'rgba(6,182,212,0.4)' },
  alien: { id: 'alien', emoji: '👽', color: '#10b981', glow: 'rgba(16,185,129,0.4)' },
  wizard: { id: 'wizard', emoji: '🧙', color: '#8b5cf6', glow: 'rgba(139,92,246,0.4)' },
  ninja: { id: 'ninja', emoji: '🥷', color: '#64748b', glow: 'rgba(100,116,139,0.4)' },
  hacker: { id: 'hacker', emoji: '👤', color: '#22c55e', glow: 'rgba(34,197,94,0.4)' },
  phoenix: { id: 'phoenix', emoji: '🦅', color: '#f97316', glow: 'rgba(249,115,22,0.4)' },
  ghost: { id: 'ghost', emoji: '👻', color: '#a1a1aa', glow: 'rgba(161,161,170,0.4)' },
};

// ─── ROOM CONSTANTS ──────────────────────────────────────────────────────────

export const ROOM_MAX_MEMBERS = 4;
export const ROOM_ID_LENGTH = 8;
export const DISPLAY_NAME_MAX = 10;
export const ROOM_NAME_MAX_WORDS = 10;
export const CHAT_MAX_PER_WINDOW = 5;
export const CHAT_WINDOW_MS = 5000;
export const CHAT_MAX_CONTENT = 4000;

// ─── EXTENSION ───────────────────────────────────────────────────────────────

export const EXTENSION_MOUNT_ID = 'algoarena-root';
export const TOGGLE_PANEL_EVENT = 'algoarena:toggle';

// ─── PANEL CONSTANTS ─────────────────────────────────────────────────────────

export const PANEL_COLLAPSED_WIDTH = 280;
export const PANEL_COLLAPSED_HEIGHT = 52;
export const PANEL_EXPANDED_WIDTH = 360;
export const PANEL_EXPANDED_HEIGHT = 580;

// ─── DEFAULT POSITIONS ───────────────────────────────────────────────────────

export const DEFAULT_PANEL_POSITION = { x: 20, y: 80 };
