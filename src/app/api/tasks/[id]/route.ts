import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { broadcastEvent } from '@/lib/ws-broadcast'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const task = await db.task.findUnique({
      where: { id },
      include: { assignee: true },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('Failed to fetch task:', error)
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const existing = await db.task.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (body.title !== undefined) data.title = body.title
    if (body.description !== undefined) data.description = body.description
    if (body.status !== undefined) data.status = body.status
    if (body.priority !== undefined) data.priority = body.priority
    if (body.type !== undefined) data.type = body.type
    if (body.assigneeId !== undefined) data.assigneeId = body.assigneeId
    if (body.parentTaskId !== undefined) data.parentTaskId = body.parentTaskId
    if (body.subtasks !== undefined) data.subtasks = JSON.stringify(body.subtasks)
    if (body.output !== undefined) data.output = body.output

    // Set completedAt when task is marked as done
    if (body.status === 'done' && existing.status !== 'done') {
      data.completedAt = new Date()
    }

    const task = await db.task.update({
      where: { id },
      data,
      include: { assignee: true },
    })

    // Broadcast task update to WS clients
    broadcastEvent('task:update', task)

    return NextResponse.json(task)
  } catch (error) {
    console.error('Failed to update task:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.task.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    await db.task.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete task:', error)
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}
