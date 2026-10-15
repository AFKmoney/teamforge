import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const [nodes, edges] = await Promise.all([
      db.knowledgeNode.findMany({ orderBy: { createdAt: 'asc' } }),
      db.knowledgeEdge.findMany({ orderBy: { createdAt: 'asc' } }),
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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { label, type, description, data } = body
    if (!label) {
      return NextResponse.json(
        { error: 'label is required' },
        { status: 400 }
      )
    }
    const node = await db.knowledgeNode.create({
      data: {
        label,
        type: type ?? 'concept',
        description: description ?? '',
        data: JSON.stringify(data ?? {}),
      },
    })
    return NextResponse.json(node, { status: 201 })
  } catch (error) {
    console.error('Knowledge POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create knowledge node' },
      { status: 500 }
    )
  }
}
