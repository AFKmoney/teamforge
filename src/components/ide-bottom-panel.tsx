'use client'

import { useAppStore } from '@/lib/store'
import { TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG, TASK_TYPE_CONFIG, AGENT_ROLE_CONFIG, type IDEBottomTab, type Task, type BuildLog, type TaskStatus, type TaskPriority, type TaskType, type AgentActivity, type AgentRole, type GitCommit } from '@/lib/types'
import { IDETaskCard } from '@/components/ide-task-card'
import { TaskFilterBar, applyTaskFilters, applyTaskSort, type TaskFilters, type TaskSort } from '@/components/task-filter-bar'
import { TaskDetailPanel } from '@/components/task-detail-panel'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  Terminal,
  LayoutGrid,
  Hammer,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  PanelTopClose,
  PanelTopOpen,
  Play,
  ChevronRight,
  BarChart3,
  GripVertical,
  Activity,
  FileCode2,
  TestTube2,
  Rocket,
  MessageSquare,
  Plus,
  Sparkles,
  GitBranch,
  GitCommit as GitCommitIcon,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMemo, useCallback, useRef, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { AnalyticsDashboard } from '@/components/analytics-dashboard'

const BOTTOM_TABS: { id: IDEBottomTab; label: string; icon: React.ReactNode }[] = [
  { id: 'terminal', label: 'Terminal', icon: <Terminal className="size-3.5" /> },
  { id: 'tasks', label: 'Tasks', icon: <LayoutGrid className="size-3.5" /> },
  { id: 'build', label: 'Build', icon: <Hammer className="size-3.5" /> },
  { id: 'problems', label: 'Problems', icon: <AlertTriangle className="size-3.5" /> },
  { id: 'git', label: 'Git', icon: <GitBranch className="size-3.5" /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="size-3.5" /> },
  { id: 'activities', label: 'Activities', icon: <Activity className="size-3.5" /> },
]

function BuildStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'success':
      return <CheckCircle2 className="size-3.5 text-emerald-500" />
    case 'failed':
      return <XCircle className="size-3.5 text-red-500" />
    case 'warning':
      return <AlertCircle className="size-3.5 text-amber-500" />
    case 'running':
      return <Loader2 className="size-3.5 text-blue-500 animate-spin" />
    default:
      return <AlertCircle className="size-3.5 text-muted-foreground" />
  }
}

function BuildTypeBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; color: string }> = {
    build: { label: 'Build', color: 'text-blue-600 dark:text-blue-400' },
    test: { label: 'Test', color: 'text-amber-600 dark:text-amber-400' },
    lint: { label: 'Lint', color: 'text-violet-600 dark:text-violet-400' },
    deploy: { label: 'Deploy', color: 'text-orange-600 dark:text-orange-400' },
  }
  const c = config[type] || { label: type, color: 'text-muted-foreground' }
  return <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-4', c.color)}>{c.label}</Badge>
}

interface TerminalLine {
  id: string
  type: 'input' | 'output' | 'error' | 'system' | 'build'
  content: string
  timestamp: string
  buildInfo?: { status: string; type: string }
}

const HELP_TEXT = `Available commands:
  help          Show this help message
  clear         Clear terminal output
  ls            List files in current directory
  pwd           Print working directory
  echo <text>   Print text
  cat <file>    Show file contents
  whoami        Show current user
  date          Show current date/time
  uptime        Show system uptime
  bun <cmd>     Run bun commands (e.g. bun run lint, bun test)
  npm <cmd>     Run npm commands
  npx <cmd>     Run npx commands
  git <cmd>     Run git commands
  node -e <js>  Run inline JavaScript
  Any command   Execute via shell (30s timeout)`

