import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Benchmark model does not exist in schema — return empty array
    return NextResponse.json([])
  } catch (error) {
    console.error('Benchmarks GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch benchmarks' },
      { status: 500 }
    )
  }
}
