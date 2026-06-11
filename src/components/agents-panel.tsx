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
  Shield,
  Rocket,
  Loader2,
  Filter,
  Eye,
  Pencil,
  Power,
  CheckCircle2,
  Clock,
  Moon,
  AlertTriangle,
  PowerOff,
  Upload,
  FileUp,
  CheckCircle,
  AlertCircle as AlertCircleIcon,
  Download,
  FileSpreadsheet,
  FileJson,
  X,
  TestTube,
  PenTool,
  ClipboardList,
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
import { AGENT_ROLE_CONFIG, AGENT_STATUS_CONFIG } from '@/lib/types'
import { cn } from '@/lib/utils'
import { exportToCSV, exportToJSON } from '@/lib/export-utils'
import { parseCSV, parseJSON, validateImportData, readFileAsText } from '@/lib/import-utils'
import type { ValidationResult } from '@/lib/import-utils'
import { toastSuccess, toastError, toastWarning, toastInfo } from '@/lib/toast-utils'
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
  const statuses: AgentStatus[] = ['idle', 'thinking', 'coding', 'reviewing', 'testing', 'deploying', 'sleeping']
  const reasons: Record<AgentStatus, string[]> = {
    idle: ['No pending tasks', 'Waiting for input', 'Task completed'],
    thinking: ['Analyzing requirements', 'Planning approach', 'Evaluating options'],
    coding: ['Implementing feature', 'Fixing bug', 'Refactoring code'],
    reviewing: ['Code review started', 'Quality check', 'Peer review'],
    testing: ['Running test suite', 'Validating changes', 'Integration testing'],
    deploying: ['Deploying to staging', 'Rolling out update', 'CI/CD pipeline'],
    sleeping: ['Maintenance mode', 'Scheduled downtime', 'Manual shutdown'],
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
// Extended role config with Lucide icons and gradients (supplements AGENT_ROLE_CONFIG)
// ---------------------------------------------------------------------------

const ROLE_LUCIDE_ICON: Record<AgentRole, typeof Search> = {
  architect: BarChart,
  developer: Code,
  reviewer: Eye,
  tester: TestTube,
  devops: Rocket,
  pm: ClipboardList,
}

const ROLE_GRADIENT: Record<AgentRole, string> = {
  architect: 'from-green-500 to-green-600',
  developer: 'from-emerald-500 to-emerald-600',
  reviewer: 'from-blue-500 to-blue-600',
  tester: 'from-amber-500 to-amber-600',
  devops: 'from-orange-500 to-orange-600',
  pm: 'from-pink-500 to-pink-600',
}

const ROLE_BADGE_BG: Record<AgentRole, string> = {
  architect: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  developer: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  reviewer: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  tester: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  devops: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  pm: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
}

// Extended status config with UI properties (supplements AGENT_STATUS_CONFIG)
const STATUS_UI_CONFIG: Record<AgentStatus, { pulse: boolean; labelBg: string }> = {
  idle: { pulse: false, labelBg: 'bg-muted text-muted-foreground' },
  thinking: { pulse: true, labelBg: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  coding: { pulse: true, labelBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  reviewing: { pulse: true, labelBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  testing: { pulse: true, labelBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  deploying: { pulse: true, labelBg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  sleeping: { pulse: false, labelBg: 'bg-muted text-muted-foreground' },
}

// Status summary mini-card config with icons
const STATUS_SUMMARY_CONFIG: Record<AgentStatus, { icon: typeof CheckCircle2; iconColor: string; bgColor: string }> = {
  idle: { icon: Moon, iconColor: 'text-muted-foreground', bgColor: 'bg-muted/50 border-border' },
  thinking: { icon: Activity, iconColor: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-500/10 dark:bg-green-500/15 border-green-500/20' },
  coding: { icon: Code, iconColor: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/20' },
  reviewing: { icon: Eye, iconColor: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-500/10 dark:bg-blue-500/15 border-blue-500/20' },
  testing: { icon: TestTube, iconColor: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/20' },
  deploying: { icon: Rocket, iconColor: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-500/10 dark:bg-orange-500/15 border-orange-500/20' },
  sleeping: { icon: PowerOff, iconColor: 'text-muted-foreground/70', bgColor: 'bg-muted/30 border-border' },
}

// ---------------------------------------------------------------------------
// Role templates for create dialog
// ---------------------------------------------------------------------------

interface RoleTemplate {
  label: string
  description: string
  role: AgentRole
  avatar: string
  specialty: string
}

const ROLE_TEMPLATES: Record<string, RoleTemplate> = {
  architect: {
    label: 'Architect Agent',
    description: 'System design & architecture',
    role: 'architect',
    avatar: '🏗️',
    specialty: 'System design & architecture',
  },
  developer: {
    label: 'Developer Agent',
    description: 'Code implementation',
    role: 'developer',
    avatar: '💻',
    specialty: 'Code implementation',
  },
  reviewer: {
    label: 'Reviewer Agent',
    description: 'Code review & quality',
    role: 'reviewer',
    avatar: '🔍',
    specialty: 'Code review & quality',
  },
  tester: {
    label: 'Tester Agent',
    description: 'Testing & validation',
    role: 'tester',
    avatar: '🧪',
    specialty: 'Testing & validation',
  },
  devops: {
    label: 'DevOps Agent',
    description: 'CI/CD & deployment',
    role: 'devops',
    avatar: '🚀',
    specialty: 'CI/CD & deployment',
  },
  pm: {
    label: 'PM Agent',
    description: 'Project management',
    role: 'pm',
    avatar: '📋',
    specialty: 'Project management',
  },
  custom: {
    label: 'Custom Agent',
    description: 'Start with a blank configuration',
    role: 'developer',
    avatar: '🤖',
    specialty: '',
  },
}

// All valid AgentRole values
const ALL_ROLES: AgentRole[] = ['architect', 'developer', 'reviewer', 'tester', 'devops', 'pm']
const ALL_STATUSES: AgentStatus[] = ['idle', 'thinking', 'coding', 'reviewing', 'testing', 'deploying', 'sleeping']

// "Active" statuses are those where the agent is doing work
const ACTIVE_STATUSES: AgentStatus[] = ['thinking', 'coding', 'reviewing', 'testing', 'deploying']

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
// JSON syntax highlighter for detail dialog
// ---------------------------------------------------------------------------

function JsonViewer({ data }: { data: Record<string, unknown> }) {
  const formatted = JSON.stringify(data, null, 2)
  const lines = formatted.split('\n')

  const highlightLine = (line: string) => {
    const keyMatch = line.match(/^(\s*)"([^"]+)":/)
    if (keyMatch) {
      const indent = keyMatch[1]
      const key = keyMatch[2]
      const rest = line.slice(keyMatch[0].length)
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
            <span className="text-green-600 dark:text-green-400">&quot;{key}&quot;</span>
            <span className="text-muted-foreground">: </span>
            <span className={valueClass}>{displayValue}</span>
            {comma && <span className="text-muted-foreground">{comma}</span>}
          </>
        )
      }
    }
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

  // Create form state
  const [formName, setFormName] = useState('')
  const [formRole, setFormRole] = useState<AgentRole>('developer')
  const [formAvatar, setFormAvatar] = useState('🤖')
  const [formSpecialty, setFormSpecialty] = useState('')
  const [formStatus, setFormStatus] = useState<AgentStatus>('idle')
  const [formTemplate, setFormTemplate] = useState('custom')

  // Form validation
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState<AgentRole>('developer')
  const [editAvatar, setEditAvatar] = useState('')
  const [editSpecialty, setEditSpecialty] = useState('')
  const [editStatus, setEditStatus] = useState<AgentStatus>('idle')

  // Import state
  const [importOpen, setImportOpen] = useState(false)
  const [importFileType, setImportFileType] = useState<'csv' | 'json'>('csv')
  const [importRawData, setImportRawData] = useState<Record<string, unknown>[]>([])
  const [importValidation, setImportValidation] = useState<ValidationResult | null>(null)
  const [importFileName, setImportFileName] = useState('')
  const [importProgress, setImportProgress] = useState(0)
  const [importing, setImporting] = useState(false)
  const [importDragOver, setImportDragOver] = useState(false)
  const importFileRef = useRef<HTMLInputElement>(null)

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
        const data: Agent[] = await res.json()
        setAgents(data)
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
        agent.specialty.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        AGENT_ROLE_CONFIG[agent.role]?.label.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        AGENT_STATUS_CONFIG[agent.status]?.label.toLowerCase().includes(debouncedSearch.toLowerCase())
      const matchesRole = roleFilter === 'all' || agent.role === roleFilter
      return matchesSearch && matchesRole
    })
  }, [agents, debouncedSearch, roleFilter])

  // Status summary counts
  const statusCounts = useMemo(() => {
    const counts: Record<AgentStatus, number> = { idle: 0, thinking: 0, coding: 0, reviewing: 0, testing: 0, deploying: 0, sleeping: 0 }
    agents.forEach((a) => { counts[a.status] = (counts[a.status] || 0) + 1 })
    return counts
  }, [agents])

  // Active ratio for progress bar
  const activeRatio = useMemo(() => {
    if (agents.length === 0) return 0
    const activeCount = ACTIVE_STATUSES.reduce((sum, s) => sum + (statusCounts[s] || 0), 0)
    return activeCount / agents.length
  }, [agents.length, statusCounts])

  // Validate form
  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {}
    if (!formName.trim()) errors.name = 'Name is required'
    if (!formRole) errors.role = 'Role is required'
    if (!formSpecialty.trim()) errors.specialty = 'Specialty is required'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }, [formName, formRole, formSpecialty])

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
          avatar: formAvatar,
          specialty: formSpecialty,
          status: formStatus,
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
    setFormRole('developer')
    setFormAvatar('🤖')
    setFormSpecialty('')
    setFormStatus('idle')
    setFormTemplate('custom')
    setFormErrors({})
  }

  const handleTemplateChange = (templateKey: string) => {
    setFormTemplate(templateKey)
    const template = ROLE_TEMPLATES[templateKey]
    if (template && templateKey !== 'custom') {
      setFormRole(template.role)
      setFormAvatar(template.avatar)
      setFormSpecialty(template.specialty)
    } else {
      setFormAvatar('🤖')
      setFormSpecialty('')
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
    setEditRole(agent.role)
    setEditAvatar(agent.avatar)
    setEditSpecialty(agent.specialty)
    setEditStatus(agent.status)
    setEditOpen(true)
  }

  const handleEdit = async () => {
    if (!selectedAgent) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/agents/${selectedAgent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          role: editRole,
          avatar: editAvatar,
          specialty: editSpecialty,
          status: editStatus,
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
    const isActive = ACTIVE_STATUSES.includes(agent.status)
    const newStatus: AgentStatus = isActive ? 'idle' : 'coding'
    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        await fetchAgents()
        toastSuccess('Agent status changed', `"${agent.name}" is now ${AGENT_STATUS_CONFIG[newStatus].label}.`)
      } else {
        toastError('Failed to change status', 'Could not update agent status.')
      }
    } catch {
      toastError('Failed to change status', 'A network error occurred.')
    }
  }

  // ---------------------------------------------------------------------------
  // Import handlers
  // ---------------------------------------------------------------------------

  const handleImportFile = useCallback(async (file: File) => {
    setImportFileName(file.name)
    const ext = file.name.split('.').pop()?.toLowerCase()
    const type = ext === 'json' ? 'json' : 'csv'
    setImportFileType(type)

    try {
      const text = await readFileAsText(file)
      let parsed: Record<string, unknown>[] = []

      if (type === 'json') {
        const result = parseJSON(text)
        if (result.error) {
          toastError('Parse error', result.error)
          return
        }
        parsed = result.data
      } else {
        parsed = parseCSV(text).map((row) => {
          const obj: Record<string, unknown> = {}
          for (const [key, val] of Object.entries(row)) {
            obj[key] = val
          }
          return obj
        })
      }

      setImportRawData(parsed)
      const validation = validateImportData(parsed, ['name', 'role'])
      setImportValidation(validation)
    } catch {
      toastError('File error', 'Could not read the file.')
    }
  }, [])

  const handleImportDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setImportDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleImportFile(file)
  }, [handleImportFile])

  const handleImportFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleImportFile(file)
  }, [handleImportFile])

  const resetImportState = useCallback(() => {
    setImportRawData([])
    setImportValidation(null)
    setImportFileName('')
    setImportProgress(0)
    setImporting(false)
    setImportDragOver(false)
  }, [])

  const handleImport = useCallback(async () => {
    if (!importValidation || importValidation.data.length === 0) return
    setImporting(true)
    let created = 0
    let failed = 0

    for (let i = 0; i < importValidation.data.length; i++) {
      const row = importValidation.data[i]
      setImportProgress(Math.round(((i + 1) / importValidation.data.length) * 100))
      try {
        const res = await fetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: String(row.name ?? row.Name ?? ''),
            role: String(row.role ?? row.Role ?? 'developer'),
            avatar: String(row.avatar ?? row.Avatar ?? '🤖'),
            specialty: String(row.specialty ?? row.Specialty ?? ''),
            status: String(row.status ?? row.Status ?? 'idle'),
          }),
        })
        if (res.ok) {
          created++
        } else {
          failed++
        }
      } catch {
        failed++
      }
    }

    setImporting(false)
    setImportOpen(false)
    resetImportState()
    await fetchAgents()

    if (failed === 0) {
      toastSuccess('Import complete', `${created} agent(s) imported successfully.`)
    } else {
      toastWarning('Import completed with errors', `${created} succeeded, ${failed} failed.`)
    }
  }, [importValidation, fetchAgents, resetImportState])

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
    const cfg = AGENT_STATUS_CONFIG[status] ?? AGENT_STATUS_CONFIG.idle
    const uiCfg = STATUS_UI_CONFIG[status] ?? STATUS_UI_CONFIG.idle
    return (
      <span
        className={cn('inline-block size-2 rounded-full', cfg.dotColor, uiCfg.pulse && 'animate-pulse')}
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
    const roleCfg = AGENT_ROLE_CONFIG[agent.role] ?? AGENT_ROLE_CONFIG.developer
    const RoleIcon = ROLE_LUCIDE_ICON[agent.role] ?? Code
    const statusCfg = AGENT_STATUS_CONFIG[agent.status] ?? AGENT_STATUS_CONFIG.idle
    const statusUiCfg = STATUS_UI_CONFIG[agent.status] ?? STATUS_UI_CONFIG.idle
    const gradient = ROLE_GRADIENT[agent.role] ?? 'from-muted to-muted'

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
          <div className={cn('h-1 bg-gradient-to-r', gradient)} />

          <CardContent className="p-4 flex flex-col gap-3 flex-1">
            {/* Header: Avatar + Name + Role badge */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg shrink-0">{agent.avatar || roleCfg.icon}</span>
                <h3 className="font-semibold text-sm leading-tight truncate text-foreground">
                  {agent.name}
                </h3>
              </div>
              <Badge variant="outline" className={cn('shrink-0 text-xs', ROLE_BADGE_BG[agent.role] ?? '')}>
                <RoleIcon className={cn('size-3 mr-1', roleCfg.color)} />
                {roleCfg.label}
              </Badge>
            </div>

            {/* Status with background */}
            <div className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium w-fit', statusUiCfg.labelBg)}>
              {renderStatusDot(agent.status)}
              {statusCfg.label}
            </div>

            {/* Specialty */}
            {agent.specialty && (
              <p className="text-sm text-muted-foreground line-clamp-2">{agent.specialty}</p>
            )}

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

            {/* Current Task */}
            {agent.currentTaskId && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3" />
                <span className="truncate">Task: {agent.currentTaskId}</span>
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
                title={ACTIVE_STATUSES.includes(agent.status) ? 'Set Idle' : 'Set Coding'}
                onClick={(e) => { e.stopPropagation(); toggleAgentStatus(agent) }}
              >
                <Power className={cn('size-3.5', ACTIVE_STATUSES.includes(agent.status) ? 'text-amber-500' : 'text-green-500')} />
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
      <div className="hidden md:grid grid-cols-7 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground border-b bg-muted/30">
        <span>Name</span>
        <span>Role</span>
        <span>Status</span>
        <span>Specialty</span>
        <span>Success Rate</span>
        <span>Tasks</span>
        <span>Tokens</span>
      </div>
      <AnimatePresence>
        {filteredAgents.map((agent, index) => {
          const roleCfg = AGENT_ROLE_CONFIG[agent.role] ?? AGENT_ROLE_CONFIG.developer
          const RoleIcon = ROLE_LUCIDE_ICON[agent.role] ?? Code
          const statusCfg = AGENT_STATUS_CONFIG[agent.status] ?? AGENT_STATUS_CONFIG.idle
          const statusUiCfg = STATUS_UI_CONFIG[agent.status] ?? STATUS_UI_CONFIG.idle
          return (
            <motion.div
              key={agent.id}
              custom={index}
              variants={listRowVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="grid grid-cols-2 md:grid-cols-7 gap-2 md:gap-4 px-4 py-3 text-sm items-center border-b last:border-b-0 hover:bg-muted/30 cursor-pointer transition-colors"
              onClick={() => openDetail(agent)}
            >
              <span className="font-medium truncate text-foreground flex items-center gap-1.5">
                <span className="shrink-0">{agent.avatar || roleCfg.icon}</span>
                {agent.name}
              </span>
              <span className="flex items-center gap-1.5 justify-end md:justify-start">
                <Badge variant="outline" className={cn('text-xs', ROLE_BADGE_BG[agent.role] ?? '')}>
                  <RoleIcon className={cn('size-3 mr-1', roleCfg.color)} />
                  <span className="hidden md:inline">{roleCfg.label}</span>
                </Badge>
                <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium md:hidden', statusUiCfg.labelBg)}>
                  {renderStatusDot(agent.status)}
                  {statusCfg.label}
                </span>
              </span>
              <span className={cn('hidden md:inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium w-fit', statusUiCfg.labelBg)}>
                {renderStatusDot(agent.status)}
                {statusCfg.label}
              </span>
              <span className="text-muted-foreground hidden md:block truncate">{agent.specialty}</span>
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
        iconColor="green"
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
                    Avatar: a.avatar,
                    Specialty: a.specialty,
                    'Success Rate': (a.successRate * 100).toFixed(1) + '%',
                    'Tasks Completed': a.tasksCompleted,
                    'Tokens Used': a.tokensUsed,
                    'Current Task': a.currentTaskId ?? '',
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
                    id: a.id,
                    name: a.name,
                    role: a.role,
                    status: a.status,
                    avatar: a.avatar,
                    specialty: a.specialty,
                    currentTaskId: a.currentTaskId,
                    successRate: a.successRate,
                    tasksCompleted: a.tasksCompleted,
                    tokensUsed: a.tokensUsed,
                    lastActive: a.lastActive,
                    createdAt: a.createdAt,
                    updatedAt: a.updatedAt,
                  }))
                  exportToJSON(data, 'agents')
                  toastSuccess('Export complete', 'Agents exported as JSON.')
                }}>
                  <FileJson className="mr-2 size-4" />
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => { resetImportState(); setImportOpen(true) }}
            >
              <Upload className="size-4" />
              <span className="hidden sm:inline">Import</span>
            </Button>
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
            {ALL_STATUSES.map((status) => {
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
                    <span className="text-xs text-muted-foreground leading-tight">{AGENT_STATUS_CONFIG[status].label}</span>
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
            {ACTIVE_STATUSES.reduce((sum, s) => sum + (statusCounts[s] || 0), 0)} of {agents.length} active
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
            placeholder="Search agents by name, specialty, or role..."
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
            {ALL_ROLES.map((key) => (
              <SelectItem key={key} value={key}>
                {AGENT_ROLE_CONFIG[key].label}
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
            <DialogTitle className="text-foreground flex items-center gap-2">
              <span className="text-lg">{selectedAgent?.avatar || AGENT_ROLE_CONFIG[selectedAgent?.role ?? 'developer']?.icon}</span>
              {selectedAgent?.name ?? 'Agent Details'}
            </DialogTitle>
            <DialogDescription>Full agent information</DialogDescription>
          </DialogHeader>
          {selectedAgent && (
            <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
              <TabsList className="w-full">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="flex-1 overflow-y-auto mt-4 pr-1">
                <div className="space-y-5">
                  {/* Role + Status */}
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={ROLE_BADGE_BG[selectedAgent.role] ?? ''}>
                      {(() => {
                        const RoleIcon = ROLE_LUCIDE_ICON[selectedAgent.role] ?? Code
                        return <RoleIcon className={cn('size-3 mr-1', AGENT_ROLE_CONFIG[selectedAgent.role]?.color ?? '')} />
                      })()}
                      {AGENT_ROLE_CONFIG[selectedAgent.role]?.label ?? selectedAgent.role}
                    </Badge>
                    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium', STATUS_UI_CONFIG[selectedAgent.status]?.labelBg ?? '')}>
                      {renderStatusDot(selectedAgent.status)}
                      {AGENT_STATUS_CONFIG[selectedAgent.status]?.label ?? selectedAgent.status}
                    </span>
                  </div>

                  {/* Specialty */}
                  <div>
                    <h4 className="text-sm font-medium mb-1 text-foreground">Specialty</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{selectedAgent.specialty || 'No specialty defined'}</p>
                  </div>

                  {/* Current Task */}
                  {selectedAgent.currentTaskId && (
                    <div>
                      <h4 className="text-sm font-medium mb-1 text-foreground">Current Task</h4>
                      <p className="text-sm text-muted-foreground font-mono">{selectedAgent.currentTaskId}</p>
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
                        const fromCfg = AGENT_STATUS_CONFIG[entry.from]
                        const toCfg = AGENT_STATUS_CONFIG[entry.to]
                        const fromUiCfg = STATUS_UI_CONFIG[entry.from]
                        const toUiCfg = STATUS_UI_CONFIG[entry.to]
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
                                <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium', fromUiCfg?.labelBg ?? '')}>
                                  {fromCfg?.label ?? entry.from}
                                </span>
                                <span className="text-muted-foreground text-xs">&rarr;</span>
                                <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium', toUiCfg?.labelBg ?? '')}>
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

              {/* Details Tab — JSON view of all agent fields */}
              <TabsContent value="details" className="flex-1 overflow-y-auto mt-4 pr-1">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-foreground">Agent Data</h4>
                    <JsonViewer data={{
                      id: selectedAgent.id,
                      name: selectedAgent.name,
                      role: selectedAgent.role,
                      status: selectedAgent.status,
                      avatar: selectedAgent.avatar,
                      specialty: selectedAgent.specialty,
                      currentTaskId: selectedAgent.currentTaskId,
                      tokensUsed: selectedAgent.tokensUsed,
                      tasksCompleted: selectedAgent.tasksCompleted,
                      successRate: selectedAgent.successRate,
                      lastActive: selectedAgent.lastActive,
                      createdAt: selectedAgent.createdAt,
                      updatedAt: selectedAgent.updatedAt,
                    }} />
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
              <Label htmlFor="edit-role">Role</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as AgentRole)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.map((key) => (
                    <SelectItem key={key} value={key}>
                      {AGENT_ROLE_CONFIG[key].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-avatar">Avatar (emoji)</Label>
              <Input
                id="edit-avatar"
                value={editAvatar}
                onChange={(e) => setEditAvatar(e.target.value)}
                placeholder="🤖"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-specialty">Specialty</Label>
              <Textarea
                id="edit-specialty"
                value={editSpecialty}
                onChange={(e) => setEditSpecialty(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as AgentStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_STATUSES.map((key) => (
                    <SelectItem key={key} value={key}>
                      {AGENT_STATUS_CONFIG[key].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                      {ALL_ROLES.map((key) => (
                        <SelectItem key={key} value={key}>
                          {AGENT_ROLE_CONFIG[key].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.role && <p className="text-xs text-destructive">{formErrors.role}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agent-avatar">Avatar (emoji)</Label>
                  <Input
                    id="agent-avatar"
                    placeholder="🤖"
                    value={formAvatar}
                    onChange={(e) => setFormAvatar(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agent-specialty">Specialty *</Label>
                  <Textarea
                    id="agent-specialty"
                    placeholder="Describe the agent's specialty"
                    value={formSpecialty}
                    onChange={(e) => { setFormSpecialty(e.target.value); if (formErrors.specialty) setFormErrors((prev) => { const next = { ...prev }; delete next.specialty; return next }) }}
                  />
                  {formErrors.specialty && <p className="text-xs text-destructive">{formErrors.specialty}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agent-status">Initial Status</Label>
                  <Select value={formStatus} onValueChange={(v) => setFormStatus(v as AgentStatus)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_STATUSES.map((key) => (
                        <SelectItem key={key} value={key}>
                          {AGENT_STATUS_CONFIG[key].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Preview — right side */}
              <div className="md:col-span-2">
                <div className="sticky top-0">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Preview</h4>
                  <Card className="overflow-hidden">
                    <div className={cn('h-1 bg-gradient-to-r', ROLE_GRADIENT[formRole] ?? 'from-muted to-muted')} />
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-lg">{formAvatar || AGENT_ROLE_CONFIG[formRole]?.icon || '🤖'}</span>
                          <h3 className="font-semibold text-sm truncate text-foreground">
                            {formName || 'Agent Name'}
                          </h3>
                        </div>
                        <Badge variant="outline" className={cn('shrink-0 text-xs', ROLE_BADGE_BG[formRole] ?? '')}>
                          {(() => {
                            const PreviewIcon = ROLE_LUCIDE_ICON[formRole] ?? Code
                            return <PreviewIcon className={cn('size-3 mr-1', AGENT_ROLE_CONFIG[formRole]?.color ?? '')} />
                          })()}
                          {AGENT_ROLE_CONFIG[formRole]?.label ?? 'Role'}
                        </Badge>
                      </div>
                      <div className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium', STATUS_UI_CONFIG[formStatus]?.labelBg ?? STATUS_UI_CONFIG.idle.labelBg)}>
                        {renderStatusDot(formStatus)}
                        {AGENT_STATUS_CONFIG[formStatus]?.label ?? 'Idle'}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {formSpecialty || 'Agent specialty will appear here...'}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Success Rate</span>
                          <div className="font-semibold text-foreground">0%</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Tasks</span>
                          <div className="font-semibold text-foreground">0</div>
                        </div>
                      </div>
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
            <Button onClick={handleCreate} disabled={!formName || !formRole || !formSpecialty || submitting}>
              {submitting && <Loader2 className="size-4 mr-1 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Import Dialog ─── */}
      <Dialog open={importOpen} onOpenChange={(open) => { if (!open) resetImportState(); setImportOpen(open) }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="size-5 text-primary" />
              Import Agents
            </DialogTitle>
            <DialogDescription>
              Upload a CSV or JSON file to bulk-import agents. Required fields: name, role.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2">
            {/* File type selector */}
            <div className="flex items-center gap-2">
              <Label className="text-sm text-foreground">File Type:</Label>
              <div className="flex border rounded-md border-border">
                <Button
                  variant={importFileType === 'csv' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-r-none"
                  onClick={() => setImportFileType('csv')}
                >
                  <FileSpreadsheet className="size-3.5 mr-1" />
                  CSV
                </Button>
                <Button
                  variant={importFileType === 'json' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-l-none"
                  onClick={() => setImportFileType('json')}
                >
                  <FileJson className="size-3.5 mr-1" />
                  JSON
                </Button>
              </div>
            </div>

            {/* Drop zone */}
            <div
              className={cn(
                'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
                importDragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/30'
              )}
              onDragOver={(e) => { e.preventDefault(); setImportDragOver(true) }}
              onDragLeave={() => setImportDragOver(false)}
              onDrop={handleImportDrop}
              onClick={() => importFileRef.current?.click()}
            >
              <input
                ref={importFileRef}
                type="file"
                accept={importFileType === 'csv' ? '.csv' : '.json'}
                className="hidden"
                onChange={handleImportFileSelect}
              />
              <Upload className={cn('size-10 mx-auto mb-3', importDragOver ? 'text-primary' : 'text-muted-foreground')} />
              {importFileName ? (
                <p className="text-sm font-medium text-foreground">{importFileName}</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-foreground">
                    Drag & drop your {importFileType.toUpperCase()} file here
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">or click to select a file</p>
                </>
              )}
            </div>

            {/* Validation summary */}
            {importValidation && (
              <div className={cn(
                'rounded-lg p-3 text-sm',
                importValidation.valid
                  ? 'bg-emerald-500/10 border border-emerald-500/20'
                  : 'bg-amber-500/10 border border-amber-500/20'
              )}>
                <div className="flex items-center gap-2 font-medium">
                  {importValidation.valid ? (
                    <CheckCircle className="size-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertCircleIcon className="size-4 text-amber-600 dark:text-amber-400" />
                  )}
                  Validation Result
                </div>
                <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="size-3 text-emerald-600 dark:text-emerald-400" />
                    {importValidation.validCount} valid rows
                  </span>
                  {importValidation.invalidCount > 0 && (
                    <span className="flex items-center gap-1">
                      <AlertCircleIcon className="size-3 text-amber-600 dark:text-amber-400" />
                      {importValidation.invalidCount} errors
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    {importRawData.length} total rows
                  </span>
                </div>
                {importValidation.errors.length > 0 && (
                  <div className="mt-2 max-h-24 overflow-y-auto text-xs text-amber-600 dark:text-amber-400 space-y-0.5">
                    {importValidation.errors.slice(0, 10).map((err, i) => (
                      <p key={i}>{err}</p>
                    ))}
                    {importValidation.errors.length > 10 && (
                      <p>...and {importValidation.errors.length - 10} more errors</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Preview table */}
            {importRawData.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Preview (first 5 rows)
                </Label>
                <ScrollArea className="max-h-48 rounded-md border border-border">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          {Object.keys(importRawData[0]).map((key) => (
                            <th key={key} className="px-3 py-2 text-left font-medium text-foreground whitespace-nowrap">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importRawData.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-b border-border/50 last:border-0">
                            {Object.keys(importRawData[0]).map((key) => (
                              <td key={key} className="px-3 py-1.5 text-muted-foreground whitespace-nowrap max-w-[200px] truncate">
                                {String(row[key] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Progress */}
            {importing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Importing agents...</span>
                  <span>{importProgress}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${importProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetImportState(); setImportOpen(false) }} disabled={importing}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importValidation || importValidation.validCount === 0 || importing}
            >
              {importing ? (
                <>
                  <Loader2 className="size-4 mr-1 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="size-4 mr-1" />
                  Import {importValidation?.validCount ?? 0} Agents
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
