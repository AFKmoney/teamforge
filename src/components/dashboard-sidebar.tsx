'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  LayoutDashboard,
  Users,
  Dna,
  Database,
  Network,
  FlaskConical,
  BarChart3,
  Shield,
  MessageSquare,
  ChevronsLeft,
  ChevronsRight,
  Menu,
  Sun,
  Moon,
  Monitor,
  Settings,
  GitBranch,
  Cpu,
  Activity,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  Keyboard,
  Clock,
  X,
  ArrowLeft,
  ArrowRight,
  Search,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useAppStore, type Page } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { NotificationBell } from '@/components/notification-bell'
import { motion, AnimatePresence } from 'framer-motion'

// ---------------------------------------------------------------------------
// Navigation sections definition
// ---------------------------------------------------------------------------

interface NavItem {
  page: Page
  label: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavSection {
  id: string
  label: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { page: 'activity', label: 'Activity', icon: Activity },
    ],
  },
  {
    id: 'core',
    label: 'Core Systems',
    items: [
      { page: 'agents', label: 'Agents', icon: Users },
      { page: 'evolution', label: 'Evolution', icon: Dna },
      { page: 'memory', label: 'Memory', icon: Database },
    ],
  },
  {
    id: 'intelligence',
    label: 'Intelligence',
    items: [
      { page: 'knowledge', label: 'Knowledge', icon: Network },
      { page: 'topology', label: 'Topology', icon: GitBranch },
      { page: 'insights', label: 'Insights', icon: Lightbulb },
      { page: 'research', label: 'Research', icon: FlaskConical },
    ],
  },
  {
    id: 'quality',
    label: 'Quality',
    items: [
      { page: 'benchmarks', label: 'Benchmarks', icon: BarChart3 },
      { page: 'safety', label: 'Safety', icon: Shield },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    items: [
      { page: 'chat', label: 'Chat', icon: MessageSquare },
      { page: 'settings', label: 'Settings', icon: Settings },
    ],
  },
]

// Flatten all nav items for quick lookup
const allNavItems = navSections.flatMap((s) => s.items)

// Keyboard shortcuts data
const keyboardShortcuts = [
  { keys: ['⌘', 'K'], description: 'Command Palette' },
  { keys: ['Alt', '1–9'], description: 'Navigate panels' },
  { keys: ['Alt', '←'], description: 'Back navigation' },
  { keys: ['Alt', '→'], description: 'Forward navigation' },
  { keys: ['Esc'], description: 'Close dialogs' },
  { keys: ['/'], description: 'Focus search' },
]

// ---------------------------------------------------------------------------
// Collapsed sections state hook (localStorage persistence)
// ---------------------------------------------------------------------------

function useCollapsedSections() {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {}
    try {
      const stored = localStorage.getItem('evoai-collapsed-sections')
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  })

  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [sectionId]: !prev[sectionId] }
      try {
        localStorage.setItem('evoai-collapsed-sections', JSON.stringify(next))
      } catch {
        // ignore storage errors
      }
      return next
    })
  }, [])

  return { collapsedSections, toggleSection }
}

// ---------------------------------------------------------------------------
// Relative time helper
// ---------------------------------------------------------------------------

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// ---------------------------------------------------------------------------
// Mini Status Bar Component (for sidebar footer)
// ---------------------------------------------------------------------------

