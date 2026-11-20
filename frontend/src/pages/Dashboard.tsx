import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { ChatArea } from '../components/ChatArea';
import { UploadModal } from '../components/UploadModal';
import { SearchModal } from '../components/SearchModal';
import { DocumentChunksModal } from '../components/DocumentChunksModal';
import { documentApi, chatApi, streamChat } from '../services/api';
import { DocumentMetadataDto, ChatMessage, CitationDto } from '../types';
import { useDocumentStore } from '../store/documentStore';
import { useConversationStore } from '../store/conversationStore';
import { useAuthStore } from '../store/authStore';

export const Dashboard: React.FC = () => {
  const user = useAuthStore((s) => s.user);

  // Document Store
  const {
    documents,
    selectedDocumentId,
    inspectingDoc,
    isUploadModalOpen,
    isSearchModalOpen,
    sidebarTab,
    loadDocuments,
    selectDocument,
    setInspectingDoc,
    setIsUploadModalOpen,
    setIsSearchModalOpen,
    setSidebarTab,
    deleteDocument,
  } = useDocumentStore();

  // Conversation Store
  const {
    activeConversationId,
    messages: allMessages,
    isStreamingMode,
    loadChats,
    newChat,
    appendMessage,
    updateAssistantMessage,
    setStreamingMode,
  } = useConversationStore();

  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [droppedFiles, setDroppedFiles] = useState<FileList | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Active chat transcript
  const activeMessages: ChatMessage[] =
    (activeConversationId && allMessages[activeConversationId]) || [];

  const selectedDocument =
    documents.find((d) => d.id === selectedDocumentId) || null;

  // On mount or user change: load documents and chats
  useEffect(() => {
    if (user) {
      loadDocuments();
      loadChats();
    }
  }, [user]);

  // Dark mode class toggle
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  const handleClearChat = () => {
    handleStopGeneration();
    newChat();
    toast.success('Started a fresh conversation');
  };

  const handleRegenerate = () => {
    if (isLoading || activeMessages.length === 0) return;

    let lastUserMsg: ChatMessage | null = null;
    for (let i = activeMessages.length - 1; i >= 0; i--) {
      if (activeMessages[i].sender === 'user') {
        lastUserMsg = activeMessages[i];
        break;
      }
    }

    if (!lastUserMsg) return;

    // Remove the trailing assistant message if regenerating so it replaces it cleanly
    if (activeConversationId) {
      const currentList = allMessages[activeConversationId] || [];
      if (currentList.length > 0 && currentList[currentList.length - 1].sender === 'assistant') {
        const trimmed = currentList.slice(0, -1);
        useConversationStore.setState((state) => ({
          messages: {
            ...state.messages,
            [activeConversationId]: trimmed,
          },
        }));
      }
    }

    handleSendMessage(lastUserMsg.text, false);
  };

  const handleSendMessage = async (text: string, appendUserMessage = true) => {
    if (!text.trim() || isLoading) return;

    // Abort any ongoing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Ensure we have an active conversation ID minted
    let convId = activeConversationId;
    if (!convId) {
      convId = newChat();
    }

    const currentTime = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (appendUserMessage) {
      const userMsgId = crypto.randomUUID();
      const userMsg: ChatMessage = {
        id: userMsgId,
        sender: 'user',
        text,
        timestamp: currentTime,
      };
      await appendMessage(convId, userMsg);
    }

    const assistantMsgId = crypto.randomUUID();
    setIsLoading(true);

    if (isStreamingMode) {
      // Streaming Mode
      const initialAssistantMsg: ChatMessage = {
        id: assistantMsgId,
        sender: 'assistant',
        text: '',
        timestamp: currentTime,
        isStreaming: true,
      };
      await appendMessage(convId, initialAssistantMsg);

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const startTime = Date.now();
      let streamedAccumulator = '';

      try {
        await streamChat(
          {
            question: text,
            conversationId: convId,
            documentId: selectedDocumentId || undefined,
            minSimilarity: 0.0,
          },
          (token) => {
            streamedAccumulator += token;
            updateAssistantMessage(
              convId!,
              assistantMsgId,
              streamedAccumulator,
              undefined,
              undefined,
              true
            );
          },
          async (fullText) => {
            const elapsed = Date.now() - startTime;
            abortControllerRef.current = null;
            setIsLoading(false);

            // Immediately mark message complete so streaming cursor stops & user can type
            await updateAssistantMessage(
              convId!,
              assistantMsgId,
              fullText,
              undefined,
              elapsed,
              false
            );

            // Fetch grounding citations asynchronously without blocking chat interaction
            try {
              const searchResult = await chatApi.similaritySearch(
                text,
                selectedDocumentId || undefined,
                3,
                0.0
              );
              if (searchResult?.matches && searchResult.matches.length > 0) {
                await updateAssistantMessage(
                  convId!,
                  assistantMsgId,
                  fullText,
                  searchResult.matches,
                  elapsed,
                  false
                );
              }
            } catch {
              // ignore
            }
          },
          (err) => {
            if (controller.signal.aborted) return;
            console.error('Streaming error:', err);
            setIsLoading(false);
            abortControllerRef.current = null;
            updateAssistantMessage(
              convId!,
              assistantMsgId,
              streamedAccumulator || 'An error occurred during response generation.',
              undefined,
              undefined,
              false,
              true
            );
          },
          controller.signal
        );
      } catch (err: any) {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          abortControllerRef.current = null;
          updateAssistantMessage(
            convId,
            assistantMsgId,
            'Failed to connect to AI streaming service.',
            undefined,
            undefined,
            false,
            true
          );
        }
      }
    } else {
      // Non-Streaming Mode
      try {
        const res = await chatApi.query({
          question: text,
          conversationId: convId,
          documentId: selectedDocumentId || undefined,
          minSimilarity: 0.0,
        });

        const assistantMsg: ChatMessage = {
          id: assistantMsgId,
          sender: 'assistant',
          text: res.answer,
          timestamp: currentTime,
          citations: res.citations,
          responseTimeMs: res.responseTimeMs,
          isStreaming: false,
        };
        await appendMessage(convId, assistantMsg);
      } catch (err: any) {
        console.error('Chat error:', err);
        const errorMsg: ChatMessage = {
          id: assistantMsgId,
          sender: 'assistant',
          text: 'Failed to process question. Please check backend connection.',
          timestamp: currentTime,
          error: true,
        };
        await appendMessage(convId, errorMsg);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleChatWithCitation = (citation: CitationDto) => {
    setIsSearchModalOpen(false);
    if (citation.documentId) {
      selectDocument(citation.documentId);
    }
    const prompt = `Based on excerpt from "${citation.fileName}": "${citation.snippet.slice(0, 160)}...", can you explain this in detail?`;
    handleSendMessage(prompt);
  };

  const handleChatWithDocument = (doc: DocumentMetadataDto) => {
    selectDocument(doc.id);
    setInspectingDoc(null);
    toast.success(`Active scope set to "${doc.filename}"`);
  };

  const handleDeleteDocument = async (doc: DocumentMetadataDto) => {
    try {
      await deleteDocument(doc.id);
      toast.success(`"${doc.filename}" deleted`);
    } catch {
      toast.error('Failed to delete document');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0b0f19] text-slate-100 font-sans">
      {/* Top Navigation Bar */}
      <Header
        documents={documents}
        selectedDocumentId={selectedDocumentId}
        onSelectDocument={selectDocument}
        onOpenSearch={() => setIsSearchModalOpen(true)}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        isMobileSidebarOpen={isMobileSidebarOpen}
      />

      {/* Main Workspace Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Desktop Sidebar (hidden on mobile) */}
        <div className="hidden md:block h-full">
          <Sidebar
            documents={documents}
            selectedDocumentId={selectedDocumentId}
            onSelectDocument={selectDocument}
            onOpenUpload={() => setIsUploadModalOpen(true)}
            onViewChunks={(doc) => setInspectingDoc(doc)}
            onDeleteDocument={handleDeleteDocument}
            onDropFiles={(files) => {
              setDroppedFiles(files);
              setIsUploadModalOpen(true);
            }}
            activeTab={sidebarTab}
            onTabChange={setSidebarTab}
          />
        </div>

        {/* Mobile Off-Canvas Drawer */}
        <AnimatePresence>
          {isMobileSidebarOpen && (
            <>
              {/* Dimmed backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={() => setIsMobileSidebarOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
              />

              {/* Sliding drawer */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] h-full shadow-2xl md:hidden"
              >
                <Sidebar
                  documents={documents}
                  selectedDocumentId={selectedDocumentId}
                  onSelectDocument={selectDocument}
                  onOpenUpload={() => {
                    setIsMobileSidebarOpen(false);
                    setIsUploadModalOpen(true);
                  }}
                  onViewChunks={(doc) => {
                    setIsMobileSidebarOpen(false);
                    setInspectingDoc(doc);
                  }}
                  onDeleteDocument={handleDeleteDocument}
                  onDropFiles={(files) => {
                    setIsMobileSidebarOpen(false);
                    setDroppedFiles(files);
                    setIsUploadModalOpen(true);
                  }}
                  activeTab={sidebarTab}
                  onTabChange={setSidebarTab}
                  onCloseMobile={() => setIsMobileSidebarOpen(false)}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Center / Right Chat Workspace */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#070a12] relative min-w-0">
          <ChatArea
            messages={activeMessages}
            isLoading={isLoading}
            isStreamingEnabled={isStreamingMode}
            onToggleStreaming={() => setStreamingMode(!isStreamingMode)}
            onSendMessage={handleSendMessage}
            selectedDocument={selectedDocument}
            onClearChat={handleClearChat}
            onStopGeneration={handleStopGeneration}
            onRegenerate={handleRegenerate}
            onChatWithCitation={handleChatWithCitation}
          />
        </main>
      </div>

      {/* Upload Document Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setDroppedFiles(null);
        }}
        initialFiles={droppedFiles}
        onUploadSingle={(file, onProgress) => documentApi.upload(file, onProgress)}
        onUploadMultiple={(files, onProgress) => documentApi.uploadMultiple(files, onProgress)}
        onSuccess={loadDocuments}
      />

      {/* Vector Similarity Search Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        documents={documents}
        selectedDocumentId={selectedDocumentId}
        onPerformSearch={(query, docId) => chatApi.similaritySearch(query, docId, 5, 0.0) as any}
        onChatWithCitation={handleChatWithCitation}
      />

      {/* Document Chunks Information Modal */}
      <DocumentChunksModal
        isOpen={!!inspectingDoc}
        document={inspectingDoc}
        onClose={() => setInspectingDoc(null)}
        onFetchChunks={(id) => documentApi.getChunks(id)}
        onDeleteDocument={handleDeleteDocument}
        onChatWithDocument={handleChatWithDocument}
      />
    </div>
  );
};
