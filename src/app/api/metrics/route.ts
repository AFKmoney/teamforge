import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    // SystemMetric model does not exist in schema — return empty array
    return NextResponse.json([])
  } catch (error) {
    console.error('Metrics GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}
