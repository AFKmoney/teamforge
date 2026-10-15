import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const memories = await db.memory.findMany({
      where: type && type !== 'all' ? { type } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 500,
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

const VALID_MEMORY_TYPES = ['working', 'episodic', 'semantic', 'procedural', 'evolution']

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const { agentId, type, category, content, metadata, importance, expiresAt } = body as Record<string, unknown>
    if (!type || !content) {
      return NextResponse.json(
        { error: 'type and content are required' },
        { status: 400 }
      )
    }
    if (typeof type !== 'string' || !VALID_MEMORY_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${VALID_MEMORY_TYPES.join(', ')}` },
        { status: 400 }
      )
    }
    if (typeof content !== 'string') {
      return NextResponse.json({ error: 'content must be a string' }, { status: 400 })
    }
    const memory = await db.memory.create({
      data: {
        agentId: typeof agentId === 'string' ? agentId : null,
        type,
        category: typeof category === 'string' ? category : 'general',
        content,
        metadata: JSON.stringify(metadata ?? {}),
        importance: typeof importance === 'number' ? importance : 0.5,
        expiresAt: typeof expiresAt === 'string' ? new Date(expiresAt) : null,
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
