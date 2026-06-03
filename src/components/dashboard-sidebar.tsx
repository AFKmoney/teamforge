'use client'

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
  HardDrive,
  Wifi,
  Activity,
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
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { NotificationBell } from '@/components/notification-bell'

const navItems: { page: Page; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
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
  { page: 'activity', label: 'Activity', icon: Activity },
  { page: 'settings', label: 'Settings', icon: Settings },
]

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
// Sidebar Nav Content
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
  return (
    <nav className="flex flex-col gap-1 px-2">
      {navItems.map((item, index) => {
        const Icon = item.icon
        const isActive = currentPage === item.page

        const button = (
          <button
            key={item.page}
            onClick={() => onNavigate(item.page)}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 w-full group',
              'hover:bg-accent/30 hover:translate-x-0.5',
              isActive
                ? 'bg-gradient-to-r from-emerald-500/10 to-transparent border-l-2 border-l-emerald-500 shadow-[inset_2px_0_4px_rgba(16,185,129,0.15)] text-foreground'
                : 'text-muted-foreground border-l-2 border-l-transparent hover:text-foreground',
              collapsed && 'justify-center px-2 hover:translate-x-0'
            )}
          >
            <Icon className={cn(
              'shrink-0 transition-colors',
              collapsed ? 'size-5' : 'size-4',
              isActive ? 'text-emerald-600 dark:text-emerald-400' : ''
            )} />
            {!collapsed && (
              <>
                <span className="truncate flex-1">{item.label}</span>
                {/* Keyboard shortcut badge */}
                {index < 9 && (
                  <span className={cn(
                    'text-[9px] px-1 py-0.5 rounded font-mono leading-none transition-colors',
                    isActive
                      ? 'text-emerald-600/50 dark:text-emerald-400/50'
                      : 'text-muted-foreground/40'
                  )}>
                    {index + 1}
                  </span>
                )}
              </>
            )}
          </button>
        )

        if (collapsed) {
          return (
            <TooltipProvider key={item.page} delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  <div className="flex items-center gap-2">
                    {item.label}
                    {index < 9 && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-muted font-mono">{index + 1}</span>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        }

        return button
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

  // Mobile: Sheet-based sidebar
  if (isMobile) {
    return (
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-3 left-3 z-40 md:hidden bg-background/80 backdrop-blur-sm border shadow-sm"
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
            <SidebarNavContent
              collapsed={false}
              currentPage={currentPage}
              onNavigate={handleNavigate}
            />
          </ScrollArea>
          <Separator />
          <div className="p-4 flex flex-col gap-3">
            {/* Mini Status Dashboard */}
            <div className="space-y-1.5 p-2 rounded-lg bg-muted/20 border border-border/30">
              <MiniStatusBar value={cpuValue} label="CPU" color="bg-emerald-500/70" />
              <MiniStatusBar value={memValue} label="MEM" color="bg-amber-500/70" />
              <MiniStatusBar value={netValue} label="NET" color="bg-sky-500/70" />
            </div>
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
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop: Persistent sidebar
  return (
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
            {/* Mini Status Dashboard */}
            <div className="space-y-1.5 p-2 rounded-lg bg-muted/20 border border-border/30 w-full">
              <MiniStatusBar value={cpuValue} label="CPU" color="bg-emerald-500/70" />
              <MiniStatusBar value={memValue} label="MEM" color="bg-amber-500/70" />
              <MiniStatusBar value={netValue} label="NET" color="bg-sky-500/70" />
            </div>
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
  )
}
