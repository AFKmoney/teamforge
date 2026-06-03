# Task 4 — Data Export Agent

## Summary
Added data export functionality (CSV and JSON) to 4 panels: Agents, Memory, Benchmarks, and Safety.

## Files Created
- `/home/z/my-project/src/lib/export-utils.ts` — Reusable export utility with `exportToCSV()` and `exportToJSON()` functions

## Files Modified
- `/home/z/my-project/src/components/agents-panel.tsx` — Added Export dropdown next to "Create Agent" button
- `/home/z/my-project/src/components/memory-panel.tsx` — Added Export dropdown next to "Add Memory" button
- `/home/z/my-project/src/components/benchmarks-panel.tsx` — Added Export dropdown in header area
- `/home/z/my-project/src/components/safety-panel.tsx` — Added Export dropdown in header area next to status badge

## Key Details
- Export utility creates Blob → object URL → anchor click download → URL revocation
- CSV export: proper header row, escaping for commas/quotes/newlines, human-readable column names
- JSON export: 2-space indent, camelCase keys, full data including nested objects
- All export buttons use consistent UI pattern: `DropdownMenu` with `Download` icon trigger, `FileSpreadsheet` for CSV, `FileJson` for JSON
- Export respects current filters (filteredAgents, filtered benchmarks, parsedMemories)
- Lint passes clean
