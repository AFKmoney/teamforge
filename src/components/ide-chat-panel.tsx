'use client'

import { useAppStore } from '@/lib/store'
import { AGENT_ROLE_CONFIG, type Message, type MessageType, type ChatSession } from '@/lib/types'
import { AI_PROVIDERS, getModelsForProvider, type AIProviderType } from '@/lib/ai-providers'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  ArrowDown,
  MessageCircle,
  Zap,
  Bot,
  ChevronDown,
  PlusCircle,
  History,
  Trash2,
  Clock,
  Copy,
  Check,
  Pencil,
  FolderOpen,
  Terminal,
  FileEdit,
  BookOpen,
  Wrench,
  RefreshCw,
  Gauge,
  Search,
  GitCommitHorizontal,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react'

// Recent commands localStorage key
const RECENT_COMMANDS_KEY = 'teamforge-recent-commands'
const MAX_RECENT_COMMANDS = 5

function loadRecentCommands(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_COMMANDS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveRecentCommands(commands: string[]) {
  try {
    localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(commands))
  } catch {
    // Ignore localStorage errors
  }
}
import { cn, useHydrated } from '@/lib/utils'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

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
  { command: '/run', label: 'Run Command', description: 'Execute a whitelisted shell command', icon: <Terminal className="size-3 text-emerald-500" />, action: 'run' },
  { command: '/edit', label: 'Edit File', description: 'AI-assisted file editing', icon: <FileEdit className="size-3 text-violet-500" />, action: 'edit' },
  { command: '/explain', label: 'Explain File', description: 'Get AI explanation of a file', icon: <BookOpen className="size-3 text-blue-500" />, action: 'explain' },
  { command: '/fix', label: 'Fix File', description: 'AI analyzes and fixes bugs/issues', icon: <Wrench className="size-3 text-red-500" />, action: 'fix' },
  { command: '/refactor', label: 'Refactor File', description: 'AI refactors for better code quality', icon: <RefreshCw className="size-3 text-teal-500" />, action: 'refactor' },
  { command: '/optimize', label: 'Optimize File', description: 'AI optimizes for performance', icon: <Gauge className="size-3 text-amber-500" />, action: 'optimize' },
  { command: '/search', label: 'Search Code', description: 'Search project files for code', icon: <Search className="size-3 text-sky-500" />, action: 'search' },
  { command: '/commit', label: 'Commit Message', description: 'Generate a commit message', icon: <GitCommitHorizontal className="size-3 text-orange-500" />, action: 'commit' },
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

// Get timestamp group label (Today, Yesterday, Older)
function getTimestampGroup(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const messageDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())

  if (messageDate.getTime() === today.getTime()) return 'Today'
  if (messageDate.getTime() === yesterday.getTime()) return 'Yesterday'
  return 'Older'
}

// Quick prompt suggestions
const QUICK_PROMPTS = [
  { label: 'Status update', icon: '📊', prompt: 'Give me a status update on the current sprint' },
  { label: 'Run tests', icon: '🧪', prompt: 'Run the test suite and report results' },
  { label: 'Deploy staging', icon: '🚀', prompt: 'Deploy the latest build to staging' },
  { label: 'Code review', icon: '🔍', prompt: 'Review the latest code changes' },
]

const REACTION_EMOJIS = ['👍', '❤️', '🎉', '🚀', '👀']

const ChatMessage = React.memo(function ChatMessage({ message }: { message: Message }) {
  const typeConfig = MESSAGE_TYPE_CONFIG[message.type] || MESSAGE_TYPE_CONFIG.chat
  const agent = message.agent
  const roleConfig = agent ? AGENT_ROLE_CONFIG[agent.role] : null
  const isSystem = message.type === 'system'
  const isCodeChange = message.type === 'code_change'
  const [showReactions, setShowReactions] = useState(false)
  const [reactions, setReactions] = useState<Record<string, number>>({})
  const [copied, setCopied] = useState(false)

  const handleReaction = (emoji: string) => {
    setReactions((prev) => {
      const next = { ...prev }
      next[emoji] = (next[emoji] || 0) + 1
      return next
    })
    setShowReactions(false)
  }

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true)
      toast.success('Message copied to clipboard')
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => {
      toast.error('Failed to copy message')
    })
  }, [message.content])

  // Format full date/time for tooltip
  const fullTimestamp = useMemo(() => {
    try {
      return new Date(message.createdAt).toLocaleString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch {
      return message.createdAt
    }
  }, [message.createdAt])

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
        'px-3 py-2.5 rounded-xl mx-2 mb-1.5 transition-colors group relative',
        typeConfig.bgColor,
        !isSystem && 'hover:bg-muted/20',
        isSystem && 'border border-border/40 bg-gradient-to-r from-muted/30 to-muted/10 system-message-accent',
      )}
      onMouseEnter={() => setShowReactions(true)}
      onMouseLeave={() => setShowReactions(false)}
    >
      {/* Message actions - emoji reactions + copy button that appear on hover */}
      <AnimatePresence>
        {showReactions && !isSystem && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute -top-3 right-3 flex items-center gap-0.5 bg-card/95 border border-border/60 rounded-full px-1 py-0.5 shadow-lg z-10"
          >
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="size-5 flex items-center justify-center rounded-full hover:bg-muted/80 text-xs transition-colors reaction-pop"
              >
                {emoji}
              </button>
            ))}
            <div className="w-px h-3 bg-border/40 mx-0.5" />
            <button
              onClick={handleCopy}
              className="size-5 flex items-center justify-center rounded-full hover:bg-muted/80 text-muted-foreground/60 hover:text-foreground transition-colors"
              title="Copy message"
            >
              {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Show active reactions */}
      {Object.keys(reactions).length > 0 && (
        <div className="flex items-center gap-1 mb-1.5">
          {Object.entries(reactions).map(([emoji, count]) => (
            <span
              key={emoji}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-muted/50 text-[10px] border border-border/30"
            >
              <span>{emoji}</span>
              <span className="text-muted-foreground">{count}</span>
            </span>
          ))}
        </div>
      )}

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
            {/* Show provider/model badge for AI messages */}
            {metadata?.sender === 'ai' && metadata?.provider && (
              <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 gap-0.5 text-muted-foreground">
                <Bot className="size-2" />
                {metadata.provider === 'zai' ? 'Z-AI' : metadata.provider === 'nvidia' ? 'NVIDIA' : 'Custom'}
              </Badge>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[10px] text-muted-foreground ml-auto shrink-0 cursor-default">
                  {formatTime(message.createdAt)}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[10px]">
                {fullTimestamp}
              </TooltipContent>
            </Tooltip>
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
})

