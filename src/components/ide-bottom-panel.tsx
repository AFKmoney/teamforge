'use client'

import { useAppStore } from '@/lib/store'
import { TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG, TASK_TYPE_CONFIG, type IDEBottomTab, type Task, type BuildLog } from '@/lib/types'
import { IDETaskCard } from '@/components/ide-task-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Terminal,
  LayoutGrid,
  Hammer,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  PanelTopClose,
  PanelTopOpen,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'

const BOTTOM_TABS: { id: IDEBottomTab; label: string; icon: React.ReactNode }[] = [
  { id: 'terminal', label: 'Terminal', icon: <Terminal className="size-3.5" /> },
  { id: 'tasks', label: 'Tasks', icon: <LayoutGrid className="size-3.5" /> },
  { id: 'build', label: 'Build', icon: <Hammer className="size-3.5" /> },
  { id: 'problems', label: 'Problems', icon: <AlertTriangle className="size-3.5" /> },
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
        No terminal output yet
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3 font-mono text-xs space-y-3">
        {buildLogs.map((log) => (
          <div key={log.id} className="space-y-1">
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
              {log.output}
            </pre>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}

function TasksView() {
  const tasks = useAppStore((s) => s.tasks)
  const agents = useAppStore((s) => s.agents)

  const columns: { status: string; label: string; color: string }[] = [
    { status: 'backlog', label: 'Backlog', color: 'border-t-muted-foreground/40' },
    { status: 'todo', label: 'To Do', color: 'border-t-blue-500' },
    { status: 'in_progress', label: 'In Progress', color: 'border-t-amber-500' },
    { status: 'in_review', label: 'In Review', color: 'border-t-violet-500' },
    { status: 'done', label: 'Done', color: 'border-t-emerald-500' },
  ]

  const tasksByStatus = useMemo(() => {
    const map: Record<string, Task[]> = {}
    for (const col of columns) {
      map[col.status] = tasks.filter((t) => t.status === col.status)
    }
    return map
  }, [tasks])

  return (
    <ScrollArea className="h-full">
      <div className="flex gap-3 p-3 min-w-max">
        {columns.map((col) => (
          <div key={col.status} className={cn('w-56 shrink-0 rounded-md border border-t-2 bg-muted/20', col.color)}>
            <div className="px-2.5 py-1.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold text-foreground tracking-wide">{col.label}</span>
              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                {tasksByStatus[col.status]?.length || 0}
              </Badge>
            </div>
            <div className="px-1.5 pb-1.5 space-y-1">
              {(tasksByStatus[col.status] || []).map((task) => (
                <IDETaskCard key={task.id} task={task} agents={agents} />
              ))}
              {(tasksByStatus[col.status]?.length || 0) === 0 && (
                <div className="text-[10px] text-muted-foreground/50 text-center py-4">
                  No tasks
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}

function BuildView() {
  const buildLogs = useAppStore((s) => s.buildLogs)

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-2">
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
            No build history
          </div>
        )}
      </div>
    </ScrollArea>
  )
}

function ProblemsView() {
  const buildLogs = useAppStore((s) => s.buildLogs)

  // Extract problems from build logs
  const problems = useMemo(() => {
    const items: { type: 'error' | 'warning'; message: string; source: string; line?: string }[] = []
    for (const log of buildLogs) {
      if (log.status === 'failed' || log.status === 'warning') {
        const lines = log.output.split('\n')
        for (const line of lines) {
          const errorMatch = line.match(/^(✗|Error|error|ERROR)[:\s]*(.+)/)
          const warnMatch = line.match(/^(⚠|Warning|warning|WARN)[:\s]*(.+)/)
          if (errorMatch) {
            items.push({ type: 'error', message: errorMatch[2] || line, source: log.type })
          } else if (warnMatch) {
            items.push({ type: 'warning', message: warnMatch[2] || line, source: log.type })
          }
        }
        if (items.length === 0 && log.status === 'failed') {
          items.push({ type: 'error', message: log.output.split('\n').slice(0, 2).join(' '), source: log.type })
        }
      }
    }
    return items
  }, [buildLogs])

  return (
    <ScrollArea className="h-full">
      <div className="p-3">
        {problems.length > 0 ? (
          <div className="space-y-1">
            {problems.map((problem, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-start gap-2 px-2 py-1.5 rounded text-xs',
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
                  <span className="text-muted-foreground ml-2">{problem.source}</span>
                </div>
              </div>
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

export function IDEBottomPanel() {
  const activeBottomTab = useAppStore((s) => s.activeBottomTab)
  const setActiveBottomTab = useAppStore((s) => s.setActiveBottomTab)
  const bottomPanelOpen = useAppStore((s) => s.bottomPanelOpen)
  const setBottomPanelOpen = useAppStore((s) => s.setBottomPanelOpen)
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
      default:
        return <TerminalView />
    }
  }

  return (
    <div className="flex flex-col border-t shrink-0 bg-background">
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
              'flex items-center gap-1.5 px-3 h-full text-xs transition-colors border-b-2',
              activeBottomTab === tab.id && bottomPanelOpen
                ? 'text-foreground border-b-emerald-500'
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
            animate={{ height: 220 }}
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
