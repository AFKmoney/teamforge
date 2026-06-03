'use client'

import { useAppStore } from '@/lib/store'
import { AGENT_ROLE_CONFIG, AGENT_STATUS_CONFIG, type AgentRole, type AgentStatus, TASK_PRIORITY_CONFIG, TASK_TYPE_CONFIG } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Play, Square, Plus, Sun, Moon, Zap, ChevronDown, Pause, Loader2, Hammer, TestTube2, Rocket, Sparkles, Activity } from 'lucide-react'
import { NotificationBell } from '@/components/notification-panel'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useState, useCallback, useMemo } from 'react'

// Agent pill color mapping by role
const ROLE_PILL_COLORS: Record<AgentRole, { bg: string; border: string; activeBg: string }> = {
  architect: { bg: 'bg-violet-500/10 border-violet-500/30', border: 'border-violet-500/30', activeBg: 'bg-violet-500/20' },
  developer: { bg: 'bg-emerald-500/10 border-emerald-500/30', border: 'border-emerald-500/30', activeBg: 'bg-emerald-500/20' },
  reviewer: { bg: 'bg-blue-500/10 border-blue-500/30', border: 'border-blue-500/30', activeBg: 'bg-blue-500/20' },
  tester: { bg: 'bg-amber-500/10 border-amber-500/30', border: 'border-amber-500/30', activeBg: 'bg-amber-500/20' },
  devops: { bg: 'bg-orange-500/10 border-orange-500/30', border: 'border-orange-500/30', activeBg: 'bg-orange-500/20' },
  pm: { bg: 'bg-pink-500/10 border-pink-500/30', border: 'border-pink-500/30', activeBg: 'bg-pink-500/20' },
}

