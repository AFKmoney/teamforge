import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // EvolutionEvent model does not exist in schema — return empty array
    return NextResponse.json([])
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

    // EvolutionEvent model does not exist in schema — return mock response
    return NextResponse.json(
      {
        id: `mock-${Date.now()}`,
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Evolution POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create evolution event' },
      { status: 500 }
    )
  }
}
