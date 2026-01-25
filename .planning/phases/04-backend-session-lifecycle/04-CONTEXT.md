# Phase 4: Backend Session Lifecycle - Context

**Gathered:** 2026-01-25
**Status:** Ready for planning

<domain>
## Phase Boundary

SDK sessions tracked from creation through completion with proper timeout handling. Backend captures session ID, tracks status transitions (pending → active → complete/error), detects SDK completion, handles timeouts, and propagates errors to UI via WebSocket.

</domain>

<decisions>
## Implementation Decisions

### Timeout behavior
- Timeout clock starts immediately on user submit (before SDK responds)
- Timeout resets on each SDK message (activity keeps session alive)
- Maximum session duration capped at 10 minutes regardless of activity
- Inactivity timeout: 60 seconds with no SDK messages
- When timeout fires: mark session as failed, do NOT attempt SDK abort
- Let SDK continue in background if still running, but UI sees timeout error

### Claude's Discretion
- Session state enum values and naming
- Data structure for tracking active sessions
- How to detect SDK async generator completion
- Error message formatting and categorization
- Cleanup of orphaned session tracking data

</decisions>

<specifics>
## Specific Ideas

- Primary use is mobile (no DevTools), so timeout errors must be clear enough to understand without debugging
- Existing issue: sessions stream same ID repeatedly but never complete — timeout should catch this
- Hybrid timeout approach prevents both stuck sessions (inactivity) and runaway sessions (max cap)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-backend-session-lifecycle*
*Context gathered: 2026-01-25*
