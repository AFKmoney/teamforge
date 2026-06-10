import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function getTimeRangeFilter(range: string): Date | null {
  const now = new Date()
  switch (range) {
    case '1h': return new Date(now.getTime() - 60 * 60 * 1000)
    case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000)
    case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    case 'all': return null
    default: return new Date(now.getTime() - 24 * 60 * 60 * 1000)
  }
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(idx)
  const upper = Math.ceil(idx)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower)
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0
  return percentile(arr, 50)
}

// GET /api/benchmarks?projectId=xxx&range=24h
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const range = searchParams.get('range') || '24h'

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const timeFilter = getTimeRangeFilter(range)

    // Fetch snapshots for time-series
    const snapshots = await db.benchmarkSnapshot.findMany({
      where: {
        projectId,
        ...(timeFilter ? { timestamp: { gte: timeFilter } } : {}),
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    })

    // Fetch agent metrics
    const agentMetrics = await db.agentMetric.findMany({
      where: {
        agent: { assignedTasks: { some: { projectId } } },
        ...(timeFilter ? { timestamp: { gte: timeFilter } } : {}),
      },
      include: { agent: true },
      orderBy: { timestamp: 'desc' },
    })

    // Aggregate per-agent metrics
    const agentMap = new Map<string, {
      name: string
      role: string
      tasksAssigned: number
      tasksCompleted: number
      tasksFailed: number
      resolutionTimes: number[]
      reviewPassCount: number
      totalReviewCount: number
      postReviewCorrections: number
      autonomousActions: number
      humanInterventions: number
      tokensUsed: number
    }>()

    for (const m of agentMetrics) {
      const existing = agentMap.get(m.agentId) || {
        name: m.agent.name,
        role: m.agent.role,
        tasksAssigned: 0,
        tasksCompleted: 0,
        tasksFailed: 0,
        resolutionTimes: [],
        reviewPassCount: 0,
        totalReviewCount: 0,
        postReviewCorrections: 0,
        autonomousActions: 0,
        humanInterventions: 0,
        tokensUsed: 0,
      }
      existing.tasksAssigned += m.tasksAssigned
      existing.tasksCompleted += m.tasksCompleted
      existing.tasksFailed += m.tasksFailed
      if (m.avgResolutionTime > 0) existing.resolutionTimes.push(m.avgResolutionTime)
      existing.reviewPassCount += Math.round(m.reviewPassRate * m.tasksAssigned)
      existing.totalReviewCount += m.tasksAssigned
      existing.postReviewCorrections += m.postReviewCorrections
      existing.autonomousActions += m.autonomousActions
      existing.humanInterventions += m.humanInterventions
      existing.tokensUsed += m.tokensUsed
      agentMap.set(m.agentId, existing)
    }

    const perAgentBreakdown = Array.from(agentMap.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      role: data.role,
      tasksAssigned: data.tasksAssigned,
      tasksCompleted: data.tasksCompleted,
      tasksFailed: data.tasksFailed,
      avgResolutionTime: data.resolutionTimes.length > 0
        ? data.resolutionTimes.reduce((a, b) => a + b, 0) / data.resolutionTimes.length
        : 0,
      firstPassRate: data.totalReviewCount > 0 ? data.reviewPassCount / data.totalReviewCount : 0,
      autonomyRate: (data.autonomousActions + data.humanInterventions) > 0
        ? data.autonomousActions / (data.autonomousActions + data.humanInterventions)
        : 0,
      tokensUsed: data.tokensUsed,
    }))

    const latest = snapshots.length > 0 ? snapshots[0] : null

    return NextResponse.json({
      latest,
      snapshots: snapshots.reverse(), // chronological order for charts
      perAgentBreakdown,
    })
  } catch (error) {
    console.error('Benchmarks GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch benchmarks' }, { status: 500 })
  }
}