function TerminalView() {
  const buildLogs = useAppStore((s) => s.buildLogs)
  const [lines, setLines] = useState<TerminalLine[]>([])
  const [inputValue, setInputValue] = useState('')
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isExecuting, setIsExecuting] = useState(false)
  const [cwd, setCwd] = useState('~/project')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const commandHistoryRef = useRef<string[]>([])

  // Keep ref in sync
  commandHistoryRef.current = commandHistory

  // Auto-scroll to bottom on new lines
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines])

  // Load build logs into terminal lines on mount
  useEffect(() => {
    if (buildLogs.length > 0 && lines.length === 0) {
      const initialLines: TerminalLine[] = buildLogs.map((log) => ({
        id: log.id,
        type: 'build' as const,
        content: `$ ${log.type === 'lint' ? 'bun run lint' : log.type === 'build' ? 'next build' : log.type === 'test' ? 'bun test' : 'deploy'}\n${log.output}`,
        timestamp: log.createdAt,
        buildInfo: { status: log.status, type: log.type },
      }))
      setLines(initialLines)
    }
  }, [buildLogs, lines.length])

  const addLine = useCallback((type: TerminalLine['type'], content: string, buildInfo?: { status: string; type: string }) => {
    setLines((prev) => [...prev, {
      id: `line_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      content,
      timestamp: new Date().toISOString(),
      buildInfo,
    }])
  }, [])

  const handleCommand = useCallback(async (command: string) => {
    const trimmed = command.trim()
    if (!trimmed) return

    // Add to history
    setCommandHistory((prev) => [...prev, trimmed])
    setHistoryIndex(-1)

    // Show the command
    addLine('input', `${cwd} ❯ ${trimmed}`)

    // Handle built-in commands
    if (trimmed === 'clear') {
      setLines([])
      return
    }

    if (trimmed === 'help') {
      addLine('system', HELP_TEXT)
      return
    }

    // Handle simple local commands without API call
    if (trimmed === 'pwd') {
      addLine('output', '/home/z/my-project')
      return
    }

    if (trimmed === 'whoami') {
      addLine('output', 'z')
      return
    }

    if (trimmed === 'date') {
      addLine('output', new Date().toString())
      return
    }

    if (trimmed === 'uptime') {
      addLine('output', `up ${Math.floor(Date.now() / 1000 / 60)} minutes (session)`)
      return
    }

    if (trimmed.startsWith('echo ')) {
      addLine('output', trimmed.slice(5))
      return
    }

    if (trimmed === 'ls' || trimmed.startsWith('ls ')) {
      // Use the execute API for ls
    }

    // Execute via API
    setIsExecuting(true)
    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: trimmed, cwd: '/home/z/my-project' }),
      })

      if (res.ok) {
        const data = await res.json() as { stdout: string; stderr: string; exitCode: number; timedOut: boolean }

        if (data.stdout) {
          addLine('output', data.stdout)
        }
        if (data.stderr) {
          addLine('error', data.stderr)
        }
        if (data.timedOut) {
          addLine('error', '⏱️ Command timed out after 30 seconds')
        }
        if (!data.stdout && !data.stderr && !data.timedOut) {
          addLine('output', '(no output)')
        }

        // Update cwd for cd commands
        if (trimmed.startsWith('cd ')) {
          const target = trimmed.slice(3).trim()
          if (target === '..') {
            setCwd((prev) => {
              const parts = prev.split('/')
              parts.pop()
              return parts.join('/') || '~'
            })
          } else if (target === '~' || target === '/') {
            setCwd('~')
          } else {
            setCwd((prev) => `${prev}/${target}`.replace('//', '/'))
          }
        }
      } else {
        addLine('error', `Failed to execute command (HTTP ${res.status})`)
      }
    } catch (err) {
      addLine('error', `Execution error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsExecuting(false)
    }
  }, [addLine, cwd])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const val = inputValue
      setInputValue('')
      handleCommand(val)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const history = commandHistoryRef.current
      if (history.length === 0) return
      const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1)
      setHistoryIndex(newIndex)
      setInputValue(history[newIndex])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const history = commandHistoryRef.current
      if (historyIndex === -1) return
      const newIndex = historyIndex + 1
      if (newIndex >= history.length) {
        setHistoryIndex(-1)
        setInputValue('')
      } else {
        setHistoryIndex(newIndex)
        setInputValue(history[newIndex])
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      setLines([])
    }
  }, [inputValue, handleCommand, historyIndex])

  const focusInput = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className="flex flex-col h-full" onClick={focusInput}>
      {/* Terminal output area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1"
        style={{ scrollbarWidth: 'thin' }}
      >
        {lines.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
            <Terminal className="size-4 mr-2 opacity-40" />
            <span>Terminal ready. Type a command or</span>
            <button
              onClick={() => handleCommand('bun run build')}
              className="ml-1 text-emerald-500 hover:text-emerald-400 underline underline-offset-2 transition-colors"
            >
              Run Build
            </button>
          </div>
        ) : (
          lines.map((line) => (
            <div key={line.id}>
              {line.type === 'input' && (
                <div className="text-emerald-500/80 whitespace-pre-wrap">{line.content}</div>
              )}
              {line.type === 'output' && (
                <pre className="text-zinc-300 dark:text-zinc-300 whitespace-pre-wrap">{line.content}</pre>
              )}
              {line.type === 'error' && (
                <pre className="text-red-400 whitespace-pre-wrap">{line.content}</pre>
              )}
              {line.type === 'system' && (
                <pre className="text-sky-400 whitespace-pre-wrap">{line.content}</pre>
              )}
              {line.type === 'build' && (
                <div className="space-y-1 rounded-md border border-border/30 bg-muted/10 p-2.5 mb-2">
                  {line.buildInfo && (
                    <div className="flex items-center gap-2 text-muted-foreground text-[10px]">
                      <BuildStatusIcon status={line.buildInfo.status} />
                      <BuildTypeBadge type={line.buildInfo.type} />
                      <span>{new Date(line.timestamp).toLocaleTimeString()}</span>
                    </div>
                  )}
                  <pre className={cn(
                    'text-xs leading-relaxed whitespace-pre-wrap',
                    line.buildInfo?.status === 'success' && 'text-emerald-400',
                    line.buildInfo?.status === 'failed' && 'text-red-400',
                    line.buildInfo?.status === 'warning' && 'text-amber-400',
                    line.buildInfo?.status === 'running' && 'text-blue-400',
                    !line.buildInfo || !['success', 'failed', 'warning', 'running'].includes(line.buildInfo?.status || '') && 'text-zinc-400',
                  )}>
                    {line.content}
                  </pre>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Command input */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-border/40 bg-muted/10">
        <span className="text-emerald-500/80 font-mono text-xs shrink-0 select-none">{cwd} ❯</span>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isExecuting ? 'Running...' : 'Type a command...'}
          disabled={isExecuting}
          className="flex-1 bg-transparent font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground/50 disabled:opacity-50"
          autoFocus
          spellCheck={false}
          autoComplete="off"
        />
        {isExecuting && (
          <Loader2 className="size-3.5 text-emerald-500 animate-spin shrink-0" />
        )}
      </div>
    </div>
  )
}

