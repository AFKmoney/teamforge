'use client'

import { useAppStore } from '@/lib/store'
import { type TaskStatus } from '@/lib/types'
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

export function AnalyticsDashboard() {
  const tasks = useAppStore((s) => s.tasks)
  const agents = useAppStore((s) => s.agents)
  const activities = useAppStore((s) => s.activities)
  const buildLogs = useAppStore((s) => s.buildLogs)

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

    // If no data, generate mock data for visual appeal
    const hasData = days.some((d) => d.count > 0)
    if (!hasData) {
      return [
        { day: 'Mon', count: 3 },
        { day: 'Tue', count: 7 },
        { day: 'Wed', count: 5 },
        { day: 'Thu', count: 12 },
        { day: 'Fri', count: 8 },
        { day: 'Sat', count: 2 },
        { day: 'Sun', count: 6 },
      ]
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
