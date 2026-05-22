/**
 * Room Service — Placeholder
 * Replace with real API calls when backend is ready.
 */

import type { Room, JoinRequest, Language, AvatarOption } from '@/types';
import { generateRoomId } from '@/utils';

const API_BASE = 'http://localhost:8080/api'; // Replace with your backend URL

export const roomService = {
  async createRoom(
    name: string,
    language: Language,
    hostId: string,
    avatar: AvatarOption
  ): Promise<Room> {
    // PLACEHOLDER: Replace with real API call
    // const res = await fetch(`${API_BASE}/rooms`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ name, language, hostId, avatar }),
    // });
    // return res.json();

    console.log('[RoomService] createRoom:', { name, language, hostId });
    return Promise.resolve({
      id: generateRoomId(),
      name,
      hostId,
      members: [],
      status: 'active',
      language,
      createdAt: Date.now(),
      maxMembers: 8,
      isLocked: false,
      pendingRequests: [],
      explanationSession: null,
    });
  },

  async joinRoom(roomId: string, userId: string): Promise<JoinRequest> {
    // PLACEHOLDER
    console.log('[RoomService] joinRoom:', roomId, userId);
    return Promise.resolve({
      id: `req-${Date.now()}`,
      userId,
      name: 'Guest',
      avatar: 'astronaut',
      language: 'python',
      requestedAt: Date.now(),
      status: 'pending',
    });
  },

  async getRoomState(roomId: string): Promise<Room | null> {
    // PLACEHOLDER
    console.log('[RoomService] getRoomState:', roomId);
    return Promise.resolve(null);
  },

  async leaveRoom(roomId: string, userId: string): Promise<void> {
    // PLACEHOLDER
    console.log('[RoomService] leaveRoom:', roomId, userId);
  },
};
