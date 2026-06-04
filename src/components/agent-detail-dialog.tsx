'use client'

import { useAppStore } from '@/lib/store'
import { AGENT_ROLE_CONFIG, AGENT_STATUS_CONFIG, type AgentRole, type AgentStatus } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import {
  Activity,
  FileCode2,
  Clock,
  Zap,
  CheckCircle2,
  Target,
  Play,
  ToggleLeft,
  Loader2,
  Plus,
  X,
  ChevronDown,
  Check,
  MessageSquare,
  Timer,
  Wrench,
  Sparkles,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMemo, useState, useCallback } from 'react'
import { cn, formatRelativeTime } from '@/lib/utils'
import { toast } from 'sonner'

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-lg bg-muted/30 border border-border/50">
      <div className={cn('size-9 rounded-lg flex items-center justify-center shrink-0', color)}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-bold text-foreground tabular-nums">{value}</div>
        <div className="text-[10px] text-muted-foreground leading-tight">{label}</div>
      </div>
    </div>
  )
}

export function AgentDetailDialog() {
  const selectedAgentId = useAppStore((s) => s.selectedAgentId)
  const setSelectedAgentId = useAppStore((s) => s.setSelectedAgentId)
  const agents = useAppStore((s) => s.agents)
  const tasks = useAppStore((s) => s.tasks)
  const activities = useAppStore((s) => s.activities)
  const files = useAppStore((s) => s.files)
  const updateAgent = useAppStore((s) => s.updateAgent)

  const [isAssigning, setIsAssigning] = useState(false)
  const [assignTaskTitle, setAssignTaskTitle] = useState('')
  const [showAssignTask, setShowAssignTask] = useState(false)
  const [isSettingStatus, setIsSettingStatus] = useState(false)

  const agent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId) || null,
    [agents, selectedAgentId],
  )

  const roleConfig = agent ? AGENT_ROLE_CONFIG[agent.role] : null
  const statusConfig = agent ? AGENT_STATUS_CONFIG[agent.status] : null
  const isActive = agent ? (agent.status !== 'idle' && agent.status !== 'sleeping') : false

  const currentTask = useMemo(
    () => agent?.currentTaskId ? tasks.find((t) => t.id === agent.currentTaskId) : null,
    [agent, tasks],
  )

  const recentActivities = useMemo(
    () => agent
      ? activities
          .filter((a) => a.agentId === agent.id)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10)
      : [],
    [agent, activities],
  )

  const recentFiles = useMemo(
    () => {
      if (!agent) return []
      const agentFileRelatedActivities = activities.filter(
        (a) => a.agentId === agent.id && (a.action === 'file_created' || a.action === 'file_updated' || a.action === 'code_change')
      )
      const relatedPaths = new Set<string>()
      agentFileRelatedActivities.forEach((a) => {
        try {
          const meta = typeof a.metadata === 'string' ? JSON.parse(a.metadata) : a.metadata
          if (meta?.path) relatedPaths.add(meta.path)
          if (meta?.filePath) relatedPaths.add(meta.filePath)
          if (meta?.files && Array.isArray(meta.files)) {
            meta.files.forEach((f: string) => relatedPaths.add(f))
          }
        } catch {
          // ignore parse errors
        }
      })
      const filtered = files
        .filter((f) => !f.isDirectory && relatedPaths.has(f.path))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5)
      return filtered
    },
    [agent, files, activities],
  )

  const assignedTasks = useMemo(
    () => agent
      ? tasks.filter((t) => t.assigneeId === agent.id && t.status !== 'done')
      : [],
    [agent, tasks],
  )

  const totalAssignedTasks = useMemo(
    () => agent ? tasks.filter((t) => t.assigneeId === agent.id).length : 0,
    [agent, tasks],
  )

  const lastActiveDisplay = useMemo(() => {
    if (!agent) return ''
    if (isActive) return 'Now'
    return formatRelativeTime(agent.lastActive || agent.updatedAt)
  }, [agent, isActive])

  const handleSetStatus = useCallback(async (newStatus: AgentStatus) => {
    if (!agent) return
    setIsSettingStatus(true)
    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        updateAgent(agent.id, { status: newStatus })
        toast.success(`${agent.name} status set to ${AGENT_STATUS_CONFIG[newStatus].label}`)
      } else {
        toast.error('Failed to update agent status')
      }
    } catch (e) {
      console.error('Failed to update agent status:', e)
      toast.error('Failed to update agent status')
    } finally {
      setIsSettingStatus(false)
    }
  }, [agent, updateAgent])

  const handleAssignTask = useCallback(async () => {
    if (!agent || !assignTaskTitle.trim()) return
    setIsAssigning(true)
    try {
      const currentProject = useAppStore.getState().currentProject
      const fetchTasks = useAppStore.getState().fetchTasks
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject?.id || '',
          title: assignTaskTitle.trim(),
          assigneeId: agent.id,
          status: 'todo',
          priority: 'medium',
          type: 'feature',
        }),
      })
      if (res.ok) {
        const task = await res.json()
        await fetchTasks()
        const patchBody: Record<string, string> = { currentTaskId: task.id }
        if (agent.status === 'idle' || agent.status === 'sleeping') {
          patchBody.status = 'thinking'
        }
        const agentRes = await fetch(`/api/agents/${agent.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchBody),
        })
        if (agentRes.ok) {
          updateAgent(agent.id, patchBody)
        }
        setAssignTaskTitle('')
        setShowAssignTask(false)
        toast.success(`Task assigned to ${agent.name}`)
      }
    } catch (e) {
      console.error('Failed to assign task:', e)
      toast.error('Failed to assign task')
    } finally {
      setIsAssigning(false)
    }
  }, [agent, assignTaskTitle, updateAgent])

  function getCapabilitiesForRole(role: AgentRole): string[] {
    const capabilities: Record<AgentRole, string[]> = {
      architect: ['System Design', 'API Design', 'Tech Decisions', 'Documentation', 'Code Review', 'Architecture Patterns'],
      developer: ['Code Implementation', 'Bug Fixes', 'Refactoring', 'Feature Development', 'Testing', 'Debugging'],
      reviewer: ['Code Review', 'Quality Assurance', 'Best Practices', 'Security Audit', 'Performance Review', 'Style Guide'],
      tester: ['Unit Tests', 'Integration Tests', 'E2E Tests', 'Performance Tests', 'Edge Cases', 'Test Automation'],
      devops: ['CI/CD', 'Docker', 'Infrastructure', 'Deployment', 'Monitoring', 'Scaling'],
      pm: ['Sprint Planning', 'Task Breakdown', 'Progress Tracking', 'Stakeholder Comm', 'Risk Assessment', 'Prioritization'],
    }
    return capabilities[role] || []
  }

  if (!agent || !roleConfig || !statusConfig) return null

  const successRatePct = Math.round(agent.successRate * 100)

  return (
    <Dialog open={!!selectedAgentId} onOpenChange={(v) => !v && setSelectedAgentId(null)}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-xl max-h-[85vh] flex flex-col p-0 gap-0"
      >
        {/* Scrollable content area */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 pt-5 pb-2">
            {/* Custom close button */}
            <button
              onClick={() => setSelectedAgentId(null)}
              className="absolute top-3 right-3 rounded-xs p-1 text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors z-10"
            >
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </button>

            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 pr-8">
                <div className={cn(
                  'size-12 rounded-xl flex items-center justify-center text-2xl shadow-sm shrink-0',
                  isActive ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 ring-1 ring-emerald-500/20' : 'bg-muted/50',
                )}>
                  {agent.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('text-lg font-bold', roleConfig.color)}>{agent.name}</span>
                    <Badge variant="outline" className={cn('text-[10px] px-2 py-0 h-5 gap-0.5 font-medium', roleConfig.color, roleConfig.bgColor)}>
                      {roleConfig.icon} {roleConfig.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn('size-2 rounded-full shrink-0', statusConfig.dotColor, isActive && 'animate-pulse')} />
                    <span className={cn('text-xs font-medium', statusConfig.color)}>{statusConfig.label}</span>
                    {agent.specialty && (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-xs text-muted-foreground truncate">{agent.specialty}</span>
                      </>
                    )}
                    <span className="text-muted-foreground/40">·</span>
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs text-muted-foreground/60 flex items-center gap-1 cursor-default">
                            <Timer className="size-2.5" />
                            {lastActiveDisplay}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          Last active: {new Date(agent.lastActive || agent.updatedAt).toLocaleString()}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </DialogTitle>
              <DialogDescription className="sr-only">
                View agent details, current task assignment, and recent activity.
              </DialogDescription>
            </DialogHeader>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2 mt-4">
              <StatCard label="Tasks Done" value={agent.tasksCompleted} icon={<CheckCircle2 className="size-4 text-emerald-500" />} color="bg-emerald-500/10" />
              <StatCard label="Success Rate" value={`${successRatePct}%`} icon={<Target className="size-4 text-violet-500" />} color="bg-violet-500/10" />
              <StatCard label="Tokens Used" value={agent.tokensUsed >= 1000 ? `${(agent.tokensUsed / 1000).toFixed(1)}K` : String(agent.tokensUsed)} icon={<Zap className="size-4 text-amber-500" />} color="bg-amber-500/10" />
              <StatCard label="Assigned" value={totalAssignedTasks} icon={<Activity className="size-4 text-blue-500" />} color="bg-blue-500/10" />
            </div>

            {/* Success rate progress */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="text-muted-foreground">Success Rate</span>
                <span className="font-semibold text-foreground tabular-nums">{successRatePct}%</span>
              </div>
              <Progress value={successRatePct} className="h-1.5" />
            </div>

            {/* Specialty */}
            {agent.specialty && (
              <div className="mt-3 p-2.5 rounded-lg bg-muted/20 border border-border/40">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground mb-1.5">
                  <Sparkles className="size-3 text-amber-500" />
                  Specialty
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{agent.specialty}</p>
              </div>
            )}

            {/* Capabilities */}
            <div className="mt-2 p-2.5 rounded-lg bg-muted/15 border border-border/30">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground mb-1.5">
                <Wrench className="size-3 text-blue-500" />
                Capabilities
              </div>
              <div className="flex flex-wrap gap-1">
                {getCapabilitiesForRole(agent.role).map((cap) => (
                  <Badge key={cap} variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-normal">
                    {cap}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          <div className="px-6 py-4 space-y-5">
            {/* Current Task */}
            <section>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-2">
                <Activity className="size-3.5 text-emerald-500" />
                Current Task
              </div>
              {currentTask ? (
                <div className="p-3 rounded-lg border bg-muted/20">
                  <div className="text-sm font-medium text-foreground">{currentTask.title}</div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{currentTask.status.replace('_', ' ')}</Badge>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{currentTask.priority}</Badge>
                    {currentTask.type && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{currentTask.type}</Badge>}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground p-3 rounded-lg bg-muted/15 border border-dashed border-border/60 text-center">
                  No current task assigned
                </div>
              )}
            </section>

            {/* Assigned Tasks */}
            {assignedTasks.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Target className="size-3.5 text-amber-500" />
                    Assigned Tasks
                  </div>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{assignedTasks.length}</Badge>
                </div>
                <div className="space-y-1">
                  {assignedTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-2 p-2 rounded-md text-xs hover:bg-muted/30 transition-colors border border-transparent hover:border-border/50">
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 shrink-0">{task.status.replace('_', ' ')}</Badge>
                      <span className="text-foreground truncate flex-1">{task.title}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Assign Task */}
            <section>
              <AnimatePresence mode="wait">
                {showAssignTask ? (
                  <motion.div
                    key="assign-form"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                      <div className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
                        <Plus className="size-3 text-emerald-500" />
                        Assign New Task
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={assignTaskTitle}
                          onChange={(e) => setAssignTaskTitle(e.target.value)}
                          placeholder="Enter task title..."
                          className="flex-1 h-8 rounded-md border bg-background px-3 text-xs outline-none focus:ring-1 focus:ring-emerald-500/40 placeholder:text-muted-foreground/50"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && assignTaskTitle.trim()) handleAssignTask()
                            if (e.key === 'Escape') { setShowAssignTask(false); setAssignTaskTitle('') }
                          }}
                          autoFocus
                        />
                        <Button size="sm" onClick={handleAssignTask} disabled={!assignTaskTitle.trim() || isAssigning} className="gap-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                          {isAssigning ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
                          Assign
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setShowAssignTask(false); setAssignTaskTitle('') }} className="h-8 w-8 p-0">
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="assign-button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Button size="sm" variant="outline" className="w-full gap-1.5 h-8 text-xs border-dashed" onClick={() => setShowAssignTask(true)}>
                      <Plus className="size-3" />
                      Assign New Task
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            <Separator />

            {/* Recent Activity */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Clock className="size-3.5 text-blue-500" />
                  Recent Activity
                </div>
                {recentActivities.length > 0 && (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">{recentActivities.length}</Badge>
                )}
              </div>
              {recentActivities.length > 0 ? (
                <div className="space-y-1 max-h-40 overflow-y-auto thin-scrollbar">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-2.5 p-2 rounded-md text-xs hover:bg-muted/20 transition-colors">
                      <span className={cn('size-1.5 rounded-full mt-1.5 shrink-0', isActive ? 'bg-emerald-500/60' : 'bg-muted-foreground/40')} />
                      <div className="flex-1 min-w-0">
                        <div className="text-foreground/90">{activity.description}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {formatRelativeTime(activity.createdAt)} · {new Date(activity.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground p-4 text-center bg-muted/15 rounded-lg border border-dashed border-border/60">
                  <Activity className="size-5 text-muted-foreground/30 mx-auto mb-1.5" />
                  No recent activity
                  <p className="text-[10px] text-muted-foreground/50 mt-0.5">Activity will appear here when the agent performs actions</p>
                </div>
              )}
            </section>

            {/* Modified Files */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <FileCode2 className="size-3.5 text-pink-500" />
                  Modified Files
                </div>
                {recentFiles.length > 0 && (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">{recentFiles.length}</Badge>
                )}
              </div>
              {recentFiles.length > 0 ? (
                <div className="space-y-1 max-h-40 overflow-y-auto thin-scrollbar">
                  {recentFiles.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => {
                        setSelectedAgentId(null)
                        useAppStore.getState().setActiveFileId(file.id)
                      }}
                      className="flex items-center gap-2 p-2 rounded-md text-xs hover:bg-muted/20 transition-colors w-full text-left group"
                    >
                      <FileCode2 className="size-3 text-muted-foreground shrink-0" />
                      <span className="text-foreground/80 truncate flex-1 group-hover:text-foreground transition-colors">{file.path}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                        {formatRelativeTime(file.updatedAt)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground p-4 text-center bg-muted/15 rounded-lg border border-dashed border-border/60">
                  <FileCode2 className="size-5 text-muted-foreground/30 mx-auto mb-1.5" />
                  No modified files
                  <p className="text-[10px] text-muted-foreground/50 mt-0.5">Files this agent has worked on will appear here</p>
                </div>
              )}
            </section>
          </div>
        </ScrollArea>

        {/* Footer — always visible at bottom */}
        <div className="px-6 py-3 flex items-center gap-2 shrink-0 bg-background border-t border-border/60">
          {/* Chat with Agent — prominent primary button */}
          <Button
            size="sm"
            className="gap-1.5 h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-shadow flex-1"
            onClick={() => {
              const agentName = agent?.name || 'Agent'
              setSelectedAgentId(null)
              // Open the right panel (chat panel)
              useAppStore.getState().setRightPanelOpen(true)
              // Use a longer delay to ensure the chat panel has mounted and the input is available
              setTimeout(() => {
                const chatInput = document.querySelector<HTMLTextAreaElement>('[data-chat-input]')
                if (chatInput) {
                  // Set value and focus
                  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
                  if (nativeInputValueSetter) {
                    nativeInputValueSetter.call(chatInput, `@${agentName} `)
                    chatInput.dispatchEvent(new Event('input', { bubbles: true }))
                  }
                  chatInput.focus()
                } else {
                  // Fallback: dispatch custom event if input not found yet
                  window.dispatchEvent(new CustomEvent('teamforge-chat-prefill', { detail: `@${agentName} ` }))
                }
              }, 300)
            }}
          >
            <MessageSquare className="size-3.5" />
            Chat with Agent
          </Button>

          {/* Set Status dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" disabled={isSettingStatus}>
                {isSettingStatus ? <Loader2 className="size-3 animate-spin" /> : <ToggleLeft className="size-3" />}
                Set Status
                <ChevronDown className="size-2.5 ml-0.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              {Object.entries(AGENT_STATUS_CONFIG).map(([key, cfg]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => handleSetStatus(key as AgentStatus)}
                  className={cn('flex items-center gap-2 text-xs cursor-pointer', agent.status === key && 'font-medium')}
                >
                  <span className={cn('size-2 rounded-full shrink-0', cfg.dotColor)} />
                  <span className={cfg.color}>{cfg.label}</span>
                  {agent.status === key && <Check className="size-3 ml-auto text-muted-foreground" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1" />

          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setSelectedAgentId(null)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
