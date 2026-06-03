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
import { ActivityPanel } from '@/components/activity-panel'
import { useAppStore, type Page } from '@/lib/store'
import { useRealtimeService } from '@/hooks/use-realtime'
import { CommandPalette, CommandPaletteBadge } from '@/components/command-palette'
import { Cpu, Heart } from 'lucide-react'

// Navigation shortcut mapping (Alt+1 through Alt+9)
const SHORTCUT_PAGES: Page[] = [
  'dashboard', 'agents', 'evolution', 'memory', 'knowledge',
  'topology', 'research', 'benchmarks', 'safety',
]

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
        return <DashboardOverview />
      case 'agents':
        return <AgentsPanel />
      case 'evolution':
        return <EvolutionPanel />
      case 'memory':
        return <MemoryPanel />
      case 'knowledge':
        return <KnowledgePanel />
      case 'research':
        return <ResearchPanel />
      case 'benchmarks':
        return <BenchmarksPanel />
      case 'safety':
        return <SafetyPanel />
      case 'chat':
        return <ChatPanel />
      case 'activity':
        return <ActivityPanel />
      case 'settings':
        return <SettingsPanel />
      case 'topology':
        return <TopologyPanel />
      default:
        return <DashboardOverview />
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex flex-1">
        <DashboardSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          {/* Header with ⌘K badge */}
          <header className="flex items-center justify-between border-b bg-background/50 backdrop-blur-sm px-4 md:px-6 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Cpu className="size-4 text-emerald-500" />
              <span className="font-medium text-foreground">EvoAI</span>
            </div>
            <CommandPaletteBadge />
          </header>
          <main className="flex-1 overflow-auto">
            <div className="p-4 md:p-6 lg:p-8">
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
    </div>
  )
}
