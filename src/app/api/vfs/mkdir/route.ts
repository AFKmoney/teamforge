import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/vfs/mkdir - Create a directory (and any missing parent directories)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, path } = body

    if (!projectId || !path) {
      return NextResponse.json({ error: 'Project ID and directory path are required' }, { status: 400 })
    }

    const createdDirs: unknown[] = []

    // Create all parent directories and the target directory
    const pathParts = path.split('/').filter(Boolean)
    for (let i = 1; i <= pathParts.length; i++) {
      const dirPath = '/' + pathParts.slice(0, i).join('/')
      const dir = await db.projectFile.upsert({
        where: { projectId_path: { projectId, path: dirPath } },
        update: { isDirectory: true, content: '', language: '' },
        create: { projectId, path: dirPath, isDirectory: true, content: '', language: '' },
      })
      createdDirs.push(dir)
    }

    return NextResponse.json({ directories: createdDirs }, { status: 201 })
  } catch (error) {
    console.error('VFS mkdir error:', error)
    return NextResponse.json({ error: 'Failed to create directory' }, { status: 500 })
  }
}
