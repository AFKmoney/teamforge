# Task ID: 2 - Editor Editable Agent

## Task
Make code editor actually editable with textarea overlay pattern

## Work Summary
- Replaced read-only `<pre><code>` with editable textarea overlay pattern
- Textarea is transparent (text invisible, caret visible) positioned absolutely over syntax-highlighted pre
- On every keystroke: updates file content in Zustand store + marks file as unsaved
- Cursor position (Ln, Col) tracked via `selectionchange` event
- Tab key inserts 2 spaces, Shift+Tab removes indentation
- Enter key auto-indents matching previous line, extra indent after `{`, `(`, `[`, `:`
- Scroll-to-cursor keeps editing position visible during keyboard navigation
- File switching resets textarea content and cursor position
- All existing features preserved: line numbers, syntax highlighting, minimap, tabs, status bar

## Key Files Modified
- `/src/components/ide-editor.tsx` - Complete rewrite of code editor area with textarea overlay
- `/home/z/my-project/worklog.md` - Updated known issues and added work record

## Verification
- `bun run lint` passes with 0 errors
- Dev server compiles successfully
