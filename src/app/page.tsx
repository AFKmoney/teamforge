'use client'

import { useEffect, useCallback, useRef, useState, useMemo } from 'react'
import { IDETopBar } from '@/components/ide-top-bar'
import { IDESidebar } from '@/components/ide-sidebar'
import { IDEEditor } from '@/components/ide-editor'
import { IDEChatPanel } from '@/components/ide-chat-panel'
import { IDEBottomPanel } from '@/components/ide-bottom-panel'
import { AgentDetailDialog } from '@/components/agent-detail-dialog'
import { CommandPalette } from '@/components/command-palette'
import { KeyboardShortcutsOverlay } from '@/components/keyboard-shortcuts-overlay'
import { FileSearchOverlay } from '@/components/file-search-overlay'
import { SettingsDialog } from '@/components/settings-dialog'
import { GlobalSearchPanel } from '@/components/global-search-panel'
import { useAppStore } from '@/lib/store'
import { useAgentOrchestrator } from '@/hooks/use-agent-orchestrator'
import { useRealtimeWS } from '@/hooks/use-realtime-ws'
import { Cpu, Clock, Zap, Heart, Activity, GitBranch, Wifi, WifiOff, MessageSquare, Bot, ShieldAlert } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { cn, useHydrated } from '@/lib/utils'

