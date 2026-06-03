import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import JSZip from 'jszip'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const projectId = formData.get('projectId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!projectId) {
      return NextResponse.json({ error: 'No project ID provided' }, { status: 400 })
    }

    // Verify project exists
    const project = await db.project.findUnique({ where: { id: projectId } })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const fileName = file.name.toLowerCase()
    const buffer = Buffer.from(await file.arrayBuffer())

    let filesToCreate: { path: string; content: string; language: string; isDirectory: boolean }[] = []

    if (fileName.endsWith('.zip')) {
      // Parse ZIP file
      const zip = await JSZip.loadAsync(buffer)
      const zipEntries = Object.entries(zip.files)

      for (const [relativePath, zipEntry] of zipEntries) {
        // Skip project.json metadata file, hidden files, __MACOSX, etc.
        if (relativePath.startsWith('__MACOSX') || relativePath.startsWith('.') || relativePath.includes('/__MACOSX') || relativePath.includes('/.')) continue
        if (relativePath === 'project.json') continue

        if (zipEntry.dir) {
          // Create directory entry
          filesToCreate.push({
            path: relativePath.replace(/\/$/, ''),
            content: '',
            language: 'plaintext',
            isDirectory: true,
          })
        } else {
          const content = await zipEntry.async('string')
          const ext = relativePath.split('.').pop()?.toLowerCase() || ''
          const languageMap: Record<string, string> = {
            ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
            json: 'json', css: 'css', scss: 'css', less: 'css',
            md: 'markdown', mdx: 'markdown', prisma: 'prisma',
            html: 'html', htm: 'html', yaml: 'yaml', yml: 'yaml',
            py: 'python', rb: 'ruby', go: 'go', rs: 'rust',
            sql: 'sql', sh: 'bash', bash: 'bash', zsh: 'bash',
            toml: 'toml', txt: 'plaintext', xml: 'xml', svg: 'xml',
          }
          filesToCreate.push({
            path: relativePath,
            content,
            language: languageMap[ext] || 'plaintext',
            isDirectory: false,
          })
        }
      }
    } else if (fileName.endsWith('.json')) {
      // Parse JSON file - can be either a project export or a file list
      const text = buffer.toString('utf-8')
      const parsed = JSON.parse(text)

      if (Array.isArray(parsed)) {
        // Array of file objects with path and content
        for (const item of parsed) {
          if (item.path && typeof item.content === 'string') {
            const ext = (item.path as string).split('.').pop()?.toLowerCase() || ''
            const languageMap: Record<string, string> = {
              ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
              json: 'json', css: 'css', md: 'markdown', html: 'html',
            }
            filesToCreate.push({
              path: item.path,
              content: item.content,
              language: item.language || languageMap[ext] || 'plaintext',
              isDirectory: item.isDirectory || false,
            })
          }
        }
      } else if (parsed.files && Array.isArray(parsed.files)) {
        // Project export format with { name, description, files: [...] }
        for (const item of parsed.files) {
          if (item.path && typeof item.content === 'string') {
            const ext = (item.path as string).split('.').pop()?.toLowerCase() || ''
            const languageMap: Record<string, string> = {
              ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
              json: 'json', css: 'css', md: 'markdown', html: 'html',
            }
            filesToCreate.push({
              path: item.path,
              content: item.content,
              language: item.language || languageMap[ext] || 'plaintext',
              isDirectory: item.isDirectory || false,
            })
          }
        }
      } else {
        return NextResponse.json({ error: 'Invalid JSON format. Expected an array of files or a project object with a files array.' }, { status: 400 })
      }
    } else {
      return NextResponse.json({ error: 'Unsupported file format. Please upload a .zip or .json file.' }, { status: 400 })
    }

    if (filesToCreate.length === 0) {
      return NextResponse.json({ error: 'No files found in the uploaded archive.' }, { status: 400 })
    }

    // Create files in the database
    let created = 0
    let skipped = 0

    for (const fileInfo of filesToCreate) {
      try {
        // Check if file already exists at this path in the project
        const existing = await db.projectFile.findUnique({
          where: {
            projectId_path: {
              projectId,
              path: fileInfo.path,
            },
          },
        })

        if (existing) {
          // Update existing file content
          await db.projectFile.update({
            where: { id: existing.id },
            data: {
              content: fileInfo.content,
              language: fileInfo.language,
              isDirectory: fileInfo.isDirectory,
            },
          })
          created++
        } else {
          await db.projectFile.create({
            data: {
              projectId,
              path: fileInfo.path,
              content: fileInfo.content,
              language: fileInfo.language,
              isDirectory: fileInfo.isDirectory,
            },
          })
          created++
        }
      } catch {
        skipped++
      }
    }

    return NextResponse.json({
      success: true,
      created,
      skipped,
      total: filesToCreate.length,
    })
  } catch (error) {
    console.error('Failed to import project:', error)
    return NextResponse.json({ error: 'Failed to import project' }, { status: 500 })
  }
}
