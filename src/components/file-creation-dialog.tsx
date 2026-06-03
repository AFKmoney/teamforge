'use client'

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { FileCode2, FolderPlus, Loader2 } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'

// Detect language from extension
function detectLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    json: 'json', css: 'css', scss: 'css', less: 'css',
    md: 'markdown', mdx: 'markdown', prisma: 'prisma',
    html: 'html', yaml: 'yaml', yml: 'yaml', py: 'python',
    go: 'go', rs: 'rust', sql: 'sql', sh: 'bash',
  }
  return map[ext] || 'plaintext'
}

// Template type definition
interface FileTemplate {
  id: string
  label: string
  description: string
  extension: string
  getContent: (name: string) => string
}

// Available templates
const FILE_TEMPLATES: FileTemplate[] = [
  {
    id: 'react-component',
    label: 'React Component',
    description: 'React component with TypeScript and props',
    extension: '.tsx',
    getContent: (name) => `import { cn } from '@/lib/utils'

interface ${name}Props {
  className?: string
  children?: React.ReactNode
}

export function ${name}({ className, children }: ${name}Props) {
  return (
    <div className={cn('', className)}>
      {children}
    </div>
  )
}
`,
  },
  {
    id: 'react-page',
    label: 'Next.js Page',
    description: 'Next.js App Router page component',
    extension: '.tsx',
    getContent: (name) => `export default function ${name}Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">${name}</h1>
    </main>
  )
}
`,
  },
  {
    id: 'react-layout',
    label: 'Next.js Layout',
    description: 'Next.js App Router layout component',
    extension: '.tsx',
    getContent: (name) => `import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '${name}',
  description: '${name} layout',
}

export default function ${name}Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <section>{children}</section>
  )
}
`,
  },
  {
    id: 'api-route',
    label: 'API Route',
    description: 'Next.js API route with GET/POST handlers',
    extension: '.ts',
    getContent: (name) => `import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Handle GET request
    return NextResponse.json({ success: true, data: [] })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // Handle POST request
    return NextResponse.json({ success: true, data: body })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
`,
  },
  {
    id: 'hook',
    label: 'Custom Hook',
    description: 'React custom hook with TypeScript',
    extension: '.ts',
    getContent: (name) => `'use client'

import { useState, useEffect, useCallback } from 'react'

interface Use${name}Return {
  data: unknown
  loading: boolean
  error: Error | null
  refetch: () => void
}

export function use${name}(): Use${name}Return {
  const [data, setData] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch data here
      setData(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
`,
  },
  {
    id: 'util',
    label: 'Utility Module',
    description: 'TypeScript utility functions',
    extension: '.ts',
    getContent: (name) => `/**
 * ${name} utility functions
 */

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}
`,
  },
  {
    id: 'prisma-model',
    label: 'Prisma Model',
    description: 'Prisma schema model template',
    extension: '.prisma',
    getContent: (name) => `model ${name.charAt(0).toUpperCase() + name.slice(1)} {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Add your fields here
}
`,
  },
  {
    id: 'empty',
    label: 'Empty File',
    description: 'Blank file with no content',
    extension: '',
    getContent: () => '',
  },
]

// Get template for file based on path
function getTemplate(path: string): string {
  const name = path.split('/').pop()?.replace(/\.[^.]+$/, '') || 'Component'
  const ext = path.split('.').pop()?.toLowerCase() || ''
  const fileName = path.split('/').pop() || ''

  // Detect template based on path patterns
  if (ext === 'tsx' && fileName === 'page.tsx') {
    return FILE_TEMPLATES.find(t => t.id === 'react-page')!.getContent(name.replace('Page', ''))
  }
  if (ext === 'tsx' && fileName === 'layout.tsx') {
    return FILE_TEMPLATES.find(t => t.id === 'react-layout')!.getContent(name.replace('Layout', ''))
  }
  if (path.includes('/api/')) {
    return FILE_TEMPLATES.find(t => t.id === 'api-route')!.getContent(name)
  }
  if (fileName.startsWith('use-') || fileName.startsWith('use')) {
    return FILE_TEMPLATES.find(t => t.id === 'hook')!.getContent(name.replace(/^use-?/i, ''))
  }

  switch (ext) {
    case 'tsx':
      return FILE_TEMPLATES.find(t => t.id === 'react-component')!.getContent(name)
    case 'ts':
      return FILE_TEMPLATES.find(t => t.id === 'util')!.getContent(name)
    case 'jsx':
      return `import { cn } from '@/lib/utils'

export function ${name}({ className }) {
  return (
    <div className={cn('', className)}>
      {/* ${name} component */}
    </div>
  )
}
`
    case 'js':
      return `// ${name}.js
module.exports = {}
`
    case 'css':
      return `/* ${name}.css */
`
    case 'json':
      return `{
  "name": "${name}",
  "version": "1.0.0"
}
`
    case 'md':
      return `# ${name}

Description goes here.
`
    case 'prisma':
      return FILE_TEMPLATES.find(t => t.id === 'prisma-model')!.getContent(name)
    default:
      return ''
  }
}

interface FileCreationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialPath?: string
  isFolder?: boolean
}

