'use client'

import { useAppStore } from '@/lib/store'
import { AGENT_ROLE_CONFIG, AGENT_STATUS_CONFIG, type AgentRole, type AgentStatus, TASK_PRIORITY_CONFIG, TASK_TYPE_CONFIG, type Project } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Play, Square, Plus, Sun, Moon, Zap, ChevronDown, Pause, Loader2, Hammer, TestTube2, Rocket, Sparkles, Activity, Settings, FolderOpen, Download, Upload, SaveAll } from 'lucide-react'
import { NotificationBell } from '@/components/notification-panel'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { toast } from 'sonner'

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
  const setSelectedAgentId = useAppStore((s) => s.setSelectedAgentId)

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
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => setSelectedAgentId(agent.id)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs cursor-pointer select-none transition-colors relative',
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
            <span className={cn('size-2 rounded-full shrink-0', statusConfig.dotColor, isActive && 'animate-breathing')} />
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

// Task template definitions
const TASK_TEMPLATES: { id: string; label: string; icon: string; title: string; description: string; priority: string; type: string }[] = [
  { id: 'bug-report', label: 'Bug Report', icon: '🐛', title: 'Bug: ', description: '## Steps to Reproduce\n1. \n2. \n3. \n\n## Expected Behavior\n\n\n## Actual Behavior\n\n\n## Environment\n- Browser/OS:\n- Version:', priority: 'high', type: 'bugfix' },
  { id: 'feature-request', label: 'Feature Request', icon: '✨', title: 'Feature: ', description: '## Problem Statement\n\n\n## Proposed Solution\n\n\n## Acceptance Criteria\n- [ ] \n- [ ] \n\n## Technical Notes\n', priority: 'medium', type: 'feature' },
  { id: 'code-review', label: 'Code Review', icon: '🔍', title: 'Review: ', description: '## Files to Review\n- \n\n## Focus Areas\n- Code quality\n- Performance\n- Security\n- Test coverage\n\n## Questions/Concerns\n', priority: 'medium', type: 'refactor' },
  { id: 'test-case', label: 'Test Case', icon: '🧪', title: 'Test: ', description: '## Test Type\nUnit / Integration / E2E\n\n## What to Test\n\n\n## Test Steps\n1. Arrange: \n2. Act: \n3. Assert: \n\n## Edge Cases\n- \n- ', priority: 'medium', type: 'test' },
  { id: 'deployment', label: 'Deployment', icon: '🚀', title: 'Deploy: ', description: '## Target Environment\nProduction / Staging / Development\n\n## Deployment Checklist\n- [ ] All tests passing\n- [ ] Database migrations ready\n- [ ] Environment variables configured\n- [ ] Rollback plan documented\n\n## Changes Included\n- \n- ', priority: 'high', type: 'infra' },
  { id: 'documentation', label: 'Documentation', icon: '📝', title: 'Docs: ', description: '## Document Type\nAPI Reference / Guide / Tutorial / README\n\n## Target Audience\n\n\n## Content Outline\n1. \n2. \n3. \n\n## Related Resources\n- ', priority: 'low', type: 'docs' },
]

