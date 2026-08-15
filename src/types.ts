import { DeviceHintData } from './lib/deviceHints';

export interface UserProfile {
  id: string;
  username: string;
  shortCode?: string;
  prompt: string;
  photoURL?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MediaAttachment {
  name: string;
  type: string;
  size: number;
  dataURL: string;
}

export interface NglMessage {
  id: string;
  recipientId: string;
  senderUid?: string;
  text: string;
  promptTitle?: string;
  file?: MediaAttachment | null;
  read: boolean;
  reply?: string | null;
  repliedAt?: string | null;
  createdAt: number;
  emojiAvatar?: string;
  gradientBg?: string;
  deviceHint?: DeviceHintData;
}

export type InboxFilter = 'all' | 'unread' | 'replied';

export interface PromptTemplate {
  id: string;
  category: 'trending' | 'confessions' | 'roast' | 'crush' | 'friendship';
  text: string;
  tag: string;
}

