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
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useAppStore } from '@/lib/store'
import type { ChatMessage } from '@/lib/types'

// ---------------------------------------------------------------------------
// Simple regex-based Markdown renderer
// ---------------------------------------------------------------------------

function renderMarkdown(text: string): React.ReactNode[] {
  // First, extract fenced code blocks so they don't get mangled by inline processing
  const codeBlockPlaceholder = '\u0000CODEBLOCK\u0000'
  const codeBlocks: string[] = []
  let processed = text.replace(/```([\s\S]*?)```/g, (_match, code) => {
    codeBlocks.push(code.trim())
    return `${codeBlockPlaceholder}${codeBlocks.length - 1}${codeBlockPlaceholder}`
  })

  const blocks = processed.split('\n\n')

  return blocks.map((block, i) => {
    // Check for fenced code block placeholder
    const codeBlockMatch = block.match(
      new RegExp(`^${codeBlockPlaceholder.replace(/\u0000/g, '\\u0000')}(\\d+)${codeBlockPlaceholder.replace(/\u0000/g, '\\u0000')}$`)
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

    // Process inline formatting
    let html = block
      .replace(/`([^`]+)`/g, '<code class="bg-muted/60 border border-border/30 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>')

    // Split by newlines for potential lists
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
// Suggested prompts with icons
// ---------------------------------------------------------------------------

const SUGGESTED_PROMPTS = [
  {
    icon: Zap,
    label: 'Explain the evolution cycle',
    description: 'How the system self-improves',
    color: 'text-amber-500',
  },
  {
    icon: Brain,
    label: 'What agents are active?',
    description: 'Current agent statuses',
    color: 'text-emerald-500',
  },
  {
    icon: Shield,
    label: 'How does safety work?',
    description: 'Constitutional rules & governance',
    color: 'text-rose-500',
  },
  {
    icon: Sparkles,
    label: 'Show recent improvements',
    description: 'Latest evolution events',
    color: 'text-violet-500',
  },
]

const MAX_CHARS = 2000

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
      <TooltipContent side="left">
        {copied ? 'Copied!' : 'Copy'}
      </TooltipContent>
    </Tooltip>
  )
}

// ---------------------------------------------------------------------------
// Main Chat Panel Component
// ---------------------------------------------------------------------------

export function ChatPanel() {
  const { chatMessages, addChatMessage } = useAppStore()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ------- auto-scroll to bottom -------
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatMessages])

  // ------- send message -------
  const handleSend = useCallback(
    async (messageText?: string) => {
      const text = (messageText ?? input).trim()
      if (!text || sending) return

      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
      }
      addChatMessage(userMsg)
      setInput('')

      setSending(true)
      try {
        // Build conversation history for context
        const conversationHistory = chatMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }))

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            conversationHistory,
          }),
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
      } catch {
        const errorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            'Sorry, I encountered a network error. Please check your connection and try again.',
          timestamp: new Date().toISOString(),
        }
        addChatMessage(errorMsg)
      } finally {
        setSending(false)
        inputRef.current?.focus()
      }
    },
    [input, sending, chatMessages, addChatMessage]
  )

  // ------- keyboard -------
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

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
  const isNearLimit = charCount > MAX_CHARS * 0.8
  const isOverLimit = charCount > MAX_CHARS

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <MessageSquare className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            AI Assistant
          </h2>
          <p className="text-sm text-muted-foreground">
            Ask about the self-evolving AI system
          </p>
        </div>
      </div>

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
                <h3 className="text-base font-semibold text-foreground mb-1">
                  Start a conversation
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-6">
                  Ask me anything about the self-evolving AI system, its agents,
                  memory, evolution, or safety mechanisms.
                </p>

                {/* Suggested prompts grid */}
                <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                  {SUGGESTED_PROMPTS.map((prompt, idx) => (
                    <motion.button
                      key={prompt.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + idx * 0.08, duration: 0.35 }}
                      onClick={() => handleSend(prompt.label)}
                      className="group flex items-start gap-3 rounded-xl border border-border/60 bg-card hover:bg-accent/50 p-3.5 text-left transition-all duration-200 hover:shadow-md hover:border-primary/20"
                    >
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60 group-hover:bg-muted transition-colors`}
                      >
                        <prompt.icon className={`h-4 w-4 ${prompt.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {prompt.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
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
              {chatMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  variants={messageVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className={`flex gap-2.5 ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}

                  <div
                    className={`group relative max-w-[80%] ${
                      msg.role === 'user'
                        ? 'rounded-2xl rounded-br-md bg-primary text-primary-foreground shadow-md shadow-primary/20'
                        : 'rounded-2xl rounded-bl-md bg-muted/70 text-foreground border border-border/30 shadow-sm'
                    } px-4 py-3`}
                  >
                    {/* Rendered content */}
                    <div className="space-y-1">
                      {msg.role === 'assistant'
                        ? renderMarkdown(msg.content)
                        : msg.content.split('\n').map((line, idx) => (
                            <p key={idx} className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                              {line}
                            </p>
                          ))}
                    </div>

                    {/* Timestamp + actions row */}
                    <div
                      className={`flex items-center gap-2 mt-2 ${
                        msg.role === 'user' ? 'justify-end' : 'justify-between'
                      }`}
                    >
                      <p
                        className={`text-[10px] ${
                          msg.role === 'user'
                            ? 'text-primary-foreground/60'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {msg.role === 'assistant' && (
                        <CopyButton text={msg.content} />
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

            {/* Typing indicator */}
            {sending && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                className="flex gap-2.5"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="rounded-2xl rounded-bl-md bg-muted/70 border border-border/30 px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="border-t border-border/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                ref={inputRef}
                placeholder="Ask about the AI system..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
                className="flex-1 pr-16"
                maxLength={MAX_CHARS}
              />
              <span
                className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium transition-colors ${
                  isOverLimit
                    ? 'text-destructive'
                    : isNearLimit
                    ? 'text-amber-500'
                    : 'text-muted-foreground/50'
                }`}
              >
                {charCount}/{MAX_CHARS}
              </span>
            </div>
            <Button
              size="icon"
              onClick={() => handleSend()}
              disabled={!input.trim() || sending || isOverLimit}
              className="shrink-0 rounded-xl h-10 w-10"
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
  )
}
