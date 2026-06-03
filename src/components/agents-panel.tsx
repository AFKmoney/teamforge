'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Users,
  LayoutGrid,
  List,
  Plus,
  Search,
  Code,
  BarChart,
  Brain,
  Dna,
  Shield,
  Rocket,
  Loader2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { useAppStore } from '@/lib/store'
import type { Agent, AgentRole, AgentStatus } from '@/lib/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toString()
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function safeJsonParse<T>(value: string | T[] | Record<string, unknown> | undefined, fallback: T): T {
  if (value === undefined || value === null) return fallback
  if (typeof value === 'object') return value as T
  try {
    return JSON.parse(value as string) as T
  } catch {
    return fallback
  }
}

// ---------------------------------------------------------------------------
// Role config
// ---------------------------------------------------------------------------

const ROLE_CONFIG: Record<AgentRole, { icon: typeof Search; color: string; label: string }> = {
  research: { icon: Search, color: 'text-purple-500', label: 'Research' },
  coding: { icon: Code, color: 'text-green-500', label: 'Coding' },
  evaluation: { icon: BarChart, color: 'text-sky-500', label: 'Evaluation' },
  memory: { icon: Brain, color: 'text-cyan-500', label: 'Memory' },
  evolution: { icon: Dna, color: 'text-amber-500', label: 'Evolution' },
  safety: { icon: Shield, color: 'text-red-500', label: 'Safety' },
  deployment: { icon: Rocket, color: 'text-teal-500', label: 'Deployment' },
}

const ROLE_BADGE_BG: Record<AgentRole, string> = {
  research: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  coding: 'bg-green-500/10 text-green-600 border-green-500/20',
  evaluation: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
  memory: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  evolution: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  safety: 'bg-red-500/10 text-red-600 border-red-500/20',
  deployment: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
}

const STATUS_DOT: Record<AgentStatus, { bg: string; pulse: boolean }> = {
  active: { bg: 'bg-green-500', pulse: true },
  busy: { bg: 'bg-amber-500', pulse: true },
  idle: { bg: 'bg-slate-400', pulse: false },
  error: { bg: 'bg-red-500', pulse: false },
  offline: { bg: 'bg-slate-300', pulse: false },
}

// ---------------------------------------------------------------------------
// Raw agent type from API (JSON string fields)
// ---------------------------------------------------------------------------

interface RawAgent {
  id: string
  name: string
  role: string
  status: string
  description: string
  goals: string
  tools: string
  config: string
  successRate: number
  tasksCompleted: number
  tokensUsed: number
  lastActive: string
  createdAt: string
  updatedAt: string
  _count?: { memories: number; events: number; experiments: number }
}

