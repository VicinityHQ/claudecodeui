---
phase: quick-001
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/utils/websocket.js
autonomous: true

must_haves:
  truths:
    - "Messages sent during WebSocket reconnection are queued and delivered when connection restores"
    - "User commands never silently disappear"
    - "Queue is flushed in order when connection reopens"
  artifacts:
    - path: "src/utils/websocket.js"
      provides: "WebSocket hook with message queuing"
      contains: "messageQueue"
  key_links:
    - from: "sendMessage function"
      to: "messageQueue ref"
      via: "queue push when disconnected"
      pattern: "messageQueue.*push"
    - from: "onopen handler"
      to: "messageQueue ref"
      via: "flush queued messages"
      pattern: "messageQueue.*forEach|while.*messageQueue"
---

<objective>
Fix WebSocket message dropping by adding message queuing during disconnection/reconnection

Purpose: Messages sent while WebSocket is reconnecting are currently silently dropped with only a console.warn. This causes user commands to disappear without feedback, creating a poor UX where users think the system is unresponsive.

Output: Modified websocket.js with a message queue that holds outgoing messages during disconnection and flushes them when the connection is restored.
</objective>

<execution_context>
@/home/node/.claude/get-shit-done/workflows/execute-plan.md
@/home/node/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/utils/websocket.js
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add message queue with automatic flush on reconnect</name>
  <files>src/utils/websocket.js</files>
  <action>
  Modify the useWebSocket hook to add message queuing:

  1. Add a messageQueueRef using useRef initialized to empty array:
     ```javascript
     const messageQueueRef = useRef([]);
     ```

  2. In the `websocket.onopen` handler, after setting isConnected to true, flush any queued messages:
     ```javascript
     // Flush queued messages
     while (messageQueueRef.current.length > 0) {
       const queuedMessage = messageQueueRef.current.shift();
       console.log('[WS] Sending queued message:', queuedMessage.type);
       websocket.send(JSON.stringify(queuedMessage));
     }
     ```

  3. Modify the `sendMessage` callback to queue messages when not connected instead of just warning:
     ```javascript
     const sendMessage = useCallback((message) => {
       const currentWs = wsRef.current;
       if (currentWs && currentWs.readyState === WebSocket.OPEN) {
         console.log('[WS] Sending:', message.type);
         currentWs.send(JSON.stringify(message));
       } else {
         console.log('[WS] Queuing message (not connected):', message.type);
         messageQueueRef.current.push(message);
       }
     }, []);
     ```

  4. Add queue size limit to prevent memory issues during extended disconnection (max 100 messages):
     ```javascript
     // In sendMessage, before pushing:
     if (messageQueueRef.current.length >= 100) {
       console.warn('[WS] Message queue full, dropping oldest message');
       messageQueueRef.current.shift();
     }
     messageQueueRef.current.push(message);
     ```

  5. Optionally expose queue length in return value for UI feedback:
     ```javascript
     return {
       ws,
       sendMessage,
       messages,
       isConnected,
       queueLength: messageQueueRef.current.length
     };
     ```
  </action>
  <verify>
  Manual verification:
  1. Start the app and connect to backend
  2. Open browser DevTools console
  3. Disconnect network or stop backend temporarily
  4. Send a message from UI
  5. Verify console shows "[WS] Queuing message" not "[WS] Cannot send"
  6. Reconnect network or restart backend
  7. Verify console shows "[WS] Sending queued message" after "[WS] Connected"
  8. Verify the queued message was processed by backend
  </verify>
  <done>
  - Messages sent during disconnection are queued (not dropped)
  - Queued messages are flushed in order when connection restores
  - Queue has size limit (100) to prevent memory issues
  - Console logging shows queue/flush behavior for debugging
  </done>
</task>

<task type="auto">
  <name>Task 2: Add connection state callback for UI feedback</name>
  <files>src/utils/websocket.js</files>
  <action>
  Enhance the hook to provide better UI feedback about connection state and pending messages:

  1. Add a `pendingCount` state that updates when queue changes:
     ```javascript
     const [pendingCount, setPendingCount] = useState(0);
     ```

  2. Update pendingCount when queueing and flushing:
     - After pushing to queue: `setPendingCount(messageQueueRef.current.length);`
     - After flushing queue: `setPendingCount(0);`

  3. Return pendingCount in the hook return value:
     ```javascript
     return {
       ws,
       sendMessage,
       messages,
       isConnected,
       pendingCount
     };
     ```

  This allows UI components to show "Reconnecting... (2 messages pending)" style feedback.
  </action>
  <verify>
  Check that the hook returns pendingCount and it updates correctly:
  1. Import and use pendingCount from useWebSocket in a component
  2. Log pendingCount when it changes
  3. Verify it increments when messages queued, resets to 0 when flushed
  </verify>
  <done>
  - pendingCount state exposed from hook
  - Count updates when messages queued
  - Count resets when queue flushed on reconnect
  </done>
</task>

</tasks>

<verification>
1. Code compiles without errors: `npm run build` in claudecodeui directory
2. App starts successfully: `npm run dev`
3. WebSocket connects and messages flow normally when connected
4. Messages are queued (not dropped) when disconnected
5. Queued messages are sent when connection restores
</verification>

<success_criteria>
- No more silent message drops during WebSocket reconnection
- Queued messages delivered in order after reconnect
- pendingCount available for UI feedback
- Existing functionality unchanged when connection is stable
</success_criteria>

<output>
After completion, create `.planning/quick/001-investigate-ui-backend-messaging/001-SUMMARY.md`
</output>
