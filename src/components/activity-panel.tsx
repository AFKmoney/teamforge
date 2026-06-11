'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  Info,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Download,
  FileSpreadsheet,
  FileJson,
  ChevronDown,
  ChevronRight,
  Clock,
  Zap,
  Timer,
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  RefreshCw,
  Eye,
  EyeOff,
  List,
  AlignJustify,
  Sparkles,
} from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@/components/ui/pagination'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import {
  Tooltip as TooltipUI,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { exportToCSV, exportToJSON } from '@/lib/export-utils'
import type { Variants } from 'framer-motion'
import { PageHeader } from '@/components/page-header'

// ---------------------------------------------------------------------------
// Local types (these models don't exist in the Prisma schema)
// ---------------------------------------------------------------------------

interface ActivityLog {
  id: string
  type: string
  message: string
  timestamp: string
  severity: string
}

interface SystemMetric {
  metric: string
  value: number
  unit: string
  timestamp: string
}

// ---------------------------------------------------------------------------
// Constants & Config
// ---------------------------------------------------------------------------

const SEVERITY_CONFIG: Record<
  string,
  { icon: typeof Info; color: string; bg: string; border: string; dot: string }
> = {
  info: {
    icon: Info,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-l-blue-500',
    dot: 'bg-blue-500',
  },
  success: {
    icon: CheckCircle2,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-l-emerald-500',
    dot: 'bg-emerald-500',
  },
  warning: {
    icon: AlertCircle,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-l-amber-500',
    dot: 'bg-amber-500',
  },
  error: {
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-l-red-500',
    dot: 'bg-red-500',
  },
}

const TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  agent: {
    label: 'Agent',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-500/10 dark:bg-green-500/20',
  },
  evolution: {
    label: 'Evolution',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
  },
  safety: {
    label: 'Safety',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
  },
  memory: {
    label: 'Memory',
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-500/10 dark:bg-sky-500/20',
  },
  benchmark: {
    label: 'Benchmark',
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-500/10 dark:bg-teal-500/20',
  },
  system: {
    label: 'System',
    color: 'text-foreground',
    bg: 'bg-muted',
  },
}

type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d'

const TIME_RANGE_CONFIG: Record<TimeRange, { label: string; hours: number }> = {
  '1h': { label: 'Last 1h', hours: 1 },
  '6h': { label: 'Last 6h', hours: 6 },
  '24h': { label: 'Last 24h', hours: 24 },
  '7d': { label: 'Last 7d', hours: 168 },
  '30d': { label: 'Last 30d', hours: 720 },
}

const ITEMS_PER_PAGE = 10

// ---------------------------------------------------------------------------
// Mock Activity Data
// ---------------------------------------------------------------------------

