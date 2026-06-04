import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Check if event exists
    const existing = await db.evolutionEvent.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Evolution event not found' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (body.status !== undefined) updateData.status = body.status
    if (body.riskLevel !== undefined) updateData.riskLevel = body.riskLevel
    if (body.approvedBy !== undefined) updateData.approvedBy = body.approvedBy
    if (body.improvementPercent !== undefined)
      updateData.improvementPercent = body.improvementPercent
    if (body.metrics !== undefined)
      updateData.metrics = JSON.stringify(body.metrics)
    if (body.beforeState !== undefined)
      updateData.beforeState = JSON.stringify(body.beforeState)
    if (body.afterState !== undefined)
      updateData.afterState = JSON.stringify(body.afterState)

    // Set timestamps based on status transitions
    if (body.status === 'validated') {
      updateData.validatedAt = new Date()
    }
    if (body.status === 'deployed') {
      updateData.deployedAt = new Date()
    }

    const event = await db.evolutionEvent.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(event)
  } catch (error) {
    console.error('Evolution PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update evolution event' },
      { status: 500 }
    )
  }
}