/** Model selector dropdown for the chat input area */
function ModelSelector() {
  const aiSettings = useAppStore((s) => s.aiSettings)
  const updateAISettings = useAppStore((s) => s.updateAISettings)
  const [isOpen, setIsOpen] = useState(false)
  const mounted = useHydrated()

  const currentProvider = AI_PROVIDERS.find((p) => p.type === aiSettings.provider)
  const currentModels = getModelsForProvider(aiSettings.provider)

  // Determine the display label
  const displayLabel = useMemo(() => {
    if (aiSettings.provider === 'nvidia') {
      const model = currentModels.find((m) => m.id === aiSettings.model)
      return model?.name || aiSettings.model.split('/').pop() || aiSettings.model
    }
    if (aiSettings.provider === 'openai-compatible') {
      return aiSettings.openaiCompatibleModelId === 'custom' ? 'Custom' : aiSettings.openaiCompatibleModelId
    }
    return 'DeepSeek'
  }, [aiSettings, currentModels])

  // Provider icon
  const providerIcon = useMemo(() => {
    switch (aiSettings.provider) {
      case 'nvidia': return <Zap className="size-3 text-green-500" />
      case 'openai-compatible': return <Sparkles className="size-3 text-violet-500" />
      default: return <Bot className="size-3 text-emerald-500" />
    }
  }, [aiSettings.provider])

  // Has required API key?
  const hasRequiredKey = useMemo(() => {
    if (aiSettings.provider === 'zai') return true
    if (aiSettings.provider === 'nvidia') return !!aiSettings.nvidiaApiKey
    return !!aiSettings.openaiCompatibleBaseUrl
  }, [aiSettings])

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1 px-1.5 py-1 rounded-md text-[10px] transition-colors border',
          (mounted && hasRequiredKey)
            ? 'border-border/50 hover:bg-muted/50 text-foreground/70'
            : mounted && !hasRequiredKey
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-600'
              : 'border-border/50 hover:bg-muted/50 text-foreground/70',
        )}
      >
        {mounted ? providerIcon : <Bot className="size-3 text-emerald-500" />}
        <span className="max-w-[60px] truncate">{mounted ? displayLabel : 'DeepSeek'}</span>
        <ChevronDown className={cn('size-2.5 transition-transform', isOpen && 'rotate-180')} />
        {mounted && !hasRequiredKey && (
          <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              className="absolute bottom-full left-0 mb-1 w-64 bg-card border border-border/60 rounded-lg shadow-xl z-50 overflow-hidden"
            >
              {/* Provider section */}
              <div className="p-1.5 border-b border-border/40">
                <div className="px-2 py-1 text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">
                  Provider
                </div>
                {AI_PROVIDERS.map((p) => (
                  <button
                    key={p.type}
                    onClick={() => {
                      const defaultModel = getModelsForProvider(p.type)[0]?.id || 'deepseek-chat'
                      updateAISettings({ provider: p.type, model: defaultModel })
                    }}
                    className={cn(
                      'flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs transition-colors',
                      aiSettings.provider === p.type
                        ? 'bg-emerald-500/10 text-foreground'
                        : 'hover:bg-muted/50 text-foreground/80',
                    )}
                  >
                    {p.type === 'zai' && <Bot className="size-3 text-emerald-500" />}
                    {p.type === 'nvidia' && <Zap className="size-3 text-green-500" />}
                    {p.type === 'openai-compatible' && <Sparkles className="size-3 text-violet-500" />}
                    <div className="flex-1 text-left">
                      <span className="font-medium">{p.label}</span>
                    </div>
                    {aiSettings.provider === p.type && (
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                    )}
                  </button>
                ))}
              </div>

              {/* Model section */}
              <div className="p-1.5 max-h-64 overflow-y-auto">
                <div className="px-2 py-1 text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">
                  Models {currentModels.length > 0 && `(${currentModels.length})`}
                </div>
                {aiSettings.provider === 'openai-compatible' ? (
                  <div className="px-2 py-1.5">
                    <input
                      type="text"
                      value={aiSettings.openaiCompatibleModelId === 'custom' ? '' : aiSettings.openaiCompatibleModelId}
                      onChange={(e) => {
                        const val = e.target.value
                        updateAISettings({ model: val || 'custom', openaiCompatibleModelId: val || 'custom' })
                      }}
                      placeholder="Enter model name..."
                      className="w-full h-7 rounded-md border bg-transparent px-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500/50"
                    />
                  </div>
                ) : (
                  currentModels.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        updateAISettings({ model: m.id })
                        setIsOpen(false)
                      }}
                      className={cn(
                        'flex items-center gap-2 w-full px-2 py-1 rounded-md text-xs transition-colors',
                        aiSettings.model === m.id
                          ? 'bg-emerald-500/10 text-foreground'
                          : 'hover:bg-muted/50 text-foreground/80',
                      )}
                    >
                      <Bot className="size-3 text-muted-foreground/60 shrink-0" />
                      <div className="flex-1 min-w-0 text-left">
                        <div className="font-medium truncate">{m.name}</div>
                        {m.description && (
                          <div className="text-[8px] text-muted-foreground/50 truncate">{m.description}</div>
                        )}
                      </div>
                      {aiSettings.model === m.id && (
                        <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>

              {/* Warning for missing API key */}
              {!hasRequiredKey && (
                <div className="px-2 py-1.5 border-t border-border/40 bg-amber-500/5">
                  <p className="text-[9px] text-amber-600 dark:text-amber-400">
                    ⚠️ API key required — set it in Settings → AI
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

/** AI Status Bar for chat panel - shows provider/model, connection status, and token estimate */
function ChatAIStatusBar({ messages }: { messages: Message[] }) {
  const aiSettings = useAppStore((s) => s.aiSettings)
  const mounted = useHydrated()

  // Determine provider display info
  const providerInfo = useMemo(() => {
    if (!mounted) return { label: 'DeepSeek', icon: <Bot className="size-2.5 text-emerald-500" />, color: 'text-emerald-500' }
    switch (aiSettings.provider) {
      case 'nvidia': {
        const models = getModelsForProvider('nvidia')
        const model = models.find((m) => m.id === aiSettings.model)
        return {
          label: model?.name || aiSettings.model.split('/').pop() || 'NVIDIA',
          icon: <Zap className="size-2.5 text-green-500" />,
          color: 'text-green-500',
        }
      }
      case 'openai-compatible':
        return {
          label: aiSettings.openaiCompatibleModelId === 'custom' ? 'OpenAI' : aiSettings.openaiCompatibleModelId,
          icon: <Sparkles className="size-2.5 text-violet-500" />,
          color: 'text-violet-500',
        }
      default:
        return {
          label: 'DeepSeek',
          icon: <Bot className="size-2.5 text-emerald-500" />,
          color: 'text-emerald-500',
        }
    }
  }, [aiSettings, mounted])

  // Connection status: green=connected, yellow=testing/no-key, red=error
  const connectionStatus = useMemo(() => {
    if (!mounted) return 'connected' as const
    if (aiSettings.provider === 'zai') return 'connected' as const
    if (aiSettings.provider === 'nvidia') {
      return aiSettings.nvidiaApiKey ? 'connected' as const : 'nokey' as const
    }
    if (aiSettings.provider === 'openai-compatible') {
      return aiSettings.openaiCompatibleBaseUrl ? 'connected' as const : 'nokey' as const
    }
    return 'connected' as const
  }, [aiSettings, mounted])

  // Estimate tokens (rough: ~4 chars per token)
  const estimatedTokens = useMemo(() => {
    const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0)
    return Math.round(totalChars / 4)
  }, [messages])

  const statusDotColor = connectionStatus === 'connected'
    ? 'bg-emerald-500'
    : connectionStatus === 'nokey'
      ? 'bg-amber-500'
      : 'bg-red-500'

  const statusTooltip = connectionStatus === 'connected'
    ? 'Connected'
    : connectionStatus === 'nokey'
      ? 'No API key configured'
      : 'Connection error'

  if (!mounted) return null

  return (
    <div className="flex items-center gap-2 px-3 h-6 border-b bg-muted/10 shrink-0 text-[9px]">
      {/* Provider/Model badge */}
      <Badge variant="outline" className={cn('text-[8px] px-1.5 py-0 h-3.5 gap-0.5', providerInfo.color)}>
        {providerInfo.icon}
        <span className="max-w-[80px] truncate">{providerInfo.label}</span>
      </Badge>

      {/* Connection status indicator */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            <span className={cn('size-1.5 rounded-full shrink-0', statusDotColor)} />
            <span className="text-muted-foreground/60">{statusTooltip}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-[10px]">
          AI Provider: {providerInfo.label} — {statusTooltip}
        </TooltipContent>
      </Tooltip>

      <div className="flex-1" />

      {/* Token counter */}
      <div className="flex items-center gap-0.5 text-muted-foreground/50">
        <BarChart3 className="size-2" />
        <span className="tabular-nums">~{estimatedTokens > 1000 ? `${(estimatedTokens / 1000).toFixed(1)}k` : estimatedTokens} tok</span>
      </div>
    </div>
  )
}

/** Chat history dropdown — similar pattern to ModelSelector */
function ChatHistoryDropdown({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const chatSessions = useAppStore((s) => s.chatSessions)
  const currentChatSessionId = useAppStore((s) => s.currentChatSessionId)
  const setCurrentChatSessionId = useAppStore((s) => s.setCurrentChatSessionId)
  const removeChatSession = useAppStore((s) => s.removeChatSession)
  const fetchMessages = useAppStore((s) => s.fetchMessages)
  const fetchChatSessions = useAppStore((s) => s.fetchChatSessions)
  const setMessages = useAppStore((s) => s.setMessages)
  const updateChatSession = useAppStore((s) => s.updateChatSession)

  // Rename state
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const handleSwitchSession = useCallback(async (sessionId: string) => {
    setCurrentChatSessionId(sessionId)
    // Fetch messages for the selected session
    await fetchMessages()
    onClose()
  }, [setCurrentChatSessionId, fetchMessages, onClose])

  const handleStartRename = useCallback((sessionId: string, currentTitle: string) => {
    setRenamingSessionId(sessionId)
    setRenameValue(currentTitle || 'New Chat')
  }, [])

  const handleFinishRename = useCallback(async (sessionId: string) => {
    const newTitle = renameValue.trim() || 'New Chat'
    try {
      const res = await fetch(`/api/chat-sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      })
      if (res.ok) {
        updateChatSession(sessionId, { title: newTitle })
        toast.success('Chat renamed')
      } else {
        toast.error('Failed to rename chat')
      }
    } catch {
      toast.error('Failed to rename chat')
    }
    setRenamingSessionId(null)
    setRenameValue('')
  }, [renameValue, updateChatSession])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute bottom-full left-0 mb-1 w-72 bg-card border border-border/60 rounded-lg shadow-xl z-50 overflow-hidden"
          >
            <div className="p-1.5 border-b border-border/40 bg-muted/20">
              <div className="px-2 py-1 text-[9px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1">
                <Clock className="size-2.5" />
                Chat History ({chatSessions.length})
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto p-1 custom-scrollbar">
              {chatSessions.length === 0 ? (
                <div className="px-3 py-4 text-[10px] text-muted-foreground/60 text-center">
                  <MessageSquare className="size-5 mx-auto mb-1.5 text-muted-foreground/30" />
                  No chat sessions yet
                </div>
              ) : (
                chatSessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      'flex items-center gap-2 w-full px-2 py-2 rounded-md text-xs transition-colors group/item',
                      session.id === currentChatSessionId
                        ? 'bg-emerald-500/10 text-foreground ring-1 ring-emerald-500/20'
                        : 'hover:bg-muted/50 text-foreground/80',
                    )}
                  >
                    <MessageSquare className={cn(
                      'size-3.5 shrink-0',
                      session.id === currentChatSessionId ? 'text-emerald-500' : 'text-muted-foreground/50',
                    )} />
                    <div className="flex-1 min-w-0 text-left" onClick={() => handleSwitchSession(session.id)} style={{ cursor: 'pointer' }}>
                      {renamingSessionId === session.id ? (
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleFinishRename(session.id)
                            if (e.key === 'Escape') { setRenamingSessionId(null); setRenameValue('') }
                          }}
                          onBlur={() => handleFinishRename(session.id)}
                          autoFocus
                          className="w-full bg-transparent border-b border-emerald-500/50 text-[11px] font-medium outline-none py-0"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <>
                          <div className="font-medium truncate text-[11px] leading-tight">{session.title || 'New Chat'}</div>
                          <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/50 mt-0.5">
                            <span>{formatTime(session.updatedAt)}</span>
                            {session.messageCount !== undefined && session.messageCount > 0 && (
                              <>
                                <span className="text-border/60">·</span>
                                <span>{session.messageCount} msg{session.messageCount !== 1 ? 's' : ''}</span>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    {session.id === currentChatSessionId && renamingSessionId !== session.id && (
                      <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                    )}
                    {/* Action buttons */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStartRename(session.id, session.title)
                        }}
                        className="size-5 flex items-center justify-center rounded hover:bg-emerald-500/10 text-muted-foreground/40 hover:text-emerald-500 transition-colors"
                        title="Rename"
                      >
                        <Pencil className="size-2.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const doDelete = async () => {
                            try {
                              const res = await fetch(`/api/chat-sessions/${session.id}`, { method: 'DELETE' })
                              if (res.ok) {
                                removeChatSession(session.id)
                                if (session.id === currentChatSessionId) {
                                  const remaining = chatSessions.filter((s) => s.id !== session.id)
                                  if (remaining.length > 0) {
                                    setCurrentChatSessionId(remaining[0].id)
                                    await fetchMessages()
                                  } else {
                                    setCurrentChatSessionId(null)
                                    setMessages([])
                                  }
                                }
                                toast.success('Chat session deleted')
                              } else {
                                toast.error('Failed to delete session')
                              }
                            } catch {
                              toast.error('Failed to delete session')
                            }
                          }
                          doDelete()
                        }}
                        className="size-5 flex items-center justify-center rounded hover:bg-red-500/10 text-muted-foreground/40 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="size-2.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export function IDEChatPanel() {
  const messages = useAppStore((s) => s.messages)
  const agents = useAppStore((s) => s.agents)
  const currentProject = useAppStore((s) => s.currentProject)
  const addMessage = useAppStore((s) => s.addMessage)
  const setMessages = useAppStore((s) => s.setMessages)
  const rightPanelOpen = useAppStore((s) => s.rightPanelOpen)
  const setRightPanelOpen = useAppStore((s) => s.setRightPanelOpen)
  const addBuildLog = useAppStore((s) => s.addBuildLog)
  const setIsRunning = useAppStore((s) => s.setIsRunning)
  const setBottomPanelOpen = useAppStore((s) => s.setBottomPanelOpen)
  const setActiveBottomTab = useAppStore((s) => s.setActiveBottomTab)
  const fetchTasks = useAppStore((s) => s.fetchTasks)
  const updateAgent = useAppStore((s) => s.updateAgent)
  const aiSettings = useAppStore((s) => s.aiSettings)
  const yoloMode = useAppStore((s) => s.yoloMode)

  // Chat session state
  const chatSessions = useAppStore((s) => s.chatSessions)
  const currentChatSessionId = useAppStore((s) => s.currentChatSessionId)
  const setCurrentChatSessionId = useAppStore((s) => s.setCurrentChatSessionId)
  const addChatSession = useAppStore((s) => s.addChatSession)
  const updateChatSession = useAppStore((s) => s.updateChatSession)
  const fetchMessages = useAppStore((s) => s.fetchMessages)
  const fetchChatSessions = useAppStore((s) => s.fetchChatSessions)
  const fetchFiles = useAppStore((s) => s.fetchFiles)

  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showSlashCommands, setShowSlashCommands] = useState(false)
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0)
  const [isScrolledUp, setIsScrolledUp] = useState(false)
  const [recentCommands, setRecentCommands] = useState<string[]>(() => loadRecentCommands())

  // Add a command to the recent commands list
  const addRecentCommand = useCallback((command: string) => {
    setRecentCommands((prev) => {
      const filtered = prev.filter((c) => c !== command)
      const next = [command, ...filtered].slice(0, MAX_RECENT_COMMANDS)
      saveRecentCommands(next)
      return next
    })
  }, [])

  // Build context-aware suggestion order
  const activeFileId = useAppStore((s) => s.activeFileId)
  const files = useAppStore((s) => s.files)
  const buildLogs = useAppStore((s) => s.buildLogs)

  const contextAwareCommandOrder = useMemo(() => {
    // Commands that should be prioritized in different contexts
    const hasActiveFile = !!activeFileId
    const lastBuildFailed = buildLogs.length > 0 && buildLogs[0]?.status === 'failed'

    // Priority commands based on context
    const priorityCommands: string[] = []

    if (lastBuildFailed) {
      // If build just failed, suggest /run bun run lint first
      priorityCommands.push('/run', '/fix', '/explain')
    }

    if (hasActiveFile) {
      // If user has a file open, suggest file-related commands
      const fileCommands = ['/explain', '/fix', '/refactor']
      for (const cmd of fileCommands) {
        if (!priorityCommands.includes(cmd)) {
          priorityCommands.push(cmd)
        }
      }
    }

    return priorityCommands
  }, [activeFileId, buildLogs])
  const [runTaskDialogOpen, setRunTaskDialogOpen] = useState(false)
  const [runTaskTitle, setRunTaskTitle] = useState('')
  const [runTaskAssigneeId, setRunTaskAssigneeId] = useState('')
  const [runTaskIsCreating, setRunTaskIsCreating] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitleValue, setEditTitleValue] = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const onlineCount = agents.filter((a) => a.status !== 'idle' && a.status !== 'sleeping').length

  // Fetch chat sessions on mount
  useEffect(() => {
    if (currentProject?.id) {
      fetchChatSessions()
    }
  }, [currentProject?.id, fetchChatSessions])

  // Current session title for display
  const currentSessionTitle = useMemo(() => {
    if (!currentChatSessionId) return 'Team Chat'
    const session = chatSessions.find((s) => s.id === currentChatSessionId)
    return session?.title || 'Team Chat'
  }, [currentChatSessionId, chatSessions])

  // Handle double-click to edit session title
  const handleDoubleClickTitle = useCallback(() => {
    if (!currentChatSessionId) return
    setIsEditingTitle(true)
    setEditTitleValue(currentSessionTitle)
  }, [currentChatSessionId, currentSessionTitle])

  const handleFinishEditTitle = useCallback(async () => {
    const newTitle = editTitleValue.trim() || 'New Chat'
    setIsEditingTitle(false)
    if (newTitle === currentSessionTitle) return
    if (!currentChatSessionId) return
    try {
      const res = await fetch(`/api/chat-sessions/${currentChatSessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      })
      if (res.ok) {
        updateChatSession(currentChatSessionId, { title: newTitle })
        toast.success('Chat title updated')
      } else {
        toast.error('Failed to update title')
      }
    } catch {
      toast.error('Failed to update title')
    }
    setEditTitleValue('')
  }, [editTitleValue, currentSessionTitle, currentChatSessionId, updateChatSession])

  // Session switch animation key
  const sessionKey = currentChatSessionId || 'no-session'

  // Handle new chat
  const handleNewChat = useCallback(async () => {
    try {
      const res = await fetch('/api/chat-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject?.id || '',
          title: 'New Chat',
        }),
      })
      if (res.ok) {
        const session = await res.json()
        addChatSession(session)
        setCurrentChatSessionId(session.id)
        setMessages([])
        toast.success('New chat started')
      } else {
        toast.error('Failed to create new chat')
      }
    } catch {
      toast.error('Failed to create new chat')
    }
  }, [currentProject, addChatSession, setCurrentChatSessionId, setMessages])

  // Run task handler
  const handleRunTask = useCallback(async () => {
    if (!runTaskTitle.trim()) return
    setRunTaskIsCreating(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject?.id || '',
          title: runTaskTitle.trim(),
          status: 'in_progress',
          assigneeId: runTaskAssigneeId || undefined,
          priority: 'high',
          type: 'feature',
        }),
      })
      if (res.ok) {
        const task = await res.json()
        await fetchTasks()
        // Set the assigned agent to 'thinking' status
        if (task.assigneeId) {
          const agentRes = await fetch(`/api/agents/${task.assigneeId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'thinking', currentTaskId: task.id }),
          })
          if (agentRes.ok) {
            const updatedAgent = await agentRes.json()
            updateAgent(updatedAgent.id, { status: 'thinking', currentTaskId: task.id })
          }
        }
        addMessage({
          id: `sys_${Date.now()}`,
          projectId: currentProject?.id || '',
          agentId: null,
          content: `▶️ Task "${runTaskTitle.trim()}" assigned and started${task.assigneeId ? `. Agent is now working on it.` : '.'}`,
          type: 'system',
          metadata: {} as Record<string, unknown>,
          createdAt: new Date().toISOString(),
        })
        toast.success('Task started successfully')
        setRunTaskTitle('')
        setRunTaskAssigneeId('')
        setRunTaskDialogOpen(false)
      } else {
        toast.error('Failed to create task')
      }
    } catch {
      toast.error('Failed to create task')
    } finally {
      setRunTaskIsCreating(false)
    }
  }, [runTaskTitle, runTaskAssigneeId, currentProject, fetchTasks, updateAgent, addMessage])

  // Recent slash commands as SlashCommand objects
  const recentSlashCommands = useMemo(() => {
    return recentCommands
      .map((cmd) => SLASH_COMMANDS.find((c) => c.command === cmd))
      .filter((c): c is SlashCommand => !!c)
  }, [recentCommands])

  // Filter slash commands based on input, with context-aware ordering
  const filteredSlashCommands = useMemo(() => {
    if (!inputValue.startsWith('/')) return []
    const query = inputValue.toLowerCase()
    const filtered = SLASH_COMMANDS.filter((cmd) =>
      cmd.command.startsWith(query) || cmd.label.toLowerCase().includes(query.slice(1))
    )

    // Sort by context-aware priority: priority commands first, then alphabetical
    const sorted = [...filtered].sort((a, b) => {
      const aIdx = contextAwareCommandOrder.indexOf(a.command)
      const bIdx = contextAwareCommandOrder.indexOf(b.command)
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
      if (aIdx !== -1) return -1
      if (bIdx !== -1) return 1
      return 0
    })

    return sorted
  }, [inputValue, contextAwareCommandOrder])

  // Flat list of visible commands for keyboard navigation (recent first, then non-recent)
  const visibleSlashCommands = useMemo(() => {
    const recentFiltered = recentSlashCommands.filter((cmd) =>
      filteredSlashCommands.some((f) => f.command === cmd.command)
    )
    const nonRecent = filteredSlashCommands.filter((cmd) =>
      !recentSlashCommands.some((r) => r.command === cmd.command)
    )
    return [
      ...recentFiltered.map((cmd) => ({ cmd, isRecent: true })),
      ...nonRecent.map((cmd) => ({ cmd, isRecent: false })),
    ]
  }, [filteredSlashCommands, recentSlashCommands])

  // Show/hide slash commands
  useEffect(() => {
    setShowSlashCommands(filteredSlashCommands.length > 0 && inputValue.startsWith('/'))
    setSelectedSlashIndex(0)
  }, [filteredSlashCommands, inputValue])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current && !isScrolledUp) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isScrolledUp])

  // Track scroll position for "scroll to bottom" button
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 60
    setIsScrolledUp(!isAtBottom)
  }, [])

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      setIsScrolledUp(false)
    }
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [inputValue])

  // Listen for chat prefill events (from agent detail dialog)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (typeof detail === 'string') {
        setInputValue(detail)
        setTimeout(() => { if (textareaRef.current) textareaRef.current.focus() }, 50)
      }
    }
    window.addEventListener('teamforge-chat-prefill', handler)
    return () => window.removeEventListener('teamforge-chat-prefill', handler)
  }, [])

  // Handle slash command execution
  const executeSlashCommand = useCallback(async (cmd: SlashCommand) => {
    // Save to recent commands
    addRecentCommand(cmd.command)

    setInputValue('')

    // For /run, /edit, /explain, /fix, /refactor, /optimize, /search — these are handled server-side via the AI chat API
    // so we route them through handleSend by setting the input and triggering send
    if (cmd.action === 'run' || cmd.action === 'edit' || cmd.action === 'explain' || cmd.action === 'fix' || cmd.action === 'refactor' || cmd.action === 'optimize' || cmd.action === 'search') {
      // These commands need arguments, so just set the prefix and let the user type the rest
      const prefixes: Record<string, string> = {
        run: '/run ',
        edit: '/edit ',
        explain: '/explain ',
        fix: '/fix ',
        refactor: '/refactor ',
        optimize: '/optimize ',
        search: '/search ',
      }
      setInputValue(prefixes[cmd.action] || '')
      setTimeout(() => { if (textareaRef.current) textareaRef.current.focus() }, 50)
      return
    }

    switch (cmd.action) {
      case 'help':
        addMessage({
          id: `sys_${Date.now()}`,
          projectId: currentProject?.id || '',
          agentId: null,
          content: `Available commands:\n${SLASH_COMMANDS.map((c) => `  ${c.command} — ${c.description}`).join('\n')}`,
          type: 'system',
          metadata: {} as Record<string, unknown>,
          createdAt: new Date().toISOString(),
        })
        break
      case 'status': {
        // Send /status to the AI chat endpoint for a real server-side status
        setIsSending(true)
        try {
          const res = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: '/status',
              projectId: currentProject?.id || '',
              chatSessionId: currentChatSessionId || undefined,
              provider: aiSettings.provider,
              model: aiSettings.provider === 'openai-compatible'
                ? (aiSettings.openaiCompatibleModelId || aiSettings.model)
                : aiSettings.model,
              nvidiaApiKey: aiSettings.nvidiaApiKey || undefined,
              openaiCompatibleBaseUrl: aiSettings.openaiCompatibleBaseUrl || undefined,
              openaiCompatibleApiKey: aiSettings.openaiCompatibleApiKey || undefined,
              openaiCompatibleModelId: aiSettings.openaiCompatibleModelId || undefined,
              activeFilePath: (() => {
                const state = useAppStore.getState()
                const activeId = state.activeFileId
                if (!activeId) return undefined
                const activeFile = state.files.find((f) => f.id === activeId)
                return activeFile?.path || undefined
              })(),
            }),
          })
          if (res.ok) {
            const data = await res.json()
            if (data.message) {
              const msg = data.message
              if (typeof msg.metadata === 'string') {
                try { msg.metadata = JSON.parse(msg.metadata) } catch { msg.metadata = {} }
              }
              addMessage(msg)
            }
          } else {
            // Fallback to local status
            addMessage({
              id: `sys_${Date.now()}`,
              projectId: currentProject?.id || '',
              agentId: null,
              content: `📊 Project Status:\n• ${agents.length} agents (${onlineCount} active)\n• ${messages.length} messages in chat\n• All systems operational`,
              type: 'system',
              metadata: {} as Record<string, unknown>,
              createdAt: new Date().toISOString(),
            })
          }
        } catch {
          addMessage({
            id: `sys_${Date.now()}`,
            projectId: currentProject?.id || '',
            agentId: null,
            content: `📊 Project Status:\n• ${agents.length} agents (${onlineCount} active)\n• ${messages.length} messages in chat\n• All systems operational`,
            type: 'system',
            metadata: {} as Record<string, unknown>,
            createdAt: new Date().toISOString(),
          })
        } finally {
          setIsSending(false)
        }
        break
      }
      case 'run_tests': {
        setIsRunning(true)
        setBottomPanelOpen(true)
        setActiveBottomTab('terminal')
        try {
          // Run the actual test command
          const res = await fetch('/api/build-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: currentProject?.id || '',
              output: '$ bun run lint',
              status: 'running',
              type: 'test',
            }),
          })
          if (res.ok) {
            const log = await res.json()
            addBuildLog(log)
          }
          // Actually run lint to get real results
          const lintRes = await fetch('/api/exec', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: 'bun run lint', projectId: currentProject?.id }),
          })
          const lintData = lintRes.ok ? await lintRes.json() : null
          const finalOutput = lintData?.output || 'Lint command completed.'
          // Update the build log with real output
          try {
            const updateRes = await fetch('/api/build-logs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectId: currentProject?.id || '',
                output: `$ bun run lint\n${finalOutput}`,
                status: lintData?.exitCode === 0 ? 'success' : 'warning',
                type: 'test',
              }),
            })
            if (updateRes.ok) {
              const log2 = await updateRes.json()
              addBuildLog(log2)
            }
          } catch { /* ignore */ }
        } catch (e) {
          console.error('Failed to run tests:', e)
        } finally {
          setIsRunning(false)
        }
        addMessage({
          id: `sys_${Date.now()}`,
          projectId: currentProject?.id || '',
          agentId: null,
          content: '🧪 Running lint check... Results will appear in the terminal.',
          type: 'system',
          metadata: {} as Record<string, unknown>,
          createdAt: new Date().toISOString(),
        })
        break
      }
      case 'deploy': {
        setIsRunning(true)
        setBottomPanelOpen(true)
        setActiveBottomTab('terminal')
        try {
          // Run the actual build command
          const res = await fetch('/api/build-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: currentProject?.id || '',
              output: '$ bun run build',
              status: 'running',
              type: 'deploy',
            }),
          })
          if (res.ok) {
            const log = await res.json()
            addBuildLog(log)
          }
          // Actually run the build to get real results
          const buildRes = await fetch('/api/exec', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: 'bun run build', projectId: currentProject?.id }),
          })
          const buildData = buildRes.ok ? await buildRes.json() : null
          const buildOutput = buildData?.output || 'Build command completed.'
          // Update with real output
          try {
            const updateRes = await fetch('/api/build-logs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectId: currentProject?.id || '',
                output: `$ bun run build\n${buildOutput}`,
                status: buildData?.exitCode === 0 ? 'success' : 'failed',
                type: 'deploy',
              }),
            })
            if (updateRes.ok) {
              const log2 = await updateRes.json()
              addBuildLog(log2)
            }
          } catch { /* ignore */ }
        } catch (e) {
          console.error('Failed to deploy:', e)
        } finally {
          setIsRunning(false)
        }
        addMessage({
          id: `sys_${Date.now()}`,
          projectId: currentProject?.id || '',
          agentId: null,
          content: '🚀 Running build... Check the terminal for progress.',
          type: 'system',
          metadata: {} as Record<string, unknown>,
          createdAt: new Date().toISOString(),
        })
        break
      }
      case 'create_file':
        addMessage({
          id: `sys_${Date.now()}`,
          projectId: currentProject?.id || '',
          agentId: null,
          content: '📝 Use the + button in the sidebar to create a new file, or right-click a folder in the file explorer. You can also use /create_file <path> [content] in the chat.',
          type: 'system',
          metadata: {} as Record<string, unknown>,
          createdAt: new Date().toISOString(),
        })
        break
      case 'commit': {
        // Send /commit to the AI chat endpoint for a server-side commit message
        setIsSending(true)
        try {
          const activeFile = useAppStore.getState().activeFileId
            ? useAppStore.getState().files.find((f) => f.id === useAppStore.getState().activeFileId)
            : null
          const res = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: '/commit',
              projectId: currentProject?.id || '',
              chatSessionId: currentChatSessionId || undefined,
              provider: aiSettings.provider,
              model: aiSettings.provider === 'openai-compatible'
                ? (aiSettings.openaiCompatibleModelId || aiSettings.model)
                : aiSettings.model,
              nvidiaApiKey: aiSettings.nvidiaApiKey || undefined,
              openaiCompatibleBaseUrl: aiSettings.openaiCompatibleBaseUrl || undefined,
              openaiCompatibleApiKey: aiSettings.openaiCompatibleApiKey || undefined,
              openaiCompatibleModelId: aiSettings.openaiCompatibleModelId || undefined,
              activeFilePath: activeFile?.path || undefined,
            }),
          })
          if (res.ok) {
            const data = await res.json()
            if (data.message) {
              const msg = data.message
              if (typeof msg.metadata === 'string') {
                try { msg.metadata = JSON.parse(msg.metadata) } catch { msg.metadata = {} }
              }
              addMessage(msg)
            }
          } else {
            addMessage({
              id: `sys_${Date.now()}`,
              projectId: currentProject?.id || '',
              agentId: null,
              content: '⚠️ Could not generate commit message. Please try again.',
              type: 'system',
              metadata: {} as Record<string, unknown>,
              createdAt: new Date().toISOString(),
            })
          }
        } catch {
          addMessage({
            id: `sys_${Date.now()}`,
            projectId: currentProject?.id || '',
            agentId: null,
            content: '⚠️ Could not generate commit message. Please try again.',
            type: 'system',
            metadata: {} as Record<string, unknown>,
            createdAt: new Date().toISOString(),
          })
        } finally {
          setIsSending(false)
        }
        break
      }
    }
  }, [currentProject, agents, onlineCount, messages, addMessage, addBuildLog, setIsRunning, setBottomPanelOpen, setActiveBottomTab, aiSettings, currentChatSessionId])

  // Auto-title update after first AI response
  const autoTitleUpdate = useCallback(async (sessionId: string, firstUserMessage: string) => {
    const title = firstUserMessage.slice(0, 60).trim() || 'New Chat'
    try {
      const res = await fetch(`/api/chat-sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      if (res.ok) {
        updateChatSession(sessionId, { title })
      }
    } catch {
      // Silently fail — title update is non-critical
    }
  }, [updateChatSession])

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isSending) return

    // Check if it's a slash command that should be handled locally
    if (inputValue.startsWith('/')) {
      const trimmedInput = inputValue.trim()
      const cmd = SLASH_COMMANDS.find((c) => c.command === trimmedInput)
      if (cmd) {
        executeSlashCommand(cmd)
        return
      }
      // For parameterized commands (/run <cmd>, /edit <path> <instruction>, /explain <path>, /fix <path>, /refactor <path>, /optimize <path>, /search <query>, /commit)
      // or any /status, /create_file, /deploy, /run_tests — route through the AI chat API
      const serverHandledCommands = ['/run', '/edit', '/explain', '/fix', '/refactor', '/optimize', '/search', '/commit', '/status', '/create_file', '/deploy', '/run_tests']
      const commandPart = trimmedInput.split(/\s+/)[0]
      if (serverHandledCommands.includes(commandPart)) {
        // Fall through to the AI chat API send below
      } else {
        // Unknown command — just try it via the AI chat API
        // Fall through
      }
    }

    const msg = inputValue.trim()
    setInputValue('')
    setIsSending(true)

    // Save slash command to recent list
    if (msg.startsWith('/')) {
      const commandPart = msg.split(/\s+/)[0]
      const matchingCmd = SLASH_COMMANDS.find((c) => c.command === commandPart)
      if (matchingCmd) {
        addRecentCommand(matchingCmd.command)
      }
    }

    // Track whether this is the first message in a new session for auto-title
    const isNewSession = currentChatSessionId
      ? chatSessions.find((s) => s.id === currentChatSessionId)?.title === 'New Chat'
      : false

    try {
      // Use the new multi-provider AI chat endpoint
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          projectId: currentProject?.id || '',
          chatSessionId: currentChatSessionId || undefined,
          provider: aiSettings.provider,
          model: aiSettings.provider === 'openai-compatible'
            ? (aiSettings.openaiCompatibleModelId || aiSettings.model)
            : aiSettings.model,
          nvidiaApiKey: aiSettings.nvidiaApiKey || undefined,
          openaiCompatibleBaseUrl: aiSettings.openaiCompatibleBaseUrl || undefined,
          openaiCompatibleApiKey: aiSettings.openaiCompatibleApiKey || undefined,
          openaiCompatibleModelId: aiSettings.openaiCompatibleModelId || undefined,
          yoloMode: yoloMode,
          activeFilePath: (() => {
            const state = useAppStore.getState()
            const activeId = state.activeFileId
            if (!activeId) return undefined
            const activeFile = state.files.find((f) => f.id === activeId)
            return activeFile?.path || undefined
          })(),
        }),
      })

      if (res.ok) {
        const data = await res.json()

        // Handle chat session ID from response
        if (data.chatSessionId && data.chatSessionId !== currentChatSessionId) {
          // New session was created by the server
          const newSessionId = data.chatSessionId
          // Check if we already have this session in the store
          const existingSession = chatSessions.find((s) => s.id === newSessionId)
          if (!existingSession) {
            addChatSession({
              id: newSessionId,
              projectId: currentProject?.id || '',
              title: 'New Chat',
              summary: '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              messageCount: 0,
            })
          }
          setCurrentChatSessionId(newSessionId)
        }

        // Handle slash command response (returns { message } instead of { userMessage, aiMessage })
        if (data.message && !data.userMessage) {
          const sysMsg = data.message
          if (typeof sysMsg.metadata === 'string') {
            try { sysMsg.metadata = JSON.parse(sysMsg.metadata) } catch { sysMsg.metadata = {} }
          }
          addMessage(sysMsg)
          // Refresh files if this was an /edit, /fix, /refactor, or /optimize command
          if (sysMsg.metadata?.command === 'edit' || sysMsg.metadata?.command === 'create_file' || sysMsg.metadata?.command === 'fix' || sysMsg.metadata?.command === 'refactor' || sysMsg.metadata?.command === 'optimize') {
            fetchFiles()
          }
        } else {
          // Standard chat response
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

        // Auto-title update: after first AI response in a new session, update the title
        if (isNewSession && data.chatSessionId && msg) {
          autoTitleUpdate(data.chatSessionId, msg)
        }
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        toast.error(errorData.error || 'Failed to send message')
        addMessage({
          id: `sys_${Date.now()}`,
          projectId: currentProject?.id || '',
          agentId: null,
          content: `⚠️ Error: ${errorData.error || 'Failed to get AI response'}. Check your AI provider settings.`,
          type: 'system',
          metadata: {} as Record<string, unknown>,
          createdAt: new Date().toISOString(),
        })
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      toast.error('Failed to send message')
    } finally {
      setIsSending(false)
    }
  }, [inputValue, isSending, currentProject, addMessage, executeSlashCommand, aiSettings, currentChatSessionId, chatSessions, addChatSession, setCurrentChatSessionId, autoTitleUpdate, fetchFiles])

  if (!rightPanelOpen) {
    return (
      <div className="flex flex-col items-center w-12 border-l bg-gradient-to-b from-card/80 to-card/40 py-2 gap-1.5 shrink-0">
        <Button
          size="icon"
          variant="ghost"
          className="size-9 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
          title="Open Chat"
          onClick={() => setRightPanelOpen(true)}
        >
          <MessageSquare className="size-5" />
        </Button>
        <div className="relative flex size-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
        </div>
        {messages.length > 0 && (
          <Badge variant="secondary" className="text-[8px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
            {messages.length}
          </Badge>
        )}
        <span className="text-[8px] text-muted-foreground/50 writing-vertical-rl [writing-mode:vertical-rl] mt-1">Chat</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-80 border-l bg-gradient-to-b from-card/60 to-card/40 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-9 border-b bg-card/50 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <MessageSquare className="size-3.5 text-emerald-500/70 shrink-0" />
          {isEditingTitle ? (
            <input
              type="text"
              value={editTitleValue}
              onChange={(e) => setEditTitleValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFinishEditTitle()
                if (e.key === 'Escape') { setIsEditingTitle(false); setEditTitleValue('') }
              }}
              onBlur={handleFinishEditTitle}
              autoFocus
              className="text-xs font-semibold text-foreground bg-transparent border-b border-emerald-500/50 outline-none max-w-[140px] truncate"
            />
          ) : (
            <span
              className="text-xs font-semibold text-foreground truncate max-w-[140px] cursor-pointer hover:text-emerald-500 transition-colors"
              title={`${currentSessionTitle} — double-click to rename`}
              onDoubleClick={handleDoubleClickTitle}
            >
              {currentSessionTitle}
            </span>
          )}
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 gap-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shrink-0">
            <Users className="size-2.5" />
            {onlineCount}
          </Badge>
          {/* Message count badge */}
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 gap-0.5 text-muted-foreground shrink-0">
            <MessageSquare className="size-2" />
            {messages.length}
          </Badge>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            className="size-6 text-foreground/60 hover:text-foreground hover:bg-muted/50"
            title="New Chat"
            onClick={handleNewChat}
          >
            <PlusCircle className="size-3" />
          </Button>
          <div className="relative">
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                'size-6 transition-colors',
                historyOpen
                  ? 'text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10'
                  : 'text-foreground/60 hover:text-foreground hover:bg-muted/50',
              )}
              title="Chat History"
              onClick={() => setHistoryOpen(!historyOpen)}
            >
              <History className="size-3" />
            </Button>
            <ChatHistoryDropdown isOpen={historyOpen} onClose={() => setHistoryOpen(false)} />
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="size-6 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
            title="Run Task"
            onClick={() => setRunTaskDialogOpen(true)}
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

      {/* AI Status Bar */}
      <ChatAIStatusBar messages={messages} />

      {/* Messages */}
      <div className="flex-1 relative overflow-hidden">
        {!currentProject ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground px-6">
            <div className="size-14 rounded-2xl bg-gradient-to-br from-muted/40 to-muted/20 flex items-center justify-center border border-border/30 mb-3">
              <FolderOpen className="size-6 text-muted-foreground/50" />
            </div>
            <p className="text-xs font-medium text-foreground mb-1">No Project Selected</p>
            <p className="text-[10px] text-center text-muted-foreground/70 max-w-[200px]">
              Select or create a project to start chatting with your AI dev team.
            </p>
          </div>
        ) : (
        <ScrollArea className="h-full" ref={scrollRef}>
          <div className="py-2" onScroll={handleScroll}>
            <AnimatePresence initial={false} mode="wait">
              <motion.div key={sessionKey} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }}>
              {(() => {
                // Group messages by timestamp
                const groups: { label: string; messages: Message[] }[] = []
                let currentGroup = ''
                for (const msg of messages) {
                  const group = getTimestampGroup(msg.createdAt)
                  if (group !== currentGroup) {
                    groups.push({ label: group, messages: [msg] })
                    currentGroup = group
                  } else {
                    groups[groups.length - 1].messages.push(msg)
                  }
                }
                return groups.map((group) => (
                  <div key={group.label}>
                    <div className="timestamp-group-header my-2">{group.label}</div>
                    {group.messages.map((msg) => (
                      <ChatMessage key={msg.id} message={msg} />
                    ))}
                  </div>
                ))
              })()}
              </motion.div>
            </AnimatePresence>
            {isSending && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 px-5 py-2.5 text-xs text-muted-foreground"
              >
                <span className="flex items-center gap-1">
                  <span className="typing-wave-dot" />
                  <span className="typing-wave-dot" />
                  <span className="typing-wave-dot" />
                </span>
                <span>
                  {aiSettings.provider === 'nvidia' ? 'NVIDIA' : aiSettings.provider === 'openai-compatible' ? 'AI' : 'Agent'} is thinking...
                </span>
              </motion.div>
            )}
            {/* Skeleton loading while waiting for AI response */}
            {isSending && messages.length > 0 && (
              <div className="px-3 py-2.5 mx-2 mb-1.5 rounded-xl bg-muted/20">
                <div className="flex items-start gap-2">
                  <Skeleton className="size-6 rounded-md shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-12" />
                      <Skeleton className="h-3 w-10 ml-auto" />
                    </div>
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              </div>
            )}
            {messages.length === 0 && !isSending && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground px-4">
                <div className="empty-state-illustration mb-1">
                  <div className="size-14 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 flex items-center justify-center border border-emerald-500/10">
                    <MessageCircle className="size-6 text-emerald-500/60" />
                  </div>
                </div>
                <p className="text-xs font-medium text-foreground mb-1">
                  {currentChatSessionId ? 'Team Chat' : 'Start a new conversation'}
                </p>
                <p className="text-[10px] text-center text-muted-foreground/70 mb-4 max-w-[200px]">
                  {currentChatSessionId
                    ? 'Talk to your AI dev team. Ask for updates, assign tasks, or request code reviews.'
                    : 'Type a message below or pick a quick prompt to start chatting with your AI dev team.'}
                </p>
                <div className="grid grid-cols-2 gap-1.5 w-full">
                  {QUICK_PROMPTS.map((qp) => (
                    <button
                      key={qp.label}
                      onClick={() => { setInputValue(qp.prompt); setTimeout(() => { if (textareaRef.current) textareaRef.current.focus() }, 50) }}
                      className="quick-prompt-card flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-muted/40 hover:bg-muted/70 text-[10px] text-foreground/80 transition-colors text-left border border-transparent hover:border-border/40"
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
        )}

        {/* Scroll to bottom floating button */}
        <AnimatePresence>
          {isScrolledUp && messages.length > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={scrollToBottom}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full bg-card/90 border border-border/60 shadow-lg text-[10px] text-muted-foreground hover:text-foreground hover:bg-card transition-colors scroll-to-bottom-btn"
            >
              <ArrowDown className="size-3" />
              <span>Latest</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Slash commands popup */}
      <AnimatePresence>
        {showSlashCommands && filteredSlashCommands.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="border-t bg-card/95 backdrop-blur-sm"
          >
            <div className="p-1.5 space-y-0.5 max-h-72 overflow-y-auto">
              {/* Recently Used section */}
              {visibleSlashCommands.some((v) => v.isRecent) && (
                <>
                  <div className="px-2 py-1 text-[9px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1">
                    <Clock className="size-2.5" />
                    Recently Used
                  </div>
                  {visibleSlashCommands.map((item, i) => {
                    if (!item.isRecent) return null
                    return (
                      <button
                        key={`recent-${item.cmd.command}`}
                        onClick={() => executeSlashCommand(item.cmd)}
                        className={cn(
                          'flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs transition-colors',
                          selectedSlashIndex === i ? 'bg-emerald-500/10 text-foreground' : 'hover:bg-muted/50 text-foreground/80',
                        )}
                      >
                        {item.cmd.icon}
                        <div className="flex-1 min-w-0 text-left">
                          <span className="font-medium">{item.cmd.command}</span>
                          <span className="text-muted-foreground ml-1.5">{item.cmd.description}</span>
                        </div>
                        <span className="text-[8px] text-emerald-500/60 shrink-0">recent</span>
                      </button>
                    )
                  })}
                  <div className="h-px bg-border/30 my-1" />
                </>
              )}
              {/* All Commands section */}
              <div className="px-2 py-1 text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">
                Commands
              </div>
              {visibleSlashCommands.map((item, i) => {
                if (item.isRecent) return null
                return (
                  <button
                    key={item.cmd.command}
                    onClick={() => executeSlashCommand(item.cmd)}
                    className={cn(
                      'flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs transition-colors',
                      selectedSlashIndex === i ? 'bg-emerald-500/10 text-foreground' : 'hover:bg-muted/50 text-foreground/80',
                    )}
                  >
                    {item.cmd.icon}
                    <div className="flex-1 min-w-0 text-left">
                      <span className="font-medium">{item.cmd.command}</span>
                      <span className="text-muted-foreground ml-1.5">{item.cmd.description}</span>
                    </div>
                    {/* Context-aware badge */}
                    {contextAwareCommandOrder.indexOf(item.cmd.command) !== -1 && (
                      <span className="text-[8px] text-emerald-500/60 shrink-0">suggested</span>
                    )}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message input */}
      <div className="p-2 border-t shrink-0 bg-card/30">
        {/* Model selector row */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <ModelSelector />
          <div className="flex-1" />
          <span className="text-[8px] text-muted-foreground/40">
            {aiSettings.provider === 'zai' ? 'Z-AI' : aiSettings.provider === 'nvidia' ? 'NVIDIA NIM' : 'Custom'}
          </span>
        </div>
        <div className="flex items-end gap-1.5">
          <textarea
            ref={textareaRef}
            data-chat-input
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
                const totalItems = visibleSlashCommands.length
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setSelectedSlashIndex((prev) => Math.min(prev + 1, totalItems - 1))
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setSelectedSlashIndex((prev) => Math.max(prev - 1, 0))
                }
                if (e.key === 'Tab' && totalItems > 0) {
                  e.preventDefault()
                  const selectedItem = visibleSlashCommands[selectedSlashIndex]
                  if (selectedItem) {
                    executeSlashCommand(selectedItem.cmd)
                  }
                }
              }
            }}
            rows={1}
            className="flex-1 bg-muted/40 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-emerald-500/40 transition-all resize-none max-h-[120px] font-mono border border-transparent focus:border-emerald-500/20 textarea-focus-glow"
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

      {/* Run Task Dialog */}
      <Dialog open={runTaskDialogOpen} onOpenChange={setRunTaskDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="size-4 text-emerald-500" />
              Run Task
            </DialogTitle>
            <DialogDescription>Create a task and assign it to an agent for immediate execution.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Task Title</Label>
              <input
                type="text"
                value={runTaskTitle}
                onChange={(e) => setRunTaskTitle(e.target.value)}
                placeholder="What should the agent do?"
                className="w-full h-9 rounded-md border bg-transparent px-3 text-sm outline-none focus:ring-1 focus:ring-emerald-500/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && runTaskTitle.trim()) {
                    handleRunTask()
                  }
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Assign to Agent</Label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setRunTaskAssigneeId('')}
                  className={cn(
                    'px-2 py-1 rounded-md text-[10px] border transition-colors',
                    !runTaskAssigneeId ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'hover:bg-muted/50',
                  )}
                >
                  Auto-assign
                </button>
                {agents.map((agent) => {
                  const roleConfig = AGENT_ROLE_CONFIG[agent.role]
                  return (
                    <button
                      key={agent.id}
                      onClick={() => setRunTaskAssigneeId(agent.id)}
                      className={cn(
                        'flex items-center gap-1 px-2 py-1 rounded-md text-[10px] border transition-colors',
                        runTaskAssigneeId === agent.id ? `${roleConfig.bgColor} border-current/30 ${roleConfig.color}` : 'hover:bg-muted/50',
                      )}
                    >
                      <span>{agent.avatar}</span>
                      <span>{agent.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </DialogClose>
            <Button
              size="sm"
              onClick={handleRunTask}
              disabled={!runTaskTitle.trim() || runTaskIsCreating}
              className="gap-1.5"
            >
              {runTaskIsCreating ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
              Run Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
