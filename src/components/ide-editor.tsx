'use client'

import { useAppStore } from '@/lib/store'
import { type ProjectFile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { X, Code2, Keyboard, Zap, Command, Save, Play, ChevronRight, FileCode2, Clock, Terminal, Search, WrapText, Loader2, Settings, FilePlus, FolderOpen, Copy } from 'lucide-react'
import { motion } from 'framer-motion'
import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { FindReplaceBar } from '@/components/find-replace-bar'
import { GoToLineDialog } from '@/components/go-to-line-dialog'
import { FileCreationDialog } from '@/components/file-creation-dialog'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

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

// Bracket pairs for matching and auto-close
const BRACKET_PAIRS: Record<string, string> = {
  '(': ')',
  '{': '}',
  '[': ']',
}
const CLOSING_BRACKETS = new Set([')', '}', ']'])
const OPENING_BRACKETS = new Set(['(', '{', '['])
const QUOTE_CHARS = new Set(['"', "'", '`'])

// Find matching bracket position
function findMatchingBracket(
  content: string,
  pos: number,
): { matchPos: number; matchChar: string } | null {
  const char = content[pos]
  if (!char) return null

  if (OPENING_BRACKETS.has(char)) {
    // Search forward for matching closing bracket
    const target = BRACKET_PAIRS[char]
    let depth = 1
    let i = pos + 1
    while (i < content.length && depth > 0) {
      const c = content[i]
      if (c === char) depth++
      else if (c === target) depth--
      // Skip strings
      if ((c === '"' || c === "'" || c === '`') && i > 0 && content[i - 1] !== '\\') {
        const quote = c
        i++
        while (i < content.length) {
          if (content[i] === quote && content[i - 1] !== '\\') break
          i++
        }
      }
      i++
    }
    if (depth === 0) {
      return { matchPos: i - 1, matchChar: target }
    }
  } else if (CLOSING_BRACKETS.has(char)) {
    // Search backward for matching opening bracket
    const openToClose = Object.fromEntries(Object.entries(BRACKET_PAIRS).map(([k, v]) => [v, k]))
    const target = openToClose[char]
    if (!target) return null
    let depth = 1
    let i = pos - 1
    while (i >= 0 && depth > 0) {
      const c = content[i]
      if (c === char) depth++
      else if (c === target) depth--
      i--
    }
    if (depth === 0) {
      return { matchPos: i + 1, matchChar: target }
    }
  }

  return null
}

// Check if position is adjacent to a bracket (for highlight)
function getBracketHighlightPositions(
  content: string,
  cursorPos: number,
): { openPos: number; closePos: number } | null {
  // Check character before cursor and at cursor
  const positionsToCheck = [cursorPos - 1, cursorPos]
  for (const pos of positionsToCheck) {
    if (pos < 0 || pos >= content.length) continue
    const char = content[pos]
    if (!OPENING_BRACKETS.has(char) && !CLOSING_BRACKETS.has(char)) continue

    const result = findMatchingBracket(content, pos)
    if (result) {
      if (OPENING_BRACKETS.has(char)) {
        return { openPos: pos, closePos: result.matchPos }
      } else {
        return { openPos: result.matchPos, closePos: pos }
      }
    }
  }
  return null
}

// Enhanced syntax highlighting
function highlightCode(code: string, language: string, bracketHighlights?: { openPos: number; closePos: number } | null, lineOffset?: number): string {
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  if (language === 'json') {
    html = html.replace(/("(?:[^"\\]|\\.)*")\s*:/g, '<span class="text-green-400 font-medium">$1</span>:')
    html = html.replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span class="text-emerald-400">$1</span>')
    html = html.replace(/\b(true|false|null)\b/g, '<span class="text-amber-300">$1</span>')
    html = html.replace(/\b(\d+\.?\d*)\b/g, '<span class="text-cyan-300">$1</span>')
    return html
  }

  if (language === 'css') {
    html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-muted-foreground/60 italic">$1</span>')
    html = html.replace(/(@[\w-]+)/g, '<span class="text-green-400 font-medium">$1</span>')
    html = html.replace(/^([.#:@][\w\-"'\s>~+.]+)\s*\{/gm, '<span class="text-amber-300">$1</span> {')
    const cssPropRegex = new RegExp(`\\b(${CSS_PROPERTIES.join('|')})\\s*:`, 'g')
    html = html.replace(cssPropRegex, '<span class="text-cyan-300">$1</span>:')
    html = html.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, '<span class="text-emerald-400">$1</span>')
    html = html.replace(/\b(\d+\.?\d*)(px|rem|em|%|vh|vw|fr|s|ms|deg|turn)\b/g, '<span class="text-cyan-300">$1$2</span>')
    const cssKwRegex = new RegExp(`\\b(${LANGUAGE_KEYWORDS.css.join('|')})\\b`, 'g')
    html = html.replace(cssKwRegex, '<span class="text-green-400 font-medium">$1</span>')
    html = html.replace(/(!important)/g, '<span class="text-red-400 font-bold">$1</span>')
    return html
  }

  if (language === 'markdown') {
    html = html.replace(/^(#{1,6}\s.+)$/gm, '<span class="text-green-400 font-bold">$1</span>')
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
    html = html.replace(prismaKwRegex, '<span class="text-green-400 font-medium">$1</span>')
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
    html = html.replace(kwRegex, '<span class="text-green-400 font-medium">$1</span>')
  }
  html = html.replace(/\b([A-Z][a-zA-Z0-9]*)\b/g, '<span class="text-amber-300">$1</span>')
  html = html.replace(/\b(\d+\.?\d*)\b/g, '<span class="text-cyan-300">$1</span>')
  html = html.replace(/(@\w+)/g, '<span class="text-yellow-400">$1</span>')
  html = html.replace(/(&lt;\/?)([\w.]+)/g, '$1<span class="text-red-400">$2</span>')

  return html
}

function FileTab({ file, isActive, isUnsaved, onClose, onClick, onContextMenu, onDragStart, onDragOver, onDrop, onRename }: {
  file: ProjectFile
  isActive: boolean
  isUnsaved: boolean
  onClose: (e: React.MouseEvent) => void
  onClick: () => void
  onContextMenu?: (e: React.MouseEvent, file: ProjectFile) => void
  onDragStart?: () => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  onRename?: (file: ProjectFile) => void
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

  const handleAuxClick = useCallback((e: React.MouseEvent) => {
    // Middle click to close
    if (e.button === 1) {
      e.preventDefault()
      onClose(e)
    }
  }, [onClose])

  return (
    <button
      onClick={onClick}
      onAuxClick={handleAuxClick}
      onContextMenu={onContextMenu ? (e) => onContextMenu(e, file) : undefined}
      onDoubleClick={() => onRename?.(file)}
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
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
                      ? 'rgb(34 197 94)'
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
  const setFileSearchOpen = useAppStore((s) => s.setFileSearchOpen)
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen)
  const [showNewFileDialog, setShowNewFileDialog] = useState(false)
  const [recentFileIds, setRecentFileIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('teamforge-recent-files')
        if (stored) return JSON.parse(stored) as string[]
      } catch { /* ignore */ }
    }
    return []
  })

  // Get recent files by ID (last 5)
  const recentFiles = useMemo(() => {
    return recentFileIds
      .map((id) => files.find((f) => f.id === id))
      .filter((f): f is ProjectFile => !!f && !f.isDirectory)
      .slice(0, 5)
  }, [recentFileIds, files])

  // Keyboard shortcuts cheat sheet (5 most common)
  const shortcuts = [
    { icon: <Save className="size-4 text-emerald-500" />, title: 'Save File', keys: ['Ctrl', 'S'] },
    { icon: <Search className="size-4 text-emerald-500" />, title: 'Quick Open', keys: ['Ctrl', 'P'] },
    { icon: <FilePlus className="size-4 text-emerald-500" />, title: 'New File', keys: ['Ctrl', 'N'] },
    { icon: <Terminal className="size-4 text-emerald-500" />, title: 'Toggle Terminal', keys: ['Ctrl', 'J'] },
    { icon: <Command className="size-4 text-emerald-500" />, title: 'Command Palette', keys: ['Ctrl', 'Shift', 'P'] },
  ]

  // Quick action buttons
  const quickActions = [
    { icon: <FilePlus className="size-4" />, label: 'New File', action: () => { setShowNewFileDialog(true) } },
    { icon: <FolderOpen className="size-4" />, label: 'Open File', action: () => { setFileSearchOpen(true) } },
    { icon: <Settings className="size-4" />, label: 'Open Settings', action: () => { setSettingsOpen(true) } },
  ]

  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-[#0d0d0d] via-[#0d0d0d] to-[#141414] relative overflow-hidden">
      {/* Subtle background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-green-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-emerald-500/3 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 max-w-lg w-full mx-4"
      >
        {/* Glassmorphism welcome panel */}
        <div className="rounded-2xl border border-white/10 bg-[#0d0d0d]/80 backdrop-blur-xl shadow-2xl shadow-green-500/5 p-8">
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4, ease: 'easeOut' }}
            className="flex items-center justify-center mb-6"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/20 rounded-2xl blur-xl" />
              <div className="relative flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/20">
                <Zap className="size-8 text-green-400" />
              </div>
            </div>
          </motion.div>

          {/* Heading */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-6"
          >
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Welcome to TeamForge IDE
            </h1>
            <p className="text-muted-foreground text-sm mt-2">
              Where AI agents collaborate to build software 24/7
            </p>
          </motion.div>

          {/* Quick Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-3 mb-6"
          >
            {quickActions.map((action, i) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.05 }}
                onClick={action.action}
                className="flex flex-col items-center gap-1.5 px-5 py-3 rounded-xl bg-white/5 hover:bg-green-500/10 text-muted-foreground hover:text-green-400 text-xs transition-all border border-white/5 hover:border-green-500/20 hover:shadow-lg hover:shadow-green-500/5"
              >
                {action.icon}
                <span className="font-medium">{action.label}</span>
              </motion.button>
            ))}
          </motion.div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-green-500/20 to-transparent mb-6" />

          {/* Two-column layout: Recent Files + Shortcuts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Recent Files */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="text-left"
            >
              <div className="flex items-center gap-1.5 mb-2">
                <Clock className="size-3 text-muted-foreground/50" />
                <span className="text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase">Recent Files</span>
              </div>
              {recentFiles.length > 0 ? (
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
              ) : (
                <p className="text-[10px] text-muted-foreground/40 px-2 py-2">
                  No recent files yet
                </p>
              )}
            </motion.div>

            {/* Keyboard Shortcuts Cheat Sheet */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 }}
              className="text-left"
            >
              <div className="flex items-center gap-1.5 mb-2">
                <Keyboard className="size-3 text-muted-foreground/50" />
                <span className="text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase">Shortcuts</span>
              </div>
              <div className="space-y-0.5">
                {shortcuts.map((item) => (
                  <div
                    key={item.title}
                    className="flex items-center justify-between px-2 py-1.5 rounded-md text-xs text-muted-foreground"
                  >
                    <span className="truncate mr-2">{item.title}</span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {item.keys.map((key, ki) => (
                        <span key={ki}>
                          {ki > 0 && <span className="text-muted-foreground/30 mx-0.5">+</span>}
                          <span className="kbd-badge">{key}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* New File Dialog for Welcome Screen */}
      <FileCreationDialog
        open={showNewFileDialog}
        onOpenChange={setShowNewFileDialog}
        initialPath=""
        isFolder={false}
      />
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
  const isRunning = useAppStore((s) => s.isRunning)
  const setIsRunning = useAppStore((s) => s.setIsRunning)
  const currentProject = useAppStore((s) => s.currentProject)
  const addBuildLog = useAppStore((s) => s.addBuildLog)
  const setActiveBottomTab = useAppStore((s) => s.setActiveBottomTab)
  const setBottomPanelOpen = useAppStore((s) => s.setBottomPanelOpen)
  const updateFileContent = useAppStore((s) => s.updateFileContent)
  const findMatches = useAppStore((s) => s.findMatches)
  const currentMatchIndex = useAppStore((s) => s.currentMatchIndex)
  const findReplaceOpen = useAppStore((s) => s.findReplaceOpen)
  const goToLineOpen = useAppStore((s) => s.goToLineOpen)
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)
  // Store-based tab management
  const openFileIds = useAppStore((s) => s.openFileIds)
  const removeOpenFile = useAppStore((s) => s.removeOpenFile)
  const reorderOpenFiles = useAppStore((s) => s.reorderOpenFiles)

  const [isSaving, setIsSaving] = useState(false)
  const [saveFlash, setSaveFlash] = useState(false)
  const codeAreaRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [scrollState, setScrollState] = useState({ scrollTop: 0, scrollHeight: 0, clientHeight: 0 })
  const [bracketHighlights, setBracketHighlights] = useState<{ openPos: number; closePos: number } | null>(null)

  // Tab management state
  const [tabContextMenu, setTabContextMenu] = useState<{ fileId: string; x: number; y: number } | null>(null)
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null)
  const [renameTabId, setRenameTabId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // Track file loading state (when activeFileId changes but file content hasn't loaded yet)
  const [fileLoading, setFileLoading] = useState(false)
  const prevActiveFileIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (activeFileId !== prevActiveFileIdRef.current) {
      prevActiveFileIdRef.current = activeFileId
      if (activeFileId) {
        const fileExists = files.find((f) => f.id === activeFileId)
        if (!fileExists) {
          setFileLoading(true)
        } else {
          setFileLoading(false)
        }
      } else {
        setFileLoading(false)
      }
    }
  }, [activeFileId, files])

  // Clear file loading when the file appears
  useEffect(() => {
    if (fileLoading && activeFileId && files.find((f) => f.id === activeFileId)) {
      setFileLoading(false)
    }
  }, [fileLoading, activeFileId, files])

  // Recently opened files (persisted to localStorage)
  const [recentlyOpenedFiles, setRecentlyOpenedFiles] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('teamforge-recent-files')
        if (stored) return JSON.parse(stored) as string[]
      } catch { /* ignore */ }
    }
    return []
  })
  // Close tab context menu when clicking outside
  useEffect(() => {
    if (!tabContextMenu) return
    const handler = () => setTabContextMenu(null)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [tabContextMenu])

  const activeFile = useMemo(
    () => files.find((f) => f.id === activeFileId) || null,
    [files, activeFileId],
  )

  const detectedLanguage = useMemo(
    () => activeFile ? detectLanguage(activeFile.path) : 'plaintext',
    [activeFile],
  )

  const openFiles = useMemo(
    () => openFileIds.map((id) => files.find((f) => f.id === id)).filter(Boolean) as ProjectFile[],
    [openFileIds, files],
  )

  const handleFileClick = useCallback((fileId: string) => {
    setActiveFileId(fileId) // setActiveFileId now automatically adds to openFileIds
    // Track recently opened files
    setRecentlyOpenedFiles((prev) => {
      const next = [fileId, ...prev.filter((id) => id !== fileId)].slice(0, 10)
      try { localStorage.setItem('teamforge-recent-files', JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [setActiveFileId])

  const handleCloseFile = useCallback((fileId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    removeOpenFile(fileId) // removeOpenFile handles switching active file if needed
  }, [removeOpenFile])

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
        toast.success(`Saved ${activeFile.path.split('/').pop()}`)
      } else {
        toast.error('Failed to save file')
      }
    } catch {
      toast.error('Failed to save file')
    } finally {
      setIsSaving(false)
    }
  }, [activeFile, markFileSaved])

  // Run/build handler
  const handleRun = useCallback(async () => {
    setIsRunning(true)
    setBottomPanelOpen(true)
    setActiveBottomTab('terminal')
    toast.loading('Running build...', { id: 'editor-run' })

    try {
      const res = await fetch('/api/build-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject?.id || '',
          type: 'build',
        }),
      })
      if (res.ok) {
        const log = await res.json()
        addBuildLog(log)
        toast.dismiss('editor-run')
        if (log.status === 'success') {
          toast.success('Build completed successfully')
        } else if (log.status === 'failed') {
          toast.error('Build failed')
        } else {
          toast.warning('Build completed with warnings')
        }
      } else {
        toast.dismiss('editor-run')
        toast.error('Build failed')
      }
    } catch {
      toast.dismiss('editor-run')
      toast.error('Failed to run build')
    } finally {
      setIsRunning(false)
    }
  }, [currentProject, addBuildLog, setBottomPanelOpen, setActiveBottomTab, setIsRunning])

  // Run current file handler - determines command based on file type
  const handleRunFile = useCallback(async () => {
    if (!activeFile) return

    // Auto-save before running
    if (unsavedFileIds.has(activeFile.id)) {
      try {
        const res = await fetch(`/api/files/${activeFile.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: activeFile.content }),
        })
        if (res.ok) {
          markFileSaved(activeFile.id)
        }
      } catch {
        // Continue even if save fails
      }
    }

    const ext = activeFile.path.split('.').pop()?.toLowerCase() || ''
    let command: string

    switch (ext) {
      case 'ts':
      case 'tsx':
      case 'js':
      case 'jsx':
        command = `bun run ${activeFile.path}`
        break
      case 'py':
        command = `python3 ${activeFile.path}`
        break
      case 'sh':
      case 'bash':
        command = `bash ${activeFile.path}`
        break
      case 'prisma':
        command = `npx prisma validate`
        break
      default:
        // For unknown file types, try bun run
        command = `bun ${activeFile.path}`
        break
    }

    setIsRunning(true)
    setBottomPanelOpen(true)
    setActiveBottomTab('terminal')

    // Dispatch a custom event so the terminal can show the command
    window.dispatchEvent(new CustomEvent('teamforge-terminal-execute', {
      detail: command,
    }))

    try {
      const res = await fetch('/api/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command,
          cwd: '/home/z/my-project',
          projectId: currentProject?.id || '',
        }),
      })

      if (res.ok) {
        const data = await res.json() as { stdout: string; stderr: string; exitCode: number; timedOut: boolean }
        // The terminal handles display via the custom event, but we also show a toast
        if (data.exitCode === 0) {
          toast.success(`File executed successfully`)
        } else if (data.timedOut) {
          toast.error('Execution timed out (30s)')
        } else {
          toast.error(`Execution failed (exit code ${data.exitCode})`)
        }
      } else {
        toast.error('Failed to execute file')
      }
    } catch {
      toast.error('Failed to execute file')
    } finally {
      setIsRunning(false)
    }
  }, [activeFile, unsavedFileIds, markFileSaved, currentProject, setBottomPanelOpen, setActiveBottomTab, setIsRunning])

  // Handle textarea content change - update store on every keystroke
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!activeFile) return
    const newContent = e.target.value
    updateFileContent(activeFile.id, newContent)
    markFileUnsaved(activeFile.id)
  }, [activeFile, updateFileContent, markFileUnsaved])

  // Helper: apply content change and set cursor position
  const applyContentChange = useCallback((newContent: string, cursorStart: number, cursorEnd?: number) => {
    if (!activeFile) return
    updateFileContent(activeFile.id, newContent)
    markFileUnsaved(activeFile.id)
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = cursorStart
        textareaRef.current.selectionEnd = cursorEnd ?? cursorStart
      }
    })
  }, [activeFile, updateFileContent, markFileUnsaved])

  // Handle special keys
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!activeFile) return
    const textarea = e.currentTarget
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const value = textarea.value

    // Let Ctrl/Cmd shortcuts pass through to the window handler
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && ['s', 'c', 'v', 'x', 'a', 'z', 'y'].includes(e.key.toLowerCase())) return
    if (e.key === 'F5') return

    // Ctrl+/ : Toggle line comment
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault()
      const hasSelection = start !== end
      const content = value

      // Get the lines affected by the selection or cursor
      let lineStartIdx = content.lastIndexOf('\n', start - 1) + 1
      let lineEndIdx = content.indexOf('\n', end)
      if (lineEndIdx === -1) lineEndIdx = content.length

      const selectedLines = content.substring(lineStartIdx, lineEndIdx)
      const linesArray = selectedLines.split('\n')

      // Check if all lines are commented
      const allCommented = linesArray.every(line => line.trimStart().startsWith('//'))
      
      let newContent: string
      let newCursorStart: number
      let newCursorEnd: number

      if (allCommented) {
        // Remove comments
        const newLines = linesArray.map(line => {
          const trimmed = line.trimStart()
          if (trimmed.startsWith('// ')) {
            return line.replace('// ', '')
          } else if (trimmed.startsWith('//')) {
            return line.replace('//', '')
          }
          return line
        })
        newContent = content.substring(0, lineStartIdx) + newLines.join('\n') + content.substring(lineEndIdx)
        const removedChars = selectedLines.length - newLines.join('\n').length
        newCursorStart = start
        newCursorEnd = hasSelection ? end - removedChars : start - (start - lineStartIdx > 2 ? 3 : 2)
        // Adjust cursor position based on first line
        if (!hasSelection) {
          const firstLineOld = linesArray[0]
          const firstLineNew = newLines[0]
          const diff = firstLineOld.length - firstLineNew.length
          newCursorStart = Math.max(lineStartIdx, start - diff)
          newCursorEnd = newCursorStart
        } else {
          const diff = selectedLines.length - newLines.join('\n').length
          newCursorStart = start
          newCursorEnd = end - diff
        }
      } else {
        // Add comments
        const newLines = linesArray.map(line => {
          if (line.trim() === '') return line
          return '//' + (line.trimStart().length > 0 && line[line.indexOf(line.trimStart()) - 1] !== ' ' ? ' ' : ' ') + line
        })
        newContent = content.substring(0, lineStartIdx) + newLines.join('\n') + content.substring(lineEndIdx)
        const addedChars = newLines.join('\n').length - selectedLines.length
        if (!hasSelection) {
          newCursorStart = start + 3
          newCursorEnd = start + 3
        } else {
          newCursorStart = start + 3
          newCursorEnd = end + addedChars
        }
      }

      updateFileContent(activeFile.id, newContent)
      markFileUnsaved(activeFile.id)
      requestAnimationFrame(() => {
        textarea.selectionStart = newCursorStart
        textarea.selectionEnd = newCursorEnd
      })
      return
    }

    // Ctrl+Shift+K : Delete line
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      const content = value
      const lineStartIdx = content.lastIndexOf('\n', start - 1) + 1
      let lineEndIdx = content.indexOf('\n', start)
      if (lineEndIdx === -1) {
        // Last line
        const newContent = content.substring(0, lineStartIdx > 0 ? lineStartIdx - 1 : 0)
        updateFileContent(activeFile.id, newContent)
        markFileUnsaved(activeFile.id)
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = Math.min(lineStartIdx > 0 ? lineStartIdx - 1 : 0, newContent.length)
        })
      } else {
        const newContent = content.substring(0, lineStartIdx) + content.substring(lineEndIdx + 1)
        updateFileContent(activeFile.id, newContent)
        markFileUnsaved(activeFile.id)
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = lineStartIdx
        })
      }
      return
    }

    // Ctrl+L : Select current line (including trailing newline)
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'l') {
      e.preventDefault()
      const content = value
      const lineStartIdx = content.lastIndexOf('\n', start - 1) + 1
      let lineEndIdx = content.indexOf('\n', start)
      if (lineEndIdx === -1) lineEndIdx = content.length
      else lineEndIdx = lineEndIdx + 1 // Include the trailing newline in the selection
      requestAnimationFrame(() => {
        textarea.selectionStart = lineStartIdx
        textarea.selectionEnd = lineEndIdx
      })
      return
    }

    // Ctrl+= / Ctrl+- : Font size +/- 
    if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
      e.preventDefault()
      const newSize = Math.min(settings.fontSize + 1, 32)
      updateSettings({ fontSize: newSize })
      toast.success(`Font size: ${newSize}px`, { duration: 1000 })
      return
    }
    if ((e.ctrlKey || e.metaKey) && e.key === '-') {
      e.preventDefault()
      const newSize = Math.max(settings.fontSize - 1, 8)
      updateSettings({ fontSize: newSize })
      toast.success(`Font size: ${newSize}px`, { duration: 1000 })
      return
    }

    // Alt+Up : Move line up
    if (e.altKey && !e.ctrlKey && !e.shiftKey && e.key === 'ArrowUp') {
      e.preventDefault()
      const content = value
      const lineStartIdx = content.lastIndexOf('\n', start - 1) + 1
      let lineEndIdx = content.indexOf('\n', start)
      if (lineEndIdx === -1) lineEndIdx = content.length

      // Get current line
      const currentLine = content.substring(lineStartIdx, lineEndIdx)
      // Find previous line
      const prevLineEnd = lineStartIdx - 1
      if (prevLineEnd < 0) return // Already at top
      const prevLineStart = content.lastIndexOf('\n', prevLineEnd - 1) + 1
      const prevLine = content.substring(prevLineStart, prevLineEnd)

      // Swap
      const newContent = content.substring(0, prevLineStart) + currentLine + '\n' + prevLine + content.substring(lineEndIdx)
      const cursorOffset = start - lineStartIdx
      const newCursorPos = prevLineStart + Math.min(cursorOffset, currentLine.length)
      updateFileContent(activeFile.id, newContent)
      markFileUnsaved(activeFile.id)
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = newCursorPos
      })
      return
    }

    // Alt+Down : Move line down
    if (e.altKey && !e.ctrlKey && !e.shiftKey && e.key === 'ArrowDown') {
      e.preventDefault()
      const content = value
      const lineStartIdx = content.lastIndexOf('\n', start - 1) + 1
      let lineEndIdx = content.indexOf('\n', start)
      if (lineEndIdx === -1) return // Already at bottom
      const nextLineStart = lineEndIdx + 1
      const nextLineEnd = content.indexOf('\n', nextLineStart)
      const nextLineEndIdx = nextLineEnd === -1 ? content.length : nextLineEnd

      const currentLine = content.substring(lineStartIdx, lineEndIdx)
      const nextLine = content.substring(nextLineStart, nextLineEndIdx)

      // Swap
      const newContent = content.substring(0, lineStartIdx) + nextLine + '\n' + currentLine + content.substring(nextLineEndIdx)
      const cursorOffset = start - lineStartIdx
      const newCursorPos = lineStartIdx + nextLine.length + 1 + Math.min(cursorOffset, currentLine.length)
      updateFileContent(activeFile.id, newContent)
      markFileUnsaved(activeFile.id)
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = newCursorPos
      })
      return
    }

    // Shift+Alt+Down : Duplicate line down
    if (e.shiftKey && e.altKey && e.key === 'ArrowDown') {
      e.preventDefault()
      const content = value
      const lineStartIdx = content.lastIndexOf('\n', start - 1) + 1
      let lineEndIdx = content.indexOf('\n', start)
      if (lineEndIdx === -1) lineEndIdx = content.length

      const currentLine = content.substring(lineStartIdx, lineEndIdx)
      const newContent = content.substring(0, lineEndIdx) + '\n' + currentLine + content.substring(lineEndIdx)
      const cursorOffset = start - lineStartIdx
      const newCursorPos = lineEndIdx + 1 + Math.min(cursorOffset, currentLine.length)
      updateFileContent(activeFile.id, newContent)
      markFileUnsaved(activeFile.id)
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = newCursorPos
      })
      return
    }

    // Tab : Indent (multi-line support)
    if (e.key === 'Tab') {
      e.preventDefault()
      const tabStr = ' '.repeat(settings.tabSize || 2)
      const content = value

      if (e.shiftKey) {
        // Shift+Tab: Outdent selected lines
        const lineStartIdx = content.lastIndexOf('\n', start - 1) + 1
        let lineEndIdx = start !== end ? content.indexOf('\n', end - 1) : start
        if (lineEndIdx === -1) lineEndIdx = content.length
        // Extend to include the full last line
        const selEnd = start !== end ? end : start
        const lastLineStart = content.lastIndexOf('\n', selEnd - 1) + 1
        const lastLineEnd = content.indexOf('\n', selEnd)
        const effectiveEnd = lastLineEnd === -1 ? content.length : lastLineEnd

        // Get all lines in selection
        const selectedText = content.substring(lineStartIdx, effectiveEnd)
        const linesArr = selectedText.split('\n')
        let removedTotal = 0
        const newLines = linesArr.map(line => {
          const tabSize = settings.tabSize || 2
          if (line.startsWith('  ')) {
            removedTotal += tabSize
            return line.substring(tabSize)
          } else if (line.startsWith('\t')) {
            removedTotal += 1
            return line.substring(1)
          } else if (line.startsWith(' ')) {
            const spaces = line.match(/^( +)/)?.[1].length || 0
            const toRemove = Math.min(spaces, tabSize)
            removedTotal += toRemove
            return line.substring(toRemove)
          }
          return line
        })
        const newContent = content.substring(0, lineStartIdx) + newLines.join('\n') + content.substring(effectiveEnd)
        updateFileContent(activeFile.id, newContent)
        markFileUnsaved(activeFile.id)
        requestAnimationFrame(() => {
          textarea.selectionStart = Math.max(lineStartIdx, start - (start > lineStartIdx ? Math.min(settings.tabSize || 2, start - lineStartIdx) : 0))
          textarea.selectionEnd = end - removedTotal
        })
      } else {
        // Tab: Indent selected lines (or insert tab if no multi-line selection)
        if (start !== end) {
          // Multi-line selection: indent all lines
          const lineStartIdx = content.lastIndexOf('\n', start - 1) + 1
          const selEnd = end
          const lastLineEnd = content.indexOf('\n', selEnd - 1)
          const effectiveEnd = lastLineEnd === -1 ? content.length : lastLineEnd

          const selectedText = content.substring(lineStartIdx, effectiveEnd)
          const linesArr = selectedText.split('\n')
          const indentStr = tabStr
          const newLines = linesArr.map(line => indentStr + line)
          const addedTotal = newLines.join('\n').length - selectedText.length
          const newContent = content.substring(0, lineStartIdx) + newLines.join('\n') + content.substring(effectiveEnd)
          updateFileContent(activeFile.id, newContent)
          markFileUnsaved(activeFile.id)
          requestAnimationFrame(() => {
            textarea.selectionStart = start + indentStr.length
            textarea.selectionEnd = end + addedTotal
          })
        } else {
          // Single line: insert tab
          const newValue = content.substring(0, start) + tabStr + content.substring(end)
          updateFileContent(activeFile.id, newValue)
          markFileUnsaved(activeFile.id)
          requestAnimationFrame(() => {
            textarea.selectionStart = textarea.selectionEnd = start + tabStr.length
          })
        }
      }
      return
    }

    // Auto-close brackets and quotes
    if (e.key === '(' || e.key === '{' || e.key === '[') {
      e.preventDefault()
      const openChar = e.key
      const closeChar = BRACKET_PAIRS[openChar]
      const selectedText = value.substring(start, end)
      const newValue = value.substring(0, start) + openChar + selectedText + closeChar + value.substring(end)
      updateFileContent(activeFile.id, newValue)
      markFileUnsaved(activeFile.id)
      // Place cursor between the brackets
      requestAnimationFrame(() => {
        textarea.selectionStart = start + 1
        textarea.selectionEnd = start + 1 + selectedText.length
      })
      return
    }

    if (e.key === ')' || e.key === '}' || e.key === ']') {
      // If the next char is the matching close bracket, just move cursor past it
      const nextChar = value[end]
      if (nextChar === e.key) {
        e.preventDefault()
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = end + 1
        })
        return
      }
      // Otherwise, let the default behavior insert the character
      return
    }

    if (e.key === '"' || e.key === "'" || e.key === '`') {
      const quote = e.key
      const nextChar = value[end]
      const prevChar = start > 0 ? value[start - 1] : ''
      
      // If next char is the same quote, just skip over it
      if (nextChar === quote) {
        e.preventDefault()
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = end + 1
        })
        return
      }

      // Check if we're in a context where we should auto-close (not inside a string/word)
      const isAlphanumeric = (c: string) => /[a-zA-Z0-9_]/.test(c)
      if (isAlphanumeric(prevChar) || isAlphanumeric(nextChar)) {
        // Don't auto-close, just insert the quote character normally
        return
      }

      // Auto-close the quote
      e.preventDefault()
      const selectedText = value.substring(start, end)
      const newValue = value.substring(0, start) + quote + selectedText + quote + value.substring(end)
      updateFileContent(activeFile.id, newValue)
      markFileUnsaved(activeFile.id)
      requestAnimationFrame(() => {
        textarea.selectionStart = start + 1
        textarea.selectionEnd = start + 1 + selectedText.length
      })
      return
    }

    // Backspace: if deleting a bracket and the next char is the matching close, delete both
    if (e.key === 'Backspace') {
      if (start === end && start > 0) {
        const prevChar = value[start - 1]
        const nextChar = value[start]
        if (
          (prevChar === '(' && nextChar === ')') ||
          (prevChar === '{' && nextChar === '}') ||
          (prevChar === '[' && nextChar === ']') ||
          (prevChar === nextChar && QUOTE_CHARS.has(prevChar))
        ) {
          e.preventDefault()
          const newValue = value.substring(0, start - 1) + value.substring(start + 1)
          updateFileContent(activeFile.id, newValue)
          markFileUnsaved(activeFile.id)
          requestAnimationFrame(() => {
            textarea.selectionStart = textarea.selectionEnd = start - 1
          })
          return
        }
      }
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      const content = value

      // Find the start of the current line
      const lineStartIdx = content.lastIndexOf('\n', start - 1) + 1
      const currentLine = content.substring(lineStartIdx, start)

      // Match the current line's indentation
      const indentMatch = currentLine.match(/^(\s*)/)
      const indent = indentMatch ? indentMatch[1] : ''

      // Add extra indent after opening braces, parens, brackets
      const trimmedLine = currentLine.trimEnd()
      const lastChar = trimmedLine.slice(-1)
      let extraIndent = ''
      let insertAfter = ''
      
      if (['{', '(', '['].includes(lastChar)) {
        const closeChar = BRACKET_PAIRS[lastChar as keyof typeof BRACKET_PAIRS]
        // Check if the character after cursor is the matching close bracket
        const nextChar = content[start]
        if (nextChar === closeChar) {
          // Insert newline with indent, and another newline with current indent before close
          extraIndent = '  '
          insertAfter = '\n' + indent
        } else {
          extraIndent = '  '
        }
      }

      const newIndent = indent + extraIndent
      let newValue: string
      let newCursorPos: number

      if (insertAfter) {
        // Enter inside {} or () or [] with closing bracket after cursor
        newValue = content.substring(0, start) + '\n' + newIndent + insertAfter + content.substring(start)
        newCursorPos = start + 1 + newIndent.length
      } else {
        newValue = content.substring(0, start) + '\n' + newIndent + content.substring(end)
        newCursorPos = start + 1 + newIndent.length
      }

      updateFileContent(activeFile.id, newValue)
      markFileUnsaved(activeFile.id)

      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = newCursorPos
      })
    }
  }, [activeFile, updateFileContent, markFileUnsaved, settings])

  // Keyboard shortcut: Ctrl+S to save, F5 to run build, Ctrl+Enter to run current file
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
      // Ctrl+Enter to run current file
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleRunFile()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSave, handleRun, handleRunFile])

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

  // Track cursor position from textarea selection + bracket matching
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

      // Update bracket matching highlights
      const highlights = getBracketHighlightPositions(content, pos)
      setBracketHighlights(highlights)
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [setCursorPosition])

  // Scroll to keep cursor visible when cursor line changes
  useEffect(() => {
    if (!codeAreaRef.current) return

    const container = codeAreaRef.current
    const fontSize = settings.fontSize || 13
    const lineHeight = fontSize * 1.6
    const paddingTop = 12
    const cursorY = paddingTop + (cursorLine - 1) * lineHeight

    if (cursorY < container.scrollTop + paddingTop) {
      container.scrollTop = cursorY - paddingTop
    } else if (cursorY > container.scrollTop + container.clientHeight - lineHeight - paddingTop) {
      container.scrollTop = cursorY - container.clientHeight + lineHeight + paddingTop
    }

    // Set textarea cursor position when navigating from find/replace or go-to-line
    if (textareaRef.current && document.activeElement !== textareaRef.current) {
      const content = textareaRef.current.value
      const contentLines = content.split('\n')
      let pos = 0
      for (let i = 0; i < Math.min(cursorLine - 1, contentLines.length); i++) {
        pos += contentLines[i].length + 1
      }
      pos += Math.min(cursorColumn - 1, contentLines[cursorLine - 1]?.length || 0)
      textareaRef.current.selectionStart = textareaRef.current.selectionEnd = pos
      textareaRef.current.focus()
    }
  }, [cursorLine, cursorColumn, settings.fontSize])

  // When active file changes, reset cursor position
  useEffect(() => {
    if (activeFile) {
      setCursorPosition(1, 1)
      setBracketHighlights(null)
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

  // Build a set of lines that have matches for highlighting
  const matchedLines = useMemo(() => {
    const lineSet = new Map<number, { isCurrent: boolean; matchCount: number }>()
    findMatches.forEach((match, idx) => {
      const existing = lineSet.get(match.line)
      if (existing) {
        existing.matchCount++
        if (idx === currentMatchIndex) existing.isCurrent = true
      } else {
        lineSet.set(match.line, { isCurrent: idx === currentMatchIndex, matchCount: 1 })
      }
    })
    return lineSet
  }, [findMatches, currentMatchIndex])

  // Compute bracket highlight positions for the rendered lines
  // Convert absolute positions to line + column
  const bracketHighlightLines = useMemo(() => {
    if (!bracketHighlights || !activeFile?.content) return null
    const content = activeFile.content
    
    // Get line and column for open bracket
    const textBeforeOpen = content.substring(0, bracketHighlights.openPos)
    const openLine = textBeforeOpen.split('\n').length
    const openCol = textBeforeOpen.split('\n').pop()?.length ?? 0
    
    // Get line and column for close bracket
    const textBeforeClose = content.substring(0, bracketHighlights.closePos)
    const closeLine = textBeforeClose.split('\n').length
    const closeCol = textBeforeClose.split('\n').pop()?.length ?? 0

    return { openLine, openCol, closeLine, closeCol }
  }, [bracketHighlights, activeFile?.content])

  const fontSize = settings.fontSize || 13
  const wordWrap = settings.wordWrap ?? false

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

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn(
                    'size-6 hover:bg-emerald-500/10',
                    isRunning ? 'text-amber-400' : 'text-emerald-600 hover:text-emerald-400',
                  )}
                  onClick={handleRunFile}
                  disabled={isRunning}
                >
                  {isRunning ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Run Current File (Ctrl+Enter)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="h-4 w-px bg-border/50" />

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn(
                    'size-6 transition-colors',
                    wordWrap ? 'text-amber-400 bg-amber-500/10' : 'text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => updateSettings({ wordWrap: !wordWrap })}
                >
                  <WrapText className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">{wordWrap ? 'Word Wrap: On' : 'Word Wrap: Off'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex-1" />

          <span className="text-[10px] text-muted-foreground">
            {detectedLanguage.charAt(0).toUpperCase() + detectedLanguage.slice(1)}
          </span>
          <span className="text-[10px] text-muted-foreground/50 mx-1">·</span>
          <span className="text-[10px] text-muted-foreground/60 tabular-nums">{fontSize}px</span>
        </div>
      )}

      {/* Breadcrumb showing full file path - clickable folders */}
      {activeFile && (
        <div className="flex items-center h-6 px-3 bg-muted/10 border-b text-[10px] text-muted-foreground/60 shrink-0 gap-0.5 overflow-hidden">
          {activeFile.path.split('/').map((segment, i, arr) => (
            <span key={i} className="flex items-center gap-0.5 shrink-0">
              {i > 0 && <ChevronRight className="size-2.5 breadcrumb-separator" />}
              <button
                className={cn(
                  'transition-colors rounded px-0.5',
                  i === arr.length - 1
                    ? 'text-emerald-500/80 font-medium cursor-default'
                    : 'hover:text-foreground/70 hover:bg-muted/50 cursor-pointer',
                )}
                onClick={() => {
                  if (i === arr.length - 1) return
                  // Navigate to folder in sidebar
                  const folderPath = activeFile.path.split('/').slice(0, i + 1).join('/')
                  // Use a custom event to communicate with sidebar
                  window.dispatchEvent(new CustomEvent('navigate-to-folder', { detail: { path: folderPath } }))
                }}
                title={i < arr.length - 1 ? `Navigate to ${segment}` : undefined}
              >
                {segment}
              </button>
            </span>
          ))}
          {/* Copy Path button */}
          <button
            className="ml-auto shrink-0 p-0.5 rounded hover:bg-muted/50 hover:text-foreground/70 transition-colors"
            onClick={() => {
              navigator.clipboard.writeText(activeFile.path).then(() => {
                toast.success('Path copied to clipboard')
              }).catch(() => {
                toast.error('Failed to copy path')
              })
            }}
            title="Copy file path"
          >
            <Copy className="size-3" />
          </button>
        </div>
      )}

      {/* File tabs with drag & drop and context menu — always visible when files are open */}
      {openFiles.length > 0 && (
        <div className="flex items-center h-9 bg-muted/20 border-b shrink-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {openFiles.map((file) => (
            <FileTab
              key={file.id}
              file={file}
              isActive={file.id === activeFileId}
              isUnsaved={unsavedFileIds.has(file.id)}
              onClose={(e) => handleCloseFile(file.id, e)}
              onClick={() => handleFileClick(file.id)}
              onContextMenu={(e, f) => {
                e.preventDefault()
                setTabContextMenu({ fileId: f.id, x: e.clientX, y: e.clientY })
              }}
              onDragStart={() => setDraggedTabId(file.id)}
              onDragOver={(e) => {
                e.preventDefault()
                if (draggedTabId && draggedTabId !== file.id) {
                  const arr = [...openFileIds]
                  const fromIdx = arr.indexOf(draggedTabId)
                  const toIdx = arr.indexOf(file.id)
                  if (fromIdx >= 0 && toIdx >= 0) {
                    arr.splice(fromIdx, 1)
                    arr.splice(toIdx, 0, draggedTabId)
                  }
                  reorderOpenFiles(arr)
                }
              }}
              onDrop={() => setDraggedTabId(null)}
              onRename={(f) => {
                setRenameTabId(f.id)
                setRenameValue(f.path.split('/').pop() || '')
              }}
            />
          ))}
        </div>
      )}

      {/* Tab context menu */}
      {tabContextMenu && (
        <div
          className="fixed z-50 bg-popover border rounded-md shadow-lg py-1 text-xs min-w-[160px]"
          style={{ left: tabContextMenu.x, top: tabContextMenu.y }}
          onClick={() => setTabContextMenu(null)}
        >
          <button
            className="w-full px-3 py-1.5 text-left hover:bg-muted/50 transition-colors"
            onClick={() => {
              handleCloseFile(tabContextMenu.fileId, { stopPropagation: () => {} } as React.MouseEvent)
              setTabContextMenu(null)
            }}
          >
            Close
          </button>
          <button
            className="w-full px-3 py-1.5 text-left hover:bg-muted/50 transition-colors"
            onClick={() => {
              const others = openFileIds.filter((id) => id !== tabContextMenu.fileId)
              reorderOpenFiles(others)
              if (activeFileId === tabContextMenu.fileId) {
                setActiveFileId(others.length > 0 ? others[others.length - 1] : null)
              }
              setTabContextMenu(null)
            }}
          >
            Close Others
          </button>
          <button
            className="w-full px-3 py-1.5 text-left hover:bg-muted/50 transition-colors"
            onClick={() => {
              reorderOpenFiles([])
              setActiveFileId(null)
              setTabContextMenu(null)
            }}
          >
            Close All
          </button>
          <Separator />
          <button
            className="w-full px-3 py-1.5 text-left hover:bg-muted/50 transition-colors"
            onClick={async () => {
              const file = files.find((f) => f.id === tabContextMenu.fileId)
              if (file) {
                await navigator.clipboard.writeText(file.path)
                toast.success('Path copied')
              }
              setTabContextMenu(null)
            }}
          >
            Copy Path
          </button>
        </div>
      )}

      {/* Rename tab dialog */}
      {renameTabId && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50">
          <input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && renameValue.trim()) {
                const file = files.find((f) => f.id === renameTabId)
                if (file) {
                  const newPath = file.path.split('/').slice(0, -1).concat(renameValue.trim()).join('/')
                  try {
                    const res = await fetch(`/api/vfs`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        projectId: file.projectId,
                        path: newPath,
                        content: file.content,
                        language: file.language,
                        isDirectory: false,
                      }),
                    })
                    if (res.ok) {
                      await fetch(`/api/files/${file.id}`, { method: 'DELETE' })
                      toast.success('File renamed')
                    }
                  } catch {
                    toast.error('Failed to rename')
                  }
                }
                setRenameTabId(null)
              } else if (e.key === 'Escape') {
                setRenameTabId(null)
              }
            }}
            autoFocus
            className="h-7 rounded border px-2 text-xs bg-card shadow-lg outline-none focus:ring-1 focus:ring-emerald-500/50"
          />
        </div>
      )}

      {/* Find & Replace Bar */}
      <FindReplaceBar />

      {/* Code editor area */}
      {fileLoading ? (
        <div className="flex-1 flex items-center justify-center bg-zinc-900 dark:bg-zinc-950">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-6 text-emerald-500 animate-spin" />
            <p className="text-xs text-muted-foreground/60">Loading file...</p>
          </div>
        </div>
      ) : activeFile ? (
        <div className="flex-1 flex overflow-hidden relative">
          <GoToLineDialog />
          <div
            ref={codeAreaRef}
            className="flex-1 overflow-auto bg-zinc-900 dark:bg-zinc-950 custom-scrollbar code-area-gradient"
            onScroll={handleScroll}
          >
            <div className={cn(wordWrap ? '' : 'flex min-w-fit')}>
              {/* Line numbers */}
              <div className="select-none text-right pr-4 pl-4 pt-3 text-zinc-600 shrink-0 sticky left-0 bg-zinc-900 dark:bg-zinc-950 z-10" style={{ fontSize: `${fontSize}px`, lineHeight: '1.6', fontFamily: 'monospace' }}>
                {lines.map((_, i) => (
                  <div key={i} className={cn(i + 1 === cursorLine && 'text-emerald-500/70')}>{i + 1}</div>
                ))}
              </div>
              {/* Code content with textarea overlay for editing */}
              <div className="relative min-w-0 flex-1">
                {/* Syntax highlighted display layer - pointer-events-none so clicks go to textarea */}
                <pre
                  className={cn(
                    'pt-3 pr-4 pl-4 text-zinc-300 pointer-events-none',
                    wordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre',
                  )}
                  style={{ fontSize: `${fontSize}px`, lineHeight: '1.6', fontFamily: 'monospace' }}
                >
                  {lines.map((line, i) => {
                    const lineNum = i + 1
                    const matchInfo = matchedLines.get(lineNum)
                    const hasMatch = !!matchInfo
                    const isCurrentMatch = matchInfo?.isCurrent === true
                    
                    // Check if this line has a bracket highlight
                    const hasOpenBracket = bracketHighlightLines?.openLine === lineNum
                    const hasCloseBracket = bracketHighlightLines?.closeLine === lineNum

                    return (
                      <div key={i} className={cn(
                        'px-2 -mx-2 relative',
                        i + 1 === cursorLine && 'current-line-gradient',
                        isCurrentMatch && 'bg-amber-500/25',
                        hasMatch && !isCurrentMatch && 'bg-amber-500/10',
                      )}>
                        <code dangerouslySetInnerHTML={{ __html: highlightCode(line, detectedLanguage) }} />
                        {/* Bracket highlight overlays */}
                        {hasOpenBracket && (
                          <span
                            className="absolute top-0 bg-amber-500/30 rounded-sm pointer-events-none"
                            style={{
                              left: `calc(1rem + ${(bracketHighlightLines?.openCol ?? 0) * (fontSize * 0.6)}px)`,
                              width: `${fontSize * 0.6}px`,
                              height: `${fontSize * 1.6}px`,
                            }}
                          />
                        )}
                        {hasCloseBracket && (
                          <span
                            className="absolute top-0 bg-amber-500/30 rounded-sm pointer-events-none"
                            style={{
                              left: `calc(1rem + ${(bracketHighlightLines?.closeCol ?? 0) * (fontSize * 0.6)}px)`,
                              width: `${fontSize * 0.6}px`,
                              height: `${fontSize * 1.6}px`,
                            }}
                          />
                        )}
                      </div>
                    )
                  })}
                </pre>
                {/* Editable textarea overlay - transparent text, visible caret */}
                <textarea
                  key={activeFileId}
                  ref={textareaRef}
                  className={cn(
                    'absolute inset-0 w-full h-full bg-transparent text-transparent resize-none border-0 outline-0 overflow-hidden',
                    wordWrap ? '' : 'overflow-x-auto',
                  )}
                  style={{
                    caretColor: '#d4d4d8',
                    tabSize: settings.tabSize || 2,
                    fontSize: `${fontSize}px`,
                    lineHeight: '1.6',
                    fontFamily: 'monospace',
                    ...(wordWrap ? { whiteSpace: 'pre-wrap', wordBreak: 'break-all' } : { whiteSpace: 'pre' }),
                  }}
                  value={activeFile.content}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  spellCheck={false}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  wrap={wordWrap ? 'soft' : 'off'}
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
          <span className="mx-2 text-border">|</span>
          <span className="tabular-nums">{fontSize}px</span>
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