function parseAgent(raw: RawAgent): Agent {
  return {
    id: raw.id,
    name: raw.name,
    role: raw.role as AgentRole,
    status: raw.status as AgentStatus,
    description: raw.description,
    goals: safeJsonParse<string[]>(raw.goals, []),
    tools: safeJsonParse<string[]>(raw.tools, []),
    config: safeJsonParse<Record<string, unknown>>(raw.config, {}),
    successRate: raw.successRate,
    tasksCompleted: raw.tasksCompleted,
    tokensUsed: raw.tokensUsed,
    lastActive: raw.lastActive,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AgentsPanel() {
  const { agents, setAgents } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [createOpen, setCreateOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formRole, setFormRole] = useState<AgentRole>('research')
  const [formDesc, setFormDesc] = useState('')
  const [formGoals, setFormGoals] = useState('')
  const [formTools, setFormTools] = useState('')

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents')
      if (res.ok) {
        const data: RawAgent[] = await res.json()
        setAgents(data.map(parseAgent))
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [setAgents])

  useEffect(() => {
    fetchAgents()
    const interval = setInterval(fetchAgents, 30000)
    return () => clearInterval(interval)
  }, [fetchAgents])

  const handleCreate = async () => {
    if (!formName || !formRole || !formDesc) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          role: formRole,
          description: formDesc,
          goals: formGoals,
          tools: formTools,
        }),
      })
      if (res.ok) {
        setCreateOpen(false)
        setFormName('')
        setFormRole('research')
        setFormDesc('')
        setFormGoals('')
        setFormTools('')
        await fetchAgents()
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false)
    }
  }

  const openDetail = (agent: Agent) => {
    setSelectedAgent(agent)
    setDetailOpen(true)
  }

  // ---------------------------------------------------------------------------
  // Loading skeleton
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="grid grid-cols-3 gap-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderStatusDot = (status: AgentStatus) => {
    const cfg = STATUS_DOT[status] ?? STATUS_DOT.idle
    return (
      <span
        className={`inline-block size-2 rounded-full ${cfg.bg} ${cfg.pulse ? 'animate-pulse' : ''}`}
      />
    )
  }

  const successRateColor = (rate: number) => {
    if (rate > 0.9) return 'bg-green-500'
    if (rate > 0.7) return 'bg-amber-500'
    return 'bg-red-500'
  }

  const renderAgentCard = (agent: Agent) => {
    const roleCfg = ROLE_CONFIG[agent.role] ?? ROLE_CONFIG.research
    const RoleIcon = roleCfg.icon
    const goals = agent.goals ?? []
    const tools = agent.tools ?? []

    return (
      <Card key={agent.id} className="flex flex-col">
        <CardContent className="p-4 flex flex-col gap-3 flex-1">
          {/* Header: Name + Role badge */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm leading-tight truncate">{agent.name}</h3>
            <Badge variant="outline" className={`shrink-0 text-xs ${ROLE_BADGE_BG[agent.role] ?? ''}`}>
              <RoleIcon className={`size-3 mr-1 ${roleCfg.color}`} />
              {roleCfg.label}
            </Badge>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {renderStatusDot(agent.status)}
            <span className="capitalize">{agent.status}</span>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2">{agent.description}</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="space-y-1">
              <span className="text-muted-foreground">Success Rate</span>
              <div className="font-medium">{(agent.successRate * 100).toFixed(0)}%</div>
              <Progress value={agent.successRate * 100} className={`h-1.5 [&>div]:${successRateColor(agent.successRate)}`} />
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Tasks</span>
              <div className="font-medium">{agent.tasksCompleted.toLocaleString()}</div>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Tokens</span>
              <div className="font-medium">{formatTokens(agent.tokensUsed)}</div>
            </div>
          </div>

          {/* Goals */}
          {goals.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Goals</span>
              <div className="space-y-0.5">
                {goals.slice(0, 2).map((g, i) => (
                  <p key={i} className="text-xs text-muted-foreground truncate">• {g}</p>
                ))}
                {goals.length > 2 && (
                  <p className="text-xs text-muted-foreground">+{goals.length - 2} more</p>
                )}
              </div>
            </div>
          )}

          {/* Tools */}
          {tools.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tools.slice(0, 4).map((t, i) => (
                <Badge key={i} variant="outline" className="text-xs py-0 px-1.5">{t}</Badge>
              ))}
              {tools.length > 4 && (
                <Badge variant="outline" className="text-xs py-0 px-1.5">+{tools.length - 4}</Badge>
              )}
            </div>
          )}

          {/* View Details */}
          <Button
            variant="outline"
            size="sm"
            className="mt-auto w-full"
            onClick={() => openDetail(agent)}
          >
            View Details
          </Button>
        </CardContent>
      </Card>
    )
  }

  const renderListView = () => (
    <div className="rounded-md border">
      <div className="grid grid-cols-6 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground border-b bg-muted/30">
        <span>Name</span>
        <span>Role</span>
        <span>Status</span>
        <span>Success Rate</span>
        <span>Tasks</span>
        <span>Tokens</span>
      </div>
      {agents.map((agent) => {
        const roleCfg = ROLE_CONFIG[agent.role] ?? ROLE_CONFIG.research
        const RoleIcon = roleCfg.icon
        return (
          <div
            key={agent.id}
            className="grid grid-cols-6 gap-4 px-4 py-3 text-sm items-center border-b last:border-b-0 hover:bg-muted/30 cursor-pointer transition-colors"
            onClick={() => openDetail(agent)}
          >
            <span className="font-medium truncate">{agent.name}</span>
            <span>
              <Badge variant="outline" className={`text-xs ${ROLE_BADGE_BG[agent.role] ?? ''}`}>
                <RoleIcon className={`size-3 mr-1 ${roleCfg.color}`} />
                {roleCfg.label}
              </Badge>
            </span>
            <span className="flex items-center gap-2 capitalize">
              {renderStatusDot(agent.status)}
              {agent.status}
            </span>
            <span>{(agent.successRate * 100).toFixed(0)}%</span>
            <span>{agent.tasksCompleted.toLocaleString()}</span>
            <span>{formatTokens(agent.tokensUsed)}</span>
          </div>
        )
      })}
      {agents.length === 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground">No agents found</div>
      )}
    </div>
  )

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Users className="size-6 text-emerald-600" />
          <h2 className="text-2xl font-bold tracking-tight">Agent Management</h2>
          <Badge variant="secondary" className="text-sm">{agents.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-r-none"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-l-none"
              onClick={() => setViewMode('list')}
            >
              <List className="size-4" />
            </Button>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4 mr-1" />
            Create Agent
          </Button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map(renderAgentCard)}
          {agents.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No agents yet. Create one to get started.
            </div>
          )}
        </div>
      ) : (
        renderListView()
      )}

      {/* Agent Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedAgent?.name ?? 'Agent Details'}</DialogTitle>
            <DialogDescription>Full agent information</DialogDescription>
          </DialogHeader>
          {selectedAgent && (
            <div className="space-y-4">
              {/* Role + Status */}
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={ROLE_BADGE_BG[selectedAgent.role] ?? ''}>
                  {(() => {
                    const RoleIcon = ROLE_CONFIG[selectedAgent.role]?.icon ?? Search
                    return <RoleIcon className={`size-3 mr-1 ${ROLE_CONFIG[selectedAgent.role]?.color ?? ''}`} />
                  })()}
                  {ROLE_CONFIG[selectedAgent.role]?.label ?? selectedAgent.role}
                </Badge>
                <span className="flex items-center gap-2 text-sm capitalize">
                  {renderStatusDot(selectedAgent.status)}
                  {selectedAgent.status}
                </span>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-sm font-medium mb-1">Description</h4>
                <p className="text-sm text-muted-foreground">{selectedAgent.description}</p>
              </div>

              {/* Goals */}
              {selectedAgent.goals.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Goals</h4>
                  <ul className="space-y-1">
                    {selectedAgent.goals.map((g, i) => (
                      <li key={i} className="text-sm text-muted-foreground">• {g}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tools */}
              {selectedAgent.tools.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Tools</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedAgent.tools.map((t, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h4 className="text-sm font-medium">Success Rate</h4>
                  <p className="text-lg font-semibold">{(selectedAgent.successRate * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium">Tasks</h4>
                  <p className="text-lg font-semibold">{selectedAgent.tasksCompleted.toLocaleString()}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium">Tokens</h4>
                  <p className="text-lg font-semibold">{formatTokens(selectedAgent.tokensUsed)}</p>
                </div>
              </div>

              {/* Last Active */}
              <div>
                <h4 className="text-sm font-medium">Last Active</h4>
                <p className="text-sm text-muted-foreground">{timeAgo(selectedAgent.lastActive)}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Agent Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Agent</DialogTitle>
            <DialogDescription>Add a new agent to the system</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agent-name">Name *</Label>
              <Input
                id="agent-name"
                placeholder="Agent name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-role">Role *</Label>
              <Select value={formRole} onValueChange={(v) => setFormRole(v as AgentRole)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-desc">Description *</Label>
              <Textarea
                id="agent-desc"
                placeholder="Describe the agent's purpose"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-goals">Goals</Label>
              <Input
                id="agent-goals"
                placeholder="Enter goals separated by commas"
                value={formGoals}
                onChange={(e) => setFormGoals(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-tools">Tools</Label>
              <Input
                id="agent-tools"
                placeholder="Enter tools separated by commas"
                value={formTools}
                onChange={(e) => setFormTools(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!formName || !formRole || !formDesc || submitting}>
              {submitting && <Loader2 className="size-4 mr-1 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
