import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function POST(req: NextRequest) {
  try {
    const { projectId } = await req.json()
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const files = await db.projectFile.findMany({
      where: { projectId, isDirectory: false },
    })

    const vfsRoot = path.join(process.cwd(), 'vfs-root')
    let synced = 0
    let errors = 0

    for (const file of files) {
      try {
        const realPath = path.join(vfsRoot, file.path)
        const dir = path.dirname(realPath)
        if (!existsSync(dir)) await mkdir(dir, { recursive: true })
        await writeFile(realPath, file.content, 'utf-8')
        synced++
      } catch {
        errors++
      }
    }

    return NextResponse.json({ synced, errors, total: files.length, vfsRoot })
  } catch (error) {
    console.error('VFS sync failed:', error)
    return NextResponse.json({ error: 'VFS sync failed' }, { status: 500 })
  }
}
