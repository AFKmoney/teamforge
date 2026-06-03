import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const experiments = await db.experiment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        agent: { select: { id: true, name: true, role: true } },
      },
    })
    return NextResponse.json(experiments)
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

    const experiment = await db.experiment.create({
      data: {
        agentId: agentId ?? null,
        title,
        hypothesis,
        methodology,
        status: status ?? 'draft',
        results: JSON.stringify(results ?? {}),
        conclusion: conclusion ?? null,
        score: score ?? null,
      },
    })

    return NextResponse.json(experiment, { status: 201 })
  } catch (error) {
    console.error('Research POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create experiment' },
      { status: 500 }
    )
  }
}
