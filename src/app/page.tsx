'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { IDETopBar } from '@/components/ide-top-bar'
import { IDESidebar } from '@/components/ide-sidebar'
import { IDEEditor } from '@/components/ide-editor'
import { IDEChatPanel } from '@/components/ide-chat-panel'
import { IDEBottomPanel } from '@/components/ide-bottom-panel'
import { AgentDetailDialog } from '@/components/agent-detail-dialog'
import { CommandPalette } from '@/components/command-palette'
import { KeyboardShortcutsOverlay } from '@/components/keyboard-shortcuts-overlay'
import { useAppStore } from '@/lib/store'
import { useAgentOrchestrator } from '@/hooks/use-agent-orchestrator'
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

  // Start agent orchestrator (real LLM-powered agent execution)
  useAgentOrchestrator()

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

  // Task completion percentage
  const taskCompletionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

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
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="flex items-center h-7 px-3 border-t bg-gradient-to-r from-card/95 via-card/90 to-card/95 backdrop-blur-md shrink-0 text-[10px] text-muted-foreground gap-2.5"
      >
        {/* Left side - Connection */}
        <div className="flex items-center gap-1.5">
          <span className="relative flex size-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full size-2 bg-emerald-500 shadow-sm shadow-emerald-500/50" />
          </span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Connected</span>
        </div>

        <div className="h-3 w-px bg-border/60" />

        {/* Agents */}
        <div className="flex items-center gap-1 hover:text-foreground/80 transition-colors">
          <Cpu className="size-3" />
          <span className="font-medium">{activeAgents}</span>
          <span className="text-muted-foreground/60">/ {agents.length} agents</span>
        </div>

        <div className="h-3 w-px bg-border/60" />

        {/* Tasks progress with mini bar */}
        <div className="flex items-center gap-1.5 hover:text-foreground/80 transition-colors">
          <Activity className="size-3 text-emerald-500" />
          <span className="font-medium">{completedTasks}</span>
          <span className="text-muted-foreground/60">/ {totalTasks}</span>
          {/* Mini progress bar */}
          <div className="w-12 h-1.5 rounded-full bg-muted/50 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${taskCompletionPct}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.8 }}
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
            />
          </div>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium tabular-nums">{taskCompletionPct}%</span>
        </div>

        <div className="h-3 w-px bg-border/60" />

        {/* Tokens */}
        <div className="flex items-center gap-1 hover:text-foreground/80 transition-colors">
          <Zap className="size-3 text-amber-500" />
          <span className="font-medium">{formatTokens(totalTokens)}</span>
          <span className="text-muted-foreground/60">tokens</span>
        </div>

        <div className="h-3 w-px bg-border/60" />

        {/* Uptime */}
        <div className="flex items-center gap-1 hover:text-foreground/80 transition-colors">
          <Clock className="size-3" />
          <span className="font-medium tabular-nums">{uptime}</span>
        </div>

        <div className="h-3 w-px bg-border/60" />

        {/* Branch */}
        <div className="flex items-center gap-1 hover:text-foreground/80 transition-colors">
          <GitBranch className="size-3" />
          <span className="font-medium">main</span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="font-semibold text-foreground/60 tracking-tight">TeamForge IDE</span>
          <div className="h-3 w-px bg-border/60" />
          <span className="text-muted-foreground/60">v0.6.0</span>
          <div className="h-3 w-px bg-border/60" />
          <span className="flex items-center gap-0.5">
            Made with <Heart className="size-2.5 text-red-500 fill-red-500" />
          </span>
        </div>
      </motion.footer>

      {/* Command Palette */}
      <CommandPalette />

      {/* Keyboard Shortcuts Overlay */}
      <KeyboardShortcutsOverlay />

      {/* Agent Detail Dialog */}
      <AgentDetailDialog />

      {/* Loading overlay */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="relative">
              <div className="size-12 border-2 border-emerald-500/30 rounded-full" />
              <div className="size-12 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin absolute inset-0" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Zap className="size-4 text-emerald-500" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Loading project data</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">Initializing agents and tasks...</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
