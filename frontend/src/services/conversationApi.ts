// TODO(backend): replace with real endpoint when backend conversation endpoints are available
import { Conversation, StoredMessage } from '../types';

const CONV_PREFIX = 'docmind:';

const getConversationsKey = (userId: number): string => `${CONV_PREFIX}${userId}:conversations`;
const getMessagesKey = (userId: number, conversationId: string): string =>
  `${CONV_PREFIX}${userId}:messages:${conversationId}`;

export const conversationApi = {
  // List all conversations for the given user
  async list(userId: number): Promise<Conversation[]> {
    try {
      const data = localStorage.getItem(getConversationsKey(userId));
      if (!data) return [];
      const parsed: Conversation[] = JSON.parse(data);
      // Sort newest first
      return parsed.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (e) {
      console.warn('Failed to read conversations from localStorage:', e);
      return [];
    }
  },

  // Get message history for a specific conversation
  async getMessages(userId: number, conversationId: string): Promise<StoredMessage[]> {
    try {
      const data = localStorage.getItem(getMessagesKey(userId, conversationId));
      if (!data) return [];
      const parsed: StoredMessage[] = JSON.parse(data);
      return parsed.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } catch (e) {
      console.warn('Failed to read messages from localStorage:', e);
      return [];
    }
  },

  // Save or update a conversation metadata (e.g. title, updatedAt)
  async saveConversation(userId: number, conversation: Conversation): Promise<void> {
    try {
      const list = await this.list(userId);
      const existingIdx = list.findIndex((c) => c.id === conversation.id);
      if (existingIdx >= 0) {
        list[existingIdx] = { ...list[existingIdx], ...conversation, updatedAt: new Date().toISOString() };
      } else {
        list.unshift(conversation);
      }
      localStorage.setItem(getConversationsKey(userId), JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to save conversation to localStorage:', e);
    }
  },

  // Save messages array for a conversation
  async saveMessages(userId: number, conversationId: string, messages: StoredMessage[]): Promise<void> {
    try {
      localStorage.setItem(getMessagesKey(userId, conversationId), JSON.stringify(messages));
    } catch (e) {
      console.warn('Failed to save messages to localStorage:', e);
    }
  },

  // Append a single message
  async appendMessage(userId: number, conversationId: string, message: StoredMessage): Promise<void> {
    try {
      const messages = await this.getMessages(userId, conversationId);
      messages.push(message);
      await this.saveMessages(userId, conversationId, messages);

      // Also touch the conversation's updatedAt
      const list = await this.list(userId);
      const conv = list.find((c) => c.id === conversationId);
      if (conv) {
        conv.updatedAt = new Date().toISOString();
        localStorage.setItem(getConversationsKey(userId), JSON.stringify(list));
      }
    } catch (e) {
      console.warn('Failed to append message to localStorage:', e);
    }
  },

  // Remove a conversation and its messages
  async remove(userId: number, conversationId: string): Promise<void> {
    try {
      // 1. Remove from conversation list
      const list = await this.list(userId);
      const filtered = list.filter((c) => c.id !== conversationId);
      localStorage.setItem(getConversationsKey(userId), JSON.stringify(filtered));

      // 2. Remove message transcript
      localStorage.removeItem(getMessagesKey(userId, conversationId));
    } catch (e) {
      console.warn('Failed to remove conversation from localStorage:', e);
    }
  },

  // Clear all localStorage keys for a user (used upon logout)
  clearAllUserData(userId: number): void {
    try {
      const prefix = `${CONV_PREFIX}${userId}:`;
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (e) {
      console.warn('Failed to clear user data from localStorage:', e);
    }
  },
};
