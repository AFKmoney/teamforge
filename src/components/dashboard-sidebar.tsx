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
} from 'lucide-react'
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
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { Cpu } from 'lucide-react'

const navItems: { page: Page; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'agents', label: 'Agents', icon: Users },
  { page: 'evolution', label: 'Evolution', icon: Dna },
  { page: 'memory', label: 'Memory', icon: Database },
  { page: 'knowledge', label: 'Knowledge', icon: Network },
  { page: 'research', label: 'Research', icon: FlaskConical },
  { page: 'benchmarks', label: 'Benchmarks', icon: BarChart3 },
  { page: 'safety', label: 'Safety', icon: Shield },
  { page: 'chat', label: 'Chat', icon: MessageSquare },
]

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
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = currentPage === item.page

        const button = (
          <button
            key={item.page}
            onClick={() => onNavigate(item.page)}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 w-full',
              'hover:bg-accent/50 hover:text-accent-foreground',
              isActive
                ? 'bg-accent text-accent-foreground border-l-2 border-l-emerald-500'
                : 'text-muted-foreground border-l-2 border-l-transparent',
              collapsed && 'justify-center px-2'
            )}
          >
            <Icon className={cn('shrink-0', collapsed ? 'size-5' : 'size-4')} />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </button>
        )

        if (collapsed) {
          return (
            <TooltipProvider key={item.page} delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {item.label}
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

  // Mobile: Sheet-based sidebar
  if (isMobile) {
    return (
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-3 left-3 z-40 md:hidden"
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
            </SheetTitle>
          </SheetHeader>
          <Separator />
          <ScrollArea className="flex-1 py-2">
            <SidebarNavContent
              collapsed={false}
              currentPage={currentPage}
              onNavigate={handleNavigate}
            />
          </ScrollArea>
          <Separator />
          <div className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="relative flex size-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500" />
              </span>
              <span>System Online</span>
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
        'hidden md:flex flex-col border-r bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 transition-all duration-300 shrink-0',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-3 p-4', sidebarCollapsed && 'justify-center px-2')}>
        <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-500/10 shrink-0">
          <Cpu className="size-5 text-emerald-500" />
        </div>
        {!sidebarCollapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-base font-bold leading-tight tracking-tight">EvoAI</span>
            <span className="text-[11px] text-muted-foreground leading-tight truncate">
              Self-Evolving System
            </span>
          </div>
        )}
      </div>

      <Separator />

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
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="relative flex size-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500" />
            </span>
            <span>System Online</span>
          </div>
        ) : (
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
        )}
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-foreground"
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
