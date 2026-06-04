import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const project = await db.project.findUnique({
      where: { id },
      include: {
        _count: {
          select: { tasks: true, files: true, messages: true, buildLogs: true },
        },
        tasks: {
          orderBy: { updatedAt: 'desc' },
          take: 10,
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { agent: true },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Parse JSON string fields back to arrays
    const parsed = {
      ...project,
      techStack: typeof project.techStack === 'string' ? JSON.parse(project.techStack) : project.techStack,
      tasks: project.tasks?.map((t: Record<string, unknown>) => t), // already objects
      messages: project.messages?.map((m: Record<string, unknown>) => m), // already objects
    }
    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Failed to fetch project:', error)
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const existing = await db.project.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = body.name
    if (body.description !== undefined) data.description = body.description
    if (body.techStack !== undefined) data.techStack = JSON.stringify(body.techStack)
    if (body.repoUrl !== undefined) data.repoUrl = body.repoUrl
    if (body.status !== undefined) data.status = body.status

    const project = await db.project.update({
      where: { id },
      data,
    })

    // Parse JSON string fields back to arrays
    const parsed = {
      ...project,
      techStack: typeof project.techStack === 'string' ? JSON.parse(project.techStack) : project.techStack,
    }
    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Failed to update project:', error)
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.project.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    await db.project.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete project:', error)
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
  }
}
