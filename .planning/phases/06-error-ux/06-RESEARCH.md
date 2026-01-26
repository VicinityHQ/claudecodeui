# Phase 6: Error UX - Research

**Researched:** 2026-01-26
**Domain:** Error handling UX, timeout feedback, WebSocket reconnection UI patterns
**Confidence:** HIGH

## Summary

Error UX for real-time chat applications requires clear visual feedback for three critical scenarios: request timeouts (60+ seconds of inactivity), WebSocket disconnections with reconnection status, and message queuing during network disruption. The backend already implements timeout detection (60s inactivity, 10m max duration) with structured error messages sent via WebSocket, and the frontend has message queueing during disconnection.

The research reveals that modern React applications in 2026 favor lightweight, accessible error notification patterns. shadcn/ui (already in use) recommends **Sonner** for transient toast notifications and the **Alert** component for persistent dismissible errors. WebSocket connection status should use visual indicators (badge/banner) that update based on `isConnected` state from the WebSocket hook. ARIA live regions ensure screen reader accessibility.

Key technical patterns:
- **Timeout errors**: Display persistent dismissible banner when backend sends `{type: 'claude-error', timeout: true}`
- **WebSocket status**: Global connection indicator using `isConnected` from `useWebSocket()` hook
- **Reconnection feedback**: Show "Reconnecting..." badge with `pendingCount` when `isConnected === false`
- **Accessibility**: Use `role="alert"` with `aria-live="assertive"` for critical errors, `aria-live="polite"` for status updates
- **Animation**: CSS transitions with `prefers-reduced-motion` support for smooth appearance/dismissal

**Primary recommendation:** Use the existing sessionError state pattern (already implemented) for timeout errors. Add a global WebSocket status badge in the header using `isConnected` from WebSocketContext. Keep error messages actionable with dismiss buttons. No toast library needed - inline alerts are sufficient.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React state hooks | 18.2+ | Error state management | Native React pattern, already in use for `sessionError` |
| Tailwind CSS | Current | Error styling | Already in use, provides red color variants for error states |
| lucide-react | 0.515.0 | Error/warning icons | Already in dependency list, comprehensive icon set |
| ARIA attributes | Native | Accessibility | Standard web platform, no library needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Sonner | 1.x | Toast notifications | Only if transient notifications are needed (not required for Phase 6) |
| shadcn/ui Alert | Current | Persistent error banners | Can add via `npx shadcn-ui@latest add alert` if needed |
| CSS transitions | Native | Smooth animations | For fade-in/fade-out of error messages |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline error banners | react-toastify | Toast library adds 47KB bundle, unnecessary for persistent errors |
| Inline error banners | react-hot-toast | 5KB is smaller but still unnecessary - native React state works |
| Custom reconnection badge | Library-based connection monitor | Custom badge is simpler, no external dependency |
| CSS transitions | Framer Motion / Motion.dev | Animation library overkill for simple fade effects |

**Installation:**
```bash
# No new dependencies required for basic implementation
# All needs met by: React state + Tailwind + lucide-react

# Optional: If toast notifications are desired later
npm install sonner

# Optional: If shadcn Alert component preferred over custom
npx shadcn-ui@latest add alert
```

## Architecture Patterns

### Recommended Error State Structure
```javascript
// ChatInterface.jsx (already exists)
const [sessionError, setSessionError] = useState(null);

// WebSocket connection status (already exposed by useWebSocket)
const { isConnected, pendingCount } = useWebSocketContext();

// Error message structure from backend (already implemented)
{
  type: 'claude-error',
  error: 'No SDK activity for 60 seconds', // User-facing message
  sessionId: 'session-123',
  timeout: true,
  reason: 'inactivity', // or 'max_duration'
  timestamp: '2026-01-26T...',
  category: 'timeout'
}
```

### Pattern 1: Timeout Error Banner (Persistent, Dismissible)
**What:** Display error banner when backend sends timeout error, user can dismiss
**When to use:** For timeout errors (ERR-01) that require user acknowledgment
**Example:**
```jsx
// Source: Current ChatInterface.jsx implementation + UX best practices
{sessionError && !isLoading && (
  <div
    role="alert"
    aria-live="assertive"
    className="text-center py-2 px-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-2 transition-opacity duration-300"
  >
    <p className="text-red-600 dark:text-red-400 text-sm">{sessionError}</p>
    <button
      onClick={() => setSessionError(null)}
      className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-300 mt-1"
      aria-label="Dismiss error"
    >
      Dismiss
    </button>
  </div>
)}
```