function AgentPill({ agent, currentTaskTitle }: { agent: { id: string; name: string; role: AgentRole; status: AgentStatus; avatar: string; currentTaskId: string | null }; currentTaskTitle?: string }) {
  const roleConfig = AGENT_ROLE_CONFIG[agent.role]
  const statusConfig = AGENT_STATUS_CONFIG[agent.status]
  const pillColors = ROLE_PILL_COLORS[agent.role]
  const isActive = agent.status !== 'idle' && agent.status !== 'sleeping'

  // Map role to a glow color
  const glowColorMap: Record<AgentRole, string> = {
    architect: 'rgba(139, 92, 246, 0.4)',
    developer: 'rgba(16, 185, 129, 0.4)',
    reviewer: 'rgba(59, 130, 246, 0.4)',
    tester: 'rgba(245, 158, 11, 0.4)',
    devops: 'rgba(249, 115, 22, 0.4)',
    pm: 'rgba(236, 72, 153, 0.4)',
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.08 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs cursor-default select-none transition-colors relative',
              pillColors.bg,
              isActive && 'ring-1 ring-current/20',
            )}
            style={isActive ? {
              boxShadow: `0 0 8px 1px ${glowColorMap[agent.role]}`,
              animation: 'agent-glow 2.5s ease-in-out infinite',
            } : undefined}
          >
            <span className="text-sm">{agent.avatar}</span>
            <span className={cn('font-medium hidden sm:inline', roleConfig.color)}>{agent.name}</span>
            <span className={cn('size-2 rounded-full shrink-0', statusConfig.dotColor, isActive && 'animate-pulse')} />
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs max-w-[220px]">
          <div className="flex items-center gap-1.5">
            <span>{agent.avatar}</span>
            <span className={roleConfig.color}>{agent.name}</span>
            <span className="text-muted-foreground">·</span>
            <span>{roleConfig.label}</span>
          </div>
          <div className="text-muted-foreground mt-0.5">
            Status: <span className={statusConfig.color}>{statusConfig.label}</span>
          </div>
          {isActive && currentTaskTitle && (
            <div className="mt-1 pt-1 border-t border-border/40 text-muted-foreground">
              Task: <span className="text-foreground font-medium">{currentTaskTitle}</span>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function NewTaskDialog() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [type, setType] = useState('feature')
  const [assigneeId, setAssigneeId] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [open, setOpen] = useState(false)
  const currentProject = useAppStore((s) => s.currentProject)
  const agents = useAppStore((s) => s.agents)
  const fetchTasks = useAppStore((s) => s.fetchTasks)

  const handleCreate = async () => {
    if (!title.trim()) return
    setIsCreating(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject?.id || 'proj_01',
          title: title.trim(),
          description: description.trim(),
          priority,
          type,
          assigneeId: assigneeId || undefined,
          status: 'todo',
        }),
      })
      if (res.ok) {
        await fetchTasks()
        setTitle('')
        setDescription('')
        setPriority('medium')
        setType('feature')
        setAssigneeId('')
        setOpen(false)
      }
    } catch (e) {
      console.error('Failed to create task:', e)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs px-2.5">
          <Plus className="size-3" />
          <span className="hidden md:inline">New Task</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="size-4 text-emerald-500" />
            Create New Task
          </DialogTitle>
          <DialogDescription>Create a new task for the project. Assign it to an agent or let the system auto-assign.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the task in detail..."
              className="w-full min-h-[80px] rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Priority</Label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full h-9 rounded-md border bg-transparent px-3 text-sm outline-none focus:ring-1 focus:ring-emerald-500/50"
              >
                {Object.entries(TASK_PRIORITY_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.icon} {cfg.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full h-9 rounded-md border bg-transparent px-3 text-sm outline-none focus:ring-1 focus:ring-emerald-500/50"
              >
                {Object.entries(TASK_TYPE_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Assign to Agent</Label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setAssigneeId('')}
                className={cn(
                  'px-2 py-1 rounded-md text-[10px] border transition-colors',
                  !assigneeId ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'hover:bg-muted/50',
                )}
              >
                Auto-assign
              </button>
              {agents.map((agent) => {
                const roleConfig = AGENT_ROLE_CONFIG[agent.role]
                return (
                  <button
                    key={agent.id}
                    onClick={() => setAssigneeId(agent.id)}
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded-md text-[10px] border transition-colors',
                      assigneeId === agent.id ? `${roleConfig.bgColor} border-current/30 ${roleConfig.color}` : 'hover:bg-muted/50',
                    )}
                  >
                    <span>{agent.avatar}</span>
                    <span>{agent.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">Cancel</Button>
          </DialogClose>
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={!title.trim() || isCreating}
            className="gap-1.5"
          >
            {isCreating ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Run All dropdown component
function RunAllDropdown() {
  const currentProject = useAppStore((s) => s.currentProject)
  const addBuildLog = useAppStore((s) => s.addBuildLog)
  const setActiveBottomTab = useAppStore((s) => s.setActiveBottomTab)
  const setBottomPanelOpen = useAppStore((s) => s.setBottomPanelOpen)
  const setIsRunning = useAppStore((s) => s.setIsRunning)
  const isRunning = useAppStore((s) => s.isRunning)

  const runAction = useCallback(async (type: 'build' | 'test' | 'lint' | 'deploy') => {
    setIsRunning(true)
    setBottomPanelOpen(true)
    setActiveBottomTab('terminal')

    const outputs: Record<string, { cmd: string; result: string }> = {
      build: {
        cmd: 'bun run build',
        result: '$ bun run build\n⠋ Compiling...\n✓ Compiled successfully in 1.2s\n✓ Build completed\n✓ All checks passed\n\nDone in 2.3s',
      },
      test: {
        cmd: 'bun run test',
        result: '$ bun run test\n⠋ Running test suite...\n✓ 42 tests passed\n✗ 0 tests failed\n✓ Coverage: 87.3%\n\nDone in 4.1s',
      },
      lint: {
        cmd: 'bun run lint',
        result: '$ bun run lint\n⠋ Linting files...\n✓ No errors found\n⚠ 2 warnings\n✓ All files checked\n\nDone in 1.5s',
      },
      deploy: {
        cmd: 'bun run deploy',
        result: '$ bun run deploy\n⠋ Deploying to production...\n✓ Build artifacts uploaded\n✓ CDN cache purged\n✓ Deployment successful\n\nDone in 12.8s',
      },
    }

    const { cmd, result } = outputs[type]

    try {
      const res = await fetch('/api/build-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject?.id || 'proj_01',
          output: result,
          status: type === 'lint' ? 'warning' : 'success',
          type,
        }),
      })
      if (res.ok) {
        const log = await res.json()
        addBuildLog(log)
      }
    } catch (e) {
      console.error(`Failed to run ${type}:`, e)
    } finally {
      setIsRunning(false)
    }
  }, [currentProject, addBuildLog, setActiveBottomTab, setBottomPanelOpen, setIsRunning])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs px-2.5">
          {isRunning ? (
            <Loader2 className="size-3 animate-spin text-emerald-500" />
          ) : (
            <Play className="size-3 text-emerald-500" />
          )}
          <span className="hidden md:inline">Run All</span>
          <ChevronDown className="size-2.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => runAction('build')} className="gap-2 text-xs cursor-pointer">
          <Hammer className="size-3.5 text-blue-500" />
          <span>Build</span>
          <span className="text-muted-foreground ml-auto text-[10px]">Ctrl+Shift+B</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => runAction('test')} className="gap-2 text-xs cursor-pointer">
          <TestTube2 className="size-3.5 text-amber-500" />
          <span>Test</span>
          <span className="text-muted-foreground ml-auto text-[10px]">Ctrl+Shift+T</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => runAction('lint')} className="gap-2 text-xs cursor-pointer">
          <Sparkles className="size-3.5 text-violet-500" />
          <span>Lint</span>
          <span className="text-muted-foreground ml-auto text-[10px]">Ctrl+Shift+L</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => runAction('deploy')} className="gap-2 text-xs cursor-pointer">
          <Rocket className="size-3.5 text-orange-500" />
          <span>Deploy</span>
          <span className="text-muted-foreground ml-auto text-[10px]">Ctrl+Shift+D</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function IDETopBar() {
  const agents = useAppStore((s) => s.agents)
  const tasks = useAppStore((s) => s.tasks)
  const currentProject = useAppStore((s) => s.currentProject)
  const isRunning = useAppStore((s) => s.isRunning)
  const { theme, setTheme } = useTheme()

  const activeAgents = agents.filter((a) => a.status !== 'idle' && a.status !== 'sleeping')

  // Build a map of agentId -> current task title for tooltips
  const agentTaskMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const agent of agents) {
      if (agent.currentTaskId) {
        const task = tasks.find((t) => t.id === agent.currentTaskId)
        if (task) map[agent.id] = task.title
      }
    }
    return map
  }, [agents, tasks])

  return (
    <div className="flex items-center h-11 px-3 border-b bg-gradient-to-r from-card/95 via-card/90 to-card/95 backdrop-blur-md gap-2 shrink-0 z-20 shadow-sm shadow-black/5">
      {/* Project name */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 ring-1 ring-emerald-500/20 shadow-sm shadow-emerald-500/10">
          <Zap className="size-3.5 text-emerald-500" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-sm text-foreground truncate leading-tight">
            {currentProject?.name || 'TeamForge IDE'}
          </span>
          <span className="text-[9px] text-muted-foreground/60 leading-tight hidden lg:block">Autonomous AI Development</span>
        </div>
        <ChevronDown className="size-3 text-muted-foreground/60 shrink-0" />
      </div>

      <div className="h-4 w-px bg-border shrink-0" />

      {/* Running indicator */}
      {isRunning && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-600 dark:text-emerald-400"
        >
          <Activity className="size-3 animate-pulse" />
          <span className="font-medium">Running</span>
        </motion.div>
      )}

      {/* Agent status pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto flex-1 scrollbar-none py-1">
        <AnimatePresence mode="popLayout">
          {agents.map((agent) => (
            <AgentPill key={agent.id} agent={agent} currentTaskTitle={agentTaskMap[agent.id]} />
          ))}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1 shrink-0">
        <RunAllDropdown />
        <NewTaskDialog />
        <div className="flex items-center gap-0.5 ml-1">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="size-7 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10">
                  <Play className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Run Project</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="size-7 text-red-500 hover:text-red-400 hover:bg-red-500/10">
                  <Square className="size-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Stop</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="size-7 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10">
                  <Pause className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Pause</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="h-4 w-px bg-border mx-0.5" />
        <NotificationBell />
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
        </Button>
      </div>
    </div>
  )
}
