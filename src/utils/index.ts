import { AVATARS } from '@/constants';
import type { AvatarOption } from '@/types';

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
