'use client'

import { useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Command } from 'cmdk'
import {
  Search,
  LayoutDashboard,
  Users,
  Dna,
  Database,
  Network,
  FlaskConical,
  BarChart3,
  Shield,
  MessageSquare,
  Settings,
  GitBranch,
  Moon,
  Sun,
  RefreshCw,
  Plus,
  Lightbulb,
  Download,
  ArrowUpRight,
  Clock,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useAppStore, type Page } from '@/lib/store'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Navigation items — matches the sidebar
// ---------------------------------------------------------------------------

const NAV_ITEMS: { page: Page; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'agents', label: 'Agents', icon: Users },
  { page: 'evolution', label: 'Evolution', icon: Dna },
  { page: 'memory', label: 'Memory', icon: Database },
  { page: 'knowledge', label: 'Knowledge', icon: Network },
  { page: 'topology', label: 'Topology', icon: GitBranch },
  { page: 'research', label: 'Research', icon: FlaskConical },
  { page: 'benchmarks', label: 'Benchmarks', icon: BarChart3 },
  { page: 'safety', label: 'Safety', icon: Shield },
  { page: 'chat', label: 'Chat', icon: MessageSquare },
  { page: 'settings', label: 'Settings', icon: Settings },
]

// ---------------------------------------------------------------------------
// Quick actions
// ---------------------------------------------------------------------------

interface QuickAction {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  shortcut?: string
  action: () => void
}

function useQuickActions() {
  const { setTheme, theme } = useTheme()
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen)

  const actions: QuickAction[] = [
    {
      id: 'toggle-dark-mode',
      label: 'Toggle Dark Mode',
      icon: theme === 'dark' ? Sun : Moon,
      shortcut: '⌘⇧D',
      action: () => {
        setTheme(theme === 'dark' ? 'light' : 'dark')
        setCommandPaletteOpen(false)
      },
    },
    {
      id: 'refresh-data',
      label: 'Refresh Data',
      icon: RefreshCw,
      shortcut: '⌘R',
      action: () => {
        window.dispatchEvent(new CustomEvent('evoai:refresh-data'))
        setCommandPaletteOpen(false)
      },
    },
    {
      id: 'create-agent',
      label: 'Create Agent',
      icon: Plus,
      action: () => {
        setCurrentPage('agents')
        setCommandPaletteOpen(false)
        // Dispatch event so agents panel can open the create dialog
        setTimeout(() => window.dispatchEvent(new CustomEvent('evoai:create-agent')), 100)
      },
    },
    {
      id: 'propose-improvement',
      label: 'Propose Improvement',
      icon: Lightbulb,
      action: () => {
        setCurrentPage('evolution')
        setCommandPaletteOpen(false)
        setTimeout(() => window.dispatchEvent(new CustomEvent('evoai:propose-improvement')), 100)
      },
    },
    {
      id: 'add-memory',
      label: 'Add Memory',
      icon: Database,
      action: () => {
        setCurrentPage('memory')
        setCommandPaletteOpen(false)
        setTimeout(() => window.dispatchEvent(new CustomEvent('evoai:add-memory')), 100)
      },
    },
    {
      id: 'export-data',
      label: 'Export Data',
      icon: Download,
      action: () => {
        setCurrentPage('agents')
        setCommandPaletteOpen(false)
        setTimeout(() => window.dispatchEvent(new CustomEvent('evoai:export-data')), 100)
      },
    },
    {
      id: 'open-chat',
      label: 'Open Chat',
      icon: MessageSquare,
      action: () => {
        setCurrentPage('chat')
        setCommandPaletteOpen(false)
      },
    },
  ]

  return actions
}

// ---------------------------------------------------------------------------
// Recent commands storage
// ---------------------------------------------------------------------------

const RECENT_KEY = 'evoai-recent-commands'
const MAX_RECENT = 5

function getRecentCommands(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
  } catch {
    return []
  }
}

