import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, approvedBy, validatedAt, deployedAt } = body

    const data: Record<string, unknown> = {}
    if (status !== undefined) data.status = status
    if (approvedBy !== undefined) data.approvedBy = approvedBy
    if (validatedAt !== undefined) data.validatedAt = validatedAt ? new Date(validatedAt) : null
    if (deployedAt !== undefined) data.deployedAt = deployedAt ? new Date(deployedAt) : null

    const updated = await db.evolutionEvent.update({
      where: { id },
      data,
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Evolution PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update evolution event' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.evolutionEvent.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Evolution DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete evolution event' },
      { status: 500 }
    )
  }
}