function MiniStatusBar({ value, label, color }: {
  value: number
  label: string
  color: string
}) {
  return (
    <div className="flex items-center gap-1.5 w-full">
      <span className="text-[9px] text-muted-foreground w-8 shrink-0">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-muted/50 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', color)}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// System Status Mini Card
// ---------------------------------------------------------------------------

function SystemStatusCard() {
  const agents = useAppStore((s) => s.agents)
  const activeAgents = agents.filter((a) => a.status === 'active' || a.status === 'busy').length
  const isHealthy = true // mock: always healthy for now
  const lastUpdated = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="p-2.5 rounded-lg bg-muted/20 border border-border/30 w-full space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">System Status</span>
        <span className={cn(
          'flex items-center gap-1 text-[10px] font-medium',
          isHealthy ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
        )}>
          <span className={cn(
            'size-1.5 rounded-full',
            isHealthy ? 'bg-emerald-500' : 'bg-amber-500'
          )} />
          {isHealthy ? 'Healthy' : 'Degraded'}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-xs font-semibold text-foreground">99.97%</div>
          <div className="text-[9px] text-muted-foreground">Uptime</div>
        </div>
        <div>
          <div className="text-xs font-semibold text-foreground">{activeAgents}</div>
          <div className="text-[9px] text-muted-foreground">Agents</div>
        </div>
        <div>
          <div className="text-xs font-semibold text-foreground">{lastUpdated}</div>
          <div className="text-[9px] text-muted-foreground">Updated</div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Keyboard Shortcuts Dialog
// ---------------------------------------------------------------------------

function KeyboardShortcutsDialog({ open, onOpenChange }: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="size-5 text-emerald-500" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Navigate faster with these keyboard shortcuts.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          {keyboardShortcuts.map((shortcut) => (
            <div
              key={shortcut.description}
              className="flex items-center justify-between py-2 px-1 rounded-md hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm text-foreground">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <kbd className="bg-muted border border-border rounded px-2 py-0.5 font-mono text-xs text-muted-foreground shadow-sm">
                      {key}
                    </kbd>
                    {i < shortcut.keys.length - 1 && (
                      <span className="text-muted-foreground/50 text-xs">+</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Theme Toggle Component
// ---------------------------------------------------------------------------

function ThemeToggle({ collapsed }: { collapsed?: boolean }) {
  const { setTheme, theme } = useTheme()

  const toggleButton = (
    <Button
      variant="ghost"
      size="icon"
      className="size-8 text-muted-foreground hover:text-foreground"
      onClick={() => setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'dark' : 'dark')}
    >
      <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground">
                  <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="right">
                <DropdownMenuItem onClick={() => setTheme('light')}>
                  <Sun className="mr-2 size-4" /> Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')}>
                  <Moon className="mr-2 size-4" /> Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')}>
                  <Monitor className="mr-2 size-4" /> System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            Theme
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {toggleButton}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="mr-2 size-4" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="mr-2 size-4" /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor className="mr-2 size-4" /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ---------------------------------------------------------------------------
// Recent Pages Section
// ---------------------------------------------------------------------------

function RecentPagesSection({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean
  onNavigate: (page: Page) => void
}) {
  const recentPages = useAppStore((s) => s.recentPages)
  const clearRecentPages = useAppStore((s) => s.clearRecentPages)
  const currentPage = useAppStore((s) => s.currentPage)

  // Only show last 3, excluding current page
  const displayRecent = recentPages
    .filter((r) => r.page !== currentPage)
    .slice(0, 3)

  if (displayRecent.length === 0) return null

  if (collapsed) {
    return (
      <div className="px-2 py-1">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center">
                <Clock className="size-3.5 text-muted-foreground/40" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              <div className="text-xs font-medium mb-1">Recent</div>
              {displayRecent.map((r) => {
                const item = allNavItems.find((n) => n.page === r.page)
                return item ? (
                  <button
                    key={r.page}
                    onClick={() => onNavigate(r.page)}
                    className="flex items-center gap-2 w-full text-left py-0.5 hover:text-foreground transition-colors"
                  >
                    <item.icon className="size-3" />
                    <span>{item.label}</span>
                    <span className="ml-auto text-muted-foreground text-[10px]">{relativeTime(r.visitedAt)}</span>
                  </button>
                ) : null
              })}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    )
  }

  return (
    <div className="px-2 py-1">
      <div className="flex items-center justify-between px-3 mb-1">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Recent</span>
        <button
          onClick={clearRecentPages}
          className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          title="Clear recent history"
        >
          Clear
        </button>
      </div>
      <div className="space-y-0.5">
        {displayRecent.map((r) => {
          const item = allNavItems.find((n) => n.page === r.page)
          if (!item) return null
          const Icon = item.icon
          return (
            <motion.button
              key={r.page}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              onClick={() => onNavigate(r.page)}
              className="flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/20 transition-all w-full"
            >
              <Icon className="size-3.5 shrink-0" />
              <span className="truncate flex-1 text-left">{item.label}</span>
              <span className="text-[10px] text-muted-foreground/50 shrink-0">{relativeTime(r.visitedAt)}</span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sidebar Nav Content (with sections + active indicator)
// ---------------------------------------------------------------------------

function SidebarNavContent({
  collapsed,
  currentPage,
  onNavigate,
}: {
  collapsed: boolean
  currentPage: Page
  onNavigate: (page: Page) => void
}) {
  const { collapsedSections, toggleSection } = useCollapsedSections()

  return (
    <nav className="flex flex-col gap-0.5 px-2" data-tour="sidebar-nav">
      {navSections.map((section) => {
        const isCollapsed = collapsedSections[section.id] ?? false

        // In collapsed sidebar mode, just show icons
        if (collapsed) {
          return (
            <div key={section.id} className="space-y-0.5">
              {section.items.map((item, index) => {
                const Icon = item.icon
                const isActive = currentPage === item.page
                const globalIndex = allNavItems.findIndex((n) => n.page === item.page)

                const button = (
                  <button
                    key={item.page}
                    data-tour={`nav-${item.page}`}
                    onClick={() => onNavigate(item.page)}
                    className={cn(
                      'relative flex items-center justify-center rounded-lg p-2.5 transition-all duration-200 w-full group',
                      isActive
                        ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/5'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/30'
                    )}
                  >
                    <Icon className="size-5 shrink-0" />
                    {/* Active dot indicator for collapsed state */}
                    {isActive && (
                      <motion.span
                        layoutId="collapsed-active-dot"
                        className="absolute left-0 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-emerald-500"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </button>
                )

                return (
                  <TooltipProvider key={item.page} delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>{button}</TooltipTrigger>
                      <TooltipContent side="right" sideOffset={8}>
                        <div className="flex items-center gap-2">
                          {item.label}
                          {globalIndex < 9 && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-muted font-mono">
                              Alt+{globalIndex + 1}
                            </span>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )
              })}
              {/* Section divider (except after last section) */}
              {section.id !== navSections[navSections.length - 1].id && (
                <Separator className="my-1 opacity-50" />
              )}
            </div>
          )
        }

        // Expanded sidebar with collapsible sections
        return (
          <Collapsible
            key={section.id}
            open={!isCollapsed}
            onOpenChange={() => toggleSection(section.id)}
          >
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 py-1.5 w-full hover:bg-accent/20 rounded-md transition-colors group/section">
                <motion.span
                  animate={{ rotate: isCollapsed ? 0 : 0 }}
                  className="text-muted-foreground/50 group-hover/section:text-muted-foreground transition-colors"
                >
                  {isCollapsed ? (
                    <ChevronRight className="size-3" />
                  ) : (
                    <ChevronDown className="size-3" />
                  )}
                </motion.span>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex-1 text-left">
                  {section.label}
                </span>
                {isCollapsed && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground/60 font-mono">
                    {section.items.length}
                  </span>
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive = currentPage === item.page
                  const globalIndex = allNavItems.findIndex((n) => n.page === item.page)

                  return (
                    <button
                      key={item.page}
                      data-tour={`nav-${item.page}`}
                      onClick={() => onNavigate(item.page)}
                      className={cn(
                        'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 w-full group',
                        'hover:bg-accent/30 hover:translate-x-0.5',
                        isActive
                          ? 'text-foreground font-semibold'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {/* Animated active indicator — left border + glow */}
                      {isActive && (
                        <motion.span
                          layoutId="active-indicator"
                          className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                        />
                      )}

                      {/* Animated background for active item */}
                      {isActive && (
                        <motion.span
                          layoutId="active-bg"
                          className="absolute inset-0 rounded-lg bg-gradient-to-r from-emerald-500/5 to-transparent"
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                        />
                      )}

                      {/* Pulsing active dot at left edge */}
                      {isActive && (
                        <span className="absolute left-0.5 top-1/2 -translate-y-1/2 flex size-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
                        </span>
                      )}

                      <Icon className={cn(
                        'shrink-0 transition-colors relative z-10 size-4',
                        isActive ? 'text-emerald-600 dark:text-emerald-400' : ''
                      )} />
                      <span className="truncate flex-1 relative z-10">{item.label}</span>
                      {/* Keyboard shortcut badge */}
                      {globalIndex < 9 && (
                        <span className={cn(
                          'text-[9px] px-1 py-0.5 rounded font-mono leading-none transition-colors relative z-10',
                          isActive
                            ? 'text-emerald-600/50 dark:text-emerald-400/50'
                            : 'text-muted-foreground/40'
                        )}>
                          {globalIndex + 1}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )
      })}
    </nav>
  )
}

// ---------------------------------------------------------------------------
// User Profile Section
// ---------------------------------------------------------------------------

function UserProfileSection({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center py-2">
              <div className="flex items-center justify-center size-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                AI
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            <div className="text-sm font-medium">EvoAI System</div>
            <div className="text-xs text-muted-foreground">Administrator</div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-card/60 backdrop-blur-sm border border-border/50">
      <div className="flex items-center justify-center size-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-bold shrink-0">
        AI
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium text-foreground leading-tight truncate">EvoAI System</span>
        <span className="text-[11px] text-muted-foreground leading-tight truncate">Administrator</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Sidebar Component
// ---------------------------------------------------------------------------

export function DashboardSidebar() {
  const currentPage = useAppStore((s) => s.currentPage)
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed)
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen)
  const isMobile = useIsMobile()
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  const handleNavigate = (page: Page) => {
    setCurrentPage(page)
    if (isMobile) {
      setSidebarOpen(false)
    }
  }

  // Pseudo-random system status values (stable per session)
  const cpuValue = 47
  const memValue = 62
  const netValue = 31

  // Keyboard shortcut: / to open shortcuts dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
      if (!isInput && e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        setShortcutsOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Mobile: Sheet-based sidebar
  if (isMobile) {
    return (
      <>
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-3 left-3 z-40 md:hidden bg-background/80 backdrop-blur-sm border shadow-sm min-h-[44px] min-w-[44px]"
            >
              <Menu className="size-5" />
              <span className="sr-only">Toggle sidebar</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="p-4 pb-2">
              <SheetTitle className="flex items-center gap-2">
                <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-500/10">
                  <Cpu className="size-5 text-emerald-500" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold leading-tight">EvoAI</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    Self-Evolving System
                  </span>
                </div>
                {/* ⌘K shortcut badge */}
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono border border-border/50">
                  ⌘K
                </span>
              </SheetTitle>
            </SheetHeader>
            <Separator />
            {/* User Profile */}
            <div className="px-3 pt-2">
              <UserProfileSection collapsed={false} />
            </div>
            <ScrollArea className="flex-1 py-2">
              {/* Recent Pages */}
              <RecentPagesSection collapsed={false} onNavigate={handleNavigate} />
              <Separator className="my-1 mx-2" />
              <SidebarNavContent
                collapsed={false}
                currentPage={currentPage}
                onNavigate={handleNavigate}
              />
            </ScrollArea>
            <Separator />
            <div className="p-3 flex flex-col gap-2">
              {/* System Status Card */}
              <SystemStatusCard />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="relative flex size-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500" />
                  </span>
                  <span>System Online</span>
                </div>
                <div className="flex items-center gap-1">
                  <NotificationBell />
                  <ThemeToggle />
                </div>
              </div>
              {/* Shortcuts button */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground text-xs h-8"
                onClick={() => setShortcutsOpen(true)}
              >
                <Keyboard className="size-3.5" />
                Shortcuts
                <span className="ml-auto text-[9px] px-1 py-0.5 rounded bg-muted font-mono border border-border/50">/</span>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      </>
    )
  }

  // Desktop: Persistent sidebar
  return (
    <>
      <aside
        className={cn(
          'hidden md:flex flex-col border-r bg-gradient-to-b from-background to-muted/10 transition-all duration-300 shrink-0',
          sidebarCollapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Logo */}
        <div className={cn('flex items-center gap-3 p-4', sidebarCollapsed && 'justify-center px-2')}>
          <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-500/10 shrink-0">
            <Cpu className="size-5 text-emerald-500" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-base font-bold leading-tight tracking-tight">EvoAI</span>
              <span className="text-[11px] text-muted-foreground leading-tight truncate">
                Self-Evolving System
              </span>
            </div>
          )}
          {/* ⌘K shortcut badge (only when expanded) */}
          {!sidebarCollapsed && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono border border-border/50 shrink-0">
              ⌘K
            </span>
          )}
        </div>

        <Separator />

        {/* User Profile */}
        <div className={cn('px-3 pt-2', sidebarCollapsed && 'px-2')}>
          <UserProfileSection collapsed={sidebarCollapsed} />
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-2">
          {/* Recent Pages */}
          <RecentPagesSection collapsed={sidebarCollapsed} onNavigate={handleNavigate} />
          {!sidebarCollapsed && <Separator className="my-1 mx-2" />}
          <SidebarNavContent
            collapsed={sidebarCollapsed}
            currentPage={currentPage}
            onNavigate={handleNavigate}
          />
        </ScrollArea>

        <Separator />

        {/* Bottom section */}
        <div className={cn('p-3 flex flex-col gap-2', sidebarCollapsed && 'items-center px-2')}>
          {!sidebarCollapsed ? (
            <>
              {/* System Status Card */}
              <SystemStatusCard />
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="relative flex size-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500" />
                  </span>
                  <span>System Online</span>
                </div>
                <div className="flex items-center gap-1">
                  <NotificationBell />
                  <ThemeToggle />
                </div>
              </div>
              {/* Shortcuts button */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground text-xs h-8"
                onClick={() => setShortcutsOpen(true)}
              >
                <Keyboard className="size-3.5" />
                Shortcuts
                <span className="ml-auto text-[9px] px-1 py-0.5 rounded bg-muted font-mono border border-border/50">/</span>
              </Button>
            </>
          ) : (
            <div className="flex flex-col gap-2 items-center w-full">
              {/* Collapsed mini bars */}
              <div className="space-y-1 w-8">
                <div className="h-1 rounded-full bg-muted/50 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500/70" style={{ width: `${cpuValue}%` }} />
                </div>
                <div className="h-1 rounded-full bg-muted/50 overflow-hidden">
                  <div className="h-full rounded-full bg-amber-500/70" style={{ width: `${memValue}%` }} />
                </div>
                <div className="h-1 rounded-full bg-muted/50 overflow-hidden">
                  <div className="h-full rounded-full bg-sky-500/70" style={{ width: `${netValue}%` }} />
                </div>
              </div>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="relative flex size-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    System Online
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <NotificationBell />
              <ThemeToggle collapsed />
              {/* Collapsed shortcuts button */}
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-foreground"
                      onClick={() => setShortcutsOpen(true)}
                    >
                      <Keyboard className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    Keyboard Shortcuts (/)
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'size-8 text-muted-foreground hover:text-foreground transition-transform duration-200',
              'hover:scale-110 active:scale-95'
            )}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? (
              <ChevronsRight className="size-4" />
            ) : (
              <ChevronsLeft className="size-4" />
            )}
            <span className="sr-only">
              {sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            </span>
          </Button>
        </div>
      </aside>
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </>
  )
}
