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
import { useAppStore } from '@/lib/store'

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
      default:
        return <DashboardOverview />
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      <DashboardSidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 lg:p-8">
          {renderPage()}
        </div>
      </main>
    </div>
  )
}
