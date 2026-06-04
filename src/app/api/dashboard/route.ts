import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Total agents count and active agents count (valid model)
    const [totalAgents, activeAgents] = await Promise.all([
      db.agent.count(),
      db.agent.count({ where: { status: 'active' } }),
    ])

    // Total tokens used and tasks completed across all agents
    const agentAggregates = await db.agent.aggregate({
      _sum: { tokensUsed: true, tasksCompleted: true },
    })

    // The following models do not exist in the Prisma schema:
    // - memory, evolutionEvent, benchmark, safetyEvent, systemMetric
    // Return default/empty values for their data

    return NextResponse.json({
      agents: {
        total: totalAgents,
        active: activeAgents,
      },
      memories: {
        total: 0,
      },
      evolution: {
        total: 0,
        statusBreakdown: {},
        latest: [],
      },
      benchmarks: {
        averageScore: 0,
      },
      safety: {
        unresolvedEvents: 0,
      },
      systemHealth: {},
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
