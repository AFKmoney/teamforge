'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
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
  Download,
  FileSpreadsheet,
  FileJson,
  X,
  Eye,
  Pencil,
  Power,
  CheckCircle2,
  Clock,
  Moon,
  AlertTriangle,
  PowerOff,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import { useAppStore } from '@/lib/store'
import type { Agent, AgentRole, AgentStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import { exportToCSV, exportToJSON } from '@/lib/export-utils'
import { toastSuccess, toastError } from '@/lib/toast-utils'
import { PageHeader } from '@/components/page-header'

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
// Mock status history generator
// ---------------------------------------------------------------------------

interface StatusHistoryEntry {
  id: string
  from: AgentStatus
  to: AgentStatus
  timestamp: string
  reason: string
}

const generateStatusHistory = (agentId: string): StatusHistoryEntry[] => {
  const statuses: AgentStatus[] = ['active', 'busy', 'idle', 'error', 'offline']
  const reasons: Record<string, string[]> = {
    active: ['Task started', 'Reconnected', 'Activated by system', 'Manual activation'],
    busy: ['Processing task queue', 'Running analysis', 'Executing workflow'],
    idle: ['No pending tasks', 'Waiting for input', 'Task completed'],
    error: ['API timeout', 'Resource limit exceeded', 'Configuration error'],
    offline: ['Maintenance mode', 'Scheduled downtime', 'Manual shutdown'],
  }
  const now = Date.now()
  return Array.from({ length: 5 }, (_, i) => {
    const from = statuses[Math.floor(Math.random() * statuses.length)]
    let to = statuses[Math.floor(Math.random() * statuses.length)]
    while (to === from) to = statuses[Math.floor(Math.random() * statuses.length)]
    return {
      id: `${agentId}-sh-${i}`,
      from,
      to,
      timestamp: new Date(now - (i + 1) * 3600000 * (Math.random() * 4 + 1)).toISOString(),
      reason: reasons[to][Math.floor(Math.random() * reasons[to].length)],
    }
  })
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

// Status summary mini-card config with icons
const STATUS_SUMMARY_CONFIG: Record<AgentStatus, { icon: typeof CheckCircle2; iconColor: string; bgColor: string }> = {
  active: { icon: CheckCircle2, iconColor: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-500/10 dark:bg-green-500/15 border-green-500/20' },
  busy: { icon: Clock, iconColor: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/20' },
  idle: { icon: Moon, iconColor: 'text-muted-foreground', bgColor: 'bg-muted/50 border-border' },
  error: { icon: AlertTriangle, iconColor: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-500/10 dark:bg-red-500/15 border-red-500/20' },
  offline: { icon: PowerOff, iconColor: 'text-muted-foreground/70', bgColor: 'bg-muted/30 border-border' },
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
// Role templates for create dialog
// ---------------------------------------------------------------------------

interface RoleTemplate {
  label: string
  description: string
  role: AgentRole
  goals: string
  tools: string
  formDesc: string
}

const ROLE_TEMPLATES: Record<string, RoleTemplate> = {
  research: {
    label: 'Research Agent',
    description: 'Searches and synthesizes information from various sources',
    role: 'research',
    goals: 'Conduct thorough research, Synthesize findings, Identify knowledge gaps',
    tools: 'web-search, analyzer, database',
    formDesc: 'An agent specialized in research tasks — searching, analyzing, and synthesizing information from diverse data sources.',
  },
  coding: {
    label: 'Coding Agent',
    description: 'Writes, reviews, and debugs code',
    role: 'coding',
    goals: 'Write clean code, Debug issues, Optimize performance',
    tools: 'code-executor, analyzer, api-client',
    formDesc: 'An agent specialized in software development — writing, reviewing, debugging, and optimizing code.',
  },
  evaluation: {
    label: 'Evaluation Agent',
    description: 'Assesses and benchmarks system performance',
    role: 'evaluation',
    goals: 'Run benchmarks, Evaluate metrics, Generate reports',
    tools: 'analyzer, database, code-executor',
    formDesc: 'An agent focused on evaluation — running benchmarks, assessing metrics, and generating performance reports.',
  },
  memory: {
    label: 'Memory Agent',
    description: 'Manages knowledge storage and retrieval',
    role: 'memory',
    goals: 'Organize knowledge, Retrieve relevant info, Maintain data integrity',
    tools: 'database, analyzer, api-client',
    formDesc: 'An agent responsible for memory management — organizing, storing, and retrieving knowledge efficiently.',
  },
  evolution: {
    label: 'Evolution Agent',
    description: 'Drives self-improvement and system adaptation',
    role: 'evolution',
    goals: 'Propose improvements, Test changes, Deploy optimizations',
    tools: 'code-executor, analyzer, web-search',
    formDesc: 'An agent driving self-evolution — proposing, testing, and deploying system improvements.',
  },
  safety: {
    label: 'Safety Agent',
    description: 'Monitors and enforces safety constraints',
    role: 'safety',
    goals: 'Monitor compliance, Validate changes, Prevent violations',
    tools: 'analyzer, database, api-client',
    formDesc: 'An agent ensuring safety — monitoring compliance, validating changes, and preventing policy violations.',
  },
  deployment: {
    label: 'Deployment Agent',
    description: 'Handles system deployment and operations',
    role: 'deployment',
    goals: 'Manage deployments, Monitor health, Automate operations',
    tools: 'code-executor, api-client, web-search',
    formDesc: 'An agent handling deployments — managing rollouts, monitoring health, and automating operational tasks.',
  },
  custom: {
    label: 'Custom Agent',
    description: 'Start with a blank configuration',
    role: 'research',
    goals: '',
    tools: '',
    formDesc: '',
  },
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

// Quick action toolbar animation
const toolbarVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
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
// JSON syntax highlighter
// ---------------------------------------------------------------------------

function JsonViewer({ data }: { data: Record<string, unknown> }) {
  const formatted = JSON.stringify(data, null, 2)
  const lines = formatted.split('\n')

  const highlightLine = (line: string) => {
    // Key
    const keyMatch = line.match(/^(\s*)"([^"]+)":/)
    if (keyMatch) {
      const indent = keyMatch[1]
      const key = keyMatch[2]
      const rest = line.slice(keyMatch[0].length)
      // Value part
      const valueMatch = rest.match(/^\s*(.+),?\s*$/)
      if (valueMatch) {
        const rawValue = valueMatch[1]
        const comma = rest.endsWith(',') ? ',' : ''
        let valueClass = 'text-foreground'
        let displayValue = rawValue
        if (rawValue.startsWith('"')) {
          valueClass = 'text-green-600 dark:text-green-400'
          displayValue = rawValue
        } else if (rawValue === 'true' || rawValue === 'false') {
          valueClass = 'text-amber-600 dark:text-amber-400'
        } else if (!isNaN(Number(rawValue))) {
          valueClass = 'text-sky-600 dark:text-sky-400'
        }
        return (
          <>
            <span className="text-muted-foreground">{indent}</span>
            <span className="text-purple-600 dark:text-purple-400">&quot;{key}&quot;</span>
            <span className="text-muted-foreground">: </span>
            <span className={valueClass}>{displayValue}</span>
            {comma && <span className="text-muted-foreground">{comma}</span>}
          </>
        )
      }
    }
    // Array/bracket lines
    if (line.trim() === '{' || line.trim() === '}' || line.trim() === '[' || line.trim() === ']') {
      return <span className="text-muted-foreground">{line}</span>
    }
    if (line.trim() === '},' || line.trim() === '],') {
      return <span className="text-muted-foreground">{line}</span>
    }
    return <span className="text-foreground">{line}</span>
  }

  return (
    <ScrollArea className="max-h-64 w-full rounded-md border border-border bg-muted/30">
      <pre className="p-3 text-xs font-mono leading-relaxed">
        {lines.map((line, i) => (
          <div key={i} className="hover:bg-muted/50 px-1 -mx-1 rounded">
            {highlightLine(line)}
          </div>
        ))}
      </pre>
    </ScrollArea>
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
  const [editOpen, setEditOpen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Performance data for detail dialog
  const [performanceData, setPerformanceData] = useState<Array<{ day: string; rate: number }>>([])

  // Status history for detail dialog
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([])

  // Form state
  const [formName, setFormName] = useState('')
  const [formRole, setFormRole] = useState<AgentRole>('research')
  const [formDesc, setFormDesc] = useState('')
  const [formGoals, setFormGoals] = useState('')
  const [formTools, setFormTools] = useState('')
  const [formSuccessRate, setFormSuccessRate] = useState('0.8')
  const [formTemplate, setFormTemplate] = useState('custom')

  // Form validation
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editGoals, setEditGoals] = useState('')

  // Debounce search input
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value)
    }, 300)
  }, [])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

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

  // Filtered agents — uses debounced search
  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const matchesSearch =
        debouncedSearch === '' ||
        agent.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        agent.description.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        agent.tools.some((t) => t.toLowerCase().includes(debouncedSearch.toLowerCase()))
      const matchesRole = roleFilter === 'all' || agent.role === roleFilter
      return matchesSearch && matchesRole
    })
  }, [agents, debouncedSearch, roleFilter])

  // Status summary counts
  const statusCounts = useMemo(() => {
    const counts: Record<AgentStatus, number> = { active: 0, busy: 0, idle: 0, error: 0, offline: 0 }
    agents.forEach((a) => { counts[a.status] = (counts[a.status] || 0) + 1 })
    return counts
  }, [agents])

  // Active ratio for progress bar
  const activeRatio = useMemo(() => {
    if (agents.length === 0) return 0
    return (statusCounts.active + statusCounts.busy) / agents.length
  }, [agents.length, statusCounts])

  // Validate form
  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {}
    if (!formName.trim()) errors.name = 'Name is required'
    if (!formRole) errors.role = 'Role is required'
    const rate = parseFloat(formSuccessRate)
    if (isNaN(rate) || rate < 0 || rate > 1) errors.successRate = 'Success rate must be between 0 and 1'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }, [formName, formRole, formSuccessRate])

  const handleCreate = async () => {
    if (!validateForm()) return
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
          successRate: parseFloat(formSuccessRate),
        }),
      })
      if (res.ok) {
        setCreateOpen(false)
        resetCreateForm()
        await fetchAgents()
        toastSuccess('Agent created', `"${formName}" has been created successfully.`)
      } else {
        toastError('Failed to create agent', 'Could not create the agent. Please try again.')
      }
    } catch {
      toastError('Failed to create agent', 'A network error occurred.')
    } finally {
      setSubmitting(false)
    }
  }

  const resetCreateForm = () => {
    setFormName('')
    setFormRole('research')
    setFormDesc('')
    setFormGoals('')
    setFormTools('')
    setFormSuccessRate('0.8')
    setFormTemplate('custom')
    setFormErrors({})
  }

  const handleTemplateChange = (templateKey: string) => {
    setFormTemplate(templateKey)
    const template = ROLE_TEMPLATES[templateKey]
    if (template && templateKey !== 'custom') {
      setFormRole(template.role)
      setFormDesc(template.formDesc)
      setFormGoals(template.goals)
      setFormTools(template.tools)
    } else {
      setFormDesc('')
      setFormGoals('')
      setFormTools('')
    }
    setFormErrors({})
  }

  const openDetail = (agent: Agent) => {
    setSelectedAgent(agent)
    setPerformanceData(generatePerformanceData(agent.successRate))
    setStatusHistory(generateStatusHistory(agent.id))
    setDetailOpen(true)
  }

  const openEdit = (agent: Agent) => {
    setSelectedAgent(agent)
    setEditName(agent.name)
    setEditDesc(agent.description)
    setEditGoals((agent.goals ?? []).join(', '))
    setEditOpen(true)
  }

  const handleEdit = async () => {
    if (!selectedAgent) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/agents/${selectedAgent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          description: editDesc,
          goals: editGoals,
        }),
      })
      if (res.ok) {
        setEditOpen(false)
        await fetchAgents()
        toastSuccess('Agent updated', `"${editName}" has been updated successfully.`)
      } else {
        toastError('Failed to update agent', 'Could not update the agent. Please try again.')
      }
    } catch {
      toastError('Failed to update agent', 'A network error occurred.')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleAgentStatus = async (agent: Agent) => {
    const newStatus: AgentStatus = agent.status === 'active' || agent.status === 'busy' ? 'idle' : 'active'
    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        await fetchAgents()
        toastSuccess('Agent status changed', `"${agent.name}" is now ${newStatus}.`)
      } else {
        toastError('Failed to change status', 'Could not update agent status.')
      }
    } catch {
      toastError('Failed to change status', 'A network error occurred.')
    }
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
        <Card className="flex flex-col overflow-hidden hover:shadow-md hover:ring-2 hover:ring-primary/20 hover:scale-[1.01] transition-all duration-200 group relative">
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

          {/* Quick Action Toolbar — appears on hover */}
          <div className="absolute bottom-0 left-0 right-0 overflow-hidden">
            <motion.div
              variants={toolbarVariants}
              initial="hidden"
              whileHover="visible"
              className="flex items-center justify-center gap-1 bg-background/80 dark:bg-background/90 backdrop-blur-sm border-t border-border px-3 py-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200"
            >
              <Button
                variant="ghost"
                size="sm"
                className="min-h-[44px] min-w-[44px] h-11 w-11 p-0"
                title="View Details"
                onClick={(e) => { e.stopPropagation(); openDetail(agent) }}
              >
                <Eye className="size-3.5 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-[44px] min-w-[44px] h-11 w-11 p-0"
                title="Edit Agent"
                onClick={(e) => { e.stopPropagation(); openEdit(agent) }}
              >
                <Pencil className="size-3.5 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-[44px] min-w-[44px] h-11 w-11 p-0"
                title={agent.status === 'active' || agent.status === 'busy' ? 'Deactivate' : 'Activate'}
                onClick={(e) => { e.stopPropagation(); toggleAgentStatus(agent) }}
              >
                <Power className={cn('size-3.5', agent.status === 'active' || agent.status === 'busy' ? 'text-amber-500' : 'text-green-500')} />
              </Button>
            </motion.div>
          </div>
        </Card>
      </motion.div>
    )
  }

  const renderListView = () => (
    <div className="rounded-md border">
      {/* Desktop table header */}
      <div className="hidden md:grid grid-cols-6 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground border-b bg-muted/30">
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
              className="grid grid-cols-2 md:grid-cols-6 gap-2 md:gap-4 px-4 py-3 text-sm items-center border-b last:border-b-0 hover:bg-muted/30 cursor-pointer transition-colors"
              onClick={() => openDetail(agent)}
            >
              <span className="font-medium truncate text-foreground">{agent.name}</span>
              <span className="flex items-center gap-1.5 justify-end md:justify-start">
                <Badge variant="outline" className={cn('text-xs', ROLE_BADGE_BG[agent.role] ?? '')}>
                  <RoleIcon className={cn('size-3 mr-1', roleCfg.color)} />
                  <span className="hidden md:inline">{roleCfg.label}</span>
                </Badge>
                <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium md:hidden', statusCfg.labelBg)}>
                  {renderStatusDot(agent.status)}
                  {statusCfg.label}
                </span>
              </span>
              <span className={cn('hidden md:inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium w-fit', statusCfg.labelBg)}>
                {renderStatusDot(agent.status)}
                {statusCfg.label}
              </span>
              <span className={cn('font-medium', successRateTextColor(agent.successRate))}>
                {(agent.successRate * 100).toFixed(0)}%
              </span>
              <span className="text-foreground hidden md:block">{agent.tasksCompleted.toLocaleString()}</span>
              <span className="text-foreground hidden md:block">{formatTokens(agent.tokensUsed)}</span>
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
    <div className="space-y-4 md:space-y-6 overflow-x-hidden">
      {/* Header */}
      <PageHeader
        icon={Users}
        iconColor="purple"
        title="Agent Management"
        badge={<Badge variant="secondary" className="text-sm">{agents.length}</Badge>}
        actions={
          <>
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="size-4" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  const data = filteredAgents.map((a) => ({
                    Name: a.name,
                    Role: a.role,
                    Status: a.status,
                    Description: a.description,
                    'Success Rate': (a.successRate * 100).toFixed(1) + '%',
                    'Tasks Completed': a.tasksCompleted,
                    'Tokens Used': a.tokensUsed,
                    Goals: (a.goals ?? []).join('; '),
                    Tools: (a.tools ?? []).join('; '),
                    'Last Active': a.lastActive,
                    'Created At': a.createdAt,
                  }))
                  exportToCSV(data, 'agents')
                  toastSuccess('Export complete', 'Agents exported as CSV.')
                }}>
                  <FileSpreadsheet className="mr-2 size-4" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  const data = filteredAgents.map((a) => ({
                    name: a.name,
                    role: a.role,
                    status: a.status,
                    description: a.description,
                    successRate: a.successRate,
                    tasksCompleted: a.tasksCompleted,
                    tokensUsed: a.tokensUsed,
                    goals: a.goals,
                    tools: a.tools,
                    lastActive: a.lastActive,
                    createdAt: a.createdAt,
                  }))
                  exportToJSON(data, 'agents')
                  toastSuccess('Export complete', 'Agents exported as JSON.')
                }}>
                  <FileJson className="mr-2 size-4" />
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" onClick={() => { resetCreateForm(); setCreateOpen(true) }} className="min-h-[44px]">
              <Plus className="size-4 mr-1" />
              <span className="hidden sm:inline">Create </span>Agent
            </Button>
          </>
        }
      />

      {/* Status Summary — Mini-cards with icons */}
      <div className="space-y-3">
        <ScrollArea className="w-full">
          <div className="flex gap-3 pb-2">
            {(['active', 'busy', 'idle', 'error', 'offline'] as AgentStatus[]).map((status) => {
              const cfg = STATUS_SUMMARY_CONFIG[status]
              const count = statusCounts[status] ?? 0
              const StatusIcon = cfg.icon
              return (
                <div
                  key={status}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg border px-3 py-2 min-w-[120px]',
                    cfg.bgColor
                  )}
                >
                  <StatusIcon className={cn('size-4 shrink-0', cfg.iconColor)} />
                  <div className="flex flex-col">
                    <span className="text-lg font-semibold text-foreground leading-tight">{count}</span>
                    <span className="text-xs text-muted-foreground leading-tight">{STATUS_CONFIG[status].label}</span>
                  </div>
                </div>
              )
            })}
          </div>
          <ScrollBar orientation="horizontal" className="h-1.5" />
        </ScrollArea>

        {/* Active/Total ratio progress bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {statusCounts.active + statusCounts.busy} of {agents.length} active
          </span>
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${activeRatio * 100}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <span className="text-xs font-medium text-foreground whitespace-nowrap">
            {(activeRatio * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search agents by name, role, or tools..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 pr-16 bg-card border-border"
          />
          {/* Results count badge */}
          {debouncedSearch && (
            <Badge
              variant="secondary"
              className="absolute right-9 top-1/2 -translate-y-1/2 text-xs px-1.5 py-0"
            >
              {filteredAgents.length} of {agents.length}
            </Badge>
          )}
          {/* Clear button */}
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setDebouncedSearch('') }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="size-3.5" />
            </button>
          )}
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

      {/* Agent Detail Dialog — Tabbed layout */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl w-[calc(100vw-2rem)] max-h-[90vh] md:max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-foreground">{selectedAgent?.name ?? 'Agent Details'}</DialogTitle>
            <DialogDescription>Full agent information</DialogDescription>
          </DialogHeader>
          {selectedAgent && (
            <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
              <TabsList className="w-full">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="tools">Tools</TabsTrigger>
                <TabsTrigger value="configuration">Configuration</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="flex-1 overflow-y-auto mt-4 pr-1">
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

                  {/* Description */}
                  <div>
                    <h4 className="text-sm font-medium mb-1 text-foreground">Description</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{selectedAgent.description}</p>
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

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 md:gap-4 rounded-lg border border-border bg-muted/30 p-3 md:p-4">
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

                  {/* Status History Timeline */}
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-foreground">Status History</h4>
                    <div className="relative space-y-0">
                      {statusHistory.map((entry, i) => {
                        const fromCfg = STATUS_CONFIG[entry.from]
                        const toCfg = STATUS_CONFIG[entry.to]
                        return (
                          <div key={entry.id} className="flex items-start gap-3 pb-4 relative">
                            {/* Timeline line */}
                            {i < statusHistory.length - 1 && (
                              <div className="absolute left-[7px] top-4 bottom-0 w-px bg-border" />
                            )}
                            {/* Dot */}
                            <div className={cn('mt-1 size-3.5 rounded-full shrink-0 border-2 border-background ring-2', toCfg?.dotColor ?? 'bg-muted-foreground/50')} />
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium', fromCfg?.labelBg ?? '')}>
                                  {fromCfg?.label ?? entry.from}
                                </span>
                                <span className="text-muted-foreground text-xs">&rarr;</span>
                                <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium', toCfg?.labelBg ?? '')}>
                                  {toCfg?.label ?? entry.to}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{entry.reason}</p>
                              <p className="text-xs text-muted-foreground/60 mt-0.5">{timeAgo(entry.timestamp)}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Performance Tab */}
              <TabsContent value="performance" className="flex-1 overflow-y-auto mt-4 pr-1">
                <div className="space-y-5">
                  {/* Performance History Mini Chart */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Activity className="size-4 text-muted-foreground" />
                      <h4 className="text-sm font-medium text-foreground">Performance History (7 days)</h4>
                    </div>
                    <div className="h-32 w-full rounded-md border border-border bg-muted/30 p-2">
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

                  {/* Metrics Summary Table */}
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-foreground">Metrics Summary</h4>
                    <div className="rounded-md border border-border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Metric</th>
                            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Value</th>
                            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t border-border">
                            <td className="px-3 py-2 text-foreground">Success Rate</td>
                            <td className={cn('px-3 py-2 text-right font-medium', successRateTextColor(selectedAgent.successRate))}>
                              {(selectedAgent.successRate * 100).toFixed(1)}%
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Badge variant="outline" className={cn('text-xs', selectedAgent.successRate > 0.9 ? 'border-green-500/30 text-green-600 dark:text-green-400' : selectedAgent.successRate > 0.7 ? 'border-amber-500/30 text-amber-600 dark:text-amber-400' : 'border-red-500/30 text-red-600 dark:text-red-400')}>
                                {selectedAgent.successRate > 0.9 ? 'Excellent' : selectedAgent.successRate > 0.7 ? 'Good' : 'Needs Improvement'}
                              </Badge>
                            </td>
                          </tr>
                          <tr className="border-t border-border">
                            <td className="px-3 py-2 text-foreground">Tasks Completed</td>
                            <td className="px-3 py-2 text-right font-medium text-foreground">{selectedAgent.tasksCompleted.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right">
                              <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                                {selectedAgent.tasksCompleted > 100 ? 'High' : selectedAgent.tasksCompleted > 20 ? 'Medium' : 'Low'}
                              </Badge>
                            </td>
                          </tr>
                          <tr className="border-t border-border">
                            <td className="px-3 py-2 text-foreground">Tokens Used</td>
                            <td className="px-3 py-2 text-right font-medium text-foreground">{formatTokens(selectedAgent.tokensUsed)}</td>
                            <td className="px-3 py-2 text-right">
                              <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                                {selectedAgent.tokensUsed > 100000 ? 'Heavy' : selectedAgent.tokensUsed > 10000 ? 'Moderate' : 'Light'}
                              </Badge>
                            </td>
                          </tr>
                          <tr className="border-t border-border">
                            <td className="px-3 py-2 text-foreground">Avg Tokens/Task</td>
                            <td className="px-3 py-2 text-right font-medium text-foreground">
                              {selectedAgent.tasksCompleted > 0 ? formatTokens(Math.round(selectedAgent.tokensUsed / selectedAgent.tasksCompleted)) : 'N/A'}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                                Normal
                              </Badge>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Tools Tab */}
              <TabsContent value="tools" className="flex-1 overflow-y-auto mt-4 pr-1">
                {selectedAgent.tools.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedAgent.tools.map((tool, i) => {
                      const ToolIcon = getToolIcon(tool)
                      return (
                        <Card key={i} className="overflow-hidden">
                          <CardContent className="p-4 flex items-start gap-3">
                            <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                              <ToolIcon className="size-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-medium text-foreground">{tool}</h4>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {tool === 'web-search' ? 'Search and retrieve information from the web'
                                  : tool === 'code-executor' ? 'Execute and evaluate code snippets in a sandboxed environment'
                                  : tool === 'database' ? 'Query and manage structured data stores'
                                  : tool === 'analyzer' ? 'Analyze data patterns and extract insights'
                                  : tool === 'api-client' ? 'Interact with external APIs and services'
                                  : 'General-purpose utility tool'}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No tools configured for this agent.
                  </div>
                )}
              </TabsContent>

              {/* Configuration Tab */}
              <TabsContent value="configuration" className="flex-1 overflow-y-auto mt-4 pr-1">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-foreground">Agent Configuration</h4>
                    <JsonViewer data={selectedAgent.config} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:gap-4 rounded-lg border border-border bg-muted/30 p-3 md:p-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Created</span>
                      <p className="font-medium text-foreground">{new Date(selectedAgent.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Last Updated</span>
                      <p className="font-medium text-foreground">{new Date(selectedAgent.updatedAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Agent ID</span>
                      <p className="font-mono text-xs text-foreground truncate">{selectedAgent.id}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Role</span>
                      <p className="font-medium text-foreground capitalize">{selectedAgent.role}</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Agent Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Agent</DialogTitle>
            <DialogDescription>Update agent configuration</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea
                id="edit-desc"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-goals">Goals (comma-separated)</Label>
              <Input
                id="edit-goals"
                value={editGoals}
                onChange={(e) => setEditGoals(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={!editName || submitting}>
              {submitting && <Loader2 className="size-4 mr-1 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Agent Dialog — Enhanced with templates, validation, preview */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) resetCreateForm(); setCreateOpen(open) }}>
        <DialogContent className="max-w-2xl w-[calc(100vw-2rem)] max-h-[90vh] md:max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Create Agent</DialogTitle>
            <DialogDescription>Add a new agent to the system</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {/* Form — left side */}
              <div className="md:col-span-3 space-y-4">
                {/* Role Template */}
                <div className="space-y-2">
                  <Label htmlFor="agent-template">Role Template</Label>
                  <Select value={formTemplate} onValueChange={handleTemplateChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_TEMPLATES).map(([key, template]) => (
                        <SelectItem key={key} value={key}>
                          {template.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formTemplate !== 'custom' && (
                    <p className="text-xs text-muted-foreground">{ROLE_TEMPLATES[formTemplate]?.description}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agent-name">Name *</Label>
                  <Input
                    id="agent-name"
                    placeholder="Agent name"
                    value={formName}
                    onChange={(e) => { setFormName(e.target.value); if (formErrors.name) setFormErrors((prev) => { const next = { ...prev }; delete next.name; return next }) }}
                  />
                  {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agent-role">Role *</Label>
                  <Select value={formRole} onValueChange={(v) => { setFormRole(v as AgentRole); if (formErrors.role) setFormErrors((prev) => { const next = { ...prev }; delete next.role; return next }) }}>
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
                  {formErrors.role && <p className="text-xs text-destructive">{formErrors.role}</p>}
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
                  <Label htmlFor="agent-goals">Goals (comma-separated)</Label>
                  <Input
                    id="agent-goals"
                    placeholder="Enter goals separated by commas"
                    value={formGoals}
                    onChange={(e) => setFormGoals(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agent-tools">Tools (comma-separated)</Label>
                  <Input
                    id="agent-tools"
                    placeholder="Enter tools separated by commas"
                    value={formTools}
                    onChange={(e) => setFormTools(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agent-success-rate">Initial Success Rate (0-1)</Label>
                  <Input
                    id="agent-success-rate"
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={formSuccessRate}
                    onChange={(e) => { setFormSuccessRate(e.target.value); if (formErrors.successRate) setFormErrors((prev) => { const next = { ...prev }; delete next.successRate; return next }) }}
                  />
                  {formErrors.successRate && <p className="text-xs text-destructive">{formErrors.successRate}</p>}
                </div>
              </div>

              {/* Preview — right side */}
              <div className="md:col-span-2">
                <div className="sticky top-0">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Preview</h4>
                  <Card className="overflow-hidden">
                    <div className={cn('h-1 bg-gradient-to-r', ROLE_CONFIG[formRole]?.gradient ?? 'from-muted to-muted')} />
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm truncate text-foreground">
                          {formName || 'Agent Name'}
                        </h3>
                        <Badge variant="outline" className={cn('shrink-0 text-xs', ROLE_BADGE_BG[formRole] ?? '')}>
                          {(() => {
                            const RoleIcon = ROLE_CONFIG[formRole]?.icon ?? Search
                            return <RoleIcon className={cn('size-3 mr-1', ROLE_CONFIG[formRole]?.color ?? '')} />
                          })()}
                          {ROLE_CONFIG[formRole]?.label ?? 'Role'}
                        </Badge>
                      </div>
                      <div className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                        <span className="inline-block size-2 rounded-full bg-muted-foreground/50" />
                        Idle
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {formDesc || 'Agent description will appear here...'}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Success Rate</span>
                          <div className="font-semibold text-foreground">
                            {((parseFloat(formSuccessRate) || 0) * 100).toFixed(0)}%
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Tasks</span>
                          <div className="font-semibold text-foreground">0</div>
                        </div>
                      </div>
                      {formGoals && (
                        <div className="space-y-0.5">
                          <span className="text-xs text-muted-foreground">Goals</span>
                          {formGoals.split(',').map((g, i) => g.trim()).filter(Boolean).slice(0, 2).map((g, i) => (
                            <p key={i} className="text-xs text-muted-foreground truncate">&bull; {g}</p>
                          ))}
                        </div>
                      )}
                      {formTools && (
                        <div className="flex flex-wrap gap-1">
                          {formTools.split(',').map((t, i) => t.trim()).filter(Boolean).slice(0, 3).map((t, i) => {
                            const ToolIcon = getToolIcon(t)
                            return (
                              <Badge key={i} variant="outline" className="text-xs py-0 px-1.5 gap-0.5 text-muted-foreground">
                                <ToolIcon className="size-2.5" />
                                {t}
                              </Badge>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { resetCreateForm(); setCreateOpen(false) }}>
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
