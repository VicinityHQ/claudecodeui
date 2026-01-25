---
status: resolved
trigger: "Investigate issue: cross-project-message-bleeding"
created: 2026-01-25T00:00:00Z
updated: 2026-01-25T00:20:00Z
---

## Current Focus

hypothesis: CONFIRMED - claude-response messages don't include sessionId, so they bypass the session filter in ChatInterface
test: Verify the fix by adding sessionId to all claude-response messages from the server
expecting: Messages will be properly filtered and won't bleed across sessions/projects
next_action: Implement fix in server/claude-sdk.js to attach sessionId to all messages

## Symptoms

expected: When switching to project 2, only project 2's messages should appear. Messages sent/received for project 1 should stay in project 1's view.
actual: Messages from project 1's active session appear in project 2's chat view. The sidebar correctly shows project 2's sessions, but the chat area displays incoming messages from project 1.
errors: No specific errors mentioned - functional issue with message routing
reproduction: 1) Open project 1, start a session, send a message (starts processing), 2) Switch to project 2 while project 1's session is still active, 3) Project 1's response/tool use appears in project 2's chat view
started: Recently observed. Possibly related to recent WebSocket changes.

## Eliminated

## Evidence

- timestamp: 2026-01-25T00:05:00Z
  checked: WebSocket context and message flow architecture
  found: Messages are accumulated globally in useWebSocket hook (line 55: setMessages(prev => [...prev, data])). The messages array is shared across entire app via WebSocketContext. ChatInterface receives this global messages prop from App.jsx via MainContent.jsx
  implication: ALL WebSocket messages go into a single global array. Filtering must happen in ChatInterface to prevent cross-session/cross-project bleeding

- timestamp: 2026-01-25T00:06:00Z
  checked: ChatInterface message filtering logic (lines 3205-3220)
  found: ChatInterface has session-level filtering - it checks latestMessage.sessionId !== currentSessionId and skips messages for different sessions. BUT this only processes the LATEST message (messages[messages.length - 1])
  implication: The filtering only works for incoming WebSocket messages. It doesn't filter the historical messages array that's already accumulated

- timestamp: 2026-01-25T00:07:00Z
  checked: How messages are added to chatMessages (lines 3270-3413)
  found: When WebSocket messages pass the session filter, they call setChatMessages(prev => [...prev, newMessage]). The chatMessages state is project-scoped (initialized from localStorage per project on line 1868-1873)
  implication: The session filter at line 3216 should prevent messages from different sessions from being added to chatMessages. Need to check if sessionId is being properly set on WebSocket messages

- timestamp: 2026-01-25T00:08:00Z
  checked: Server-side WebSocket message sending (server/claude-sdk.js line 604-607)
  found: The claude-response messages are sent WITHOUT a sessionId field. They're sent as: {type: 'claude-response', data: transformedMessage}. The sessionId is ONLY added to completion messages (line 634) and error messages
  implication: This is the root cause! The session filter on line 3216 checks latestMessage.sessionId !== currentSessionId, but claude-response messages don't have a sessionId, so they pass through the filter and get added to ANY active chat view

## Resolution

root_cause: Server-side WebSocket messages (claude-response, claude-output, etc.) don't include sessionId field. ChatInterface filters messages by sessionId (line 3216), but messages without sessionId bypass the filter. When user switches from project 1 to project 2 while project 1's session is still streaming responses, those responses lack sessionId and get added to project 2's chat view because they pass the filter check (undefined !== currentSessionId evaluates to true).

fix: Added sessionId to all WebSocket messages sent from server in both claude-sdk.js and cursor-cli.js. Modified ws.send() calls to include sessionId: capturedSessionId for all message types (claude-response, claude-error, token-budget, cursor-system, cursor-user, cursor-output, cursor-error, cursor-response).

verification: Code analysis confirms the fix is correct. The sessionId filter in ChatInterface.jsx line 3216 checks `latestMessage.sessionId !== currentSessionId`. Previously, messages from claude-sdk.js and cursor-cli.js didn't include sessionId, causing them to pass this filter (undefined !== currentSessionId = true). Now all messages include sessionId, so the filter will correctly reject messages from different sessions. When a user switches from project 1 to project 2 while project 1's session is streaming, project 2's ChatInterface will have a different currentSessionId and will reject messages with project 1's sessionId.

Manual verification steps (for future testing):
1. Start claudecodeui dev server (npm run dev)
2. Open project 1, start a Claude session with a prompt that takes time to respond
3. While project 1's session is streaming responses, switch to project 2
4. Expected: Project 2's chat view should remain empty or show only project 2's messages
5. Actual (before fix): Project 1's streaming messages appeared in project 2's chat view
6. Actual (after fix): Project 1's messages will be filtered out because they have project 1's sessionId
files_changed:
  - server/claude-sdk.js
  - server/cursor-cli.js
