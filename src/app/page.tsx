'use client'

import { useEffect } from 'react'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { DashboardOverview } from '@/components/dashboard-overview'
import { AgentsPanel } from '@/components/agents-panel'
import { EvolutionPanel } from '@/components/evolution-panel'
import { MemoryPanel } from '@/components/memory-panel'
import { KnowledgePanel } from '@/components/knowledge-panel'
import { ResearchPanel } from '@/components/research-panel'
import { BenchmarksPanel } from '@/components/benchmarks-panel'
import { SafetyPanel } from '@/components/safety-panel'
import { ChatPanel } from '@/components/chat-panel'
import { SettingsPanel } from '@/components/settings-panel'
import { TopologyPanel } from '@/components/topology-panel'
import { InsightsPanel } from '@/components/insights-panel'
import { ActivityPanel } from '@/components/activity-panel'
import { ErrorBoundary } from '@/components/error-boundary'
import { PanelErrorFallback } from '@/components/panel-error-fallback'
import { Toaster } from '@/components/ui/sonner'
import { useAppStore, type Page } from '@/lib/store'
import { useRealtimeService } from '@/hooks/use-realtime'
import { CommandPalette, CommandPaletteBadge } from '@/components/command-palette'
import { Cpu, Heart } from 'lucide-react'
import { OnboardingTour, TourHelpButton } from '@/components/onboarding-tour'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

// Navigation shortcut mapping (Alt+1 through Alt+9)
const SHORTCUT_PAGES: Page[] = [
  'dashboard', 'agents', 'evolution', 'memory', 'knowledge',
  'topology', 'research', 'benchmarks', 'safety',
]

// Page display names and section mapping for breadcrumbs
const PAGE_NAMES: Record<Page, string> = {
  dashboard: 'Dashboard',
  agents: 'Agents',
  evolution: 'Evolution',
  memory: 'Memory',
  knowledge: 'Knowledge',
  topology: 'Topology',
  insights: 'Insights',
  research: 'Research',
  benchmarks: 'Benchmarks',
  safety: 'Safety',
  chat: 'Chat',
  activity: 'Activity',
  settings: 'Settings',
}

const PAGE_SECTIONS: Record<Page, string> = {
  dashboard: 'Overview',
  agents: 'Core Systems',
  evolution: 'Core Systems',
  memory: 'Core Systems',
  knowledge: 'Intelligence',
  topology: 'Intelligence',
  insights: 'Intelligence',
  research: 'Intelligence',
  benchmarks: 'Quality',
  safety: 'Quality',
  chat: 'Tools',
  activity: 'Overview',
  settings: 'Tools',
}

// Helper to wrap a panel with ErrorBoundary
function withErrorBoundary(panel: React.ReactNode, name: string) {
  return (
    <ErrorBoundary
      fallback={(props) => <PanelErrorFallback {...props} panelName={name} />}
    >
      {panel}
    </ErrorBoundary>
  )
}

export default function Home() {
  const currentPage = useAppStore((s) => s.currentPage)
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)
  const toggleCommandPalette = useAppStore((s) => s.toggleCommandPalette)

  // Real-time service
  const { isConnected, addListener } = useRealtimeService()
  const addNotification = useAppStore((s) => s.addNotification)
  const setRealtimeConnected = useAppStore((s) => s.setRealtimeConnected)

  // Sync connection status
  useEffect(() => {
    setRealtimeConnected(isConnected)
  }, [isConnected, setRealtimeConnected])

  // Listen for notification events
  useEffect(() => {
    const unsub = addListener('notification', (event) => {
      addNotification({
        id: event.id,
        title: (event.payload.title as string) || 'System Notification',
        message: (event.payload.message as string) || '',
        severity: (event.payload.severity as 'info' | 'success' | 'warning' | 'error') || 'info',
        timestamp: event.timestamp,
        read: false,
        source: event.type,
      })
    })
    return unsub
  }, [addListener, addNotification])

  // Keyboard shortcuts: Cmd+K for command palette, Alt+1-9 for page navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      // Cmd+K / Ctrl+K for command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggleCommandPalette()
        return
      }

      // Alt+1-9 for page navigation (not in inputs)
      if (!isInput && e.altKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault()
        const idx = parseInt(e.key) - 1
        if (idx < SHORTCUT_PAGES.length) {
          setCurrentPage(SHORTCUT_PAGES[idx])
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleCommandPalette, setCurrentPage])

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return withErrorBoundary(<DashboardOverview />, 'Dashboard')
      case 'agents':
        return withErrorBoundary(<AgentsPanel />, 'Agents')
      case 'evolution':
        return withErrorBoundary(<EvolutionPanel />, 'Evolution')
      case 'memory':
        return withErrorBoundary(<MemoryPanel />, 'Memory')
      case 'knowledge':
        return withErrorBoundary(<KnowledgePanel />, 'Knowledge')
      case 'research':
        return withErrorBoundary(<ResearchPanel />, 'Research')
      case 'benchmarks':
        return withErrorBoundary(<BenchmarksPanel />, 'Benchmarks')
      case 'safety':
        return withErrorBoundary(<SafetyPanel />, 'Safety')
      case 'chat':
        return withErrorBoundary(<ChatPanel />, 'Chat')
      case 'activity':
        return withErrorBoundary(<ActivityPanel />, 'Activity')
      case 'settings':
        return withErrorBoundary(<SettingsPanel />, 'Settings')
      case 'topology':
        return withErrorBoundary(<TopologyPanel />, 'Topology')
      case 'insights':
        return withErrorBoundary(<InsightsPanel />, 'Insights')
      default:
        return withErrorBoundary(<DashboardOverview />, 'Dashboard')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex flex-1">
        <DashboardSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          {/* Header with Breadcrumbs */}
          <header className="flex items-center justify-between border-b bg-background/50 backdrop-blur-sm px-3 sm:px-4 md:px-6 py-2">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    className="flex items-center gap-1.5 cursor-pointer"
                    onClick={() => setCurrentPage('dashboard')}
                  >
                    <Cpu className="size-3.5 text-emerald-500" />
                    EvoAI
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink
                    className="cursor-pointer"
                    onClick={() => {
                      // Navigate to the first page in the same section
                      const section = PAGE_SECTIONS[currentPage]
                      const sectionFirstPage = (Object.entries(PAGE_SECTIONS) as [Page, string][])
                        .find(([, s]) => s === section)?.[0]
                      if (sectionFirstPage) setCurrentPage(sectionFirstPage)
                    }}
                  >
                    {PAGE_SECTIONS[currentPage]}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{PAGE_NAMES[currentPage]}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="flex items-center gap-2">
              <TourHelpButton />
              <CommandPaletteBadge />
            </div>
          </header>
          <main className="flex-1 overflow-auto overflow-x-hidden" data-tour="main-content">
            <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-full">
              {renderPage()}
            </div>
          </main>
          {/* Footer */}
          <footer className="border-t bg-muted/30 px-4 md:px-6 py-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Cpu className="size-3.5 text-emerald-500" />
                <span className="font-medium">EvoAI</span>
                <span className="text-border">•</span>
                <span>Self-Evolving AI System v1.0</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="relative flex size-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full size-1.5 bg-emerald-500" />
                  </span>
                  All systems operational
                </span>
                <span className="text-border">•</span>
                <span className="flex items-center gap-0.5">
                  Made with <Heart className="size-3 text-red-500 fill-red-500" /> for the future of AI
                </span>
              </div>
            </div>
          </footer>
        </div>
      </div>
      <CommandPalette />
      <OnboardingTour />
      <Toaster position="bottom-right" richColors />
    </div>
  )
}
