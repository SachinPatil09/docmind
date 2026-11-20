import React, { useState } from 'react';
import {
  BookOpen,
  Sparkles,
  Search,
  ExternalLink,
  Sun,
  Moon,
  ChevronDown,
  Layers,
  Check,
  LogOut,
  Shield,
  Menu,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { DocumentMetadataDto } from '../types';
import { useAuthStore } from '../store/authStore';

interface HeaderProps {
  documents: DocumentMetadataDto[];
  selectedDocumentId: string | null;
  onSelectDocument: (id: string | null) => void;
  onOpenSearch: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onToggleMobileSidebar?: () => void;
  isMobileSidebarOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  documents,
  selectedDocumentId,
  onSelectDocument,
  onOpenSearch,
  isDarkMode,
  onToggleTheme,
  onToggleMobileSidebar,
  isMobileSidebarOpen,
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [isScopeDropdownOpen, setIsScopeDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const selectedDoc = documents.find((d) => d.id === selectedDocumentId);
  const scopeLabel = selectedDoc
    ? selectedDoc.filename
    : `All Documents (${documents.length})`;

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully');
    navigate('/login', { replace: true });
  };

  const userInitials = user?.username ? user.username.slice(0, 2).toUpperCase() : 'U';

  return (
    <header className="h-16 border-b border-[#1e293b] bg-[#090d16] px-3 sm:px-6 flex items-center justify-between z-30 shrink-0">
      {/* Left: Hamburger (mobile) + App Logo & Subtitle */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {onToggleMobileSidebar && (
          <button
            type="button"
            aria-label={isMobileSidebarOpen ? 'Close navigation sidebar' : 'Open navigation sidebar'}
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 rounded-xl bg-[#131b2e] hover:bg-[#1a253f] border border-[#233252] text-slate-300 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
          >
            {isMobileSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        )}

        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white shrink-0">
          <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="font-bold text-base sm:text-lg text-white tracking-tight">DocMind</span>
            <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-400" />
              AI RAG
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium hidden md:block">
            Spring AI • PostgreSQL pgvector • Gemini
          </p>
        </div>
      </div>

      {/* Center: Scope Pill Selector */}
      <div className="relative">
        <button
          type="button"
          aria-label="Select active document scope"
          onClick={() => setIsScopeDropdownOpen(!isScopeDropdownOpen)}
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-[#131b2e] hover:bg-[#1a253f] border border-[#233252] text-[11px] sm:text-xs font-medium text-slate-200 transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0"></span>
          <span className="max-w-[110px] sm:max-w-[220px] truncate">
            Scope: {scopeLabel}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </button>

        {isScopeDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setIsScopeDropdownOpen(false)}
            />
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 max-h-80 overflow-y-auto rounded-xl bg-[#0f172a] border border-[#1e293b] shadow-2xl z-40 p-1.5 animate-fade-in">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Select Active Scope
              </div>
              <button
                type="button"
                onClick={() => {
                  onSelectDocument(null);
                  setIsScopeDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  selectedDocumentId === null
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-300 hover:bg-[#1e293b]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400" />
                  <span>All Documents ({documents.length})</span>
                </div>
                {selectedDocumentId === null && <Check className="w-4 h-4 text-blue-400" />}
              </button>

              <div className="my-1 border-t border-[#1e293b]"></div>

              {documents.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => {
                    onSelectDocument(doc.id);
                    setIsScopeDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    selectedDocumentId === doc.id
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'text-slate-300 hover:bg-[#1e293b]'
                  }`}
                >
                  <span className="truncate pr-2">{doc.filename}</span>
                  {selectedDocumentId === doc.id && (
                    <Check className="w-4 h-4 text-blue-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Right: Actions (Search, Swagger, Theme, User Menu) */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          aria-label="Search document chunks"
          onClick={onOpenSearch}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#131b2e] hover:bg-[#1c2842] border border-[#233252] text-xs font-medium text-slate-300 transition-colors shadow-sm group focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400" />
          <span className="hidden sm:inline">Search</span>
        </button>

        <a
          href="http://localhost:8081/swagger-ui/index.html"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open backend Swagger UI documentation"
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#131b2e] hover:bg-[#1c2842] border border-[#233252] text-xs font-medium text-slate-300 transition-colors shadow-sm hover:text-white focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          title="Open Backend Swagger UI"
        >
          <span>Swagger</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </a>

        <button
          type="button"
          aria-label={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          onClick={onToggleTheme}
          className="p-2 rounded-lg bg-[#131b2e] hover:bg-[#1c2842] border border-[#233252] text-slate-300 transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
          title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
          ) : (
            <Moon className="w-4 h-4 text-blue-400" />
          )}
        </button>

        {/* User Profile Menu */}
        {user && (
          <div className="relative pl-1 sm:pl-2 border-l border-[#1e293b]">
            <button
              type="button"
              aria-label="Open user profile menu"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-1.5 sm:gap-2 p-1 sm:px-2.5 sm:py-1 rounded-lg bg-[#131b2e] hover:bg-[#1a253f] border border-[#233252] text-xs transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-sm shrink-0">
                {userInitials}
              </div>
              <span className="font-medium text-slate-200 hidden sm:inline truncate max-w-[90px]">
                {user.username}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {isUserMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsUserMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-[#0f172a] border border-[#1e293b] shadow-2xl z-40 p-2 animate-fade-in">
                  <div className="px-3 py-2 border-b border-[#1e293b]">
                    <p className="text-xs font-semibold text-white truncate">{user.username}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <Shield className="w-3 h-3 text-indigo-400" />
                      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {user.role || 'USER'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label="Sign out of account"
                    onClick={handleLogout}
                    className="w-full mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
