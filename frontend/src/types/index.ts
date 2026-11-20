export type DocumentStatus = 'UPLOADING' | 'PROCESSING' | 'INDEXED' | 'FAILED';
export type UserRole = 'USER' | 'ADMIN';

export interface UserDto {
  id: number;
  username: string;
  email: string;
  role: UserRole;
}

export interface LoginResponse {
  accessToken: string;
  user: UserDto;
}

export interface DocumentMetadataDto {
  id: string;
  filename: string;
  contentType: string;
  fileSize?: number;
  filesize?: number;
  totalPages?: number;
  totalChunks?: number;
  status: DocumentStatus;
  errorMessage?: string | null;
  createdAt?: string;
  updatedAt?: string;
  userId?: number;
}

// Backward compatibility alias
export type DocumentMetadata = DocumentMetadataDto;

export interface DocumentResponseDTO {
  id: string;
  fileName: string;
  fileSize: number;
  status: DocumentStatus;
  chunksCreated: number;
  message?: string;
  userId?: number;
}

export interface CitationDto {
  documentId?: string;
  fileName: string;
  chunkIndex?: number;
  pageNumber?: number | string;
  snippet: string;
  similarityScore?: number;
  metadata?: Record<string, any>;
}

// Backward compatibility alias
export type Citation = CitationDto;

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredMessage {
  id: string;
  conversationId: string;
  messageType: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  createdAt: string;
  citations?: CitationDto[];
  responseTimeMs?: number;
  error?: boolean;
  interrupted?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  citations?: CitationDto[];
  responseTimeMs?: number;
  isStreaming?: boolean;
  error?: boolean;
  interrupted?: boolean;
}

export interface ChatQueryRequest {
  question: string;
  documentId?: string;
  topK?: number;
  minSimilarity?: number;
  conversationId?: string;
}

export interface ChatQueryResponse {
  answer: string;
  conversationId: string;
  citations: CitationDto[];
  responseTimeMs: number;
}

export interface SearchResultDto {
  query: string;
  totalMatches: number;
  matches: CitationDto[];
}

// Backward compatibility alias
export type SearchResult = SearchResultDto;

export interface ApiResponse<T> {
  success: boolean;
  message: string | null;
  data: T;
  timestamp: string;
}

export interface UploadProgressItem {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'indexed' | 'failed';
  errorMessage?: string;
  result?: DocumentResponseDTO;
}
