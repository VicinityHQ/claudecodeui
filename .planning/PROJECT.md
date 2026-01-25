# ClaudeCodeUI

## What This Is

ClaudeCodeUI is a web interface for browsing and interacting with Claude Code, Cursor, and Codex sessions. It provides a chat-style UI for sending commands and viewing responses, along with project/session management and real-time updates.

## Core Value

Users must be able to reliably start conversations, send messages, and receive responses without sessions getting stuck, messages disappearing, or state bleeding across projects.

## Requirements

### Validated

<!-- Shipped and confirmed valuable -->

- [x] **PROJ-01**: List Claude Code projects from `~/.claude/projects/`
- [x] **PROJ-02**: Display project name and path in sidebar
- [x] **PROJ-03**: List sessions within projects with summaries
- [x] **PROJ-04**: View session message history
- [x] **PROJ-05**: Real-time project updates via WebSocket
- [x] **PROJ-06**: Skip projects by size threshold (`SKIP_LARGE_PROJECTS_MB`)
- [x] **PROJ-07**: Skip projects by name pattern (`SKIP_PROJECTS_PATTERN`)
- [x] **CURSOR-01**: Detect and list Cursor sessions for projects
- [x] **CODEX-01**: Detect and list Codex sessions for projects
- [x] **OPT-01**: Byte-limit JSONL file reads (100KB max for metadata extraction) — v1.0
- [x] **OPT-02**: Extract `cwd` from first 100KB only, stop reading once found — v1.0
- [x] **OPT-03**: Extract session metadata from JSONL filename + file stats (not content) — v1.0
- [x] **OPT-04**: Lazy-load session summaries only when project is expanded — v1.0
- [x] **OPT-05**: Defer full message content loading until session is opened — v1.0
- [x] **OPT-06**: Display project size in UI (MB/GB indicator) — v1.0
- [x] **OPT-07**: Display session file size in UI — v1.0
- [x] **OPT-08**: Graceful degradation when metadata extraction fails (use defaults) — v1.0

### Active

<!-- Current scope: Session and message reliability -->

(Defined in REQUIREMENTS.md)

### Out of Scope

- Session archiving/cleanup tools — user can manage files manually
- JSONL file compression — changes Claude Code's data format
- Database caching of metadata — adds complexity, files change frequently
- Splitting large JSONL files — Claude Code's responsibility, not ours

## Current Milestone: v1.1 Session Reliability

**Goal:** Make session and message handling bulletproof — users never get stuck sessions, lost messages, or cross-project state bleeding.

**Target features:**
- Reliable session creation (messages always create sessions successfully)
- Proper session completion detection (UI reflects actual SDK state)
- Clean project/session switching (no message bleeding)
- Graceful error handling (clear feedback when things go wrong)

## Context

### Current Architecture

**Frontend:**
- React app with WebSocket connection to backend
- `ChatInterface.jsx` manages session state (`currentSessionId`, `chatMessages`, `isLoading`)
- WebSocket messages include `sessionId` to filter cross-session interference
- Message queue (100 max) to handle WebSocket disconnection

**Backend:**
- Express server with WebSocket handler
- `claude-sdk.js` wraps the Claude Code SDK async generator
- `activeSessions` Map tracks running sessions
- Messages stream through the generator until completion

### The Problems

1. **Sessions getting stuck**: SDK async generator yields messages but never completes, leaving UI stuck with spinning counter. Server logs show repeated messages but no `claude-complete` event.

2. **Message bleeding**: When switching projects, old message remains in input/chat state. Frontend state not properly reset on project change.

3. **Silent failures**: When session creation fails, no clear error shown to user. Counter just runs indefinitely.

### Files Involved

- `server/claude-sdk.js` — SDK wrapper, session management, message streaming
- `server/index.js` — WebSocket handler, routes messages to SDK
- `src/components/ChatInterface.jsx` — chat UI, session state, message handlers
- `src/utils/websocket.js` — WebSocket connection, message queuing

## Constraints

- **Tech stack**: Node.js/Express backend, React frontend — no changes
- **Compatibility**: Must work with Claude Code SDK's async generator pattern
- **Mobile usage**: Primary use case is mobile (no DevTools access for debugging)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Byte-limit reads vs line-limit | Line-limiting doesn't prevent OOM when lines are 400KB+ | ✓ Good |
| Lazy-load summaries | Reduces initial load; summaries only needed for visible projects | ✓ Good |
| File stats for timestamps | Avoids parsing; `mtime` is reliable enough | ✓ Good |
| No caching layer | Files change frequently; caching adds staleness issues | ✓ Good |
| Queue messages during disconnect | Prevents silent message drops, improves reliability | ✓ Good |
| Detect completed sessions | Prevents SDK resume replay causing token overflow | ✓ Good |
| SessionId on all messages | Prevents cross-project message bleeding | — Pending (partial fix) |

---
*Last updated: 2026-01-25 after milestone v1.1 started*
