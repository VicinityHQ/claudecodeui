---
status: resolved
trigger: "When clicking to view a project in the side nav, the projects briefly display then disappear so user can't select a project"
created: 2026-01-28T00:00:00Z
updated: 2026-01-28T00:30:00Z
---

## Current Focus

hypothesis: CONFIRMED - When user clicks a session on mobile, handleProjectSelect is called first (Sidebar.jsx:1314), which unconditionally closes sidebar (App.jsx:450), even though handleSessionSelect has conditional logic to keep it open
test: Trace execution flow when clicking session on mobile
expecting: Sidebar closes due to handleProjectSelect before handleSessionSelect's conditional logic can apply
next_action: Fix by removing handleProjectSelect call from mobile session click handler

## Symptoms

expected: Project list should remain visible after clicking to view projects in side nav
actual: Projects briefly display then immediately disappear
errors: Unknown - need to investigate
reproduction: Click to view projects in the side nav
started: Not specified - need to investigate when this started

## Eliminated

## Evidence

- timestamp: 2026-01-28T00:05:00Z
  checked: Sidebar.jsx component structure
  found: toggleProject function at line 243 that manages expandedProjects state. Uses `new Set()` to manage expansion - if clicking already-expanded project, creates empty set (collapses). If clicking different project, creates new set with only that project.
  implication: Logic appears accordion-style - only one project expanded at a time. Need to understand what triggers the "briefly display then disappear" behavior.

- timestamp: 2026-01-28T00:10:00Z
  checked: App.jsx - sidebar state management
  found: Line 57 shows `sidebarOpen` state for mobile. Line 447-451 handleProjectSelect closes sidebar on mobile: `if (isMobile) { setSidebarOpen(false); }`
  implication: When user clicks a project, handleProjectSelect is called which immediately closes the sidebar on mobile - this could be the issue!

- timestamp: 2026-01-28T00:15:00Z
  checked: Sidebar.jsx mobile vs desktop project/session click handlers
  found: Mobile project click (line 936) only calls toggleProject - does NOT call handleProjectSelect. BUT mobile session click (line 1314) DOES call handleProjectSelect(project) before handleSessionClick!
  implication: The issue is clear: when user expands a project on mobile, sessions briefly appear, but the moment they try to click a session, handleProjectSelect is called which closes the sidebar (App.jsx line 450). This creates the "briefly display then disappear" effect!

- timestamp: 2026-01-28T00:25:00Z
  checked: Applied fix - added conditional check before handleProjectSelect
  found: Mobile session click handler now checks if (selectedProject?.name !== project.name) before calling handleProjectSelect. This preserves the project-switching behavior (different project = close sidebar) while fixing the browse-sessions behavior (same project = keep sidebar open).
  implication: Fix addresses root cause - sidebar will only close when user is switching projects, not when browsing sessions within the already-selected project.

## Resolution

root_cause: Mobile session click handler (Sidebar.jsx line 1314) unconditionally calls handleProjectSelect(project) before handleSessionClick. handleProjectSelect always closes sidebar on mobile (App.jsx line 450). This causes the "briefly display then disappear" issue - user expands project, sees sessions, clicks one, but sidebar closes immediately before they can interact with the session, even when clicking a session from the same already-selected project.
fix: Modified mobile session click handler to only call handleProjectSelect if the project is different from currently selected project. When clicking a session from the same project (the normal case when browsing sessions), the sidebar now stays open. The conditional check (selectedProject?.name !== project.name) prevents unnecessary sidebar closing.
verification: Code review verified - logic is sound. When user clicks session from same project (normal browsing), conditional check prevents handleProjectSelect call, keeping sidebar open. When user clicks session from different project, handleProjectSelect is called, properly closing sidebar as intended. This matches the conditional logic in handleSessionSelect (App.jsx lines 471-479) which also has project-matching logic for sidebar management.
files_changed: ["/workspace/projects/claudecodeui/src/components/Sidebar.jsx"]
