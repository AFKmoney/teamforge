import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const projects = await db.project.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { tasks: true, files: true, messages: true, buildLogs: true },
        },
      },
    })
    // Parse JSON string fields back to arrays
    const parsed = projects.map((p) => ({
      ...p,
      techStack: typeof p.techStack === 'string' ? JSON.parse(p.techStack) : p.techStack,
    }))
    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Failed to fetch projects:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, description, techStack, repoUrl, status } = body

    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
    }

    const project = await db.project.create({
      data: {
        name,
        description: description || '',
        techStack: techStack ? JSON.stringify(techStack) : '[]',
        repoUrl: repoUrl || null,
        status: status || 'active',
      },
    })

    // Parse JSON string fields back to arrays
    const parsed = {
      ...project,
      techStack: typeof project.techStack === 'string' ? JSON.parse(project.techStack) : project.techStack,
    }
    return NextResponse.json(parsed, { status: 201 })
  } catch (error) {
    console.error('Failed to create project:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
