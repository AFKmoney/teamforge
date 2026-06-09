'use client'

import { useEffect, useCallback, useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Search, Rocket, Bot, MessageSquare, FileCode2, Terminal,
  Keyboard, Settings2, Lightbulb, ChevronRight, Zap, Shield,
  Sparkles, Eye, GitCommitHorizontal, Wrench, ArrowRight,
  Play, Pause, Square, CircleDot, Hash, FolderOpen, Save,
  Import, FolderOutput, FileSearch, Layout, Monitor, Palette,
  Key, Globe, Cpu, AlertTriangle, Info, CheckCircle2,
  TerminalSquare, Bug, RefreshCw, Gauge, BookOpen
} from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ── Catppuccin Mocha Accents ──────────────────────────────────────
const C = {
  emerald: '#a6e3a1',
  mauve: '#cba6f7',
  sky: '#89dceb',
  peach: '#fab387',
  teal: '#94e2d5',
  rosewater: '#f5e0dc',
  flamingo: '#f2cdcd',
  pink: '#f5c2e7',
  red: '#f38ba8',
  maroon: '#eba0ac',
  yellow: '#f9e2af',
  green: '#a6e3a1',
  blue: '#89b4fa',
  lavender: '#b4befe',
}

// ── Shortcut Data (reuse from keyboard-shortcuts-overlay) ─────────
interface Shortcut { keys: string[]; action: string }
interface ShortcutCategory { title: string; shortcuts: Shortcut[] }

const shortcutCategories: ShortcutCategory[] = [
  {
    title: 'Build & Run',
    shortcuts: [
      { keys: ['Ctrl', 'Shift', 'B'], action: 'Build' },
      { keys: ['Ctrl', 'Shift', 'T'], action: 'Test' },
      { keys: ['Ctrl', 'Shift', 'L'], action: 'Lint' },
      { keys: ['Ctrl', 'Shift', 'D'], action: 'Deploy' },
    ],
  },
  {
    title: 'General',
    shortcuts: [
      { keys: ['Ctrl', 'Shift', 'P'], action: 'Command Palette' },
      { keys: ['Ctrl', 'Shift', '/'], action: 'Keyboard Shortcuts' },
      { keys: ['F1'], action: 'Keyboard Shortcuts' },
      { keys: ['Ctrl', ','], action: 'Settings' },
      { keys: ['Ctrl', 'Shift', 'H'], action: 'Instruction Manual' },
    ],
  },
  {
    title: 'File',
    shortcuts: [
      { keys: ['Ctrl', 'S'], action: 'Save File' },
      { keys: ['Ctrl', 'Shift', 'S'], action: 'Save All Files' },
      { keys: ['Ctrl', 'P'], action: 'Quick File Open' },
      { keys: ['Ctrl', 'N'], action: 'New File' },
    ],
  },
  {
    title: 'Terminal & Panels',
    shortcuts: [
      { keys: ['Ctrl', 'J'], action: 'Toggle Terminal' },
      { keys: ['Ctrl', 'B'], action: 'Toggle Sidebar' },
    ],
  },
  {
    title: 'Search',
    shortcuts: [
      { keys: ['Ctrl', 'F'], action: 'Find' },
      { keys: ['Ctrl', 'H'], action: 'Find & Replace' },
      { keys: ['Ctrl', 'G'], action: 'Go to Line' },
      { keys: ['Ctrl', 'Shift', 'F'], action: 'Global Search' },
    ],
  },
  {
    title: 'Editor',
    shortcuts: [
      { keys: ['Ctrl', '/'], action: 'Toggle Comment' },
      { keys: ['Tab'], action: 'Indent Selection' },
      { keys: ['Shift', 'Tab'], action: 'Outdent Selection' },
      { keys: ['Alt', '↑'], action: 'Move Line Up' },
      { keys: ['Alt', '↓'], action: 'Move Line Down' },
      { keys: ['Ctrl', 'Enter'], action: 'Run Current File' },
      { keys: ['Ctrl', '+'], action: 'Increase Font Size' },
      { keys: ['Ctrl', '-'], action: 'Decrease Font Size' },
    ],
  },
]

// ── Agent Data ────────────────────────────────────────────────────
const agents = [
  { name: 'Nova', role: 'Project Manager', emoji: '🛡️', color: C.mauve, desc: 'Orchestrates the team, breaks down requirements into tasks, sets priorities, and tracks progress across all agents.' },
  { name: 'Codey', role: 'Developer', emoji: '⚡', color: C.emerald, desc: 'Writes and modifies code, implements features, fixes bugs, and handles all code generation tasks.' },
  { name: 'Atlas', role: 'Architect', emoji: '🏗️', color: C.sky, desc: 'Designs system architecture, makes technical decisions, plans module structure, and ensures design consistency.' },
  { name: 'Blaze', role: 'DevOps', emoji: '🚀', color: C.peach, desc: 'Handles builds, deployments, CI/CD pipelines, environment configuration, and infrastructure automation.' },
  { name: 'Prism', role: 'Reviewer', emoji: '🔍', color: C.teal, desc: 'Reviews code for quality, security, and best practices. Provides detailed feedback and suggests improvements.' },
  { name: 'Flux', role: 'Tester', emoji: '🧪', color: C.pink, desc: 'Writes and runs tests, validates functionality, performs integration testing, and ensures code reliability.' },
]

// ── Slash Commands ────────────────────────────────────────────────
const slashCommands = [
  { cmd: '/fix', icon: Bug, color: C.red, desc: 'AI analyzes and fixes bugs, anti-patterns, null/undefined access, missing error handling, and security vulnerabilities in the active or specified file.' },
  { cmd: '/refactor', icon: RefreshCw, color: C.teal, desc: 'AI refactors the file for better code quality — improved naming, DRY principles, SOLID adherence, error handling, and TypeScript typing.' },
  { cmd: '/optimize', icon: Gauge, color: C.yellow, desc: 'AI optimizes the file for performance — reduces re-renders, adds memoization, improves bundle size, data structures, and query optimization.' },
  { cmd: '/search', icon: FileSearch, color: C.sky, desc: 'Searches all project files for the given query with relevance scoring. Returns top results with matched line previews.' },
  { cmd: '/commit', icon: GitCommitHorizontal, color: C.peach, desc: 'Generates a conventional commit message based on recent file changes, completed tasks, and git status. Includes branch info.' },
  { cmd: '/run', icon: TerminalSquare, color: C.green, desc: 'Executes a whitelisted shell command (bun, npm, npx, node, python3, git, prisma, etc.) and returns real-time output.' },
  { cmd: '/edit', icon: Wrench, color: C.mauve, desc: 'AI-assisted file editing — provide a file path and instruction, and the AI will modify the file according to your instructions.' },
  { cmd: '/explain', icon: BookOpen, color: C.blue, desc: 'AI explains the contents of a file in detail — architecture, logic flow, key functions, and potential issues.' },
  { cmd: '/status', icon: Eye, color: C.lavender, desc: 'Shows current project status — active agents, task progress, recent build results, and system health overview.' },
  { cmd: '/create_file', icon: FileCode2, color: C.emerald, desc: 'Creates a new file in the project. Provide the file path and initial content. Auto-detects language from extension.' },
]

