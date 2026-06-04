import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Total agents count and active agents count
    const [totalAgents, activeAgents] = await Promise.all([
      db.agent.count(),
      db.agent.count({ where: { status: 'active' } }),
    ])

    // Total memories count
    const totalMemories = await db.memory.count()

    // Evolution events - total, status breakdown, latest 5
    const [totalEvolutionEvents, evolutionByStatus, latestEvolutionEvents] =
      await Promise.all([
        db.evolutionEvent.count(),
        db.evolutionEvent.groupBy({
          by: ['status'],
          _count: { status: true },
        }),
        db.evolutionEvent.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { agent: { select: { id: true, name: true } } },
        }),
      ])

    // Average benchmark score
    const benchmarkAggregate = await db.benchmark.aggregate({
      _avg: { score: true },
    })

    // Unresolved safety events count
    const unresolvedSafetyEvents = await db.safetyEvent.count({
      where: { resolved: false },
    })

    // System health metrics (latest entries per metric type)
    const latestMetrics = await db.systemMetric.findMany({
      orderBy: { timestamp: 'desc' },
      take: 20,
    })

    // Unique metric names for the latest snapshot
    const metricNames = await db.systemMetric.findMany({
      distinct: ['metric'],
      select: { metric: true },
    })

    // Build a map of latest value per metric
    const healthMetrics: Record<string, { value: number; unit: string; timestamp: Date }> = {}
    for (const m of latestMetrics) {
      if (!healthMetrics[m.metric]) {
        healthMetrics[m.metric] = {
          value: m.value,
          unit: m.unit,
          timestamp: m.timestamp,
        }
      }
    }

    // Total tokens used and tasks completed across all agents
    const agentAggregates = await db.agent.aggregate({
      _sum: { tokensUsed: true, tasksCompleted: true },
    })

    // Build evolution status breakdown map
    const evolutionStatusBreakdown: Record<string, number> = {}
    for (const entry of evolutionByStatus) {
      evolutionStatusBreakdown[entry.status] = entry._count.status
    }

    return NextResponse.json({
      agents: {
        total: totalAgents,
        active: activeAgents,
      },
      memories: {
        total: totalMemories,
      },
      evolution: {
        total: totalEvolutionEvents,
        statusBreakdown: evolutionStatusBreakdown,
        latest: latestEvolutionEvents,
      },
      benchmarks: {
        averageScore: benchmarkAggregate._avg.score ?? 0,
      },
      safety: {
        unresolvedEvents: unresolvedSafetyEvents,
      },
      systemHealth: healthMetrics,
      totals: {
        tokensUsed: agentAggregates._sum.tokensUsed ?? 0,
        tasksCompleted: agentAggregates._sum.tasksCompleted ?? 0,
      },
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
