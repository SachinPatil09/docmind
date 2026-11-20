import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  UploadCloud,
  FileText,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Layers,
  Trash2,
  Eye,
  MessageSquare,
  Files
} from 'lucide-react';
import { DocumentMetadataDto } from '../types';
import { formatBytes } from '../utils/formatters';
import { ChatsPanel } from './ChatsPanel';
import { useConversationStore } from '../store/conversationStore';
import { useDocumentStore } from '../store/documentStore';

interface SidebarProps {
  documents: DocumentMetadataDto[];
  selectedDocumentId: string | null;
  onSelectDocument: (id: string | null) => void;
  onOpenUpload: () => void;
  onViewChunks: (doc: DocumentMetadataDto) => void;
  onDeleteDocument: (doc: DocumentMetadataDto) => void;
  onDropFiles: (files: FileList) => void;
  activeTab: 'documents' | 'chats';
  onTabChange: (tab: 'documents' | 'chats') => void;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  documents,
  selectedDocumentId,
  onSelectDocument,
  onOpenUpload,
  onViewChunks,
  onDeleteDocument,
  onDropFiles,
  activeTab,
  onTabChange,
  onCloseMobile,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const conversations = useConversationStore((s) => s.conversations);
  const isLoadingDocuments = useDocumentStore((s) => s.isLoading);

