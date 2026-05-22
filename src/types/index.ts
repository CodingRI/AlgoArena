// ─── MEMBER & USER TYPES ────────────────────────────────────────────────────

export type UserRole = 'host' | 'member' | 'guest';
export type MemberStatus = 'online' | 'offline' | 'away';
export type Language =
  | 'python'
  | 'javascript'
  | 'typescript'
  | 'java'
  | 'cpp'
  | 'go'
  | 'rust'
  | 'kotlin'
  | 'swift'
  | 'c';

export interface Member {
  id: string;
  name: string;
  avatar: AvatarOption;
  role: UserRole;
  status: MemberStatus;
  language: Language;
  isSpeaking: boolean;
  isMuted: boolean;
  isInExplanationMode: boolean;
  hasRaisedHand: boolean;
  joinedAt: number;
}

// ─── ROOM TYPES ─────────────────────────────────────────────────────────────

export type RoomStatus = 'waiting' | 'active' | 'explanation' | 'closed';

export interface Room {
  id: string;
  name: string;
  hostId: string;
  members: Member[];
  status: RoomStatus;
  language: Language;
  createdAt: number;
  maxMembers: number;
  isLocked: boolean;
  pendingRequests: JoinRequest[];
  explanationSession: ExplanationSession | null;
}

export interface JoinRequest {
  id: string;
  userId: string;
  name: string;
  avatar: AvatarOption;
  language: Language;
  requestedAt: number;
  status: 'pending' | 'accepted' | 'rejected';
}

// ─── CHAT TYPES ─────────────────────────────────────────────────────────────

export type MessageType = 'text' | 'code' | 'system' | 'action';

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar: AvatarOption;
  type: MessageType;
  content: string;
  language?: Language;
  timestamp: number;
  isRead: boolean;
}

export interface TypingIndicator {
  userId: string;
  userName: string;
  roomId: string;
}

// ─── VOICE TYPES ─────────────────────────────────────────────────────────────

export type VoiceStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export interface VoiceState {
  status: VoiceStatus;
  isMuted: boolean;
  activeSpeakers: string[]; // member IDs
  volume: number;
}

// ─── EXPLANATION / PRESENTER TYPES ──────────────────────────────────────────

export type ExplanationRole = 'presenter' | 'follower' | 'observer';

export interface ExplanationSession {
  id: string;
  roomId: string;
  presenterId: string;
  followers: string[];
  observers: string[];
  startedAt: number;
  isActive: boolean;
  canvasData: string | null;
  laserPosition: { x: number; y: number } | null;
}

export interface RaiseHandRequest {
  id: string;
  userId: string;
  userName: string;
  userAvatar: AvatarOption;
  roomId: string;
  requestedAt: number;
  status: 'pending' | 'accepted' | 'rejected';
}

// ─── AVATAR / THEME TYPES ────────────────────────────────────────────────────

export type AvatarOption =
  | 'astronaut'
  | 'robot'
  | 'alien'
  | 'wizard'
  | 'ninja'
  | 'hacker'
  | 'phoenix'
  | 'ghost';

export interface AvatarConfig {
  id: AvatarOption;
  emoji: string;
  color: string;
  glow: string;
}

// ─── SETTINGS TYPES ──────────────────────────────────────────────────────────

export interface AppSettings {
  muteNotifications: boolean;
  muteChatSounds: boolean;
  showGalaxyParticles: boolean;
  compactMode: boolean;
  themeIntensity: 'low' | 'medium' | 'high';
  panelPosition: { x: number; y: number };
}

// ─── PANEL STATE TYPES ───────────────────────────────────────────────────────

export type PanelState = 'collapsed' | 'expanded';
export type ActiveTab = 'chat' | 'members' | 'settings' | 'room';

export interface PanelConfig {
  state: PanelState;
  activeTab: ActiveTab;
  position: { x: number; y: number };
  unreadCount: number;
}

// ─── SOCKET TYPES ────────────────────────────────────────────────────────────

export type SocketStatus = 'connected' | 'connecting' | 'disconnected' | 'error' | 'reconnecting';

export interface SocketPayload<T = unknown> {
  event: string;
  roomId: string;
  data: T;
  timestamp: number;
  senderId: string;
}

// ─── NOTIFICATION TYPES ──────────────────────────────────────────────────────

export type NotificationType = 'join_request' | 'raise_hand' | 'message' | 'system' | 'voice';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  isRead: boolean;
  actionPayload?: Record<string, unknown>;
}
