# Roadmap: ClaudeCodeUI

## Milestones

- v1.0 Memory Optimization - Phases 1-3 (shipped 2026-01-24)
- v1.1 Session Reliability - Phases 4-6 (in progress)

## Phases

<details>
<summary>v1.0 Memory Optimization (Phases 1-3) - SHIPPED 2026-01-24</summary>

### Phase 1: File Reading Optimization
**Goal**: Server can extract metadata from large JSONL files without running out of memory
**Depends on**: Nothing (first phase)
**Requirements**: READ-01, READ-02, READ-03, READ-04, COMPAT-01, COMPAT-02, COMPAT-03
**Success Criteria** (what must be TRUE):
  1. Server processes 300MB+ JSONL files without OOM errors
  2. Project `cwd` extracted from first 100KB of file, reading stops once found
  3. Session timestamps derived from file `mtime` without parsing content
  4. When metadata not found in byte-limited read, defaults are used and server continues
  5. Existing skip patterns and size limits continue to work unchanged
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md - TDD: Byte-limited cwd extraction function
- [x] 01-02-PLAN.md - Integrate byte-limited extraction with fallbacks
- [x] 01-03-PLAN.md - Use file mtime for session timestamps

### Phase 2: Lazy Loading Architecture
**Goal**: Projects load instantly with minimal data, session details fetched on-demand
**Depends on**: Phase 1
**Requirements**: LAZY-01, LAZY-02, LAZY-03, LAZY-04
**Success Criteria** (what must be TRUE):
  1. Session list derived from filenames without opening JSONL files
  2. Session summaries only loaded when user expands a project in sidebar
  3. Initial `/api/projects` response contains minimal metadata per project
  4. New API endpoint exists for fetching session summaries separately
  5. Full message content still available when user opens a session
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md - Server-side minimal project metadata extraction
- [x] 02-02-PLAN.md - API and frontend lazy loading integration

### Phase 3: UI Size Indicators
**Goal**: Users can see which projects and sessions are large
**Depends on**: Phase 2
**Requirements**: UI-01, UI-02, UI-03
**Success Criteria** (what must be TRUE):
  1. Project card displays total size (sum of all session files) - DONE in Phase 2
  2. Session list shows individual session file size
  3. Sizes formatted appropriately (KB, MB, GB with 1 decimal place) - DONE in Phase 2
**Plans**: 1 plan

Plans:
- [x] 03-01-PLAN.md - Add session file size to backend and display in sidebar

</details>

### v1.1 Session Reliability (In Progress)

**Milestone Goal:** Make session and message handling bulletproof. Users never get stuck sessions, lost messages, or cross-project state bleeding.

#### Phase 4: Backend Session Lifecycle
**Goal**: SDK sessions tracked from creation through completion with proper timeout handling
**Depends on**: Phase 3
**Requirements**: SESS-01, SESS-02, SESS-03, SESS-04, ERR-02
**Success Criteria** (what must be TRUE):
  1. Backend captures session ID from SDK on first streaming message
  2. Backend tracks session status (pending -> active -> complete/error) in activeSessions Map
  3. Backend detects when SDK async generator completes and emits claude-complete event
  4. Backend triggers timeout after 60 seconds of no SDK activity and marks session as failed
  5. SDK errors propagate to UI via WebSocket with meaningful error messages
**Plans**: 2 plans

Plans:
- [x] 04-01-PLAN.md - Session lifecycle infrastructure with status tracking and dual timeout mechanism
- [x] 04-02-PLAN.md - Integrate timeouts into SDK flow and enhance error messages

#### Phase 5: Frontend State Management
**Goal**: UI state clears cleanly when switching projects or starting new sessions
**Depends on**: Phase 4
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05
**Success Criteria** (what must be TRUE):
  1. User switches to different project -> input field clears immediately
  2. User switches to different project -> chat messages reset to empty
  3. User sends message in same project -> previous chat messages clear (new session started)
  4. Loading spinner shows only when SDK is actively streaming messages
  5. User sees error message (not spinner) when session creation fails
**Plans**: 2 plans

Plans:
- [x] 05-01-PLAN.md - State reset with key prop for project switches
- [x] 05-02-PLAN.md - Loading and error state management for sessions

#### Phase 6: Error UX
**Goal**: Users receive clear feedback when things go wrong
**Depends on**: Phase 5
**Requirements**: ERR-01, ERR-03
**Success Criteria** (what must be TRUE):
  1. User waits 60+ seconds with no response -> sees "Request timed out" error message
  2. WebSocket disconnects -> user sees "Reconnecting..." indicator
  3. WebSocket reconnects -> indicator disappears, queued messages send
**Plans**: 1 plan

Plans:
- [x] 06-01-PLAN.md — Accessible error banner and WebSocket connection status badge

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. File Reading Optimization | v1.0 | 3/3 | Complete | 2026-01-24 |
| 2. Lazy Loading Architecture | v1.0 | 2/2 | Complete | 2026-01-24 |
| 3. UI Size Indicators | v1.0 | 1/1 | Complete | 2026-01-24 |
| 4. Backend Session Lifecycle | v1.1 | 2/2 | Complete | 2026-01-25 |
| 5. Frontend State Management | v1.1 | 2/2 | Complete | 2026-01-25 |
| 6. Error UX | v1.1 | 1/1 | Complete | 2026-01-26 |