export default function Home() {
  const fetchAll = useAppStore((s) => s.fetchAll)
  const fetchMessages = useAppStore((s) => s.fetchMessages)
  const currentProject = useAppStore((s) => s.currentProject)
  const agents = useAppStore((s) => s.agents)
  const tasks = useAppStore((s) => s.tasks)
  const messages = useAppStore((s) => s.messages)
  const loading = useAppStore((s) => s.loading)
  const setFileSearchOpen = useAppStore((s) => s.setFileSearchOpen)
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen)
  const saveAllFiles = useAppStore((s) => s.saveAllFiles)
  const setFindReplaceOpen = useAppStore((s) => s.setFindReplaceOpen)
  const setGoToLineOpen = useAppStore((s) => s.setGoToLineOpen)
  const setGlobalSearchOpen = useAppStore((s) => s.setGlobalSearchOpen)
  const currentBranch = useAppStore((s) => s.currentBranch)

  const aiSettings = useAppStore((s) => s.aiSettings)
  const yoloMode = useAppStore((s) => s.yoloMode)
  const mounted = useHydrated()

  // AI Model display label
  const aiModelLabel = useMemo(() => {
    if (!mounted) return 'DeepSeek'
    if (aiSettings.provider === 'zai') return 'DeepSeek'
    if (aiSettings.provider === 'nvidia') {
      const modelName = aiSettings.model.split('/').pop() || aiSettings.model
      return `NVIDIA ${modelName}`
    }
    return aiSettings.openaiCompatibleModelId || 'Custom'
  }, [mounted, aiSettings])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+P for file search
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'p') {
        e.preventDefault()
        setFileSearchOpen(true)
      }
      // Ctrl+, for settings
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        setSettingsOpen(true)
      }
      // Ctrl+Shift+S for save all
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        saveAllFiles().then(({ saved, failed }) => {
          if (failed > 0) {
            toast.error(`Failed to save ${failed} file${failed > 1 ? 's' : ''}`)
          } else if (saved > 0) {
            toast.success(`All ${saved} file${saved > 1 ? 's' : ''} saved`)
          } else {
            toast.info('No unsaved files')
          }
        })
      }
      // Ctrl+F or Ctrl+H for find & replace
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === 'f' || e.key === 'h')) {
        e.preventDefault()
        setFindReplaceOpen(true)
      }
      // Ctrl+G for go to line
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'g') {
        e.preventDefault()
        setGoToLineOpen(true)
      }
      // Ctrl+Shift+F for global search
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault()
        setGlobalSearchOpen(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [setFileSearchOpen, setSettingsOpen, saveAllFiles, setFindReplaceOpen, setGoToLineOpen, setGlobalSearchOpen])

  // Track uptime
  const startTime = useRef(Date.now())
  const [uptime, setUptime] = useState('0m')
  const [tokenHistory, setTokenHistory] = useState<number[]>([])

  // Start WebSocket real-time updates
  const { isConnected: wsConnected } = useRealtimeWS()

  // Start agent orchestrator as fallback polling (reduced to 60s when WS is active)
  useAgentOrchestrator({ pollingInterval: wsConnected ? 60000 : 30000 })

  // Hydrate AI settings from localStorage (must run after mount to avoid hydration mismatch)
  const hydrateAISettings = useAppStore((s) => s.hydrateAISettings)
  const hydrateSettings = useAppStore((s) => s.hydrateSettings)
  const hydrateYoloMode = useAppStore((s) => s.hydrateYoloMode)
  useEffect(() => {
    hydrateAISettings()
    hydrateSettings()
    hydrateYoloMode()
  }, [hydrateAISettings, hydrateSettings, hydrateYoloMode])

  // Initial data load - dynamically fetch the first project
  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Update uptime every 30 seconds and track token history
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

  // Calculate totals (must be declared before the useEffect that references it)
  const totalTokens = agents.reduce((sum, a) => sum + a.tokensUsed, 0)

  // Track token usage over time for sparkline
  useEffect(() => {
    const interval = setInterval(() => {
      setTokenHistory((prev) => {
        const next = [...prev, totalTokens]
        return next.length > 10 ? next.slice(-10) : next
      })
    }, 5000)
    return () => clearInterval(interval)
  }, [totalTokens])

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

  // Responsive state: track screen size for responsive layout decisions
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed)
  const rightPanelOpen = useAppStore((s) => s.rightPanelOpen)
  const setRightPanelOpen = useAppStore((s) => s.setRightPanelOpen)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    const checkSize = () => {
      setIsMobile(window.innerWidth < 768)
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024)
    }
    checkSize()
    window.addEventListener('resize', checkSize)
    return () => window.removeEventListener('resize', checkSize)
  }, [])

  // Auto-collapse sidebar on mobile/tablet
  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(true)
      setRightPanelOpen(false)
    } else if (isTablet) {
      setSidebarCollapsed(true)
    }
  }, [isMobile, isTablet, setSidebarCollapsed, setRightPanelOpen])

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden noise-overlay">
      {/* Top Bar */}
      <div className="animate-page-load">
        <IDETopBar />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden animate-page-load animate-page-load-delay-1 relative">
        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isMobile && mobileSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-30"
                onClick={() => setMobileSidebarOpen(false)}
              />
              <motion.div
                initial={{ x: -240 }}
                animate={{ x: 0 }}
                exit={{ x: -240 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed left-0 top-11 bottom-7 z-40"
              >
                <IDESidebar />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Sidebar - hidden on mobile, shown on tablet+ */}
        {!isMobile && <IDESidebar />}

        {/* Editor + Chat */}
        <div className="flex flex-1 overflow-hidden relative">
          <IDEEditor />
          {/* Chat panel: hidden on mobile (use floating button), toggleable on tablet, visible on desktop */}
          {(!isMobile && (isTablet ? rightPanelOpen : true)) && <IDEChatPanel />}
        </div>
      </div>

      {/* Global Search Panel */}
      <GlobalSearchPanel />

      {/* Bottom Panel */}
      <div className="animate-page-load animate-page-load-delay-2">
        <IDEBottomPanel isMobile={isMobile} />
      </div>

      {/* Floating Chat Button for Mobile */}
      <AnimatePresence>
        {isMobile && !rightPanelOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setRightPanelOpen(true)}
            className="fixed bottom-14 right-4 z-30 size-12 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center hover:bg-emerald-600 transition-colors"
          >
            <MessageSquare className="size-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Mobile Chat Panel Overlay */}
      <AnimatePresence>
        {isMobile && rightPanelOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-30"
              onClick={() => setRightPanelOpen(false)}
            />
            <motion.div
              initial={{ x: 320 }}
              animate={{ x: 0 }}
              exit={{ x: 320 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed right-0 top-11 bottom-7 z-40 w-[85vw] max-w-sm"
            >
              <IDEChatPanel />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Footer Status Bar */}
      <motion.footer
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="flex items-center h-7 px-3 border-t bg-gradient-to-r from-card/95 via-card/90 to-card/95 backdrop-blur-md shrink-0 text-[10px] text-muted-foreground gap-2.5 animate-page-load animate-page-load-delay-4"
      >
        {/* Left side - Connection with pulsing */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 cursor-default">
                {wsConnected ? (
                  <>
                    <span className="relative flex size-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full size-2 bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                    </span>
                    <Wifi className="size-3 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold status-pulse">Live</span>
                  </>
                ) : (
                  <>
                    <span className="relative flex size-2">
                      <span className="relative inline-flex rounded-full size-2 bg-amber-500 shadow-sm shadow-amber-500/50" />
                    </span>
                    <WifiOff className="size-3 text-amber-500" />
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">Polling</span>
                  </>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {wsConnected ? 'WebSocket connected — real-time updates active' : 'WebSocket disconnected — falling back to polling'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="h-3 w-px bg-border/60" />

        {/* Agents */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 hover:text-foreground/80 transition-colors cursor-default">
                <Cpu className="size-3" />
                <span className="font-medium">{activeAgents}</span>
                <span className="text-muted-foreground/60">/ {agents.length} agents</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {activeAgents} of {agents.length} agents currently active
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="h-3 w-px bg-border/60" />

        {/* Tasks progress with mini bar */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 hover:text-foreground/80 transition-colors cursor-default">
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
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {completedTasks} of {totalTasks} tasks completed ({taskCompletionPct}%)
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="h-3 w-px bg-border/60" />

        {/* Tokens with sparkline */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 hover:text-foreground/80 transition-colors cursor-default">
                <Zap className="size-3 text-amber-500" />
                <span className="font-medium">{formatTokens(totalTokens)}</span>
                <span className="text-muted-foreground/60">tokens</span>
                {/* Mini sparkline */}
                {tokenHistory.length > 1 && (
                  <div className="sparkline">
                    {tokenHistory.map((val, i) => {
                      const max = Math.max(...tokenHistory)
                      const min = Math.min(...tokenHistory)
                      const range = max - min || 1
                      const height = Math.max(2, ((val - min) / range) * 10)
                      return (
                        <div
                          key={i}
                          className="sparkline-bar"
                          style={{ height: `${height}px` }}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Total tokens used: {totalTokens.toLocaleString()}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="h-3 w-px bg-border/60" />

        {/* Uptime */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 hover:text-foreground/80 transition-colors cursor-default">
                <Clock className="size-3" />
                <span className="font-medium tabular-nums">{uptime}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Session uptime
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="h-3 w-px bg-border/60" />

        {/* AI Model Indicator */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 hover:text-foreground/80 transition-colors cursor-default">
                <Bot className="size-3 text-violet-500" />
                <span className="font-medium truncate max-w-[120px]">{aiModelLabel}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              AI Provider: {mounted ? (aiSettings.provider === 'zai' ? 'Z-AI' : aiSettings.provider === 'nvidia' ? 'NVIDIA NIM' : 'OpenAI-Compatible') : 'Z-AI'} — Model: {aiModelLabel}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="h-3 w-px bg-border/60" />

        {/* Branch */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 hover:text-foreground/80 transition-colors cursor-default">
                <GitBranch className="size-3" />
                <span className="font-medium">{currentBranch}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Current Git branch
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* YOLO Mode Indicator */}
        {mounted && yoloMode && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 cursor-default">
                  <ShieldAlert className="size-3" />
                  <span className="font-bold tracking-wider">YOLO</span>
                  <span className="relative flex size-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                    <span className="relative inline-flex rounded-full size-1.5 bg-orange-500" />
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                YOLO Mode Active — Agents auto-approve and execute tasks without confirmation
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="font-semibold text-foreground/60 tracking-tight">TeamForge IDE</span>
          <div className="h-3 w-px bg-border/60" />
          <span className="text-muted-foreground/60">v1.0.0</span>
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

      {/* File Search Overlay */}
      <FileSearchOverlay />

      {/* Settings Dialog */}
      <SettingsDialog />

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
