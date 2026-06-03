'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
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
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { exportToCSV, exportToJSON } from '@/lib/export-utils'
import type { ActivityLog, SystemMetric } from '@/lib/types'

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
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-500/10 dark:bg-purple-500/20',
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
  active: boolean
}

const DEFAULT_METRIC_LINES: MetricLineConfig[] = [
  { key: 'cpu_usage', label: 'CPU Usage', color: '#f43f5e', active: true },
  { key: 'memory_usage', label: 'Memory Usage', color: '#8b5cf6', active: true },
  { key: 'task_success_rate', label: 'Success Rate', color: '#10b981', active: true },
  { key: 'cost', label: 'Cost (USD)', color: '#f59e0b', active: false },
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
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-xs">
          <span
            className="size-2 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">
            {typeof entry.value === 'number'
              ? entry.value >= 100
                ? entry.value.toFixed(0)
                : entry.value.toFixed(2)
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ActivityPanel() {
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [metricLines, setMetricLines] = useState<MetricLineConfig[]>(DEFAULT_METRIC_LINES)
  const [metricsData, setMetricsData] = useState<SystemMetric[]>([])

  // Fetch metrics from API
  useEffect(() => {
    async function fetchMetrics() {
      try {
        const res = await fetch('/api/metrics?hours=24')
        if (res.ok) {
          const data: SystemMetric[] = await res.json()
          setMetricsData(data)
        }
      } catch {
        // Silently handle — chart will show empty
      }
    }
    fetchMetrics()
  }, [])

  // Process metrics data into chart format
  const chartData = useMemo(() => {
    if (metricsData.length === 0) return []

    // Group by timestamp (rounded to nearest hour)
    const grouped = new Map<string, Record<string, number>>()

    for (const m of metricsData) {
      const date = new Date(m.timestamp)
      const hourKey = `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:00`

      if (!grouped.has(hourKey)) {
        grouped.set(hourKey, {})
      }
      const entry = grouped.get(hourKey)!
      // Average values for same metric in same hour
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

  // Filter activities
  const filteredActivities = useMemo(() => {
    return MOCK_ACTIVITIES.filter((a) => {
      if (severityFilter !== 'all' && a.severity !== severityFilter) return false
      if (typeFilter !== 'all' && a.type !== typeFilter) return false
      return true
    })
  }, [severityFilter, typeFilter])

  // Summary metrics
  const summaryMetrics = useMemo(() => {
    const total24h = MOCK_ACTIVITIES.length
    const avgResponseTime = 234 // ms mock
    const errorRate =
      MOCK_ACTIVITIES.filter((a) => a.severity === 'error').length /
      MOCK_ACTIVITIES.length *
      100
    const uptime = 99.97
    return { total24h, avgResponseTime, errorRate, uptime }
  }, [])

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

  // Export handlers
  const handleExportCSV = () => {
    const data = filteredActivities.map((a) => ({
      ID: a.id,
      Type: a.type,
      Message: a.message,
      Timestamp: a.timestamp,
      Severity: a.severity || 'info',
    }))
    exportToCSV(data, 'activity-log')
  }

  const handleExportJSON = () => {
    const data = filteredActivities.map((a) => ({
      id: a.id,
      type: a.type,
      message: a.message,
      timestamp: a.timestamp,
      severity: a.severity || 'info',
    }))
    exportToJSON(data, 'activity-log')
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.06 },
    },
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 12, scale: 0.97 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 300, damping: 24 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -8 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { type: 'spring', stiffness: 300, damping: 24 },
    },
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={cardVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-rose-500/10">
            <Activity className="size-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foreground">Activity Log</h2>
            <Badge variant="secondary" className="text-xs">
              {filteredActivities.length}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Severity filter */}
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>

          {/* Type filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="agent">Agent</SelectItem>
              <SelectItem value="evolution">Evolution</SelectItem>
              <SelectItem value="safety">Safety</SelectItem>
              <SelectItem value="memory">Memory</SelectItem>
              <SelectItem value="benchmark">Benchmark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>

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
        </div>
      </motion.div>

      {/* Summary Metrics Row */}
      <motion.div variants={containerVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={cardVariants}>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Events (24h)</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{summaryMetrics.total24h}</p>
                </div>
                <div className="size-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Zap className="size-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants}>
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Avg Response Time</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{summaryMetrics.avgResponseTime}ms</p>
                </div>
                <div className="size-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Timer className="size-4 text-purple-600 dark:text-purple-400" />
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

      {/* Real-time Metrics Chart */}
      <motion.div variants={cardVariants}>
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h3 className="text-sm font-semibold text-foreground">System Metrics (24h)</h3>
              <div className="flex flex-wrap gap-2">
                {metricLines.map((line) => (
                  <button
                    key={line.key}
                    onClick={() => toggleMetricLine(line.key)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all',
                      line.active
                        ? 'bg-muted text-foreground shadow-sm'
                        : 'bg-transparent text-muted-foreground opacity-50 hover:opacity-80'
                    )}
                  >
                    <span
                      className="size-2 rounded-full shrink-0"
                      style={{ backgroundColor: line.color }}
                    />
                    {line.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-64 md:h-72">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
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
                    {metricLines
                      .filter((l) => l.active)
                      .map((line) => (
                        <Line
                          key={line.key}
                          type="monotone"
                          dataKey={line.key}
                          name={line.label}
                          stroke={line.color}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                      ))}
                  </LineChart>
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
            </div>
            <Separator className="mx-4 md:mx-6" />
            <ScrollArea className="max-h-[calc(100vh-16rem)]">
              <div className="divide-y divide-border">
                {filteredActivities.map((activity, index) => {
                  const severity = activity.severity || 'info'
                  const sevCfg = SEVERITY_CONFIG[severity]
                  const typeCfg = TYPE_CONFIG[activity.type]
                  const SevIcon = sevCfg.icon
                  const isExpanded = expandedIds.has(activity.id)

                  return (
                    <motion.div
                      key={activity.id}
                      variants={itemVariants}
                      custom={index}
                      className={cn(
                        'group border-l-4 transition-colors hover:bg-muted/40',
                        sevCfg.border
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
                          <div className="flex items-center gap-2 mb-0.5">
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
                          <p className="text-sm text-foreground leading-snug line-clamp-2">
                            {activity.message}
                          </p>
                          <span className="text-xs text-muted-foreground mt-0.5 block">
                            {activity.timestamp}
                          </span>
                        </div>

                        {/* Expand chevron */}
                        <div className="shrink-0 pt-1 text-muted-foreground">
                          {isExpanded ? (
                            <ChevronDown className="size-4" />
                          ) : (
                            <ChevronRight className="size-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </button>

                      {/* Expanded detail */}
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
                              <span>{activity.id}</span>
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
                            <Separator className="my-1.5" />
                            <p className="text-foreground/80 leading-relaxed">{activity.message}</p>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )
                })}

                {filteredActivities.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Activity className="size-8 opacity-30 mb-2" />
                    <p className="text-sm">No activities match your filters</p>
                    <p className="text-xs mt-1">Try adjusting the severity or type filter</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
