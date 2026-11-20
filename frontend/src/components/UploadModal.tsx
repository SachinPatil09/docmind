import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  FileUp
} from 'lucide-react';
import { UploadProgressItem, DocumentResponseDTO } from '../types';
import { formatBytes } from '../utils/formatters';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSingle: (file: File, onProgress: (pct: number) => void) => Promise<DocumentResponseDTO>;
  onUploadMultiple?: (
    files: File[],
    onProgress: (overallPct: number, fileIdx: number) => void
  ) => Promise<DocumentResponseDTO[]>;
  onSuccess: () => void;
  initialFiles?: FileList | null;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSingle,
  onSuccess,
  initialFiles,
}) => {
  const [items, setItems] = useState<UploadProgressItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize with any passed drag-drop files
  React.useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      addFiles(Array.from(initialFiles));
    }
  }, [initialFiles]);

  if (!isOpen) return null;

  const addFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter((file) => {
      // Check size limit: 25MB
      if (file.size > 25 * 1024 * 1024) {
        alert(`File ${file.name} exceeds 25MB limit.`);
        return false;
      }
      return true;
    });

    const newItems: UploadProgressItem[] = validFiles.map((file) => ({
      file,
      id: crypto.randomUUID(),
      progress: 0,
      status: 'pending',
    }));

    setItems((prev) => [...prev, ...newItems]);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const removeItem = (id: string) => {
    if (isUploading) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const startUpload = async () => {
    if (items.length === 0 || isUploading) return;

    setIsUploading(true);
    setOverallProgress(0);

    const filesToUpload = items.map((i) => i.file);

    try {
      if (filesToUpload.length === 1) {
        // Single file upload
        const item = items[0];
        setItems((prev) => [
          { ...prev[0], status: 'uploading', progress: 10 }
        ]);

        const result = await onUploadSingle(item.file, (pct) => {
          setItems((prev) => [
            {
              ...prev[0],
              progress: pct,
              status: pct === 100 ? 'processing' : 'uploading',
            }
          ]);
          setOverallProgress(pct);
        });

        setItems((prev) => [
          {
            ...prev[0],
            progress: 100,
            status: 'indexed',
            result,
          }
        ]);
        setOverallProgress(100);
      } else {
        // Multiple files upload
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          setItems((prev) =>
            prev.map((it, idx) =>
              idx === i ? { ...it, status: 'uploading', progress: 10 } : it
            )
          );

          try {
            const result = await onUploadSingle(item.file, (pct) => {
              setItems((prev) =>
                prev.map((it, idx) =>
                  idx === i
                    ? {
                        ...it,
                        progress: pct,
                        status: pct === 100 ? 'processing' : 'uploading',
                      }
                    : it
                )
              );
              const currentTotal = Math.round(
                ((i + pct / 100) / items.length) * 100
              );
              setOverallProgress(currentTotal);
            });

            setItems((prev) =>
              prev.map((it, idx) =>
                idx === i
                  ? { ...it, progress: 100, status: 'indexed', result }
                  : it
              )
            );
          } catch (err: any) {
            setItems((prev) =>
              prev.map((it, idx) =>
                idx === i
                  ? {
                      ...it,
                      status: 'failed',
                      errorMessage: err.message || 'Upload failed',
                    }
                  : it
              )
            );
          }
        }
        setOverallProgress(100);
      }

      onSuccess();
    } catch (err: any) {
      console.error('Upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const isAllComplete =
    items.length > 0 &&
    items.every((it) => it.status === 'indexed' || it.status === 'failed');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-[#0f172a] border border-[#1e293b] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#1e293b] flex items-center justify-between bg-[#0d1424]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <FileUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Upload & Index Documents
              </h3>
              <p className="text-[11px] text-slate-400">
                Documents are split into chunks and embedded in PostgreSQL pgvector
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close upload modal"
            onClick={onClose}
            disabled={isUploading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#1e293b] transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Drag & Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-blue-500 bg-blue-600/10'
                : 'border-[#233252] hover:border-blue-500/60 bg-[#0b0f19]/70 hover:bg-[#111a30]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.md,.csv"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <div className="w-12 h-12 mx-auto rounded-full bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-200">
              Choose single or multiple files, or drag them here
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports PDF, Word (.docx), Markdown (.md), TXT, CSV (max 25MB each)
            </p>
          </div>

          {/* Overall Progress Bar (Visible during multi-file upload) */}
          {isUploading && (
            <div className="p-3 rounded-xl bg-[#131b2e] border border-[#233252] space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-300">Overall Progress</span>
                <span className="text-blue-400 font-mono font-bold">
                  {overallProgress}%
                </span>
              </div>
              <div className="w-full h-2 bg-[#090d16] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-300 rounded-full"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Selected Files Queue */}
          {items.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
                <span>Selected Files ({items.length})</span>
                {!isUploading && (
                  <button
                    onClick={() => setItems([])}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-[#131b2e] border border-[#1e293b] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-200 truncate">
                            {item.file.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {formatBytes(item.file.size)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.status === 'pending' && (
                          <span className="text-[11px] text-slate-400">Ready</span>
                        )}
                        {item.status === 'uploading' && (
                          <span className="text-[11px] text-blue-400 flex items-center gap-1 font-mono">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {item.progress}%
                          </span>
                        )}
                        {item.status === 'processing' && (
                          <span className="text-[11px] text-amber-400 flex items-center gap-1 animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Indexing...
                          </span>
                        )}
                        {item.status === 'indexed' && (
                          <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Indexed ({item.result?.chunksCreated || 0} chunks)
                          </span>
                        )}
                        {item.status === 'failed' && (
                          <span className="text-[11px] text-red-400 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Failed
                          </span>
                        )}

                        {!isUploading && (
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Per-item progress bar */}
                    {(item.status === 'uploading' || item.status === 'processing') && (
                      <div className="w-full h-1.5 bg-[#0b0f19] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-200"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#1e293b] bg-[#0d1424] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-[#1e293b] border border-transparent transition-colors disabled:opacity-50"
          >
            {isAllComplete ? 'Done' : 'Cancel'}
          </button>

          {!isAllComplete && (
            <button
              onClick={startUpload}
              disabled={items.length === 0 || isUploading}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-md transition-all ${
                items.length > 0 && !isUploading
                  ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing & Indexing...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload & Index ({items.length})</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
