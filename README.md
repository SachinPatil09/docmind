# DocMind

DocMind is an AI document assistant. Upload PDFs, Word files or text files, then ask questions about them in a chat. Answers are grounded in your own documents using **Retrieval-Augmented Generation (RAG)** and include source citations (file, page, snippet).

![DocMind dashboard](frontend/screenshots/Screenshot%202026-08-08%20at%205.21.41%20PM.png)

## Features

- **Auth** – register / login with JWT (stateless, BCrypt-hashed passwords, `USER` / `ADMIN` roles).
- **Document ingestion** – single or multiple uploads (PDF, DOCX, TXT, MD, CSV, … up to 25 MB), parsed, chunked and embedded into pgvector.
- **Per-user isolation** – every chunk is tagged with `userId`; searches only ever hit the caller's documents.
- **RAG chat** – ask across all documents or scope to one; answers via Google Gemini with citations.
- **Live streaming** – token-by-token answers over Server-Sent Events, with a non-streaming fallback.
- **Conversation memory** – the last 10 messages of a conversation are sent with each question.
- **Semantic search** – find the most similar chunks without generating an answer (`Ctrl+K` in the UI).
- **Chunk viewer** – inspect how a document was split and stored.
- **Swagger UI** – interactive API docs.

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Java 21, Spring Boot 4, Spring Security, Spring Data JPA, Spring AI 2 |
| AI | Google Gemini (chat), `gemini-embedding-001` (1536-dim embeddings) |
| Database | PostgreSQL 16 + pgvector (HNSW index, cosine distance) via Docker |
| Parsing | Spring AI PDF reader (PDFs), Apache Tika (everything else) |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Zustand, Axios, react-markdown |

## Architecture

```
┌──────────────┐  /api/* (Vite proxy)   ┌──────────────────────┐   JDBC   ┌─────────────────────────┐
│  React app   │ ─────────────────────▶ │  Spring Boot API     │ ───────▶ │ PostgreSQL + pgvector   │
│  :5173       │ ◀───────────────────── │  :8081               │ ◀─────── │ :5434                   │
└──────────────┘   JSON / SSE + JWT     └──────────┬───────────┘          └─────────────────────────┘
                                                   │ embeddings + chat
                                                   ▼
                                            Google Gemini API
```

### How it works

**Upload flow** (`POST /api/v1/documents/upload`)
1. Save a `document_metadata` row (status `UPLOADING`) linked to the user.
2. Parse the file – PDFs page by page, other formats with Tika.
3. Split into token chunks (`TokenTextSplitter`, ~700 tokens).
4. Enrich each chunk with `documentId`, `fileName`, `chunkIndex`, `pageNumber`, `userId`.
5. Embed with Gemini and store in the `vector_store` table.
6. Mark the document `INDEXED` (or `FAILED` on error).

**Question flow** (`POST /api/v1/chat/stream` or `/chat/query`)
1. Create the conversation if it doesn't exist (title = first 50 chars of the question).
2. Embed the question and run a top-K (default 5) similarity search in pgvector, filtered by `userId` (and `documentId` if scoped).
3. Build a context block (`[Source: file | Page: n] text`) and inject it into the system prompt.
4. Add the last 10 messages from `chat_messages` (chat memory) and call Gemini.
5. Stream tokens back (ending with `[DONE]`) or return the full answer with citations. If Gemini fails, a fallback answer is built from the top chunks.

## Project structure

```
docmind/
├── docker-compose.yml          # Postgres + pgvector
├── init.sql                    # enables vector & uuid-ossp extensions
├── pom.xml                     # backend dependencies
├── src/main/java/com/example/docmind/
│   ├── Controller/             # AuthController, DocumentController, ChatController
│   ├── Service/                # parsing, ingestion, RAG, JWT, chat memory, users
│   ├── repository/             # Spring Data JPA repositories
│   ├── entity/                 # User, DocumentMetaData, Conversation, ChatMessage
│   ├── dto/                    # request / response objects
│   ├── config/                 # security, JWT filter, CORS, ChatClient, OpenAPI
│   └── exception/              # global exception handling
├── src/main/resources/
│   ├── application.yaml        # port 8081, active profile = dev
│   └── application-dev.yml     # DB, Gemini, pgvector, RAG, JWT settings
└── frontend/
    ├── vite.config.ts          # dev server :5173, proxies /api → :8081
    └── src/
        ├── pages/              # Login, Register, Dashboard
        ├── components/         # Sidebar, ChatArea, ChatsPanel, modals
        ├── services/           # api.ts, authApi.ts, conversationApi.ts
        └── store/              # Zustand stores (auth, documents, conversations)
```

