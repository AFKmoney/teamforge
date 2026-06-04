import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const [nodes, edges] = await Promise.all([
      db.knowledgeNode.findMany({
        orderBy: { createdAt: 'desc' },
      }),
      db.knowledgeEdge.findMany({
        include: {
          source: { select: { id: true, label: true, type: true } },
          target: { select: { id: true, label: true, type: true } },
        },
      }),
    ])

    return NextResponse.json({ nodes, edges })
  } catch (error) {
    console.error('Knowledge GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch knowledge graph' },
      { status: 500 }
    )
  }
}