**Best Practices:**
- Position banner close to where error occurred (above input area)
- Make dismissible with clear "Dismiss" button
- Use `role="alert"` for screen reader announcement
- Use `aria-live="assertive"` for timeout errors (critical feedback)
- Include `transition-opacity` with `duration-300` for smooth fade-in
- Respect `prefers-reduced-motion` for accessibility

### Pattern 2: WebSocket Connection Status Indicator (Global)
**What:** Badge/indicator showing connection status in header/nav area
**When to use:** For ERR-03 (WebSocket disconnect/reconnect status)
**Example:**
```jsx
// Source: WebSocket best practices 2026 + React patterns
import { Wifi, WifiOff } from 'lucide-react';

function ConnectionStatusBadge() {
  const { isConnected, pendingCount } = useWebSocketContext();

  if (isConnected) {
    return null; // Don't show anything when connected (normal state)
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Reconnecting, ${pendingCount} messages queued`}
      className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md text-yellow-700 dark:text-yellow-300 text-sm transition-all duration-300"
    >
      <WifiOff className="w-4 h-4 animate-pulse" />
      <span>Reconnecting{pendingCount > 0 && ` (${pendingCount} queued)`}...</span>
    </div>
  );
}
```

**Best Practices:**
- Only show when disconnected (don't clutter UI when everything is fine)
- Use yellow/warning color (not red) - reconnection is expected behavior
- Show `pendingCount` to inform user that messages are being saved
- Use `aria-live="polite"` for status updates (non-critical)
- Position in header/top of chat area for visibility
- Animate icon to indicate active reconnection attempt
- Auto-hide when `isConnected` becomes true (via conditional render)

### Pattern 3: WebSocket Reconnection Logic (Already Implemented)
**What:** Exponential backoff for reconnection, message queuing during disconnect
**When to use:** Already implemented in `useWebSocket()` hook
**Current Implementation:**
```javascript
// Source: src/utils/websocket.js (current implementation)
websocket.onclose = (event) => {
  console.log('[WS] Disconnected, code:', event.code);
  if (!mounted) return;

  setIsConnected(false);
  setWs(null);
  wsRef.current = null;

  // Simple 3 second reconnect (could be enhanced with exponential backoff)
  reconnectTimeoutRef.current = setTimeout(() => {
    if (mounted) {
      console.log('[WS] Attempting reconnect...');
      connect();
    }
  }, 3000);
};
```

**Enhancement Opportunity (Not Required for Phase 6):**
Exponential backoff prevents server overload during outages:
```javascript
// Formula: Math.min(baseDelay * 2^attempt + jitter, maxDelay)
const baseDelay = 1000;  // 1 second
const maxDelay = 30000;  // 30 seconds
const jitter = Math.random() * 1000; // 0-1000ms random

