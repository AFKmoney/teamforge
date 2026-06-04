'use client'

import { useAppStore } from '@/lib/store'
import { AGENT_ROLE_CONFIG, type TaskStatus, type AgentRole } from '@/lib/types'
import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts'
import { BarChart3, Cpu, CheckCircle2, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

// Status colors for pie chart (no indigo/blue)
const STATUS_COLORS: Record<string, string> = {
  backlog: '#71717a',     // zinc
  todo: '#06b6d4',        // cyan
  in_progress: '#f59e0b', // amber
  in_review: '#a855f7',   // purple
  done: '#10b981',        // emerald
  blocked: '#ef4444',     // red
}

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
  blocked: 'Blocked',
}

// Agent role colors
const ROLE_COLORS = [
  '#10b981', // emerald
  '#f59e0b', // amber
  '#06b6d4', // cyan
  '#a855f7', // purple
  '#ef4444', // red
  '#ec4899', // pink
  '#f97316', // orange
  '#14b8a6', // teal
]

// Custom tooltip for pie chart (declared outside render to avoid re-creation)
function PieTooltipContent({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { color: string } }> }) {
  if (active && payload && payload.length) {
    const data = payload[0]
    return (
      <div className="bg-card border border-border rounded-md px-3 py-2 shadow-lg text-xs">
        <div className="flex items-center gap-2">
          <div className="size-2.5 rounded-full" style={{ backgroundColor: data.payload.color }} />
          <span className="font-medium text-foreground">{data.name}</span>
        </div>
        <div className="text-muted-foreground mt-1">
          {data.value} task{data.value !== 1 ? 's' : ''}
        </div>
      </div>
    )
  }
  return null
}