// ── Section Definitions ───────────────────────────────────────────
interface Section {
  id: string
  title: string
  icon: React.ReactNode
}

const sections: Section[] = [
  { id: 'getting-started', title: 'Getting Started', icon: <Rocket className="size-3.5" /> },
  { id: 'agent-system', title: 'Agent System', icon: <Bot className="size-3.5" /> },
  { id: 'ai-chat', title: 'AI Chat', icon: <MessageSquare className="size-3.5" /> },
  { id: 'file-management', title: 'File Management', icon: <FileCode2 className="size-3.5" /> },
  { id: 'terminal-build', title: 'Terminal & Build', icon: <Terminal className="size-3.5" /> },
  { id: 'keyboard-shortcuts', title: 'Keyboard Shortcuts', icon: <Keyboard className="size-3.5" /> },
  { id: 'settings', title: 'Settings & Config', icon: <Settings2 className="size-3.5" /> },
  { id: 'tips-tricks', title: 'Tips & Tricks', icon: <Lightbulb className="size-3.5" /> },
]

// ── Sub-components ────────────────────────────────────────────────
function KbdKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded border border-border/60 bg-muted/80 shadow-[0_1px_0_1px_rgba(0,0,0,0.15),inset_0_1px_0_0_rgba(255,255,255,0.06)] font-mono text-[10px] font-medium text-foreground/80 select-none">
      {children}
    </kbd>
  )
}

function KeyCombo({ keys }: { keys: string[] }) {
  return (
    <div className="flex items-center gap-0.5">
      {keys.map((key, i) => (
        <span key={i} className="flex items-center gap-0.5">
          <KbdKey>{key}</KbdKey>
          {i < keys.length - 1 && <span className="text-muted-foreground/40 text-[9px]">+</span>}
        </span>
      ))}
    </div>
  )
}

function SectionHeader({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <h3 id={id} className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider mb-3 scroll-mt-4" style={{ color: C.emerald }}>
      {children}
      <div className="flex-1 h-px bg-border/30" />
    </h3>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h4 className="text-[13px] font-semibold text-foreground/90 mb-1.5">{title}</h4>
      <div className="text-[13px] leading-relaxed text-muted-foreground">{children}</div>
    </div>
  )
}

function Callout({ type, children }: { type: 'tip' | 'warning' | 'info'; children: React.ReactNode }) {
  const config = {
    tip: { border: C.emerald, bg: 'rgba(166,227,161,0.06)', icon: <Lightbulb className="size-3.5 shrink-0 mt-0.5" style={{ color: C.emerald }} /> },
    warning: { border: C.peach, bg: 'rgba(250,179,135,0.06)', icon: <AlertTriangle className="size-3.5 shrink-0 mt-0.5" style={{ color: C.peach }} /> },
    info: { border: C.mauve, bg: 'rgba(203,166,247,0.06)', icon: <Info className="size-3.5 shrink-0 mt-0.5" style={{ color: C.mauve }} /> },
  }
  const c = config[type]
  return (
    <div className="flex gap-2.5 p-3 rounded-md text-[13px] leading-relaxed" style={{ borderLeft: `3px solid ${c.border}`, backgroundColor: c.bg }}>
      {c.icon}
      <div className="text-muted-foreground">{children}</div>
    </div>
  )
}

function CodeInline({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded bg-muted/80 border border-border/30 text-[12px] font-mono text-foreground/90">
      {children}
    </code>
  )
}

function AgentPill({ agent }: { agent: typeof agents[number] }) {
  return (
    <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border/30 bg-muted/20 hover:bg-muted/30 transition-colors">
      <span className="text-base leading-none mt-0.5">{agent.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[13px] font-semibold text-foreground">{agent.name}</span>
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: `${agent.color}15`, color: agent.color, border: `1px solid ${agent.color}30` }}
          >
            {agent.role}
          </span>
        </div>
        <p className="text-[12px] text-muted-foreground leading-relaxed">{agent.desc}</p>
      </div>
    </div>
  )
}

