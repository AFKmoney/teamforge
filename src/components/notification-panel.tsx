'use client'

import { useAppStore } from '@/lib/store'
import type { Notification, NotificationType, NotificationCategory } from '@/lib/types'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Hammer,
  Bot,
  Settings,
  MessageSquare,
  Filter,
  Activity,
  FileCode2,
  AlertCircle,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'

// Relative time formatter
function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

// Group notifications by time period
function getTimeGroup(dateStr: string): 'today' | 'yesterday' | 'older' {
  const d = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const messageDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())

  if (messageDate.getTime() === today.getTime()) return 'today'
  if (messageDate.getTime() === yesterday.getTime()) return 'yesterday'
  return 'older'
}

const TIME_GROUP_LABELS: Record<string, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  older: 'Older',
}

// Type config for colors and icons
const NOTIFICATION_TYPE_CONFIG: Record<NotificationType, { borderColor: string; bgColor: string; icon: React.ElementType; iconColor: string; label: string }> = {
  info: {
    borderColor: 'border-l-zinc-400',
    bgColor: 'bg-zinc-500/5',
    icon: Info,
    iconColor: 'text-zinc-500',
    label: 'Info',
  },
  success: {
    borderColor: 'border-l-emerald-500',
    bgColor: 'bg-emerald-500/5',
    icon: CheckCircle2,
    iconColor: 'text-emerald-500',
    label: 'Success',
  },
  warning: {
    borderColor: 'border-l-amber-500',
    bgColor: 'bg-amber-500/5',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    label: 'Warning',
  },
  error: {
    borderColor: 'border-l-red-500',
    bgColor: 'bg-red-500/5',
    icon: XCircle,
    iconColor: 'text-red-500',
    label: 'Error',
  },
}

const NOTIFICATION_CATEGORY_CONFIG: Record<NotificationCategory, { icon: React.ElementType; label: string; color: string }> = {
  task: { icon: Check, label: 'Task', color: 'text-emerald-500' },
  build: { icon: Hammer, label: 'Build', color: 'text-orange-500' },
  agent: { icon: Bot, label: 'Agent', color: 'text-violet-500' },
  system: { icon: Settings, label: 'System', color: 'text-zinc-500' },
  chat: { icon: MessageSquare, label: 'Chat', color: 'text-pink-500' },
  task_completed: { icon: CheckCircle2, label: 'Task Done', color: 'text-emerald-500' },
  agent_status: { icon: Activity, label: 'Agent Status', color: 'text-sky-500' },
  build_result: { icon: Hammer, label: 'Build Result', color: 'text-orange-500' },
  code_change: { icon: FileCode2, label: 'Code Change', color: 'text-violet-500' },
}

