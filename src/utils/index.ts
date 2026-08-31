import { AVATARS } from '@/constants';
import type { AvatarOption, KnownRoom } from '@/types';

export const formatTime = (timestamp: number): string => {
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const timeAgo = (timestamp: number): string => {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
};

export const generateRoomId = (): string =>
  `COLLAB-${Math.random().toString(36).substring(2, 6).toUpperCase()}${Math.random()
    .toString(36)
    .substring(2, 4)
    .toUpperCase()}`;

export const getAvatarConfig = (avatar: AvatarOption) => AVATARS[avatar];

export const getInitials = (name: string): string =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

export const cn = (...classes: (string | undefined | null | false)[]): string =>
  classes.filter(Boolean).join(' ');

/** Returns a stable user ID persisted in localStorage. */
export const getOrCreateUserId = (): string => {
  const key = 'algo-arena-user-id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = `user-${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem(key, id);
  }
  return id;
};

// Gets or sets the user's display name in localStorage. */
export const getOrSetUserName = (name?: string): string => {
  const key = 'algo-arena-user-name';
  if (name) {
    localStorage.setItem(key, name);
    return name;
  }
  return localStorage.getItem(key) ?? 'Anonymous';
};

const LS_KNOWN_ROOMS = 'algo-arena-known-rooms';

export const loadKnownRooms = (): KnownRoom[] => {
  try {
    const raw = localStorage.getItem(LS_KNOWN_ROOMS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as KnownRoom[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveKnownRooms = (rooms: KnownRoom[]): void => {
  localStorage.setItem(LS_KNOWN_ROOMS, JSON.stringify(rooms));
};

export const onlineMemberCount = (room: { members: { status: string; explicitlyLeft?: boolean }[] } | null): number =>
  room?.members.filter((m) => m.status === 'online' && !m.explicitlyLeft).length ?? 0;

export const clampDisplayName = (value: string, max = 10): string =>
  Array.from(value).slice(0, max).join('');

export const clampRoomName = (value: string, maxWords = 10): string => {
  const endsWithSpace = /\s$/.test(value);
  const words = value.trim().split(/\s+/).filter(Boolean);
  const clipped = words.slice(0, maxWords).join(' ');
  if (value.trim() === '') return value.startsWith(' ') ? '' : value;
  if (endsWithSpace && words.length < maxWords) return `${clipped} `;
  return clipped;
};
