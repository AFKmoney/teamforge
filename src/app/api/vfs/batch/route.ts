import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/vfs/batch - Batch write multiple files at once
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, files }: { projectId: string; files: { path: string; content: string; language?: string }[] } = body

    if (!projectId || !files || !Array.isArray(files)) {
      return NextResponse.json({ error: 'Project ID and files array are required' }, { status: 400 })
    }

    // Collect all directories that need to be created
    const dirsToCreate = new Set<string>()
    for (const file of files) {
      const pathParts = file.path.split('/').filter(Boolean)
      for (let i = 1; i < pathParts.length; i++) {
        dirsToCreate.add('/' + pathParts.slice(0, i).join('/'))
      }
    }

    // Create directories first
    const dirResults: unknown[] = []
    for (const dirPath of dirsToCreate) {
      const dir = await db.projectFile.upsert({
        where: { projectId_path: { projectId, path: dirPath } },
        update: { isDirectory: true, content: '', language: '' },
        create: { projectId, path: dirPath, isDirectory: true, content: '', language: '' },
      })
      dirResults.push(dir)
    }

    // Create/update files
    const fileResults: unknown[] = []
    for (const file of files) {
      const ext = file.path.split('.').pop()?.toLowerCase() || ''
      const langMap: Record<string, string> = {
        ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
        css: 'css', html: 'html', json: 'json', md: 'markdown', yml: 'yaml',
        yaml: 'yaml', py: 'python', rs: 'rust', go: 'go', sql: 'sql',
        sh: 'bash', toml: 'toml', txt: 'plaintext',
      }

      const result = await db.projectFile.upsert({
        where: { projectId_path: { projectId, path: file.path } },
        update: {
          content: file.content ?? '',
          language: file.language ?? langMap[ext] ?? 'plaintext',
          isDirectory: false,
        },
        create: {
          projectId,
          path: file.path,
          content: file.content ?? '',
          language: file.language ?? langMap[ext] ?? 'plaintext',
          isDirectory: false,
        },
      })
      fileResults.push(result)
    }

    return NextResponse.json({
      directories: dirResults.length,
      files: fileResults,
      total: dirResults.length + fileResults.length,
    }, { status: 201 })
  } catch (error) {
    console.error('VFS batch error:', error)
    return NextResponse.json({ error: 'Failed to batch write files' }, { status: 500 })
  }
}
