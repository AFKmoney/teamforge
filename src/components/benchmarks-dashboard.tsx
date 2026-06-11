'use client'

import { useAppStore } from '@/lib/store'
import { type BenchmarkSnapshot, type AgentMetricBreakdown, AGENT_ROLE_CONFIG } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Activity,
  BarChart3,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Camera,
  Loader2,
  ChevronDown,
  ChevronRight,
  Zap,
  Shield,
  Timer,
  Gauge,
  Cpu,
  Users,
} from 'lucide-react'
import { useState, useCallback, useEffect, useMemo } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { cn } from '@/lib/utils'

type TimeRange = '1h' | '24h' | '7d' | '30d' | 'all'

interface BenchmarksData {
  latest: BenchmarkSnapshot | null
  snapshots: BenchmarkSnapshot[]
  perAgentBreakdown: AgentMetricBreakdown[]
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`
  return `${(seconds / 3600).toFixed(1)}h`
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function formatNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return value.toFixed(value % 1 === 0 ? 0 : 1)
}

function TrendIcon({ current, previous }: { current: number; previous?: number }) {
  if (previous === undefined || previous === 0) return <Minus className="size-3 text-muted-foreground" />
  const diff = current - previous
  if (diff > 0) return <TrendingUp className="size-3 text-emerald-500" />
  if (diff < 0) return <TrendingDown className="size-3 text-red-500" />
  return <Minus className="size-3 text-muted-foreground" />
}

function KPICard({
  title,
  value,
  unit,
  icon,
  trend,
  subtitle,
}: {
  title: string
  value: string
  unit?: string
  icon: React.ReactNode
  trend?: { current: number; previous: number }
  subtitle?: string
}) {
  const trendDiff = trend ? trend.current - trend.previous : undefined
  const trendPct = trend && trend.previous !== 0
    ? ((trend.current - trend.previous) / Math.abs(trend.previous)) * 100
    : undefined

  return (
    <Card className="p-3 bg-card/50 border-border/50">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-medium mb-1">
            <span className="size-3.5 shrink-0">{icon}</span>
            <span className="truncate">{title}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-foreground tabular-nums">{value}</span>
            {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
          </div>
          {trendPct !== undefined && (
            <div className={cn(
              'flex items-center gap-0.5 text-[10px] mt-0.5',
              trendDiff > 0 ? 'text-emerald-500' : trendDiff < 0 ? 'text-red-500' : 'text-muted-foreground',
            )}>
              <TrendIcon current={trend!.current} previous={trend!.previous} />
              <span>{trendPct > 0 ? '+' : ''}{trendPct.toFixed(1)}% from prev</span>
            </div>
          )}
          {subtitle && !trendPct && (
            <span className="text-[10px] text-muted-foreground">{subtitle}</span>
          )}
        </div>
      </div>
    </Card>
  )
}

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: '1h', label: '1h' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: 'all', label: 'All' },
]

const ROLE_COLORS: Record<string, string> = {
  architect: '#22c55e',
  developer: '#10b981',
  reviewer: '#3b82f6',
  tester: '#f59e0b',
  devops: '#f97316',
  pm: '#ec4899',
}

export function BenchmarksDashboard() {
  const currentProject = useAppStore((s) => s.currentProject)
  const [data, setData] = useState<BenchmarksData | null>(null)
  const [loading, setLoading] = useState(false)
  const [takingSnapshot, setTakingSnapshot] = useState(false)
  const [range, setRange] = useState<TimeRange>('24h')
  const [rawMetricsOpen, setRawMetricsOpen] = useState(false)

  const fetchData = useCallback(async () => {
    if (!currentProject?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/benchmarks?projectId=${currentProject.id}&range=${range}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (e) {
      console.error('Failed to fetch benchmarks:', e)
    } finally {
      setLoading(false)
    }
  }, [currentProject?.id, range])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleTakeSnapshot = useCallback(async () => {
    if (!currentProject?.id) return
    setTakingSnapshot(true)
    try {
      const res = await fetch('/api/benchmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: currentProject.id }),
      })
      if (res.ok) {
        await fetchData()
      }
    } catch (e) {
      console.error('Failed to take snapshot:', e)
    } finally {
      setTakingSnapshot(false)
    }
  }, [currentProject?.id, fetchData])

  const latest = data?.latest
  const snapshots = data?.snapshots || []
  const perAgent = data?.perAgentBreakdown || []

  // Get previous snapshot for trend calculation
  const previous = snapshots.length >= 2 ? snapshots[snapshots.length - 2] : undefined

  // Chart data
  const chartData = useMemo(() => {
    return snapshots.map((s) => ({
      name: new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mean: Math.round(s.meanResolutionTime),
      p50: Math.round(s.p50ResolutionTime),
      p95: Math.round(s.p95ResolutionTime),
      p99: Math.round(s.p99ResolutionTime),
      autonomyRate: Math.round(s.autonomyRate * 100),
      firstPassRate: Math.round(s.firstPassRate * 100),
    }))
  }, [snapshots])

  // Sorted agents by tasks completed
  const sortedAgents = useMemo(() => {
    return [...perAgent].sort((a, b) => b.tasksCompleted - a.tasksCompleted)
  }, [perAgent])

  // Raw metrics entries
  const rawMetrics = useMemo(() => {
    if (!latest) return []
    return [
      { key: 'Total Tasks Created', value: latest.totalTasksCreated },
      { key: 'Total Tasks Completed', value: latest.totalTasksCompleted },
      { key: 'Total Tasks Failed', value: latest.totalTasksFailed },
      { key: 'Mean Resolution Time', value: formatDuration(latest.meanResolutionTime) },
      { key: 'P50 Resolution Time', value: formatDuration(latest.p50ResolutionTime) },
      { key: 'P95 Resolution Time', value: formatDuration(latest.p95ResolutionTime) },
      { key: 'P99 Resolution Time', value: formatDuration(latest.p99ResolutionTime) },
      { key: 'First Pass Rate', value: formatPercent(latest.firstPassRate) },
      { key: 'Avg Post-Review Fixes', value: latest.avgPostReviewFixes.toFixed(2) },
      { key: 'Autonomy Rate', value: formatPercent(latest.autonomyRate) },
      { key: 'Avg Human Interventions', value: latest.avgHumanInterventions.toFixed(2) },
      { key: 'Tasks/Hour', value: latest.tasksPerHour.toFixed(2) },
      { key: 'Lines/Hour', value: latest.linesPerHour.toFixed(1) },
      { key: 'Uptime Hours', value: latest.uptimeHours.toFixed(1) },
      { key: 'Error Rate', value: formatPercent(latest.errorRate) },
      { key: 'Total Tokens Used', value: formatNumber(latest.totalTokensUsed) },
      { key: 'Tokens/Task', value: latest.tokensPerTask.toFixed(1) },
      { key: 'Tokens/Line', value: latest.tokensPerLine.toFixed(1) },
    ]
  }, [latest])

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Select a project to view benchmarks
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-foreground">Benchmarks</h2>
            {latest && (
              <span className="text-[10px] text-muted-foreground">
                Last measured: {new Date(latest.timestamp).toLocaleString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Time range selector */}
            <div className="flex items-center gap-0.5 bg-muted/30 rounded-md p-0.5 border border-border/30">
              {TIME_RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  className={cn(
                    'px-2 py-0.5 text-[10px] font-medium rounded transition-colors',
                    range === r.value
                      ? 'bg-emerald-500/20 text-emerald-500'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <Button
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={handleTakeSnapshot}
              disabled={takingSnapshot}
            >
              {takingSnapshot ? <Loader2 className="size-3 animate-spin" /> : <Camera className="size-3" />}
              Take Snapshot
            </Button>
          </div>
        </div>

        {loading && !data && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-5 text-emerald-500 animate-spin" />
          </div>
        )}

        {!loading && !latest && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <BarChart3 className="size-8 opacity-30" />
            <span className="text-sm">No benchmark data yet</span>
            <span className="text-[10px] text-muted-foreground/60">
              Click &quot;Take Snapshot&quot; to capture current metrics
            </span>
          </div>
        )}

        {latest && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard
                title="Autonomy Rate"
                value={formatPercent(latest.autonomyRate)}
                icon={<Zap className="size-3.5 text-emerald-500" />}
                trend={previous ? { current: latest.autonomyRate, previous: previous.autonomyRate } : undefined}
                subtitle="% actions without human"
              />
              <KPICard
                title="Mean Resolution Time"
                value={formatDuration(latest.meanResolutionTime)}
                icon={<Timer className="size-3.5 text-amber-500" />}
                trend={previous ? { current: latest.meanResolutionTime, previous: previous.meanResolutionTime } : undefined}
                subtitle="avg task completion time"
              />
              <KPICard
                title="First Pass Rate"
                value={formatPercent(latest.firstPassRate)}
                icon={<Shield className="size-3.5 text-emerald-500" />}
                trend={previous ? { current: latest.firstPassRate, previous: previous.firstPassRate } : undefined}
                subtitle="% tasks passing review first try"
              />
              <KPICard
                title="Tasks/Hour"
                value={latest.tasksPerHour.toFixed(2)}
                icon={<Gauge className="size-3.5 text-orange-500" />}
                trend={previous ? { current: latest.tasksPerHour, previous: previous.tasksPerHour } : undefined}
                subtitle="throughput metric"
              />
            </div>

            {/* Charts */}
            {chartData.length >= 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Resolution Time Over Time */}
                <Card className="p-3 bg-card/50 border-border/50">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground mb-2">
                    <Clock className="size-3" />
                    Resolution Time Over Time
                  </div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px',
                            fontSize: '10px',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '9px' }} />
                        <Line type="monotone" dataKey="mean" stroke="#10b981" strokeWidth={2} dot={false} name="Mean" />
                        <Line type="monotone" dataKey="p50" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="P50" />
                        <Line type="monotone" dataKey="p95" stroke="#f97316" strokeWidth={1.5} dot={false} name="P95" strokeDasharray="4 2" />
                        <Line type="monotone" dataKey="p99" stroke="#ef4444" strokeWidth={1.5} dot={false} name="P99" strokeDasharray="4 2" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Autonomy & Quality Over Time */}
                <Card className="p-3 bg-card/50 border-border/50">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground mb-2">
                    <Zap className="size-3" />
                    Autonomy & Quality Over Time
                  </div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px',
                            fontSize: '10px',
                          }}
                          formatter={(value: number) => `${value}%`}
                        />
                        <Legend wrapperStyle={{ fontSize: '9px' }} />
                        <Area
                          type="monotone"
                          dataKey="autonomyRate"
                          stroke="#10b981"
                          fill="#10b981"
                          fillOpacity={0.1}
                          strokeWidth={2}
                          name="Autonomy %"
                        />
                        <Area
                          type="monotone"
                          dataKey="firstPassRate"
                          stroke="#22c55e"
                          fill="#22c55e"
                          fillOpacity={0.1}
                          strokeWidth={2}
                          name="First Pass %"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            )}

            {/* Per-Agent Table */}
            {sortedAgents.length > 0 && (
              <Card className="bg-card/50 border-border/50 overflow-hidden">
                <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/30 text-[10px] font-medium text-muted-foreground">
                  <Users className="size-3" />
                  Per-Agent Breakdown
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/20">
                        <th className="text-left px-3 py-1.5 font-medium text-muted-foreground text-[10px]">Agent</th>
                        <th className="text-right px-3 py-1.5 font-medium text-muted-foreground text-[10px]">Assigned</th>
                        <th className="text-right px-3 py-1.5 font-medium text-muted-foreground text-[10px]">Completed</th>
                        <th className="text-right px-3 py-1.5 font-medium text-muted-foreground text-[10px]">Avg Resolution</th>
                        <th className="text-right px-3 py-1.5 font-medium text-muted-foreground text-[10px]">First Pass</th>
                        <th className="text-right px-3 py-1.5 font-medium text-muted-foreground text-[10px]">Autonomy</th>
                        <th className="text-right px-3 py-1.5 font-medium text-muted-foreground text-[10px]">Tokens</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedAgents.map((agent) => {
                        const roleConfig = AGENT_ROLE_CONFIG[agent.role as keyof typeof AGENT_ROLE_CONFIG]
                        const roleColor = ROLE_COLORS[agent.role] || '#6b7280'
                        return (
                          <tr key={agent.id} className="border-b border-border/10 hover:bg-muted/10 transition-colors">
                            <td className="px-3 py-1.5">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="size-2 rounded-full shrink-0"
                                  style={{ backgroundColor: roleColor }}
                                />
                                <span className="font-medium text-foreground">{agent.name}</span>
                                {roleConfig && (
                                  <Badge
                                    variant="outline"
                                    className={cn('text-[8px] px-1 py-0 h-3.5', roleConfig.color)}
                                  >
                                    {roleConfig.label}
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="text-right px-3 py-1.5 tabular-nums text-muted-foreground">{agent.tasksAssigned}</td>
                            <td className="text-right px-3 py-1.5 tabular-nums text-emerald-500 font-medium">{agent.tasksCompleted}</td>
                            <td className="text-right px-3 py-1.5 tabular-nums text-muted-foreground">{formatDuration(agent.avgResolutionTime)}</td>
                            <td className="text-right px-3 py-1.5 tabular-nums">
                              <span className={cn(
                                agent.firstPassRate >= 0.8 ? 'text-emerald-500' :
                                agent.firstPassRate >= 0.5 ? 'text-amber-500' :
                                'text-red-500',
                              )}>
                                {formatPercent(agent.firstPassRate)}
                              </span>
                            </td>
                            <td className="text-right px-3 py-1.5 tabular-nums">
                              <span className={cn(
                                agent.autonomyRate >= 0.9 ? 'text-emerald-500' :
                                agent.autonomyRate >= 0.7 ? 'text-amber-500' :
                                'text-red-500',
                              )}>
                                {formatPercent(agent.autonomyRate)}
                              </span>
                            </td>
                            <td className="text-right px-3 py-1.5 tabular-nums text-muted-foreground">{formatNumber(agent.tokensUsed)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Raw Metrics (Collapsible) */}
            <Card className="bg-card/50 border-border/50 overflow-hidden">
              <button
                className="flex items-center gap-1.5 w-full px-3 py-2 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setRawMetricsOpen(!rawMetricsOpen)}
              >
                {rawMetricsOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                <Cpu className="size-3" />
                Raw Metrics
                <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 ml-1">
                  {rawMetrics.length} fields
                </Badge>
              </button>
              {rawMetricsOpen && (
                <div className="px-3 pb-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-1.5">
                  {rawMetrics.map(({ key, value }) => (
                    <div key={key} className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-muted-foreground truncate">{key}</span>
                      <span className="text-[10px] text-foreground font-medium tabular-nums shrink-0">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </ScrollArea>
  )
}
