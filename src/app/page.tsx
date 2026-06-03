'use client'

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
import { useAppStore } from '@/lib/store'
import { Cpu, Heart } from 'lucide-react'

export default function Home() {
  const currentPage = useAppStore((s) => s.currentPage)

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
      case 'settings':
        return <SettingsPanel />
      default:
        return <DashboardOverview />
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex flex-1">
        <DashboardSidebar />
        <div className="flex flex-col flex-1 min-w-0">
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
    </div>
  )
}
