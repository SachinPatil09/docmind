import React, { useState, useEffect } from 'react';
import {
  Search,
  X,
  Sparkles,
  FileText,
  Loader2,
  Copy,
  Check,
  MessageSquare
} from 'lucide-react';
import { Citation, SearchResult, DocumentMetadata } from '../types';
import { formatScore } from '../utils/formatters';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPerformSearch: (query: string, documentId?: string) => Promise<SearchResult>;
  documents: DocumentMetadata[];
  selectedDocumentId: string | null;
  onChatWithCitation: (citation: Citation) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onPerformSearch,
  documents,
  selectedDocumentId,
  onChatWithCitation,
}) => {
  const [query, setQuery] = useState('');
  const [scopedDocId, setScopedDocId] = useState<string | undefined>(
    selectedDocumentId || undefined
  );
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  useEffect(() => {
    setScopedDocId(selectedDocumentId || undefined);
  }, [selectedDocumentId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    setHasSearched(true);
    try {
      const searchRes = await onPerformSearch(query.trim(), scopedDocId);
      setResults(searchRes);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (idx: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header matching Screenshot 2 */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#1e293b] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Semantic Vector Similarity Search
            </h3>
          </div>
          <button
            type="button"
            aria-label="Close search modal"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1e293b] transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input Bar matching Screenshot 2 */}
        <div className="p-6 border-b border-slate-100 dark:border-[#1e293b]/60">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search concepts, clauses, or facts across vector chunks..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-[#233252] focus:border-blue-500 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className={`px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-sm transition-all flex items-center gap-1.5 ${
                query.trim() && !isLoading
                  ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20 cursor-pointer'
                  : 'bg-blue-300 dark:bg-blue-800/40 text-slate-200 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <span>Search</span>
              )}
            </button>
          </form>

          {/* Scope filter selector */}
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
            <div className="flex items-center gap-2">
              <span>Filter Scope:</span>
              <select
                value={scopedDocId || ''}
                onChange={(e) => setScopedDocId(e.target.value || undefined)}
                className="bg-transparent border border-slate-200 dark:border-[#1e293b] rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="">All Documents ({documents.length})</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.filename}
                  </option>
                ))}
              </select>
            </div>
            {hasSearched && results && (
              <span className="font-medium text-slate-600 dark:text-slate-300">
                Found {results.totalMatches} matches
              </span>
            )}
          </div>
        </div>

        {/* Results / Empty State Body */}
        <div className="p-6 overflow-y-auto flex-1 min-h-[260px] flex flex-col justify-center">
          {!hasSearched ? (
            /* Screenshot 2 Exact Empty State */
            <div className="text-center py-12 text-slate-400 dark:text-slate-500 space-y-3">
              <div className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 flex items-center justify-center">
                <Sparkles className="w-8 h-8" />
              </div>
              <p className="text-xs">
                Type a search term above to inspect matching vector chunks.
              </p>
            </div>
          ) : results && results.matches.length > 0 ? (
            /* Matches List */
            <div className="space-y-3 my-auto">
              {results.matches.map((match, idx) => {
                const scoreLabel = formatScore(match.similarityScore);
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200 dark:border-[#1e293b] hover:border-blue-500/50 transition-all space-y-2 group"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                        <FileText className="w-3.5 h-3.5 text-blue-500" />
                        <span className="truncate max-w-[260px]">{match.fileName}</span>
                        {match.chunkIndex !== undefined && (
                          <span className="text-slate-400 font-mono text-[11px]">
                            • Chunk #{match.chunkIndex}
                          </span>
                        )}
                        {match.pageNumber && (
                          <span className="text-slate-400 text-[11px]">
                            • p. {match.pageNumber}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {scoreLabel && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
                            {scoreLabel} match
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Snippet */}
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-mono bg-white dark:bg-[#090d16] p-3 rounded-lg border border-slate-100 dark:border-[#1e293b]/60 leading-relaxed whitespace-pre-wrap">
                      {match.snippet}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleCopy(idx, match.snippet)}
                        className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors px-2 py-1 rounded"
                      >
                        {copiedIdx === idx ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-500 font-medium">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Snippet</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          onChatWithCitation(match);
                          onClose();
                        }}
                        className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 dark:bg-blue-600/10 dark:hover:bg-blue-600/20 border border-blue-200 dark:border-blue-500/20"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Ask AI about this chunk</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400 dark:text-slate-500">
              <p className="text-xs">No matching vector chunks found for "{query}".</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
