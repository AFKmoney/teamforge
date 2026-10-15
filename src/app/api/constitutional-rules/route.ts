import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, rule, description, category } = body
    if (!name || !rule) {
      return NextResponse.json(
        { error: 'name and rule are required' },
        { status: 400 }
      )
    }
    const created = await db.constitutionalRule.create({
      data: {
        name,
        rule,
        description: description ?? '',
        category: category ?? 'general',
      },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('ConstitutionalRules POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create constitutional rule' },
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
    const updated = await db.constitutionalRule.update({
      where: { id },
      data: { active },
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('ConstitutionalRules PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update constitutional rule' },
      { status: 500 }
    )
  }
}
