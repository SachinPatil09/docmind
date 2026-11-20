import { create } from 'zustand';
import { DocumentMetadataDto } from '../types';
import { documentApi } from '../services/api';

interface DocumentState {
  documents: DocumentMetadataDto[];
  selectedDocumentId: string | null;
  inspectingDoc: DocumentMetadataDto | null;
  isUploadModalOpen: boolean;
  isSearchModalOpen: boolean;
  sidebarTab: 'documents' | 'chats';
  isLoading: boolean;
  error: string | null;

  // Actions
  loadDocuments: () => Promise<void>;
  selectDocument: (id: string | null) => void;
  setInspectingDoc: (doc: DocumentMetadataDto | null) => void;
  setIsUploadModalOpen: (open: boolean) => void;
  setIsSearchModalOpen: (open: boolean) => void;
  setSidebarTab: (tab: 'documents' | 'chats') => void;
  uploadDocument: (file: File) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  clearStore: () => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  selectedDocumentId: null,
  inspectingDoc: null,
  isUploadModalOpen: false,
  isSearchModalOpen: false,
  sidebarTab: 'documents',
  isLoading: false,
  error: null,

  loadDocuments: async () => {
    set({ isLoading: true, error: null });
    try {
      // Calls GET /documents/user - only the logged-in user's documents
      const docs = await documentApi.getMine();
      set({ documents: docs, isLoading: false });
    } catch (err: any) {
      console.error('Failed to load user documents:', err);
      set({ error: err.message || 'Failed to load documents', isLoading: false });
    }
  },

  selectDocument: (id: string | null) => {
    set({ selectedDocumentId: id });
  },

  setInspectingDoc: (doc: DocumentMetadataDto | null) => {
    set({ inspectingDoc: doc });
  },

  setIsUploadModalOpen: (open: boolean) => {
    set({ isUploadModalOpen: open });
  },

  setIsSearchModalOpen: (open: boolean) => {
    set({ isSearchModalOpen: open });
  },

  setSidebarTab: (tab: 'documents' | 'chats') => {
    set({ sidebarTab: tab });
  },

  uploadDocument: async (file: File) => {
    set({ isLoading: true });
    try {
      await documentApi.upload(file);
      await get().loadDocuments();
    } catch (err: any) {
      console.error('Upload failed:', err);
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteDocument: async (id: string) => {
    try {
      await documentApi.delete(id);
      // Remove from list & unselect if was selected
      set((state) => ({
        documents: state.documents.filter((d) => d.id !== id),
        selectedDocumentId: state.selectedDocumentId === id ? null : state.selectedDocumentId,
        inspectingDoc: state.inspectingDoc?.id === id ? null : state.inspectingDoc,
      }));
    } catch (err: any) {
      console.error('Delete failed:', err);
      throw err;
    }
  },

  clearStore: () => {
    set({
      documents: [],
      selectedDocumentId: null,
      inspectingDoc: null,
      isUploadModalOpen: false,
      isSearchModalOpen: false,
      sidebarTab: 'documents',
      isLoading: false,
      error: null,
    });
  },
}));
