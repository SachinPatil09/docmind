import axios, { AxiosProgressEvent } from 'axios';
import { useAuthStore } from '../store/authStore';
import {
  ApiResponse,
  DocumentMetadataDto,
  DocumentResponseDTO,
  CitationDto,
  SearchResultDto,
  ChatQueryRequest,
  ChatQueryResponse,
} from '../types';

const API_BASE = '/api/v1';

// Shared Axios instance
export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 45000,
});

// Request interceptor: attach Bearer token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Session expired or unauthorized (401), logging out.');
      useAuthStore.getState().logout();
      if (
        window.location.pathname !== '/login' &&
        window.location.pathname !== '/register'
      ) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Document Endpoints
export const documentApi = {
  // GET /api/v1/documents/user - Current user's own documents
  async getMine(): Promise<DocumentMetadataDto[]> {
    const res = await apiClient.get<ApiResponse<DocumentMetadataDto[]>>('/documents/user');
    return res.data?.data || [];
  },

  // GET /api/v1/documents - Admin-only endpoint
  async getAll(): Promise<DocumentMetadataDto[]> {
    const res = await apiClient.get<ApiResponse<DocumentMetadataDto[]>>('/documents');
    return res.data?.data || [];
  },

  // GET /api/v1/documents/{id}
  async getById(id: string): Promise<DocumentMetadataDto> {
    const res = await apiClient.get<ApiResponse<DocumentMetadataDto>>(`/documents/${id}`);
    return res.data.data;
  },

  // GET /api/v1/documents/{id}/chunks
  async getChunks(id: string): Promise<CitationDto[]> {
    const res = await apiClient.get<ApiResponse<CitationDto[]>>(`/documents/${id}/chunks`);
    return res.data?.data || [];
  },

  // POST /api/v1/documents/upload
  async upload(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<DocumentResponseDTO> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await apiClient.post<ApiResponse<DocumentResponseDTO>>(
      '/documents/upload',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress?.(percent);
          }
        },
      }
    );
    return res.data.data;
  },

  // POST /api/v1/documents/upload-multiple
  async uploadMultiple(
    files: File[],
    onProgress?: (overallPercent: number, fileIndex: number) => void
  ): Promise<DocumentResponseDTO[]> {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));

    try {
      const res = await apiClient.post<ApiResponse<DocumentResponseDTO[]>>(
        '/documents/upload-multiple',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent: AxiosProgressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress?.(percent, 0);
            }
          },
        }
      );
      return res.data.data;
    } catch {
      // Fallback: upload individually
      const results: DocumentResponseDTO[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await this.upload(file, (p) => {
          const overall = Math.round(((i + p / 100) / files.length) * 100);
          onProgress?.(overall, i);
        });
        results.push(res);
      }
      return results;
    }
  },

  // DELETE /api/v1/documents/{id}
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/documents/${id}`);
  },
};

// Chat & Semantic Search Endpoints
export const chatApi = {
  // POST /api/v1/chat/query
  async query(payload: ChatQueryRequest): Promise<ChatQueryResponse> {
    const res = await apiClient.post<ApiResponse<ChatQueryResponse>>('/chat/query', payload);
    return res.data.data;
  },

  // POST /api/v1/chat/search/similarity
  async similaritySearch(
    query: string,
    documentId?: string,
    topK: number = 5,
    similaritySearch: number = 0.0
  ): Promise<SearchResultDto> {
    const payload: any = { query, topK, similaritySearch };
    if (documentId) {
      payload.documentId = documentId;
    }
    const res = await apiClient.post<ApiResponse<SearchResultDto>>(
      '/chat/search/similarity',
      payload
    );
    return res.data.data;
  },
};

// Helper for streaming chat with JWT header via raw fetch
export async function streamChat(
  payload: ChatQueryRequest,
  onToken: (token: string) => void,
  onComplete: (fullText: string) => void,
  onError?: (err: any) => void,
  signal?: AbortSignal
): Promise<void> {
  const token = useAuthStore.getState().token;

  let fullText = '';
  let completedNormally = false;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream, text/plain, */*',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal,
    });

    if (response.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('ReadableStream not supported by response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (!completedNormally) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Split SSE event blocks separated by double-newlines
      const events = buffer.split(/\n\n/);
      // Keep last potentially incomplete block in buffer
      buffer = events.pop() ?? '';

      for (const event of events) {
        if (!event.trim()) continue;
        const lines = event.split(/\r?\n/);
        const dataLines: string[] = [];

        for (const line of lines) {
          if (line.startsWith('data:')) {
            dataLines.push(line.slice(5));
          } else if (line.trim() !== '') {
            dataLines.push(line);
          }
        }

        const eventContent = dataLines.join('\n');

        // Check for stream termination signal
        if (eventContent.includes('[DONE]')) {
          const cleanToken = eventContent.replace(/\[DONE\]/g, '');
          if (cleanToken) {
            fullText += cleanToken;
            onToken(cleanToken);
          }
          completedNormally = true;
          try {
            await reader.cancel();
          } catch {}
          break;
        }

        if (eventContent) {
          fullText += eventContent;
          onToken(eventContent);
        }
      }
    }

    // Flush any trailing buffer
    if (!completedNormally && buffer.trim()) {
      const lines = buffer.split(/\r?\n/);
      const dataLines: string[] = [];
      for (const line of lines) {
        if (line.startsWith('data:')) {
          dataLines.push(line.slice(5));
        } else if (line.trim() !== '') {
          dataLines.push(line);
        }
      }
      const eventContent = dataLines.join('\n').replace(/\[DONE\]/g, '');
      if (eventContent) {
        fullText += eventContent;
        onToken(eventContent);
      }
    }

    onComplete(fullText);
  } catch (err: any) {
    if (err.name === 'AbortError' || signal?.aborted) {
      console.log('Stream generation cancelled by user');
      onComplete(fullText);
      return;
    }

    // If stream already delivered content or completed with [DONE] before socket close, treat as success
    if (completedNormally || fullText.trim().length > 0) {
      onComplete(fullText);
      return;
    }

    console.warn('Live stream error before receiving tokens, attempting fallback query:', err);
    try {
      const fallback = await chatApi.query(payload);
      onComplete(fallback.answer);
    } catch (fallbackErr) {
      onError?.(fallbackErr);
    }
  }
}

// Legacy facade for backward compatibility across existing modals
export const api = {
  getDocuments: () => documentApi.getMine(),
  getDocumentById: (id: string) => documentApi.getById(id),
  getDocumentChunks: (id: string) => documentApi.getChunks(id),
  uploadDocument: (file: File, onProgress?: (p: number) => void) =>
    documentApi.upload(file, onProgress),
  uploadMultipleDocuments: (
    files: File[],
    onProgress?: (overall: number, idx: number) => void
  ) => documentApi.uploadMultiple(files, onProgress),
  deleteDocument: (id: string) => documentApi.delete(id),
  askQuestion: async (question: string, documentId?: string, conversationId?: string) => {
    return chatApi.query({
      question,
      documentId,
      conversationId,
      topK: 5,
      minSimilarity: 0.0,
    });
  },
  streamQuestion: (
    question: string,
    documentId: string | undefined,
    conversationId: string | undefined,
    onToken: (token: string) => void,
    onComplete: (fullText: string) => void,
    onError?: (err: any) => void,
    signal?: AbortSignal
  ) => {
    return streamChat(
      {
        question,
        documentId,
        conversationId,
        topK: 5,
        minSimilarity: 0.0,
      },
      onToken,
      onComplete,
      onError,
      signal
    );
  },
  searchSimilar: (query: string, documentId?: string, topK: number = 5, minSimilarity: number = 0.0) => {
    return chatApi.similaritySearch(query, documentId, topK, minSimilarity);
  },
};
