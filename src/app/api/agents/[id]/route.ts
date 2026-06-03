import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const agent = await db.agent.findUnique({
      where: { id },
      include: {
        memories: { orderBy: { createdAt: 'desc' } },
        events: { orderBy: { createdAt: 'desc' } },
        experiments: { orderBy: { createdAt: 'desc' } },
      },
    })

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    return NextResponse.json(agent)
  } catch (error) {
    console.error('Agent GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agent' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Check if agent exists
    const existing = await db.agent.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (body.status !== undefined) updateData.status = body.status
    if (body.name !== undefined) updateData.name = body.name
    if (body.role !== undefined) updateData.role = body.role
    if (body.description !== undefined) updateData.description = body.description
    if (body.goals !== undefined) updateData.goals = JSON.stringify(body.goals)
    if (body.tools !== undefined) updateData.tools = JSON.stringify(body.tools)
    if (body.config !== undefined) updateData.config = JSON.stringify(body.config)
    if (body.successRate !== undefined) updateData.successRate = body.successRate
    if (body.tasksCompleted !== undefined) updateData.tasksCompleted = body.tasksCompleted
    if (body.tokensUsed !== undefined) updateData.tokensUsed = body.tokensUsed

    const agent = await db.agent.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(agent)
  } catch (error) {
    console.error('Agent PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if agent exists
    const existing = await db.agent.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    await db.agent.delete({ where: { id } })

    return NextResponse.json({ message: 'Agent deleted successfully' })
  } catch (error) {
    console.error('Agent DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete agent' },
      { status: 500 }
    )
  }
}
