import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { broadcastEvent } from '@/lib/ws-broadcast'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const type = searchParams.get('type')
    const limit = searchParams.get('limit')

    const where: Record<string, unknown> = {}
    if (projectId) where.projectId = projectId
    if (type) where.type = type

    const buildLogs = await db.buildLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit, 10) : 50,
    })

    return NextResponse.json(buildLogs)
  } catch (error) {
    console.error('Failed to fetch build logs:', error)
    return NextResponse.json({ error: 'Failed to fetch build logs' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, output, status, type } = body

    if (!projectId || !output) {
      return NextResponse.json({ error: 'Project ID and output are required' }, { status: 400 })
    }

    const buildLog = await db.buildLog.create({
      data: {
        projectId,
        output,
        status: status || 'running',
        type: type || 'build',
      },
    })

    // Broadcast new build log to WS clients
    broadcastEvent('build:new', buildLog)

    return NextResponse.json(buildLog, { status: 201 })
  } catch (error) {
    console.error('Failed to create build log:', error)
    return NextResponse.json({ error: 'Failed to create build log' }, { status: 500 })
  }
}
