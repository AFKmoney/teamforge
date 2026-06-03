import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { broadcastEvent } from '@/lib/ws-broadcast'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const chatSessionId = searchParams.get('chatSessionId')
    const limit = searchParams.get('limit')

    const where: Record<string, unknown> = {}
    if (projectId) where.projectId = projectId
    if (chatSessionId) where.chatSessionId = chatSessionId

    const messages = await db.message.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: limit ? parseInt(limit, 10) : 100,
      include: { agent: true },
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error('Failed to fetch messages:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, chatSessionId, agentId, content, type, metadata } = body

    if (!projectId || !content) {
      return NextResponse.json({ error: 'Project ID and content are required' }, { status: 400 })
    }

    const message = await db.message.create({
      data: {
        projectId,
        chatSessionId: chatSessionId || null,
        agentId: agentId || null,
        content,
        type: type || 'chat',
        metadata: metadata ? JSON.stringify(metadata) : '{}',
      },
      include: { agent: true },
    })

    // Broadcast new message to WS clients
    broadcastEvent('message:new', message)

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error('Failed to create message:', error)
    return NextResponse.json({ error: 'Failed to create message' }, { status: 500 })
  }
}
