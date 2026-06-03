import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const agents = await db.agent.findMany({
      orderBy: { lastActive: 'desc' },
      include: {
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    return NextResponse.json(agents)
  } catch (error) {
    console.error('Failed to fetch agents:', error)
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, role, avatar, specialty, status } = body

    if (!name || !role) {
      return NextResponse.json({ error: 'Agent name and role are required' }, { status: 400 })
    }

    const agent = await db.agent.create({
      data: {
        name,
        role,
        avatar: avatar || '',
        specialty: specialty || '',
        status: status || 'idle',
      },
    })

    return NextResponse.json(agent, { status: 201 })
  } catch (error) {
    console.error('Failed to create agent:', error)
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 })
  }
}