// POST /api/benchmarks — Take a snapshot
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId } = body

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    // Verify project exists
    const project = await db.project.findUnique({ where: { id: projectId } })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get all tasks for this project
    const tasks = await db.task.findMany({ where: { projectId } })
    const agents = await db.agent.findMany()
    const activities = await db.agentActivity.findMany()
    const files = await db.projectFile.findMany({ where: { projectId } })

    const completedTasks = tasks.filter(t => t.status === 'done')
    const failedTasks = tasks.filter(t => t.status === 'blocked')

    // Calculate resolution times (completedAt - createdAt in seconds)
    const resolutionTimes = completedTasks
      .filter(t => t.completedAt)
      .map(t => (new Date(t.completedAt!).getTime() - new Date(t.createdAt).getTime()) / 1000)

    const meanResTime = resolutionTimes.length > 0
      ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
      : 0
    const p50 = median(resolutionTimes)
    const p95 = percentile(resolutionTimes, 95)
    const p99 = percentile(resolutionTimes, 99)

    // Quality: estimate first pass rate based on tasks that went through review once
    const reviewTasks = tasks.filter(t => t.status === 'done' || t.status === 'in_review')
    const firstPassRate = completedTasks.length > 0
      ? Math.min(1, (completedTasks.length - failedTasks.length) / Math.max(1, completedTasks.length))
      : 0

    // Autonomy: estimate from activities
    const autonomousActions = activities.filter(a =>
      ['task_completed', 'code_written', 'file_created', 'file_updated', 'code_change'].includes(a.action)
    ).length
    const humanInterventions = activities.filter(a =>
      ['status_change', 'review_completed'].includes(a.action)
    ).length
    const totalActions = autonomousActions + humanInterventions
    const autonomyRate = totalActions > 0 ? autonomousActions / totalActions : 0.95

    // Throughput: tasks per hour (based on project age)
    const projectAge = (Date.now() - new Date(project.createdAt).getTime()) / (1000 * 60 * 60)
    const tasksPerHour = projectAge > 0 ? completedTasks.length / projectAge : 0
    const linesPerHour = projectAge > 0 ? files.reduce((acc, f) => acc + (f.content?.split('\n').length || 0), 0) / projectAge : 0

    // Stability
    const uptimeHours = projectAge
    const errorActions = activities.filter(a => {
      try {
        const meta = JSON.parse(a.metadata)
        return meta?.error || meta?.status === 'failed'
      } catch { return false }
    }).length
    const errorRate = totalActions > 0 ? errorActions / totalActions : 0

    // Token efficiency
    const totalTokensUsed = agents.reduce((acc, a) => acc + a.tokensUsed, 0)
    const tokensPerTask = completedTasks.length > 0 ? totalTokensUsed / completedTasks.length : 0
    const totalLines = files.reduce((acc, f) => acc + (f.content?.split('\n').length || 0), 0)
    const tokensPerLine = totalLines > 0 ? totalTokensUsed / totalLines : 0

    // Create the snapshot
    const snapshot = await db.benchmarkSnapshot.create({
      data: {
        projectId,
        totalTasksCreated: tasks.length,
        totalTasksCompleted: completedTasks.length,
        totalTasksFailed: failedTasks.length,
        meanResolutionTime: Math.round(meanResTime * 100) / 100,
        p50ResolutionTime: Math.round(p50 * 100) / 100,
        p95ResolutionTime: Math.round(p95 * 100) / 100,
        p99ResolutionTime: Math.round(p99 * 100) / 100,
        firstPassRate: Math.round(firstPassRate * 10000) / 10000,
        avgPostReviewFixes: 0,
        autonomyRate: Math.round(autonomyRate * 10000) / 10000,
        avgHumanInterventions: completedTasks.length > 0 ? humanInterventions / completedTasks.length : 0,
        tasksPerHour: Math.round(tasksPerHour * 100) / 100,
        linesPerHour: Math.round(linesPerHour * 100) / 100,
        uptimeHours: Math.round(uptimeHours * 100) / 100,
        errorRate: Math.round(errorRate * 10000) / 10000,
        totalTokensUsed,
        tokensPerTask: Math.round(tokensPerTask * 100) / 100,
        tokensPerLine: Math.round(tokensPerLine * 100) / 100,
      },
    })

    // Also create/update per-agent metrics
    for (const agent of agents) {
      const agentTasks = tasks.filter(t => t.assigneeId === agent.id)
      const agentCompleted = agentTasks.filter(t => t.status === 'done')
      const agentFailed = agentTasks.filter(t => t.status === 'blocked')
      const agentResTimes = agentCompleted
        .filter(t => t.completedAt)
        .map(t => (new Date(t.completedAt!).getTime() - new Date(t.createdAt).getTime()) / 1000)

      const agentAutonomous = activities.filter(a =>
        a.agentId === agent.id && ['task_completed', 'code_written', 'file_created', 'file_updated'].includes(a.action)
      ).length
      const agentHuman = activities.filter(a =>
        a.agentId === agent.id && ['status_change'].includes(a.action)
      ).length

      await db.agentMetric.create({
        data: {
          agentId: agent.id,
          tasksAssigned: agentTasks.length,
          tasksCompleted: agentCompleted.length,
          tasksFailed: agentFailed.length,
          avgResolutionTime: agentResTimes.length > 0
            ? Math.round((agentResTimes.reduce((a, b) => a + b, 0) / agentResTimes.length) * 100) / 100
            : 0,
          medianResolutionTime: Math.round(median(agentResTimes) * 100) / 100,
          reviewPassRate: agentCompleted.length > 0
            ? Math.round(Math.min(1, (agentCompleted.length - agentFailed.length) / agentCompleted.length) * 10000) / 10000
            : 0,
          postReviewCorrections: 0,
          autonomousActions: agentAutonomous,
          humanInterventions: agentHuman,
          tokensUsed: agent.tokensUsed,
        },
      })
    }

    return NextResponse.json(snapshot, { status: 201 })
  } catch (error) {
    console.error('Benchmarks POST error:', error)
    return NextResponse.json({ error: 'Failed to create benchmark snapshot' }, { status: 500 })
  }
}
