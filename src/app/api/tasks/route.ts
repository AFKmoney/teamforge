import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (projectId) where.projectId = projectId
    if (status) where.status = status

    const tasks = await db.task.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { assignee: true },
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Failed to fetch tasks:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, title, description, status, priority, type, assigneeId, parentTaskId, subtasks } = body

    if (!projectId || !title) {
      return NextResponse.json({ error: 'Project ID and title are required' }, { status: 400 })
    }

    const task = await db.task.create({
      data: {
        projectId,
        title,
        description: description || '',
        status: status || 'backlog',
        priority: priority || 'medium',
        type: type || 'feature',
        assigneeId: assigneeId || null,
        parentTaskId: parentTaskId || null,
        subtasks: subtasks ? JSON.stringify(subtasks) : '[]',
      },
      include: { assignee: true },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Failed to create task:', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
