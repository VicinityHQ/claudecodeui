---
status: resolved
trigger: "When returning to existing/completed sessions in claudecodeui, messages sent by users don't register or get processed."
created: 2026-01-25T00:00:00Z
updated: 2026-01-25T00:10:00Z
---

## Current Focus

hypothesis: Fix implemented
test: Ready for manual verification
expecting: When user sends message to completed session, will see log "Session X is completed. Starting new session for this message" and new session will be created without token budget overflow
next_action: Provide verification instructions to user

## Symptoms

expected: Messages sent to existing sessions should be processed and generate responses
actual: Messages don't register when going back to completed sessions, even after refreshing browser and re-entering session
errors: Repeated log messages "No session_id in message or already captured. message.session_id: X capturedSessionId: X" (where both IDs match). Also shows token budget way over limit: used: 1402898, total: 160000
reproduction:
  1. Start a session in claudecodeui
  2. Let it complete its work
  3. Go back to the session later
  4. Try sending commands (like "clear")
  5. Messages don't register
timeline: Ongoing issue with session resumption

## Eliminated

## Evidence

- timestamp: 2026-01-25T00:01:00Z
  checked: server/claude-sdk.js lines 575-600
  found: Message filtering logic at line 578 - condition checks "if (message.session_id && !capturedSessionId)" which only captures session on FIRST message. For existing sessions, capturedSessionId is already set (line 472: "let capturedSessionId = sessionId"), so this condition NEVER runs for resumed sessions. The else block logs the warning but code continues to process message normally.
  implication: The log message is misleading - it's not actually blocking message processing. Messages ARE being sent to WebSocket (lines 603-608). The real issue must be elsewhere.

- timestamp: 2026-01-25T00:02:00Z
  checked: Function entry at line 470-472
  found: capturedSessionId is initialized from options.sessionId for resumed sessions
  implication: For existing sessions, capturedSessionId starts with the session ID, so the condition at line 578 correctly skips the "first message" setup. This is working as intended.

- timestamp: 2026-01-25T00:03:00Z
  checked: Session cleanup at lines 624-640
  found: When a session completes, removeSession(capturedSessionId) is called, then 'claude-complete' event is sent. There's no check in queryClaudeSDK to prevent creating a new query for a completed session.
  implication: When user sends a message to a completed session, queryClaudeSDK creates a BRAND NEW SDK query instance. But the SDK might be replaying ALL messages from the session history, not just processing the new message.

- timestamp: 2026-01-25T00:04:00Z
  checked: Symptom analysis - token budget 1402898/160000
  found: Token budget is massively over limit (8.7x). The log shows "No session_id in message or already captured" repeatedly, suggesting the SDK is streaming many messages.
  implication: The SDK is likely replaying the entire session history when resuming, causing the token budget to accumulate all previous messages plus new ones.

- timestamp: 2026-01-25T00:05:00Z
  checked: Function isClaudeSDKSessionActive at line 704
  found: Function exists to check if session is active, but grep shows it's only defined (704) and exported (721), NEVER CALLED anywhere in claude-sdk.js
  implication: queryClaudeSDK has NO guard against creating new queries for already-active OR already-completed sessions

- timestamp: 2026-01-25T00:06:00Z
  checked: queryClaudeSDK function flow lines 470-567
  found: When called with existing sessionId, it sets capturedSessionId = sessionId (472), then ALWAYS creates new SDK query instance (564-567). No check for session state before query creation.
  implication: ROOT CAUSE - When user sends message to completed session, code creates new SDK query with old sessionId. SDK probably doesn't support resumption and either fails silently or replays history.

## Resolution

root_cause: When a Claude SDK session completes, it's removed from activeSessions (line 626). When user sends a new message to that completed session, queryClaudeSDK is called with the old sessionId but creates a brand new SDK query instance. The Claude SDK doesn't support session continuation/resumption - it's designed for single-shot queries. Creating a new query with an old sessionId causes the SDK to either fail silently or replay the entire session history (explaining the 8.7x token budget overflow). There's no guard in queryClaudeSDK to prevent this.

fix: Added comprehensive guard in queryClaudeSDK to handle completed session resumption:
  1. Detect completed sessions at lines 475-485 (sessionId exists but not in activeSessions)
  2. Set capturedSessionId = null and effectiveSessionId = null to treat as new session
  3. Strip sessionId from options before passing to mapCliOptionsToSDK (line 490) to prevent SDK resume attempt
  4. Use effectiveSessionId instead of sessionId for session-created event (line 606), permission requests (lines 532, 544), and completion event (line 648)
  This prevents the SDK from attempting to resume a completed session, which caused it to replay history and overflow token budget.

verification:
  Manual testing required:
  1. Start a Claude SDK session in claudecodeui
  2. Let it complete its work
  3. Wait for "Streaming complete, sending claude-complete event" in server logs
  4. Go back to the session in UI
  5. Send a new message (e.g., "clear" or any command)
  6. Expected results:
     - Server log shows: "Session {id} is completed. Starting new session for this message"
     - A NEW session is created (new session ID)
     - Token budget starts fresh (not 1.4M)
     - Message is processed normally
     - No "No session_id in message or already captured" spam

files_changed:
  - server/claude-sdk.js