function SlashCmdRow({ cmd }: { cmd: typeof slashCommands[number] }) {
  const Icon = cmd.icon
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <div className="flex items-center justify-center size-6 rounded shrink-0 mt-0.5" style={{ backgroundColor: `${cmd.color}15` }}>
        <Icon className="size-3" style={{ color: cmd.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <code className="text-[12px] font-mono font-semibold text-foreground" style={{ color: cmd.color }}>{cmd.cmd}</code>
        </div>
        <p className="text-[12px] text-muted-foreground leading-relaxed">{cmd.desc}</p>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────
export function InstructionManual() {
  const [open, setOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('getting-started')
  const [searchQuery, setSearchQuery] = useState('')
  const contentRef = useRef<HTMLDivElement>(null)

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault()
        setOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  // Custom event listener
  useEffect(() => {
    const handler = () => setOpen((prev) => !prev)
    window.addEventListener('teamforge-toggle-manual', handler)
    return () => window.removeEventListener('teamforge-toggle-manual', handler)
  }, [])

  const handleClose = useCallback(() => setOpen(false), [])

  // Filter sections by search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections
    const q = searchQuery.toLowerCase()
    return sections.filter((s) => s.title.toLowerCase().includes(q))
  }, [searchQuery])

  // Scroll to section
  const scrollToSection = useCallback((id: string) => {
    setActiveSection(id)
    const el = document.getElementById(`manual-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  // Track active section on scroll
  useEffect(() => {
    if (!open) return
    const container = contentRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id.replace('manual-', '')
            setActiveSection(id)
          }
        }
      },
      { root: container, rootMargin: '-10% 0px -80% 0px', threshold: 0 }
    )

    // Observe all section headers
    sections.forEach((s) => {
      const el = document.getElementById(`manual-${s.id}`)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-lg"
            onClick={handleClose}
          />

          {/* Overlay panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed inset-4 z-50 flex overflow-hidden rounded-xl border border-border/40 bg-card/95 backdrop-blur-xl shadow-2xl shadow-black/50 sm:inset-6 md:inset-10"
          >
            {/* ── Left Sidebar ── */}
            <div className="hidden sm:flex flex-col w-56 shrink-0 border-r border-border/30 bg-muted/10">
              {/* Sidebar Header */}
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/30">
                <div className="flex items-center justify-center size-7 rounded-lg" style={{ backgroundColor: `${C.emerald}15` }}>
                  <BookOpen className="size-3.5" style={{ color: C.emerald }} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[13px] font-semibold text-foreground truncate">TeamForge Manual</h2>
                  <p className="text-[10px] text-muted-foreground truncate">v1.0.0</p>
                </div>
              </div>

              {/* Search */}
              <div className="px-3 py-2 border-b border-border/20">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/60" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search sections..."
                    className="w-full h-7 pl-7 pr-2 rounded-md bg-muted/50 border border-border/30 text-[12px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-colors"
                  />
                </div>
              </div>

              {/* Nav Items */}
              <ScrollArea className="flex-1">
                <nav className="py-2 px-2 space-y-0.5">
                  {filteredSections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={cn(
                        'flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-[12px] text-left transition-all duration-150',
                        activeSection === section.id
                          ? 'bg-emerald-500/10 text-foreground font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )}
                      style={activeSection === section.id ? { borderLeft: `2px solid ${C.emerald}` } : { borderLeft: '2px solid transparent' }}
                    >
                      <span style={{ color: activeSection === section.id ? C.emerald : undefined }}>{section.icon}</span>
                      <span className="truncate">{section.title}</span>
                    </button>
                  ))}
                </nav>
              </ScrollArea>

              {/* Sidebar Footer */}
              <div className="px-3 py-2 border-t border-border/20 text-[10px] text-muted-foreground/50 space-y-1">
                <div className="flex items-center gap-1">
                  <KeyCombo keys={['Ctrl', 'Shift', 'H']} />
                  <span className="ml-1">Toggle</span>
                </div>
                <div className="flex items-center gap-1">
                  <KeyCombo keys={['Esc']} />
                  <span className="ml-1">Close</span>
                </div>
              </div>
            </div>

            {/* ── Right Content Area ── */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Header */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border/30 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-8 rounded-lg sm:hidden" style={{ backgroundColor: `${C.emerald}15` }}>
                    <BookOpen className="size-4" style={{ color: C.emerald }} />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Instruction Manual</h2>
                    <p className="text-[11px] text-muted-foreground">Complete guide to TeamForge IDE — everything you need to know</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="flex items-center justify-center size-7 rounded-md border border-border/50 bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Close manual"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              {/* Mobile search (visible on small screens) */}
              <div className="sm:hidden px-4 py-2 border-b border-border/20">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/60" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search sections..."
                    className="w-full h-7 pl-7 pr-2 rounded-md bg-muted/50 border border-border/30 text-[12px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 transition-colors"
                  />
                </div>
              </div>

              {/* Content */}
              <ScrollArea className="flex-1" ref={contentRef}>
                <div className="px-4 sm:px-6 py-4 sm:py-5 max-w-3xl">

                  {/* ════════════════ 1. GETTING STARTED ════════════════ */}
                  <div id="manual-getting-started" className="mb-8 scroll-mt-4">
                    <SectionHeader id="manual-getting-started">
                      <Rocket className="size-3.5" />
                      Getting Started
                    </SectionHeader>

                    <SubSection title="Create or Open a Project">
                      <p className="mb-2">TeamForge IDE starts by creating or opening a project. A project is the container for all your files, agents, tasks, and chat sessions.</p>
                      <ul className="space-y-1 list-none">
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span>On first launch, a default project is created automatically. You can view it in the sidebar.</span></li>
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span>Use <CodeInline>Ctrl+N</CodeInline> to create new files within the project, or the <CodeInline>+ New File</CodeInline> button in the sidebar.</span></li>
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span>Import existing projects via the <CodeInline>Actions ▸ Import Project</CodeInline> menu in the top bar. Supports ZIP archives.</span></li>
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span>Export your project for backup using <CodeInline>Actions ▸ Export Project</CodeInline>. Downloads a ZIP of all project files.</span></li>
                      </ul>
                    </SubSection>

                    <SubSection title="Understanding the Layout">
                      <p className="mb-2">The IDE has four main areas:</p>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2.5 p-2 rounded-md bg-muted/20 border border-border/20">
                          <Layout className="size-4 shrink-0 mt-0.5" style={{ color: C.mauve }} />
                          <div><span className="text-[13px] font-medium text-foreground">Sidebar</span><span className="text-muted-foreground"> — File tree, agent list, and activity feed. Toggle with <CodeInline>Ctrl+B</CodeInline>. Shows language stats at the bottom.</span></div>
                        </div>
                        <div className="flex items-start gap-2.5 p-2 rounded-md bg-muted/20 border border-border/20">
                          <FileCode2 className="size-4 shrink-0 mt-0.5" style={{ color: C.sky }} />
                          <div><span className="text-[13px] font-medium text-foreground">Editor</span><span className="text-muted-foreground"> — Main code editing area with syntax highlighting, breadcrumb navigation, find/replace, and run capabilities.</span></div>
                        </div>
                        <div className="flex items-start gap-2.5 p-2 rounded-md bg-muted/20 border border-border/20">
                          <MessageSquare className="size-4 shrink-0 mt-0.5" style={{ color: C.peach }} />
                          <div><span className="text-[13px] font-medium text-foreground">Chat Panel</span><span className="text-muted-foreground"> — AI-powered chat with slash commands, session history, and multi-provider support.</span></div>
                        </div>
                        <div className="flex items-start gap-2.5 p-2 rounded-md bg-muted/20 border border-border/20">
                          <Terminal className="size-4 shrink-0 mt-0.5" style={{ color: C.teal }} />
                          <div><span className="text-[13px] font-medium text-foreground">Bottom Panel</span><span className="text-muted-foreground"> — Terminal, build logs, tasks, and activities. Toggle with <CodeInline>Ctrl+J</CodeInline>.</span></div>
                        </div>
                      </div>
                    </SubSection>

                    <SubSection title="Basic Workflow">
                      <ol className="space-y-1.5 list-none">
                        <li className="flex items-start gap-2"><span className="flex items-center justify-center size-5 rounded-full text-[10px] font-bold shrink-0" style={{ backgroundColor: `${C.emerald}20`, color: C.emerald }}>1</span><span>Create or open a project from the sidebar</span></li>
                        <li className="flex items-start gap-2"><span className="flex items-center justify-center size-5 rounded-full text-[10px] font-bold shrink-0" style={{ backgroundColor: `${C.emerald}20`, color: C.emerald }}>2</span><span>Add or edit files using the editor — use <CodeInline>Ctrl+P</CodeInline> to quickly open files</span></li>
                        <li className="flex items-start gap-2"><span className="flex items-center justify-center size-5 rounded-full text-[10px] font-bold shrink-0" style={{ backgroundColor: `${C.emerald}20`, color: C.emerald }}>3</span><span>Ask the AI chat for help — use slash commands for specific actions</span></li>
                        <li className="flex items-start gap-2"><span className="flex items-center justify-center size-5 rounded-full text-[10px] font-bold shrink-0" style={{ backgroundColor: `${C.emerald}20`, color: C.emerald }}>4</span><span>Start agents to automate tasks — click Play or use the agent panel</span></li>
                        <li className="flex items-start gap-2"><span className="flex items-center justify-center size-5 rounded-full text-[10px] font-bold shrink-0" style={{ backgroundColor: `${C.emerald}20`, color: C.emerald }}>5</span><span>Build, test, and deploy using the terminal or top bar actions</span></li>
                      </ol>
                    </SubSection>

                    <Callout type="tip">Press <CodeInline>Ctrl+Shift+H</CodeInline> at any time to open this manual. Use the sidebar to navigate between sections quickly.</Callout>
                  </div>

                  {/* ════════════════ 2. AGENT SYSTEM ════════════════ */}
                  <div id="manual-agent-system" className="mb-8 scroll-mt-4">
                    <SectionHeader id="manual-agent-system">
                      <Bot className="size-3.5" />
                      Agent System
                    </SectionHeader>

                    <SubSection title="The 6 Agents">
                      <p className="mb-3">TeamForge uses a team of specialized AI agents that work together. Each agent has a distinct role and capabilities:</p>
                      <div className="grid gap-2">
                        {agents.map((agent) => (
                          <AgentPill key={agent.name} agent={agent} />
                        ))}
                      </div>
                    </SubSection>

                    <SubSection title="Starting, Stopping & Pausing Agents">
                      <div className="space-y-2">
                        <div className="flex items-start gap-2.5 p-2.5 rounded-md bg-muted/20 border border-border/20">
                          <Play className="size-4 shrink-0 mt-0.5" style={{ color: C.emerald }} />
                          <div><span className="text-[13px] font-medium text-foreground">Play All</span><span className="text-muted-foreground"> — Starts all agents. They auto-assign themselves to pending tasks based on their role and capabilities. Click the Play button in the top bar.</span></div>
                        </div>
                        <div className="flex items-start gap-2.5 p-2.5 rounded-md bg-muted/20 border border-border/20">
                          <Pause className="size-4 shrink-0 mt-0.5" style={{ color: C.yellow }} />
                          <div><span className="text-[13px] font-medium text-foreground">Pause All</span><span className="text-muted-foreground"> — Pauses all running agents. They retain their state and can be resumed. In-progress tasks are suspended.</span></div>
                        </div>
                        <div className="flex items-start gap-2.5 p-2.5 rounded-md bg-muted/20 border border-border/20">
                          <Square className="size-4 shrink-0 mt-0.5" style={{ color: C.red }} />
                          <div><span className="text-[13px] font-medium text-foreground">Stop All</span><span className="text-muted-foreground"> — Stops all agents and resets their state. Running tasks are interrupted. Click Stop in the top bar.</span></div>
                        </div>
                        <div className="flex items-start gap-2.5 p-2.5 rounded-md bg-muted/20 border border-border/20">
                          <CircleDot className="size-4 shrink-0 mt-0.5" style={{ color: C.mauve }} />
                          <div><span className="text-[13px] font-medium text-foreground">Individual Control</span><span className="text-muted-foreground"> — Click any agent in the sidebar to open its detail dialog. From there you can set status, view activity, and chat directly with the agent.</span></div>
                        </div>
                      </div>
                    </SubSection>

                    <SubSection title="Auto-Assignment">
                      <p className="mb-2">When agents are started, the scheduler automatically assigns tasks to the most suitable agent based on the task&apos;s requirements and each agent&apos;s role. The assignment algorithm considers:</p>
                      <ul className="space-y-1 list-none">
                        <li className="flex items-start gap-2"><CheckCircle2 className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span><strong className="text-foreground">Role matching</strong> — Development tasks go to Codey, architecture tasks to Atlas, etc.</span></li>
                        <li className="flex items-start gap-2"><CheckCircle2 className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span><strong className="text-foreground">Current workload</strong> — Agents with fewer active tasks are preferred</span></li>
                        <li className="flex items-start gap-2"><CheckCircle2 className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span><strong className="text-foreground">Specialty alignment</strong> — Tasks matching an agent&apos;s specialty get priority assignment</span></li>
                      </ul>
                    </SubSection>

                    <SubSection title="YOLO Mode">
                      <div className="p-3 rounded-lg border border-orange-500/20 bg-orange-500/5">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="size-4" style={{ color: C.peach }} />
                          <span className="text-[13px] font-semibold text-foreground">YOLO Mode — Autonomous Development</span>
                        </div>
                        <p className="text-[12px] text-muted-foreground leading-relaxed mb-2">When YOLO mode is enabled, agents operate with full autonomy:</p>
                        <ul className="space-y-1 text-[12px] text-muted-foreground list-none">
                          <li className="flex items-start gap-2"><Zap className="size-3 mt-1 shrink-0" style={{ color: C.peach }} /><span>Auto-approves and executes all assigned tasks without confirmation</span></li>
                          <li className="flex items-start gap-2"><Zap className="size-3 mt-1 shrink-0" style={{ color: C.peach }} /><span>Agents process all pending tasks in batch (not one-at-a-time)</span></li>
                          <li className="flex items-start gap-2"><Zap className="size-3 mt-1 shrink-0" style={{ color: C.peach }} /><span>Scheduler polling interval reduced to 5s (from 10s) for faster response</span></li>
                          <li className="flex items-start gap-2"><Zap className="size-3 mt-1 shrink-0" style={{ color: C.peach }} /><span>AI system prompt includes YOLO directives — prefer doing over asking</span></li>
                          <li className="flex items-start gap-2"><Zap className="size-3 mt-1 shrink-0" style={{ color: C.peach }} /><span>Toggle via the YOLO button in the top bar (next to Play/Stop)</span></li>
                        </ul>
                      </div>
                      <Callout type="warning">YOLO mode grants agents full autonomy. Use with caution — agents will create, modify, and delete files and execute commands without asking for confirmation.</Callout>
                    </SubSection>
                  </div>

                  {/* ════════════════ 3. AI CHAT ════════════════ */}
                  <div id="manual-ai-chat" className="mb-8 scroll-mt-4">
                    <SectionHeader id="manual-ai-chat">
                      <MessageSquare className="size-3.5" />
                      AI Chat
                    </SectionHeader>

                    <SubSection title="Using the Chat Panel">
                      <p className="mb-2">The chat panel is your primary interface for interacting with the AI. It supports natural language conversations and slash commands.</p>
                      <ul className="space-y-1 list-none">
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span><strong className="text-foreground">Type messages</strong> in the input box and press Enter to send. The AI responds with context-aware answers.</span></li>
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span><strong className="text-foreground">Session history</strong> — Click the History button to view, switch, rename, or delete past chat sessions.</span></li>
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span><strong className="text-foreground">New Chat</strong> — Click the + button to start a fresh conversation session.</span></li>
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span><strong className="text-foreground">Copy messages</strong> — Hover over any message to reveal the copy button. Timestamps shown on hover.</span></li>
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span><strong className="text-foreground">Chat with agents</strong> — From the agent detail dialog, click &quot;Chat with Agent&quot; to pre-fill the chat with <CodeInline>@AgentName</CodeInline>.</span></li>
                      </ul>
                    </SubSection>

                    <SubSection title="Slash Commands">
                      <p className="mb-3">Slash commands are special directives that trigger specific AI actions. Type <CodeInline>/</CodeInline> in the chat input to see the autocomplete menu.</p>
                      <div className="space-y-1">
                        {slashCommands.map((cmd) => (
                          <SlashCmdRow key={cmd.cmd} cmd={cmd} />
                        ))}
                      </div>
                    </SubSection>

                    <SubSection title="Multi-Provider Support">
                      <p className="mb-2">TeamForge supports multiple AI providers. Switch between them in Settings (<CodeInline>Ctrl+,</CodeInline>):</p>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2.5 p-2.5 rounded-md bg-muted/20 border border-border/20">
                          <Bot className="size-4 shrink-0 mt-0.5" style={{ color: C.emerald }} />
                          <div>
                            <span className="text-[13px] font-medium text-foreground">Z-AI / GLM</span>
                            <span className="text-muted-foreground"> — Default provider. Uses DeepSeek model via the Z-AI SDK. No API key required. Best for general development tasks.</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-2.5 p-2.5 rounded-md bg-muted/20 border border-border/20">
                          <Cpu className="size-4 shrink-0 mt-0.5" style={{ color: C.green }} />
                          <div>
                            <span className="text-[13px] font-medium text-foreground">NVIDIA NIM</span>
                            <span className="text-muted-foreground"> — Access 50+ models via NVIDIA&apos;s inference microservice. Requires NVIDIA API key. Includes models like Llama, Mistral, Gemma, and more.</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-2.5 p-2.5 rounded-md bg-muted/20 border border-border/20">
                          <Globe className="size-4 shrink-0 mt-0.5" style={{ color: C.blue }} />
                          <div>
                            <span className="text-[13px] font-medium text-foreground">OpenAI-Compatible</span>
                            <span className="text-muted-foreground"> — Connect to any OpenAI-compatible API endpoint. Provide base URL, API key, and model ID. Supports local models like Ollama.</span>
                          </div>
                        </div>
                      </div>
                      <Callout type="info">If a provider fails (e.g., invalid API key), TeamForge automatically falls back to Z-AI to ensure uninterrupted service.</Callout>
                    </SubSection>

                    <SubSection title="Context Awareness">
                      <p className="mb-2">The AI is fully context-aware. The system prompt automatically includes:</p>
                      <ul className="space-y-1 list-none">
                        <li className="flex items-start gap-2"><Sparkles className="size-3 mt-1 shrink-0" style={{ color: C.mauve }} /><span><strong className="text-foreground">Active file content</strong> — The file currently open in your editor (up to 100 lines)</span></li>
                        <li className="flex items-start gap-2"><Sparkles className="size-3 mt-1 shrink-0" style={{ color: C.mauve }} /><span><strong className="text-foreground">Full file tree</strong> — All project files and directory structure</span></li>
                        <li className="flex items-start gap-2"><Sparkles className="size-3 mt-1 shrink-0" style={{ color: C.mauve }} /><span><strong className="text-foreground">Project info</strong> — Name, description, tech stack, and dependencies</span></li>
                        <li className="flex items-start gap-2"><Sparkles className="size-3 mt-1 shrink-0" style={{ color: C.mauve }} /><span><strong className="text-foreground">Agent capabilities</strong> — Current agent roles and task assignments</span></li>
                        <li className="flex items-start gap-2"><Sparkles className="size-3 mt-1 shrink-0" style={{ color: C.mauve }} /><span><strong className="text-foreground">Build output</strong> — Recent build logs and terminal output</span></li>
                        <li className="flex items-start gap-2"><Sparkles className="size-3 mt-1 shrink-0" style={{ color: C.mauve }} /><span><strong className="text-foreground">Chat history</strong> — Previous messages in the current session for multi-turn conversations</span></li>
                      </ul>
                    </SubSection>
                  </div>

                  {/* ════════════════ 4. FILE MANAGEMENT ════════════════ */}
                  <div id="manual-file-management" className="mb-8 scroll-mt-4">
                    <SectionHeader id="manual-file-management">
                      <FileCode2 className="size-3.5" />
                      File Management
                    </SectionHeader>

                    <SubSection title="Creating Files">
                      <ul className="space-y-1 list-none">
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span><strong className="text-foreground">Quick create</strong> — Press <CodeInline>Ctrl+N</CodeInline> to create a new untitled TypeScript file. Rename it in the editor.</span></li>
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span><strong className="text-foreground">Sidebar</strong> — Click the <CodeInline>+</CodeInline> button at the top of the file tree to add files or folders.</span></li>
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span><strong className="text-foreground">Actions menu</strong> — Use <CodeInline>Actions ▸ New File</CodeInline> from the top bar dropdown.</span></li>
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span><strong className="text-foreground">Slash command</strong> — Use <CodeInline>/create_file</CodeInline> in the chat to have the AI create a file with content.</span></li>
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span><strong className="text-foreground">Agent-created</strong> — Agents can create files autonomously when executing tasks.</span></li>
                      </ul>
                    </SubSection>

                    <SubSection title="Editing & Saving">
                      <ul className="space-y-1 list-none">
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span><CodeInline>Ctrl+S</CodeInline> — Save the active file (or save all if no file has unsaved changes)</span></li>
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span><CodeInline>Ctrl+Shift+S</CodeInline> — Save all unsaved files at once</span></li>
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span>Unsaved changes are indicated by a dot indicator on the file tab and in the sidebar</span></li>
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span>Use <CodeInline>/edit</CodeInline> slash command for AI-assisted editing — provide instructions and the AI modifies the file</span></li>
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span>Find & Replace with <CodeInline>Ctrl+F</CodeInline> / <CodeInline>Ctrl+H</CodeInline>; Go to Line with <CodeInline>Ctrl+G</CodeInline></span></li>
                      </ul>
                    </SubSection>

                    <SubSection title="Importing & Exporting Projects">
                      <ul className="space-y-1 list-none">
                        <li className="flex items-start gap-2"><Import className="size-3 mt-1 shrink-0" style={{ color: C.sky }} /><span><strong className="text-foreground">Import</strong> — Upload a ZIP archive via <CodeInline>Actions ▸ Import Project</CodeInline>. Files are extracted into the VFS. Supports nested directories.</span></li>
                        <li className="flex items-start gap-2"><FolderOutput className="size-3 mt-1 shrink-0" style={{ color: C.sky }} /><span><strong className="text-foreground">Export</strong> — Download a ZIP of all project files via <CodeInline>Actions ▸ Export Project</CodeInline>. Great for backups and sharing.</span></li>
                      </ul>
                      <Callout type="tip">Export your project regularly as a backup. The ZIP contains all files with their directory structure intact.</Callout>
                    </SubSection>

                    <SubSection title="File Search">
                      <ul className="space-y-1 list-none">
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span><CodeInline>Ctrl+P</CodeInline> — Quick file open. Type part of the filename to fuzzy-search and open files instantly.</span></li>
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span><CodeInline>Ctrl+Shift+F</CodeInline> — Global search across all project files. Shows matching content with context.</span></li>
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span><CodeInline>/search &lt;query&gt;</CodeInline> — AI-powered search with relevance scoring. Returns top results with line previews.</span></li>
                      </ul>
                    </SubSection>

                    <SubSection title="Language Stats">
                      <p>The sidebar shows a language breakdown of your project files — color-coded badges indicating how many files of each type exist (e.g., &quot;3 TS&quot;, &quot;2 CSS&quot;, &quot;1 JSON&quot;). Up to 6 languages are displayed, sorted by count.</p>
                    </SubSection>
                  </div>

                  {/* ════════════════ 5. TERMINAL & BUILD ════════════════ */}
                  <div id="manual-terminal-build" className="mb-8 scroll-mt-4">
                    <SectionHeader id="manual-terminal-build">
                      <Terminal className="size-3.5" />
                      Terminal & Build
                    </SectionHeader>

                    <SubSection title="Terminal Usage">
                      <p className="mb-2">The built-in terminal runs in the bottom panel. Toggle it with <CodeInline>Ctrl+J</CodeInline>.</p>
                      <ul className="space-y-1 list-none">
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span><strong className="text-foreground">Command input</strong> — Type any safe command and press Enter. Supports bun, npm, npx, node, python3, git, prisma, and more.</span></li>
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span><strong className="text-foreground">Command history</strong> — Use ↑↓ arrow keys to navigate through previously executed commands.</span></li>
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span><strong className="text-foreground">Clear output</strong> — Click the X button in the terminal toolbar to clear all output.</span></li>
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span><strong className="text-foreground">Copy output</strong> — Click the Copy button to copy all terminal output to clipboard.</span></li>
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span><strong className="text-foreground">Line counter</strong> — The toolbar shows total output lines for reference.</span></li>
                      </ul>
                      <Callout type="warning">The terminal uses a command allowlist. Dangerous commands (rm -rf /, sudo, mkfs, etc.) are blocked. Allowed prefixes include: bun, npm, npx, node, python3, git, ls, cat, head, tail, wc, grep, find, which, echo, pwd, date, whoami, env, tsc, next, prisma.</Callout>
                    </SubSection>

                    <SubSection title="Running Commands">
                      <ul className="space-y-1 list-none">
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span><CodeInline>Ctrl+Enter</CodeInline> — Run the current file in the editor. Auto-detects the runner based on file extension (.ts → bun, .py → python3, .sh → bash, .prisma → npx prisma validate).</span></li>
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span><CodeInline>/run &lt;command&gt;</CodeInline> — Execute commands from the chat. Output is displayed in the AI response.</span></li>
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span>Click the <strong className="text-foreground">Zap icon</strong> in the editor toolbar to run the current file.</span></li>
                      </ul>
                    </SubSection>

                    <SubSection title="Build, Test, Lint & Deploy">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="p-2.5 rounded-md border border-border/20 bg-muted/15">
                          <div className="flex items-center gap-2 mb-1">
                            <Hash className="size-3.5" style={{ color: C.sky }} />
                            <span className="text-[13px] font-semibold text-foreground">Build</span>
                            <KeyCombo keys={['Ctrl', 'Shift', 'B']} />
                          </div>
                          <p className="text-[11px] text-muted-foreground">Compiles the project. Runs <CodeInline>bun run build</CodeInline>. Check output in the Build Logs tab.</p>
                        </div>
                        <div className="p-2.5 rounded-md border border-border/20 bg-muted/15">
                          <div className="flex items-center gap-2 mb-1">
                            <Hash className="size-3.5" style={{ color: C.emerald }} />
                            <span className="text-[13px] font-semibold text-foreground">Test</span>
                            <KeyCombo keys={['Ctrl', 'Shift', 'T']} />
                          </div>
                          <p className="text-[11px] text-muted-foreground">Runs the test suite. Executes <CodeInline>bun run test</CodeInline>. Results in Build Logs tab.</p>
                        </div>
                        <div className="p-2.5 rounded-md border border-border/20 bg-muted/15">
                          <div className="flex items-center gap-2 mb-1">
                            <Hash className="size-3.5" style={{ color: C.yellow }} />
                            <span className="text-[13px] font-semibold text-foreground">Lint</span>
                            <KeyCombo keys={['Ctrl', 'Shift', 'L']} />
                          </div>
                          <p className="text-[11px] text-muted-foreground">Checks code quality. Runs <CodeInline>bun run lint</CodeInline>. Shows errors and warnings.</p>
                        </div>
                        <div className="p-2.5 rounded-md border border-border/20 bg-muted/15">
                          <div className="flex items-center gap-2 mb-1">
                            <Hash className="size-3.5" style={{ color: C.peach }} />
                            <span className="text-[13px] font-semibold text-foreground">Deploy</span>
                            <KeyCombo keys={['Ctrl', 'Shift', 'D']} />
                          </div>
                          <p className="text-[11px] text-muted-foreground">Pre-deploy checks: runs lint then build. Actual deployment requires a configured target.</p>
                        </div>
                      </div>
                    </SubSection>

                    <SubSection title="Quick Actions">
                      <p>Access quick actions from the <strong className="text-foreground">Actions</strong> dropdown in the top bar:</p>
                      <ul className="space-y-1 mt-2 list-none">
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span><strong className="text-foreground">New File / New Folder</strong> — Create project files and directories</span></li>
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span><strong className="text-foreground">Run Build / Run Lint / Run Tests</strong> — Execute common build tasks</span></li>
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span><strong className="text-foreground">Toggle Terminal</strong> — Open/close the terminal panel</span></li>
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span><strong className="text-foreground">Format Code</strong> — Shows format hint for the active file</span></li>
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span><strong className="text-foreground">Compile</strong> — Runs <CodeInline>bun run build</CodeInline> as a pre-compile step</span></li>
                      </ul>
                    </SubSection>
                  </div>

                  {/* ════════════════ 6. KEYBOARD SHORTCUTS ════════════════ */}
                  <div id="manual-keyboard-shortcuts" className="mb-8 scroll-mt-4">
                    <SectionHeader id="manual-keyboard-shortcuts">
                      <Keyboard className="size-3.5" />
                      Keyboard Shortcuts
                    </SectionHeader>

                    <div className="space-y-5">
                      {shortcutCategories.map((category) => (
                        <div key={category.title}>
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">{category.title}</h4>
                            <div className="flex-1 h-px bg-border/20" />
                          </div>
                          <div className="space-y-0.5">
                            {category.shortcuts.map((shortcut, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between gap-3 py-1 px-2 rounded hover:bg-muted/30 transition-colors"
                              >
                                <span className="text-[12px] text-foreground/80">{shortcut.action}</span>
                                <KeyCombo keys={shortcut.keys} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Callout type="info">Press <CodeInline>Ctrl+Shift+/</CodeInline> or <CodeInline>F1</CodeInline> to open the dedicated keyboard shortcuts overlay for quick reference.</Callout>
                  </div>

                  {/* ════════════════ 7. SETTINGS & CONFIGURATION ════════════════ */}
                  <div id="manual-settings" className="mb-8 scroll-mt-4">
                    <SectionHeader id="manual-settings">
                      <Settings2 className="size-3.5" />
                      Settings & Configuration
                    </SectionHeader>

                    <SubSection title="AI Provider Setup">
                      <p className="mb-2">Open Settings with <CodeInline>Ctrl+,</CodeInline>. The AI tab lets you configure your provider:</p>
                      <div className="space-y-2">
                        <div className="p-2.5 rounded-md border border-border/20 bg-muted/15">
                          <div className="flex items-center gap-2 mb-1">
                            <Bot className="size-3.5" style={{ color: C.emerald }} />
                            <span className="text-[13px] font-semibold text-foreground">Z-AI / GLM</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Default</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">No configuration needed. Works out of the box with the built-in DeepSeek model.</p>
                        </div>
                        <div className="p-2.5 rounded-md border border-border/20 bg-muted/15">
                          <div className="flex items-center gap-2 mb-1">
                            <Cpu className="size-3.5" style={{ color: C.green }} />
                            <span className="text-[13px] font-semibold text-foreground">NVIDIA NIM</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">Enter your NVIDIA API key. The model list is searchable — type to filter 50+ available models. Use the &quot;Test Connection&quot; button to verify your key works.</p>
                        </div>
                        <div className="p-2.5 rounded-md border border-border/20 bg-muted/15">
                          <div className="flex items-center gap-2 mb-1">
                            <Globe className="size-3.5" style={{ color: C.blue }} />
                            <span className="text-[13px] font-semibold text-foreground">OpenAI-Compatible</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">Provide: Base URL (e.g., <CodeInline>https://api.openai.com/v1</CodeInline> or <CodeInline>http://localhost:11434/v1</CodeInline> for Ollama), API Key, and Model ID. API key format is validated. Test Connection button available.</p>
                        </div>
                      </div>
                    </SubSection>

                    <SubSection title="API Keys">
                      <ul className="space-y-1 list-none">
                        <li className="flex items-start gap-2"><Key className="size-3 mt-1 shrink-0" style={{ color: C.mauve }} /><span><strong className="text-foreground">NVIDIA API Key</strong> — Get from <CodeInline>build.nvidia.com</CodeInline>. Used for accessing NVIDIA NIM models. Test connection in settings.</span></li>
                        <li className="flex items-start gap-2"><Key className="size-3 mt-1 shrink-0" style={{ color: C.mauve }} /><span><strong className="text-foreground">OpenAI API Key</strong> — Standard <CodeInline>sk-...</CodeInline> format key. Used for OpenAI-compatible endpoints. Validated on input.</span></li>
                        <li className="flex items-start gap-2"><Key className="size-3 mt-1 shrink-0" style={{ color: C.mauve }} /><span><strong className="text-foreground">Storage</strong> — All keys are stored locally in your browser&apos;s localStorage. Never sent to any server except the configured provider.</span></li>
                      </ul>
                      <Callout type="warning">Never share your API keys. They are stored locally and only transmitted to the configured AI provider endpoint.</Callout>
                    </SubSection>

                    <SubSection title="Editor Settings">
                      <ul className="space-y-1 list-none">
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span><strong className="text-foreground">Font Size</strong> — Adjust with <CodeInline>Ctrl++</CodeInline> / <CodeInline>Ctrl+-</CodeInline> or in the settings dialog</span></li>
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span><strong className="text-foreground">Tab Size</strong> — Configurable indentation width in settings</span></li>
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span><strong className="text-foreground">Word Wrap</strong> — Toggle long line wrapping in the editor</span></li>
                        <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-1 shrink-0" style={{ color: C.emerald }} /><span><strong className="text-foreground">Minimap</strong> — Toggle the code minimap for navigation</span></li>
                      </ul>
                    </SubSection>

                    <SubSection title="Theme Toggle">
                      <div className="flex items-start gap-2.5 p-2.5 rounded-md bg-muted/20 border border-border/20">
                        <Palette className="size-4 shrink-0 mt-0.5" style={{ color: C.mauve }} />
                        <div>
                          <span className="text-[13px] font-medium text-foreground">Dark / Light Mode</span>
                          <span className="text-muted-foreground"> — Toggle via the moon/sun icon in the top bar, the command palette (<CodeInline>Ctrl+Shift+P</CodeInline> → &quot;Toggle Theme&quot;), or system preference. TeamForge uses the Catppuccin Mocha palette in dark mode for a comfortable, low-eye-strain experience.</span>
                        </div>
                      </div>
                    </SubSection>

                    <SubSection title="Reset to Defaults">
                      <p>Use the <strong className="text-foreground">Reset to Default</strong> button at the bottom of the AI settings tab to restore all AI provider settings to their original values (Z-AI provider, DeepSeek model, no API keys).</p>
                    </SubSection>
                  </div>

                  {/* ════════════════ 8. TIPS & TRICKS ════════════════ */}
                  <div id="manual-tips-tricks" className="mb-8 scroll-mt-4">
                    <SectionHeader id="manual-tips-tricks">
                      <Lightbulb className="size-3.5" />
                      Tips & Tricks
                    </SectionHeader>

                    <div className="space-y-3">
                      <Callout type="tip">
                        <div>
                          <strong className="text-foreground">YOLO Mode for Autonomous Development</strong>
                          <p className="mt-1">Enable YOLO mode when you want agents to work independently. Best for well-defined tasks like &quot;implement the login page&quot; or &quot;add unit tests for utils.ts&quot;. Disable it for exploratory work where you want to review each change.</p>
                        </div>
                      </Callout>

                      <Callout type="tip">
                        <div>
                          <strong className="text-foreground">Agent Chat Integration</strong>
                          <p className="mt-1">Click any agent in the sidebar, then click &quot;Chat with Agent&quot; in the detail dialog. This pre-fills the chat with <CodeInline>@AgentName</CodeInline> so you can give direct instructions to a specific agent. The AI tailors its response based on the agent&apos;s role.</p>
                        </div>
                      </Callout>

                      <Callout type="tip">
                        <div>
                          <strong className="text-foreground">Real-Time Collaboration via WebSocket</strong>
                          <p className="mt-1">TeamForge connects via WebSocket for real-time updates. When the connection is active (green &quot;Live&quot; indicator in the footer), agent activities, task updates, and build results are pushed instantly. When disconnected, it falls back to 30-second polling.</p>
                        </div>
                      </Callout>

                      <Callout type="tip">
                        <div>
                          <strong className="text-foreground">Project Export for Backup</strong>
                          <p className="mt-1">Before making major changes, export your project via <CodeInline>Actions ▸ Export Project</CodeInline>. This downloads a complete ZIP backup. You can re-import it later to restore your work.</p>
                        </div>
                      </Callout>

                      <Callout type="info">
                        <div>
                          <strong className="text-foreground">Use Slash Commands as Workflows</strong>
                          <p className="mt-1">Chain slash commands for efficient workflows: <CodeInline>/fix</CodeInline> to find bugs → <CodeInline>/refactor</CodeInline> to clean up → <CodeInline>/commit</CodeInline> to generate a commit message. Each command builds on the previous state.</p>
                        </div>
                      </Callout>

                      <Callout type="info">
                        <div>
                          <strong className="text-foreground">Command Palette Power User</strong>
                          <p className="mt-1">Press <CodeInline>Ctrl+Shift+P</CodeInline> to open the command palette. It supports fuzzy search across all commands — type partial matches to find what you need quickly. Includes New Chat, Switch AI Model, Clear Chat, and Toggle Theme.</p>
                        </div>
                      </Callout>

                      <Callout type="info">
                        <div>
                          <strong className="text-foreground">Active File Context</strong>
                          <p className="mt-1">The AI automatically sees the file you have open in the editor. When you use <CodeInline>/fix</CodeInline>, <CodeInline>/refactor</CodeInline>, or <CodeInline>/optimize</CodeInline> without specifying a file path, it operates on your currently active file.</p>
                        </div>
                      </Callout>

                      <Callout type="warning">
                        <div>
                          <strong className="text-foreground">Safe Command Execution</strong>
                          <p className="mt-1">The terminal and <CodeInline>/run</CodeInline> command use an allowlist with blocked patterns. If a command is rejected, check that it starts with an allowed prefix (bun, npm, node, python3, git, etc.) and doesn&apos;t match a dangerous pattern (sudo, rm -rf /, etc.).</p>
                        </div>
                      </Callout>
                    </div>

                    <div className="mt-6 p-4 rounded-lg border border-border/30 bg-muted/15 text-center">
                      <p className="text-[13px] text-muted-foreground">
                        <strong className="text-foreground">TeamForge IDE</strong> — Built with ❤️ for developers who ship fast.
                      </p>
                      <p className="text-[11px] text-muted-foreground/60 mt-1">
                        Press <CodeInline>Ctrl+Shift+H</CodeInline> anytime to reopen this manual.
                      </p>
                    </div>
                  </div>

                </div>
              </ScrollArea>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
