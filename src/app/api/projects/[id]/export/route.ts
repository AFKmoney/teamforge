import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import JSZip from 'jszip'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const project = await db.project.findUnique({
      where: { id },
      include: { files: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Create ZIP file
    const zip = new JSZip()

    // Add project metadata
    const metadata = {
      name: project.name,
      description: project.description,
      techStack: project.techStack ? JSON.parse(project.techStack) : [],
      status: project.status,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    }
    zip.file('project.json', JSON.stringify(metadata, null, 2))

    // Add all project files
    for (const file of project.files) {
      if (!file.isDirectory) {
        zip.file(file.path, file.content || '')
      }
    }

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({ type: 'uint8array' })

    // Return as downloadable file
    const filename = `${project.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.zip`
    return new NextResponse(zipBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(zipBuffer.length),
      },
    })
  } catch (error) {
    console.error('Failed to export project:', error)
    return NextResponse.json({ error: 'Failed to export project' }, { status: 500 })
  }
}