const KANBAN_COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'backlog', label: 'Backlog', color: 'border-t-muted-foreground/40' },
  { status: 'todo', label: 'To Do', color: 'border-t-blue-500' },
  { status: 'in_progress', label: 'In Progress', color: 'border-t-amber-500' },
  { status: 'in_review', label: 'In Review', color: 'border-t-violet-500' },
  { status: 'done', label: 'Done', color: 'border-t-emerald-500' },
]

function TaskDragOverlay({ task, agents }: { task: Task; agents: import('@/lib/types').Agent[] }) {
  const statusConfig = TASK_STATUS_CONFIG[task.status as keyof typeof TASK_STATUS_CONFIG]
  const priorityConfig = TASK_PRIORITY_CONFIG[task.priority as keyof typeof TASK_PRIORITY_CONFIG]
  const typeConfig = TASK_TYPE_CONFIG[task.type as keyof typeof TASK_TYPE_CONFIG]
  const assignee = task.assigneeId ? agents.find((a) => a.id === task.assigneeId) : null

  const STATUS_BORDER: Record<string, string> = {
    backlog: 'border-l-muted-foreground/40',
    todo: 'border-l-blue-500',
    in_progress: 'border-l-amber-500',
    in_review: 'border-l-violet-500',
    done: 'border-l-emerald-500',
    blocked: 'border-l-red-500',
  }

  return (
    <div className={cn(
      'rounded-md border border-l-3 bg-card p-3 shadow-2xl rotate-1',
      STATUS_BORDER[task.status] || 'border-l-muted-foreground/40',
    )}>
      <div className="flex items-start gap-1.5">
        <GripVertical className="size-3.5 mt-0.5 text-muted-foreground/60 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-foreground leading-snug">{task.title}</span>
            <span className="text-xs shrink-0">{priorityConfig?.icon || '⚪'}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {statusConfig && (
              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-5', statusConfig.color, statusConfig.bgColor)}>
                {statusConfig.label}
              </Badge>
            )}
            {typeConfig && (
              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-5', typeConfig.color)}>
                {typeConfig.label}
              </Badge>
            )}
            {assignee && (
              <span className="text-xs ml-auto">{assignee.avatar}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function KanbanColumn({
  status,
  label,
  color,
  tasks,
  agents,
  allTasks,
  isDragOver,
  selectedTaskIds,
  onTaskSelect,
  onTaskClick,
}: {
  status: TaskStatus
  label: string
  color: string
  tasks: Task[]
  agents: import('@/lib/types').Agent[]
  allTasks: Task[]
  isDragOver: boolean
  selectedTaskIds: Set<string>
  onTaskSelect: (taskId: string, selected: boolean) => void
  onTaskClick: (task: Task) => void
}) {
  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks])
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: status,
    data: { type: 'column', status },
  })

  return (
    <div
      ref={setDroppableRef}
      data-column-status={status}
      className={cn(
        'w-56 shrink-0 rounded-md border border-t-2 bg-muted/20 transition-all',
        color,
        isDragOver && 'ring-2 ring-emerald-500/40 bg-emerald-500/5 border-emerald-500/30',
      )}
    >
      <div className="px-2.5 py-1.5 flex items-center justify-between">
        <span className="text-[10px] font-semibold text-foreground tracking-wide">{label}</span>
        <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
          {tasks.length}
        </Badge>
      </div>
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="px-1.5 pb-1.5 space-y-1 min-h-[3rem]">
          {tasks.map((task) => (
            <IDETaskCard
              key={task.id}
              task={task}
              agents={agents}
              allTasks={allTasks}
              selected={selectedTaskIds.has(task.id)}
              onSelect={onTaskSelect}
              onClick={onTaskClick}
            />
          ))}
          {tasks.length === 0 && (
            <div className={cn(
              'text-[10px] text-center py-4 rounded border border-dashed transition-colors',
              isDragOver
                ? 'text-emerald-500 border-emerald-500/40 bg-emerald-500/5'
                : 'text-muted-foreground/50 border-muted-foreground/20',
            )}>
              {isDragOver ? 'Drop here' : 'No tasks'}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

function TasksView() {
  const tasks = useAppStore((s) => s.tasks)
  const agents = useAppStore((s) => s.agents)
  const updateTask = useAppStore((s) => s.updateTask)
  const fetchTasks = useAppStore((s) => s.fetchTasks)
  const currentProject = useAppStore((s) => s.currentProject)

  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [showNewTaskInput, setShowNewTaskInput] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')

  // Filter & Sort state
  const [filters, setFilters] = useState<TaskFilters>({
    search: '',
    assigneeId: null,
    priorities: [],
    types: [],
    statuses: [],
  })
  const [sort, setSort] = useState<TaskSort>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('teamforge-task-sort')
        if (stored) return JSON.parse(stored) as TaskSort
      } catch { /* ignore */ }
    }
    return { field: 'priority', direction: 'asc' }
  })

  // Persist sort to localStorage
  useEffect(() => {
    try { localStorage.setItem('teamforge-task-sort', JSON.stringify(sort)) } catch { /* ignore */ }
  }, [sort])

  // Multi-select state
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())

  // Task detail panel state
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null)
  const detailTask = useMemo(() => tasks.find((t) => t.id === detailTaskId) || null, [tasks, detailTaskId])

  // Apply filters and sorting
  const filteredTasks = useMemo(() => {
    const filtered = applyTaskFilters(tasks, filters)
    return applyTaskSort(filtered, sort)
  }, [tasks, filters, sort])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  )

  const tasksByStatus = useMemo(() => {
    const map: Record<string, Task[]> = {}
    for (const col of KANBAN_COLUMNS) {
      map[col.status] = filteredTasks.filter((t) => t.status === col.status)
    }
    // Also include tasks with 'blocked' status in a visible way
    const blockedTasks = filteredTasks.filter((t) => t.status === 'blocked')
    if (blockedTasks.length > 0) {
      map['backlog'] = [...(map['backlog'] || []), ...blockedTasks]
    }
    return map
  }, [filteredTasks])

  const findColumnByTaskId = useCallback((taskId: string): string | null => {
    for (const col of KANBAN_COLUMNS) {
      if (tasksByStatus[col.status]?.some((t) => t.id === taskId)) {
        return col.status
      }
    }
    return null
  }, [tasksByStatus])

  const findColumnByOverId = useCallback((overId: string): string | null => {
    const colStatus = KANBAN_COLUMNS.find((c) => c.status === overId)
    if (colStatus) return colStatus.status
    return findColumnByTaskId(overId)
  }, [findColumnByTaskId])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const task = tasks.find((t) => t.id === active.id)
    if (task) {
      setActiveTask(task)
    }
  }, [tasks])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event
    if (!over) {
      setDragOverColumn(null)
      return
    }
    const targetColumn = findColumnByOverId(String(over.id))
    setDragOverColumn(targetColumn)
  }, [findColumnByOverId])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)
    setDragOverColumn(null)

    if (!over || !active) return

    const taskId = String(active.id)
    const targetColumn = findColumnByOverId(String(over.id))

    if (!targetColumn) return

    const currentColumn = findColumnByTaskId(taskId)
    if (currentColumn === targetColumn) return

    updateTask(taskId, { status: targetColumn as TaskStatus })

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetColumn }),
      })
      if (!res.ok) {
        await fetchTasks()
      }
    } catch {
      await fetchTasks()
    }
  }, [findColumnByOverId, findColumnByTaskId, updateTask, fetchTasks])

  const handleDragCancel = useCallback(() => {
    setActiveTask(null)
    setDragOverColumn(null)
  }, [])

  const handleCreateTask = useCallback(async () => {
    if (!newTaskTitle.trim() || !currentProject?.id) return
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject.id,
          title: newTaskTitle.trim(),
          status: 'backlog',
        }),
      })
      if (res.ok) {
        await fetchTasks()
        setNewTaskTitle('')
        setShowNewTaskInput(false)
      }
    } catch (e) {
      console.error('Failed to create task:', e)
    }
  }, [newTaskTitle, currentProject, fetchTasks])

  // Multi-select handlers
  const handleTaskSelect = useCallback((taskId: string, selected: boolean) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev)
      if (selected) next.add(taskId)
      else next.delete(taskId)
      return next
    })
  }, [])

  const handleTaskClick = useCallback((task: Task) => {
    setDetailTaskId(task.id)
  }, [])

  // Bulk actions
  const handleBulkAction = useCallback(async (action: string, value?: string) => {
    const ids = Array.from(selectedTaskIds)
    if (ids.length === 0) return

    if (action === 'delete') {
      for (const id of ids) {
        try {
          await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
        } catch { /* ignore */ }
      }
      toast.success(`Deleted ${ids.length} task${ids.length > 1 ? 's' : ''}`)
      setSelectedTaskIds(new Set())
      await fetchTasks()
      return
    }

    const updates: Record<string, unknown> = {}
    if (action === 'status') updates.status = value
    else if (action === 'priority') updates.priority = value
    else if (action === 'assignee') updates.assigneeId = value || null

    for (const id of ids) {
      try {
        await fetch(`/api/tasks/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })
      } catch { /* ignore */ }
    }

    toast.success(`Updated ${ids.length} task${ids.length > 1 ? 's' : ''}`)
    setSelectedTaskIds(new Set())
    await fetchTasks()
  }, [selectedTaskIds, fetchTasks])

  return (
    <div className="flex h-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex-1 flex flex-col min-w-0">
          {/* Filter/Sort/Export bar */}
          <div className="px-3 pt-2 pb-1 border-b border-border/30">
            <TaskFilterBar
              filters={filters}
              onFiltersChange={setFilters}
              sort={sort}
              onSortChange={setSort}
              agents={agents}
              tasks={filteredTasks}
              selectedTaskIds={selectedTaskIds}
              onBulkAction={handleBulkAction}
            />
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3">
              {/* Add task row */}
              <div className="flex items-center gap-2 mb-3">
                {showNewTaskInput ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newTaskTitle.trim()) handleCreateTask()
                        if (e.key === 'Escape') { setShowNewTaskInput(false); setNewTaskTitle('') }
                      }}
                      placeholder="Task title..."
                      className="flex-1 h-7 rounded-md border bg-transparent px-3 text-xs outline-none focus:ring-1 focus:ring-emerald-500/50"
                      autoFocus
                    />
                    <Button size="sm" className="h-7 text-xs gap-1" onClick={handleCreateTask} disabled={!newTaskTitle.trim()}>
                      <Plus className="size-3" /> Add
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setShowNewTaskInput(false); setNewTaskTitle('') }}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => setShowNewTaskInput(true)}>
                    <Plus className="size-3" /> Add Task
                  </Button>
                )}
              </div>
              <div className="flex gap-3 min-w-max">
              {KANBAN_COLUMNS.map((col) => (
                <KanbanColumn
                  key={col.status}
                  status={col.status}
                  label={col.label}
                  color={col.color}
                  tasks={tasksByStatus[col.status] || []}
                  agents={agents}
                  allTasks={tasks}
                  isDragOver={dragOverColumn === col.status}
                  selectedTaskIds={selectedTaskIds}
                  onTaskSelect={handleTaskSelect}
                  onTaskClick={handleTaskClick}
                />
              ))}
              </div>
            </div>
          </ScrollArea>
          <DragOverlay dropAnimation={null}>
            {activeTask ? (
              <TaskDragOverlay task={activeTask} agents={agents} />
            ) : null}
          </DragOverlay>
        </div>

        {/* Task detail side panel */}
        {detailTask && (
          <div className="w-80 shrink-0 border-l border-border/40">
            <TaskDetailPanel
              task={detailTask}
              agents={agents}
              allTasks={tasks}
              onClose={() => setDetailTaskId(null)}
              onUpdate={updateTask}
              onRefresh={fetchTasks}
            />
          </div>
        )}
      </DndContext>
    </div>
  )
}

function BuildView() {
  const buildLogs = useAppStore((s) => s.buildLogs)
  const currentProject = useAppStore((s) => s.currentProject)
  const addBuildLog = useAppStore((s) => s.addBuildLog)
  const fetchBuildLogs = useAppStore((s) => s.fetchBuildLogs)
  const setActiveBottomTab = useAppStore((s) => s.setActiveBottomTab)
  const [isBuilding, setIsBuilding] = useState<string | null>(null)

  const handleRunAction = useCallback(async (type: 'build' | 'test' | 'lint' | 'deploy') => {
    setIsBuilding(type)
    try {
      const res = await fetch('/api/build-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject?.id || '',
          type,
        }),
      })
      if (res.ok) {
        const log = await res.json()
        addBuildLog(log)
        // Fetch the updated log (the initial one is "running", we need the final result)
        await fetchBuildLogs()
        setActiveBottomTab('terminal')
      }
    } catch (e) {
      console.error(`Failed to run ${type}:`, e)
    } finally {
      setIsBuilding(null)
    }
  }, [currentProject, addBuildLog, fetchBuildLogs, setActiveBottomTab])

  const handleRunBuild = useCallback(() => handleRunAction('build'), [handleRunAction])
  const handleRunLint = useCallback(() => handleRunAction('lint'), [handleRunAction])
  const handleRunTest = useCallback(() => handleRunAction('test'), [handleRunAction])
  const handleRunDeploy = useCallback(() => handleRunAction('deploy'), [handleRunAction])

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-2">
        {/* Action buttons */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Button
            size="sm"
            className="gap-1.5 h-7 text-xs"
            onClick={handleRunLint}
            disabled={isBuilding !== null}
          >
            {isBuilding === 'lint' ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
            {isBuilding === 'lint' ? 'Linting...' : 'Lint'}
          </Button>
          <Button
            size="sm"
            className="gap-1.5 h-7 text-xs"
            onClick={handleRunBuild}
            disabled={isBuilding !== null}
          >
            {isBuilding === 'build' ? <Loader2 className="size-3 animate-spin" /> : <Hammer className="size-3" />}
            {isBuilding === 'build' ? 'Building...' : 'Build'}
          </Button>
          <Button
            size="sm"
            className="gap-1.5 h-7 text-xs"
            onClick={handleRunTest}
            disabled={isBuilding !== null}
          >
            {isBuilding === 'test' ? <Loader2 className="size-3 animate-spin" /> : <TestTube2 className="size-3" />}
            {isBuilding === 'test' ? 'Testing...' : 'Test'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 h-7 text-xs"
            onClick={handleRunDeploy}
            disabled={isBuilding !== null}
          >
            {isBuilding === 'deploy' ? <Loader2 className="size-3 animate-spin" /> : <Rocket className="size-3" />}
            {isBuilding === 'deploy' ? 'Deploying...' : 'Deploy'}
          </Button>
          {isBuilding && (
            <span className="flex items-center gap-1.5 text-[10px] text-amber-500">
              <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
              Running {isBuilding}...
            </span>
          )}
          {!isBuilding && (
            <span className="text-[10px] text-muted-foreground">
              {buildLogs.length} build{buildLogs.length !== 1 ? 's' : ''} recorded
            </span>
          )}
        </div>

        {buildLogs.map((log) => (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md border transition-colors',
              'hover:bg-muted/30',
              log.status === 'success' && 'border-l-2 border-l-emerald-500',
              log.status === 'failed' && 'border-l-2 border-l-red-500',
              log.status === 'warning' && 'border-l-2 border-l-amber-500',
              log.status === 'running' && 'border-l-2 border-l-blue-500',
            )}
          >
            <BuildStatusIcon status={log.status} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <BuildTypeBadge type={log.type} />
                <Badge variant="outline" className={cn(
                  'text-[10px] px-1.5 py-0 h-4',
                  log.status === 'success' && 'text-emerald-600 dark:text-emerald-400',
                  log.status === 'failed' && 'text-red-600 dark:text-red-400',
                  log.status === 'warning' && 'text-amber-600 dark:text-amber-400',
                  log.status === 'running' && 'text-blue-600 dark:text-blue-400',
                )}>
                  {log.status}
                </Badge>
                <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                  {new Date(log.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs text-foreground/80 truncate mt-0.5">{log.output.split('\n')[0]}</p>
            </div>
          </motion.div>
        ))}
        {buildLogs.length === 0 && (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
            <Hammer className="size-4 mr-2 opacity-40" />
            No build history. Click Run Build to start.
          </div>
        )}
      </div>
    </ScrollArea>
  )
}

function ProblemsView() {
  const buildLogs = useAppStore((s) => s.buildLogs)
  const files = useAppStore((s) => s.files)
  const setActiveFileId = useAppStore((s) => s.setActiveFileId)
  const setBottomPanelOpen = useAppStore((s) => s.setBottomPanelOpen)

  // Extract problems from build logs
  const problems = useMemo(() => {
    const items: { type: 'error' | 'warning'; message: string; source: string; line?: string; filePath?: string }[] = []
    for (const log of buildLogs) {
      if (log.status === 'failed' || log.status === 'warning') {
        const logLines = log.output.split('\n')
        for (const line of logLines) {
          const errorMatch = line.match(/^(✗|Error|error|ERROR)[:\s]*(.+)/)
          const warnMatch = line.match(/^(⚠|Warning|warning|WARN)[:\s]*(.+)/)
          // Try to extract file path from error line
          const fileMatch = line.match(/(?:^|\s)((?:\/)?[\w/.-]+\.\w+)(?::(\d+))?(?::(\d+))?/)

          if (errorMatch) {
            items.push({
              type: 'error',
              message: errorMatch[2] || line,
              source: log.type,
              line: fileMatch?.[2],
              filePath: fileMatch?.[1],
            })
          } else if (warnMatch) {
            items.push({
              type: 'warning',
              message: warnMatch[2] || line,
              source: log.type,
              line: fileMatch?.[2],
              filePath: fileMatch?.[1],
            })
          }
        }
        if (items.length === 0 && log.status === 'failed') {
          items.push({ type: 'error', message: log.output.split('\n').slice(0, 2).join(' '), source: log.type })
        }
      }
    }
    return items
  }, [buildLogs])

  const handleProblemClick = (problem: { filePath?: string }) => {
    if (problem.filePath) {
      // Find the file in our file list
      const file = files.find((f) => f.path.includes(problem.filePath || '') || f.path.endsWith(problem.filePath || ''))
      if (file) {
        setActiveFileId(file.id)
        setBottomPanelOpen(false)
      }
    }
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3">
        {problems.length > 0 ? (
          <div className="space-y-1">
            {problems.map((problem, i) => (
              <button
                key={i}
                onClick={() => handleProblemClick(problem)}
                className={cn(
                  'flex items-start gap-2 px-2 py-1.5 rounded text-xs w-full text-left transition-colors hover:bg-muted/50',
                  problem.type === 'error' && 'text-red-500',
                  problem.type === 'warning' && 'text-amber-500',
                )}
              >
                {problem.type === 'error' ? (
                  <XCircle className="size-3.5 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-foreground/90">{problem.message}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-muted-foreground">{problem.source}</span>
                    {problem.filePath && (
                      <span className="text-muted-foreground/60 truncate">{problem.filePath}{problem.line ? `:${problem.line}` : ''}</span>
                    )}
                  </div>
                </div>
                {problem.filePath && (
                  <ChevronRight className="size-3 text-muted-foreground/30 shrink-0 mt-0.5" />
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
            <CheckCircle2 className="size-4 mr-2 text-emerald-500" />
            No problems detected
          </div>
        )}
      </div>
    </ScrollArea>
  )
}

// Activity type config for bottom panel
const ACTIVITY_TYPE_CONFIG_FULL: Record<string, { icon: React.ReactNode; borderColor: string; label: string }> = {
  task_started: { icon: <Play className="size-4 text-emerald-500" />, borderColor: 'border-l-emerald-500', label: 'Task Started' },
  code_written: { icon: <FileCode2 className="size-4 text-blue-500" />, borderColor: 'border-l-blue-500', label: 'Code Written' },
  review_completed: { icon: <CheckCircle2 className="size-4 text-violet-500" />, borderColor: 'border-l-violet-500', label: 'Review Completed' },
  test_run: { icon: <TestTube2 className="size-4 text-amber-500" />, borderColor: 'border-l-amber-500', label: 'Test Run' },
  deploy_triggered: { icon: <Rocket className="size-4 text-orange-500" />, borderColor: 'border-l-orange-500', label: 'Deploy Triggered' },
  message_sent: { icon: <MessageSquare className="size-4 text-pink-500" />, borderColor: 'border-l-pink-500', label: 'Message Sent' },
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function ActivitiesView() {
  const activities = useAppStore((s) => s.activities)

  const sortedActivities = useMemo(() => {
    return [...activities].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [activities])

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-1.5">
        {sortedActivities.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
            <Activity className="size-4 mr-2 opacity-40" />
            No agent activity yet
          </div>
        ) : (
          sortedActivities.map((activity) => {
            const typeConfig = ACTIVITY_TYPE_CONFIG_FULL[activity.action] || {
              icon: <Activity className="size-4 text-muted-foreground" />,
              borderColor: 'border-l-muted-foreground/40',
              label: activity.action,
            }
            const agent = activity.agent
            const roleConfig = agent ? AGENT_ROLE_CONFIG[agent.role as AgentRole] : null

            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  'flex items-start gap-3 px-3 py-2.5 rounded-md border-l-2 transition-colors hover:bg-muted/30',
                  typeConfig.borderColor,
                )}
              >
                <div className="shrink-0 mt-0.5">{typeConfig.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {agent && <span className="text-sm shrink-0">{agent.avatar}</span>}
                    <span className={cn('text-xs font-medium', roleConfig?.color || 'text-foreground/80')}>
                      {agent?.name || 'Agent'}
                    </span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">{typeConfig.label}</Badge>
                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                      {formatRelativeTime(activity.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/80 mt-1">{activity.description}</p>
                </div>
              </motion.div>
            )
          })
        )}
      </div>
    </ScrollArea>
  )
}

function GitLogView() {
  const gitCommits = useAppStore((s) => s.gitCommits)
  const currentBranch = useAppStore((s) => s.currentBranch)
  const branches = useAppStore((s) => s.branches)
  const setCurrentBranch = useAppStore((s) => s.setCurrentBranch)
  const addBranch = useAppStore((s) => s.addBranch)
  const deleteBranch = useAppStore((s) => s.deleteBranch)
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null)

  const filteredCommits = useMemo(() => {
    const branch = selectedBranch || currentBranch
    return gitCommits.filter((c) => {
      if (branch === 'all') return true
      return c.branch === branch
    })
  }, [gitCommits, selectedBranch, currentBranch])

  const allBranches = useMemo(() => {
    return ['all', ...branches.map((b) => b.name)]
  }, [branches])

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        {/* Branch filter */}
        <div className="flex items-center gap-2">
          <GitBranch className="size-3.5 text-emerald-500 shrink-0" />
          <span className="text-xs font-medium text-foreground">Branch:</span>
          <div className="flex items-center gap-1 flex-wrap">
            {allBranches.map((branch) => (
              <button
                key={branch}
                onClick={() => setSelectedBranch(branch === (selectedBranch || currentBranch) ? null : branch)}
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] transition-colors',
                  (branch === (selectedBranch || currentBranch))
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'text-muted-foreground hover:bg-muted/50 border border-transparent',
                  branch === 'all' && 'text-muted-foreground/70',
                )}
              >
                {branch === 'all' ? 'All' : branch}
              </button>
            ))}
          </div>
        </div>

        {/* Commit count */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <GitCommitIcon className="size-3" />
          <span>{filteredCommits.length} commit{filteredCommits.length !== 1 ? 's' : ''}</span>
          {selectedBranch && selectedBranch !== 'all' && (
            <span>on <span className="text-emerald-600 dark:text-emerald-400 font-medium">{selectedBranch}</span></span>
          )}
        </div>

        {/* Commit list */}
        <div className="space-y-1.5">
          {filteredCommits.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
              <GitBranch className="size-4 mr-2 opacity-40" />
              No commits yet
            </div>
          ) : (
            filteredCommits.map((commit) => (
              <motion.div
                key={commit.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  'flex items-start gap-3 px-3 py-2.5 rounded-md border-l-2 transition-colors hover:bg-muted/30',
                  commit.branch === currentBranch ? 'border-l-emerald-500' : 'border-l-muted-foreground/40',
                )}
              >
                <div className="shrink-0 mt-0.5">
                  <GitCommitIcon className={cn(
                    'size-4',
                    commit.branch === currentBranch ? 'text-emerald-500' : 'text-muted-foreground/60',
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground/90 truncate">{commit.message}</span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-mono shrink-0">
                      {commit.id}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <GitBranch className="size-2.5" />
                      {commit.branch}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">
                      {commit.filesChanged} file{commit.filesChanged !== 1 ? 's' : ''}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60 ml-auto shrink-0">
                      {formatRelativeTime(commit.timestamp)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </ScrollArea>
  )
}

export function IDEBottomPanel({ isMobile = false }: { isMobile?: boolean }) {
  const activeBottomTab = useAppStore((s) => s.activeBottomTab)
  const setActiveBottomTab = useAppStore((s) => s.setActiveBottomTab)
  const bottomPanelOpen = useAppStore((s) => s.bottomPanelOpen)
  const setBottomPanelOpen = useAppStore((s) => s.setBottomPanelOpen)
  const bottomPanelHeight = useAppStore((s) => s.bottomPanelHeight)
  const setBottomPanelHeight = useAppStore((s) => s.setBottomPanelHeight)
  const tasks = useAppStore((s) => s.tasks)
  const buildLogs = useAppStore((s) => s.buildLogs)

  const taskCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const t of tasks) {
      counts[t.status] = (counts[t.status] || 0) + 1
    }
    return counts
  }, [tasks])

  const problemCount = useMemo(() => {
    let count = 0
    for (const log of buildLogs) {
      if (log.status === 'failed') count++
      if (log.status === 'warning') count++
    }
    return count
  }, [buildLogs])

  // Resize logic
  const resizeRef = useRef<HTMLDivElement>(null)
  const [isResizing, setIsResizing] = useState(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)

    const startY = e.clientY
    const startHeight = bottomPanelHeight

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = startY - moveEvent.clientY
      setBottomPanelHeight(startHeight + delta)
    }

    const onMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [bottomPanelHeight, setBottomPanelHeight])

  const renderContent = () => {
    switch (activeBottomTab) {
      case 'terminal':
        return <TerminalView />
      case 'tasks':
        return <TasksView />
      case 'build':
        return <BuildView />
      case 'problems':
        return <ProblemsView />
      case 'git':
        return <GitLogView />
      case 'analytics':
        return <AnalyticsDashboard />
      case 'activities':
        return <ActivitiesView />
      default:
        return <TerminalView />
    }
  }

  return (
    <div className="flex flex-col border-t shrink-0 bg-gradient-to-b from-card/80 to-card/60 bottom-panel-gradient">
      {/* Resize handle */}
      <div
        ref={resizeRef}
        className={cn(
          'h-1.5 cursor-row-resize transition-colors -mt-0.5 relative z-10 group resize-handle-dotted',
          isResizing && 'bg-emerald-500/30',
        )}
        onMouseDown={handleMouseDown}
      >
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-8 h-0.5 rounded-full bg-emerald-500/30" />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center h-9 px-1 border-b shrink-0">
        {BOTTOM_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveBottomTab(tab.id)
              if (!bottomPanelOpen) setBottomPanelOpen(true)
            }}
            className={cn(
              'flex items-center gap-1.5 px-3 h-full text-xs transition-colors border-b-2 relative',
              activeBottomTab === tab.id && bottomPanelOpen
                ? 'text-foreground border-b-emerald-500 tab-glow-active'
                : 'text-muted-foreground border-b-transparent hover:text-foreground/80',
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.id === 'tasks' && tasks.length > 0 && (
              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">{tasks.length}</Badge>
            )}
            {tab.id === 'problems' && problemCount > 0 && (
              <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">{problemCount}</Badge>
            )}
            {tab.id === 'terminal' && buildLogs.length > 0 && (
              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">{buildLogs.length}</Badge>
            )}
          </button>
        ))}
        <div className="flex-1" />
        <Button
          size="icon"
          variant="ghost"
          className="size-6 mr-1"
          onClick={() => setBottomPanelOpen(!bottomPanelOpen)}
        >
          {bottomPanelOpen ? (
            <PanelTopClose className="size-3.5 text-muted-foreground" />
          ) : (
            <PanelTopOpen className="size-3.5 text-muted-foreground" />
          )}
        </Button>
      </div>

      {/* Content */}
      <AnimatePresence initial={false}>
        {bottomPanelOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: bottomPanelHeight }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {renderContent()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
