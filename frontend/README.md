# DocMind Frontend

A modern, high-performance React application built with **React, TypeScript, Tailwind CSS, Vite, and Lucide React** for the **DocMind AI Document Intelligence & RAG** platform.

Designed to mirror the DocMind UI screenshots with dark/light themes, streaming Q&A, semantic chunk search, and multi-document vector ingestion.

---

## ✨ Features Implemented

1. **Document Upload Dialog with Progress Bar**
   - Upload single or multiple documents (`.pdf`, `.docx`, `.md`, `.txt`, `.csv`, max 25MB).
   - Real-time animated progress bar for each file and overall batch progress.
   - Status indicators: `Uploading` → `Processing & Vectorizing` → `Indexed` / `Failed`.
   - Direct drag-and-drop support on both the sidebar upload zone and upload dialog.

2. **Conversational AI Chat with Grounded RAG**
   - Real-time Q&A against all indexed documents or scoped to an individual document.
   - **Stream Tokens Toggle**: Real-time SSE streaming answer tokens (`/api/v1/chat/stream`) or standard response (`/api/v1/chat/query`).
   - Markdown rendering with code blocks, lists, bold text, and tables.
   - **Grounded Source Citations**: Shows file names, page numbers, chunk indexes, similarity score percentages, and expandable snippet excerpts.
   - Response time tracking (e.g. `⚡ 320ms`).

3. **Feature Templates (Prompt Starters)**
   - Exactly matches **Screenshot 1**:
     - 📄 **Summarize Key Points**: Executive highlights and core takeaways.
     - ❓ **Interview / Q&A Insights**: Critical questions and answers.
     - 📝 **Action Items & Deadlines**: Actionable deliverables and responsibilities.
     - 🔍 **Technical Concepts**: Architecture and core technical concepts.

4. **Semantic Vector Similarity Search (`⌘K` / `Ctrl+K`)**
   - Matches **Screenshot 2**:
     - Fast vector similarity search across all stored chunks in PostgreSQL pgvector.
     - Scope filter dropdown to search across complete corpus or a single document.
     - Displays match percentage badges (e.g. `96% match`), document names, page numbers, and chunk previews.
     - Quick action to "Ask AI about this chunk".

5. **Document Chunks Information Viewer**
   - Matches **Screenshot 3**:
     - Document header with filename, truncated UUID with 1-click copy, and `INDEXED` badge.
     - **4 Metric Cards**: File Size, Vector Chunks, Total Pages, Uploaded Date.
     - **Indexed Vector Chunks**: Inspect each chunk (`Chunk #0`, `Chunk #1`, `Chunk #2`...) in clean monospace format with copy button.
     - Quick actions: "Delete Document", "Close", and "Chat with Document".

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node.js v24)
- **Backend API**: Spring Boot server running on port `8081` (or `8080`)

### 2. Run the Frontend Development Server
From the project root:
```bash
cd frontend
npm run dev
```

The frontend will start at:
👉 **`http://localhost:5173`**

### 3. Build for Production
```bash
cd frontend
npm run build
```
This generates the optimized static build in `frontend/dist/`.
