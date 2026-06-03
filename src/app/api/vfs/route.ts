import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/vfs - List files for a project with full content and directory structure
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    const files = await db.projectFile.findMany({
      where: { projectId },
      orderBy: { path: 'asc' },
    })

    // Build directory structure
    const directories = files.filter((f) => f.isDirectory)
    const regularFiles = files.filter((f) => !f.isDirectory)

    // Build a tree structure for the frontend
    const tree: Record<string, { type: 'dir' | 'file'; children: string[] }> = {}
    for (const dir of directories) {
      tree[dir.path] = { type: 'dir', children: [] }
    }
    for (const file of regularFiles) {
      const parentPath = file.path.substring(0, file.path.lastIndexOf('/')) || '/'
      if (!tree[parentPath]) {
        tree[parentPath] = { type: 'dir', children: [] }
      }
      tree[parentPath].children.push(file.path)
    }

    return NextResponse.json({
      files: regularFiles,
      directories,
      tree,
    })
  } catch (error) {
    console.error('VFS GET error:', error)
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 })
  }
}

// POST /api/vfs - Create or update a file (VFS write with auto-mkdir)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, path, content, language } = body

    if (!projectId || !path) {
      return NextResponse.json({ error: 'Project ID and file path are required' }, { status: 400 })
    }

    // Auto-create parent directories
    const pathParts = path.split('/').filter(Boolean)
    for (let i = 1; i < pathParts.length; i++) {
      const dirPath = '/' + pathParts.slice(0, i).join('/')
      await db.projectFile.upsert({
        where: { projectId_path: { projectId, path: dirPath } },
        update: { isDirectory: true, content: '', language: '' },
        create: { projectId, path: dirPath, isDirectory: true, content: '', language: '' },
      })
    }

    // Upsert the file
    const file = await db.projectFile.upsert({
      where: { projectId_path: { projectId, path } },
      update: {
        content: content ?? '',
        language: language ?? detectLanguage(path),
        isDirectory: false,
      },
      create: {
        projectId,
        path,
        content: content ?? '',
        language: language ?? detectLanguage(path),
        isDirectory: false,
      },
    })

    return NextResponse.json(file, { status: 201 })
  } catch (error) {
    console.error('VFS POST error:', error)
    return NextResponse.json({ error: 'Failed to create/update file' }, { status: 500 })
  }
}

function detectLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    css: 'css',
    html: 'html',
    json: 'json',
    md: 'markdown',
    yml: 'yaml',
    yaml: 'yaml',
    py: 'python',
    rs: 'rust',
    go: 'go',
    sql: 'sql',
    sh: 'bash',
    bash: 'bash',
    dockerfile: 'dockerfile',
    toml: 'toml',
    env: 'env',
    txt: 'plaintext',
  }
  return langMap[ext] || 'plaintext'
}