// Web Audio API notification sound
function playNotificationSound() {
  try {
    const ctx = new AudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    oscillator.frequency.setValueAtTime(880, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15)
    gainNode.gain.setValueAtTime(0.12, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.2)
  } catch {
    // Web Audio API not available — silently skip
  }
}

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: Notification
  onMarkRead: (id: string) => void
}) {
  const typeConfig = NOTIFICATION_TYPE_CONFIG[notification.type]
  const categoryConfig = NOTIFICATION_CATEGORY_CONFIG[notification.category]
  const TypeIcon = typeConfig.icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10, height: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'group relative flex items-start gap-2.5 px-3 py-2.5 border-l-[3px] cursor-pointer transition-colors hover:bg-muted/50',
        typeConfig.borderColor,
        !notification.read && typeConfig.bgColor,
      )}
      onClick={() => {
        if (!notification.read) onMarkRead(notification.id)
      }}
    >
      {/* Type icon */}
      <div className={cn('shrink-0 mt-0.5', typeConfig.iconColor)}>
        <TypeIcon className="size-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            'text-xs font-medium leading-tight truncate',
            !notification.read ? 'text-foreground' : 'text-muted-foreground',
          )}>
            {notification.title}
          </p>
          {!notification.read && (
            <span className="shrink-0 size-2 rounded-full bg-primary mt-1" />
          )}
        </div>
        <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {/* Category badge */}
          <span className={cn('flex items-center gap-0.5 text-[10px]', categoryConfig.color)}>
            {(() => {
              const CatIcon = categoryConfig.icon
              return <CatIcon className="size-2.5" />
            })()}
            {categoryConfig.label}
          </span>
          {/* Priority badge */}
          <span className={cn('text-[10px]', typeConfig.iconColor)}>
            {typeConfig.label}
          </span>
          {/* Timestamp */}
          <span className="text-[10px] text-muted-foreground/70">
            {formatRelativeTime(notification.createdAt)}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<NotificationCategory | 'all'>('all')
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === 'undefined') return true
    try {
      return localStorage.getItem('teamforge-notification-sound') !== 'false'
    } catch {
      return true
    }
  })
  const prevUnreadCountRef = useRef(0)
  const notifications = useAppStore((s) => s.notifications)
  const markNotificationRead = useAppStore((s) => s.markNotificationRead)
  const markAllNotificationsRead = useAppStore((s) => s.markAllNotificationsRead)
  const clearNotifications = useAppStore((s) => s.clearNotifications)

  const unreadCount = notifications.filter((n) => !n.read).length
  const hasUnread = unreadCount > 0

  // Play notification sound when new unread notifications appear
  useEffect(() => {
    if (soundEnabled && unreadCount > prevUnreadCountRef.current && prevUnreadCountRef.current >= 0) {
      playNotificationSound()
    }
    prevUnreadCountRef.current = unreadCount
  }, [unreadCount, soundEnabled])

  const handleToggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev
      try {
        localStorage.setItem('teamforge-notification-sound', String(next))
      } catch {
        // Ignore localStorage errors
      }
      return next
    })
  }, [])

  const handleMarkAllRead = useCallback(() => {
    markAllNotificationsRead()
  }, [markAllNotificationsRead])

  const handleClear = useCallback(() => {
    clearNotifications()
  }, [clearNotifications])

  // Filter notifications by category
  const filteredNotifications = useMemo(() => {
    if (categoryFilter === 'all') return notifications
    return notifications.filter((n) => n.category === categoryFilter)
  }, [notifications, categoryFilter])

  // Group notifications by time
  const groupedNotifications = useMemo(() => {
    const groups: Record<string, Notification[]> = { today: [], yesterday: [], older: [] }
    for (const notif of filteredNotifications) {
      const group = getTimeGroup(notif.createdAt)
      groups[group].push(notif)
    }
    return groups
  }, [filteredNotifications])

  // Count per category for filter badges
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: notifications.length }
    for (const n of notifications) {
      counts[n.category] = (counts[n.category] || 0) + 1
    }
    return counts
  }, [notifications])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="relative size-7"
          aria-label={`Notifications${hasUnread ? ` (${unreadCount} unread)` : ''}`}
        >
          <motion.div
            animate={hasUnread ? {
              rotate: [0, 15, -15, 10, -10, 0],
            } : {}}
            transition={hasUnread ? {
              duration: 0.6,
              repeat: Infinity,
              repeatDelay: 3,
              ease: 'easeInOut',
            } : {}}
          >
            <Bell className="size-3.5" />
          </motion.div>
          <AnimatePresence>
            {hasUnread && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                className="absolute -top-0.5 -right-0.5"
              >
                <Badge
                  variant="destructive"
                  className="size-4 p-0 flex items-center justify-center text-[9px] font-bold leading-none border-2 border-card"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 p-0 gap-0 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-semibold">Notifications</h4>
            {hasUnread && (
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            {/* Sound toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
              onClick={handleToggleSound}
              title={soundEnabled ? 'Mute notifications' : 'Unmute notifications'}
            >
              {soundEnabled ? <Volume2 className="size-3" /> : <VolumeX className="size-3" />}
            </Button>
            {hasUnread && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
                onClick={handleMarkAllRead}
              >
                <CheckCheck className="size-3" />
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-[10px] gap-1 text-muted-foreground hover:text-destructive"
                onClick={handleClear}
                title="Clear all notifications"
              >
                <Trash2 className="size-3" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Category filter */}
        {notifications.length > 0 && (
          <div className="flex items-center gap-1 px-3 py-1.5 border-b bg-muted/10 overflow-x-auto scrollbar-none">
            <Filter className="size-3 text-muted-foreground/50 shrink-0" />
            <button
              onClick={() => setCategoryFilter('all')}
              className={cn(
                'px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors whitespace-nowrap',
                categoryFilter === 'all'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground/60 hover:text-foreground',
              )}
            >
              All ({categoryCounts.all})
            </button>
            {(Object.keys(NOTIFICATION_CATEGORY_CONFIG) as NotificationCategory[]).map((cat) => {
              const config = NOTIFICATION_CATEGORY_CONFIG[cat]
              const CatIcon = config.icon
              const count = categoryCounts[cat] || 0
              if (count === 0) return null
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={cn(
                    'flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors whitespace-nowrap',
                    categoryFilter === cat
                      ? `${config.color} bg-primary/10`
                      : 'text-muted-foreground/60 hover:text-foreground',
                  )}
                >
                  <CatIcon className="size-2.5" />
                  {config.label} ({count})
                </button>
              )
            })}
          </div>
        )}

        {/* Notification list grouped by time */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div className="size-10 rounded-full bg-muted/50 flex items-center justify-center mb-2">
              <Bell className="size-5 text-muted-foreground/50" />
            </div>
            <p className="text-xs text-muted-foreground font-medium">No notifications</p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">You&apos;re all caught up!</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div className="size-10 rounded-full bg-muted/50 flex items-center justify-center mb-2">
              <Filter className="size-5 text-muted-foreground/50" />
            </div>
            <p className="text-xs text-muted-foreground font-medium">No matching notifications</p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">Try a different category filter</p>
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            {(['today', 'yesterday', 'older'] as const).map((group) => {
              const groupNotifs = groupedNotifications[group]
              if (groupNotifs.length === 0) return null
              return (
                <div key={group}>
                  {/* Time group header */}
                  <div className="sticky top-0 z-10 px-3 py-1 bg-muted/20 border-b border-border/30">
                    <span className="text-[9px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
                      {TIME_GROUP_LABELS[group]}
                    </span>
                  </div>
                  <AnimatePresence mode="popLayout">
                    {groupNotifs.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkRead={markNotificationRead}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )
            })}
          </ScrollArea>
        )}

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="px-3 py-1.5 bg-muted/20">
              <p className="text-[10px] text-muted-foreground/60 text-center">
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                {hasUnread ? ` · ${unreadCount} unread` : ''}
              </p>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
