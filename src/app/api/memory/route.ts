import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    const where = type ? { type } : {}

    const memories = await db.memory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        agent: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(memories)
  } catch (error) {
    console.error('Memory GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch memories' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { agentId, type, category, content, metadata, importance, expiresAt } =
      body

    if (!type || !content) {
      return NextResponse.json(
        { error: 'type and content are required' },
        { status: 400 }
      )
    }

    const memory = await db.memory.create({
      data: {
        agentId: agentId ?? null,
        type,
        category: category ?? 'general',
        content,
        metadata: JSON.stringify(metadata ?? {}),
        importance: importance ?? 0.5,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    })

    return NextResponse.json(memory, { status: 201 })
  } catch (error) {
    console.error('Memory POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create memory' },
      { status: 500 }
    )
  }
}
