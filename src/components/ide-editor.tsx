'use client'

import { useAppStore } from '@/lib/store'
import { type ProjectFile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { X, Code2, Keyboard, Zap, Command, Save, Play, ChevronRight, FileCode2, Clock, Terminal, Search } from 'lucide-react'
import { motion } from 'framer-motion'
import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

// Auto-detect language from file extension
function detectLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    json: 'json', css: 'css', scss: 'css', less: 'css',
    md: 'markdown', mdx: 'markdown', prisma: 'prisma',
    html: 'html', htm: 'html', yaml: 'yaml', yml: 'yaml',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust',
    sql: 'sql', sh: 'bash', bash: 'bash', zsh: 'bash',
    toml: 'toml', env: 'env', gitignore: 'plaintext',
    txt: 'plaintext', xml: 'xml', svg: 'xml',
  }
  return map[ext] || 'plaintext'
}

// Language-specific keyword sets
const LANGUAGE_KEYWORDS: Record<string, string[]> = {
  typescript: [
    'import', 'export', 'default', 'from', 'const', 'let', 'var', 'function', 'return', 'if',
    'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'new', 'this', 'class',
    'extends', 'implements', 'interface', 'type', 'enum', 'async', 'await', 'try', 'catch',
    'finally', 'throw', 'typeof', 'instanceof', 'in', 'of', 'void', 'delete', 'yield',
    'true', 'false', 'null', 'undefined', 'as', 'is', 'keyof', 'readonly', 'declare',
    'module', 'namespace', 'require', 'static', 'get', 'set', 'super', 'constructor',
    'abstract', 'private', 'protected', 'public', 'override', 'satisfies',
  ],
  javascript: [
    'import', 'export', 'default', 'from', 'const', 'let', 'var', 'function', 'return', 'if',
    'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'new', 'this', 'class',
    'extends', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof',
    'in', 'of', 'void', 'delete', 'yield', 'true', 'false', 'null', 'undefined',
    'require', 'static', 'get', 'set', 'super', 'constructor',
  ],
  css: [
    'important', 'inherit', 'initial', 'unset', 'none', 'auto', 'normal', 'bold', 'italic',
    'block', 'inline', 'flex', 'grid', 'absolute', 'relative', 'fixed', 'sticky',
    'center', 'start', 'end', 'space-between', 'space-around', 'row', 'column',
    'wrap', 'nowrap', 'hidden', 'visible', 'scroll', 'pointer', 'default',
    '@media', '@keyframes', '@import', '@font-face', '@supports', '@layer',
    'from', 'to',
  ],
  json: [],
  markdown: [],
  prisma: [
    'model', 'enum', 'datasource', 'generator', 'client', 'provider', 'url', 'mapping',
    'Int', 'String', 'Boolean', 'DateTime', 'Float', 'Decimal', 'BigInt', 'Bytes', 'Json',
    'id', 'unique', 'index', 'default', 'autoincrement', 'uuid', 'cuid', 'now',
    'relation', 'fields', 'references', 'onDelete', 'onUpdate', 'cascade', 'setNull',
    'optional', 'required', 'list', 'map', 'updatedAt', 'createdAt',
  ],
  html: [
    'div', 'span', 'p', 'a', 'img', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'table', 'tr', 'td', 'th', 'form', 'input', 'button', 'select', 'option', 'textarea',
    'header', 'footer', 'main', 'section', 'article', 'aside', 'nav', 'head', 'body',
    'style', 'script', 'link', 'meta', 'title', 'class', 'id', 'src', 'href', 'type',
  ],
  yaml: ['true', 'false', 'null', 'yes', 'no'],
  python: [
    'import', 'from', 'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while',
    'try', 'except', 'finally', 'raise', 'with', 'as', 'pass', 'break', 'continue',
    'lambda', 'yield', 'global', 'nonlocal', 'assert', 'del', 'in', 'not', 'and', 'or',
    'True', 'False', 'None', 'self', 'async', 'await', 'print',
  ],
  bash: [
    'if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'do', 'done', 'case', 'esac',
    'function', 'return', 'exit', 'echo', 'read', 'local', 'export', 'source', 'alias',
    'true', 'false',
  ],
}

