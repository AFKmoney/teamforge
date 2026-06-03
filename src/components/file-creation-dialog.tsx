'use client'

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
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

// Templates for new files
function getTemplate(path: string): string {
  const name = path.split('/').pop()?.replace(/\.[^.]+$/, '') || 'Component'
  const ext = path.split('.').pop()?.toLowerCase() || ''

  switch (ext) {
    case 'tsx':
      return `import { cn } from '@/lib/utils'

interface ${name}Props {
  className?: string
}

export function ${name}({ className }: ${name}Props) {
  return (
    <div className={cn('', className)}>
      {/* ${name} component */}
    </div>
  )
}
`
    case 'ts':
      return `// ${name}.ts
export interface ${name}Config {
  // Add your config here
}
`
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
      return `model ${name.charAt(0).toUpperCase() + name.slice(1)} {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
`
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
  const [isCreating, setIsCreating] = useState(false)
  const currentProject = useAppStore((s) => s.currentProject)
  const addFile = useAppStore((s) => s.addFile)
  const fetchFiles = useAppStore((s) => s.fetchFiles)
  const setActiveFileId = useAppStore((s) => s.setActiveFileId)

  const detectedLang = useMemo(() => isFolder ? '' : detectLanguageFromPath(path), [path, isFolder])

  const handleCreate = async () => {
    if (!path.trim()) return
    setIsCreating(true)
    try {
      const content = isFolder ? '' : getTemplate(path)
      const language = isFolder ? 'plaintext' : detectedLanguage

      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject?.id || 'proj_01',
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
        onOpenChange(false)
      }
    } catch (e) {
      console.error('Failed to create file:', e)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (v) setPath(initialPath)
      onOpenChange(v)
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isFolder ? (
              <FolderPlus className="size-4 text-amber-500" />
            ) : (
              <FileCode2 className="size-4 text-emerald-500" />
            )}
            {isFolder ? 'Create New Folder' : 'Create New File'}
          </DialogTitle>
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
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Language:</Label>
              <Badge variant="outline" className="text-[10px]">
                {detectedLang || 'plaintext'}
              </Badge>
            </div>
          )}
          {path.trim() && !isFolder && getTemplate(path.trim()) && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Template Preview</Label>
              <pre className="text-[10px] p-2 rounded-md bg-muted/50 border max-h-24 overflow-auto font-mono text-muted-foreground whitespace-pre-wrap">
                {getTemplate(path.trim()).slice(0, 200)}
                {getTemplate(path.trim()).length > 200 ? '...' : ''}
              </pre>
            </div>
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
