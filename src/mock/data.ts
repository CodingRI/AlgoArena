import type { Member, Room, ChatMessage, AppNotification, JoinRequest } from '@/types';

export const MOCK_MEMBERS: Member[] = [
  {
    id: 'user-1',
    name: 'Arjun Sharma',
    avatar: 'astronaut',
    role: 'host',
    status: 'online',
    language: 'python',
    isSpeaking: false,
    isMuted: false,
    isInExplanationMode: false,
    hasRaisedHand: false,
    joinedAt: Date.now() - 600000,
  },
  {
    id: 'user-2',
    name: 'Mei Zhang',
    avatar: 'robot',
    role: 'member',
    status: 'online',
    language: 'java',
    isSpeaking: true,
    isMuted: false,
    isInExplanationMode: false,
    hasRaisedHand: false,
    joinedAt: Date.now() - 300000,
  },
  {
    id: 'user-3',
    name: 'Carlos Rivera',
    avatar: 'wizard',
    role: 'member',
    status: 'online',
    language: 'cpp',
    isSpeaking: false,
    isMuted: true,
    isInExplanationMode: false,
    hasRaisedHand: true,
    joinedAt: Date.now() - 120000,
  },
  {
    id: 'user-4',
    name: 'Priya Nair',
    avatar: 'alien',
    role: 'member',
    status: 'away',
    language: 'typescript',
    isSpeaking: false,
    isMuted: false,
    isInExplanationMode: false,
    hasRaisedHand: false,
    joinedAt: Date.now() - 60000,
  },
];

export const MOCK_ROOM: Room = {
  id: 'COLLAB-X7K2',
  name: '2Sum Weekly Grind',
  hostId: 'user-1',
  members: MOCK_MEMBERS,
  status: 'active',
  language: 'python',
  createdAt: Date.now() - 600000,
  maxMembers: 8,
  isLocked: false,
  pendingRequests: [],
  explanationSession: null,
};

export const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    roomId: 'COLLAB-X7K2',
    senderId: 'user-2',
    senderName: 'Mei Zhang',
    senderAvatar: 'robot',
    type: 'text',
    content: 'Hey! Ready to tackle Two Sum? I have an O(n) approach in mind.',
    timestamp: Date.now() - 540000,
    isRead: true,
  },
  {
    id: 'msg-2',
    roomId: 'COLLAB-X7K2',
    senderId: 'user-1',
    senderName: 'Arjun Sharma',
    senderAvatar: 'astronaut',
    type: 'text',
    content: 'Nice! Should we walk through the hashmap solution first?',
    timestamp: Date.now() - 480000,
    isRead: true,
  },
  {
    id: 'msg-3',
    roomId: 'COLLAB-X7K2',
    senderId: 'user-3',
    senderName: 'Carlos Rivera',
    senderAvatar: 'wizard',
    type: 'code',
    content: `def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [seen[diff], i]
        seen[num] = i`,
    language: 'python',
    timestamp: Date.now() - 420000,
    isRead: true,
  },
  {
    id: 'msg-4',
    roomId: 'COLLAB-X7K2',
    senderId: 'user-2',
    senderName: 'Mei Zhang',
    senderAvatar: 'robot',
    type: 'text',
    content: 'Clean! The complement trick using hashmap is elegant. Time: O(n), Space: O(n)',
    timestamp: Date.now() - 360000,
    isRead: true,
  },
  {
    id: 'msg-5',
    roomId: 'COLLAB-X7K2',
    senderId: 'user-4',
    senderName: 'Priya Nair',
    senderAvatar: 'alien',
    type: 'text',
    content: 'Can someone explain the edge case when target is exactly double of an element?',
    timestamp: Date.now() - 60000,
    isRead: false,
  },
];

export const MOCK_JOIN_REQUEST: JoinRequest = {
  id: 'req-1',
  userId: 'user-5',
  name: 'Sam Park',
  avatar: 'ninja',
  language: 'go',
  requestedAt: Date.now() - 10000,
  status: 'pending',
};

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    type: 'join_request',
    title: 'Join Request',
    message: 'Sam Park wants to join the room',
    timestamp: Date.now() - 10000,
    isRead: false,
    actionPayload: { requestId: 'req-1' },
  },
  {
    id: 'notif-2',
    type: 'raise_hand',
    title: 'Hand Raised',
    message: 'Carlos Rivera wants to explain',
    timestamp: Date.now() - 30000,
    isRead: false,
    actionPayload: { userId: 'user-3' },
  },
];

export const MOCK_CURRENT_USER: Member = {
  id: 'current-user',
  name: 'You',
  avatar: 'hacker',
  role: 'member',
  status: 'online',
  language: 'python',
  isSpeaking: false,
  isMuted: false,
  isInExplanationMode: false,
  hasRaisedHand: false,
  joinedAt: Date.now() - 90000,
};
