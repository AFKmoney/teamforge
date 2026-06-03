import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/vfs/delete - Delete a file or directory
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, path, recursive } = body

    if (!projectId || !path) {
      return NextResponse.json({ error: 'Project ID and path are required' }, { status: 400 })
    }

    if (recursive) {
      // Delete all files/dirs under this path prefix + the path itself
      // The path prefix must match: /src should match /src, /src/foo, /src/bar/baz
      const allFiles = await db.projectFile.findMany({
        where: { projectId },
      })

      const toDelete = allFiles.filter((f) => {
        return f.path === path || f.path.startsWith(path + '/')
      })

      let deletedCount = 0
      for (const file of toDelete) {
        await db.projectFile.delete({ where: { id: file.id } })
        deletedCount++
      }

      return NextResponse.json({ deleted: deletedCount, paths: toDelete.map((f) => f.path) })
    } else {
      // Delete just this one file/dir
      const file = await db.projectFile.findUnique({
        where: { projectId_path: { projectId, path } },
      })

      if (!file) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }

      await db.projectFile.delete({ where: { id: file.id } })
      return NextResponse.json({ deleted: 1, paths: [path] })
    }
  } catch (error) {
    console.error('VFS delete error:', error)
    return NextResponse.json({ error: 'Failed to delete file/directory' }, { status: 500 })
  }
}
