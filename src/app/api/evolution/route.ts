import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const events = await db.evolutionEvent.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        agent: { select: { id: true, name: true, role: true } },
      },
    })
    return NextResponse.json(events)
  } catch (error) {
    console.error('Evolution GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch evolution events' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      agentId,
      type,
      title,
      description,
      status,
      beforeState,
      afterState,
      metrics,
      improvementPercent,
      riskLevel,
      approvedBy,
    } = body

    if (!type || !title || !description) {
      return NextResponse.json(
        { error: 'type, title, and description are required' },
        { status: 400 }
      )
    }

    const event = await db.evolutionEvent.create({
      data: {
        agentId: agentId ?? null,
        type,
        title,
        description,
        status: status ?? 'proposed',
        beforeState: JSON.stringify(beforeState ?? {}),
        afterState: JSON.stringify(afterState ?? {}),
        metrics: JSON.stringify(metrics ?? {}),
        improvementPercent: improvementPercent ?? 0,
        riskLevel: riskLevel ?? 'low',
        approvedBy: approvedBy ?? null,
      },
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Evolution POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create evolution event' },
      { status: 500 }
    )
  }
}
