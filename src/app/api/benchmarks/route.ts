import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const benchmarks = await db.benchmark.findMany({
      orderBy: [{ category: 'asc' }, { runAt: 'desc' }],
    })
    return NextResponse.json(benchmarks)
  } catch (error) {
    console.error('Benchmarks GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch benchmarks' },
      { status: 500 }
    )
  }
}
