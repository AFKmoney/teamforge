import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500)

    const metrics = await db.agentMetric.findMany({
      where: agentId ? { agentId } : undefined,
      orderBy: { timestamp: 'desc' },
      take: limit,
    })
    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Metrics GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}