function generateMockActivities(): ActivityLog[] {
  const entries: ActivityLog[] = [
    { id: '1', type: 'agent', message: 'Research Agent completed task #847 — analyzed 42 papers on transformer architectures', timestamp: '2m ago', severity: 'success' },
    { id: '2', type: 'evolution', message: 'Prompt optimization deployed to production — 12% improvement in response quality', timestamp: '15m ago', severity: 'success' },
    { id: '3', type: 'safety', message: 'Constitutional rule violation detected: output exceeds token budget', timestamp: '23m ago', severity: 'warning' },
    { id: '4', type: 'memory', message: 'Semantic memory store compacted — freed 2.4GB of storage', timestamp: '31m ago', severity: 'info' },
    { id: '5', type: 'agent', message: 'Coding Agent encountered syntax error in generated module', timestamp: '45m ago', severity: 'error' },
    { id: '6', type: 'benchmark', message: 'MMLU benchmark completed — score improved to 87.3%', timestamp: '1h ago', severity: 'success' },
    { id: '7', type: 'system', message: 'Auto-scaling triggered — increased agent pool from 5 to 8', timestamp: '1h ago', severity: 'info' },
    { id: '8', type: 'evolution', message: 'New architecture mutation proposed: attention head reconfiguration', timestamp: '1.5h ago', severity: 'info' },
    { id: '9', type: 'safety', message: 'Sandbox escape attempt blocked — isolated and terminated process', timestamp: '2h ago', severity: 'error' },
    { id: '10', type: 'memory', message: 'Working memory limit reached — oldest entries evicted to episodic store', timestamp: '2h ago', severity: 'warning' },
    { id: '11', type: 'agent', message: 'Evaluation Agent validated 3 new evolution proposals', timestamp: '2.5h ago', severity: 'success' },
    { id: '12', type: 'benchmark', message: 'HumanEval benchmark run started — evaluating code generation capabilities', timestamp: '3h ago', severity: 'info' },
    { id: '13', type: 'evolution', message: 'Workflow optimization test passed — reducing pipeline latency by 23%', timestamp: '3.5h ago', severity: 'success' },
    { id: '14', type: 'system', message: 'Scheduled maintenance completed — database vacuum and index rebuild', timestamp: '4h ago', severity: 'info' },
    { id: '15', type: 'safety', message: 'Risk assessment threshold adjusted — medium-risk proposals now require approval', timestamp: '4.5h ago', severity: 'warning' },
    { id: '16', type: 'agent', message: 'Memory Agent indexed 156 new knowledge entries from latest research batch', timestamp: '5h ago', severity: 'success' },
    { id: '17', type: 'memory', message: 'Episodic memory retrieval optimization — 34% faster query times', timestamp: '5.5h ago', severity: 'success' },
    { id: '18', type: 'benchmark', message: 'GSM8K benchmark score dropped below threshold — investigation triggered', timestamp: '6h ago', severity: 'warning' },
    { id: '19', type: 'evolution', message: 'Tool integration test failed — code executor timeout exceeded', timestamp: '7h ago', severity: 'error' },
    { id: '20', type: 'system', message: 'System backup completed successfully — 847MB compressed archive', timestamp: '8h ago', severity: 'success' },
    { id: '21', type: 'agent', message: 'Deployment Agent rolled back version 2.3.1 due to performance regression', timestamp: '9h ago', severity: 'error' },
    { id: '22', type: 'safety', message: 'Constitutional rule #3 updated — expanded scope for output verification', timestamp: '10h ago', severity: 'info' },
    { id: '23', type: 'memory', message: 'Procedural memory updated — new task decomposition strategy stored', timestamp: '12h ago', severity: 'info' },
    { id: '24', type: 'evolution', message: 'Architecture search completed — 3 candidate configurations identified', timestamp: '14h ago', severity: 'success' },
    { id: '25', type: 'system', message: 'Token budget reset for current billing cycle — $47.20 remaining', timestamp: '16h ago', severity: 'info' },
    { id: '26', type: 'benchmark', message: 'Custom reasoning benchmark suite created — 15 test scenarios', timestamp: '18h ago', severity: 'info' },
    { id: '27', type: 'agent', message: 'Safety Agent paused evolution pipeline due to anomalous mutation rate', timestamp: '20h ago', severity: 'warning' },
    { id: '28', type: 'evolution', message: 'Evolution cycle #42 completed — 2 of 5 proposals validated', timestamp: '22h ago', severity: 'success' },
    { id: '29', type: 'system', message: 'Knowledge graph sync completed — 8 new nodes, 15 new edges', timestamp: '23h ago', severity: 'info' },
    { id: '30', type: 'safety', message: 'All safety checks passed — system integrity verified at 99.97%', timestamp: '24h ago', severity: 'success' },
  ]
  return entries
}

const MOCK_ACTIVITIES = generateMockActivities()

// ---------------------------------------------------------------------------
// Metric line configuration for the chart
// ---------------------------------------------------------------------------

interface MetricLineConfig {
  key: string
  label: string
  color: string
  gradientId: string
  active: boolean
}

const DEFAULT_METRIC_LINES: MetricLineConfig[] = [
  { key: 'cpu_usage', label: 'CPU Usage', color: '#f43f5e', gradientId: 'cpuGrad', active: true },
  { key: 'memory_usage', label: 'Memory Usage', color: '#8b5cf6', gradientId: 'memGrad', active: true },
  { key: 'task_success_rate', label: 'Success Rate', color: '#10b981', gradientId: 'successGrad', active: true },
  { key: 'cost', label: 'Cost (USD)', color: '#f59e0b', gradientId: 'costGrad', active: false },
]

