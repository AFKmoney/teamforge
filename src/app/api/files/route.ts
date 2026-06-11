import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    const where: Record<string, unknown> = {}
    if (projectId) where.projectId = projectId

    const files = await db.projectFile.findMany({
      where,
      orderBy: { path: 'asc' },
    })

    return NextResponse.json(files)
  } catch (error) {
    console.error('Failed to fetch files:', error)
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, path, content, language, isDirectory } = body

    if (!projectId || !path) {
      return NextResponse.json({ error: 'Project ID and file path are required' }, { status: 400 })
    }

    // Upsert: if file at this path already exists for this project, update it
    const file = await db.projectFile.upsert({
      where: {
        projectId_path: { projectId, path },
      },
      update: {
        content: content ?? '',
        language: language ?? 'typescript',
        isDirectory: isDirectory ?? false,
      },
      create: {
        projectId,
        path,
        content: content ?? '',
        language: language ?? 'typescript',
        isDirectory: isDirectory ?? false,
      },
    })

    // Sync to real filesystem
    if (!isDirectory && content) {
      try {
        const realPath = path.join(process.cwd(), 'vfs-root', path)
        const dir = path.dirname(realPath)
        if (!existsSync(dir)) await mkdir(dir, { recursive: true })
        await writeFile(realPath, content, 'utf-8')
      } catch (fsErr) {
        console.warn('VFS sync write failed:', fsErr)
      }
    }

    return NextResponse.json(file, { status: 201 })
  } catch (error) {
    console.error('Failed to create/update file:', error)
    return NextResponse.json({ error: 'Failed to create/update file' }, { status: 500 })
  }
}
