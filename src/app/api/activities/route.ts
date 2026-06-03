import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = searchParams.get('limit')

    const activities = await db.agentActivity.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit, 10) : 50,
      include: { agent: true },
    })

    return NextResponse.json(activities)
  } catch (error) {
    console.error('Failed to fetch activities:', error)
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
  }
}
