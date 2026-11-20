import { create } from 'zustand';
import { Conversation, ChatMessage, StoredMessage, CitationDto } from '../types';
import { conversationApi } from '../services/conversationApi';
import { useAuthStore } from './authStore';

interface ConversationState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, ChatMessage[]>;
  isStreamingMode: boolean;
  isLoadingChats: boolean;

  // Actions
  loadChats: () => Promise<void>;
  newChat: () => string;
  selectChat: (id: string) => Promise<void>;
  deleteChat: (id: string) => Promise<void>;
  renameChat: (id: string, newTitle: string) => Promise<void>;
  appendMessage: (conversationId: string, message: ChatMessage) => Promise<void>;
  updateAssistantMessage: (
    conversationId: string,
    messageId: string,
    text: string,
    citations?: CitationDto[],
    responseTimeMs?: number,
    isStreaming?: boolean,
    error?: boolean,
    interrupted?: boolean
  ) => Promise<void>;
  setStreamingMode: (enabled: boolean) => void;
  clearStore: () => void;
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  isStreamingMode: true,
  isLoadingChats: false,

  loadChats: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    set({ isLoadingChats: true });
    try {
      const chats = await conversationApi.list(user.id);

      // If active conversation is already set and in list, keep it; else select first chat or mint a new one
      let activeId = get().activeConversationId;
      if (!activeId || !chats.some((c) => c.id === activeId)) {
        activeId = chats.length > 0 ? chats[0].id : crypto.randomUUID();
      }

      // Load messages for the active conversation
      const storedMsgs = await conversationApi.getMessages(user.id, activeId);
      const mappedMsgs: ChatMessage[] = storedMsgs.map((m) => ({
        id: m.id,
        sender: m.messageType === 'USER' ? 'user' : 'assistant',
        text: m.content,
        timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: m.citations,
        responseTimeMs: m.responseTimeMs,
        isStreaming: false,
        error: m.error,
        interrupted: m.interrupted,
      }));

      set((state) => ({
        conversations: chats,
        activeConversationId: activeId,
        messages: {
          ...state.messages,
          [activeId]: mappedMsgs,
        },
        isLoadingChats: false,
      }));
    } catch (e) {
      console.warn('Failed to load chats:', e);
      set({ isLoadingChats: false });
    }
  },

  newChat: () => {
    const newId = crypto.randomUUID();
    set((state) => ({
      activeConversationId: newId,
      messages: {
        ...state.messages,
        [newId]: [],
      },
    }));
    return newId;
  },

  selectChat: async (id: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    set({ activeConversationId: id });

    // If messages aren't loaded into state yet, load from localStorage
    if (!get().messages[id]) {
      const storedMsgs = await conversationApi.getMessages(user.id, id);
      const mappedMsgs: ChatMessage[] = storedMsgs.map((m) => ({
        id: m.id,
        sender: m.messageType === 'USER' ? 'user' : 'assistant',
        text: m.content,
        timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: m.citations,
        responseTimeMs: m.responseTimeMs,
        isStreaming: false,
        error: m.error,
        interrupted: m.interrupted,
      }));

      set((state) => ({
        messages: {
          ...state.messages,
          [id]: mappedMsgs,
        },
      }));
    }
  },

  deleteChat: async (id: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    await conversationApi.remove(user.id, id);

    const remaining = get().conversations.filter((c) => c.id !== id);
    const updatedMessages = { ...get().messages };
    delete updatedMessages[id];

    let nextActiveId: string | null = null;
    if (get().activeConversationId === id) {
      nextActiveId = remaining.length > 0 ? remaining[0].id : crypto.randomUUID();
    } else {
      nextActiveId = get().activeConversationId;
    }

    set({
      conversations: remaining,
      activeConversationId: nextActiveId,
      messages: updatedMessages,
    });

    if (nextActiveId && remaining.some((c) => c.id === nextActiveId)) {
      get().selectChat(nextActiveId);
    }
  },

  renameChat: async (id: string, newTitle: string) => {
    const user = useAuthStore.getState().user;
    if (!user || !newTitle.trim()) return;

    const trimmed = newTitle.trim();
    const list = get().conversations.map((c) =>
      c.id === id ? { ...c, title: trimmed, updatedAt: new Date().toISOString() } : c
    );

    set({ conversations: list });

    const updatedConv = list.find((c) => c.id === id);
    if (updatedConv) {
      await conversationApi.saveConversation(user.id, updatedConv);
    }
  },

  appendMessage: async (conversationId: string, message: ChatMessage) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    // 1. Update memory state
    const currentList = get().messages[conversationId] || [];
    const updatedList = [...currentList, message];

    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: updatedList,
      },
    }));

    // 2. Ensure conversation is listed
    let conversations = [...get().conversations];
    let conv = conversations.find((c) => c.id === conversationId);

    if (!conv) {
      // Generate a title from the first prompt
      const title = message.text.length > 36 ? `${message.text.substring(0, 36)}...` : message.text || 'New Chat';
      conv = {
        id: conversationId,
        title,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      conversations.unshift(conv);
      set({ conversations });
      await conversationApi.saveConversation(user.id, conv);
    }

    // 3. Persist message to localStorage
    const stored: StoredMessage = {
      id: message.id,
      conversationId,
      messageType: message.sender === 'user' ? 'USER' : 'ASSISTANT',
      content: message.text,
      createdAt: new Date().toISOString(),
      citations: message.citations,
      responseTimeMs: message.responseTimeMs,
      error: message.error,
      interrupted: message.interrupted,
    };
    await conversationApi.appendMessage(user.id, conversationId, stored);
  },

  updateAssistantMessage: async (
    conversationId: string,
    messageId: string,
    text: string,
    citations?: CitationDto[],
    responseTimeMs?: number,
    isStreaming = false,
    error = false,
    interrupted = false
  ) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const list = get().messages[conversationId] || [];
    const updated = list.map((msg) =>
      msg.id === messageId
        ? {
            ...msg,
            text,
            citations: citations !== undefined ? citations : msg.citations,
            responseTimeMs: responseTimeMs !== undefined ? responseTimeMs : msg.responseTimeMs,
            isStreaming,
            error,
            interrupted,
          }
        : msg
    );

    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: updated,
      },
    }));

    // Persist full conversation transcript when message finishes streaming
    if (!isStreaming) {
      const storedList: StoredMessage[] = updated.map((m) => ({
        id: m.id,
        conversationId,
        messageType: m.sender === 'user' ? 'USER' : 'ASSISTANT',
        content: m.text,
        createdAt: new Date().toISOString(),
        citations: m.citations,
        responseTimeMs: m.responseTimeMs,
        error: m.error,
        interrupted: m.interrupted,
      }));
      await conversationApi.saveMessages(user.id, conversationId, storedList);
    }
  },

  setStreamingMode: (enabled: boolean) => {
    set({ isStreamingMode: enabled });
  },

  clearStore: () => {
    set({
      conversations: [],
      activeConversationId: null,
      messages: {},
      isLoadingChats: false,
    });
  },
}));
