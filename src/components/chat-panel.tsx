'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Send,
  Loader2,
  Bot,
  User,
  Copy,
  Check,
  Sparkles,
  Zap,
  Shield,
  Brain,
  Search,
  BarChart3,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  StopCircle,
  Plus,
  Trash2,
  Download,
  FileText,
  FileJson,
  ClipboardCopy,
  Paperclip,
  Mic,
  History,
  X,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import type { ChatMessage, ChatConversation } from '@/lib/types'
import { PageHeader } from '@/components/page-header'

// ---------------------------------------------------------------------------
// Simple regex-based Markdown renderer
// ---------------------------------------------------------------------------

function renderMarkdown(text: string): React.ReactNode[] {
  const codeBlockPlaceholder = '\u0000CODEBLOCK\u0000'
  const codeBlocks: string[] = []
  let processed = text.replace(/```([\s\S]*?)```/g, (_match, code) => {
    codeBlocks.push(code.trim())
    return `${codeBlockPlaceholder}${codeBlocks.length - 1}${codeBlockPlaceholder}`
  })

  const blocks = processed.split('\n\n')

  return blocks.map((block, i) => {
    const codeBlockMatch = block.match(
      new RegExp(
        `^${codeBlockPlaceholder.replace(/\u0000/g, '\\u0000')}(\\d+)${codeBlockPlaceholder.replace(/\u0000/g, '\\u0000')}$`
      )
    )
    if (codeBlockMatch) {
      const idx = parseInt(codeBlockMatch[1], 10)
      return (
        <pre
          key={i}
          className="bg-muted/60 border border-border/40 rounded-lg p-3 text-xs overflow-x-auto my-2 font-mono"
        >
          <code>{codeBlocks[idx]}</code>
        </pre>
      )
    }

    let html = block
      .replace(
        /`([^`]+)`/g,
        '<code class="bg-muted/60 border border-border/30 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>'
      )
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>')

    const lines = html.split('\n')
    if (lines.length > 1 && lines.some((l) => l.trimStart().startsWith('- '))) {
      return (
        <ul key={i} className="list-disc list-inside space-y-1 my-2">
          {lines
            .filter((l) => l.trimStart().startsWith('- '))
            .map((l, j) => (
              <li
                key={j}
                className="text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: l.trimStart().slice(2) }}
              />
            ))}
        </ul>
      )
    }

    return (
      <p
        key={i}
        className="text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  })
}

// ---------------------------------------------------------------------------
// Suggested prompts with icons — 3x2 grid
// ---------------------------------------------------------------------------

const SUGGESTED_PROMPTS = [
  {
    icon: Search,
    label: 'System Status',
    message: 'Give me an overview of system health and performance',
    description: 'Get an overview of system health and performance',
    color: 'text-blue-500',
    bg: 'from-blue-500/10 to-blue-500/5',
  },
  {
    icon: Brain,
    label: 'Evolution Progress',
    message: 'Check recent evolution events and improvements',
    description: 'Check recent evolution events and improvements',
    color: 'text-emerald-500',
    bg: 'from-emerald-500/10 to-emerald-500/5',
  },
  {
    icon: Shield,
    label: 'Safety Report',
    message: 'Review safety events and constitutional compliance',
    description: 'Review safety events and constitutional compliance',
    color: 'text-rose-500',
    bg: 'from-rose-500/10 to-rose-500/5',
  },
  {
    icon: BarChart3,
    label: 'Benchmark Analysis',
    message: 'Analyze benchmark scores and trends',
    description: 'Analyze benchmark scores and trends',
    color: 'text-amber-500',
    bg: 'from-amber-500/10 to-amber-500/5',
  },
  {
    icon: Zap,
    label: 'Agent Performance',
    message: 'Compare agent success rates and efficiency',
    description: 'Compare agent success rates and efficiency',
    color: 'text-violet-500',
    bg: 'from-violet-500/10 to-violet-500/5',
  },
  {
    icon: Lightbulb,
    label: 'Optimization Tips',
    message: 'Get suggestions for system optimization',
    description: 'Get suggestions for system optimization',
    color: 'text-teal-500',
    bg: 'from-teal-500/10 to-teal-500/5',
  },
]

const MAX_CHARS = 2000
const STORAGE_KEY = 'evoai-chat-conversations'
const CURRENT_CONV_KEY = 'evoai-current-conversation-id'

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

function loadConversations(): ChatConversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }
  return []
}

function saveConversations(conversations: ChatConversation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
  } catch {
    // ignore
  }
}

function loadCurrentConvId(): string | null {
  try {
    return localStorage.getItem(CURRENT_CONV_KEY)
  } catch {
    return null
  }
}

function saveCurrentConvId(id: string | null) {
  try {
    if (id) {
      localStorage.setItem(CURRENT_CONV_KEY, id)
    } else {
      localStorage.removeItem(CURRENT_CONV_KEY)
    }
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Export helpers
// ---------------------------------------------------------------------------

function exportAsMarkdown(messages: ChatMessage[]) {
  const lines: string[] = [
    '# EvoAI Conversation',
    '',
    `*Exported on ${new Date().toLocaleString()}*`,
    '',
    '---',
    '',
  ]

  for (const msg of messages) {
    const time = new Date(msg.timestamp).toLocaleString()
    const role = msg.role === 'user' ? '👤 User' : '🤖 Assistant'
    lines.push(`### ${role} — ${time}`)
    lines.push('')
    lines.push(msg.content)
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  const md = lines.join('\n')
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `evoai-conversation-${Date.now()}.md`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function exportAsJSON(messages: ChatMessage[]) {
  const data = {
    exportedAt: new Date().toISOString(),
    messageCount: messages.length,
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
      reaction: m.reaction ?? null,
    })),
  }
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `evoai-conversation-${Date.now()}.json`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function copyConversationAsText(messages: ChatMessage[]): Promise<void> {
  const text = messages
    .map((m) => {
      const time = new Date(m.timestamp).toLocaleString()
      const role = m.role === 'user' ? 'User' : 'Assistant'
      return `[${time}] ${role}:\n${m.content}`
    })
    .join('\n\n---\n\n')
  return navigator.clipboard.writeText(text)
}

