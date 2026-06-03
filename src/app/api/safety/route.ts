import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const events = await db.safetyEvent.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(events)
  } catch (error) {
    console.error('Safety GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch safety events' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, severity, description, agentId, metadata } = body

    if (!type || !severity || !description) {
      return NextResponse.json(
        { error: 'type, severity, and description are required' },
        { status: 400 }
      )
    }

    const event = await db.safetyEvent.create({
      data: {
        type,
        severity,
        description,
        agentId: agentId ?? null,
        metadata: JSON.stringify(metadata ?? {}),
      },
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Safety POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create safety event' },
      { status: 500 }
    )
  }
}
