import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // ConstitutionalRule model does not exist in schema — return empty array
    return NextResponse.json([])
  } catch (error) {
    console.error('ConstitutionalRules GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch constitutional rules' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, active } = body

    if (!id || typeof active !== 'boolean') {
      return NextResponse.json(
        { error: 'id and active (boolean) are required' },
        { status: 400 }
      )
    }

    // ConstitutionalRule model does not exist in schema — return mock response
    return NextResponse.json({ id, active, updatedAt: new Date().toISOString() })
  } catch (error) {
    console.error('ConstitutionalRules PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update constitutional rule' },
      { status: 500 }
    )
  }
}