// ---------------------------------------------------------------------------
// Copy button for assistant messages
// ---------------------------------------------------------------------------

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: do nothing
    }
  }, [text])

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted/80 text-muted-foreground hover:text-foreground"
          aria-label="Copy message"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="left">{copied ? 'Copied!' : 'Copy'}</TooltipContent>
    </Tooltip>
  )
}

// ---------------------------------------------------------------------------
// Bouncing Dots Typing Indicator
// ---------------------------------------------------------------------------

function BouncingDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-primary/50"
          animate={{ y: [0, -6, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Chat Panel Component
// ---------------------------------------------------------------------------

export function ChatPanel() {
  const {
    chatMessages,
    addChatMessage,
    chatConversations,
    setChatConversations,
    currentConversationId,
    setCurrentConversationId,
    createNewConversation,
    switchConversation,
    deleteConversation,
    updateMessageReaction,
    clearChatHistory,
  } = useAppStore()

  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [contextText, setContextText] = useState('')
  const [contextOpen, setContextOpen] = useState(false)
  const [copiedAll, setCopiedAll] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ------- Load from localStorage on mount -------
  useEffect(() => {
    const stored = loadConversations()
    const storedId = loadCurrentConvId()
    if (stored.length > 0) {
      setChatConversations(stored)
      const targetId = storedId && stored.find((c) => c.id === storedId) ? storedId : stored[0].id
      setCurrentConversationId(targetId)
      const targetConv = stored.find((c) => c.id === targetId)
      if (targetConv) {
        useAppStore.setState({ chatMessages: targetConv.messages })
      }
    } else {
      // Create first conversation
      const newId = Date.now().toString()
      const newConv: ChatConversation = {
        id: newId,
        title: 'New Conversation',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setChatConversations([newConv])
      setCurrentConversationId(newId)
    }
  }, [])

  // ------- Save to localStorage with debounce -------
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (chatConversations.length > 0) {
        saveConversations(chatConversations)
      }
      if (currentConversationId) {
        saveCurrentConvId(currentConversationId)
      }
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [chatConversations, currentConversationId])

  // ------- auto-scroll to bottom -------
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatMessages, sending])

  // ------- send message -------
  const handleSend = useCallback(
    async (messageText?: string) => {
      const text = (messageText ?? input).trim()
      if (!text || sending) return

      const fullContent = contextText ? `[Context]: ${contextText}\n\n${text}` : text

      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
      }
      addChatMessage(userMsg)
      setInput('')
      setContextText('')
      setContextOpen(false)

      setSending(true)
      const controller = new AbortController()
      setAbortController(controller)

      try {
        const conversationHistory = chatMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }))

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: fullContent,
            conversationHistory,
          }),
          signal: controller.signal,
        })

        if (res.ok) {
          const data = await res.json()
          const assistantMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content:
              data.response ||
              'I apologize, I was unable to generate a response.',
            timestamp: new Date().toISOString(),
          }
          addChatMessage(assistantMsg)
        } else {
          const errorMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content:
              'Sorry, I encountered an error processing your request. Please try again.',
            timestamp: new Date().toISOString(),
          }
          addChatMessage(errorMsg)
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // User cancelled — do nothing
        } else {
          const errorMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content:
              'Sorry, I encountered a network error. Please check your connection and try again.',
            timestamp: new Date().toISOString(),
          }
          addChatMessage(errorMsg)
        }
      } finally {
        setSending(false)
        setAbortController(null)
        inputRef.current?.focus()
      }
    },
    [input, sending, chatMessages, addChatMessage, contextText]
  )

  // ------- stop generating -------
  const handleStopGenerating = useCallback(() => {
    if (abortController) {
      abortController.abort()
    }
  }, [abortController])

  // ------- regenerate last assistant message -------
  const handleRegenerate = useCallback(async () => {
    // Find last assistant message
    const lastAssistantIdx = [...chatMessages]
      .reverse()
      .findIndex((m) => m.role === 'assistant')
    if (lastAssistantIdx === -1) return

    // Find the user message that preceded it
    const realIdx = chatMessages.length - 1 - lastAssistantIdx
    const userMsgIdx = realIdx - 1
    if (userMsgIdx < 0 || chatMessages[userMsgIdx].role !== 'user') return

    // Remove messages from that point and resend
    const userText = chatMessages[userMsgIdx].content

    // Remove last assistant message
    const updated = chatMessages.slice(0, realIdx)
    useAppStore.setState({ chatMessages: updated })

    setSending(true)
    const controller = new AbortController()
    setAbortController(controller)

    try {
      const conversationHistory = updated.map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          conversationHistory,
        }),
        signal: controller.signal,
      })

      if (res.ok) {
        const data = await res.json()
        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            data.response ||
            'I apologize, I was unable to generate a response.',
          timestamp: new Date().toISOString(),
        }
        addChatMessage(assistantMsg)
      }
    } catch {
      // ignore
    } finally {
      setSending(false)
      setAbortController(null)
    }
  }, [chatMessages, addChatMessage])

  // ------- keyboard: shift+enter for new line, enter to send -------
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  // ------- clear all history -------
  const handleClearAll = useCallback(() => {
    clearChatHistory()
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(CURRENT_CONV_KEY)
  }, [clearChatHistory])

  // ------- animation variants -------
  const messageVariants = {
    hidden: { opacity: 0, y: 12, scale: 0.97 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 300, damping: 24 },
    },
    exit: {
      opacity: 0,
      y: -8,
      scale: 0.97,
      transition: { duration: 0.15 },
    },
  }

  const charCount = input.length
  const wordCount = input.trim() ? input.trim().split(/\s+/).length : 0
  const isNearLimit = charCount > MAX_CHARS * 0.8
  const isOverLimit = charCount > MAX_CHARS

  const lastAssistantIdx = chatMessages.reduce(
    (acc, m, i) => (m.role === 'assistant' ? i : acc),
    -1
  )

  return (
    <TooltipProvider>
      <div className="flex h-full gap-0">
        {/* Conversation History Sidebar */}
        <AnimatePresence>
          {historyOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden border-r border-border/50 flex flex-col bg-card/30"
            >
              <div className="p-3 flex items-center justify-between border-b border-border/40">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  Conversations
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setHistoryOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {chatConversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={cn(
                        'group flex items-start gap-2 p-2.5 rounded-lg cursor-pointer transition-all duration-150',
                        conv.id === currentConversationId
                          ? 'bg-primary/10 border border-primary/20'
                          : 'hover:bg-muted/50 border border-transparent'
                      )}
                      onClick={() => {
                        switchConversation(conv.id)
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {conv.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {conv.messages.length} msgs ·{' '}
                          {new Date(conv.updatedAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteConversation(conv.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
                        aria-label="Delete conversation"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <PageHeader
            icon={MessageSquare}
            iconColor="emerald"
            title="AI Assistant"
            description="Ask about the self-evolving AI system"
            className="mb-4"
            actions={
              <>
                {/* History Toggle */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setHistoryOpen(!historyOpen)}
                    >
                      <History className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Conversation History</TooltipContent>
                </Tooltip>

                {/* New Conversation */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => createNewConversation()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>New Conversation</TooltipContent>
                </Tooltip>

                {/* Export Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Download className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => exportAsMarkdown(chatMessages)}
                      disabled={chatMessages.length === 0}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Export as Markdown
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => exportAsJSON(chatMessages)}
                      disabled={chatMessages.length === 0}
                    >
                      <FileJson className="h-4 w-4 mr-2" />
                      Export as JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={async () => {
                        await copyConversationAsText(chatMessages)
                        setCopiedAll(true)
                        setTimeout(() => setCopiedAll(false), 2000)
                      }}
                      disabled={chatMessages.length === 0}
                    >
                      {copiedAll ? (
                        <Check className="h-4 w-4 mr-2 text-emerald-500" />
                      ) : (
                        <ClipboardCopy className="h-4 w-4 mr-2" />
                      )}
                      {copiedAll ? 'Copied!' : 'Copy Conversation'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Clear History */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive/70 hover:text-destructive"
                      onClick={handleClearAll}
                      disabled={chatMessages.length === 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Clear History</TooltipContent>
                </Tooltip>
              </>
            }
          />

          {/* Messages area */}
          <Card className="flex-1 min-h-0 flex flex-col bg-card/50 backdrop-blur-sm border-border/50">
            <ScrollArea className="flex-1" ref={scrollRef}>
              <div className="p-4 space-y-4">
                {/* Empty state */}
                {chatMessages.length === 0 && !sending && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="flex flex-col items-center justify-center py-8 text-center"
                  >
                    <div className="relative mb-6">
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
                        <Bot className="h-10 w-10 text-primary" />
                      </div>
                      <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      Welcome to EvoAI Assistant
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm mb-6">
                      I can help you understand and manage your Self-Evolving AI System
                    </p>

                    {/* Suggested prompts — 3x2 grid */}
                    <div className="grid grid-cols-3 gap-3 w-full max-w-2xl">
                      {SUGGESTED_PROMPTS.map((prompt, idx) => (
                        <motion.button
                          key={prompt.label}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 + idx * 0.06, duration: 0.35 }}
                          onClick={() => handleSend(prompt.message)}
                          className={cn(
                            'group flex flex-col items-start gap-2 rounded-xl border border-border/60 p-3.5 text-left transition-all duration-200 hover:shadow-md hover:border-primary/20',
                            `bg-gradient-to-br ${prompt.bg} hover:bg-accent/50`
                          )}
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60 group-hover:bg-muted transition-colors">
                            <prompt.icon className={cn('h-4 w-4', prompt.color)} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              {prompt.label}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {prompt.description}
                            </p>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Messages */}
                <AnimatePresence initial={false}>
                  {chatMessages.map((msg, msgIdx) => (
                    <motion.div
                      key={msg.id}
                      variants={messageVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className={cn(
                        'flex gap-2.5',
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {msg.role === 'assistant' && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}

                      <div
                        className={cn(
                          'group relative max-w-[80%]',
                          msg.role === 'user'
                            ? 'rounded-2xl rounded-br-md bg-primary text-primary-foreground shadow-md shadow-primary/20'
                            : 'rounded-2xl rounded-bl-md bg-muted/70 text-foreground border border-border/30 shadow-sm'
                        ) + ' px-4 py-3'}
                      >
                        {/* Rendered content */}
                        <div className="space-y-1">
                          {msg.role === 'assistant'
                            ? renderMarkdown(msg.content)
                            : msg.content.split('\n').map((line, idx) => (
                                <p
                                  key={idx}
                                  className="text-sm leading-relaxed whitespace-pre-wrap break-words"
                                >
                                  {line}
                                </p>
                              ))}
                        </div>

                        {/* Timestamp + actions row */}
                        <div
                          className={cn(
                            'flex items-center gap-1.5 mt-2',
                            msg.role === 'user' ? 'justify-end' : 'justify-between'
                          )}
                        >
                          <p
                            className={cn(
                              'text-[10px]',
                              msg.role === 'user'
                                ? 'text-primary-foreground/60'
                                : 'text-muted-foreground/70'
                            )}
                          >
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>

                          {msg.role === 'assistant' && (
                            <div className="flex items-center gap-0.5">
                              {/* Thumbs up */}
                              <button
                                onClick={() =>
                                  updateMessageReaction(
                                    msg.id,
                                    msg.reaction === 'thumbs-up' ? null : 'thumbs-up'
                                  )
                                }
                                className={cn(
                                  'opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted/80',
                                  msg.reaction === 'thumbs-up'
                                    ? 'opacity-100 text-emerald-500'
                                    : 'text-muted-foreground hover:text-foreground'
                                )}
                                aria-label="Thumbs up"
                              >
                                <ThumbsUp className="h-3 w-3" />
                              </button>
                              {/* Thumbs down */}
                              <button
                                onClick={() =>
                                  updateMessageReaction(
                                    msg.id,
                                    msg.reaction === 'thumbs-down' ? null : 'thumbs-down'
                                  )
                                }
                                className={cn(
                                  'opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted/80',
                                  msg.reaction === 'thumbs-down'
                                    ? 'opacity-100 text-rose-500'
                                    : 'text-muted-foreground hover:text-foreground'
                                )}
                                aria-label="Thumbs down"
                              >
                                <ThumbsDown className="h-3 w-3" />
                              </button>
                              {/* Regenerate — only on last assistant message */}
                              {msgIdx === lastAssistantIdx && !sending && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={handleRegenerate}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                                      aria-label="Regenerate response"
                                    >
                                      <RefreshCw className="h-3 w-3" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="left">Regenerate</TooltipContent>
                                </Tooltip>
                              )}
                              <CopyButton text={msg.content} />
                            </div>
                          )}
                        </div>
                      </div>

                      {msg.role === 'user' && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary mt-0.5">
                          <User className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Typing indicator with stop button */}
                {sending && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                    className="flex gap-2.5 items-end"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="rounded-2xl rounded-bl-md bg-muted/70 border border-border/30 px-4 py-3.5 flex items-center gap-3">
                      <BouncingDots />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={handleStopGenerating}
                      >
                        <StopCircle className="h-3.5 w-3.5 mr-1" />
                        Stop
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            </ScrollArea>

            {/* Input area */}
            <div className="border-t border-border/50 px-4 py-3">
              {/* Context indicator */}
              {contextText && (
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <Paperclip className="h-3 w-3" />
                    {contextText.length > 40 ? `${contextText.slice(0, 40)}...` : contextText}
                  </Badge>
                  <button
                    onClick={() => {
                      setContextText('')
                      setContextOpen(false)
                    }}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Remove context"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              <div className="flex items-end gap-2">
                {/* Upload Context */}
                <Dialog open={contextOpen} onOpenChange={setContextOpen}>
                  <DialogTrigger asChild>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={() => setContextOpen(true)}
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Upload Context</TooltipContent>
                    </Tooltip>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Upload Context</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                      Paste long text as additional context for the AI assistant. It will be
                      prepended to your next message.
                    </p>
                    <Textarea
                      placeholder="Paste context text here..."
                      value={contextText}
                      onChange={(e) => setContextText(e.target.value)}
                      className="min-h-[120px]"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setContextText('')
                          setContextOpen(false)
                        }}
                      >
                        Clear
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setContextOpen(false)}
                      >
                        Save Context
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Voice Input placeholder */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-muted-foreground/50"
                      disabled
                    >
                      <Mic className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Voice Input — Coming Soon</TooltipContent>
                </Tooltip>

                {/* Text Input */}
                <div className="relative flex-1">
                  <Textarea
                    ref={inputRef}
                    placeholder="Ask about the AI system... (Shift+Enter for new line)"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={sending}
                    className="min-h-[40px] max-h-[120px] resize-none pr-16 py-2.5"
                    maxLength={MAX_CHARS}
                    rows={1}
                  />
                  <span
                    className={cn(
                      'absolute right-3 bottom-2 text-[10px] font-medium transition-colors',
                      isOverLimit
                        ? 'text-destructive'
                        : isNearLimit
                        ? 'text-amber-500'
                        : 'text-muted-foreground/50'
                    )}
                  >
                    {charCount}/{MAX_CHARS}
                    <span className="ml-1.5 opacity-60">{wordCount}w</span>
                  </span>
                </div>

                {/* Send Button */}
                <Button
                  size="icon"
                  onClick={() => handleSend()}
                  disabled={!input.trim() || sending || isOverLimit}
                  className="shrink-0 rounded-xl h-9 w-9"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  )
}
