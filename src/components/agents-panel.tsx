'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  Filter,
  Wrench,
  Zap,
  Globe,
  Database,
  Terminal,
  FileSearch,
  Activity,
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
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import { useAppStore } from '@/lib/store'
import type { Agent, AgentRole, AgentStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

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
// Mock performance data generator for mini charts
// ---------------------------------------------------------------------------

const generatePerformanceData = (baseRate: number) => {
  return Array.from({ length: 7 }, (_, i) => ({
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    rate: Math.max(0, Math.min(1, baseRate + (Math.random() - 0.5) * 0.2)),
  }))
}

// ---------------------------------------------------------------------------
// Role config
// ---------------------------------------------------------------------------

const ROLE_CONFIG: Record<AgentRole, { icon: typeof Search; color: string; label: string; gradient: string }> = {
  research: { icon: Search, color: 'text-purple-500 dark:text-purple-400', label: 'Research', gradient: 'from-purple-500 to-purple-600' },
  coding: { icon: Code, color: 'text-green-500 dark:text-green-400', label: 'Coding', gradient: 'from-green-500 to-emerald-600' },
  evaluation: { icon: BarChart, color: 'text-sky-500 dark:text-sky-400', label: 'Evaluation', gradient: 'from-sky-500 to-cyan-600' },
  memory: { icon: Brain, color: 'text-cyan-500 dark:text-cyan-400', label: 'Memory', gradient: 'from-cyan-500 to-teal-600' },
  evolution: { icon: Dna, color: 'text-amber-500 dark:text-amber-400', label: 'Evolution', gradient: 'from-amber-500 to-orange-600' },
  safety: { icon: Shield, color: 'text-red-500 dark:text-red-400', label: 'Safety', gradient: 'from-red-500 to-rose-600' },
  deployment: { icon: Rocket, color: 'text-teal-500 dark:text-teal-400', label: 'Deployment', gradient: 'from-teal-500 to-emerald-600' },
}

const ROLE_BADGE_BG: Record<AgentRole, string> = {
  research: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  coding: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  evaluation: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  memory: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
  evolution: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  safety: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  deployment: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
}

const STATUS_CONFIG: Record<AgentStatus, { bg: string; pulse: boolean; labelBg: string; label: string; dotColor: string }> = {
  active: { bg: 'bg-green-500', pulse: true, labelBg: 'bg-green-500/10 text-green-600 dark:text-green-400', label: 'Active', dotColor: 'bg-green-500' },
  busy: { bg: 'bg-amber-500', pulse: true, labelBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', label: 'Busy', dotColor: 'bg-amber-500' },
  idle: { bg: 'bg-muted-foreground/50', pulse: false, labelBg: 'bg-muted text-muted-foreground', label: 'Idle', dotColor: 'bg-muted-foreground/50' },
  error: { bg: 'bg-red-500', pulse: false, labelBg: 'bg-red-500/10 text-red-600 dark:text-red-400', label: 'Error', dotColor: 'bg-red-500' },
  offline: { bg: 'bg-muted-foreground/30', pulse: false, labelBg: 'bg-muted text-muted-foreground', label: 'Offline', dotColor: 'bg-muted-foreground/30' },
}

// Tool icon mapping
const TOOL_ICONS: Record<string, typeof Wrench> = {
  'web-search': Globe,
  'code-executor': Terminal,
  'database': Database,
  'analyzer': FileSearch,
  'api-client': Zap,
  'default': Wrench,
}

function getToolIcon(toolName: string): typeof Wrench {
  const lower = toolName.toLowerCase()
  for (const [key, Icon] of Object.entries(TOOL_ICONS)) {
    if (key === 'default') continue
    if (lower.includes(key) || lower.includes(key.replace('-', ''))) return Icon
  }
  return TOOL_ICONS['default']
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
// Animation variants
// ---------------------------------------------------------------------------

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.05,
      duration: 0.3,
      ease: 'easeOut',
    },
  }),
  exit: { opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.2 } },
}

const listRowVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.03, duration: 0.2, ease: 'easeOut' },
  }),
  exit: { opacity: 0, x: -10, transition: { duration: 0.15 } },
}

// ---------------------------------------------------------------------------
// Custom tooltip for mini chart
// ---------------------------------------------------------------------------

function MiniChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number }> }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md">
      {(payload[0].value * 100).toFixed(1)}%
    </div>
  )
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

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  // Performance data for detail dialog
  const [performanceData, setPerformanceData] = useState<Array<{ day: string; rate: number }>>([])

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

  // Filtered agents
  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const matchesSearch =
        searchQuery === '' ||
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.tools.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesRole = roleFilter === 'all' || agent.role === roleFilter
      return matchesSearch && matchesRole
    })
  }, [agents, searchQuery, roleFilter])

  // Status summary counts
  const statusCounts = useMemo(() => {
    const counts: Record<AgentStatus, number> = { active: 0, busy: 0, idle: 0, error: 0, offline: 0 }
    agents.forEach((a) => { counts[a.status] = (counts[a.status] || 0) + 1 })
    return counts
  }, [agents])

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
    setPerformanceData(generatePerformanceData(agent.successRate))
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
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.idle
    return (
      <span
        className={cn('inline-block size-2 rounded-full', cfg.dotColor, cfg.pulse && 'animate-pulse')}
      />
    )
  }

  const successRateColor = (rate: number) => {
    if (rate > 0.9) return 'bg-green-500'
    if (rate > 0.7) return 'bg-amber-500'
    return 'bg-red-500'
  }

  const successRateTextColor = (rate: number) => {
    if (rate > 0.9) return 'text-green-600 dark:text-green-400'
    if (rate > 0.7) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  const renderAgentCard = (agent: Agent, index: number) => {
    const roleCfg = ROLE_CONFIG[agent.role] ?? ROLE_CONFIG.research
    const RoleIcon = roleCfg.icon
    const statusCfg = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.idle
    const goals = agent.goals ?? []
    const tools = agent.tools ?? []

    return (
      <motion.div
        key={agent.id}
        custom={index}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        layout
      >
        <Card className="flex flex-col overflow-hidden hover:shadow-md transition-shadow duration-200 group">
          {/* Gradient top border */}
          <div className={cn('h-1 bg-gradient-to-r', roleCfg.gradient)} />

          <CardContent className="p-4 flex flex-col gap-3 flex-1">
            {/* Header: Name + Role badge */}
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm leading-tight truncate text-foreground">
                {agent.name}
              </h3>
              <Badge variant="outline" className={cn('shrink-0 text-xs', ROLE_BADGE_BG[agent.role] ?? '')}>
                <RoleIcon className={cn('size-3 mr-1', roleCfg.color)} />
                {roleCfg.label}
              </Badge>
            </div>

            {/* Status with background */}
            <div className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium w-fit', statusCfg.labelBg)}>
              {renderStatusDot(agent.status)}
              {statusCfg.label}
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground line-clamp-2">{agent.description}</p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="space-y-1">
                <span className="text-muted-foreground">Success Rate</span>
                <div className={cn('font-semibold', successRateTextColor(agent.successRate))}>
                  {(agent.successRate * 100).toFixed(0)}%
                </div>
                <Progress value={agent.successRate * 100} className={cn('h-1.5', `[&>div]:${successRateColor(agent.successRate)}`)} />
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">Tasks</span>
                <div className="font-semibold text-foreground">{agent.tasksCompleted.toLocaleString()}</div>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">Tokens</span>
                <div className="font-semibold text-foreground">{formatTokens(agent.tokensUsed)}</div>
              </div>
            </div>

            {/* Goals */}
            {goals.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Goals</span>
                <div className="space-y-0.5">
                  {goals.slice(0, 2).map((g, i) => (
                    <p key={i} className="text-xs text-muted-foreground truncate">&bull; {g}</p>
                  ))}
                  {goals.length > 2 && (
                    <p className="text-xs text-muted-foreground">+{goals.length - 2} more</p>
                  )}
                </div>
              </div>
            )}

            {/* Tools with icons */}
            {tools.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tools.slice(0, 4).map((t, i) => {
                  const ToolIcon = getToolIcon(t)
                  return (
                    <Badge key={i} variant="outline" className="text-xs py-0 px-1.5 gap-0.5 text-muted-foreground">
                      <ToolIcon className="size-2.5" />
                      {t}
                    </Badge>
                  )
                })}
                {tools.length > 4 && (
                  <Badge variant="outline" className="text-xs py-0 px-1.5 text-muted-foreground">
                    +{tools.length - 4}
                  </Badge>
                )}
              </div>
            )}

            {/* View Details */}
            <Button
              variant="outline"
              size="sm"
              className="mt-auto w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
              onClick={() => openDetail(agent)}
            >
              View Details
            </Button>
          </CardContent>
        </Card>
      </motion.div>
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
      <AnimatePresence>
        {filteredAgents.map((agent, index) => {
          const roleCfg = ROLE_CONFIG[agent.role] ?? ROLE_CONFIG.research
          const RoleIcon = roleCfg.icon
          const statusCfg = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.idle
          return (
            <motion.div
              key={agent.id}
              custom={index}
              variants={listRowVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="grid grid-cols-6 gap-4 px-4 py-3 text-sm items-center border-b last:border-b-0 hover:bg-muted/30 cursor-pointer transition-colors"
              onClick={() => openDetail(agent)}
            >
              <span className="font-medium truncate text-foreground">{agent.name}</span>
              <span>
                <Badge variant="outline" className={cn('text-xs', ROLE_BADGE_BG[agent.role] ?? '')}>
                  <RoleIcon className={cn('size-3 mr-1', roleCfg.color)} />
                  {roleCfg.label}
                </Badge>
              </span>
              <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium w-fit', statusCfg.labelBg)}>
                {renderStatusDot(agent.status)}
                {statusCfg.label}
              </span>
              <span className={cn('font-medium', successRateTextColor(agent.successRate))}>
                {(agent.successRate * 100).toFixed(0)}%
              </span>
              <span className="text-foreground">{agent.tasksCompleted.toLocaleString()}</span>
              <span className="text-foreground">{formatTokens(agent.tokensUsed)}</span>
            </motion.div>
          )
        })}
      </AnimatePresence>
      {filteredAgents.length === 0 && (
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
          <Users className="size-6 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Agent Management</h2>
          <Badge variant="secondary" className="text-sm">{agents.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-md border-border">
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

      {/* Status Summary Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mr-1">
          Status Overview
        </span>
        {(['active', 'busy', 'idle', 'error', 'offline'] as AgentStatus[]).map((status) => {
          const cfg = STATUS_CONFIG[status]
          const count = statusCounts[status] ?? 0
          if (count === 0 && status !== 'idle') return null
          return (
            <div key={status} className="flex items-center gap-1.5">
              <span className={cn('inline-block size-2 rounded-full', cfg.dotColor, cfg.pulse && 'animate-pulse')} />
              <span className="text-sm text-foreground font-medium">{count}</span>
              <span className="text-xs text-muted-foreground">{cfg.label}</span>
            </div>
          )
        })}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search agents by name, description, or tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-card border-border">
            <Filter className="size-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>
                {cfg.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {viewMode === 'grid' ? (
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAgents.map((agent, index) => renderAgentCard(agent, index))}
            {filteredAgents.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                {searchQuery || roleFilter !== 'all'
                  ? 'No agents match your search criteria.'
                  : 'No agents yet. Create one to get started.'}
              </div>
            )}
          </div>
        </AnimatePresence>
      ) : (
        renderListView()
      )}

      {/* Agent Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">{selectedAgent?.name ?? 'Agent Details'}</DialogTitle>
            <DialogDescription>Full agent information</DialogDescription>
          </DialogHeader>
          {selectedAgent && (
            <div className="space-y-5">
              {/* Role + Status */}
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={ROLE_BADGE_BG[selectedAgent.role] ?? ''}>
                  {(() => {
                    const RoleIcon = ROLE_CONFIG[selectedAgent.role]?.icon ?? Search
                    return <RoleIcon className={cn('size-3 mr-1', ROLE_CONFIG[selectedAgent.role]?.color ?? '')} />
                  })()}
                  {ROLE_CONFIG[selectedAgent.role]?.label ?? selectedAgent.role}
                </Badge>
                <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium', STATUS_CONFIG[selectedAgent.status]?.labelBg ?? '')}>
                  {renderStatusDot(selectedAgent.status)}
                  {STATUS_CONFIG[selectedAgent.status]?.label ?? selectedAgent.status}
                </span>
              </div>

              {/* Performance History Mini Chart */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Activity className="size-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium text-foreground">Performance History (7 days)</h4>
                </div>
                <div className="h-24 w-full rounded-md border border-border bg-muted/30 p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceData} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
                      <defs>
                        <linearGradient id="perfGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis domain={[0, 1]} hide />
                      <Tooltip content={<MiniChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="rate"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill="url(#perfGradient)"
                        dot={false}
                        activeDot={{ r: 3, fill: 'hsl(var(--primary))' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-sm font-medium mb-1 text-foreground">Description</h4>
                <p className="text-sm text-muted-foreground">{selectedAgent.description}</p>
              </div>

              {/* Goals */}
              {selectedAgent.goals.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-1 text-foreground">Goals</h4>
                  <ul className="space-y-1">
                    {selectedAgent.goals.map((g, i) => (
                      <li key={i} className="text-sm text-muted-foreground">&bull; {g}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tools with icons */}
              {selectedAgent.tools.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-1 text-foreground">Tools</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedAgent.tools.map((t, i) => {
                      const ToolIcon = getToolIcon(t)
                      return (
                        <Badge key={i} variant="outline" className="text-xs gap-1">
                          <ToolIcon className="size-3" />
                          {t}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 rounded-lg border border-border bg-muted/30 p-4">
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground">Success Rate</h4>
                  <p className={cn('text-lg font-semibold', successRateTextColor(selectedAgent.successRate))}>
                    {(selectedAgent.successRate * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground">Tasks</h4>
                  <p className="text-lg font-semibold text-foreground">{selectedAgent.tasksCompleted.toLocaleString()}</p>
                </div>
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground">Tokens</h4>
                  <p className="text-lg font-semibold text-foreground">{formatTokens(selectedAgent.tokensUsed)}</p>
                </div>
              </div>

              {/* Last Active */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Last Active:</span>
                <span className="font-medium text-foreground">{timeAgo(selectedAgent.lastActive)}</span>
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
