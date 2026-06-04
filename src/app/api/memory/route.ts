import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    // Memory model does not exist in schema — return empty array
    return NextResponse.json([])
  } catch (error) {
    console.error('Memory GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch memories' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { agentId, type, category, content, metadata, importance, expiresAt } =
      body

    if (!type || !content) {
      return NextResponse.json(
        { error: 'type and content are required' },
        { status: 400 }
      )
    }

    // Memory model does not exist in schema — return mock response
    return NextResponse.json(
      {
        id: `mock-${Date.now()}`,
        agentId: agentId ?? null,
        type,
        category: category ?? 'general',
        content,
        metadata: JSON.stringify(metadata ?? {}),
        importance: importance ?? 0.5,
        expiresAt: expiresAt ?? null,
        createdAt: new Date().toISOString(),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Memory POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create memory' },
      { status: 500 }
    )
  }
}