  const filteredDocs = documents.filter((doc) =>
    doc.filename.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onDropFiles(e.dataTransfer.files);
    }
  };

  const handleDocSelect = (id: string | null) => {
    onSelectDocument(id);
    onCloseMobile?.();
  };

  const renderStatusBadge = (doc: DocumentMetadataDto) => {
    if (doc.status === 'INDEXED') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          Indexed
        </span>
      );
    }
    if (doc.status === 'PROCESSING' || doc.status === 'UPLOADING') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 animate-pulse">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          Processing
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-400">
        <AlertCircle className="w-3.5 h-3.5 text-red-400" />
        Failed
      </span>
    );
  };

  return (
    <aside className="w-full sm:w-80 h-full border-r border-[#1e293b] bg-[#090d16] flex flex-col shrink-0 select-none">
      {/* Knowledge Base Header */}
      <div className="p-4 border-b border-[#1e293b]/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100 tracking-tight">
              DocMind Hub
            </h2>
            <p className="text-[11px] text-slate-400">
              Workspace & Vector Memory
            </p>
          </div>
        </div>

        {/* Mobile close button */}
        {onCloseMobile && (
          <button
            type="button"
            aria-label="Close navigation sidebar"
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#131b2e] transition-colors focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Segmented Tab Switcher: Documents vs Chats */}
      <div className="p-3 border-b border-[#1e293b]/60 bg-[#0c1220]">
        <div className="grid grid-cols-2 p-1 bg-[#090d16] border border-[#1e293b] rounded-xl text-xs">
          <button
            type="button"
            onClick={() => onTabChange('documents')}
            className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg font-medium transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none ${
              activeTab === 'documents'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Files className="w-3.5 h-3.5" />
            <span>Documents</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'documents'
                  ? 'bg-white/20 text-white'
                  : 'bg-[#1e293b] text-slate-400'
              }`}
            >
              {documents.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('chats')}
            className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg font-medium transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none ${
              activeTab === 'chats'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chats</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'chats'
                  ? 'bg-white/20 text-white'
                  : 'bg-[#1e293b] text-slate-400'
              }`}
            >
              {conversations.length}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content Area based on Tab */}
      {activeTab === 'chats' ? (
        <div className="flex-1 overflow-hidden">
          <ChatsPanel />
        </div>
      ) : (
        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          {/* Upload Drop Zone Card */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={onOpenUpload}
            className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 group focus-within:ring-2 focus-within:ring-blue-500/50 ${
              isDraggingOver
                ? 'border-blue-500 bg-blue-600/10 scale-[1.01]'
                : 'border-[#233252] hover:border-blue-500/60 bg-[#0d1424]/60 hover:bg-[#111a30]'
            }`}
          >
            <div className="w-10 h-10 mx-auto rounded-full bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-5 h-5" />
            </div>
            <p className="mt-2.5 text-xs font-semibold text-blue-400 group-hover:text-blue-300">
              Upload document or drag here
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              PDF, Word, Markdown, TXT, CSV (max 25MB)
            </p>
          </div>

          {/* All Documents Selection Card */}
          <div
            onClick={() => handleDocSelect(null)}
            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all focus-within:ring-2 focus-within:ring-blue-500/50 ${
              selectedDocumentId === null
                ? 'bg-[#15223d] border-blue-500/50 text-white shadow-md'
                : 'bg-[#0f172a]/70 border-[#1e293b] hover:bg-[#141e36] text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  selectedDocumentId === null ? 'bg-blue-600 text-white' : 'bg-[#1e293b] text-blue-400'
                }`}
              >
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">All Documents</p>
                <p className="text-[11px] text-slate-400 truncate">
                  Search across complete corpus
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#1e293b] text-slate-300 border border-[#2d3d5e]">
              {documents.length}
            </span>
          </div>

          {/* Filter Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Filter documents by file name"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter files..."
              className="w-full pl-8 pr-7 py-1.5 bg-[#0f172a] border border-[#1e293b] rounded-lg text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {filterQuery && (
              <button
                type="button"
                aria-label="Clear document filter query"
                onClick={() => setFilterQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Documents Section Header */}
          <div className="flex items-center justify-between pt-1 px-1 text-[11px] font-bold text-slate-400 tracking-wider">
            <span>MY DOCUMENTS ({filteredDocs.length})</span>
            <span>STATUS</span>
          </div>

          {/* Documents List with Skeletons / Animation */}
          <div className="space-y-2">
            {isLoadingDocuments && documents.length === 0 ? (
              /* Skeletons */
              <div className="space-y-2">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="p-3 rounded-xl bg-[#0f172a]/70 border border-[#1e293b] animate-pulse flex items-start gap-2.5"
                  >
                    <div className="w-8 h-8 rounded-md bg-slate-800 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-slate-800 rounded w-3/4" />
                      <div className="h-2 bg-slate-800/60 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredDocs.length === 0 ? (
              /* Empty state */
              <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-[#1e293b] rounded-xl animate-fade-in">
                <FileText className="w-8 h-8 mx-auto mb-2 text-slate-500 opacity-60" />
                <p className="font-medium text-slate-300 mb-1">No documents found</p>
                <p className="text-[11px] text-slate-400 mb-3">
                  {filterQuery ? `No files match "${filterQuery}"` : 'Upload your first PDF or Word document'}
                </p>
                {!filterQuery && (
                  <button
                    type="button"
                    onClick={onOpenUpload}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-400 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <span>Upload Document</span>
                  </button>
                )}
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {filteredDocs.map((doc) => {
                  const isSelected = selectedDocumentId === doc.id;
                  const sizeLabel = formatBytes(doc.fileSize || doc.filesize);
                  const pagesLabel = `${doc.totalPages || 1}p`;
                  const chunksCount = doc.totalChunks || 0;

                  return (
                    <motion.div
                      key={doc.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.18 }}
                      onClick={() => onViewChunks(doc)}
                      className={`group relative p-3 rounded-xl border transition-all cursor-pointer focus-within:ring-2 focus-within:ring-blue-500/50 ${
                        isSelected
                          ? 'bg-[#15223d] border-blue-500/60 shadow-sm'
                          : 'bg-[#0f172a]/70 border-[#1e293b] hover:bg-[#141f38] hover:border-[#2d3d5e]'
                      }`}
                    >
                      {/* Top Row: File icon + Name + Details */}
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 rounded-md bg-[#18233c] text-blue-400 mt-0.5 shrink-0">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4
                            className="text-xs font-semibold text-slate-200 truncate group-hover:text-blue-400 transition-colors"
                            title={doc.filename}
                          >
                            {doc.filename}
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {sizeLabel} • {pagesLabel}
                          </p>
                        </div>

                        {/* Quick action buttons on hover / focus */}
                        <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 flex items-center gap-1 transition-opacity">
                          <button
                            type="button"
                            aria-label={`Chat with ${doc.filename}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDocSelect(doc.id);
                            }}
                            title="Chat with this document"
                            className="p-1 rounded hover:bg-blue-600/20 text-slate-400 hover:text-blue-400 cursor-pointer focus-visible:ring-1 focus-visible:ring-blue-500"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`View chunks for ${doc.filename}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewChunks(doc);
                            }}
                            title="View chunks"
                            className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 cursor-pointer focus-visible:ring-1 focus-visible:ring-blue-500"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${doc.filename}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteDocument(doc);
                            }}
                            title="Delete document"
                            className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 cursor-pointer focus-visible:ring-1 focus-visible:ring-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Bottom Row: Chunks count + Status */}
                      <div className="mt-2.5 pt-2 border-t border-[#1e293b]/50 flex items-center justify-between text-[11px] text-slate-400">
                        <span>{chunksCount} chunks</span>
                        <div>{renderStatusBadge(doc)}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
