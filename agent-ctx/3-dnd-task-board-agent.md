# Task 3: Add Drag-and-Drop to Task Kanban Board

## Task Description
Add drag-and-drop functionality to the Kanban task board in the bottom panel using @dnd-kit.

## Files Modified
- `/src/components/ide-task-card.tsx` - Added useSortable, GripVertical drag handle, visual drag feedback
- `/src/components/ide-bottom-panel.tsx` - Added DndContext, SortableContext, DragOverlay, KanbanColumn, TaskDragOverlay, useDroppable for empty columns
- `/home/z/my-project/worklog.md` - Updated with task completion record

## Key Implementation Details

### IDETaskCard Changes
- Uses `useSortable` from `@dnd-kit/sortable` with task.id
- `CSS.Transform.toString(transform)` and `transition` applied via style prop
- `GripVertical` icon as drag handle (only handle triggers drag, not card body)
- Visual feedback: `shadow-xl scale-[1.03] ring-2 ring-emerald-500/30` when dragging
- Compact mode also supports drag with opacity and scale effect

### TasksView Changes
- `DndContext` wraps entire board with `closestCorners` collision detection
- `PointerSensor` with 5px distance activation constraint
- Each `KanbanColumn` uses `SortableContext` with `verticalListSortingStrategy`
- `useDroppable` on each column for empty column drop support
- `DragOverlay` shows `TaskDragOverlay` with `shadow-2xl rotate-1`
- Column highlight on drag over: emerald ring + subtle green background
- Empty columns show dashed border "Drop here" zone when dragging over

### Drag Flow
1. `onDragStart` - Sets activeTask state for DragOverlay
2. `onDragOver` - Updates dragOverColumn for visual column highlighting
3. `onDragEnd` - Finds target column, optimistically updates store, calls PATCH API, reverts on failure
4. `onDragCancel` - Resets activeTask and dragOverColumn

## Verification
- `bun run lint` passes with 0 errors
- Dev server compiles successfully
