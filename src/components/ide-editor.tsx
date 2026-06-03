'use client'

import { useAppStore } from '@/lib/store'
import { type ProjectFile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { X, Code2, Keyboard, Zap, Command } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMemo, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

// Simple regex-based syntax highlighting
function highlightCode(code: string, language: string): string {
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Comments (single-line)
  html = html.replace(/(\/\/.*$)/gm, '<span class="text-muted-foreground/60 italic">$1</span>')
  // Comments (multi-line)
  html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-muted-foreground/60 italic">$1</span>')

  // Strings (double and single quotes, template literals)
  html = html.replace(/(&quot;.*?&quot;|".*?"|'.*?'|`[^`]*`)/g, '<span class="text-emerald-400">$1</span>')

  // Keywords
  const keywords = [
    'import', 'export', 'default', 'from', 'const', 'let', 'var', 'function', 'return', 'if',
    'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'new', 'this', 'class',
    'extends', 'implements', 'interface', 'type', 'enum', 'async', 'await', 'try', 'catch',
    'finally', 'throw', 'typeof', 'instanceof', 'in', 'of', 'void', 'delete', 'yield',
    'true', 'false', 'null', 'undefined', 'as', 'is', 'keyof', 'readonly', 'declare',
    'module', 'namespace', 'require', 'static', 'get', 'set', 'super', 'constructor',
  ]
  const kwRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g')
  html = html.replace(kwRegex, '<span class="text-violet-400 font-medium">$1</span>')

  // Types (capitalized words after : or as)
  html = html.replace(/\b([A-Z][a-zA-Z0-9]*)\b/g, '<span class="text-amber-300">$1</span>')

  // Numbers
  html = html.replace(/\b(\d+\.?\d*)\b/g, '<span class="text-cyan-300">$1</span>')

  // Decorators / annotations
  html = html.replace(/(@\w+)/g, '<span class="text-yellow-400">$1</span>')

  return html
}

function FileTab({ file, isActive, onClose, onClick }: {
  file: ProjectFile
  isActive: boolean
  onClose: (e: React.MouseEvent) => void
  onClick: () => void
}) {
  const getIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'tsx': case 'ts': return '🟦'
      case 'jsx': case 'js': return '🟨'
      case 'json': return '📋'
      case 'prisma': return '💎'
      case 'css': return '🎨'
      default: return '📄'
    }
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 h-9 text-xs border-r shrink-0 transition-colors group',
        isActive
          ? 'bg-zinc-900 dark:bg-zinc-950 text-foreground border-t-2 border-t-emerald-500 border-b-0'
          : 'bg-muted/30 text-muted-foreground hover:bg-muted/50 border-t-2 border-t-transparent',
      )}
    >
      <span className="text-[10px]">{getIcon(file.path)}</span>
      <span className="truncate max-w-[120px]">{file.path.split('/').pop()}</span>
      <span
        onClick={onClose}
        className="ml-1 size-4 rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/20 transition-opacity"
      >
        <X className="size-3" />
      </span>
    </button>
  )
}

function WelcomeScreen() {
  return (
    <div className="flex-1 flex items-center justify-center bg-zinc-900 dark:bg-zinc-950">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md"
      >
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center justify-center size-16 rounded-2xl bg-emerald-500/15">
            <Zap className="size-8 text-emerald-500" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">TeamForge IDE</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Where AI agents collaborate to build software 24/7
        </p>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5 text-muted-foreground">
            <Command className="size-4 text-emerald-500" />
            <div className="text-left">
              <div className="text-foreground font-medium">Quick Open</div>
              <div>Ctrl+K</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5 text-muted-foreground">
            <Code2 className="size-4 text-violet-500" />
            <div className="text-left">
              <div className="text-foreground font-medium">Toggle Terminal</div>
              <div>Ctrl+`</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5 text-muted-foreground">
            <Keyboard className="size-4 text-amber-500" />
            <div className="text-left">
              <div className="text-foreground font-medium">Command Palette</div>
              <div>Ctrl+Shift+P</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5 text-muted-foreground">
            <Zap className="size-4 text-pink-500" />
            <div className="text-left">
              <div className="text-foreground font-medium">Run Project</div>
              <div>F5</div>
            </div>
          </div>
        </div>
        <p className="text-muted-foreground/50 text-[10px] mt-8">
          Select a file from the explorer to start editing
        </p>
      </motion.div>
    </div>
  )
}

export function IDEEditor() {
  const files = useAppStore((s) => s.files)
  const activeFileId = useAppStore((s) => s.activeFileId)
  const setActiveFileId = useAppStore((s) => s.setActiveFileId)
  const [manuallyOpenIds, setManuallyOpenIds] = useState<string[]>([])

  const activeFile = useMemo(
    () => files.find((f) => f.id === activeFileId) || null,
    [files, activeFileId],
  )

  // Derive open files: manually opened + active file (if not already included)
  const openFileIds = useMemo(() => {
    const ids = [...manuallyOpenIds]
    if (activeFileId && !ids.includes(activeFileId)) {
      ids.push(activeFileId)
    }
    return ids
  }, [manuallyOpenIds, activeFileId])

  const openFiles = useMemo(
    () => openFileIds.map((id) => files.find((f) => f.id === id)).filter(Boolean) as ProjectFile[],
    [openFileIds, files],
  )

  // When active file changes, add it to open tabs
  const handleFileClick = useCallback((fileId: string) => {
    setActiveFileId(fileId)
    if (!manuallyOpenIds.includes(fileId)) {
      setManuallyOpenIds((prev) => [...prev, fileId])
    }
  }, [manuallyOpenIds, setActiveFileId])

  const handleCloseFile = useCallback((fileId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setManuallyOpenIds((prev) => prev.filter((id) => id !== fileId))
    if (activeFileId === fileId) {
      const remaining = manuallyOpenIds.filter((id) => id !== fileId)
      setActiveFileId(remaining.length > 0 ? remaining[remaining.length - 1] : null)
    }
  }, [activeFileId, manuallyOpenIds, setActiveFileId])

  const lines = activeFile?.content?.split('\n') || []

  return (
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
      {/* File tabs */}
      {openFiles.length > 0 && (
        <div className="flex items-center h-9 bg-muted/20 border-b overflow-x-auto scrollbar-none shrink-0">
          {openFiles.map((file) => (
            <FileTab
              key={file.id}
              file={file}
              isActive={file.id === activeFileId}
              onClose={(e) => handleCloseFile(file.id, e)}
              onClick={() => handleFileClick(file.id)}
            />
          ))}
        </div>
      )}

      {/* Code editor area */}
      {activeFile ? (
        <div className="flex-1 overflow-auto bg-zinc-900 dark:bg-zinc-950 custom-scrollbar">
          <div className="flex min-w-fit">
            {/* Line numbers */}
            <div className="select-none text-right pr-4 pl-4 pt-3 text-[13px] leading-[1.6] font-mono text-zinc-600 shrink-0 sticky left-0 bg-zinc-900 dark:bg-zinc-950">
              {lines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            {/* Code content */}
            <pre className="text-[13px] leading-[1.6] font-mono pt-3 pr-6 whitespace-pre text-zinc-300">
              {lines.map((line, i) => (
                <div key={i} className="hover:bg-white/5 px-2 -mx-2">
                  <code dangerouslySetInnerHTML={{ __html: highlightCode(line, activeFile.language) }} />
                </div>
              ))}
            </pre>
          </div>
        </div>
      ) : (
        <WelcomeScreen />
      )}

      {/* Mini breadcrumb bar */}
      {activeFile && (
        <div className="flex items-center h-6 px-3 bg-muted/20 border-t text-[10px] text-muted-foreground shrink-0">
          <span>{activeFile.path}</span>
          <span className="mx-2 text-border">|</span>
          <span>{activeFile.language}</span>
          <span className="mx-2 text-border">|</span>
          <span>UTF-8</span>
          <span className="mx-2 text-border">|</span>
          <span>{lines.length} lines</span>
        </div>
      )}
    </div>
  )
}
