'use client'

import { useAppStore } from '@/lib/store'
import { AGENT_ROLE_CONFIG, AGENT_STATUS_CONFIG, type Agent, type AgentRole, type AgentStatus } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import {
  User,
  Activity,
  FileCode2,
  Clock,
  Zap,
  CheckCircle2,
  Target,
  Play,
  Eye,
  ToggleLeft,
  Loader2,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 border">
      <div className={cn('size-8 rounded-md flex items-center justify-center', color)}>
        {icon}
      </div>
      <div>
        <div className="text-xs font-semibold text-foreground">{value}</div>
        <div className="text-[10px] text-muted-foreground">{label}</div>
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

  const agent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId) || null,
    [agents, selectedAgentId],
  )

  const roleConfig = agent ? AGENT_ROLE_CONFIG[agent.role] : null
  const statusConfig = agent ? AGENT_STATUS_CONFIG[agent.status] : null
  const isActive = agent ? (agent.status !== 'idle' && agent.status !== 'sleeping') : false

  // Current task assignment
  const currentTask = useMemo(
    () => agent?.currentTaskId ? tasks.find((t) => t.id === agent.currentTaskId) : null,
    [agent, tasks],
  )

  // Recent activities (last 5)
  const recentActivities = useMemo(
    () => agent
      ? activities
          .filter((a) => a.agentId === agent.id)
          .slice(0, 5)
      : [],
    [agent, activities],
  )

  // Recently modified files
  const recentFiles = useMemo(
    () => agent
      ? files
          .filter((f) => !f.isDirectory)
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 5)
      : [],
    [agent, files],
  )

  // Assigned tasks
  const assignedTasks = useMemo(
    () => agent
      ? tasks.filter((t) => t.assigneeId === agent.id && t.status !== 'done')
      : [],
    [agent, tasks],
  )

  const handleSetStatus = async (newStatus: AgentStatus) => {
    if (!agent) return
    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        updateAgent(agent.id, { status: newStatus })
      }
    } catch (e) {
      console.error('Failed to update agent status:', e)
    }
  }

  if (!agent || !roleConfig || !statusConfig) return null

  return (
    <Dialog open={!!selectedAgentId} onOpenChange={(v) => !v && setSelectedAgentId(null)}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="size-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
              {agent.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn('font-bold', roleConfig.color)}>{agent.name}</span>
                <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-4 gap-0.5', roleConfig.color)}>
                  {roleConfig.label}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn('size-2 rounded-full', statusConfig.dotColor, isActive && 'animate-pulse')} />
                <span className={cn('text-xs', statusConfig.color)}>{statusConfig.label}</span>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 pb-4">
            {/* Specialty */}
            {agent.specialty && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Specialty:</span> {agent.specialty}
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <StatCard
                label="Tasks Done"
                value={agent.tasksCompleted}
                icon={<CheckCircle2 className="size-4 text-emerald-500" />}
                color="bg-emerald-500/10"
              />
              <StatCard
                label="Success Rate"
                value={`${agent.successRate}%`}
                icon={<Target className="size-4 text-violet-500" />}
                color="bg-violet-500/10"
              />
              <StatCard
                label="Tokens Used"
                value={agent.tokensUsed >= 1000 ? `${(agent.tokensUsed / 1000).toFixed(1)}K` : String(agent.tokensUsed)}
                icon={<Zap className="size-4 text-amber-500" />}
                color="bg-amber-500/10"
              />
            </div>

            {/* Success rate progress bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Success Rate</span>
                <span className="font-medium text-foreground">{agent.successRate}%</span>
              </div>
              <Progress value={agent.successRate} className="h-1.5" />
            </div>

            <Separator />

            {/* Current Task */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Activity className="size-3.5 text-emerald-500" />
                Current Task
              </div>
              {currentTask ? (
                <div className="p-2.5 rounded-lg border bg-muted/20">
                  <div className="text-xs font-medium text-foreground">{currentTask.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{currentTask.status}</Badge>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{currentTask.priority}</Badge>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground p-2 rounded-lg bg-muted/20">
                  No current task assigned
                </div>
              )}
            </div>

            {/* Assigned Tasks */}
            {assignedTasks.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Target className="size-3.5 text-amber-500" />
                  Assigned Tasks ({assignedTasks.length})
                </div>
                <div className="space-y-1">
                  {assignedTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-2 p-1.5 rounded-md text-xs hover:bg-muted/30 transition-colors">
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 shrink-0">{task.status.replace('_', ' ')}</Badge>
                      <span className="text-foreground truncate">{task.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Recent Activity */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Clock className="size-3.5 text-blue-500" />
                Recent Activity
              </div>
              {recentActivities.length > 0 ? (
                <div className="space-y-1">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-2 p-1.5 text-xs">
                      <span className="size-1.5 rounded-full bg-muted-foreground/50 mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-foreground/90 truncate">{activity.description}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(activity.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground p-2">
                  No recent activity
                </div>
              )}
            </div>

            {/* Recently Modified Files */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <FileCode2 className="size-3.5 text-pink-500" />
                Recently Modified Files
              </div>
              {recentFiles.length > 0 ? (
                <div className="space-y-1">
                  {recentFiles.map((file) => (
                    <div key={file.id} className="flex items-center gap-2 p-1.5 rounded-md text-xs hover:bg-muted/30 transition-colors">
                      <FileCode2 className="size-3 text-muted-foreground shrink-0" />
                      <span className="text-foreground/80 truncate">{file.path}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                        {new Date(file.updatedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground p-2">
                  No recently modified files
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <Separator />

        <DialogFooter className="gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              // Open the task creation flow - for now just close and user can use New Task
              setSelectedAgentId(null)
            }}
          >
            <Play className="size-3" />
            Assign Task
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              // Toggle between idle and coding
              if (agent.status === 'idle') {
                handleSetStatus('coding')
              } else {
                handleSetStatus('idle')
              }
            }}
          >
            <ToggleLeft className="size-3" />
            Set Status
          </Button>
          <DialogClose asChild>
            <Button size="sm" variant="outline" className="gap-1.5">
              <Eye className="size-3" />
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
