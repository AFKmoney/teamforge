import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Experiment model does not exist in schema — return empty array
    return NextResponse.json([])
  } catch (error) {
    console.error('Research GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch experiments' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { agentId, title, hypothesis, methodology, status, results, conclusion, score } =
      body

    if (!title || !hypothesis || !methodology) {
      return NextResponse.json(
        { error: 'title, hypothesis, and methodology are required' },
        { status: 400 }
      )
    }

    // Experiment model does not exist in schema — return mock response
    return NextResponse.json(
      {
        id: `mock-${Date.now()}`,
        agentId: agentId ?? null,
        title,
        hypothesis,
        methodology,
        status: status ?? 'draft',
        results: JSON.stringify(results ?? {}),
        conclusion: conclusion ?? null,
        score: score ?? null,
        createdAt: new Date().toISOString(),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Research POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create experiment' },
      { status: 500 }
    )
  }
}
