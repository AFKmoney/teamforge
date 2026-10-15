import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const level = searchParams.get('level')
    const source = searchParams.get('source')
    const search = searchParams.get('search')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 500)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const where: Record<string, unknown> = {}
    if (level && level !== 'all') where.level = level
    if (source && source !== 'all') where.source = source
    if (search) {
      where.OR = [
        { action: { contains: search } },
        { details: { contains: search } },
        { userId: { contains: search } },
      ]
    }

    const [logs, total] = await Promise.all([
      db.systemLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.systemLog.count({ where }),
    ])

    return NextResponse.json({ logs, total, limit, offset })
  } catch (error) {
    console.error('SystemLog GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system logs' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { level, source, action, details, userId } = body
    if (!action) {
      return NextResponse.json(
        { error: 'action is required' },
        { status: 400 }
      )
    }
    const log = await db.systemLog.create({
      data: {
        level: level ?? 'info',
        source: source ?? 'system',
        action,
        details: JSON.stringify(details ?? {}),
        userId: userId ?? null,
      },
    })
    return NextResponse.json(log, { status: 201 })
  } catch (error) {
    console.error('SystemLog POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create system log' },
      { status: 500 }
    )
  }
}
