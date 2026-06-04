import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const rules = await db.constitutionalRule.findMany({
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(rules)
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

    const rule = await db.constitutionalRule.update({
      where: { id },
      data: { active },
    })

    return NextResponse.json(rule)
  } catch (error) {
    console.error('ConstitutionalRules PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update constitutional rule' },
      { status: 500 }
    )
  }
}
