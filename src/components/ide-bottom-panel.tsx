'use client'

import { useAppStore } from '@/lib/store'
import { TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG, TASK_TYPE_CONFIG, AGENT_ROLE_CONFIG, type IDEBottomTab, type Task, type BuildLog, type TaskStatus, type AgentActivity, type AgentRole } from '@/lib/types'
import { IDETaskCard } from '@/components/ide-task-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
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
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMemo, useCallback, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { AnalyticsDashboard } from '@/components/analytics-dashboard'

const BOTTOM_TABS: { id: IDEBottomTab; label: string; icon: React.ReactNode }[] = [
  { id: 'terminal', label: 'Terminal', icon: <Terminal className="size-3.5" /> },
  { id: 'tasks', label: 'Tasks', icon: <LayoutGrid className="size-3.5" /> },
  { id: 'build', label: 'Build', icon: <Hammer className="size-3.5" /> },
  { id: 'problems', label: 'Problems', icon: <AlertTriangle className="size-3.5" /> },
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

function TerminalView() {
  const buildLogs = useAppStore((s) => s.buildLogs)

  if (buildLogs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
        <Terminal className="size-4 mr-2 opacity-40" />
        <span>No terminal output yet. Click Run Build to start.</span>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3 font-mono text-xs space-y-3">
        {buildLogs.map((log) => (
          <div key={log.id} className="space-y-1.5 rounded-md border border-border/30 bg-muted/10 p-2.5">
            <div className="flex items-center gap-2 text-muted-foreground text-[10px]">
              <BuildStatusIcon status={log.status} />
              <BuildTypeBadge type={log.type} />
              <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
            </div>
            <pre className={cn(
              'text-xs leading-relaxed whitespace-pre-wrap',
              log.status === 'success' && 'text-emerald-400',
              log.status === 'failed' && 'text-red-400',
              log.status === 'warning' && 'text-amber-400',
              log.status === 'running' && 'text-blue-400',
              !['success', 'failed', 'warning', 'running'].includes(log.status) && 'text-zinc-400',
            )}>
              <span className="text-muted-foreground/60 select-none">$ </span>{log.output}
            </pre>
          </div>
        ))}
        {/* Terminal prompt */}
        <div className="flex items-center gap-1 text-zinc-400">
          <span className="text-emerald-500 font-bold">~/project</span>
          <span className="text-muted-foreground/60">on</span>
          <span className="text-violet-400">main</span>
          <span className="text-amber-400">❯</span>
          <span className="w-2 h-4 bg-zinc-400 animate-pulse" />
        </div>
      </div>
    </ScrollArea>
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
  isDragOver,
}: {
  status: TaskStatus
  label: string
  color: string
  tasks: Task[]
  agents: import('@/lib/types').Agent[]
  isDragOver: boolean
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
            <IDETaskCard key={task.id} task={task} agents={agents} />
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

  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

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
      map[col.status] = tasks.filter((t) => t.status === col.status)
    }
    return map
  }, [tasks])

  const findColumnByTaskId = useCallback((taskId: string): string | null => {
    for (const col of KANBAN_COLUMNS) {
      if (tasksByStatus[col.status]?.some((t) => t.id === taskId)) {
        return col.status
      }
    }
    return null
  }, [tasksByStatus])

  const findColumnByOverId = useCallback((overId: string): string | null => {
    // Check if overId is a column status directly
    const colStatus = KANBAN_COLUMNS.find((c) => c.status === overId)
    if (colStatus) return colStatus.status
    // Otherwise, find the column that contains the task with this id
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
    if (currentColumn === targetColumn) return // No change needed

    // Optimistically update the store
    updateTask(taskId, { status: targetColumn as TaskStatus })

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetColumn }),
      })
      if (!res.ok) {
        // Revert on failure
        await fetchTasks()
      }
    } catch {
      // Revert on error
      await fetchTasks()
    }
  }, [findColumnByOverId, findColumnByTaskId, updateTask, fetchTasks])

  const handleDragCancel = useCallback(() => {
    setActiveTask(null)
    setDragOverColumn(null)
  }, [])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <ScrollArea className="h-full">
        <div className="flex gap-3 p-3 min-w-max">
          {KANBAN_COLUMNS.map((col) => (
            <KanbanColumn
              key={col.status}
              status={col.status}
              label={col.label}
              color={col.color}
              tasks={tasksByStatus[col.status] || []}
              agents={agents}
              isDragOver={dragOverColumn === col.status}
            />
          ))}
        </div>
      </ScrollArea>
      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <TaskDragOverlay task={activeTask} agents={agents} />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function BuildView() {
  const buildLogs = useAppStore((s) => s.buildLogs)
  const currentProject = useAppStore((s) => s.currentProject)
  const addBuildLog = useAppStore((s) => s.addBuildLog)
  const setActiveBottomTab = useAppStore((s) => s.setActiveBottomTab)
  const [isBuilding, setIsBuilding] = useState(false)

  const handleRunBuild = useCallback(async () => {
    setIsBuilding(true)
    try {
      const res = await fetch('/api/build-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject?.id || 'proj_01',
          output: `$ bun run build\n⠋ Compiling TypeScript...\n⠋ Bundling modules...\n✓ Type checking passed\n✓ Build completed in 1.8s\n✓ Output: .next/static\n\nDone in 2.5s`,
          status: 'success',
          type: 'build',
        }),
      })
      if (res.ok) {
        const log = await res.json()
        addBuildLog(log)
        setActiveBottomTab('terminal')
      }
    } catch (e) {
      console.error('Failed to run build:', e)
    } finally {
      setIsBuilding(false)
    }
  }, [currentProject, addBuildLog, setActiveBottomTab])

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-2">
        {/* Run Build button */}
        <div className="flex items-center gap-2 mb-3">
          <Button
            size="sm"
            className="gap-1.5 h-7 text-xs"
            onClick={handleRunBuild}
            disabled={isBuilding}
          >
            {isBuilding ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
            {isBuilding ? 'Building...' : 'Run Build'}
          </Button>
          {isBuilding && (
            <span className="flex items-center gap-1.5 text-[10px] text-amber-500">
              <span className="size-1.5 rounded-full bg-amber-500 pulse-dot" />
              Running
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

export function IDEBottomPanel() {
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
      case 'analytics':
        return <AnalyticsDashboard />
      case 'activities':
        return <ActivitiesView />
      default:
        return <TerminalView />
    }
  }

  return (
    <div className="flex flex-col border-t shrink-0 bg-gradient-to-b from-card/80 to-card/60">
      {/* Resize handle */}
      <div
        ref={resizeRef}
        className={cn(
          'h-1.5 cursor-row-resize hover:bg-emerald-500/30 transition-colors -mt-0.5 relative z-10 group',
          isResizing && 'bg-emerald-500/40',
        )}
        onMouseDown={handleMouseDown}
      >
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-8 h-0.5 rounded-full bg-muted-foreground/30" />
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
