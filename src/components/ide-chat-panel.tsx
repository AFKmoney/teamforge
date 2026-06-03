'use client'

import { useAppStore } from '@/lib/store'
import { AGENT_ROLE_CONFIG, type Message, type MessageType } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  MessageSquare,
  Send,
  FileCode2,
  GitPullRequest,
  TestTube2,
  Rocket,
  AlertCircle,
  Info,
  X,
  Users,
  Loader2,
  Sparkles,
  Play,
  HelpCircle,
  BarChart3,
  FilePlus,
  TestTube,
  RocketIcon,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'

const MESSAGE_TYPE_CONFIG: Record<MessageType, { icon: React.ReactNode; color: string; bgColor: string; label: string }> = {
  chat: { icon: <MessageSquare className="size-3" />, color: 'text-foreground', bgColor: 'bg-card', label: 'Chat' },
  system: { icon: <Info className="size-3" />, color: 'text-muted-foreground', bgColor: 'bg-muted/30', label: 'System' },
  action: { icon: <AlertCircle className="size-3" />, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-500/5', label: 'Action' },
  code_change: { icon: <FileCode2 className="size-3" />, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-500/5', label: 'Code Change' },
  review_comment: { icon: <GitPullRequest className="size-3" />, color: 'text-violet-600 dark:text-violet-400', bgColor: 'bg-violet-500/5', label: 'Review' },
  test_result: { icon: <TestTube2 className="size-3" />, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-500/5', label: 'Test' },
  deploy_log: { icon: <Rocket className="size-3" />, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-500/5', label: 'Deploy' },
}

// Slash commands config
interface SlashCommand {
  command: string
  label: string
  description: string
  icon: React.ReactNode
  action: string
}

const SLASH_COMMANDS: SlashCommand[] = [
  { command: '/help', label: 'Help', description: 'Show available commands', icon: <HelpCircle className="size-3 text-blue-500" />, action: 'help' },
  { command: '/status', label: 'Status', description: 'Get current project status', icon: <BarChart3 className="size-3 text-emerald-500" />, action: 'status' },
  { command: '/create_file', label: 'Create File', description: 'Create a new file in the project', icon: <FilePlus className="size-3 text-violet-500" />, action: 'create_file' },
  { command: '/run_tests', label: 'Run Tests', description: 'Run the test suite', icon: <TestTube className="size-3 text-amber-500" />, action: 'run_tests' },
  { command: '/deploy', label: 'Deploy', description: 'Deploy to production', icon: <RocketIcon className="size-3 text-orange-500" />, action: 'deploy' },
]

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  return `${Math.floor(diffH / 24)}d ago`
}

// Quick prompt suggestions
const QUICK_PROMPTS = [
  { label: 'Status update', icon: '📊', prompt: 'Give me a status update on the current sprint' },
  { label: 'Run tests', icon: '🧪', prompt: 'Run the test suite and report results' },
  { label: 'Deploy staging', icon: '🚀', prompt: 'Deploy the latest build to staging' },
  { label: 'Code review', icon: '🔍', prompt: 'Review the latest code changes' },
]

function ChatMessage({ message }: { message: Message }) {
  const typeConfig = MESSAGE_TYPE_CONFIG[message.type] || MESSAGE_TYPE_CONFIG.chat
  const agent = message.agent
  const roleConfig = agent ? AGENT_ROLE_CONFIG[agent.role] : null
  const isSystem = message.type === 'system'
  const isCodeChange = message.type === 'code_change'

  // Parse metadata for code changes
  const metadata = useMemo(() => {
    try {
      return typeof message.metadata === 'string' ? JSON.parse(message.metadata) : message.metadata
    } catch {
      return {}
    }
  }, [message.metadata])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'px-3 py-2.5 rounded-xl mx-2 mb-1.5 transition-colors',
        typeConfig.bgColor,
        !isSystem && 'hover:bg-muted/20',
        isSystem && 'border border-border/40 bg-gradient-to-r from-muted/30 to-muted/10',
      )}
    >
      <div className="flex items-start gap-2">
        {/* Avatar */}
        {agent ? (
          <div className="size-6 rounded-md flex items-center justify-center text-sm shrink-0 mt-0.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
            {agent.avatar}
          </div>
        ) : (
          <div className="size-6 rounded bg-muted flex items-center justify-center shrink-0 mt-0.5">
            <Info className="size-3 text-muted-foreground" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            {agent && roleConfig && (
              <span className={cn('text-xs font-semibold', roleConfig.color)}>{agent.name}</span>
            )}
            {!agent && isSystem && (
              <span className="text-xs font-semibold text-muted-foreground">System</span>
            )}
            <Badge variant="outline" className={cn('text-[9px] px-1 py-0 h-4 gap-0.5', typeConfig.color)}>
              {typeConfig.icon}
              {typeConfig.label}
            </Badge>
            <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
              {formatTime(message.createdAt)}
            </span>
          </div>

          {/* Content */}
          <div className={cn(
            'text-xs leading-relaxed whitespace-pre-wrap break-words',
            isSystem ? 'text-muted-foreground' : 'text-foreground/90',
          )}>
            {message.content}
          </div>

          {/* Code change metadata */}
          {isCodeChange && metadata && (
            <div className="flex items-center gap-2 mt-1.5 text-[10px]">
              {metadata.filesChanged && (
                <span className="text-muted-foreground">{metadata.filesChanged} files</span>
              )}
              {metadata.linesAdded !== undefined && (
                <span className="text-emerald-500">+{metadata.linesAdded}</span>
              )}
              {metadata.linesRemoved !== undefined && metadata.linesRemoved > 0 && (
                <span className="text-red-500">-{metadata.linesRemoved}</span>
              )}
            </div>
          )}

          {/* Test/deploy metadata */}
          {(message.type === 'test_result' || message.type === 'deploy_log') && metadata && (
            <div className="flex items-center gap-2 mt-1.5 text-[10px]">
              {metadata.passed !== undefined && (
                <span className="text-emerald-500">{metadata.passed} passed</span>
              )}
              {metadata.failed !== undefined && Number(metadata.failed) > 0 && (
                <span className="text-red-500">{metadata.failed} failed</span>
              )}
              {metadata.environment && (
                <span className="text-muted-foreground">{metadata.environment}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export function IDEChatPanel() {
  const messages = useAppStore((s) => s.messages)
  const agents = useAppStore((s) => s.agents)
  const currentProject = useAppStore((s) => s.currentProject)
  const addMessage = useAppStore((s) => s.addMessage)
  const rightPanelOpen = useAppStore((s) => s.rightPanelOpen)
  const setRightPanelOpen = useAppStore((s) => s.setRightPanelOpen)
  const addBuildLog = useAppStore((s) => s.addBuildLog)
  const setIsRunning = useAppStore((s) => s.setIsRunning)
  const setBottomPanelOpen = useAppStore((s) => s.setBottomPanelOpen)
  const setActiveBottomTab = useAppStore((s) => s.setActiveBottomTab)

  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showSlashCommands, setShowSlashCommands] = useState(false)
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0)

  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const onlineCount = agents.filter((a) => a.status !== 'idle' && a.status !== 'sleeping').length

  // Filter slash commands based on input
  const filteredSlashCommands = useMemo(() => {
    if (!inputValue.startsWith('/')) return []
    const query = inputValue.toLowerCase()
    return SLASH_COMMANDS.filter((cmd) =>
      cmd.command.startsWith(query) || cmd.label.toLowerCase().includes(query.slice(1))
    )
  }, [inputValue])

  // Show/hide slash commands
  useEffect(() => {
    setShowSlashCommands(filteredSlashCommands.length > 0 && inputValue.startsWith('/'))
    setSelectedSlashIndex(0)
  }, [filteredSlashCommands, inputValue])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [inputValue])

  // Handle slash command execution
  const executeSlashCommand = useCallback(async (cmd: SlashCommand) => {
    setInputValue('')

    switch (cmd.action) {
      case 'help':
        addMessage({
          id: `sys_${Date.now()}`,
          projectId: currentProject?.id || 'proj_01',
          agentId: null,
          content: `Available commands:\n${SLASH_COMMANDS.map((c) => `  ${c.command} — ${c.description}`).join('\n')}`,
          type: 'system',
          metadata: {},
          createdAt: new Date().toISOString(),
        })
        break
      case 'status':
        addMessage({
          id: `sys_${Date.now()}`,
          projectId: currentProject?.id || 'proj_01',
          agentId: null,
          content: `📊 Project Status:\n• ${agents.length} agents (${onlineCount} active)\n• ${messages.length} messages in chat\n• All systems operational`,
          type: 'system',
          metadata: {},
          createdAt: new Date().toISOString(),
        })
        break
      case 'run_tests': {
        setIsRunning(true)
        setBottomPanelOpen(true)
        setActiveBottomTab('terminal')
        try {
          const res = await fetch('/api/build-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: currentProject?.id || 'proj_01',
              output: '$ bun run test\n⠋ Running test suite...\n✓ 42 tests passed\n✗ 0 tests failed\n✓ Coverage: 87.3%\n\nDone in 4.1s',
              status: 'success',
              type: 'test',
            }),
          })
          if (res.ok) {
            const log = await res.json()
            addBuildLog(log)
          }
        } catch (e) {
          console.error('Failed to run tests:', e)
        } finally {
          setIsRunning(false)
        }
        addMessage({
          id: `sys_${Date.now()}`,
          projectId: currentProject?.id || 'proj_01',
          agentId: null,
          content: '🧪 Running test suite... Results will appear in the terminal.',
          type: 'system',
          metadata: {},
          createdAt: new Date().toISOString(),
        })
        break
      }
      case 'deploy': {
        setIsRunning(true)
        setBottomPanelOpen(true)
        setActiveBottomTab('terminal')
        try {
          const res = await fetch('/api/build-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: currentProject?.id || 'proj_01',
              output: '$ bun run deploy\n⠋ Deploying to production...\n✓ Build artifacts uploaded\n✓ CDN cache purged\n✓ Deployment successful\n\nDone in 12.8s',
              status: 'success',
              type: 'deploy',
            }),
          })
          if (res.ok) {
            const log = await res.json()
            addBuildLog(log)
          }
        } catch (e) {
          console.error('Failed to deploy:', e)
        } finally {
          setIsRunning(false)
        }
        addMessage({
          id: `sys_${Date.now()}`,
          projectId: currentProject?.id || 'proj_01',
          agentId: null,
          content: '🚀 Deploying to production... Check the terminal for progress.',
          type: 'system',
          metadata: {},
          createdAt: new Date().toISOString(),
        })
        break
      }
      case 'create_file':
        addMessage({
          id: `sys_${Date.now()}`,
          projectId: currentProject?.id || 'proj_01',
          agentId: null,
          content: '📝 Use the + button in the sidebar to create a new file, or right-click a folder in the file explorer.',
          type: 'system',
          metadata: {},
          createdAt: new Date().toISOString(),
        })
        break
    }
  }, [currentProject, agents, onlineCount, messages, addMessage, addBuildLog, setIsRunning, setBottomPanelOpen, setActiveBottomTab])

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isSending) return

    // Check if it's a slash command
    if (inputValue.startsWith('/')) {
      const cmd = SLASH_COMMANDS.find((c) => c.command === inputValue.trim())
      if (cmd) {
        executeSlashCommand(cmd)
        return
      }
    }

    const msg = inputValue.trim()
    setInputValue('')
    setIsSending(true)

    try {
      // Send to AI chat API (which returns both user and AI messages)
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          projectId: currentProject?.id || 'proj_01',
        }),
      })

      if (res.ok) {
        const data = await res.json()
        // Add user message
        if (data.userMessage) {
          const userMsg = data.userMessage
          if (typeof userMsg.metadata === 'string') {
            try { userMsg.metadata = JSON.parse(userMsg.metadata) } catch { userMsg.metadata = {} }
          }
          addMessage(userMsg)
        }
        // Add AI response message
        if (data.aiMessage) {
          const aiMsg = data.aiMessage
          if (typeof aiMsg.metadata === 'string') {
            try { aiMsg.metadata = JSON.parse(aiMsg.metadata) } catch { aiMsg.metadata = {} }
          }
          addMessage(aiMsg)
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }, [inputValue, isSending, currentProject, addMessage, executeSlashCommand])

  if (!rightPanelOpen) {
    return (
      <div className="flex flex-col items-center w-10 border-l bg-card/50 py-2 gap-1 shrink-0">
        <Button
          size="icon"
          variant="ghost"
          className="size-8"
          onClick={() => setRightPanelOpen(true)}
        >
          <MessageSquare className="size-4" />
        </Button>
        <div className="relative flex size-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
        </div>
        {messages.length > 0 && (
          <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3">
            {messages.length}
          </Badge>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col w-80 border-l bg-gradient-to-b from-card/60 to-card/40 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-9 border-b bg-card/50 shrink-0">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="size-3.5 text-emerald-500/70" />
          <span className="text-xs font-semibold text-foreground">Team Chat</span>
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 gap-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
            <Users className="size-2.5" />
            {onlineCount}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-6 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
            title="Run Task"
          >
            <Play className="size-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-6"
            onClick={() => setRightPanelOpen(false)}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="py-2">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
          </AnimatePresence>
          {isSending && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 px-5 py-2 text-xs text-muted-foreground"
            >
              <Loader2 className="size-3 animate-spin" />
              <span>Agent is thinking...</span>
            </motion.div>
          )}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground px-4">
              <div className="size-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3">
                <Sparkles className="size-5 text-emerald-500" />
              </div>
              <p className="text-xs font-medium text-foreground mb-1">Team Chat</p>
              <p className="text-[10px] text-center text-muted-foreground/70 mb-4">
                Talk to your AI dev team. Ask for updates, assign tasks, or request code reviews.
              </p>
              <div className="grid grid-cols-2 gap-1.5 w-full">
                {QUICK_PROMPTS.map((qp) => (
                  <button
                    key={qp.label}
                    onClick={() => { setInputValue(qp.prompt) }}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-muted/40 hover:bg-muted/70 text-[10px] text-foreground/80 transition-colors text-left"
                  >
                    <span>{qp.icon}</span>
                    <span className="truncate">{qp.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Slash commands popup */}
      <AnimatePresence>
        {showSlashCommands && filteredSlashCommands.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="border-t bg-card/95 backdrop-blur-sm"
          >
            <div className="p-1.5 space-y-0.5">
              <div className="px-2 py-1 text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">
                Commands
              </div>
              {filteredSlashCommands.map((cmd, i) => (
                <button
                  key={cmd.command}
                  onClick={() => executeSlashCommand(cmd)}
                  className={cn(
                    'flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs transition-colors',
                    i === selectedSlashIndex ? 'bg-emerald-500/10 text-foreground' : 'hover:bg-muted/50 text-foreground/80',
                  )}
                >
                  {cmd.icon}
                  <div className="flex-1 min-w-0 text-left">
                    <span className="font-medium">{cmd.command}</span>
                    <span className="text-muted-foreground ml-1.5">{cmd.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message input */}
      <div className="p-2 border-t shrink-0 bg-card/30">
        <div className="flex items-end gap-1.5">
          <textarea
            ref={textareaRef}
            placeholder="Message the team... (/ for commands)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
              // Navigate slash commands with arrow keys
              if (showSlashCommands) {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setSelectedSlashIndex((prev) => Math.min(prev + 1, filteredSlashCommands.length - 1))
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setSelectedSlashIndex((prev) => Math.max(prev - 1, 0))
                }
                if (e.key === 'Tab' && filteredSlashCommands.length > 0) {
                  e.preventDefault()
                  executeSlashCommand(filteredSlashCommands[selectedSlashIndex])
                }
              }
            }}
            rows={1}
            className="flex-1 bg-muted/40 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-emerald-500/40 transition-all resize-none max-h-[120px] font-mono border border-transparent focus:border-emerald-500/20"
          />
          <Button
            size="icon"
            variant="ghost"
            className={cn(
              'size-7 shrink-0 transition-colors mb-0.5',
              inputValue.trim()
                ? 'text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10'
                : 'text-muted-foreground/40',
            )}
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending}
          >
            {isSending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          </Button>
        </div>
        <div className="flex items-center justify-between mt-1 px-1">
          <span className="text-[9px] text-muted-foreground/50">
            {inputValue.startsWith('/') ? 'Tab to select · Enter to run' : 'Enter to send · Shift+Enter for new line'}
          </span>
          <span className="text-[9px] text-muted-foreground/50">{inputValue.length}/500</span>
        </div>
      </div>
    </div>
  )
}