const delay = Math.min(baseDelay * Math.pow(2, reconnectAttempt) + jitter, maxDelay);
```

### Pattern 4: Error Message Handling in Message Loop
**What:** Separate error state from loading state to prevent stuck spinners
**When to use:** Already implemented (Phase 5-02 decision)
**Example:**
```javascript
// Source: Current ChatInterface.jsx pattern
case 'claude-error': {
  const errorMsg = latestMessage.error || 'An error occurred';

  // Set error state (dismissible)
  setSessionError(errorMsg);

  // Clear loading state (prevents stuck spinner)
  setIsLoading(false);

  // Don't add error to chat messages - show in banner instead
  break;
}
```

### Anti-Patterns to Avoid
- **Don't use toasts for timeout errors:** Toasts auto-dismiss, but timeout errors need explicit acknowledgment
- **Don't keep loading spinner during error:** Separate `sessionError` and `isLoading` states (already implemented)
- **Don't show "Connected" indicator:** Only show status during problems (yellow "Reconnecting..."), not during normal operation
- **Don't block UI during reconnection:** Message queue allows user to continue typing
- **Don't use `aria-live="assertive"` for status:** Reserve assertive for critical errors; use polite for connection status
- **Don't animate without prefers-reduced-motion check:** Respect user accessibility preferences

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebSocket reconnection | Custom reconnection logic | Existing `useWebSocket()` hook with timeout | Already handles queue, reconnect, state management |
| Toast notifications | Custom toast system | Sonner (if needed) | 5KB, accessible, TypeScript-first, promise-based API |
| Icon set | SVG imports | lucide-react (already installed) | Consistent, tree-shakeable, comprehensive |
| Exponential backoff | Manual backoff calculation | TanStack Pacer or simple formula | Predictable, composable, React-friendly |
| Accessibility attributes | Guessing ARIA roles | MDN ARIA reference | Standardized, tested with screen readers |
| CSS transitions | JavaScript animations | Tailwind `transition-*` utilities + CSS | Hardware accelerated, declarative, built-in |

**Key insight:** The codebase already has 80% of what's needed. Timeout errors use existing `sessionError` state, WebSocket status uses existing `isConnected` from hook. Primary work is UI positioning and ARIA attributes, not new state management.

## Common Pitfalls

### Pitfall 1: Toast Notifications for Persistent Errors
**What goes wrong:** Using auto-dismissing toasts for timeout errors means users might miss the error or it disappears before they can read it.
**Why it happens:** Toasts are popular for success messages, so developers default to them for all feedback.
**How to avoid:**
- Use persistent dismissible banners for errors requiring acknowledgment (timeouts)
- Reserve toasts for transient success messages ("Message sent", "Settings saved")
- Apply the rule: **Critical = banner, Info = toast**
**Warning signs:** Users report "not seeing" error messages, errors that need action use auto-dismiss

### Pitfall 2: Showing Connection Status During Normal Operation
**What goes wrong:** Constant "Connected" badge clutters UI and creates visual noise.
**Why it happens:** Trying to provide complete transparency about all system state.
**How to avoid:**
- Only show indicators for **problem states** (disconnected, reconnecting)
- Hide indicator when `isConnected === true` (normal operation)
- Follow principle: **Don't distract users with "everything is fine" messages**
**Warning signs:** Users ask "how do I hide this badge", permanent UI elements for transient states

### Pitfall 3: Aggressive aria-live on All Updates
**What goes wrong:** Screen readers announce every status change, overwhelming users.
**Why it happens:** Misunderstanding that all dynamic content needs ARIA live regions.
**How to avoid:**
- Use `aria-live="assertive"` ONLY for critical errors (timeouts, failures)
- Use `aria-live="polite"` for status updates (reconnecting, processing)
- Use `aria-live="off"` (default) for non-critical UI updates
- Wait 2 seconds after adding live region to DOM before updating content
**Warning signs:** Screen reader testing reveals constant interruptions, users complain about announcement spam

### Pitfall 4: Not Respecting prefers-reduced-motion
**What goes wrong:** Animations trigger motion sensitivity issues for users with vestibular disorders.
**Why it happens:** Forgetting to check user accessibility preferences.
**How to avoid:**
```css
/* Tailwind approach */
.error-banner {
  @apply transition-opacity duration-300;
}

/* Add motion-reduce variant */
@media (prefers-reduced-motion: reduce) {
  .error-banner {
    transition: none;
  }
}

/* Or use Tailwind's built-in variant */
.error-banner {
  @apply transition-opacity duration-300 motion-reduce:transition-none;
}
```
**Warning signs:** Accessibility audits fail, users with motion sensitivities report discomfort

### Pitfall 5: Debouncing/Throttling Error Messages
**What goes wrong:** Error messages get dropped or delayed, hiding real problems from users.
**Why it happens:** Applying performance patterns (debounce/throttle) meant for user input to error feedback.
**How to avoid:**
- **Never debounce error messages** - users need immediate feedback
- Debounce is for **user input** (search, form validation), not system feedback
- If getting duplicate errors, fix the source (backend shouldn't send duplicates)
**Warning signs:** Users report "errors appearing late" or "not seeing errors until much later"

### Pitfall 6: Message Queue Growing Unbounded
**What goes wrong:** During extended disconnection, message queue consumes memory, eventually crashes browser.
**Why it happens:** No queue size limit on message buffering.
**How to avoid:**
```javascript
// Current implementation already has this (src/utils/websocket.js line 122)
if (messageQueueRef.current.length >= 100) {
  console.warn('[WS] Message queue full, dropping oldest message');
  messageQueueRef.current.shift();
}
```
- Limit queue size (100 messages is reasonable)
- Drop oldest messages first (FIFO)
- Warn user if queue is full: "Connection lost - new messages may not send"
**Warning signs:** Browser memory usage grows during disconnection, app becomes unresponsive after extended offline period

## Code Examples

Verified patterns from official sources and current codebase:

### Timeout Error Handling (Backend to Frontend)
```javascript
// Source: server/claude-sdk.js (current implementation)
function handleSessionTimeout(sessionId, reason, message, ws) {
  const session = activeSessions.get(sessionId);

  // Guard against duplicate errors in terminal states
  if (session.status === SessionStatus.COMPLETE || session.status === SessionStatus.ERROR) {
    console.log(`Session ${sessionId} timeout skipped: already in ${session.status} state`);
    return;
  }

  transitionSessionState(sessionId, SessionStatus.TIMEOUT);

  // Send structured error to frontend
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({
      type: 'claude-error',
      error: message,                           // "No SDK activity for 60 seconds"
      sessionId: sessionId,
      timeout: true,                           // Flag for UI differentiation
      reason: reason,                          // 'inactivity' or 'max_duration'
      timestamp: new Date().toISOString(),
      category: 'timeout'
    }));
  }
}
```

### Timeout Error Display (Frontend)
```jsx
// Source: src/components/ChatInterface.jsx (lines 5060-5067, current implementation)
{sessionError && !isLoading && (
  <div
    role="alert"
    aria-live="assertive"
    className="text-center py-2 px-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-2 transition-opacity duration-300 motion-reduce:transition-none"
  >
    <p className="text-red-600 dark:text-red-400 text-sm">
      {sessionError}
    </p>
    <button
      onClick={() => setSessionError(null)}
      className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-300 mt-1"
      aria-label="Dismiss error message"
    >
      Dismiss
    </button>
  </div>
)}
```

### WebSocket Reconnection Status Badge
```jsx
// Source: WebSocket patterns 2026 + lucide-react docs
import { Wifi, WifiOff } from 'lucide-react';
import { useWebSocketContext } from '../contexts/WebSocketContext';

