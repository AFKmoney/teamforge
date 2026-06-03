import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const metric = searchParams.get('metric')
    const hoursParam = searchParams.get('hours')
    const hours = hoursParam ? parseInt(hoursParam, 10) : 24

    const since = new Date(Date.now() - hours * 60 * 60 * 1000)

    const where: Record<string, unknown> = {
      timestamp: { gte: since },
    }
    if (metric) {
      where.metric = metric
    }

    const metrics = await db.systemMetric.findMany({
      where,
      orderBy: { timestamp: 'desc' },
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