// ---------------------------------------------------------------------------
// Chart Tooltip
// ---------------------------------------------------------------------------

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-4 py-3 shadow-lg">
      <p className="text-xs font-semibold text-foreground mb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2 text-xs">
            <span
              className="size-2.5 rounded-full shrink-0 ring-1 ring-white/20"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground min-w-[80px]">{entry.name}:</span>
            <span className="font-semibold text-foreground tabular-nums">
              {typeof entry.value === 'number'
                ? entry.value >= 100
                  ? entry.value.toFixed(0)
                  : entry.value.toFixed(2)
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Bar Chart Tooltip
// ---------------------------------------------------------------------------

function BarChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-4 py-3 shadow-lg">
      <p className="text-xs font-semibold text-foreground mb-1">{label}</p>
      <div className="flex items-center gap-2 text-xs">
        <span
          className="size-2.5 rounded-full shrink-0"
          style={{ backgroundColor: payload[0].color }}
        />
        <span className="text-muted-foreground">Count:</span>
        <span className="font-semibold text-foreground">{payload[0].value}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Custom Legend
// ---------------------------------------------------------------------------

function CustomLegend({
  payload,
  onToggle,
  metricLines,
}: {
  payload?: Array<{ value: string; color: string; dataKey: string }>
  onToggle: (key: string) => void
  metricLines: MetricLineConfig[]
}) {
  if (!payload?.length) return null
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
      {payload.map((entry) => {
        const line = metricLines.find((l) => l.key === entry.dataKey)
        const isActive = line?.active ?? true
        return (
          <button
            key={entry.dataKey}
            onClick={() => onToggle(entry.dataKey)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all',
              isActive
                ? 'bg-muted text-foreground shadow-sm'
                : 'bg-transparent text-muted-foreground opacity-40 hover:opacity-70 line-through'
            )}
          >
            <span
              className="size-2.5 rounded-full shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            {entry.value}
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ActivityPanel() {
  // Time range state
  const [timeRange, setTimeRange] = useState<TimeRange>('24h')
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  })
  const [customRangeActive, setCustomRangeActive] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)

  // Filter state
  const [activeSeverities, setActiveSeverities] = useState<Set<string>>(
    new Set(['info', 'success', 'warning', 'error'])
  )
  const [activeTypes, setActiveTypes] = useState<Set<string>>(
    new Set(['agent', 'evolution', 'safety', 'memory', 'benchmark', 'system'])
  )
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [readIds, setReadIds] = useState<Set<string>>(new Set())

  // Chart state
  const [metricLines, setMetricLines] = useState<MetricLineConfig[]>(DEFAULT_METRIC_LINES)
  const [metricsData, setMetricsData] = useState<SystemMetric[]>([])
  const [chartAnimated, setChartAnimated] = useState(false)

  // Pagination / scroll state
  const [currentPage, setCurrentPage] = useState(1)
  const [feedMode, setFeedMode] = useState<'pagination' | 'infinite'>('pagination')
  const [infiniteCount, setInfiniteCount] = useState(ITEMS_PER_PAGE)

  // Real-time state
  const [newActivityCount, setNewActivityCount] = useState(0)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [allActivities, setAllActivities] = useState<ActivityLog[]>(MOCK_ACTIVITIES)
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const simulationRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch metrics from API
  useEffect(() => {
    async function fetchMetrics() {
      try {
        const res = await fetch(`/api/metrics?hours=${TIME_RANGE_CONFIG[timeRange].hours}`)
        if (res.ok) {
          const data: SystemMetric[] = await res.json()
          setMetricsData(data)
        }
      } catch {
        // Silently handle — chart will show empty
      }
    }
    fetchMetrics()
  }, [timeRange])

  // Chart animation trigger
  useEffect(() => {
    const timer = setTimeout(() => setChartAnimated(true), 100)
    return () => clearTimeout(timer)
  }, [metricsData])

  // Auto-refresh toggle
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(() => {
        setIsRefreshing(true)
        fetch('/api/metrics?hours=' + TIME_RANGE_CONFIG[timeRange].hours)
          .then((res) => res.ok ? res.json() : [])
          .then((data: SystemMetric[]) => {
            if (data.length > 0) setMetricsData(data)
          })
          .catch(() => {})
          .finally(() => setIsRefreshing(false))
      }, 30000)
    }
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current)
    }
  }, [autoRefresh, timeRange])

  // Simulation: add new activities periodically
  useEffect(() => {
    simulationRef.current = setInterval(() => {
      const types = ['agent', 'evolution', 'safety', 'memory', 'benchmark', 'system'] as const
      const severities = ['info', 'success', 'warning', 'error'] as const
      const messages = [
        'Agent process heartbeat — all systems nominal',
        'Evolution proposal generated — pending validation',
        'Safety scan completed — no anomalies detected',
        'Memory cache refreshed — 12 entries updated',
        'Benchmark regression test queued',
        'System health check passed',
      ]
      const newActivity: ActivityLog = {
        id: `sim-${Date.now()}`,
        type: types[Math.floor(Math.random() * types.length)],
        message: messages[Math.floor(Math.random() * messages.length)],
        timestamp: 'Just now',
        severity: severities[Math.floor(Math.random() * severities.length)],
      }
      setNewActivityCount((prev) => prev + 1)
      setAllActivities((prev) => [newActivity, ...prev])
    }, 15000)
    return () => {
      if (simulationRef.current) clearInterval(simulationRef.current)
    }
  }, [])

  // Process metrics data into chart format
  const chartData = useMemo(() => {
    if (metricsData.length === 0) return []

    const grouped = new Map<string, Record<string, number>>()

    for (const m of metricsData) {
      const date = new Date(m.timestamp)
      const hourKey = `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:00`

      if (!grouped.has(hourKey)) {
        grouped.set(hourKey, {})
      }
      const entry = grouped.get(hourKey)!
      if (entry[m.metric] !== undefined) {
        entry[m.metric] = (entry[m.metric] + m.value) / 2
      } else {
        entry[m.metric] = m.value
      }
    }

    return Array.from(grouped.entries())
      .map(([time, values]) => ({ time, ...values }))
      .sort((a, b) => a.time.localeCompare(b.time))
  }, [metricsData])

  // Event counts by type for bar chart
  const eventCountsByType = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const typeKey of Object.keys(TYPE_CONFIG)) {
      counts[typeKey] = allActivities.filter(
        (a) => a.type === typeKey && activeSeverities.has(a.severity || 'info')
      ).length
    }
    return Object.entries(counts).map(([type, count]) => ({
      type: TYPE_CONFIG[type]?.label || type,
      count,
      fill: type === 'agent' ? '#8b5cf6'
        : type === 'evolution' ? '#10b981'
        : type === 'safety' ? '#f59e0b'
        : type === 'memory' ? '#0ea5e9'
        : type === 'benchmark' ? '#14b8a6'
        : '#6b7280',
    }))
  }, [allActivities, activeSeverities])

  // Filter activities based on time range, severity, and type
  const filteredActivities = useMemo(() => {
    return allActivities.filter((a) => {
      if (!activeSeverities.has(a.severity || 'info')) return false
      if (!activeTypes.has(a.type)) return false
      return true
    })
  }, [allActivities, activeSeverities, activeTypes])

  // Summary metrics
  const summaryMetrics = useMemo(() => {
    const total = filteredActivities.length
    const avgResponseTime = 234
    const errorRate =
      filteredActivities.filter((a) => a.severity === 'error').length /
      Math.max(filteredActivities.length, 1) *
      100
    const uptime = 99.97
    return { total, avgResponseTime, errorRate, uptime }
  }, [filteredActivities])

  // Pagination helpers
  const totalPages = Math.ceil(filteredActivities.length / ITEMS_PER_PAGE)
  const paginatedActivities = useMemo(() => {
    if (feedMode === 'pagination') {
      const start = (currentPage - 1) * ITEMS_PER_PAGE
      return filteredActivities.slice(start, start + ITEMS_PER_PAGE)
    }
    return filteredActivities.slice(0, infiniteCount)
  }, [filteredActivities, currentPage, feedMode, infiniteCount])

  const pageStart = feedMode === 'pagination'
    ? (currentPage - 1) * ITEMS_PER_PAGE + 1
    : 1
  const pageEnd = feedMode === 'pagination'
    ? Math.min(currentPage * ITEMS_PER_PAGE, filteredActivities.length)
    : Math.min(infiniteCount, filteredActivities.length)

  // Generate page numbers for pagination
  const getPageNumbers = useCallback(() => {
    const pages: (number | 'ellipsis')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push('ellipsis')
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      for (let i = start; i <= end; i++) pages.push(i)
      if (currentPage < totalPages - 2) pages.push('ellipsis')
      pages.push(totalPages)
    }
    return pages
  }, [currentPage, totalPages])

  // Helper to reset pagination when filters change
  const resetPagination = () => {
    setCurrentPage(1)
    setInfiniteCount(ITEMS_PER_PAGE)
  }

  // Toggle expanded item
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Toggle metric line visibility
  const toggleMetricLine = (key: string) => {
    setMetricLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, active: !l.active } : l))
    )
  }

  // Toggle severity filter
  const toggleSeverity = (severity: string) => {
    setActiveSeverities((prev) => {
      const next = new Set(prev)
      if (next.has(severity)) {
        if (next.size > 1) next.delete(severity)
      } else {
        next.add(severity)
      }
      return next
    })
    resetPagination()
  }

  // Toggle type filter
  const toggleType = (type: string) => {
    setActiveTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        if (next.size > 1) next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
    resetPagination()
  }

  // Toggle read/unread
  const toggleRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Handle new activities
  const handleShowNewActivities = () => {
    setNewActivityCount(0)
    setCurrentPage(1)
  }

  // Load more for infinite scroll
  const handleLoadMore = () => {
    setInfiniteCount((prev) => Math.min(prev + ITEMS_PER_PAGE, filteredActivities.length))
  }

  // Date range handler
  const handleDateRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from) {
      setDateRange({ from: range.from, to: range.to ?? range.from })
      if (range.to || range.from) {
        setCustomRangeActive(true)
      }
    } else {
      setDateRange({ from: undefined, to: undefined })
      setCustomRangeActive(false)
    }
  }

  // Format date range for display
  const formatDateRange = () => {
    if (!dateRange.from) return 'Custom range'
    const fromStr = dateRange.from.toLocaleDateString()
    if (!dateRange.to) return fromStr
    const toStr = dateRange.to.toLocaleDateString()
    return fromStr === toStr ? fromStr : `${fromStr} — ${toStr}`
  }

  // Export handlers
  const handleExportCSV = () => {
    const rangeLabel = customRangeActive ? formatDateRange().replace(/\s*—\s*/g, '_to_') : timeRange
    const data = filteredActivities.map((a) => ({
      ID: a.id,
      Type: a.type,
      Message: a.message,
      Timestamp: a.timestamp,
      Severity: a.severity || 'info',
      Read: readIds.has(a.id) ? 'Yes' : 'No',
    }))
    exportToCSV(data, `activity-log_${rangeLabel}`)
  }

  const handleExportJSON = () => {
    const rangeLabel = customRangeActive ? formatDateRange().replace(/\s*—\s*/g, '_to_') : timeRange
    const data = filteredActivities.map((a) => ({
      id: a.id,
      type: a.type,
      message: a.message,
      timestamp: a.timestamp,
      severity: a.severity || 'info',
      read: readIds.has(a.id),
    }))
    exportToJSON(data, `activity-log_${rangeLabel}`)
  }

  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.06 },
    },
  }

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 12, scale: 0.97 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 300, damping: 24 },
    },
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, x: -8 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { type: 'spring', stiffness: 300, damping: 24 },
    },
  }

  const newItemVariants = {
    initial: { opacity: 0, y: -20, scale: 0.95 },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 400, damping: 25 },
    },
    exit: { opacity: 0, y: -10, scale: 0.95 },
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4 md:space-y-6 overflow-x-hidden"
    >
      {/* Header */}
      <PageHeader
        icon={Activity}
        iconColor="rose"
        title="Activity Log"
        badge={<Badge variant="secondary" className="text-xs">{filteredActivities.length}</Badge>}
        actions={
          <>
            {/* Auto-refresh toggle */}
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              className={cn('h-9 gap-1.5 text-xs', autoRefresh && 'bg-emerald-600 hover:bg-emerald-700 text-white')}
              onClick={() => setAutoRefresh((prev) => !prev)}
            >
              <RefreshCw className={cn('size-3.5', isRefreshing && 'animate-spin')} />
              Auto
            </Button>

            {/* Feed mode toggle */}
            <ToggleGroup
              type="single"
              value={feedMode}
              onValueChange={(v) => { if (v) setFeedMode(v as 'pagination' | 'infinite') }}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="pagination" className="h-9 px-2.5 text-xs gap-1">
                <List className="size-3.5" />
                Pages
              </ToggleGroupItem>
              <ToggleGroupItem value="infinite" className="h-9 px-2.5 text-xs gap-1">
                <AlignJustify className="size-3.5" />
                Scroll
              </ToggleGroupItem>
            </ToggleGroup>

            {/* Export dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                  <Download className="size-3.5" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileSpreadsheet className="mr-2 size-4" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportJSON}>
                  <FileJson className="mr-2 size-4" />
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {/* Time Range Selector */}
      <motion.div variants={cardVariants}>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground shrink-0">
                <Clock className="size-4 text-muted-foreground" />
                Time Range
              </div>
              <ToggleGroup
                type="single"
                value={customRangeActive ? 'custom' : timeRange}
                onValueChange={(v) => {
                  if (!v) return
                  if (v === 'custom') return
                  setCustomRangeActive(false)
                  setTimeRange(v as TimeRange)
                  resetPagination()
                }}
                variant="outline"
                className="flex-wrap"
              >
                {Object.entries(TIME_RANGE_CONFIG).map(([key, cfg]) => (
                  <ToggleGroupItem key={key} value={key} className="text-xs px-3 h-8">
                    {cfg.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>

              <Separator orientation="vertical" className="hidden sm:block h-6" />

              {/* Date Range Picker */}
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={customRangeActive ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'h-8 gap-1.5 text-xs',
                      customRangeActive && 'bg-rose-600 hover:bg-rose-700 text-white'
                    )}
                  >
                    <Calendar className="size-3.5" />
                    {customRangeActive ? formatDateRange() : 'Custom Range'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={handleDateRangeSelect as never}
                    numberOfMonths={2}
                  />
                  <div className="flex items-center justify-between p-3 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setDateRange({ from: undefined, to: undefined })
                        setCustomRangeActive(false)
                        setCalendarOpen(false)
                      }}
                    >
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setCustomRangeActive(true)
                        setCalendarOpen(false)
                      }}
                    >
                      Apply
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Summary Metrics Row */}
      <motion.div variants={containerVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <motion.div variants={cardVariants}>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Events</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{summaryMetrics.total}</p>
                </div>
                <div className="size-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Zap className="size-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants}>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Avg Response Time</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{summaryMetrics.avgResponseTime}ms</p>
                </div>
                <div className="size-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Timer className="size-4 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants}>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Error Rate</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{summaryMetrics.errorRate.toFixed(1)}%</p>
                </div>
                <div className="size-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants}>
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Uptime</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{summaryMetrics.uptime}%</p>
                </div>
                <div className="size-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <ArrowUpRight className="size-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
        {/* Performance Trends — Area Chart */}
        <motion.div variants={cardVariants} className="lg:col-span-2">
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-sm font-semibold text-foreground">Performance Trends ({TIME_RANGE_CONFIG[timeRange].label})</h3>
              </div>
              <div className="h-[200px] md:h-[300px]">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} animationDuration={chartAnimated ? 1200 : 0}>
                      <defs>
                        {metricLines.map((line) => (
                          <linearGradient key={line.gradientId} id={line.gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={line.color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={line.color} stopOpacity={0.02} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        width={45}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend
                        content={({ payload }) => (
                          <CustomLegend
                            payload={payload}
                            onToggle={toggleMetricLine}
                            metricLines={metricLines}
                          />
                        )}
                      />
                      {metricLines
                        .filter((l) => l.active)
                        .map((line) => (
                          <Area
                            key={line.key}
                            type="monotone"
                            dataKey={line.key}
                            name={line.label}
                            stroke={line.color}
                            strokeWidth={3}
                            fill={`url(#${line.gradientId})`}
                            dot={false}
                            activeDot={{ r: 5, strokeWidth: 2, stroke: line.color, fill: 'hsl(var(--popover))' }}
                            animationDuration={1200}
                            animationEasing="ease-out"
                          />
                        ))}
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    <div className="flex flex-col items-center gap-2">
                      <Activity className="size-8 opacity-30" />
                      <span>No metrics data available</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Event Counts by Type — Bar Chart */}
        <motion.div variants={cardVariants}>
          <Card className="h-full">
            <CardContent className="p-4 md:p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">Events by Type</h3>
              <div className="h-[200px] md:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={eventCountsByType}
                    animationDuration={chartAnimated ? 1000 : 0}
                    animationEasing="ease-out"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis
                      dataKey="type"
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      width={35}
                      allowDecimals={false}
                    />
                    <Tooltip content={<BarChartTooltip />} />
                    <Bar
                      dataKey="count"
                      radius={[6, 6, 0, 0]}
                      animationDuration={1000}
                    >
                      {eventCountsByType.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filter Badges */}
      <motion.div variants={cardVariants} className="space-y-3">
        {/* Severity Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground shrink-0">Severity:</span>
          {Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon
            const isActive = activeSeverities.has(key)
            return (
              <button
                key={key}
                onClick={() => toggleSeverity(key)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all border',
                  isActive
                    ? cn(cfg.bg, cfg.color, 'border-transparent shadow-sm')
                    : 'bg-transparent text-muted-foreground border-border opacity-50 hover:opacity-80'
                )}
              >
                <Icon className="size-3" />
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            )
          })}
        </div>

        {/* Type Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground shrink-0">Type:</span>
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
            const isActive = activeTypes.has(key)
            return (
              <button
                key={key}
                onClick={() => toggleType(key)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all border',
                  isActive
                    ? cn(cfg.bg, cfg.color, 'border-transparent shadow-sm')
                    : 'bg-transparent text-muted-foreground border-border opacity-50 hover:opacity-80'
                )}
              >
                {cfg.label}
              </button>
            )
          })}
        </div>
      </motion.div>

      {/* New Activity Badge */}
      <AnimatePresence>
        {newActivityCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex justify-center"
          >
            <button
              onClick={handleShowNewActivities}
              className="inline-flex items-center gap-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-medium shadow-lg transition-colors"
            >
              <Sparkles className="size-3.5" />
              {newActivityCount} new {newActivityCount === 1 ? 'activity' : 'activities'}
              <ChevronDown className="size-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Activity Feed */}
      <motion.div variants={cardVariants}>
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center gap-2 px-4 md:px-6 pt-4 md:pt-6 pb-2">
              <Clock className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Activity Feed</h3>
              <Badge variant="outline" className="text-[10px] h-5">
                {filteredActivities.length} items
              </Badge>
              <span className="ml-auto text-xs text-muted-foreground">
                Showing {pageStart}–{pageEnd} of {filteredActivities.length}
              </span>
            </div>
            <Separator className="mx-4 md:mx-6" />
            <ScrollArea className="max-h-[calc(100vh-20rem)]">
              <div className="divide-y divide-border">
                <AnimatePresence mode="popLayout">
                  {paginatedActivities.map((activity, index) => {
                    const severity = activity.severity || 'info'
                    const sevCfg = SEVERITY_CONFIG[severity]
                    const typeCfg = TYPE_CONFIG[activity.type]
                    const SevIcon = sevCfg.icon
                    const isExpanded = expandedIds.has(activity.id)
                    const isRead = readIds.has(activity.id)

                    return (
                      <motion.div
                        key={activity.id}
                        variants={index < 3 && activity.timestamp === 'Just now' ? newItemVariants : itemVariants}
                        initial={index < 3 && activity.timestamp === 'Just now' ? 'initial' : 'hidden'}
                        animate={index < 3 && activity.timestamp === 'Just now' ? 'animate' : 'visible'}
                        exit="exit"
                        layout
                        className={cn(
                          'group border-l-4 transition-colors hover:bg-muted/40',
                          sevCfg.border,
                          isRead && 'opacity-60'
                        )}
                      >
                        <button
                          onClick={() => toggleExpand(activity.id)}
                          className="w-full flex items-start gap-3 px-4 md:px-6 py-3 text-left"
                        >
                          {/* Severity dot */}
                          <div className="flex items-center gap-2 pt-0.5 shrink-0">
                            <span className={cn('size-2 rounded-full shrink-0', sevCfg.dot)} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <Badge
                                variant="secondary"
                                className={cn('text-[10px] h-5 px-1.5', typeCfg.bg, typeCfg.color)}
                              >
                                {typeCfg.label}
                              </Badge>
                              <Badge
                                variant="secondary"
                                className={cn('text-[10px] h-5 px-1.5 gap-0.5', sevCfg.bg, sevCfg.color)}
                              >
                                <SevIcon className="size-2.5" />
                                {severity}
                              </Badge>
                            </div>
                            <p className={cn(
                              'text-sm text-foreground leading-snug line-clamp-2',
                              isRead && 'text-muted-foreground'
                            )}>
                              {activity.message}
                            </p>
                            <div className="flex items-center gap-3 mt-0.5">
                              <TooltipUI>
                                <TooltipTrigger asChild>
                                  <span className="text-xs text-muted-foreground cursor-default">
                                    {activity.timestamp}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
                                </TooltipContent>
                              </TooltipUI>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="shrink-0 flex items-center gap-1 pt-1">
                            {/* Mark as read/unread */}
                            <TooltipUI>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleRead(activity.id)
                                  }}
                                  className="size-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                                >
                                  {isRead ? (
                                    <EyeOff className="size-3" />
                                  ) : (
                                    <Eye className="size-3" />
                                  )}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {isRead ? 'Mark as Unread' : 'Mark as Read'}
                              </TooltipContent>
                            </TooltipUI>

                            {/* Expand chevron */}
                            <div className="text-muted-foreground">
                              {isExpanded ? (
                                <ChevronDown className="size-4" />
                              ) : (
                                <ChevronRight className="size-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </div>
                          </div>
                        </button>

                        {/* Expanded detail */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="px-4 md:px-6 pb-3 pl-12"
                            >
                              <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs text-muted-foreground space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-foreground">ID:</span>
                                  <span className="font-mono">{activity.id}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-foreground">Type:</span>
                                  <span className={typeCfg.color}>{typeCfg.label}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-foreground">Severity:</span>
                                  <span className={sevCfg.color}>{severity}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-foreground">Timestamp:</span>
                                  <span>{activity.timestamp}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-foreground">Status:</span>
                                  <span>{isRead ? 'Read' : 'Unread'}</span>
                                </div>
                                <Separator className="my-1.5" />
                                <p className="text-foreground/80 leading-relaxed">{activity.message}</p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>

                {filteredActivities.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Activity className="size-8 opacity-30 mb-2" />
                    <p className="text-sm">No activities match your filters</p>
                    <p className="text-xs mt-1">Try adjusting the severity or type filter</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Pagination Controls */}
            {filteredActivities.length > 0 && (
              <div className="border-t border-border">
                {feedMode === 'pagination' ? (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 md:px-6 py-3">
                    <span className="text-xs text-muted-foreground">
                      Showing {pageStart}–{pageEnd} of {filteredActivities.length} items
                    </span>
                    <Pagination>
                      <PaginationContent className="flex-wrap gap-1">
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            className={cn(
                              currentPage === 1 && 'pointer-events-none opacity-50'
                            )}
                          />
                        </PaginationItem>
                        {getPageNumbers().map((page, i) =>
                          page === 'ellipsis' ? (
                            <PaginationItem key={`ellipsis-${i}`} className="hidden sm:block">
                              <PaginationEllipsis />
                            </PaginationItem>
                          ) : (
                            <PaginationItem key={page}>
                              <PaginationLink
                                onClick={() => setCurrentPage(page)}
                                isActive={currentPage === page}
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          )
                        )}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            className={cn(
                              currentPage === totalPages && 'pointer-events-none opacity-50'
                            )}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 md:px-6 py-3">
                    <span className="text-xs text-muted-foreground">
                      Showing {pageEnd} of {filteredActivities.length} items
                    </span>
                    {infiniteCount < filteredActivities.length && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={handleLoadMore}
                      >
                        Load More ({filteredActivities.length - infiniteCount} remaining)
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