function addRecentCommand(id: string) {
  if (typeof window === 'undefined') return
  try {
    const recent = getRecentCommands().filter((r) => r !== id)
    recent.unshift(id)
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Main Command Palette Component
// ---------------------------------------------------------------------------

export function CommandPalette() {
  const open = useAppStore((s) => s.commandPaletteOpen)
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen)
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)
  const quickActions = useQuickActions()
  const inputRef = useRef<HTMLInputElement>(null)

  // Read recent commands directly from localStorage (cheap sync read)
  const recentIds = getRecentCommands()

  // Focus input when palette opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        e.preventDefault()
        setCommandPaletteOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, setCommandPaletteOpen])

  const handleSelect = useCallback(
    (id: string) => {
      addRecentCommand(id)
      setCommandPaletteOpen(false)

      // Check if it's a navigation item
      const navItem = NAV_ITEMS.find((n) => n.page === id)
      if (navItem) {
        setCurrentPage(navItem.page)
        return
      }

      // Check if it's a quick action
      const action = quickActions.find((a) => a.id === id)
      if (action) {
        action.action()
      }
    },
    [setCommandPaletteOpen, setCurrentPage, quickActions]
  )

  // Build recent items
  const recentNavItems = recentIds
    .map((id) => NAV_ITEMS.find((n) => n.page === id))
    .filter(Boolean) as (typeof NAV_ITEMS)[number]
  const recentActionItems = recentIds
    .map((id) => quickActions.find((a) => a.id === id))
    .filter(Boolean) as QuickAction[]
  const hasRecent = recentNavItems.length > 0 || recentActionItems.length > 0

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setCommandPaletteOpen(false)}
          />

          {/* Command palette container */}
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="w-full max-w-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Command
                className="bg-background/80 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl overflow-hidden"
                loop
              >
                {/* Search input */}
                <div className="flex items-center gap-3 border-b border-border/50 px-4 h-14">
                  <Search className="size-4 shrink-0 text-muted-foreground" />
                  <Command.Input
                    ref={inputRef}
                    placeholder="Type a command or search..."
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                  />
                  <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border/50 bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    ESC
                  </kbd>
                </div>

                {/* Command list */}
                <Command.List className="max-h-80 overflow-y-auto p-2 overscroll-contain scrollbar-thin">
                  <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
                    No results found.
                  </Command.Empty>

                  {/* Recent commands */}
                  {hasRecent && (
                    <Command.Group
                      heading={
                        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                          <Clock className="size-3" />
                          Recent
                        </div>
                      }
                    >
                      {recentNavItems.map((item) => {
                        const Icon = item.icon
                        return (
                          <Command.Item
                            key={item.page}
                            value={`recent-${item.page}`}
                            onSelect={() => handleSelect(item.page)}
                            className={cn(
                              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer',
                              'text-foreground/80',
                              'data-[selected=true]:bg-accent/50 data-[selected=true]:text-accent-foreground',
                              'data-[selected=true]:border-l-2 data-[selected=true]:border-l-emerald-500',
                              'border-l-2 border-l-transparent',
                              'transition-colors duration-100'
                            )}
                          >
                            <Icon className="size-4 text-muted-foreground" />
                            <span>{item.label}</span>
                            <ArrowUpRight className="size-3 ml-auto text-muted-foreground/50" />
                          </Command.Item>
                        )
                      })}
                      {recentActionItems.map((item) => {
                        const Icon = item.icon
                        return (
                          <Command.Item
                            key={item.id}
                            value={`recent-${item.id}`}
                            onSelect={() => handleSelect(item.id)}
                            className={cn(
                              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer',
                              'text-foreground/80',
                              'data-[selected=true]:bg-accent/50 data-[selected=true]:text-accent-foreground',
                              'data-[selected=true]:border-l-2 data-[selected=true]:border-l-emerald-500',
                              'border-l-2 border-l-transparent',
                              'transition-colors duration-100'
                            )}
                          >
                            <Icon className="size-4 text-muted-foreground" />
                            <span>{item.label}</span>
                            <span className="ml-auto text-[10px] text-muted-foreground/50 flex items-center gap-1">
                              <Clock className="size-2.5" />
                            </span>
                          </Command.Item>
                        )
                      })}
                    </Command.Group>
                  )}

                  {/* Navigation */}
                  <Command.Group
                    heading={
                      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                        <LayoutDashboard className="size-3" />
                        Navigation
                      </div>
                    }
                  >
                    {NAV_ITEMS.map((item) => {
                      const Icon = item.icon
                      return (
                        <Command.Item
                          key={item.page}
                          value={`nav-${item.label.toLowerCase()}`}
                          onSelect={() => handleSelect(item.page)}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer',
                            'text-foreground/80',
                            'data-[selected=true]:bg-accent/50 data-[selected=true]:text-accent-foreground',
                            'data-[selected=true]:border-l-2 data-[selected=true]:border-l-emerald-500',
                            'border-l-2 border-l-transparent',
                            'transition-colors duration-100'
                          )}
                        >
                          <Icon className="size-4 text-muted-foreground" />
                          <span>{item.label}</span>
                          <span className="ml-auto text-[10px] text-muted-foreground/50 font-mono">
                            Go
                          </span>
                        </Command.Item>
                      )
                    })}
                  </Command.Group>

                  {/* Quick Actions */}
                  <Command.Group
                    heading={
                      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                        <ZapIcon className="size-3" />
                        Actions
                      </div>
                    }
                  >
                    {quickActions.map((item) => {
                      const Icon = item.icon
                      return (
                        <Command.Item
                          key={item.id}
                          value={`action-${item.label.toLowerCase()}`}
                          onSelect={() => handleSelect(item.id)}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer',
                            'text-foreground/80',
                            'data-[selected=true]:bg-accent/50 data-[selected=true]:text-accent-foreground',
                            'data-[selected=true]:border-l-2 data-[selected=true]:border-l-emerald-500',
                            'border-l-2 border-l-transparent',
                            'transition-colors duration-100'
                          )}
                        >
                          <Icon className="size-4 text-muted-foreground" />
                          <span>{item.label}</span>
                          {item.shortcut && (
                            <kbd className="ml-auto pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border border-border/50 bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                              {item.shortcut}
                            </kbd>
                          )}
                        </Command.Item>
                      )
                    })}
                  </Command.Group>
                </Command.List>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-border/50 px-4 py-2 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <kbd className="rounded border border-border/50 bg-muted px-1 py-0.5 font-mono text-[9px]">↑↓</kbd>
                      navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="rounded border border-border/50 bg-muted px-1 py-0.5 font-mono text-[9px]">↵</kbd>
                      select
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="rounded border border-border/50 bg-muted px-1 py-0.5 font-mono text-[9px]">esc</kbd>
                      close
                    </span>
                  </div>
                  <span className="text-muted-foreground/50">EvoAI Command Palette</span>
                </div>
              </Command>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

// ---------------------------------------------------------------------------
// Small ⌘K badge button for the header area
// ---------------------------------------------------------------------------

export function CommandPaletteBadge() {
  const toggleCommandPalette = useAppStore((s) => s.toggleCommandPalette)

  return (
    <button
      onClick={toggleCommandPalette}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background/50',
        'px-2.5 py-1.5 text-xs text-muted-foreground',
        'hover:bg-accent/50 hover:text-accent-foreground hover:border-border',
        'transition-colors duration-150 cursor-pointer',
        'backdrop-blur-sm'
      )}
    >
      <Search className="size-3" />
      <span className="hidden sm:inline">Search</span>
      <kbd className="pointer-events-none hidden sm:inline-flex h-4 select-none items-center gap-0.5 rounded border border-border/50 bg-muted px-1 font-mono text-[9px] font-medium text-muted-foreground">
        ⌘K
      </kbd>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Small Zap icon (to avoid import issues)
// ---------------------------------------------------------------------------

function ZapIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
    </svg>
  )
}