function NewTaskDialog() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [type, setType] = useState('feature')
  const [assigneeId, setAssigneeId] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [open, setOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const currentProject = useAppStore((s) => s.currentProject)
  const agents = useAppStore((s) => s.agents)
  const fetchTasks = useAppStore((s) => s.fetchTasks)

  const handleTemplateSelect = useCallback((templateId: string) => {
    const template = TASK_TEMPLATES.find(t => t.id === templateId)
    if (template) {
      setTitle(template.title)
      setDescription(template.description)
      setPriority(template.priority)
      setType(template.type)
      setSelectedTemplate(templateId)
    }
  }, [])

  const handleCreate = async () => {
    if (!title.trim()) return
    setIsCreating(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject?.id || '',
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
        setSelectedTemplate(null)
        setOpen(false)
      }
    } catch (e) {
      console.error('Failed to create task:', e)
    } finally {
      setIsCreating(false)
    }
  }

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setTitle('')
      setDescription('')
      setPriority('medium')
      setType('feature')
      setAssigneeId('')
      setSelectedTemplate(null)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs px-2.5">
          <Plus className="size-3" />
          <span className="hidden md:inline">New Task</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="size-4 text-emerald-500" />
            Create New Task
          </DialogTitle>
          <DialogDescription>Create a new task for the project. Use a template or start from scratch.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {/* Template selector */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">From Template</Label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => {
                  setSelectedTemplate(null)
                  setTitle('')
                  setDescription('')
                  setPriority('medium')
                  setType('feature')
                }}
                className={cn(
                  'px-2 py-1 rounded-md text-[11px] border transition-colors',
                  !selectedTemplate
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50',
                )}
              >
                ✏️ Blank
              </button>
              {TASK_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template.id)}
                  className={cn(
                    'px-2 py-1 rounded-md text-[11px] border transition-colors',
                    selectedTemplate === template.id
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50',
                  )}
                >
                  {template.icon} {template.label}
                </button>
              ))}
            </div>
          </div>

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
  const fetchBuildLogs = useAppStore((s) => s.fetchBuildLogs)
  const setActiveBottomTab = useAppStore((s) => s.setActiveBottomTab)
  const setBottomPanelOpen = useAppStore((s) => s.setBottomPanelOpen)
  const setIsRunning = useAppStore((s) => s.setIsRunning)
  const isRunning = useAppStore((s) => s.isRunning)

  const runAction = useCallback(async (type: 'build' | 'test' | 'lint' | 'deploy') => {
    setIsRunning(true)
    setBottomPanelOpen(true)
    setActiveBottomTab('terminal')

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
        await fetchBuildLogs()
      }
    } catch (e) {
      console.error(`Failed to run ${type}:`, e)
    } finally {
      setIsRunning(false)
    }
  }, [currentProject, addBuildLog, fetchBuildLogs, setActiveBottomTab, setBottomPanelOpen, setIsRunning])

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
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen)
  const updateAgent = useAppStore((s) => s.updateAgent)
  const fetchAgents = useAppStore((s) => s.fetchAgents)
  const addBuildLog = useAppStore((s) => s.addBuildLog)
  const setActiveBottomTab = useAppStore((s) => s.setActiveBottomTab)
  const setBottomPanelOpen = useAppStore((s) => s.setBottomPanelOpen)
  const setIsRunning = useAppStore((s) => s.setIsRunning)
  const saveAllFiles = useAppStore((s) => s.saveAllFiles)
  const fetchFiles = useAppStore((s) => s.fetchFiles)
  const fetchTasks = useAppStore((s) => s.fetchTasks)
  const fetchBuildLogs = useAppStore((s) => s.fetchBuildLogs)
  const unsavedFileIds = useAppStore((s) => s.unsavedFileIds)
  const setCurrentProject = useAppStore((s) => s.setCurrentProject)
  const fetchAll = useAppStore((s) => s.fetchAll)
  const currentProjectId = currentProject?.id || ''
  const { theme, setTheme } = useTheme()
  const importInputRef = useRef<HTMLInputElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isSavingProject, setIsSavingProject] = useState(false)

  // Export project as ZIP
  const handleExport = useCallback(async () => {
    if (!currentProject) {
      toast.error('No project selected')
      return
    }
    setIsExporting(true)
    try {
      const res = await fetch(`/api/projects/${currentProject.id}/export`)
      if (!res.ok) {
        throw new Error('Export failed')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const contentDisposition = res.headers.get('Content-Disposition')
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `${currentProject.name}.zip`
      link.download = filename || `${currentProject.name}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success(`Exported "${currentProject.name}" as ZIP`)
    } catch {
      toast.error('Failed to export project')
    } finally {
      setIsExporting(false)
    }
  }, [currentProject])

  // Import project from ZIP/JSON
  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentProject) return
    setIsImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', currentProject.id)

      const res = await fetch('/api/projects/import', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Import failed')
      }
      const data = await res.json()
      await fetchFiles()
      toast.success(`Imported ${data.created} file${data.created !== 1 ? 's' : ''}${data.skipped > 0 ? ` (${data.skipped} skipped)` : ''}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to import project')
    } finally {
      setIsImporting(false)
      if (importInputRef.current) importInputRef.current.value = ''
    }
  }, [currentProject, fetchFiles])

  // Save Project: save all unsaved files
  const handleSaveProject = useCallback(async () => {
    if (!currentProject) {
      toast.error('No project selected')
      return
    }
    setIsSavingProject(true)
    try {
      const { saved, failed } = await saveAllFiles()
      if (failed > 0) {
        toast.error(`Saved ${saved} file${saved !== 1 ? 's' : ''}, failed ${failed}`)
      } else if (saved > 0) {
        toast.success(`Project saved (${saved} file${saved !== 1 ? 's' : ''})`)
      } else {
        toast.info('Project is already up to date')
      }
    } catch {
      toast.error('Failed to save project')
    } finally {
      setIsSavingProject(false)
    }
  }, [currentProject, saveAllFiles])

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

  const hasActiveAgents = activeAgents.length > 0

  // Play all idle agents - trigger scheduler to auto-assign and start
  const handlePlayAll = useCallback(async () => {
    const idleOrSleepingAgents = agents.filter((a) => a.status === 'idle' || a.status === 'sleeping')
    if (idleOrSleepingAgents.length === 0) {
      toast.info('All agents are already active')
      return
    }
    toast.loading(`Starting ${idleOrSleepingAgents.length} agent${idleOrSleepingAgents.length > 1 ? 's' : ''}...`, { id: 'play-all' })
    try {
      const res = await fetch('/api/agent-scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'play', projectId: currentProject?.id }),
      })
      if (res.ok) {
        const data = await res.json()
        await fetchAgents()
        toast.dismiss('play-all')
        toast.success(`${data.started || idleOrSleepingAgents.length} agent${(data.started || idleOrSleepingAgents.length) > 1 ? 's' : ''} started${data.assigned ? `, ${data.assigned} tasks assigned` : ''}`)
      } else {
        toast.dismiss('play-all')
        toast.error('Failed to start agents')
      }
    } catch {
      toast.dismiss('play-all')
      toast.error('Failed to start agents')
    }
  }, [agents, fetchAgents, currentProject])

  // Stop all active agents - revert tasks to todo, set agents to idle
  const handleStopAll = useCallback(async () => {
    const activeAgentsList = agents.filter((a) => a.status !== 'idle' && a.status !== 'sleeping')
    if (activeAgentsList.length === 0) {
      toast.info('No active agents to stop')
      return
    }
    toast.loading(`Stopping ${activeAgentsList.length} agent${activeAgentsList.length > 1 ? 's' : ''}...`, { id: 'stop-all' })
    try {
      const res = await fetch('/api/agent-scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop', projectId: currentProject?.id }),
      })
      if (res.ok) {
        const data = await res.json()
        await fetchAgents()
        await fetchTasks()
        toast.dismiss('stop-all')
        toast.success(`${data.stopped || activeAgentsList.length} agent${(data.stopped || activeAgentsList.length) > 1 ? 's' : ''} stopped${data.revertedTasks ? `, ${data.revertedTasks} tasks reverted` : ''}`)
      } else {
        toast.dismiss('stop-all')
        toast.error('Failed to stop agents')
      }
    } catch {
      toast.dismiss('stop-all')
      toast.error('Failed to stop agents')
    }
  }, [agents, fetchAgents, fetchTasks, currentProject])

  // Pause all active agents - set to 'sleeping'
  const handlePauseAll = useCallback(async () => {
    const activeAgentsList = agents.filter((a) => a.status !== 'sleeping')
    if (activeAgentsList.length === 0) {
      toast.info('All agents are already sleeping')
      return
    }
    toast.loading(`Pausing ${activeAgentsList.length} agent${activeAgentsList.length > 1 ? 's' : ''}...`, { id: 'pause-all' })
    try {
      const res = await fetch('/api/agent-scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause', projectId: currentProject?.id }),
      })
      if (res.ok) {
        const data = await res.json()
        await fetchAgents()
        toast.dismiss('pause-all')
        toast.success(`${data.paused || activeAgentsList.length} agent${(data.paused || activeAgentsList.length) > 1 ? 's' : ''} paused`)
      } else {
        toast.dismiss('pause-all')
        toast.error('Failed to pause agents')
      }
    } catch {
      toast.dismiss('pause-all')
      toast.error('Failed to pause agents')
    }
  }, [agents, fetchAgents, currentProject])

  // Run action (shared with RunAllDropdown)
  const runAction = useCallback(async (type: 'build' | 'test' | 'lint' | 'deploy') => {
    setIsRunning(true)
    setBottomPanelOpen(true)
    setActiveBottomTab('terminal')

    toast.loading(`Running ${type}...`, { id: `run-${type}` })

    try {
      const res = await fetch('/api/build-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProjectId,
          type,
        }),
      })
      if (res.ok) {
        const log = await res.json()
        addBuildLog(log)
        await fetchBuildLogs()
        toast.dismiss(`run-${type}`)
        if (log.status === 'success') {
          toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} completed successfully`)
        } else if (log.status === 'failed') {
          toast.error(`${type.charAt(0).toUpperCase() + type.slice(1)} failed`)
        } else if (log.status === 'warning') {
          toast.warning(`${type.charAt(0).toUpperCase() + type.slice(1)} completed with warnings`)
        }
      } else {
        toast.dismiss(`run-${type}`)
        toast.error(`${type.charAt(0).toUpperCase() + type.slice(1)} failed`)
      }
    } catch {
      toast.dismiss(`run-${type}`)
      toast.error(`Failed to run ${type}`)
    } finally {
      setIsRunning(false)
    }
  }, [currentProjectId, addBuildLog, fetchBuildLogs, setActiveBottomTab, setBottomPanelOpen, setIsRunning])

  // Global keyboard shortcuts for build/test/lint/deploy
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault()
            runAction('build')
            break
          case 't':
            e.preventDefault()
            runAction('test')
            break
          case 'l':
            e.preventDefault()
            runAction('lint')
            break
          case 'd':
            e.preventDefault()
            runAction('deploy')
            break
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [runAction])

  // Project selector state
  const [projectSelectorOpen, setProjectSelectorOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [showNewProject, setShowNewProject] = useState(false)

  // Fetch projects when dialog opens
  useEffect(() => {
    if (projectSelectorOpen) {
      fetch('/api/projects')
        .then((res) => res.ok ? res.json() : [])
        .then((data) => setProjects(data))
        .catch(() => {})
    }
  }, [projectSelectorOpen])

  return (
    <div className="flex items-center h-11 px-3 border-b bg-gradient-to-r from-card/95 via-card/90 to-card/95 backdrop-blur-md gap-2 shrink-0 z-20 shadow-sm shadow-black/5 topbar-border-gradient">
      {/* Project name */}
      <div className="flex items-center gap-2.5 min-w-0">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 ring-1 ring-emerald-500/20 shadow-sm shadow-emerald-500/10 cursor-default">
                <Zap className="size-3.5 text-emerald-500" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">TeamForge IDE v1.0.0</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className="flex flex-col min-w-0">
          <span className={cn(
            'font-semibold text-sm text-foreground truncate leading-tight',
            hasActiveAgents && 'text-shimmer-active',
          )}>
            {currentProject?.name || 'TeamForge IDE'}
          </span>
          <span className="text-[9px] text-muted-foreground/60 leading-tight hidden lg:block">Autonomous AI Development</span>
        </div>
        <button onClick={() => setProjectSelectorOpen(true)} className="cursor-pointer hover:text-foreground transition-colors">
          <ChevronDown className="size-3 text-muted-foreground/60 shrink-0" />
        </button>
      </div>

      <div className="h-4 w-px bg-border shrink-0" />

      {/* Running indicator */}
      {isRunning && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-600 dark:text-emerald-400 shadow-sm shadow-emerald-500/10"
        >
          <span className="relative flex size-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
          </span>
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

        {/* Export button */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 h-7 text-xs px-2.5"
                onClick={handleExport}
                disabled={isExporting || !currentProject}
              >
                {isExporting ? (
                  <Loader2 className="size-3 animate-spin text-emerald-500" />
                ) : (
                  <Download className="size-3 text-emerald-500" />
                )}
                <span className="hidden lg:inline">Export</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Export project as ZIP</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Import button */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 h-7 text-xs px-2.5"
                onClick={() => importInputRef.current?.click()}
                disabled={isImporting || !currentProject}
              >
                {isImporting ? (
                  <Loader2 className="size-3 animate-spin text-violet-500" />
                ) : (
                  <Upload className="size-3 text-violet-500" />
                )}
                <span className="hidden lg:inline">Import</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Import project from ZIP/JSON</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <input
          ref={importInputRef}
          type="file"
          accept=".zip,.json"
          className="hidden"
          onChange={handleImport}
        />

        {/* Save All button */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className={cn(
                  'gap-1.5 h-7 text-xs px-2.5',
                  unsavedFileIds.size > 0 && 'border-amber-500/40 text-amber-600 dark:text-amber-400',
                )}
                onClick={handleSaveProject}
                disabled={isSavingProject}
              >
                {isSavingProject ? (
                  <Loader2 className="size-3 animate-spin text-amber-500" />
                ) : (
                  <SaveAll className="size-3" />
                )}
                <span className="hidden md:inline">Save All</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Save All Files (Ctrl+Shift+S)</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <NewTaskDialog />
        <div className="flex items-center gap-0.5 ml-1">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="size-7 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10" onClick={handlePlayAll}>
                  <Play className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Start All Agents</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="size-7 text-red-500 hover:text-red-400 hover:bg-red-500/10" onClick={handleStopAll}>
                  <Square className="size-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Stop All Agents</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="size-7 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10" onClick={handlePauseAll}>
                  <Pause className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Pause All Agents</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="h-4 w-px bg-border mx-0.5" />
        <NotificationBell />
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Settings (Ctrl+,)</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
        </Button>
      </div>

      {/* Project Selector Dialog */}
      <Dialog open={projectSelectorOpen} onOpenChange={(v) => { setProjectSelectorOpen(v); if (!v) setShowNewProject(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="size-4 text-emerald-500" />
              Switch Project
            </DialogTitle>
            <DialogDescription>Select an existing project or create a new one.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* Project list */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              <Label className="text-xs text-muted-foreground">Projects</Label>
              {projects.map((proj) => (
                <button
                  key={proj.id}
                  onClick={async () => {
                    setCurrentProject(proj)
                    setProjectSelectorOpen(false)
                    await fetchAll(proj.id)
                  }}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-2 rounded-md text-xs transition-colors text-left',
                    proj.id === currentProject?.id
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-foreground'
                      : 'hover:bg-muted/50 border border-transparent',
                  )}
                >
                  <FolderOpen className="size-3.5 text-emerald-500/60 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{proj.name}</div>
                    {proj.description && <div className="text-muted-foreground text-[10px] truncate">{proj.description}</div>}
                  </div>
                  {proj.id === currentProject?.id && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 shrink-0">Active</Badge>
                  )}
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 shrink-0">{proj.status}</Badge>
                </button>
              ))}
              {projects.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-3">No projects found</div>
              )}
            </div>

            {/* New project form */}
            {showNewProject ? (
              <div className="space-y-2 p-3 rounded-lg border bg-muted/20">
                <Label className="text-xs font-medium">Create New Project</Label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Project name"
                  className="w-full h-8 rounded-md border bg-transparent px-2.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500/50"
                  autoFocus
                />
                <textarea
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full min-h-[48px] rounded-md border bg-transparent px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none"
                  rows={2}
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={async () => {
                      if (!newProjectName.trim()) return
                      setIsCreatingProject(true)
                      try {
                        const res = await fetch('/api/projects', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ name: newProjectName.trim(), description: newProjectDesc.trim() }),
                        })
                        if (res.ok) {
                          const project = await res.json()
                          setCurrentProject(project)
                          await fetchAll(project.id)
                          setNewProjectName('')
                          setNewProjectDesc('')
                          setShowNewProject(false)
                          setProjectSelectorOpen(false)
                          toast.success(`Created project "${project.name}"`)
                        } else {
                          toast.error('Failed to create project')
                        }
                      } catch {
                        toast.error('Failed to create project')
                      } finally {
                        setIsCreatingProject(false)
                      }
                    }}
                    disabled={!newProjectName.trim() || isCreatingProject}
                    className="gap-1"
                  >
                    {isCreatingProject ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                    Create
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowNewProject(false); setNewProjectName(''); setNewProjectDesc('') }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => setShowNewProject(true)}>
                <Plus className="size-3" />
                New Project
              </Button>
            )}

            {/* Current project info */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
              <span>{agents.length} agents</span>
              <span>{tasks.length} tasks</span>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