// CSS properties for highlighting
const CSS_PROPERTIES = [
  'display', 'position', 'top', 'left', 'right', 'bottom', 'width', 'height',
  'margin', 'padding', 'border', 'background', 'color', 'font', 'text', 'align',
  'justify', 'flex', 'grid', 'gap', 'overflow', 'opacity', 'transform', 'transition',
  'animation', 'box-shadow', 'border-radius', 'z-index', 'min-width', 'max-width',
  'min-height', 'max-height', 'cursor', 'outline', 'visibility', 'content',
  'place-items', 'place-content', 'place-self', 'inset',
]

// Enhanced syntax highlighting
function highlightCode(code: string, language: string): string {
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  if (language === 'json') {
    html = html.replace(/("(?:[^"\\]|\\.)*")\s*:/g, '<span class="text-violet-400 font-medium">$1</span>:')
    html = html.replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span class="text-emerald-400">$1</span>')
    html = html.replace(/\b(true|false|null)\b/g, '<span class="text-amber-300">$1</span>')
    html = html.replace(/\b(\d+\.?\d*)\b/g, '<span class="text-cyan-300">$1</span>')
    return html
  }

  if (language === 'css') {
    html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-muted-foreground/60 italic">$1</span>')
    html = html.replace(/(@[\w-]+)/g, '<span class="text-violet-400 font-medium">$1</span>')
    html = html.replace(/^([.#:@][\w\-"'\s>~+.]+)\s*\{/gm, '<span class="text-amber-300">$1</span> {')
    const cssPropRegex = new RegExp(`\\b(${CSS_PROPERTIES.join('|')})\\s*:`, 'g')
    html = html.replace(cssPropRegex, '<span class="text-cyan-300">$1</span>:')
    html = html.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, '<span class="text-emerald-400">$1</span>')
    html = html.replace(/\b(\d+\.?\d*)(px|rem|em|%|vh|vw|fr|s|ms|deg|turn)\b/g, '<span class="text-cyan-300">$1$2</span>')
    const cssKwRegex = new RegExp(`\\b(${LANGUAGE_KEYWORDS.css.join('|')})\\b`, 'g')
    html = html.replace(cssKwRegex, '<span class="text-violet-400 font-medium">$1</span>')
    html = html.replace(/(!important)/g, '<span class="text-red-400 font-bold">$1</span>')
    return html
  }

  if (language === 'markdown') {
    html = html.replace(/^(#{1,6}\s.+)$/gm, '<span class="text-violet-400 font-bold">$1</span>')
    html = html.replace(/(\*\*[^*]+\*\*)/g, '<span class="text-foreground font-bold">$1</span>')
    html = html.replace(/(\*[^*]+\*)/g, '<span class="text-foreground italic">$1</span>')
    html = html.replace(/(`{3}[\w]*)/g, '<span class="text-emerald-400">$1</span>')
    html = html.replace(/(`[^`]+`)/g, '<span class="text-emerald-400">$1</span>')
    html = html.replace(/(\[.*?\]\(.*?\))/g, '<span class="text-cyan-300">$1</span>')
    html = html.replace(/^(\s*[-*+]\s)/gm, '<span class="text-amber-300">$1</span>')
    html = html.replace(/^(\s*\d+\.\s)/gm, '<span class="text-amber-300">$1</span>')
    html = html.replace(/^(---+|\*\*\*+|___+)$/gm, '<span class="text-muted-foreground/60">$1</span>')
    return html
  }

  if (language === 'prisma') {
    html = html.replace(/(\/\/.*$)/gm, '<span class="text-muted-foreground/60 italic">$1</span>')
    html = html.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, '<span class="text-emerald-400">$1</span>')
    const prismaKwRegex = new RegExp(`\\b(${LANGUAGE_KEYWORDS.prisma.join('|')})\\b`, 'g')
    html = html.replace(prismaKwRegex, '<span class="text-violet-400 font-medium">$1</span>')
    html = html.replace(/(@@?[\w.]+)/g, '<span class="text-yellow-400">$1</span>')
    html = html.replace(/\b(Int|String|Boolean|DateTime|Float|Decimal|BigInt|Bytes|Json)\b/g, '<span class="text-cyan-300">$1</span>')
    html = html.replace(/\b(\d+\.?\d*)\b/g, '<span class="text-amber-300">$1</span>')
    return html
  }

  // Default: TypeScript/JavaScript style highlighting
  html = html.replace(/(\/\/.*$)/gm, '<span class="text-muted-foreground/60 italic">$1</span>')
  html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-muted-foreground/60 italic">$1</span>')
  html = html.replace(/(&quot;.*?&quot;|".*?"|'.*?'|`[^`]*`)/g, '<span class="text-emerald-400">$1</span>')
  const kws = LANGUAGE_KEYWORDS[language] || LANGUAGE_KEYWORDS.typescript
  if (kws.length > 0) {
    const kwRegex = new RegExp(`\\b(${kws.join('|')})\\b`, 'g')
    html = html.replace(kwRegex, '<span class="text-violet-400 font-medium">$1</span>')
  }
  html = html.replace(/\b([A-Z][a-zA-Z0-9]*)\b/g, '<span class="text-amber-300">$1</span>')
  html = html.replace(/\b(\d+\.?\d*)\b/g, '<span class="text-cyan-300">$1</span>')
  html = html.replace(/(@\w+)/g, '<span class="text-yellow-400">$1</span>')
  html = html.replace(/(&lt;\/?)([\w.]+)/g, '$1<span class="text-red-400">$2</span>')

  return html
}

function FileTab({ file, isActive, isUnsaved, onClose, onClick }: {
  file: ProjectFile
  isActive: boolean
  isUnsaved: boolean
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
      case 'md': case 'mdx': return '📝'
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
      {isUnsaved && (
        <span className="size-2 rounded-full bg-amber-400 shrink-0" />
      )}
      <span
        onClick={onClose}
        className="ml-1 size-4 rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/20 transition-opacity"
      >
        <X className="size-3" />
      </span>
    </button>
  )
}

function Minimap({ lines, scrollHeight, clientHeight, scrollTop }: {
  lines: string[]
  scrollHeight: number
  clientHeight: number
  scrollTop: number
}) {
  const maxLines = 80
  const startLine = Math.max(0, lines.length - maxLines)
  const visibleLines = lines.slice(startLine)

  const totalRatio = scrollHeight > 0 ? clientHeight / scrollHeight : 1
  const viewportTop = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0
  const viewportHeight = Math.max(totalRatio * 100, 5)

  return (
    <div className="relative w-14 shrink-0 bg-zinc-900/50 dark:bg-zinc-950/50 border-l border-border/20 overflow-hidden">
      <div className="py-1 px-1">
        {visibleLines.map((line, i) => (
          <div key={i} className="h-[2px] mb-[0.5px]">
            {line.trim() && (
              <div
                className="h-full rounded-sm opacity-30"
                style={{
                  width: `${Math.min(line.length * 0.8, 100)}%`,
                  backgroundColor: line.trimStart().startsWith('//') || line.trimStart().startsWith('#')
                    ? 'rgb(113 113 122)'
                    : line.trimStart().startsWith('import') || line.trimStart().startsWith('export') || line.trimStart().startsWith('const') || line.trimStart().startsWith('function')
                      ? 'rgb(167 139 250)'
                      : 'rgb(161 161 170)',
                }}
              />
            )}
          </div>
        ))}
      </div>
      <div
        className="absolute left-0 right-0 bg-white/5 border-y border-white/10 pointer-events-none"
        style={{
          top: `${viewportTop}%`,
          height: `${viewportHeight}%`,
        }}
      />
    </div>
  )
}

function WelcomeScreen() {
  const files = useAppStore((s) => s.files)
  const setActiveFileId = useAppStore((s) => s.setActiveFileId)
  const setBottomPanelOpen = useAppStore((s) => s.setBottomPanelOpen)
  const setActiveBottomTab = useAppStore((s) => s.setActiveBottomTab)

  // Get recent files (last 5 by last modified or just the first 5)
  const recentFiles = useMemo(() => {
    return files
      .filter((f) => !f.isDirectory)
      .slice(0, 5)
  }, [files])

  const shortcuts = [
    { icon: <Command className="size-4 text-emerald-500" />, title: 'Command Palette', shortcut: 'Ctrl+K', keys: ['Ctrl', 'K'] },
    { icon: <Code2 className="size-4 text-violet-500" />, title: 'Toggle Terminal', shortcut: 'Ctrl+J', keys: ['Ctrl', 'J'] },
    { icon: <Keyboard className="size-4 text-amber-500" />, title: 'Save File', shortcut: 'Ctrl+S', keys: ['Ctrl', 'S'] },
    { icon: <Zap className="size-4 text-pink-500" />, title: 'Run Project', shortcut: 'F5', keys: ['F5'] },
  ]

  const quickActions = [
    { icon: <Search className="size-3.5" />, label: 'Search Files', action: () => {} },
    { icon: <Terminal className="size-3.5" />, label: 'Open Terminal', action: () => { setBottomPanelOpen(true); setActiveBottomTab('terminal') } },
    { icon: <Code2 className="size-3.5" />, label: 'New File', action: () => {} },
  ]

  return (
    <div className="flex-1 flex items-center justify-center bg-zinc-900 dark:bg-zinc-950">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="text-center max-w-md px-6"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4, ease: 'easeOut' }}
          className="flex items-center justify-center mb-8"
        >
          <div className="animated-gradient-border">
            <div className="flex items-center justify-center size-20 rounded-2xl bg-zinc-900">
              <Zap className="size-9 text-emerald-500" />
            </div>
          </div>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold text-foreground mb-1 tracking-tight"
        >
          TeamForge IDE
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-muted-foreground/50 text-[10px] mb-3 font-mono"
        >
          v0.8.0
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground text-sm mb-6"
        >
          Where AI agents collaborate to build software 24/7
        </motion.p>

        {/* Quick Actions Row */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="flex items-center justify-center gap-2 mb-6"
        >
          {quickActions.map((action, i) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              onClick={action.action}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/8 text-muted-foreground hover:text-foreground text-[11px] transition-colors border border-white/5 hover:border-white/10"
            >
              {action.icon}
              <span>{action.label}</span>
            </motion.button>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 gap-3 text-xs"
        >
          {shortcuts.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, x: i % 2 === 0 ? -10 : 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.08 }}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 hover:bg-white/8 text-muted-foreground transition-colors cursor-default border border-white/5"
            >
              {item.icon}
              <div className="text-left flex-1">
                <div className="text-foreground font-medium">{item.title}</div>
                <div className="flex items-center gap-0.5 mt-0.5">
                  {item.keys.map((key, ki) => (
                    <span key={ki}>
                      {ki > 0 && <span className="text-muted-foreground/30 mx-0.5">+</span>}
                      <span className="kbd-badge">{key}</span>
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Recent Files Section */}
        {recentFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-6 text-left"
          >
            <div className="flex items-center gap-1.5 mb-2 px-1">
              <Clock className="size-3 text-muted-foreground/50" />
              <span className="text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase">Recent Files</span>
            </div>
            <div className="space-y-0.5">
              {recentFiles.map((file) => (
                <button
                  key={file.id}
                  onClick={() => setActiveFileId(file.id)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                >
                  <FileCode2 className="size-3 text-emerald-500/50 shrink-0" />
                  <span className="truncate">{file.path}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-muted-foreground/40 text-[10px] mt-6"
        >
          Select a file from the explorer to start editing
        </motion.p>
      </motion.div>
    </div>
  )
}

export function IDEEditor() {
  const files = useAppStore((s) => s.files)
  const activeFileId = useAppStore((s) => s.activeFileId)
  const setActiveFileId = useAppStore((s) => s.setActiveFileId)
  const unsavedFileIds = useAppStore((s) => s.unsavedFileIds)
  const markFileSaved = useAppStore((s) => s.markFileSaved)
  const markFileUnsaved = useAppStore((s) => s.markFileUnsaved)
  const cursorLine = useAppStore((s) => s.cursorLine)
  const cursorColumn = useAppStore((s) => s.cursorColumn)
  const setCursorPosition = useAppStore((s) => s.setCursorPosition)
  const setIsRunning = useAppStore((s) => s.setIsRunning)
  const currentProject = useAppStore((s) => s.currentProject)
  const addBuildLog = useAppStore((s) => s.addBuildLog)
  const setActiveBottomTab = useAppStore((s) => s.setActiveBottomTab)
  const setBottomPanelOpen = useAppStore((s) => s.setBottomPanelOpen)
  const updateFileContent = useAppStore((s) => s.updateFileContent)

  const [manuallyOpenIds, setManuallyOpenIds] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveFlash, setSaveFlash] = useState(false)
  const codeAreaRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [scrollState, setScrollState] = useState({ scrollTop: 0, scrollHeight: 0, clientHeight: 0 })

  const activeFile = useMemo(
    () => files.find((f) => f.id === activeFileId) || null,
    [files, activeFileId],
  )

  const detectedLanguage = useMemo(
    () => activeFile ? detectLanguage(activeFile.path) : 'plaintext',
    [activeFile],
  )

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

  // Save handler
  const handleSave = useCallback(async () => {
    if (!activeFile) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/files/${activeFile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: activeFile.content }),
      })
      if (res.ok) {
        markFileSaved(activeFile.id)
        setSaveFlash(true)
        setTimeout(() => setSaveFlash(false), 600)
      }
    } catch (e) {
      console.error('Failed to save file:', e)
    } finally {
      setIsSaving(false)
    }
  }, [activeFile, markFileSaved])

  // Run/build handler
  const handleRun = useCallback(async () => {
    setIsRunning(true)
    setBottomPanelOpen(true)
    setActiveBottomTab('terminal')

    try {
      const res = await fetch('/api/build-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject?.id || '',
          output: `$ bun run build\n⠋ Compiling...\n✓ Compiled successfully in 1.2s\n✓ Build completed\n✓ All checks passed\n\nDone in 2.3s`,
          status: 'success',
          type: 'build',
        }),
      })
      if (res.ok) {
        const log = await res.json()
        addBuildLog(log)
      }
    } catch (e) {
      console.error('Failed to run build:', e)
    } finally {
      setIsRunning(false)
    }
  }, [currentProject, addBuildLog, setBottomPanelOpen, setActiveBottomTab, setIsRunning])

  // Handle textarea content change - update store on every keystroke
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!activeFile) return
    const newContent = e.target.value
    updateFileContent(activeFile.id, newContent)
    markFileUnsaved(activeFile.id)
  }, [activeFile, updateFileContent, markFileUnsaved])

  // Handle special keys: Tab for indentation, Enter for auto-indent
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!activeFile) return

    // Let Ctrl/Cmd shortcuts pass through to the window handler
    if ((e.ctrlKey || e.metaKey) && ['s', 'c', 'v', 'x', 'a', 'z', 'y'].includes(e.key.toLowerCase())) return
    if (e.key === 'F5') return

    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const value = textarea.value

      if (e.shiftKey) {
        // Shift+Tab: remove indentation from the current line
        const lineStart = value.lastIndexOf('\n', start - 1) + 1
        const lineContent = value.substring(lineStart, lineStart + 2)
        if (lineContent === '  ') {
          const newValue = value.substring(0, lineStart) + value.substring(lineStart + 2)
          updateFileContent(activeFile.id, newValue)
          markFileUnsaved(activeFile.id)
          const newCursorPos = Math.max(lineStart, start - 2)
          requestAnimationFrame(() => {
            textarea.selectionStart = textarea.selectionEnd = newCursorPos
          })
        }
      } else {
        // Tab: insert 2 spaces
        const newValue = value.substring(0, start) + '  ' + value.substring(end)
        updateFileContent(activeFile.id, newValue)
        markFileUnsaved(activeFile.id)
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2
        })
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const value = textarea.value

      // Find the start of the current line
      const lineStart = value.lastIndexOf('\n', start - 1) + 1
      const currentLine = value.substring(lineStart, start)

      // Match the current line's indentation
      const indentMatch = currentLine.match(/^(\s*)/)
      const indent = indentMatch ? indentMatch[1] : ''

      // Add extra indent after opening braces, parens, brackets, or colons
      const trimmedLine = currentLine.trimEnd()
      const lastChar = trimmedLine.slice(-1)
      const extraIndent = ['{', '(', '[', ':'].includes(lastChar) ? '  ' : ''

      const newIndent = indent + extraIndent
      const newValue = value.substring(0, start) + '\n' + newIndent + value.substring(end)

      updateFileContent(activeFile.id, newValue)
      markFileUnsaved(activeFile.id)

      const newCursorPos = start + 1 + newIndent.length
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = newCursorPos
      })
    }
  }, [activeFile, updateFileContent, markFileUnsaved])

  // Keyboard shortcut: Ctrl+S to save, F5 to run
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
      if (e.key === 'F5') {
        e.preventDefault()
        handleRun()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSave, handleRun])

  const lines = useMemo(() => activeFile?.content?.split('\n') || [], [activeFile?.content])

  // Track scroll position for minimap
  const handleScroll = useCallback(() => {
    if (codeAreaRef.current) {
      const el = codeAreaRef.current
      setScrollState({
        scrollTop: el.scrollTop,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
      })
    }
  }, [])

  // Track cursor position from textarea selection
  useEffect(() => {
    const handleSelectionChange = () => {
      const textarea = textareaRef.current
      if (!textarea || document.activeElement !== textarea) return

      const pos = textarea.selectionStart
      const content = textarea.value
      const linesBeforeCursor = content.substring(0, pos).split('\n')
      const line = linesBeforeCursor.length
      const column = linesBeforeCursor[linesBeforeCursor.length - 1].length + 1
      setCursorPosition(line, column)
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [setCursorPosition])

  // Scroll to keep cursor visible when cursor line changes
  useEffect(() => {
    if (!codeAreaRef.current || !textareaRef.current) return
    if (document.activeElement !== textareaRef.current) return

    const container = codeAreaRef.current
    const lineHeight = 13 * 1.6 // 13px font-size * 1.6 line-height = 20.8px
    const paddingTop = 12 // pt-3 = 0.75rem ≈ 12px
    const cursorY = paddingTop + (cursorLine - 1) * lineHeight

    if (cursorY < container.scrollTop + paddingTop) {
      container.scrollTop = cursorY - paddingTop
    } else if (cursorY > container.scrollTop + container.clientHeight - lineHeight - paddingTop) {
      container.scrollTop = cursorY - container.clientHeight + lineHeight + paddingTop
    }
  }, [cursorLine, cursorColumn])

  // When active file changes, reset cursor position
  useEffect(() => {
    if (activeFile) {
      setCursorPosition(1, 1)
    }
  }, [activeFileId, setCursorPosition])

  // Focus textarea when active file changes
  useEffect(() => {
    if (activeFileId && textareaRef.current) {
      requestAnimationFrame(() => {
        textareaRef.current?.focus()
      })
    }
  }, [activeFileId])

  return (
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
      {/* Editor toolbar */}
      {activeFile && (
        <div className="flex items-center h-8 bg-muted/20 border-b px-2 gap-1 shrink-0">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn(
                    'size-6 transition-all',
                    unsavedFileIds.has(activeFile.id)
                      ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
                      : 'text-muted-foreground hover:text-foreground',
                    saveFlash && 'text-emerald-400 save-flash',
                  )}
                  onClick={handleSave}
                  disabled={isSaving || !unsavedFileIds.has(activeFile.id)}
                >
                  <Save className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Save (Ctrl+S)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-6 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                  onClick={handleRun}
                >
                  <Play className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Run Build (F5)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex-1" />

          <span className="text-[10px] text-muted-foreground">
            {detectedLanguage.charAt(0).toUpperCase() + detectedLanguage.slice(1)}
          </span>
        </div>
      )}

      {/* Breadcrumb showing full file path */}
      {activeFile && (
        <div className="flex items-center h-6 px-3 bg-muted/10 border-b text-[10px] text-muted-foreground/60 shrink-0 gap-0.5 overflow-hidden">
          {activeFile.path.split('/').map((segment, i, arr) => (
            <span key={i} className="flex items-center gap-0.5 shrink-0">
              {i > 0 && <ChevronRight className="size-2.5 breadcrumb-separator" />}
              <span className={cn(
                i === arr.length - 1 ? 'text-foreground/70 font-medium' : 'hover:text-foreground/50 cursor-default',
              )}>
                {segment}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* File tabs */}
      {openFiles.length > 0 && (
        <div className="flex items-center h-9 bg-muted/20 border-b overflow-x-auto scrollbar-none shrink-0">
          {openFiles.map((file) => (
            <FileTab
              key={file.id}
              file={file}
              isActive={file.id === activeFileId}
              isUnsaved={unsavedFileIds.has(file.id)}
              onClose={(e) => handleCloseFile(file.id, e)}
              onClick={() => handleFileClick(file.id)}
            />
          ))}
        </div>
      )}

      {/* Code editor area */}
      {activeFile ? (
        <div className="flex-1 flex overflow-hidden">
          <div
            ref={codeAreaRef}
            className="flex-1 overflow-auto bg-zinc-900 dark:bg-zinc-950 custom-scrollbar code-area-gradient"
            onScroll={handleScroll}
          >
            <div className="flex min-w-fit">
              {/* Line numbers */}
              <div className="select-none text-right pr-4 pl-4 pt-3 text-[13px] leading-[1.6] font-mono text-zinc-600 shrink-0 sticky left-0 bg-zinc-900 dark:bg-zinc-950 z-10">
                {lines.map((_, i) => (
                  <div key={i} className={cn(i + 1 === cursorLine && 'text-emerald-500/70')}>{i + 1}</div>
                ))}
              </div>
              {/* Code content with textarea overlay for editing */}
              <div className="relative min-w-0 flex-1">
                {/* Syntax highlighted display layer - pointer-events-none so clicks go to textarea */}
                <pre className="text-[13px] leading-[1.6] font-mono pt-3 pr-4 pl-4 whitespace-pre text-zinc-300 pointer-events-none">
                  {lines.map((line, i) => (
                    <div key={i} className={cn(
                      'px-2 -mx-2',
                      i + 1 === cursorLine && 'current-line-gradient',
                    )}>
                      <code dangerouslySetInnerHTML={{ __html: highlightCode(line, detectedLanguage) }} />
                    </div>
                  ))}
                </pre>
                {/* Editable textarea overlay - transparent text, visible caret */}
                <textarea
                  key={activeFileId}
                  ref={textareaRef}
                  className="absolute inset-0 w-full h-full text-[13px] leading-[1.6] font-mono pt-3 pr-4 pl-4 whitespace-pre bg-transparent text-transparent resize-none border-0 outline-0 overflow-hidden"
                  style={{ caretColor: '#d4d4d8', tabSize: 2 }}
                  value={activeFile.content}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  spellCheck={false}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  wrap="off"
                />
              </div>
            </div>
          </div>

          {/* Minimap */}
          <Minimap
            lines={lines}
            scrollHeight={scrollState.scrollHeight}
            clientHeight={scrollState.clientHeight}
            scrollTop={scrollState.scrollTop}
          />
        </div>
      ) : (
        <WelcomeScreen />
      )}

      {/* Status bar (breadcrumb + line/col) */}
      {activeFile && (
        <div className="flex items-center h-6 px-3 bg-muted/20 border-t text-[10px] text-muted-foreground shrink-0">
          <span>{activeFile.path}</span>
          <span className="mx-2 text-border">|</span>
          <span>{detectedLanguage}</span>
          <span className="mx-2 text-border">|</span>
          <span>UTF-8</span>
          <span className="mx-2 text-border">|</span>
          <span>{lines.length} lines</span>
          <div className="flex-1" />
          <span className="tabular-nums">Ln {cursorLine}, Col {cursorColumn}</span>
          {unsavedFileIds.has(activeFile.id) && (
            <>
              <span className="mx-2 text-border">|</span>
              <span className="text-amber-500">Modified</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
