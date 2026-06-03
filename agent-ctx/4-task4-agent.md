# Task 4 - Find & Replace, Go to Line, Global Search

## Agent: Task 4 Agent
## Status: Completed

## Summary
Implemented three core search/navigation features for the TeamForge IDE:
1. **Find & Replace Bar** (Ctrl+F / Ctrl+H) - VS Code-style search bar with regex, case sensitive, whole word toggles, match navigation, and replace functionality
2. **Go to Line** (Ctrl+G) - Quick line navigation dialog
3. **Global Search** (Ctrl+Shift+F) - Search across all project files with results grouped by file

## Files Created
- `src/components/find-replace-bar.tsx`
- `src/components/go-to-line-dialog.tsx`
- `src/components/global-search-panel.tsx`

## Files Modified
- `src/lib/store.ts` - Added search state (findReplaceOpen, findQuery, replaceQuery, findCaseSensitive, findWholeWord, findRegex, findMatches, currentMatchIndex, goToLineOpen, globalSearchOpen, globalSearchQuery)
- `src/components/ide-editor.tsx` - Integrated FindReplaceBar, GoToLineDialog, match highlighting
- `src/app/page.tsx` - Added Ctrl+F/H/G/Shift+F keyboard shortcuts, GlobalSearchPanel
- `src/components/keyboard-shortcuts-overlay.tsx` - Updated shortcuts reference

## Key Design Decisions
- Find & Replace bar appears at top of editor (VS Code style)
- Go to Line dialog is absolute positioned at top-right of editor
- Global Search appears between editor and bottom panel
- Match highlighting uses amber background (lighter for other matches, brighter for current match)
- Scroll-to-line works even when textarea isn't focused (important for go-to-line and find navigation)
- Auto-expand first file group in global search results
- Replace section is toggled via chevron button

## Issues Resolved
- Fixed lint errors: replaced ref-based showReplace toggle with state, removed setState-in-effect patterns