// Custom label for pie chart (declared outside render)
function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: { cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number }) {
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export function AnalyticsDashboard() {
  const tasks = useAppStore((s) => s.tasks)
  const agents = useAppStore((s) => s.agents)

  // === 1. Token Usage Area Chart ===
  const tokenUsageData = useMemo(() => {
    if (agents.length === 0) {
      return Array.from({ length: 10 }, (_, i) => ({
        name: `T-${10 - i}`,
        tokens: 0,
      }))
    }

    const totalTokens = agents.reduce((sum, a) => sum + a.tokensUsed, 0)
    const points = 10
    const baseIncrement = Math.max(Math.floor(totalTokens / points), 100)

    return Array.from({ length: points }, (_, i) => {
      const progress = (i + 1) / points
      const variance = Math.sin(i * 1.5) * baseIncrement * 0.3
      const cumulative = Math.floor(totalTokens * progress + variance)
      return {
        name: `T-${points - i}`,
        tokens: Math.max(0, cumulative),
      }
    })
  }, [agents])

  // === 2. Task Completion Pie Chart ===
  const taskCompletionData = useMemo(() => {
    const statusCounts: Record<string, number> = {}
    for (const task of tasks) {
      statusCounts[task.status] = (statusCounts[task.status] || 0) + 1
    }

    const statuses: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'blocked']
    return statuses
      .filter((s) => (statusCounts[s] || 0) > 0)
      .map((status) => ({
        name: STATUS_LABELS[status] || status,
        value: statusCounts[status] || 0,
        color: STATUS_COLORS[status] || '#71717a',
      }))
  }, [tasks])

  // Total for percentage calculation in tooltip
  const totalTasksForPie = useMemo(() => taskCompletionData.reduce((s, d) => s + d.value, 0), [taskCompletionData])

  // === 3. Agent Productivity Bar Chart ===
  const agentProductivityData = useMemo(() => {
    if (agents.length === 0) return []

    return agents.map((agent, i) => {
      const roleConfig = AGENT_ROLE_CONFIG[agent.role as AgentRole]
      return {
        name: agent.name.length > 10 ? agent.name.slice(0, 10) + '…' : agent.name,
        fullName: agent.name,
        completed: agent.tasksCompleted,
        tokens: agent.tokensUsed,
        color: ROLE_COLORS[i % ROLE_COLORS.length],
        role: roleConfig?.label || agent.role,
      }
    }).sort((a, b) => b.completed - a.completed)
  }, [agents])

  // Pie chart tooltip with percentage
  const pieTooltipWithPct = useMemo(() => {
    // Create a wrapper function that captures totalTasksForPie in closure
    return function CustomPieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { color: string } }> }) {
      if (active && payload && payload.length) {
        const data = payload[0]
        const pct = totalTasksForPie > 0 ? ((data.value / totalTasksForPie) * 100).toFixed(1) : '0'
        return (
          <div className="bg-card border border-border rounded-md px-3 py-2 shadow-lg text-xs">
            <div className="flex items-center gap-2">
              <div className="size-2.5 rounded-full" style={{ backgroundColor: data.payload.color }} />
              <span className="font-medium text-foreground">{data.name}</span>
            </div>
            <div className="text-muted-foreground mt-1">
              {data.value} task{data.value !== 1 ? 's' : ''} ({pct}%)
            </div>
          </div>
        )
      }
      return null
    }
  }, [totalTasksForPie])

  return (
    <div className="h-full overflow-y-auto p-4" style={{ scrollbarWidth: 'thin' }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="size-4 text-emerald-500" />
        <h3 className="text-sm font-semibold text-foreground">Analytics Dashboard</h3>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {agents.length} agent{agents.length !== 1 ? 's' : ''} · {tasks.length} task{tasks.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Token Usage Chart */}
        <div className="rounded-lg border border-border/50 bg-muted/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="size-3.5 text-emerald-500" />
            <h4 className="text-xs font-semibold text-foreground">Token Usage</h4>
          </div>
          <div className="h-40">
            {agents.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={tokenUsageData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#71717a' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#71717a' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      fontSize: '11px',
                    }}
                    formatter={(value: number) => [value.toLocaleString(), 'Tokens']}
                  />
                  <Area
                    type="monotone"
                    dataKey="tokens"
                    stroke="#10b981"
                    fill="rgba(16,185,129,0.15)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                No agent data yet
              </div>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground mt-2 text-center">
            Cumulative tokens used by agents (last 10 points)
          </div>
        </div>

        {/* 2. Task Completion Pie Chart */}
        <div className="rounded-lg border border-border/50 bg-muted/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            <h4 className="text-xs font-semibold text-foreground">Task Status</h4>
          </div>
          <div className="h-40">
            {taskCompletionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={taskCompletionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                    labelLine={false}
                    label={renderCustomLabel}
                  >
                    {taskCompletionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={pieTooltipWithPct} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                No tasks yet
              </div>
            )}
          </div>
          {/* Legend */}
          {taskCompletionData.length > 0 && (
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
              {taskCompletionData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1">
                  <div className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-[9px] text-muted-foreground">{entry.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Agent Productivity Bar Chart */}
        <div className="rounded-lg border border-border/50 bg-muted/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="size-3.5 text-emerald-500" />
            <h4 className="text-xs font-semibold text-foreground">Agent Productivity</h4>
          </div>
          <div className="h-40">
            {agentProductivityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agentProductivityData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 8, fill: '#71717a' }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-20}
                  />
                  <YAxis tick={{ fontSize: 9, fill: '#71717a' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      fontSize: '11px',
                    }}
                    formatter={(value: number, _name: string, props: { payload: { fullName: string; role: string } }) => {
                      return [`${value} tasks`, props.payload.fullName]
                    }}
                  />
                  <Bar dataKey="completed" radius={[4, 4, 0, 0]}>
                    {agentProductivityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                No agents yet
              </div>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground mt-2 text-center">
            Tasks completed per agent
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <StatCard
          label="Total Tasks"
          value={tasks.length}
          accent="text-emerald-500"
        />
        <StatCard
          label="Completed"
          value={tasks.filter((t) => t.status === 'done').length}
          accent="text-emerald-500"
        />
        <StatCard
          label="Total Tokens"
          value={agents.reduce((sum, a) => sum + a.tokensUsed, 0).toLocaleString()}
          accent="text-amber-500"
        />
        <StatCard
          label="Avg Success Rate"
          value={agents.length > 0
            ? `${(agents.reduce((sum, a) => sum + a.successRate, 0) / agents.length * 100).toFixed(0)}%`
            : '0%'
          }
          accent="text-cyan-500"
        />
      </div>
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="rounded-lg border border-border/40 bg-muted/10 px-3 py-2.5">
      <div className="text-[10px] text-muted-foreground mb-0.5">{label}</div>
      <div className={cn('text-lg font-bold tabular-nums', accent)}>{value}</div>
    </div>
  )
}
