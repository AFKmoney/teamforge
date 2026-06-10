import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/benchmarks/[id] — Single snapshot detail
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const snapshot = await db.benchmarkSnapshot.findUnique({ where: { id } })

    if (!snapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 })
    }

    // Also fetch agent metrics that were created around the same time
    const nearbyMetrics = await db.agentMetric.findMany({
      where: {
        timestamp: {
          gte: new Date(snapshot.timestamp.getTime() - 5000),
          lte: new Date(snapshot.timestamp.getTime() + 5000),
        },
      },
      include: { agent: true },
    })

    return NextResponse.json({
      snapshot,
      agentMetrics: nearbyMetrics.map(m => ({
        id: m.id,
        agentId: m.agentId,
        agentName: m.agent.name,
        agentRole: m.agent.role,
        tasksAssigned: m.tasksAssigned,
        tasksCompleted: m.tasksCompleted,
        tasksFailed: m.tasksFailed,
        avgResolutionTime: m.avgResolutionTime,
        reviewPassRate: m.reviewPassRate,
        autonomousActions: m.autonomousActions,
        humanInterventions: m.humanInterventions,
        tokensUsed: m.tokensUsed,
      })),
    })
  } catch (error) {
    console.error('Benchmark GET by ID error:', error)
    return NextResponse.json({ error: 'Failed to fetch snapshot' }, { status: 500 })
  }
}

// DELETE /api/benchmarks/[id] — Remove a snapshot
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const snapshot = await db.benchmarkSnapshot.findUnique({ where: { id } })

    if (!snapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 })
    }

    await db.benchmarkSnapshot.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Benchmark DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete snapshot' }, { status: 500 })
  }
}
