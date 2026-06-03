'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Users,
  Database,
  Dna,
  Shield,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Clock,
  Zap,
  ArrowRight,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import type { EvolutionEvent, SystemMetric } from '@/lib/types'
import { cn } from '@/lib/utils'

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
// Metric Card Skeleton
// ---------------------------------------------------------------------------

function MetricCardSkeleton() {
  return (
    <Card className="py-4">
      <CardHeader className="pb-0 pt-0 px-4">
        <Skeleton className="h-4 w-24 mb-1" />
      </CardHeader>
      <CardContent className="px-4">
        <Skeleton className="h-8 w-16 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  )
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

  const [chartData, setChartData] = useState<Array<Record<string, unknown>>>([])
  const [latestEvents, setLatestEvents] = useState<EvolutionEvent[]>([])
  const [loading, setLoading] = useState(true)

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
        // Build DashboardData from API response
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

      // Build chart data from metrics
      const successMetrics: SystemMetric[] = successRateRes.ok
        ? await successRateRes.json()
        : []
      const costMetrics: SystemMetric[] = costRes.ok ? await costRes.json() : []

      // Merge by timestamp (round to nearest minute)
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

      // Also populate agents & safety in store for other pages
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Overview of your Self-Evolving AI System
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Top Row: Key Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
            <Card className="py-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
              <CardHeader className="pb-0 pt-0 px-4">
                <CardDescription className="flex items-center gap-2">
                  <Users className="size-4 text-emerald-500" />
                  Active Agents
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4">
                <div className="text-2xl font-bold">
                  {data?.activeAgentCount ?? 0}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{data?.agentCount ?? 0}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {data?.agentCount
                    ? `${Math.round(((data.activeAgentCount ?? 0) / data.agentCount) * 100)}% utilization`
                    : 'No agents registered'}
                </p>
              </CardContent>
            </Card>

            {/* Total Memories */}
            <Card className="py-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-violet-500" />
              <CardHeader className="pb-0 pt-0 px-4">
                <CardDescription className="flex items-center gap-2">
                  <Database className="size-4 text-violet-500" />
                  Total Memories
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4">
                <div className="text-2xl font-bold">
                  {formatNumber(data?.memoryCount ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Working, episodic, semantic & more
                </p>
              </CardContent>
            </Card>

            {/* Evolution Events */}
            <Card className="py-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
              <CardHeader className="pb-0 pt-0 px-4">
                <CardDescription className="flex items-center gap-2">
                  <Dna className="size-4 text-amber-500" />
                  Evolution Events
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4">
                <div className="text-2xl font-bold">
                  {formatNumber(data?.evolutionEventCount ?? 0)}
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.entries(statusBreakdown).map(([status, count]) => (
                    <span
                      key={status}
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                        statusColors[status] ?? 'bg-slate-100 text-slate-600'
                      )}
                    >
                      {status}: {count}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Safety Score */}
            <Card className="py-4 relative overflow-hidden">
              <div
                className={cn(
                  'absolute top-0 left-0 right-0 h-1',
                  safetyScore > 90
                    ? 'bg-emerald-500'
                    : safetyScore > 70
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                )}
              />
              <CardHeader className="pb-0 pt-0 px-4">
                <CardDescription className="flex items-center gap-2">
                  <Shield className="size-4 text-emerald-500" />
                  Safety Score
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4">
                <div className={cn('text-2xl font-bold', safetyScoreColor(safetyScore))}>
                  {safetyScore}%
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {data?.unresolvedSafetyCount
                    ? `${data.unresolvedSafetyCount} unresolved event${data.unresolvedSafetyCount > 1 ? 's' : ''}`
                    : 'All events resolved'}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Second Row: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* System Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">System Performance</CardTitle>
            <CardDescription>
              Task success rate & cost over the last 24 hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : chartData.length > 0 ? (
              <ChartContainer
                config={performanceChartConfig}
                className="h-[250px] w-full"
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
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                No metric data available yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Evolution Pipeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolution Pipeline</CardTitle>
            <CardDescription>
              Current status of evolution events across stages
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 h-[250px]">
                {/* Main pipeline row */}
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  {(['proposed', 'testing', 'validated', 'deployed'] as const).map(
                    (stage, i) => (
                      <div key={stage} className="flex items-center gap-2">
                        <div
                          className={cn(
                            'flex flex-col items-center gap-1 rounded-lg border px-4 py-3 min-w-[90px] transition-all',
                            (statusBreakdown[stage] ?? 0) > 0
                              ? 'border-emerald-500/30 bg-emerald-500/5'
                              : 'border-border bg-muted/30'
                          )}
                        >
                          <span className="text-xs text-muted-foreground capitalize">
                            {stage}
                          </span>
                          <span
                            className={cn(
                              'text-xl font-bold',
                              (statusBreakdown[stage] ?? 0) > 0
                                ? 'text-foreground'
                                : 'text-muted-foreground'
                            )}
                          >
                            {statusBreakdown[stage] ?? 0}
                          </span>
                        </div>
                        {i < 3 && (
                          <ArrowRight className="size-4 text-muted-foreground shrink-0" />
                        )}
                      </div>
                    )
                  )}
                </div>

                {/* Rejected branch */}
                <div className="flex items-center gap-2">
                  <div className="h-px w-8 bg-border" />
                  <div
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-lg border px-4 py-3 min-w-[90px] transition-all',
                      (statusBreakdown['rejected'] ?? 0) > 0
                        ? 'border-red-500/30 bg-red-500/5'
                        : 'border-border bg-muted/30'
                    )}
                  >
                    <span className="text-xs text-muted-foreground">Rejected</span>
                    <span
                      className={cn(
                        'text-xl font-bold',
                        (statusBreakdown['rejected'] ?? 0) > 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-muted-foreground'
                      )}
                    >
                      {statusBreakdown['rejected'] ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Third Row: Recent Activity & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Evolution Events */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent Evolution Events</CardTitle>
            <CardDescription>Latest changes in the evolution pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : latestEvents.length > 0 ? (
              <ScrollArea className="max-h-96">
                <div className="space-y-2">
                  {latestEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-sm font-medium truncate">
                            {event.title}
                          </span>
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize',
                                typeBadgeColors[event.type] ??
                                  'bg-slate-100 text-slate-600'
                              )}
                            >
                              {event.type}
                            </span>
                            <span
                              className={cn(
                                'text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize',
                                statusColors[event.status] ??
                                  'bg-slate-100 text-slate-600'
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
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
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

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Stats</CardTitle>
            <CardDescription>System performance snapshot</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Average Benchmark Score */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Zap className="size-3.5" />
                      Avg Benchmark
                    </span>
                    <span className="font-medium">
                      {(data?.avgBenchmarkScore ?? 0).toFixed(1)}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(data?.avgBenchmarkScore ?? 0, 100)}
                    className="h-2"
                  />
                </div>

                <Separator />

                {/* Total Tokens Used */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Database className="size-3.5" />
                    Tokens Used
                  </span>
                  <span className="font-medium">
                    {formatNumber(data?.totalTokensUsed ?? 0)}
                  </span>
                </div>

                <Separator />

                {/* Total Tasks Completed */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Clock className="size-3.5" />
                    Tasks Completed
                  </span>
                  <span className="font-medium">
                    {formatNumber(data?.totalTasksCompleted ?? 0)}
                  </span>
                </div>

                <Separator />

                {/* Unresolved Safety Events */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className="size-3.5" />
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
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <span className="relative flex size-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
                    </span>
                    System Status
                  </span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    Online
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
