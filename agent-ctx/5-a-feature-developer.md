# Task 5-a: Add Drag-Drop File Import and Multi-Tab Editor

## Summary
Implemented two key IDE features: drag-and-drop file import to the sidebar and store-based multi-tab editor management.

## Files Modified
1. `src/lib/store.ts` — Added `openFileIds`, `addOpenFile`, `removeOpenFile`, `reorderOpenFiles` state and methods; updated `setActiveFileId` to auto-add to open files
2. `src/components/ide-sidebar.tsx` — Added drag-and-drop handlers, drop zone overlay with Upload icon, file import via FileReader + API
3. `src/components/ide-editor.tsx` — Replaced local `manuallyOpenIds` with store-based tab management, updated all tab operations

## Key Decisions
- Used `dragCounterRef` for reliable drag enter/leave tracking (prevents flicker from nested elements)
- `removeOpenFile` in the store handles switching the active file automatically when the active tab is closed
- `setActiveFileId` automatically adds to `openFileIds` so sidebar clicks always open a tab
- Cross-browser hidden scrollbar CSS for the tab bar

## Verification
- `bun run lint` — 0 errors
- Dev server compiles successfully