function ConnectionStatusBadge() {
  const { isConnected, pendingCount } = useWebSocketContext();

  // Only show during problem states
  if (isConnected) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Reconnecting to server${pendingCount > 0 ? `, ${pendingCount} messages queued` : ''}`}
      className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md text-yellow-700 dark:text-yellow-300 text-sm transition-all duration-300 motion-reduce:transition-none"
    >
      <WifiOff className="w-4 h-4 animate-pulse motion-reduce:animate-none" />
      <span>
        Reconnecting...
        {pendingCount > 0 && (
          <span className="ml-1 font-medium">
            ({pendingCount} queued)
          </span>
        )}
      </span>
    </div>
  );
}
```

### Message Queue During Disconnection (Already Implemented)
```javascript
// Source: src/utils/websocket.js (lines 113-129, current implementation)
const sendMessage = useCallback((message) => {
  const currentWs = wsRef.current;
  if (currentWs && currentWs.readyState === WebSocket.OPEN) {
    console.log('[WS] Sending:', message.type);
    currentWs.send(JSON.stringify(message));
  } else {
    console.log('[WS] Queuing message (not connected):', message.type);

    // Limit queue size to prevent memory issues
    if (messageQueueRef.current.length >= 100) {
      console.warn('[WS] Message queue full, dropping oldest message');
      messageQueueRef.current.shift();
    }

    messageQueueRef.current.push(message);
    setPendingCount(messageQueueRef.current.length);
  }
}, []);
```

### ARIA Live Region Pattern
```jsx
// Source: MDN ARIA Live Regions + W3C ARIA19 technique
// https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions

// Pattern 1: Critical Errors (timeout, failure)
<div
  role="alert"
  aria-live="assertive"  // Interrupt current announcement
  aria-atomic="true"     // Announce entire content on update
>
  {errorMessage}
</div>

// Pattern 2: Status Updates (reconnecting, processing)
<div
  role="status"
  aria-live="polite"     // Wait for pause to announce
  aria-atomic="true"
>
  {statusMessage}
</div>

// Best Practice: Empty on initial render, update after 2s delay
function ErrorBanner({ error }) {
  const [ariaContent, setAriaContent] = useState('');

  useEffect(() => {
    if (error) {
      // Wait for accessibility API to identify the live region
      const timer = setTimeout(() => {
        setAriaContent(error);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div role="alert" aria-live="assertive">
      {ariaContent}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-toastify for all notifications | Sonner for toasts, inline alerts for errors | 2025-2026 | Smaller bundle (5KB vs 47KB), better accessibility |
| Custom WebSocket reconnection | Exponential backoff with jitter | 2024+ | Prevents server overload during outages |
| Manual ARIA attributes | Structured role/aria-live patterns | Ongoing | Better screen reader support, WCAG 2.1 compliance |
| JavaScript animations | CSS transitions + prefers-reduced-motion | 2023+ | Hardware acceleration, accessibility compliance |
| Global error boundaries only | Localized error states + boundaries | 2024+ | Better UX - errors don't crash entire app |
| Toast for all feedback | Persistent banners for critical errors | 2025+ | Users don't miss important error messages |

**Deprecated/outdated:**
- **react-toastify**: Still works but heavier than alternatives; shadcn/ui deprecated their toast component in favor of Sonner
- **Custom reconnection without backoff**: Naive retry loops can DDoS your own server during outages
- **Alert dialogs for non-blocking errors**: Modal alerts interrupt workflow; use inline banners instead
- **Success toasts that require dismissal**: Success feedback should auto-dismiss; only errors need explicit dismiss

## Open Questions

Things that couldn't be fully resolved:

1. **Should exponential backoff replace fixed 3-second reconnection?**
   - What we know: Current implementation uses fixed 3s timeout (line 80, websocket.js)
   - What's unclear: Whether this causes issues during server restarts (many clients reconnecting simultaneously)
   - Recommendation: Fixed 3s is acceptable for Phase 6. Consider exponential backoff if server logs show reconnection spikes

2. **Should timeout errors be added to chat history or only shown as dismissible banner?**
   - What we know: Current implementation sets `sessionError` state but doesn't add to `chatMessages`
   - What's unclear: User preference - permanent record vs clean chat history
   - Recommendation: Keep current pattern (banner only). Timeout isn't part of conversation history; it's transient system feedback

3. **Should we show "Connection restored" confirmation after reconnect?**
   - What we know: Current implementation hides badge when `isConnected` becomes true
   - What's unclear: Whether users need explicit "success" feedback
   - Recommendation: No confirmation needed. Silent reconnection is standard pattern (Discord, Slack). Indicator disappearing is sufficient feedback

4. **Should message queue limit (100) be configurable?**
   - What we know: Hard-coded 100 message limit (line 122, websocket.js)
   - What's unclear: Whether power users need higher limits
   - Recommendation: 100 is reasonable for Phase 6. Consider environment variable if users report hitting limit

5. **Should we use Sonner for transient notifications later?**
   - What we know: No toast notifications currently used in app
   - What's unclear: Whether future features (file uploads, settings saves) would benefit from toasts
   - Recommendation: Add when needed, not preemptively. Current inline feedback is sufficient for Phase 6

## Sources

### Primary (HIGH confidence)
- MDN ARIA Live Regions: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions
- W3C ARIA19 Technique: https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA19
- MDN aria-errormessage: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-errormessage
- shadcn/ui Toast (deprecated): https://ui.shadcn.com/docs/components/toast
- shadcn/ui Sonner (current): https://ui.shadcn.com/docs/components/sonner
- shadcn/ui Alert: https://ui.shadcn.com/docs/components/alert
- Current codebase implementation: server/claude-sdk.js, src/utils/websocket.js, src/components/ChatInterface.jsx

### Secondary (MEDIUM confidence)
- React WebSocket tutorial (Jan 2026): https://oneuptime.com/blog/post/2026-01-15-websockets-react-real-time-applications/view
- Top React Notification Libraries 2026: https://knock.app/blog/the-top-notification-libraries-for-react
- React Toast Libraries Comparison 2025: https://blog.logrocket.com/react-toast-libraries-compared-2025/
- WebSocket Reconnection Patterns: https://apidog.com/blog/websocket-reconnect/
- Exponential Backoff JavaScript: https://dev.to/hexshift/robust-websocket-reconnection-strategies-in-javascript-with-exponential-backoff-40n1

### Tertiary (LOW confidence - general guidance, verified with primary sources)
- Error Message UX Design: https://www.pencilandpaper.io/articles/ux-pattern-analysis-error-feedback
- Dismissible Banners UX: https://polaris-react.shopify.com/components/feedback-indicators/banner
- React Error Handling Best Practices: https://uxcam.com/blog/react-error-handling-best-practices/
- Accessibility Live Regions Guide: https://www.a11y-collective.com/blog/aria-live/
- Debounce and Throttle Patterns: https://dev.to/abhirupa/the-art-of-smooth-ux-debouncing-and-throttling-for-a-more-performant-ui-m0h
- CSS Transitions Best Practices: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Transitions/Using
- React Animation 2026: https://www.syncfusion.com/blogs/post/top-react-animation-libraries

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed (React, Tailwind, lucide-react), no new dependencies required
- Architecture: HIGH - Patterns verified in current codebase (sessionError state, WebSocket hook) and official documentation (ARIA, shadcn/ui)
- Pitfalls: HIGH - Based on established accessibility guidelines (W3C, MDN) and React best practices

**Research date:** 2026-01-26
**Valid until:** ~30 days (2026-02-26) - Error UX patterns are stable; React and ARIA standards don't change frequently
