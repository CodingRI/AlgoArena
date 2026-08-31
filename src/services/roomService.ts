import { API_BASE } from '@/config/backend';
import type { Room, JoinRequest, Language, AvatarOption } from '@/types';

export const roomService = {
  async createRoom(
    name: string,
    language: Language,
    hostId: string,
    hostName: string,
    avatar: AvatarOption
  ): Promise<Room> {
    const res = await fetch(`${API_BASE}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, language, hostId, hostName, avatar }),
    });
    if (!res.ok) throw new Error(`createRoom failed: ${res.status}`);
    return res.json();
  },

  async joinRoom(
    roomId: string,
    userId: string,
    name: string,
    avatar: AvatarOption,
    language: Language
  ): Promise<JoinRequest> {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, name, avatar, language }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: `joinRoom failed: ${res.status}` }));
      throw new Error((body as { error?: string }).error ?? `joinRoom failed: ${res.status}`);
    }
    return res.json();
  },

  async getRoomState(roomId: string): Promise<Room | null> {
    const res = await fetch(`${API_BASE}/rooms/${roomId}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`getRoomState failed: ${res.status}`);
    return res.json();
  },

  async deleteRoom(roomId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/rooms/${roomId}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) throw new Error(`deleteRoom failed: ${res.status}`);
  },
};
