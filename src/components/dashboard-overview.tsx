'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion'
import {
  Users,
  Database,
  Dna,
  Shield,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Zap,
  ArrowRight,
  ArrowUpRight,
  Cpu,
  HardDrive,
  Wifi,
  Activity,
  Bot,
  CheckCircle2,
  Info,
  AlertCircle,
  XCircle,
  ChevronRight,
  Gauge,
  BarChart3,
  Coins,
  HeartPulse,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { TourWelcomeCard } from '@/components/onboarding-tour'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Line, LineChart, XAxis, YAxis, CartesianGrid } from 'recharts'
import { useAppStore } from '@/lib/store'
import { useSimulation } from '@/hooks/use-simulation'
import type { EvolutionEvent, SystemMetric, ActivityLog } from '@/lib/types'

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
}

// Activity feed item animation variants (for sliding in from left)
const activityItemVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
}

// ---------------------------------------------------------------------------
// Chart config
// ---------------------------------------------------------------------------

const performanceChartConfig: ChartConfig = {
  task_success_rate: {
    label: 'Success Rate',
    color: 'var(--chart-1)',
  },
  cost: {
    label: 'Cost',
    color: 'var(--chart-2)',
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const statusColors: Record<string, string> = {
  proposed: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  testing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  validated: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  deployed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const typeBadgeColors: Record<string, string> = {
  prompt: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  workflow: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  architecture: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  tool: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
}

function safetyScoreColor(score: number): string {
  if (score > 90) return 'text-emerald-600 dark:text-emerald-400'
  if (score > 70) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function parseJSONField<T>(field: unknown): T {
  if (typeof field === 'string') {
    try {
      return JSON.parse(field)
    } catch {
      return field as unknown as T
    }
  }
  return field as T
}

// ---------------------------------------------------------------------------
// Gauge color helper
// ---------------------------------------------------------------------------

function gaugeColor(value: number): string {
  if (value < 50) return 'text-emerald-500 dark:text-emerald-400'
  if (value <= 75) return 'text-amber-500 dark:text-amber-400'
  return 'text-red-500 dark:text-red-400'
}

function gaugeStroke(value: number): string {
  if (value < 50) return 'stroke-emerald-500 dark:stroke-emerald-400'
  if (value <= 75) return 'stroke-amber-500 dark:stroke-amber-400'
  return 'stroke-red-500 dark:stroke-red-400'
}

// ---------------------------------------------------------------------------
// Mini Sparkline Component
// ---------------------------------------------------------------------------

function MiniSparkline({ data, color = 'emerald', width = 60, height = 24 }: {
  data: number[]
  color?: string
  width?: number
  height?: number
}) {
  if (data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const colorMap: Record<string, string> = {
    emerald: 'stroke-emerald-500 dark:stroke-emerald-400',
    violet: 'stroke-violet-500 dark:stroke-violet-400',
    amber: 'stroke-amber-500 dark:stroke-amber-400',
    rose: 'stroke-rose-500 dark:stroke-rose-400',
  }

  const strokeClass = colorMap[color] ?? colorMap.emerald

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((v - min) / range) * (height - 4) - 2
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={points}
        fill="none"
        className={strokeClass}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Animated Count-Up Component (with value-change flash)
// ---------------------------------------------------------------------------

function CountUp({ target, duration = 1.2, className }: {
  target: number
  duration?: number
  className?: string
}) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => Math.round(v))
  const [display, setDisplay] = useState(0)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      const controls = animate(count, target, { duration, ease: 'easeOut' })
      isFirstRender.current = false
      return controls.stop
    }
    const controls = animate(count, target, { duration: 0.6, ease: 'easeOut' })
    return controls.stop
  }, [target, duration, count])

  useEffect(() => {
    const unsubscribe = rounded.on('change', (v) => setDisplay(v))
    return unsubscribe
  }, [rounded])

  return (
    <span
      key={target}
      className={cn(
        className,
        'animate-[flash-fade_500ms_ease-out_forwards]'
      )}
    >
      {display}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Circular Gauge Component (with pulsing ring)
// ---------------------------------------------------------------------------

function CircularGauge({ value, label, icon: Icon }: {
  value: number
  label: string
  icon: React.ComponentType<{ className?: string }>
}) {
  const radius = 36
  const stroke = 6
  const normalizedRadius = radius - stroke / 2
  const circumference = 2 * Math.PI * normalizedRadius
  const strokeDashoffset = circumference - (value / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        {/* Pulsing ring */}
        <svg
          width={radius * 2 + 12}
          height={radius * 2 + 12}
          className="absolute -top-[6px] -left-[6px] animate-gauge-pulse"
        >
          <circle
            cx={radius + 6}
            cy={radius + 6}
            r={normalizedRadius + 4}
            fill="none"
            strokeWidth={2}
            className={cn(gaugeStroke(value), 'opacity-30')}
          />
        </svg>
        <svg
          width={radius * 2}
          height={radius * 2}
          className="-rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-muted/40"
          />
          {/* Foreground arc */}
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={cn('transition-all duration-700 ease-out', gaugeStroke(value))}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('text-sm font-bold', gaugeColor(value))}>
            <CountUp target={value} duration={1} />
            <span className="text-[10px]">%</span>
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        <span>{label}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Activity Feed Mock Data
// ---------------------------------------------------------------------------

function generateActivityItems(agentCount: number, activeAgentCount: number): ActivityLog[] {
  const items: ActivityLog[] = [
    {
      id: 'act-1',
      type: 'agent',
      message: `Research Agent completed task #47`,
      timestamp: new Date(Date.now() - 120000).toISOString(),
      severity: 'success',
    },
    {
      id: 'act-2',
      type: 'evolution',
      message: 'New prompt evolution proposed for coding agent',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      severity: 'info',
    },
    {
      id: 'act-3',
      type: 'safety',
      message: 'Safety validation passed for change #12',
      timestamp: new Date(Date.now() - 480000).toISOString(),
      severity: 'success',
    },
    {
      id: 'act-4',
      type: 'memory',
      message: 'Episodic memory archived (30 days old)',
      timestamp: new Date(Date.now() - 720000).toISOString(),
      severity: 'info',
    },
    {
      id: 'act-5',
      type: 'system',
      message: 'System health check completed',
      timestamp: new Date(Date.now() - 900000).toISOString(),
      severity: 'info',
    },
    {
      id: 'act-6',
      type: 'benchmark',
      message: 'Reasoning benchmark improved by 3.2%',
      timestamp: new Date(Date.now() - 1200000).toISOString(),
      severity: 'success',
    },
    {
      id: 'act-7',
      type: 'safety',
      message: `Warning: Agent CPU usage above threshold (${activeAgentCount}/${agentCount} active)`,
      timestamp: new Date(Date.now() - 1500000).toISOString(),
      severity: 'warning',
    },
    {
      id: 'act-8',
      type: 'evolution',
      message: 'Architecture evolution deployed to production',
      timestamp: new Date(Date.now() - 2100000).toISOString(),
      severity: 'success',
    },
  ]
  return items
}

// ---------------------------------------------------------------------------
// Severity / type icon + color maps for activity feed
// ---------------------------------------------------------------------------

const severityIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertCircle,
  error: XCircle,
}

const severityColorMap: Record<string, string> = {
  info: 'text-sky-500 dark:text-sky-400',
  success: 'text-emerald-500 dark:text-emerald-400',
  warning: 'text-amber-500 dark:text-amber-400',
  error: 'text-red-500 dark:text-red-400',
}

const typeColorMap: Record<string, string> = {
  agent: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  evolution: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  safety: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  memory: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  benchmark: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  system: 'bg-muted text-muted-foreground',
}

// ---------------------------------------------------------------------------
// Enhanced Metric Card Skeleton (with shimmer)
// ---------------------------------------------------------------------------

function MetricCardSkeleton() {
  return (
    <Card className="p-5 overflow-hidden">
      <div className="flex items-start gap-3">
        {/* Circle icon placeholder */}
        <div className="size-10 rounded-full animate-shimmer shrink-0" />
        <div className="flex-1 space-y-2">
          {/* Title line */}
          <div className="h-3.5 w-24 animate-shimmer rounded" />
          {/* Value line */}
          <div className="h-7 w-16 animate-shimmer rounded" style={{ animationDelay: '0.15s' }} />
          {/* Description line */}
          <div className="h-3 w-32 animate-shimmer rounded" style={{ animationDelay: '0.3s' }} />
        </div>
        {/* Sparkline placeholder */}
        <div className="size-6 animate-shimmer rounded shrink-0" style={{ animationDelay: '0.45s' }} />
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Chart Skeleton (with shimmer gradient)
// ---------------------------------------------------------------------------

function ChartSkeleton() {
  return (
    <div className="relative h-[200px] md:h-[250px] w-full overflow-hidden rounded-md">
      <div className="animate-shimmer absolute inset-0 rounded-md" />
      {/* Fake axis lines */}
      <div className="absolute left-0 right-0 top-4 bottom-4 flex flex-col justify-between px-8 py-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-px w-full bg-muted-foreground/5" />
        ))}
      </div>
      {/* Fake chart area */}
      <div className="absolute inset-x-8 bottom-8 top-8">
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 200 80">
          <path
            d="M0,60 Q25,45 50,50 T100,30 T150,35 T200,20"
            fill="none"
            className="stroke-muted-foreground/10"
            strokeWidth="2"
          />
          <path
            d="M0,40 Q25,50 50,35 T100,45 T150,30 T200,40"
            fill="none"
            className="stroke-muted-foreground/10"
            strokeWidth="2"
          />
        </svg>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Gauge Skeleton (pulsing circle placeholder)
// ---------------------------------------------------------------------------

function GaugeSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="size-[72px] rounded-full animate-shimmer" />
      <div className="h-3 w-12 animate-shimmer rounded" style={{ animationDelay: '0.2s' }} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Activity Feed Skeleton (5 rows with varying widths)
// ---------------------------------------------------------------------------

function ActivityFeedSkeleton() {
  const widths = ['w-full', 'w-4/5', 'w-full', 'w-3/4', 'w-full']
  return (
    <div className="space-y-1">
      {widths.map((w, i) => (
        <div key={i} className="flex items-center gap-3 py-3 px-4">
          <div className="size-4 rounded-full animate-shimmer shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className={cn('h-3 animate-shimmer rounded', w)} style={{ animationDelay: `${i * 0.1}s` }} />
            <div className={cn('h-2.5 animate-shimmer rounded', i % 2 === 0 ? 'w-2/3' : 'w-1/2')} style={{ animationDelay: `${i * 0.1 + 0.05}s` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// LIVE Indicator Component
// ---------------------------------------------------------------------------

function LiveIndicator({ isLive, onClick }: { isLive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all',
        isLive
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      )}
    >
      <span className="relative flex size-2">
        {isLive && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        )}
        <span
          className={cn(
            'relative inline-flex rounded-full size-2',
            isLive ? 'bg-emerald-500' : 'bg-muted-foreground/50'
          )}
        />
      </span>
      <span>LIVE</span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Metric card accent color mapping for hover border-bottom
// ---------------------------------------------------------------------------

const metricCardAccentMap: Record<string, { border: string; hoverBorder: string; icon: string }> = {
  agents: {
    border: 'border-l-emerald-500',
    hoverBorder: 'hover:border-b-2 hover:border-b-emerald-500/40',
    icon: 'text-emerald-500 dark:text-emerald-400',
  },
  memories: {
    border: 'border-l-violet-500',
    hoverBorder: 'hover:border-b-2 hover:border-b-violet-500/40',
    icon: 'text-violet-500 dark:text-violet-400',
  },
  evolution: {
    border: 'border-l-amber-500',
    hoverBorder: 'hover:border-b-2 hover:border-b-amber-500/40',
    icon: 'text-amber-500 dark:text-amber-400',
  },
  safety: {
    border: 'border-l-emerald-500',
    hoverBorder: 'hover:border-b-2 hover:border-b-emerald-500/40',
    icon: 'text-emerald-600 dark:text-emerald-400',
  },
}

// ---------------------------------------------------------------------------
// Quick Stats icon badge configuration
// ---------------------------------------------------------------------------

const quickStatIconConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; bg: string }> = {
  benchmark: { icon: BarChart3, bg: 'bg-emerald-500/10' },
  tokens: { icon: Coins, bg: 'bg-violet-500/10' },
  tasks: { icon: Clock, bg: 'bg-amber-500/10' },
  safety: { icon: AlertTriangle, bg: 'bg-rose-500/10' },
  status: { icon: HeartPulse, bg: 'bg-emerald-500/10' },
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function DashboardOverview() {
  const dashboardData = useAppStore((s) => s.dashboardData)
  const setDashboardData = useAppStore((s) => s.setDashboardData)
  const setAgents = useAppStore((s) => s.setAgents)
  const setEvolutionEvents = useAppStore((s) => s.setEvolutionEvents)
  const setSafetyEvents = useAppStore((s) => s.setSafetyEvents)
  const setBenchmarks = useAppStore((s) => s.setBenchmarks)
  const isLoading = useAppStore((s) => s.isLoading)
  const setIsLoading = useAppStore((s) => s.setIsLoading)
  const setSimulationSpeed = useAppStore((s) => s.setSimulationSpeed)
  const simulationSpeed = useAppStore((s) => s.simulationSpeed)
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)

  const [chartData, setChartData] = useState<Array<Record<string, unknown>>>([])
  const [latestEvents, setLatestEvents] = useState<EvolutionEvent[]>([])
  const [loading, setLoading] = useState(true)

  // Simulation hook
  const sim = useSimulation(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setIsLoading(true)
    try {
      const [dashRes, successRateRes, costRes, agentsRes, safetyRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/metrics?metric=task_success_rate&hours=24'),
        fetch('/api/metrics?metric=cost&hours=24'),
        fetch('/api/agents'),
        fetch('/api/safety'),
      ])

      if (dashRes.ok) {
        const raw = await dashRes.json()
        const parsedLatestEvents = (raw.evolution?.latest ?? []).map(
          (e: Record<string, unknown>) => ({
            ...e,
            beforeState: parseJSONField(e.beforeState),
            afterState: parseJSONField(e.afterState),
            metrics: parseJSONField(e.metrics),
          })
        )

        const data = {
          agentCount: raw.agents?.total ?? 0,
          activeAgentCount: raw.agents?.active ?? 0,
          memoryCount: raw.memories?.total ?? 0,
          evolutionEventCount: raw.evolution?.total ?? 0,
          evolutionStatusBreakdown: raw.evolution?.statusBreakdown ?? {},
          latestEvolutionEvents: parsedLatestEvents,
          avgBenchmarkScore: raw.benchmarks?.averageScore ?? 0,
          unresolvedSafetyCount: raw.safety?.unresolvedEvents ?? 0,
          healthMetrics: raw.systemHealth ?? {},
          totalTokensUsed: raw.totals?.tokensUsed ?? 0,
          totalTasksCompleted: raw.totals?.tasksCompleted ?? 0,
        }
        setDashboardData(data)
        setLatestEvents(parsedLatestEvents)
      }

      const successMetrics: SystemMetric[] = successRateRes.ok
        ? await successRateRes.json()
        : []
      const costMetrics: SystemMetric[] = costRes.ok ? await costRes.json() : []

      const chartMap = new Map<string, Record<string, unknown>>()
      for (const m of successMetrics) {
        const key = new Date(m.timestamp).toISOString().slice(0, 16)
        const existing = chartMap.get(key) ?? { time: key }
        existing.task_success_rate = m.value
        chartMap.set(key, existing)
      }
      for (const m of costMetrics) {
        const key = new Date(m.timestamp).toISOString().slice(0, 16)
        const existing = chartMap.get(key) ?? { time: key }
        existing.cost = m.value
        chartMap.set(key, existing)
      }

      const sorted = Array.from(chartMap.values()).sort(
        (a, b) => String(a.time).localeCompare(String(b.time))
      )
      setChartData(sorted)

      if (agentsRes.ok) {
        const agents = await agentsRes.json()
        setAgents(
          agents.map((a: Record<string, unknown>) => ({
            ...a,
            goals: parseJSONField<string[]>(a.goals),
            tools: parseJSONField<string[]>(a.tools),
            config: parseJSONField<Record<string, unknown>>(a.config),
          }))
        )
      }
      if (safetyRes.ok) {
        const safety = await safetyRes.json()
        setSafetyEvents(
          safety.map((e: Record<string, unknown>) => ({
            ...e,
            metadata: parseJSONField<Record<string, unknown>>(e.metadata),
          }))
        )
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
    } finally {
      setLoading(false)
      setIsLoading(false)
    }
  }, [setDashboardData, setAgents, setSafetyEvents, setIsLoading])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Derived data
  const data = dashboardData
  const safetyScore = data
    ? data.unresolvedSafetyCount === 0 && (data.agentCount ?? 0) > 0
      ? 100
      : data.unresolvedSafetyCount > 0
        ? Math.max(
            0,
            Math.round(
              (1 - data.unresolvedSafetyCount / Math.max(data.unresolvedSafetyCount + 10, 1)) * 100
            )
          )
        : 100
    : 0

  const statusBreakdown = data?.evolutionStatusBreakdown ?? {}
  const totalEvolutionEvents = Object.values(statusBreakdown).reduce((a, b) => a + (b as number), 0) as number

  // Use simulation-driven gauge values when simulating, fallback to static
  const gaugeValues = useMemo(() => {
    if (sim.isSimulating) {
      return sim.gaugeValues
    }
    // Static fallback
    const seed = data?.agentCount ?? 1
    const pseudoRandom = (base: number, min: number, max: number) => {
      const x = Math.sin(base * 9301 + 49297) * 233280
      return min + Math.floor(((x - Math.floor(x)) * (max - min + 1)))
    }
    const agentLoad = data
      ? Math.round(((data.activeAgentCount ?? 0) / Math.max(data.agentCount ?? 1, 1)) * 100)
      : 0
    return {
      cpu: pseudoRandom(seed + 7, 40, 80),
      memory: pseudoRandom(seed + 13, 30, 70),
      network: pseudoRandom(seed + 19, 20, 60),
      agentLoad,
    }
  }, [sim.isSimulating, sim.gaugeValues, data?.agentCount, data?.activeAgentCount])

  // Merge static activity items with simulation items
  const staticActivityItems = useMemo(
    () => generateActivityItems(data?.agentCount ?? 0, data?.activeAgentCount ?? 0),
    [data?.agentCount, data?.activeAgentCount]
  )

  const activityItems = useMemo(() => {
    if (sim.isSimulating && sim.activityItems.length > 0) {
      // Combine simulation items (newest first) with static items
      return [...sim.activityItems, ...staticActivityItems].slice(0, 20)
    }
    return staticActivityItems
  }, [sim.isSimulating, sim.activityItems, staticActivityItems])

  // Use simulation-driven sparkline data when simulating
  const sparklineData = useMemo(() => {
    if (sim.isSimulating) {
      return sim.sparklineData
    }
    return {
      agents: [3, 4, 5, 4, 6, 5, 7, data?.activeAgentCount ?? 0],
      memories: [120, 135, 128, 142, 150, 148, 155, data?.memoryCount ?? 0],
      evolution: [1, 2, 3, 2, 4, 5, 3, data?.evolutionEventCount ?? 0],
      safety: [98, 95, 97, 92, 94, 96, 98, safetyScore],
    }
  }, [sim.isSimulating, sim.sparklineData, data?.activeAgentCount, data?.memoryCount, data?.evolutionEventCount, safetyScore])

  // Simulation-adjusted metric values
  const simAdjustedActiveAgents = (data?.activeAgentCount ?? 0) + (sim.isSimulating ? sim.metricDeltas.activeAgentDelta : 0)
  const simAdjustedMemories = (data?.memoryCount ?? 0) + (sim.isSimulating ? sim.metricDeltas.memoryDelta : 0)
  const simAdjustedEvolution = (data?.evolutionEventCount ?? 0) + (sim.isSimulating ? sim.metricDeltas.evolutionDelta : 0)
  const simAdjustedSafety = Math.max(0, Math.min(100, safetyScore + (sim.isSimulating ? sim.metricDeltas.safetyDelta : 0)))

  return (
    <motion.div
      className="space-y-6 md:space-y-8 overflow-x-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <PageHeader
        icon={Gauge}
        iconColor="emerald"
        title="Dashboard"
        description="Overview of your Self-Evolving AI System"
        actions={
          <>
            {/* LIVE indicator */}
            <LiveIndicator
              isLive={sim.isSimulating}
              onClick={sim.toggleSimulation}
            />
            {/* Speed control */}
            <Select
              value={String(simulationSpeed)}
              onValueChange={(val) => setSimulationSpeed(Number(val))}
            >
              <SelectTrigger className="w-16 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5">0.5x</SelectItem>
                <SelectItem value="1">1x</SelectItem>
                <SelectItem value="2">2x</SelectItem>
                <SelectItem value="5">5x</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </>
        }
      />

      {/* Welcome Card for First-Time Users */}
      <TourWelcomeCard />

      {/* Top Row: Key Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
        {loading ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
            {/* Active Agents */}
            <motion.div variants={itemVariants}>
              <Card
                className={cn(
                  'relative overflow-hidden border-l-4 bg-card/80 backdrop-blur-sm border-border/50',
                  'shadow-sm hover:shadow-xl hover:shadow-primary/10 transition-all duration-300',
                  'hover:scale-[1.02] hover:-translate-y-0.5',
                  'hover:ring-1 hover:ring-primary/10',
                  'cursor-pointer group',
                  metricCardAccentMap.agents.border,
                  metricCardAccentMap.agents.hoverBorder,
                )}
                onClick={() => setCurrentPage('agents')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
                <CardHeader className="pb-0 pt-5 px-5 relative">
                  <CardDescription className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <span className="relative">
                      <Users className={cn('size-4', metricCardAccentMap.agents.icon)} />
                      <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 animate-pulse" />
                    </span>
                    Active Agents
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-5 pb-5 relative">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-2xl md:text-3xl font-bold text-foreground tracking-tight" style={{ letterSpacing: '-0.02em' }}>
                        <CountUp target={simAdjustedActiveAgents} duration={1} />
                        <span className="text-sm font-medium text-muted-foreground">
                          /<CountUp target={data?.agentCount ?? 0} duration={1} />
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        {data?.agentCount
                          ? `${Math.round((simAdjustedActiveAgents / data.agentCount) * 100)}% utilization`
                          : 'No agents registered'}
                      </p>
                    </div>
                    <MiniSparkline data={sparklineData.agents} color="emerald" />
                  </div>
                  {/* Hover arrow */}
                  <ArrowUpRight className="absolute bottom-3 right-3 size-4 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </CardContent>
              </Card>
            </motion.div>

            {/* Total Memories */}
            <motion.div variants={itemVariants}>
              <Card
                className={cn(
                  'relative overflow-hidden border-l-4 bg-card/80 backdrop-blur-sm border-border/50',
                  'shadow-sm hover:shadow-xl hover:shadow-primary/10 transition-all duration-300',
                  'hover:scale-[1.02] hover:-translate-y-0.5',
                  'hover:ring-1 hover:ring-primary/10',
                  'cursor-pointer group',
                  metricCardAccentMap.memories.border,
                  metricCardAccentMap.memories.hoverBorder,
                )}
                onClick={() => setCurrentPage('memory')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-transparent pointer-events-none" />
                <CardHeader className="pb-0 pt-5 px-5 relative">
                  <CardDescription className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <span className="relative">
                      <Database className={cn('size-4', metricCardAccentMap.memories.icon)} />
                      <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-violet-500 animate-pulse" />
                    </span>
                    Total Memories
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-5 pb-5 relative">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-2xl md:text-3xl font-bold text-foreground tracking-tight" style={{ letterSpacing: '-0.02em' }}>
                        <CountUp target={simAdjustedMemories} duration={1.4} />
                      </div>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        Working, episodic, semantic & more
                      </p>
                    </div>
                    <MiniSparkline data={sparklineData.memories} color="violet" />
                  </div>
                  {/* Hover arrow */}
                  <ArrowUpRight className="absolute bottom-3 right-3 size-4 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </CardContent>
              </Card>
            </motion.div>

            {/* Evolution Events */}
            <motion.div variants={itemVariants}>
              <Card
                className={cn(
                  'relative overflow-hidden border-l-4 bg-card/80 backdrop-blur-sm border-border/50',
                  'shadow-sm hover:shadow-xl hover:shadow-primary/10 transition-all duration-300',
                  'hover:scale-[1.02] hover:-translate-y-0.5',
                  'hover:ring-1 hover:ring-primary/10',
                  'cursor-pointer group',
                  metricCardAccentMap.evolution.border,
                  metricCardAccentMap.evolution.hoverBorder,
                )}
                onClick={() => setCurrentPage('evolution')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent pointer-events-none" />
                <CardHeader className="pb-0 pt-5 px-5 relative">
                  <CardDescription className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <span className="relative">
                      <Dna className={cn('size-4', metricCardAccentMap.evolution.icon)} />
                      <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-amber-500 animate-pulse" />
                    </span>
                    Evolution Events
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-5 pb-5 relative">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-2xl md:text-3xl font-bold text-foreground tracking-tight" style={{ letterSpacing: '-0.02em' }}>
                        <CountUp target={simAdjustedEvolution} duration={1.2} />
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(statusBreakdown).map(([status, count]) => (
                          <span
                            key={status}
                            className={cn(
                              'text-xs text-muted-foreground/70 px-1.5 py-0.5 rounded-full font-medium',
                              statusColors[status] ?? 'bg-muted text-muted-foreground'
                            )}
                          >
                            {status}: {count as number}
                          </span>
                        ))}
                      </div>
                    </div>
                    <MiniSparkline data={sparklineData.evolution} color="amber" />
                  </div>
                  {/* Hover arrow */}
                  <ArrowUpRight className="absolute bottom-3 right-3 size-4 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </CardContent>
              </Card>
            </motion.div>

            {/* Safety Score */}
            <motion.div variants={itemVariants}>
              <Card
                className={cn(
                  'relative overflow-hidden bg-card/80 backdrop-blur-sm border-border/50',
                  'shadow-sm hover:shadow-xl hover:shadow-primary/10 transition-all duration-300',
                  'hover:scale-[1.02] hover:-translate-y-0.5',
                  'hover:ring-1 hover:ring-primary/10',
                  'cursor-pointer group',
                  simAdjustedSafety > 90
                    ? 'border-l-4 border-l-emerald-500 hover:border-b-2 hover:border-b-emerald-500/40'
                    : simAdjustedSafety > 70
                      ? 'border-l-4 border-l-amber-500 hover:border-b-2 hover:border-b-amber-500/40'
                      : 'border-l-4 border-l-red-500 hover:border-b-2 hover:border-b-red-500/40',
                )}
                onClick={() => setCurrentPage('safety')}
              >
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: simAdjustedSafety > 90
                      ? 'linear-gradient(to bottom right, rgba(16,185,129,0.05), transparent)'
                      : simAdjustedSafety > 70
                        ? 'linear-gradient(to bottom right, rgba(245,158,11,0.05), transparent)'
                        : 'linear-gradient(to bottom right, rgba(239,68,68,0.05), transparent)',
                  }}
                />
                <CardHeader className="pb-0 pt-5 px-5 relative">
                  <CardDescription className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <span className="relative">
                      <Shield className={cn('size-4', safetyScoreColor(simAdjustedSafety))} />
                      <span className={cn(
                        'absolute -top-0.5 -right-0.5 size-2 rounded-full animate-pulse',
                        simAdjustedSafety > 90 ? 'bg-emerald-500' : simAdjustedSafety > 70 ? 'bg-amber-500' : 'bg-red-500'
                      )} />
                    </span>
                    Safety Score
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-5 pb-5 relative">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className={cn('text-2xl md:text-3xl font-bold tracking-tight', safetyScoreColor(simAdjustedSafety))} style={{ letterSpacing: '-0.02em' }}>
                        <CountUp target={simAdjustedSafety} duration={1.5} />
                        <span className="text-sm font-medium">%</span>
                      </div>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        {data?.unresolvedSafetyCount
                          ? `${data.unresolvedSafetyCount} unresolved event${data.unresolvedSafetyCount > 1 ? 's' : ''}`
                          : 'All events resolved'}
                      </p>
                    </div>
                    <MiniSparkline data={sparklineData.safety} color="rose" />
                  </div>
                  {/* Hover arrow */}
                  <ArrowUpRight className="absolute bottom-3 right-3 size-4 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </div>

      {/* Gradient Section Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* System Health Gauges */}
      <motion.div variants={itemVariants}>
        <Card className="shadow-md bg-gradient-to-br from-card via-card to-muted/30 border-border/50">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-500/[0.02] via-transparent to-sky-500/[0.02] pointer-events-none" />
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="size-4 text-muted-foreground" />
              System Health
            </CardTitle>
            <CardDescription>Real-time resource utilization</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-around py-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <GaugeSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                <CircularGauge value={gaugeValues.cpu} label="CPU" icon={Cpu} />
                <CircularGauge value={gaugeValues.memory} label="Memory" icon={HardDrive} />
                <CircularGauge value={gaugeValues.network} label="Network I/O" icon={Wifi} />
                <CircularGauge value={gaugeValues.agentLoad} label="Agent Load" icon={Bot} />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Gradient Section Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* System Performance Chart */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-sm border-border/30 bg-card/80 backdrop-blur-sm">
            <CardHeader className="p-5 pb-0">
              <CardTitle className="text-base">System Performance</CardTitle>
              <CardDescription className="text-sm font-medium text-muted-foreground">
                Task success rate & cost over the last 24 hours
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              {loading ? (
                <ChartSkeleton />
              ) : chartData.length > 0 ? (
                <ChartContainer
                  config={performanceChartConfig}
                  className="h-[200px] md:h-[250px] w-full"
                >
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="time"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val: string) => {
                        const d = new Date(val)
                        return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
                      }}
                      className="text-xs"
                    />
                    <YAxis tickLine={false} axisLine={false} className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line
                      type="monotone"
                      dataKey="task_success_rate"
                      stroke="var(--color-task_success_rate)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="cost"
                      stroke="var(--color-cost)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="h-[200px] md:h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                  No metric data available yet
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Evolution Pipeline */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-sm border-border/30 bg-gradient-to-br from-card via-card to-amber-500/[0.02] bg-card/80 backdrop-blur-sm">
            <CardHeader className="p-5 pb-0 relative">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">Evolution Pipeline</CardTitle>
                  <CardDescription className="text-sm font-medium text-muted-foreground">
                    Current status of evolution events across stages
                  </CardDescription>
                </div>
                {/* Total events counter badge */}
                <Badge variant="secondary" className="text-xs font-medium shrink-0">
                  {totalEvolutionEvents} events
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              {loading ? (
                <ChartSkeleton />
              ) : (
                <div className="flex flex-col items-center justify-center gap-5 h-[200px] md:h-[250px]">
                  <div className="flex items-center gap-3 flex-wrap justify-center">
                    {(['proposed', 'testing', 'validated', 'deployed'] as const).map(
                      (stage, i) => {
                        const stageCount = statusBreakdown[stage] ?? 0
                        const pct = totalEvolutionEvents > 0 ? Math.round((stageCount / totalEvolutionEvents) * 100) : 0
                        const isActive = stageCount > 0
                        return (
                          <div key={stage} className="flex items-center gap-3">
                            <div
                              className={cn(
                                'flex flex-col items-center gap-1.5 rounded-lg border px-5 py-4 min-w-[100px] transition-all relative overflow-hidden',
                                isActive
                                  ? 'border-emerald-500/30 bg-emerald-500/5'
                                  : 'border-border bg-muted/30'
                              )}
                            >
                              {/* Animated gradient border effect on active stage */}
                              {isActive && (
                                <div className="absolute inset-0 rounded-lg animate-gradient-border bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 pointer-events-none" />
                              )}
                              <span className="text-xs text-muted-foreground capitalize relative z-10">
                                {stage}
                              </span>
                              <span
                                className={cn(
                                  'text-2xl font-bold tracking-tight relative z-10',
                                  isActive ? 'text-foreground' : 'text-muted-foreground'
                                )}
                                style={{ letterSpacing: '-0.02em' }}
                              >
                                {stageCount}
                              </span>
                              {/* Percentage label below each stage count */}
                              <span className={cn(
                                'text-[10px] font-medium relative z-10',
                                isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground/50'
                              )}>
                                {pct}% of total
                              </span>
                            </div>
                            {i < 3 && (
                              <div className="flex items-center gap-0.5 shrink-0">
                                <ArrowRight className="size-3 text-muted-foreground/50" />
                                {/* Particle dots */}
                                <span className="size-1 rounded-full bg-emerald-500/40 animate-particle-flow" style={{ animationDelay: '0s' }} />
                                <span className="size-1 rounded-full bg-emerald-500/40 animate-particle-flow" style={{ animationDelay: '0.4s' }} />
                                <span className="size-1 rounded-full bg-emerald-500/40 animate-particle-flow" style={{ animationDelay: '0.8s' }} />
                              </div>
                            )}
                          </div>
                        )
                      }
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-px w-8 bg-border" />
                    <div
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-lg border px-5 py-4 min-w-[100px] transition-all',
                        (statusBreakdown['rejected'] ?? 0) > 0
                          ? 'border-red-500/30 bg-red-500/5'
                          : 'border-border bg-muted/30'
                      )}
                    >
                      <span className="text-xs text-muted-foreground">Rejected</span>
                      <span
                        className={cn(
                          'text-2xl font-bold tracking-tight',
                          (statusBreakdown['rejected'] ?? 0) > 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-muted-foreground'
                        )}
                        style={{ letterSpacing: '-0.02em' }}
                      >
                        {statusBreakdown['rejected'] ?? 0}
                      </span>
                      <span className={cn(
                        'text-[10px] font-medium',
                        (statusBreakdown['rejected'] ?? 0) > 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-muted-foreground/50'
                      )}>
                        {totalEvolutionEvents > 0
                          ? `${Math.round(((statusBreakdown['rejected'] ?? 0) / totalEvolutionEvents) * 100)}% of total`
                          : '0% of total'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Gradient Section Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Third Row: Activity Feed + Recent Evolution + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Activity Feed */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-sm h-full bg-card/80 backdrop-blur-sm border-border/30">
            <CardHeader className="pb-2 p-5">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="size-4 text-muted-foreground" />
                Activity Feed
                {sim.isSimulating && (
                  <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    <span className="relative flex size-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full size-1.5 bg-emerald-500" />
                    </span>
                    Live
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-sm font-medium text-muted-foreground">Recent system events</CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              {loading ? (
                <ActivityFeedSkeleton />
              ) : (
                <ScrollArea className="max-h-64 md:max-h-96">
                  <div className="space-y-1">
                    <AnimatePresence mode="popLayout">
                      {activityItems.map((item, index) => {
                        const SeverityIcon = severityIconMap[item.severity ?? 'info'] ?? Info
                        const isSimItem = item.id.startsWith('sim-')
                        return (
                          <motion.div
                            key={item.id}
                            layout
                            variants={activityItemVariants}
                            initial={isSimItem ? 'initial' : false}
                            animate="animate"
                            exit="exit"
                            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                            className={cn(
                              'flex items-start gap-3 rounded-lg py-3 px-4 hover:bg-accent/30 hover:shadow-sm transition-all group',
                              index % 2 === 0 ? 'bg-muted/20' : 'bg-transparent',
                              isSimItem && 'border-l-2 border-l-emerald-500/30'
                            )}
                          >
                            <div className="mt-0.5 shrink-0">
                              <SeverityIcon className={cn('size-4', severityColorMap[item.severity ?? 'info'])} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className={cn(
                                  'text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize',
                                  typeColorMap[item.type] ?? 'bg-muted text-muted-foreground'
                                )}>
                                  {item.type}
                                </span>
                                <span className="text-[10px] text-muted-foreground/70 whitespace-nowrap">
                                  {timeAgo(item.timestamp)}
                                </span>
                              </div>
                              <p className="text-xs text-foreground leading-relaxed">
                                {item.message}
                              </p>
                            </div>
                            <ChevronRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              )}
              {!loading && (
                <div className="mt-2 pt-2 border-t border-border/50">
                  <button
                    onClick={() => useAppStore.getState().setCurrentPage('safety')}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
                  >
                    View All Activity
                    <ChevronRight className="size-3" />
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Evolution Events */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-sm h-full bg-card/80 backdrop-blur-sm border-border/30">
            <CardHeader className="pb-2 p-5">
              <CardTitle className="text-base">Recent Evolution Events</CardTitle>
              <CardDescription className="text-sm font-medium text-muted-foreground">Latest changes in the evolution pipeline</CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : latestEvents.length > 0 ? (
                <ScrollArea className="max-h-64 md:max-h-96">
                  <div className="space-y-2">
                    {latestEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/30 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex flex-col gap-1 min-w-0">
                            <span className="text-sm font-medium truncate text-foreground">
                              {event.title}
                            </span>
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  'text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize',
                                  typeBadgeColors[event.type] ??
                                    'bg-muted text-muted-foreground'
                                )}
                              >
                                {event.type}
                              </span>
                              <span
                                className={cn(
                                  'text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize',
                                  statusColors[event.status] ??
                                    'bg-muted text-muted-foreground'
                                )}
                              >
                                {event.status}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {event.improvementPercent > 0 && (
                            <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                              <TrendingUp className="size-3" />
                              +{event.improvementPercent}%
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground/70 whitespace-nowrap">
                            {timeAgo(event.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  No evolution events yet
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Stats */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-sm h-full bg-card/80 backdrop-blur-sm border-border/30">
            <CardHeader className="pb-2 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Quick Stats</CardTitle>
                  <CardDescription className="text-sm font-medium text-muted-foreground">System performance snapshot</CardDescription>
                </div>
                <span className="text-xs text-muted-foreground/70 font-medium">Last 24h</span>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-0">
                  {/* Average Benchmark Score */}
                  <div className="space-y-2 py-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <span className={cn('size-6 rounded-md flex items-center justify-center', quickStatIconConfig.benchmark.bg)}>
                          {(() => { const Ic = quickStatIconConfig.benchmark.icon; return <Ic className="size-3.5 text-emerald-600 dark:text-emerald-400" /> })()}
                        </span>
                        Avg Benchmark
                      </span>
                      <div className="flex items-center gap-2">
                        <MiniSparkline data={[72, 75, 74, 78, 76, 80, 79, data?.avgBenchmarkScore ?? 0]} color="emerald" width={40} height={16} />
                        <span className="font-medium text-foreground">
                          {(data?.avgBenchmarkScore ?? 0).toFixed(1)}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                          <TrendingUp className="size-2.5" />
                          3.2%
                        </span>
                      </div>
                    </div>
                    <Progress
                      value={Math.min(data?.avgBenchmarkScore ?? 0, 100)}
                      className="h-2"
                    />
                  </div>

                  <Separator />

                  {/* Total Tokens Used */}
                  <div className="flex items-center justify-between text-sm py-3">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <span className={cn('size-6 rounded-md flex items-center justify-center', quickStatIconConfig.tokens.bg)}>
                        {(() => { const Ic = quickStatIconConfig.tokens.icon; return <Ic className="size-3.5 text-violet-600 dark:text-violet-400" /> })()}
                      </span>
                      Tokens Used
                    </span>
                    <div className="flex items-center gap-2">
                      <MiniSparkline data={[12, 15, 14, 18, 16, 20, 22, data?.totalTokensUsed ?? 0]} color="violet" width={40} height={16} />
                      <span className="font-medium text-foreground">
                        {formatNumber(data?.totalTokensUsed ?? 0)}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium flex items-center gap-0.5">
                        <TrendingDown className="size-2.5" />
                        1.1%
                      </span>
                    </div>
                  </div>

                  <Separator />

                  {/* Total Tasks Completed */}
                  <div className="flex items-center justify-between text-sm py-3">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <span className={cn('size-6 rounded-md flex items-center justify-center', quickStatIconConfig.tasks.bg)}>
                        {(() => { const Ic = quickStatIconConfig.tasks.icon; return <Ic className="size-3.5 text-amber-600 dark:text-amber-400" /> })()}
                      </span>
                      Tasks Completed
                    </span>
                    <div className="flex items-center gap-2">
                      <MiniSparkline data={[5, 8, 6, 10, 9, 12, 11, data?.totalTasksCompleted ?? 0]} color="amber" width={40} height={16} />
                      <span className="font-medium text-foreground">
                        {formatNumber(data?.totalTasksCompleted ?? 0)}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                        <TrendingUp className="size-2.5" />
                        8.5%
                      </span>
                    </div>
                  </div>

                  <Separator />

                  {/* Unresolved Safety Events */}
                  <div className="flex items-center justify-between text-sm py-3">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <span className={cn('size-6 rounded-md flex items-center justify-center', quickStatIconConfig.safety.bg)}>
                        {(() => { const Ic = quickStatIconConfig.safety.icon; return <Ic className="size-3.5 text-rose-600 dark:text-rose-400" /> })()}
                      </span>
                      Safety Events
                    </span>
                    {(data?.unresolvedSafetyCount ?? 0) > 0 ? (
                      <Badge variant="destructive" className="text-xs">
                        {data?.unresolvedSafetyCount} unresolved
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      >
                        All resolved
                      </Badge>
                    )}
                  </div>

                  <Separator />

                  {/* System Uptime */}
                  <div className="flex items-center justify-between text-sm py-3">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <span className={cn('size-6 rounded-md flex items-center justify-center', quickStatIconConfig.status.bg)}>
                        {(() => { const Ic = quickStatIconConfig.status.icon; return <Ic className="size-3.5 text-emerald-600 dark:text-emerald-400" /> })()}
                      </span>
                      System Status
                    </span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span className="relative flex size-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
                      </span>
                      Online
                    </span>
                  </div>

                  <Separator />

                  {/* Trend indicators with delta badges */}
                  <div className="grid grid-cols-2 gap-3 pt-3">
                    <div className="rounded-lg border border-border/50 p-2.5 text-center hover:bg-muted/20 transition-colors">
                      <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <TrendingUp className="size-3.5" />
                        <span className="text-sm font-medium">+3.2%</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">Benchmark</p>
                    </div>
                    <div className="rounded-lg border border-border/50 p-2.5 text-center hover:bg-muted/20 transition-colors">
                      <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400">
                        <TrendingDown className="size-3.5" />
                        <span className="text-sm font-medium">-1.1%</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">Cost</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
