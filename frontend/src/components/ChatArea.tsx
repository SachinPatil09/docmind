import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Zap,
  FileText,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  FileCode,
  HelpCircle,
  CheckSquare,
  Compass,
  Square,
  RotateCcw,
  Trash2,
  Download,
  MessageSquare
} from 'lucide-react';
import { ChatMessage, DocumentMetadata, Citation } from '../types';
import { formatScore } from '../utils/formatters';

interface CodeBlockProps {
  language?: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-[#1e293b] bg-[#070b14] shadow-md group">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#0e1628] border-b border-[#1e293b]/80 text-xs text-slate-400">
        <span className="font-mono text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[#1a253d] transition-colors text-slate-300 hover:text-white text-[11px]"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <div className="p-3.5 overflow-x-auto text-[13px] font-mono text-slate-200 leading-relaxed">
        <pre className="!bg-transparent !p-0 !m-0 !border-0 font-mono">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

interface ChatAreaProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isStreamingEnabled: boolean;
  onToggleStreaming: () => void;
  onSendMessage: (text: string) => void;
  selectedDocument: DocumentMetadata | null;
  onClearChat?: () => void;
  onStopGeneration?: () => void;
  onRegenerate?: () => void;
  onChatWithCitation?: (citation: Citation) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isLoading,
  isStreamingEnabled,
  onToggleStreaming,
  onSendMessage,
  selectedDocument,
  onClearChat,
  onStopGeneration,
  onRegenerate,
  onChatWithCitation,
}) => {
  const [inputText, setInputText] = useState('');
  const [expandedCitations, setExpandedCitations] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isAnyStreaming = messages.some((m) => m.isStreaming);
  const isGenerating = isLoading || isAnyStreaming;

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 80;
    setIsAtBottom(atBottom);
  };

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom(!isGenerating);
    }
  }, [messages, isGenerating, isAtBottom]);

  // Handle escape key to stop generation
  useEffect(() => {
    const handleKeyDownGlobal = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isGenerating && onStopGeneration) {
        onStopGeneration();
      }
    };
    window.addEventListener('keydown', handleKeyDownGlobal);
    return () => window.removeEventListener('keydown', handleKeyDownGlobal);
  }, [isGenerating, onStopGeneration]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!inputText.trim() || isGenerating) return;
    onSendMessage(inputText.trim());
    setInputText('');
    setIsAtBottom(true);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleInputResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  const toggleCitation = (key: string) => {
    setExpandedCitations((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportChat = () => {
    if (messages.length === 0) return;
    const exportText = messages
      .map(
        (m) =>
          `### ${m.sender === 'user' ? 'User' : 'DocMind AI'} (${m.timestamp})\n\n${m.text}\n`
      )
      .join('\n---\n\n');
    const blob = new Blob([exportText], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `docmind-conversation-${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Feature templates matching Screenshot 1
  const featureTemplates = [
    {
      title: 'Summarize Key Points',
      desc: 'Summarize the key points and executive highlights of this document.',
      icon: FileCode,
      prompt: selectedDocument
        ? `Summarize the key points and executive highlights of ${selectedDocument.filename}.`
        : 'Summarize the key points and executive highlights of all uploaded documents.',
    },
    {
      title: 'Interview / Q&A Insights',
      desc: 'What are the most critical questions and answers covered in this text?',
      icon: HelpCircle,
      prompt: selectedDocument
        ? `What are the most critical questions and answers covered in ${selectedDocument.filename}?`
        : 'What are the most critical questions and answers covered in these documents?',
    },
    {
      title: 'Action Items & Deadlines',
      desc: 'List all actionable takeaways, deadlines, and responsibilities mentioned.',
      icon: CheckSquare,
      prompt: selectedDocument
        ? `List all actionable takeaways, deadlines, and responsibilities mentioned in ${selectedDocument.filename}.`
        : 'List all actionable takeaways, deadlines, and responsibilities mentioned in the documents.',
    },
    {
      title: 'Technical Concepts',
      desc: 'Explain the main technical concepts and architecture described in this document.',
      icon: Compass,
      prompt: selectedDocument
        ? `Explain the main technical concepts and architecture described in ${selectedDocument.filename}.`
        : 'Explain the main technical concepts and architecture described in the documents.',
    },
  ];

  // Quick suggestion chips when conversation is active
  const quickSuggestionChips = [
    {
      label: '⚡ Summarize key takeaways',
      prompt: 'Summarize the key takeaways and actionable conclusions in 3 concise bullet points.',
    },
    {
      label: '🔍 Technical deep-dive',
      prompt: 'Explain the technical architecture and specifications in more detail.',
    },
    {
      label: '❓ Critical interview Q&A',
      prompt: 'What are the top 3 interview questions and answers based on this context?',
    },
  ];

  const placeholderText = selectedDocument
    ? `Ask a question about ${selectedDocument.filename}...`
    : 'Ask a question across all documents...';

  const contextLabel = selectedDocument
    ? selectedDocument.filename
    : 'All Uploaded Documents';

  return (
    <main className="flex-1 flex flex-col h-full bg-[#0b0f19] relative overflow-hidden">
      {/* Top Context Sub-Bar */}
      <div className="h-11 px-6 border-b border-[#1e293b]/60 bg-[#090d16]/70 backdrop-blur-sm flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-slate-400">Context:</span>
          <span className="text-slate-200 font-semibold truncate max-w-md">
            {contextLabel}
          </span>
        </div>

        {/* Action Controls: Stream Tokens Switch, Export, Clear */}
        <div className="flex items-center gap-3">
          {/* Stream Tokens Switch */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="stream-toggle"
              className="text-xs font-medium text-slate-400 cursor-pointer select-none"
            >
              Stream Tokens
            </label>
            <button
              id="stream-toggle"
              type="button"
              role="switch"
              aria-label="Toggle live token streaming"
              aria-checked={isStreamingEnabled}
              onClick={onToggleStreaming}
              className={`w-9 h-5 rounded-full transition-colors relative focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer ${
                isStreamingEnabled ? 'bg-blue-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  isStreamingEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {messages.length > 0 && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-[#1e293b]">
              <button
                type="button"
                aria-label="Export conversation as Markdown"
                onClick={handleExportChat}
                className="p-1.5 rounded-lg hover:bg-[#16223e] text-slate-400 hover:text-slate-200 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
                title="Export conversation as Markdown"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              {onClearChat && (
                <button
                  type="button"
                  aria-label="Clear current conversation"
                  onClick={onClearChat}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none cursor-pointer"
                  title="Clear conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chat Messages / Empty State Scrollable Container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6 scroll-smooth"
      >
        {messages.length === 0 ? (
          /* Empty / Welcome State matching Screenshot 1 */
          <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center animate-fade-in my-auto py-8">
            {/* Blue glowing hero icon */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-xl shadow-blue-500/25 mb-5 text-white">
              <Sparkles className="w-8 h-8" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              DocMind AI Document Assistant
            </h1>
            <p className="mt-2 text-sm text-slate-400 max-w-lg leading-relaxed">
              Upload PDF reports, Word files, or notes and chat naturally with grounded facts,
              source citations, and page numbers.
            </p>

            {/* 4 Feature Template Cards (2x2 Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-8 w-full text-left">
              {featureTemplates.map((template, idx) => {
                const IconComp = template.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => onSendMessage(template.prompt)}
                    className="p-4 rounded-xl bg-[#0f172a] hover:bg-[#16223e] border border-[#1e293b] hover:border-blue-500/50 transition-all text-left group shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 group-hover:text-blue-300">
                        <IconComp className="w-4 h-4" />
                        <span>{template.title}</span>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-400 group-hover:text-slate-300 leading-relaxed">
                        {template.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Messages Stream */
          <div className="max-w-3xl mx-auto space-y-6 pb-4">
            {messages.map((message, index) => {
              const isUser = message.sender === 'user';
              const isLastAssistantMessage =
                !isUser && index === messages.length - 1;

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Assistant Avatar */}
                  {!isUser && (
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-md shadow-blue-600/30">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`relative max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 shadow-md ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-[#121a2d] border border-[#1e293b] text-slate-100 rounded-tl-none'
                    }`}
                  >
                    {/* Message Header / Timestamp */}
                    <div className="flex items-center justify-between text-[11px] mb-1.5 opacity-70">
                      <span className="font-semibold">{isUser ? 'You' : 'DocMind AI'}</span>
                      <div className="flex items-center gap-2">
                        {message.responseTimeMs && !message.isStreaming && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-blue-400 font-mono">
                            <Zap className="w-2.5 h-2.5" />
                            {message.responseTimeMs}ms
                          </span>
                        )}
                        <span>{message.timestamp}</span>
                      </div>
                    </div>

                    {/* Content with rich markdown code formatting */}
                    <div className="text-sm leading-relaxed markdown-content">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            const codeString = String(children).replace(/\n$/, '');
                            if (!inline && match) {
                              return <CodeBlock language={match[1]} code={codeString} />;
                            }
                            return (
                              <code
                                className="bg-[#1e293b]/70 text-blue-300 font-mono text-[13px] px-1.5 py-0.5 rounded"
                                {...props}
                              >
                                {children}
                              </code>
                            );
                          },
                        }}
                      >
                        {message.text}
                      </ReactMarkdown>

                      {/* Blinking streaming cursor */}
                      {message.isStreaming && <span className="streaming-cursor" />}

                      {/* Interrupted status badge */}
                      {message.interrupted && (
                        <div className="mt-2 text-[11px] text-amber-400/80 italic flex items-center gap-1">
                          <Square className="w-2.5 h-2.5 fill-amber-400" />
                          <span>Generation stopped by user</span>
                        </div>
                      )}
                    </div>

                    {/* Citations & Source Badges (for Assistant messages) */}
                    {!isUser && message.citations && message.citations.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-[#1e293b]/80 space-y-2">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                          <span>Grounded Source Citations</span>
                          <span className="inline-flex items-center gap-1 text-[11px] text-blue-400 font-mono">
                            {message.citations.length} sources
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {message.citations.map((citation, citIdx) => {
                            const citKey = `${message.id}-${citIdx}`;
                            const isExpanded = !!expandedCitations[citKey];
                            const scoreLabel = formatScore(citation.similarityScore);

                            return (
                              <div
                                key={citIdx}
                                className="rounded-lg bg-[#0a0f1d] border border-[#1e293b] overflow-hidden text-xs"
                              >
                                <button
                                  onClick={() => toggleCitation(citKey)}
                                  className="w-full px-3 py-2 flex items-center justify-between hover:bg-[#11192e] transition-colors text-left"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                    <span className="font-medium text-slate-200 truncate">
                                      {citation.fileName}
                                    </span>
                                    {citation.pageNumber && (
                                      <span className="text-slate-400 text-[11px]">
                                        • p.{citation.pageNumber}
                                      </span>
                                    )}
                                    {citation.chunkIndex !== undefined && (
                                      <span className="text-slate-400 text-[11px]">
                                        • Chunk #{citation.chunkIndex}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {scoreLabel && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                        {scoreLabel} match
                                      </span>
                                    )}
                                    {isExpanded ? (
                                      <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                                    ) : (
                                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                    )}
                                  </div>
                                </button>

                                {isExpanded && (
                                  <div className="px-3 py-2.5 bg-[#070b14] border-t border-[#1e293b]/70 space-y-2">
                                    <div className="text-[11px] font-mono text-slate-300 leading-relaxed whitespace-pre-wrap">
                                      {citation.snippet}
                                    </div>
                                    {onChatWithCitation && (
                                      <div className="flex justify-end pt-1">
                                        <button
                                          onClick={() => onChatWithCitation(citation)}
                                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 text-[10px] font-medium border border-blue-500/30 transition-colors"
                                        >
                                          <MessageSquare className="w-3 h-3" />
                                          <span>Ask about this chunk</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Bottom message toolbar for Assistant messages */}
                    {!isUser && !message.isStreaming && (
                      <div className="mt-3 pt-2 border-t border-[#1e293b]/40 flex items-center justify-between text-[11px] text-slate-400">
                        <div className="flex items-center gap-2">
                          {isLastAssistantMessage && onRegenerate && (
                            <button
                              onClick={onRegenerate}
                              disabled={isGenerating}
                              className="flex items-center gap-1 hover:text-slate-200 transition-colors"
                              title="Regenerate this response"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Regenerate</span>
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => handleCopyText(message.id, message.text)}
                          className="flex items-center gap-1 hover:text-slate-200 transition-colors"
                        >
                          {copiedId === message.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy response</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* User Avatar */}
                  {isUser && (
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-md shadow-indigo-600/30">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </motion.div>
              );
            })}

            {/* Loading indicator before first token arrives */}
            {isLoading && !isAnyStreaming && (
              <div className="flex gap-3.5 justify-start animate-fade-in">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="rounded-2xl rounded-tl-none px-4 py-3 bg-[#121a2d] border border-[#1e293b] text-slate-200 text-sm flex items-center gap-2 shadow-md">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]"></div>
                  <span className="text-xs text-slate-400 ml-1">
                    Retrieving vector chunks and synthesizing...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Floating Scroll to Bottom Button */}
      {!isAtBottom && messages.length > 0 && (
        <button
          type="button"
          aria-label="Scroll to bottom of chat"
          onClick={() => {
            setIsAtBottom(true);
            scrollToBottom();
          }}
          className="absolute bottom-24 right-8 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/30 text-xs font-medium backdrop-blur-sm transition-all focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none cursor-pointer"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          <span>Scroll to bottom</span>
          {isGenerating && <span className="w-2 h-2 rounded-full bg-white animate-ping ml-0.5" />}
        </button>
      )}

      {/* Bottom Chat Input Bar & Suggestion Chips */}
      <div className="p-3 sm:p-4 sm:px-8 border-t border-[#1e293b]/70 bg-[#090d16]/85 backdrop-blur-md shrink-0">
        <div className="max-w-3xl mx-auto space-y-2.5">
          {/* Quick Follow-Up Suggestion Chips */}
          {messages.length > 0 && !isGenerating && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none animate-fade-in">
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
                Suggested:
              </span>
              {quickSuggestionChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSendMessage(chip.prompt)}
                  className="px-2.5 py-1 rounded-full bg-[#131b2e] hover:bg-[#1a253f] border border-[#233252] hover:border-blue-500/40 text-[11px] text-slate-300 hover:text-white transition-all shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          {/* Main Input Box */}
          <div className="relative flex items-center bg-[#131b2e] border border-[#233252] focus-within:border-blue-500 rounded-2xl shadow-lg transition-colors p-1.5 focus-within:ring-2 focus-within:ring-blue-500/30">
            <textarea
              ref={textareaRef}
              rows={1}
              aria-label="Message prompt input"
              value={inputText}
              onChange={handleInputResize}
              onKeyDown={handleKeyDown}
              placeholder={placeholderText}
              disabled={isGenerating}
              className="flex-1 bg-transparent px-3.5 py-2 text-sm text-slate-100 placeholder-slate-400 focus:outline-none resize-none max-h-36 disabled:opacity-60"
            />

            {/* Dynamic Send / Stop Button */}
            {isGenerating ? (
              <button
                type="button"
                aria-label="Stop generation"
                onClick={onStopGeneration}
                className="p-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/30 transition-all cursor-pointer flex items-center justify-center animate-pulse focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
                title="Stop generating (Esc)"
              >
                <Square className="w-4 h-4 fill-white" />
              </button>
            ) : (
              <button
                type="button"
                aria-label="Send message prompt"
                onClick={handleSend}
                disabled={!inputText.trim()}
                className={`p-2.5 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none ${
                  inputText.trim()
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
                title="Send message (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Subtext under input bar */}
          <div className="px-2 flex items-center justify-between text-[11px] text-slate-400 select-none">
            <div className="flex items-center gap-1.5">
              <span>Press</span>
              <kbd className="px-1.5 py-0.5 text-[10px] bg-[#121a2d] border border-[#1e293b] rounded text-slate-300">
                Enter
              </kbd>
              <span>to send,</span>
              <kbd className="px-1.5 py-0.5 text-[10px] bg-[#121a2d] border border-[#1e293b] rounded text-slate-300">
                Shift+Enter
              </kbd>
              <span>for newline</span>
              {isGenerating && (
                <>
                  <span className="mx-1">•</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] bg-red-950/60 border border-red-700/50 rounded text-red-300">
                    Esc
                  </kbd>
                  <span className="text-red-400 font-medium">to stop</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1 text-blue-400 font-medium">
              <Zap className="w-3.5 h-3.5" />
              <span>Grounded RAG {isStreamingEnabled && '• SSE Live'}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
