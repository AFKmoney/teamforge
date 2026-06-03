'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { IDETopBar } from '@/components/ide-top-bar'
import { IDESidebar } from '@/components/ide-sidebar'
import { IDEEditor } from '@/components/ide-editor'
import { IDEChatPanel } from '@/components/ide-chat-panel'
import { IDEBottomPanel } from '@/components/ide-bottom-panel'
import { useAppStore } from '@/lib/store'
import { useAgentSimulation } from '@/hooks/use-agent-simulation'
import { Cpu, Clock, Zap, Heart, Activity, GitBranch } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Home() {
  const fetchAll = useAppStore((s) => s.fetchAll)
  const fetchMessages = useAppStore((s) => s.fetchMessages)
  const currentProject = useAppStore((s) => s.currentProject)
  const agents = useAppStore((s) => s.agents)
  const tasks = useAppStore((s) => s.tasks)
  const messages = useAppStore((s) => s.messages)
  const loading = useAppStore((s) => s.loading)

  // Track uptime
  const startTime = useRef(Date.now())
  const [uptime, setUptime] = useState('0m')

  // Start agent simulation
  useAgentSimulation()

  // Initial data load
  useEffect(() => {
    fetchAll('proj_01')
  }, [fetchAll])

  // Update uptime every 30 seconds
  useEffect(() => {
    const updateUptime = () => {
      const diff = Date.now() - startTime.current
      const hours = Math.floor(diff / 3600000)
      const mins = Math.floor((diff % 3600000) / 60000)
      if (hours > 0) setUptime(`${hours}h ${mins}m`)
      else setUptime(`${mins}m`)
    }
    updateUptime()
    const interval = setInterval(updateUptime, 30000)
    return () => clearInterval(interval)
  }, [])

  // Calculate totals
  const totalTokens = agents.reduce((sum, a) => sum + a.tokensUsed, 0)
  const formatTokens = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return String(n)
  }

  const activeAgents = agents.filter((a) => a.status !== 'idle' && a.status !== 'sleeping').length
  const completedTasks = tasks.filter((t) => t.status === 'done').length
  const totalTasks = tasks.length

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top Bar */}
      <IDETopBar />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <IDESidebar />

        {/* Editor + Chat */}
        <div className="flex flex-1 overflow-hidden">
          <IDEEditor />
          <IDEChatPanel />
        </div>
      </div>

      {/* Bottom Panel */}
      <IDEBottomPanel />

      {/* Footer Status Bar */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center h-6 px-3 border-t bg-card/80 backdrop-blur-sm shrink-0 text-[10px] text-muted-foreground gap-3"
      >
        {/* Left side - Connection */}
        <div className="flex items-center gap-1.5">
          <span className="relative flex size-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full size-1.5 bg-emerald-500" />
          </span>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Live</span>
        </div>

        <span className="text-border">|</span>

        {/* Agents */}
        <div className="flex items-center gap-1">
          <Cpu className="size-2.5" />
          <span>{activeAgents}/{agents.length} agents</span>
        </div>

        <span className="text-border">|</span>

        {/* Tasks progress */}
        <div className="flex items-center gap-1">
          <Activity className="size-2.5 text-emerald-500" />
          <span>{completedTasks}/{totalTasks} done</span>
        </div>

        <span className="text-border">|</span>

        {/* Tokens */}
        <div className="flex items-center gap-1">
          <Zap className="size-2.5 text-amber-500" />
          <span>{formatTokens(totalTokens)} tokens</span>
        </div>

        <span className="text-border">|</span>

        {/* Uptime */}
        <div className="flex items-center gap-1">
          <Clock className="size-2.5" />
          <span>{uptime}</span>
        </div>

        <span className="text-border">|</span>

        {/* Branch */}
        <div className="flex items-center gap-1">
          <GitBranch className="size-2.5" />
          <span>main</span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="font-medium text-foreground/70">TeamForge IDE</span>
          <span className="text-border">|</span>
          <span>v0.4.0</span>
          <span className="text-border">|</span>
          <span className="flex items-center gap-0.5">
            Made with <Heart className="size-2.5 text-red-500 fill-red-500" />
          </span>
        </div>
      </motion.footer>

      {/* Loading overlay */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Loading project data...</span>
          </div>
        </motion.div>
      )}
    </div>
  )
}
