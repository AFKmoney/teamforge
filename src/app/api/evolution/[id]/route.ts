import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // EvolutionEvent model does not exist in schema — return 404
    return NextResponse.json(
      { error: 'Evolution event not found' },
      { status: 404 }
    )
  } catch (error) {
    console.error('Evolution PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update evolution event' },
      { status: 500 }
    )
  }
}
