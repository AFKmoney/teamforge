import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // SafetyEvent model does not exist in schema — return empty array
    return NextResponse.json([])
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

    // SafetyEvent model does not exist in schema — return mock response
    return NextResponse.json(
      {
        id: `mock-${Date.now()}`,
        type,
        severity,
        description,
        agentId: agentId ?? null,
        metadata: JSON.stringify(metadata ?? {}),
        resolved: false,
        createdAt: new Date().toISOString(),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Safety POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create safety event' },
      { status: 500 }
    )
  }
}