## Getting started

### Prerequisites

- Java 21
- Node.js 18+ and npm
- Docker (for PostgreSQL)
- A Google Gemini API key ([get one here](https://aistudio.google.com/app/apikey))

### 1. Configure environment variables

All secrets come from environment variables; nothing is hardcoded. Copy the template and fill it in:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API key | – (required) |
| `JWT_SECRET` | Secret used to sign JWTs (≥ 32 chars) | – (required) |
| `DB_PASSWORD` | Postgres password (used by Docker and the backend) | – (required) |
| `GEMINI_CHAT_MODEL` | Gemini chat model | `gemini-3.5-flash-lite` |
| `DB_HOST` | Postgres host | `localhost` |
| `DB_PORT` | Postgres port | `5434` |
| `DB_NAME` | Database name | `docmind` |
| `DB_USER` | Database user | `postgres` |

`.env` is git-ignored. Never commit real keys.

### 2. Start the database

```bash
docker compose up -d
```

Docker Compose reads `DB_PASSWORD` from `.env` and starts `pgvector/pgvector:pg16` on **localhost:5434** with database `docmind`.

### 3. Run the backend

Spring Boot doesn't read `.env` by itself, so export it into your shell first:

```bash
set -a && source .env && set +a
./mvnw spring-boot:run
```

The API starts on **http://localhost:8081**. Tables are created automatically (`ddl-auto: update`, pgvector `initialize-schema: true`).

Swagger UI: http://localhost:8081/swagger-ui.html

### 4. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**, register an account, log in, upload a document and start asking questions.

## API reference

All endpoints are under `/api/v1`. Everything except `/auth/**` needs `Authorization: Bearer <token>`. Most responses are wrapped as `{ success, message, data, timestamp }`.

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Create an account `{ username, email, password }` |
| POST | `/auth/login` | Log in `{ username, password }` → JWT + user |

### Documents

| Method | Endpoint | Description |
|---|---|---|
| POST | `/documents/upload` | Upload & index one file (multipart field `file`) |
| POST | `/documents/upload-multiple` | Upload & index several files (multipart field `files`) |
| GET | `/documents/user` | List the current user's documents |
| GET | `/documents` | List all documents (admin only) |
| GET | `/documents/{id}` | Document metadata |
| GET | `/documents/{id}/chunks` | Stored chunks of a document |
| DELETE | `/documents/{id}` | Delete a document and its vectors |

### Chat & search

| Method | Endpoint | Description |
|---|---|---|
| POST | `/chat/query` | Ask a question, get full answer + citations |
| POST | `/chat/stream` | Ask a question, stream answer tokens (SSE) |
| POST | `/chat/search/similarity` | Semantic search over chunks, no AI answer |

Example chat request:

```json
{
  "question": "Summarize the key points",
  "documentId": "optional-uuid-to-scope-to-one-document",
  "conversationId": "optional-existing-conversation-id",
  "topK": 5,
  "minSimilarity": 0.0
}
```

## Configuration

RAG settings live under `app.rag` in `application-dev.yml`:

| Property | Description | Value |
|---|---|---|
| `chunk-size` | Tokens per chunk | `700` |
| `top-k` | Chunks retrieved per question | `5` |
| `similarity-threshold` | Minimum similarity (0 = disabled) | `0.0` |

Upload limits: `max-file-size: 25MB`, `max-request-size: 50MB`.

## Known limitations

- Uploads are processed synchronously, so large files keep the request open until indexing finishes.
- The conversation list in the UI is stored in browser `localStorage`; the backend saves conversations too but doesn't yet expose an endpoint to list them.

## Screenshots

| | |
|---|---|
| ![](frontend/screenshots/Screenshot%202026-08-08%20at%205.22.02%20PM.png) | ![](frontend/screenshots/Screenshot%202026-08-08%20at%205.22.12%20PM.png) |
| ![](frontend/screenshots/Screenshot%202026-08-08%20at%205.22.23%20PM.png) | |
