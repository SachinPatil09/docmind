import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  MessageSquare,
  Trash2,
  Check,
  X,
  Clock,
  Search,
  Pencil,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useConversationStore } from '../store/conversationStore';
import { Conversation } from '../types';

// Helper for relative timestamps
function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return 'Recently';
  const now = new Date();
  const date = new Date(dateStr);
  const diffSecs = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSecs < 60) return 'Just now';
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// Group conversations by Today, Yesterday, and Earlier
function categorizeChats(chats: Conversation[]): {
  today: Conversation[];
  yesterday: Conversation[];
  earlier: Conversation[];
} {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

  const today: Conversation[] = [];
  const yesterday: Conversation[] = [];
  const earlier: Conversation[] = [];

  for (const chat of chats) {
    const time = new Date(chat.updatedAt || chat.createdAt).getTime();
    if (time >= startOfToday) {
      today.push(chat);
    } else if (time >= startOfYesterday) {
      yesterday.push(chat);
    } else {
      earlier.push(chat);
    }
  }

  return { today, yesterday, earlier };
}

export const ChatsPanel: React.FC = () => {
  const {
    conversations,
    activeConversationId,
    newChat,
    selectChat,
    deleteChat,
    renameChat,
    isLoadingChats,
  } = useConversationStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Focus rename input on activation
  useEffect(() => {
    if (editingChatId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingChatId]);

  const handleStartNewChat = () => {
    newChat();
    setConfirmDeleteId(null);
    setEditingChatId(null);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteChat(id);
      toast.success('Chat deleted');
    } catch {
      toast.error('Failed to delete chat');
    }
    setConfirmDeleteId(null);
  };

  const handleStartRename = (e: React.MouseEvent, chat: Conversation) => {
    e.stopPropagation();
    setConfirmDeleteId(null);
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
  };

  const handleSaveRename = async (id: string) => {
    if (editTitle.trim()) {
      try {
        await renameChat(id, editTitle.trim());
        toast.success('Chat renamed');
      } catch {
        toast.error('Failed to rename chat');
      }
    }
    setEditingChatId(null);
  };

  const handleCancelRename = () => {
    setEditingChatId(null);
  };

  // Filter conversations
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  const grouped = useMemo(() => categorizeChats(filteredChats), [filteredChats]);

  const renderChatSection = (title: string, list: Conversation[]) => {
    if (list.length === 0) return null;

    return (
      <div className="space-y-1 mb-3">
        <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 select-none">
          {title} ({list.length})
        </div>
        <AnimatePresence initial={false}>
          {list.map((chat) => {
            const isActive = chat.id === activeConversationId;
            const isDeleting = confirmDeleteId === chat.id;
            const isEditing = editingChatId === chat.id;

            return (
              <motion.div
                key={chat.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.18 }}
                onClick={() => {
                  if (!isDeleting && !isEditing) {
                    selectChat(chat.id);
                  }
                }}
                className={`group relative flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all focus-within:ring-2 focus-within:ring-blue-500/50 ${
                  isActive
                    ? 'bg-blue-600/15 border border-blue-500/30 text-white font-medium shadow-sm'
                    : 'text-slate-300 hover:bg-[#131b2e] border border-transparent hover:border-[#1e293b]'
                }`}
              >
                {/* Left icon + Content / Rename input */}
                <div className="flex items-center gap-2.5 min-w-0 pr-1 flex-1">
                  <MessageSquare
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-400'
                    }`}
                  />

                  {isEditing ? (
                    <div
                      className="flex items-center gap-1.5 flex-1 min-w-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(chat.id);
                          if (e.key === 'Escape') handleCancelRename();
                        }}
                        className="w-full px-2 py-0.5 bg-[#090d16] border border-blue-500 rounded text-xs text-white focus:outline-none"
                      />
                      <button
                        aria-label="Save new chat title"
                        onClick={() => handleSaveRename(chat.id)}
                        className="p-1 text-emerald-400 hover:text-emerald-300 rounded hover:bg-emerald-500/15"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        aria-label="Cancel rename"
                        onClick={handleCancelRename}
                        className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-700/20"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div
                      className="min-w-0 flex-1"
                      onDoubleClick={(e) => handleStartRename(e, chat)}
                      title="Double-click to rename"
                    >
                      <p className="truncate text-xs leading-snug">{chat.title || 'Untitled Chat'}</p>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{formatRelativeTime(chat.updatedAt || chat.createdAt)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions: Rename / Delete buttons */}
                {!isEditing && (
                  <div className="shrink-0 flex items-center">
                    {isDeleting ? (
                      <div
                        className="flex items-center gap-1 bg-[#1a253f] border border-red-500/40 rounded-lg p-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          aria-label="Confirm chat deletion"
                          onClick={(e) => handleDelete(e, chat.id)}
                          className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          aria-label="Cancel chat deletion"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(null);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700/30 rounded transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                        <button
                          aria-label="Rename chat"
                          onClick={(e) => handleStartRename(e, chat)}
                          className="p-1 text-slate-400 hover:text-blue-400 hover:bg-[#1e293b] rounded transition-all focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-blue-500"
                          title="Rename chat"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          aria-label="Delete chat"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(chat.id);
                          }}
                          className="p-1 text-slate-400 hover:text-red-400 hover:bg-[#1e293b] rounded transition-all focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-red-500"
                          title="Delete chat"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full select-none">
      {/* Top Action Header: New Chat Button & Filter */}
      <div className="p-3 space-y-2 border-b border-[#1e293b]/50">
        <button
          onClick={handleStartNewChat}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all cursor-pointer group focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none"
        >
          <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span>New Chat</span>
        </button>

        {conversations.length > 2 && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-7 py-1 bg-[#090d16] border border-[#1e293b] rounded-lg text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                aria-label="Clear chat search"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Conversations List with Skeletons / Categorized Grouping */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {isLoadingChats ? (
          /* Skeleton Loaders */
          <div className="space-y-2 p-1">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="p-3 rounded-xl bg-[#0f172a]/60 border border-[#1e293b]/60 animate-pulse flex items-center gap-3"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-800 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 bg-slate-800 rounded w-4/5" />
                  <div className="h-2 bg-slate-800/60 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          /* Empty State */
          <div className="text-center py-12 px-4 animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600/15 to-indigo-600/20 border border-blue-500/20 flex items-center justify-center mx-auto mb-3 text-blue-400 shadow-lg shadow-blue-500/10">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-xs font-semibold text-slate-200 mb-1">No chats yet</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-4 max-w-[200px] mx-auto">
              Ask any question to create your first session
            </p>
            <button
              onClick={handleStartNewChat}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#131b2e] hover:bg-[#1a253f] border border-[#233252] text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Start a chat</span>
            </button>
          </div>
        ) : filteredChats.length === 0 ? (
          /* No search results */
          <div className="text-center py-10 px-4 text-xs text-slate-400">
            No conversations match "{searchQuery}"
          </div>
        ) : (
          /* Grouped list */
          <>
            {renderChatSection('Today', grouped.today)}
            {renderChatSection('Yesterday', grouped.yesterday)}
            {renderChatSection('Earlier', grouped.earlier)}
          </>
        )}
      </div>
    </div>
  );
};
