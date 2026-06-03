import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const agents = await db.agent.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { memories: true, events: true, experiments: true },
        },
      },
    })
    return NextResponse.json(agents)
  } catch (error) {
    console.error('Agents GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, role, description, goals, tools } = body

    if (!name || !role || !description) {
      return NextResponse.json(
        { error: 'name, role, and description are required' },
        { status: 400 }
      )
    }

    const agent = await db.agent.create({
      data: {
        name,
        role,
        description,
        goals: JSON.stringify(goals ?? []),
        tools: JSON.stringify(tools ?? []),
      },
    })

    return NextResponse.json(agent, { status: 201 })
  } catch (error) {
    console.error('Agents POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    )
  }
}
