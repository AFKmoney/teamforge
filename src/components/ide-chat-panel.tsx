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
        'px-3 py-2.5 rounded-lg mx-2 mb-1',
        typeConfig.bgColor,
        isSystem && 'border border-border/50',
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
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const onlineCount = agents.filter((a) => a.status !== 'idle' && a.status !== 'sleeping').length

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isSending) return
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
  }, [inputValue, isSending, currentProject, addMessage])

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
    <div className="flex flex-col w-80 border-l bg-card/50 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-9 border-b shrink-0">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Team Chat</span>
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 gap-0.5">
            <Users className="size-2.5" />
            {onlineCount}
          </Badge>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="size-6"
          onClick={() => setRightPanelOpen(false)}
        >
          <X className="size-3.5" />
        </Button>
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

      {/* Message input */}
      <div className="p-2 border-t shrink-0">
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            placeholder="Message the team..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            className="flex-1 bg-muted/50 rounded-md px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:ring-1 focus:ring-emerald-500/50 transition-ring"
          />
          <Button
            size="icon"
            variant="ghost"
            className={cn(
              'size-7 shrink-0 transition-colors',
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
          <span className="text-[9px] text-muted-foreground/50">Press Enter to send</span>
          <span className="text-[9px] text-muted-foreground/50">{inputValue.length}/500</span>
        </div>
      </div>
    </div>
  )
}
