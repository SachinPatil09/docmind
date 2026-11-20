import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Copy,
  Check,
  CheckCircle2,
  Trash2,
  MessageSquare,
  HardDrive,
  Layers,
  BookOpen,
  Calendar,
  Loader2
} from 'lucide-react';
import { DocumentMetadata, Citation } from '../types';
import { formatBytes, formatDate, truncateUUID } from '../utils/formatters';

interface DocumentChunksModalProps {
  document: DocumentMetadata | null;
  isOpen: boolean;
  onClose: () => void;
  onFetchChunks: (id: string, fileName?: string) => Promise<Citation[]>;
  onDeleteDocument: (doc: DocumentMetadata) => void;
  onChatWithDocument: (doc: DocumentMetadata) => void;
}

export const DocumentChunksModal: React.FC<DocumentChunksModalProps> = ({
  document,
  isOpen,
  onClose,
  onFetchChunks,
  onDeleteDocument,
  onChatWithDocument,
}) => {
  const [chunks, setChunks] = useState<Citation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedUUID, setCopiedUUID] = useState(false);
  const [copiedChunkIdx, setCopiedChunkIdx] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen && document) {
      loadChunks();
    } else {
      setChunks([]);
      setShowDeleteConfirm(false);
    }
  }, [isOpen, document]);

  const loadChunks = async () => {
    if (!document) return;
    setIsLoading(true);
    try {
      const data = await onFetchChunks(document.id, document.filename);
      setChunks(data);
    } catch (err) {
      console.error('Failed to load chunks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !document) return null;

  const handleCopyUUID = () => {
    navigator.clipboard.writeText(document.id);
    setCopiedUUID(true);
    setTimeout(() => setCopiedUUID(false), 2000);
  };

  const handleCopyChunk = (idx: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedChunkIdx(idx);
    setTimeout(() => setCopiedChunkIdx(null), 2000);
  };

  const fileSizeLabel = formatBytes(document.fileSize || document.filesize);
  const totalChunksLabel = `${document.totalChunks || chunks.length} Chunks`;
  const totalPagesLabel = `${document.totalPages || 1} Pages`;
  const uploadedDateLabel = formatDate(document.createdAt);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header matching Screenshot 3 */}
        <div className="p-6 border-b border-slate-200 dark:border-[#1e293b] flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-600/15 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {document.filename}
              </h2>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
                <span>{truncateUUID(document.id, 10)}</span>
                <button
                  type="button"
                  aria-label="Copy document UUID"
                  onClick={handleCopyUUID}
                  title="Copy Document ID"
                  className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors focus-visible:ring-1 focus-visible:ring-blue-500 rounded cursor-pointer"
                >
                  {copiedUUID ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <span>•</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                  <CheckCircle2 className="w-3 h-3" />
                  INDEXED
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close document inspection modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1e293b] transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Stat Cards Grid matching Screenshot 3 */}
        <div className="p-6 border-b border-slate-100 dark:border-[#1e293b]/60">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {/* Card 1: File Size */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200 dark:border-[#1e293b] space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                <span>File Size</span>
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {fileSizeLabel}
              </p>
            </div>

            {/* Card 2: Vector Chunks */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200 dark:border-[#1e293b] space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>Vector Chunks</span>
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {totalChunksLabel}
              </p>
            </div>

            {/* Card 3: Total Pages */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200 dark:border-[#1e293b] space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                <span>Total Pages</span>
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {totalPagesLabel}
              </p>
            </div>

            {/* Card 4: Uploaded */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200 dark:border-[#1e293b] space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Uploaded</span>
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {uploadedDateLabel}
              </p>
            </div>
          </div>
        </div>

        {/* Indexed Vector Chunks Section matching Screenshot 3 */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider">
            <span>INDEXED VECTOR CHUNKS</span>
            <span>SAMPLE CHUNKS</span>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <p className="text-xs">Fetching stored vector chunks from database...</p>
            </div>
          ) : chunks.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No chunk details available.
            </div>
          ) : (
            <div className="space-y-3">
              {chunks.map((chunk, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 dark:border-[#1e293b] bg-slate-50/70 dark:bg-[#131b2e] p-4 space-y-2.5 transition-all group"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                      Chunk #{chunk.chunkIndex !== undefined ? chunk.chunkIndex : idx}
                    </span>
                    <button
                      onClick={() => handleCopyChunk(idx, chunk.snippet)}
                      className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      {copiedChunkIdx === idx ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-500">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Chunk</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="text-xs font-mono text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap bg-white dark:bg-[#0b0f19] p-3.5 rounded-lg border border-slate-200/80 dark:border-[#1e293b]/70 select-text">
                    {chunk.snippet}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer matching Screenshot 3 */}
        <div className="p-4 sm:px-6 border-t border-slate-200 dark:border-[#1e293b] flex items-center justify-between bg-slate-50 dark:bg-[#0d1424]">
          {/* Delete Action (Left) */}
          <div>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors py-2 px-1"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Document</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-500 font-medium">Confirm delete?</span>
                <button
                  onClick={() => {
                    onDeleteDocument(document);
                    onClose();
                  }}
                  className="px-2.5 py-1 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                >
                  Yes, Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1e293b] border border-slate-300 dark:border-[#233252] transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                onChatWithDocument(document);
                onClose();
              }}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat with Document</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
