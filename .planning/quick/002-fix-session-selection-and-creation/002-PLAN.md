---
phase: quick
plan: 002
type: execute
wave: 1
depends_on: []
files_modified:
  - src/App.jsx
  - src/components/ChatInterface.jsx
autonomous: true
---

<objective>
Fix session selection disappearing and new session creation not working

Purpose: Two critical bugs prevent basic session management:
1. Sessions flash and disappear when clicking on them
2. New session creation silently fails

Output: Working session selection and creation flow
</objective>

<execution_context>
@/home/node/.claude/get-shit-done/workflows/execute-plan.md
@/home/node/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/App.jsx (URL_SESSION useEffect lines 364-443, handleSessionSelect lines 454-482)
@src/components/ChatInterface.jsx (handleSubmit line 4426+, pendingSystemSessionIdRef usage)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix URL_SESSION useEffect dependency array</name>
  <files>src/App.jsx</files>
  <action>
The URL_SESSION useEffect (lines 364-443) is missing `selectedSession` from its dependency array.

Current dependency array at line 443:
```javascript
}, [sessionId, projects, navigate]);
```

This causes the effect to not properly re-evaluate when `selectedSession` changes, leading to stale closure issues in the guard condition at line 367-372.

Fix: Add `selectedSession` to the dependency array:
```javascript
}, [sessionId, projects, navigate, selectedSession]);
```

This ensures the effect re-runs when:
- URL sessionId changes (user navigates)
- projects list updates (new sessions appear)
- selectedSession changes (user selects different session)

The existing guard at lines 367-372 will now properly detect when we already have the correct session selected and early-return.
  </action>
  <verify>
1. Verify no ESLint warnings about missing deps in URL_SESSION useEffect
2. Confirm the dependency array includes all four values
  </verify>
  <done>URL_SESSION useEffect has complete dependency array including selectedSession</done>
</task>

<task type="auto">
  <name>Task 2: Fix pendingSessionIdRef coordination for new sessions</name>
  <files>src/App.jsx, src/components/ChatInterface.jsx</files>
  <action>
The new session creation flow breaks because:
1. ChatInterface sets `pendingSystemSessionIdRef.current = 'pending-new-session'` (a string literal)
2. But App.jsx uses its own `pendingSessionIdRef` for session protection
3. When `onNavigateToSession` is called, App.jsx's ref isn't set, causing session protection to fail

Fix in App.jsx - Modify the `onNavigateToSession` callback (line 990) to also set `pendingSessionIdRef`:

Current:
```javascript
onNavigateToSession={(sessionId) => navigate(`/session/${sessionId}`)}
```

Change to:
```javascript
onNavigateToSession={(sessionId) => {
  pendingSessionIdRef.current = sessionId;
  navigate(`/session/${sessionId}`);
}}
```

This ensures when ChatInterface triggers navigation to a new session:
1. App.jsx's `pendingSessionIdRef` is set BEFORE navigation
2. The session protection logic at line 232-234 correctly identifies an active session
3. The URL_SESSION useEffect at line 439 has a valid `pendingSessionIdRef.current` value
4. Session is fetched via `fetchAndFindSession()` instead of being cleared

Note: Do NOT change ChatInterface's `pendingSystemSessionIdRef` logic - it serves a different purpose (preventing message clearing during system-initiated session changes). The two refs work together:
- App.jsx `pendingSessionIdRef`: Prevents project/session list updates from clearing selection
- ChatInterface `pendingSystemSessionIdRef`: Prevents message clearing during session transitions
  </action>
  <verify>
1. Start a new session by typing in empty chat
2. Verify session appears in sidebar after sending message
3. Verify messages persist (not cleared during transition)
  </verify>
  <done>New session creation works - session appears in sidebar with messages intact</done>
</task>

<task type="auto">
  <name>Task 3: Add guard for null selectedSession in protection logic</name>
  <files>src/App.jsx</files>
  <action>
The session protection logic at lines 264-277 can cause issues when `selectedSession` is null during the transition period.

Current code (line 264-277):
```javascript
if (selectedSession) {
  const allSessions = [
    ...(updatedSelectedProject.sessions || []),
    ...(updatedSelectedProject.codexSessions || []),
    ...(updatedSelectedProject.cursorSessions || [])
  ];
  const updatedSelectedSession = allSessions.find(s => s.id === selectedSession.id);
  if (!updatedSelectedSession) {
    // Don't clear selectedSession if we're waiting for a pending session
    // This prevents clearing chat state during the transition period
    if (!pendingSessionIdRef.current) {
      setSelectedSession(null);
    }
  }
}
```

This is actually fine when `selectedSession` is null (the outer if guards it). But when clicking a session from the sidebar, there's a brief window where:
1. `handleSessionSelect` sets `selectedSession`
2. But the session might not be in the `updatedProjects` yet (if it's newly created)
3. The code clears `selectedSession` because `pendingSessionIdRef.current` is null

The fix in Task 2 already addresses this by setting `pendingSessionIdRef` during navigation. However, we should also set it in `handleSessionSelect`:

In `handleSessionSelect` (line 454-482), add pendingSessionIdRef before navigation:

Current (line 481):
```javascript
navigate(`/session/${session.id}`);
```

Change to:
```javascript
pendingSessionIdRef.current = session.id;
navigate(`/session/${session.id}`);
```

This ensures direct session clicks (not just system-initiated navigations) also protect the session selection.
  </action>
  <verify>
1. Click on any session in the sidebar
2. Verify session stays selected (doesn't flash/disappear)
3. Verify messages load correctly
4. Repeat with sessions from different projects
  </verify>
  <done>Session selection is protected during project list updates - clicking sessions works reliably</done>
</task>

</tasks>

<verification>
1. Click existing session in sidebar - stays selected, messages load
2. Click session from different project - switches correctly, no flash
3. Start new session (type and send) - session created, appears in sidebar
4. During active conversation, sidebar updates don't clear selection
5. No console errors related to session state
</verification>

<success_criteria>
- Session selection persists when clicking any session in sidebar
- New session creation works (message sent, session appears in sidebar)
- Messages do not disappear during session transitions
- No regressions to existing session resumption functionality
</success_criteria>

<output>
After completion, create `.planning/quick/002-fix-session-selection-and-creation/002-SUMMARY.md`
</output>
