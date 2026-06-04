'use client'

import { useAppStore } from '@/lib/store'
import { type TaskStatus, type BuildStatus } from '@/lib/types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  Cell,
} from 'recharts'
import { useMemo } from 'react'
import {
  CheckCircle2,
  ListTodo,
  Cpu,
  Zap,
  FileCode2,
  Activity,
  AlertTriangle,
  Hammer,
  Bot,
  TrendingUp,
  FileWarning,
  Clock,
} from 'lucide-react'

const STATUS_COLORS: Record<TaskStatus, string> = {
  backlog: '#71717a',
  todo: '#3b82f6',
  in_progress: '#f59e0b',
  in_review: '#8b5cf6',
  done: '#10b981',
  blocked: '#ef4444',
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
  blocked: 'Blocked',
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function formatPercent(n: number): string {
  return `${Math.round(n * 100)}%`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Custom tooltip for charts
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; payload?: { successRate?: number } }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-xs shadow-lg">
      <p className="text-zinc-300 font-medium mb-1">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-zinc-400">Count:</span>
          <span className="text-white font-medium">{entry.value}</span>
          {entry.payload?.successRate !== undefined && (
            <>
              <span className="text-zinc-500">|</span>
              <span className="text-zinc-400">Success:</span>
              <span className="text-emerald-400">{formatPercent(entry.payload.successRate)}</span>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

function StatCard({ icon, label, value, subValue, color }: {
  icon: React.ReactNode
  label: string
  value: string
  subValue?: string
  color: string
}) {
  return (
    <div className="flex items-center gap-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-4 py-3 min-w-0">
      <div className={`shrink-0 flex items-center justify-center size-9 rounded-md ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">{label}</p>
        <p className="text-lg font-bold text-white leading-tight">{value}</p>
        {subValue && <p className="text-[10px] text-zinc-500">{subValue}</p>}
      </div>
    </div>
  )
}

// Build status icon helper
function BuildStatusIcon({ status }: { status: BuildStatus | undefined }) {
  switch (status) {
    case 'success':
      return <CheckCircle2 className="size-4 text-emerald-400" />
    case 'failed':
      return <AlertTriangle className="size-4 text-red-400" />
    case 'warning':
      return <AlertTriangle className="size-4 text-amber-400" />
    case 'running':
      return <Hammer className="size-4 text-blue-400 animate-pulse" />
    default:
      return <Hammer className="size-4 text-zinc-500" />
  }
}

function BuildStatusLabel({ status }: { status: BuildStatus | undefined }) {
  switch (status) {
    case 'success':
      return <span className="text-emerald-400 font-medium">Success</span>
    case 'failed':
      return <span className="text-red-400 font-medium">Failed</span>
    case 'warning':
      return <span className="text-amber-400 font-medium">Warning</span>
    case 'running':
      return <span className="text-blue-400 font-medium">Running</span>
    default:
      return <span className="text-zinc-500">No builds yet</span>
  }
}

export function AnalyticsDashboard() {
  const tasks = useAppStore((s) => s.tasks)
  const agents = useAppStore((s) => s.agents)
  const activities = useAppStore((s) => s.activities)
  const buildLogs = useAppStore((s) => s.buildLogs)
  const files = useAppStore((s) => s.files)

  // === Task Progress Data (Bar Chart) ===
  const taskProgressData = useMemo(() => {
    const statuses: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'blocked']
    return statuses.map((status) => ({
      status: STATUS_LABELS[status],
      count: tasks.filter((t) => t.status === status).length,
      color: STATUS_COLORS[status],
    }))
  }, [tasks])

  // === Agent Performance Data (Horizontal Bar Chart) ===
  const agentPerformanceData = useMemo(() => {
    return agents.map((agent) => ({
      name: agent.name,
      completed: agent.tasksCompleted,
      successRate: agent.successRate,
    }))
  }, [agents])

  // === Activity Timeline Data (Area Chart) ===
  const activityTimelineData = useMemo(() => {
    // Group activities by day (last 7 days)
    const now = new Date()
    const days: { day: string; count: number }[] = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' })
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

      const count = activities.filter((a) => {
        const aDate = new Date(a.createdAt)
        return aDate >= dayStart && aDate < dayEnd
      }).length

      // Also count build logs as activity
      const buildCount = buildLogs.filter((b) => {
        const bDate = new Date(b.createdAt)
        return bDate >= dayStart && bDate < dayEnd
      }).length

      days.push({ day: dayStr, count: count + buildCount })
    }

    return days
  }, [activities, buildLogs])

  // === Summary Stats ===
  const totalTasks = tasks.length
  const completedThisWeek = useMemo(() => {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return tasks.filter((t) => t.status === 'done' && t.completedAt && new Date(t.completedAt) >= weekAgo).length
  }, [tasks])
  const activeAgents = agents.filter((a) => a.status !== 'sleeping').length
  const totalTokens = agents.reduce((sum, a) => sum + a.tokensUsed, 0)

  // === Project Health Computations ===
  const projectFiles = useMemo(() => files.filter((f) => !f.isDirectory), [files])

  const fileStats = useMemo(() => {
    const totalFiles = projectFiles.length
    const fileSizes = projectFiles.map((f) => new Blob([f.content]).size)
    const largestFile = projectFiles.reduce<{ path: string; size: number } | null>((max, f) => {
      const size = new Blob([f.content]).size
      if (!max || size > max.size) return { path: f.path, size }
      return max
    }, null)
    const totalSize = fileSizes.reduce((sum, s) => sum + s, 0)
    const avgSize = totalFiles > 0 ? totalSize / totalFiles : 0
    return { totalFiles, largestFile, avgSize, totalSize }
  }, [projectFiles])

  const taskStats = useMemo(() => {
    const total = tasks.length
    const done = tasks.filter((t) => t.status === 'done').length
    const completionRate = total > 0 ? done / total : 0
    const byStatus: Record<string, number> = {}
    for (const status of Object.keys(STATUS_LABELS) as TaskStatus[]) {
      byStatus[status] = tasks.filter((t) => t.status === status).length
    }
    return { total, done, completionRate, byStatus }
  }, [tasks])

  const lastBuild = useMemo(() => {
    if (buildLogs.length === 0) return null
    return buildLogs[0] // Already sorted newest first by store
  }, [buildLogs])

  const agentPerformance = useMemo(() => {
    if (agents.length === 0) return { avgSuccessRate: 0, topPerformer: null }
    const avgSuccessRate = agents.reduce((sum, a) => sum + a.successRate, 0) / agents.length
    const topPerformer = agents.reduce<{ name: string; tasksCompleted: number; successRate: number } | null>((best, a) => {
      if (!best || a.tasksCompleted > best.tasksCompleted) {
        return { name: a.name, tasksCompleted: a.tasksCompleted, successRate: a.successRate }
      }
      return best
    }, null)
    return { avgSuccessRate, topPerformer }
  }, [agents])

  const techDebtFiles = useMemo(() => {
    return projectFiles
      .map((f) => ({ path: f.path, lines: f.content.split('\n').length }))
      .filter((f) => f.lines > 300)
      .sort((a, b) => b.lines - a.lines)
      .slice(0, 10)
  }, [projectFiles])

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<ListTodo className="size-4 text-blue-400" />}
          label="Total Tasks"
          value={totalTasks.toString()}
          subValue={`${tasks.filter((t) => t.status === 'in_progress').length} active`}
          color="bg-blue-500/10"
        />
        <StatCard
          icon={<CheckCircle2 className="size-4 text-emerald-400" />}
          label="Completed This Week"
          value={completedThisWeek.toString()}
          subValue={totalTasks > 0 ? `${formatPercent(completedThisWeek / totalTasks)} of total` : 'No tasks'}
          color="bg-emerald-500/10"
        />
        <StatCard
          icon={<Cpu className="size-4 text-amber-400" />}
          label="Active Agents"
          value={`${activeAgents}/${agents.length}`}
          subValue={`${agents.length - activeAgents} idle`}
          color="bg-amber-500/10"
        />
        <StatCard
          icon={<Zap className="size-4 text-violet-400" />}
          label="Token Usage"
          value={formatNumber(totalTokens)}
          subValue="Total across agents"
          color="bg-violet-500/10"
        />
      </div>

      {/* ========== Project Health Section ========== */}
      <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="size-4 text-emerald-400" />
          <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            Project Health
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Files Stats */}
          <div className="bg-zinc-900/60 border border-zinc-700/40 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <FileCode2 className="size-4 text-blue-400" />
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Files</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500">Total files</span>
                <span className="text-xs font-bold text-white">{fileStats.totalFiles}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500">Largest file</span>
                <span className="text-xs font-medium text-zinc-300 truncate max-w-[100px]" title={fileStats.largestFile?.path}>
                  {fileStats.largestFile ? `${formatFileSize(fileStats.largestFile.size)}` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500">Avg file size</span>
                <span className="text-xs font-medium text-zinc-300">{formatFileSize(Math.round(fileStats.avgSize))}</span>
              </div>
            </div>
          </div>

          {/* Tasks Stats */}
          <div className="bg-zinc-900/60 border border-zinc-700/40 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <ListTodo className="size-4 text-emerald-400" />
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Tasks</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500">Completion rate</span>
                <span className="text-xs font-bold text-emerald-400">{formatPercent(taskStats.completionRate)}</span>
              </div>
              {/* Mini status breakdown */}
              <div className="space-y-0.5">
                {(Object.keys(taskStats.byStatus) as TaskStatus[]).map((status) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} />
                      <span className="text-[10px] text-zinc-500">{STATUS_LABELS[status]}</span>
                    </div>
                    <span className="text-[10px] font-medium text-zinc-400">{taskStats.byStatus[status]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Build Status */}
          <div className="bg-zinc-900/60 border border-zinc-700/40 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Hammer className="size-4 text-amber-400" />
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Build Status</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <BuildStatusIcon status={lastBuild?.status as BuildStatus | undefined} />
                <BuildStatusLabel status={lastBuild?.status as BuildStatus | undefined} />
              </div>
              {lastBuild && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500">Type</span>
                    <span className="text-xs font-medium text-zinc-300 capitalize">{lastBuild.type}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500">Timestamp</span>
                    <span className="text-[10px] text-zinc-400">
                      {new Date(lastBuild.createdAt).toLocaleString(undefined, {
                        month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                </>
              )}
              {!lastBuild && (
                <p className="text-[10px] text-zinc-600 italic">No builds recorded yet</p>
              )}
            </div>
          </div>

          {/* Agent Performance */}
          <div className="bg-zinc-900/60 border border-zinc-700/40 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Bot className="size-4 text-violet-400" />
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Agent Performance</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500">Avg success rate</span>
                <span className="text-xs font-bold text-emerald-400">{formatPercent(agentPerformance.avgSuccessRate)}</span>
              </div>
              {agentPerformance.topPerformer && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500">Top performer</span>
                  <span className="text-xs font-medium text-violet-400">{agentPerformance.topPerformer.name}</span>
                </div>
              )}
              {/* Per-agent breakdown */}
              <div className="space-y-0.5 max-h-32 overflow-y-auto thin-scrollbar">
                {agents.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500 truncate max-w-[80px]">{agent.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-400">{agent.tasksCompleted} done</span>
                      <span className="text-[10px] font-medium text-emerald-400">{formatPercent(agent.successRate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tech Debt Indicators */}
        {techDebtFiles.length > 0 && (
          <div className="mt-3 bg-zinc-900/60 border border-zinc-700/40 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <FileWarning className="size-4 text-amber-400" />
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Tech Debt Indicators</span>
              <span className="text-[9px] text-amber-500/70 ml-1">Files over 300 lines</span>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto thin-scrollbar">
              {techDebtFiles.map((file) => (
                <div key={file.path} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <FileCode2 className="size-3 text-amber-500/60 shrink-0" />
                    <span className="text-[10px] text-zinc-300 truncate">{file.path}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-16 h-1.5 rounded-full bg-zinc-700/50 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-500"
                        style={{ width: `${Math.min((file.lines / 1000) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-amber-400 w-10 text-right">{file.lines}L</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Task Progress Bar Chart */}
        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-3">
            Task Progress
          </h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskProgressData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis
                  dataKey="status"
                  tick={{ fontSize: 10, fill: '#a1a1aa' }}
                  axisLine={{ stroke: '#3f3f46' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#a1a1aa' }}
                  axisLine={false}
                  tickLine={false}
                  width={24}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {taskProgressData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Agent Performance Horizontal Bar Chart */}
        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-3">
            Agent Performance
          </h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={agentPerformanceData}
                layout="vertical"
                margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: '#a1a1aa' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#a1a1aa' }}
                  axisLine={false}
                  tickLine={false}
                  width={70}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="completed" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4">
        <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-3">
          Activity Timeline (Last 7 Days)
        </h3>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activityTimelineData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: '#a1a1aa' }}
                axisLine={{ stroke: '#3f3f46' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#a1a1aa' }}
                axisLine={false}
                tickLine={false}
                width={24}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#activityGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