export function FileCreationDialog({ open, onOpenChange, initialPath = '', isFolder = false }: FileCreationDialogProps) {
  const [path, setPath] = useState(initialPath)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('auto')
  const [isCreating, setIsCreating] = useState(false)
  const currentProject = useAppStore((s) => s.currentProject)
  const addFile = useAppStore((s) => s.addFile)
  const fetchFiles = useAppStore((s) => s.fetchFiles)
  const setActiveFileId = useAppStore((s) => s.setActiveFileId)

  const detectedLang = useMemo(() => isFolder ? '' : detectLanguageFromPath(path), [path, isFolder])

  // Compute the file content based on template selection
  const fileContent = useMemo(() => {
    if (isFolder) return ''
    if (selectedTemplate === 'auto') {
      return getTemplate(path.trim())
    }
    const template = FILE_TEMPLATES.find(t => t.id === selectedTemplate)
    if (template) {
      const name = path.trim().split('/').pop()?.replace(/\.[^.]+$/, '') || 'Component'
      return template.getContent(name)
    }
    return ''
  }, [path, selectedTemplate, isFolder])

  const handleCreate = async () => {
    if (!path.trim()) return
    setIsCreating(true)
    try {
      const content = isFolder ? '' : fileContent
      const language = isFolder ? 'plaintext' : detectedLang

      const res = await fetch('/api/vfs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject?.id || '',
          path: path.trim(),
          content,
          language,
          isDirectory: isFolder,
        }),
      })

      if (res.ok) {
        const file = await res.json()
        addFile(file)
        await fetchFiles()
        if (!isFolder) {
          setActiveFileId(file.id)
        }
        setPath('')
        setSelectedTemplate('auto')
        onOpenChange(false)
      }
    } catch (e) {
      console.error('Failed to create file:', e)
    } finally {
      setIsCreating(false)
    }
  }

  // Filter relevant templates based on file extension
  const relevantTemplates = useMemo(() => {
    const ext = path.trim().split('.').pop()?.toLowerCase() || ''
    if (!ext) return FILE_TEMPLATES
    switch (ext) {
      case 'tsx':
        return FILE_TEMPLATES.filter(t => ['react-component', 'react-page', 'react-layout', 'api-route', 'empty'].includes(t.id))
      case 'ts':
        return FILE_TEMPLATES.filter(t => ['api-route', 'hook', 'util', 'empty'].includes(t.id))
      case 'prisma':
        return FILE_TEMPLATES.filter(t => ['prisma-model', 'empty'].includes(t.id))
      default:
        return FILE_TEMPLATES.filter(t => t.id === 'empty' || t.extension === `.${ext}`)
    }
  }, [path])

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (v) {
        setPath(initialPath)
        setSelectedTemplate('auto')
      }
      onOpenChange(v)
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isFolder ? (
              <FolderPlus className="size-4 text-amber-500" />
            ) : (
              <FileCode2 className="size-4 text-emerald-500" />
            )}
            {isFolder ? 'Create New Folder' : 'Create New File'}
          </DialogTitle>
          <DialogDescription>{isFolder ? 'Enter a path for the new folder.' : 'Enter a file path and select a template. Content will be auto-generated based on the extension.'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">
              {isFolder ? 'Folder Path' : 'File Path'}
            </Label>
            <Input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder={isFolder ? 'src/components/new-folder' : 'src/components/new-component.tsx'}
              className="text-sm font-mono"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && path.trim()) {
                  handleCreate()
                }
              }}
            />
          </div>
          {!isFolder && (
            <>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Language:</Label>
                <Badge variant="outline" className="text-[10px]">
                  {detectedLang || 'plaintext'}
                </Badge>
              </div>
              {/* Template selector */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Template</Label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setSelectedTemplate('auto')}
                    className={cn(
                      'px-2 py-1 rounded-md text-[11px] border transition-colors',
                      selectedTemplate === 'auto'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                        : 'bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    🔄 Auto-detect
                  </button>
                  {relevantTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={cn(
                        'px-2 py-1 rounded-md text-[11px] border transition-colors',
                        selectedTemplate === template.id
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                          : 'bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50'
                      )}
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Template description */}
              {selectedTemplate !== 'auto' && (
                <p className="text-[10px] text-muted-foreground/60">
                  {FILE_TEMPLATES.find(t => t.id === selectedTemplate)?.description}
                </p>
              )}
              {/* Template preview */}
              {path.trim() && fileContent && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Template Preview</Label>
                  <pre className="text-[10px] p-2 rounded-md bg-muted/50 border max-h-32 overflow-auto font-mono text-muted-foreground whitespace-pre-wrap">
                    {fileContent.slice(0, 400)}
                    {fileContent.length > 400 ? '\n...' : ''}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">Cancel</Button>
          </DialogClose>
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={!path.trim() || isCreating}
            className={cn('gap-1.5', isFolder ? 'bg-amber-600 hover:bg-amber-700' : '')}
          >
            {isCreating ? <Loader2 className="size-3 animate-spin" /> : isFolder ? <FolderPlus className="size-3" /> : <FileCode2 className="size-3" />}
            {isFolder ? 'Create Folder' : 'Create File'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
