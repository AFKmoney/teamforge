import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { broadcastEvent } from '@/lib/ws-broadcast'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const agent = await db.agent.findUnique({
      where: { id },
      include: {
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    return NextResponse.json(agent)
  } catch (error) {
    console.error('Failed to fetch agent:', error)
    return NextResponse.json({ error: 'Failed to fetch agent' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const existing = await db.agent.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = body.name
    if (body.role !== undefined) data.role = body.role
    if (body.status !== undefined) data.status = body.status
    if (body.avatar !== undefined) data.avatar = body.avatar
    if (body.specialty !== undefined) data.specialty = body.specialty
    if (body.currentTaskId !== undefined) data.currentTaskId = body.currentTaskId
    if (body.tokensUsed !== undefined) data.tokensUsed = body.tokensUsed
    if (body.tasksCompleted !== undefined) data.tasksCompleted = body.tasksCompleted
    if (body.successRate !== undefined) data.successRate = body.successRate
    if (body.lastActive !== undefined) data.lastActive = new Date(body.lastActive)

    const agent = await db.agent.update({
      where: { id },
      data,
    })

    // If status was changed, create a status_change activity
    if (body.status !== undefined && body.status !== existing.status) {
      const activity = await db.agentActivity.create({
        data: {
          agentId: id,
          action: 'status_change',
          description: `${agent.name} status changed to ${body.status}`,
          metadata: JSON.stringify({ previousStatus: existing.status, newStatus: body.status }),
        },
        include: { agent: true },
      })
      broadcastEvent('activity:new', activity)
    }

    // Broadcast agent update to WS clients
    broadcastEvent('agent:update', agent)

    return NextResponse.json(agent)
  } catch (error) {
    console.error('Failed to update agent:', error)
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.agent.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    await db.agent.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete agent:', error)
    return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 })
  }
}
