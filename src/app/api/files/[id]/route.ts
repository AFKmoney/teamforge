import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { writeFile } from 'fs/promises'
import path from 'path'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const file = await db.projectFile.findUnique({
      where: { id },
    })

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    return NextResponse.json(file)
  } catch (error) {
    console.error('Failed to fetch file:', error)
    return NextResponse.json({ error: 'Failed to fetch file' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const existing = await db.projectFile.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (body.content !== undefined) data.content = body.content
    if (body.language !== undefined) data.language = body.language
    if (body.isDirectory !== undefined) data.isDirectory = body.isDirectory

    const file = await db.projectFile.update({
      where: { id },
      data,
    })

    // Sync to real filesystem
    if (body.content !== undefined && !existing.isDirectory) {
      try {
        const realPath = path.join(process.cwd(), 'vfs-root', existing.path)
        await writeFile(realPath, body.content, 'utf-8')
      } catch (fsErr) {
        console.warn('VFS sync write failed:', fsErr)
      }
    }

    return NextResponse.json(file)
  } catch (error) {
    console.error('Failed to update file:', error)
    return NextResponse.json({ error: 'Failed to update file' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.projectFile.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    await db.projectFile.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete file:', error)
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
  }
}
