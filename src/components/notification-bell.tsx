'use client'

import { Bell, Info, CheckCircle2, AlertTriangle, XCircle, CheckCheck, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import type { Notification, NotificationSeverity } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Severity config
// ---------------------------------------------------------------------------

const SEVERITY_CONFIG: Record<NotificationSeverity, {
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  bgColor: string
}> = {
  info: {
    icon: Info,
    iconColor: 'text-blue-500 dark:text-blue-400',
    bgColor: 'bg-blue-500/10 dark:bg-blue-500/20',
  },
  success: {
    icon: CheckCircle2,
    iconColor: 'text-emerald-500 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/20',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-500 dark:text-amber-400',
    bgColor: 'bg-amber-500/10 dark:bg-amber-500/20',
  },
  error: {
    icon: XCircle,
    iconColor: 'text-red-500 dark:text-red-400',
    bgColor: 'bg-red-500/10 dark:bg-red-500/20',
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString()
}

// ---------------------------------------------------------------------------
// Single notification item
// ---------------------------------------------------------------------------

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification
  onRead: (id: string) => void
}) {
  const config = SEVERITY_CONFIG[notification.severity]
  const Icon = config.icon

  return (
    <motion.button
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={() => {
        if (!notification.read) onRead(notification.id)
      }}
      className={cn(
        'w-full text-left flex items-start gap-3 rounded-lg p-3 transition-colors',
        'hover:bg-muted/50',
        !notification.read && 'bg-muted/30'
      )}
    >
      {/* Severity icon */}
      <div className={cn('shrink-0 mt-0.5 flex items-center justify-center size-7 rounded-full', config.bgColor)}>
        <Icon className={cn('size-3.5', config.iconColor)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-sm font-medium truncate',
            notification.read ? 'text-muted-foreground' : 'text-foreground'
          )}>
            {notification.title}
          </span>
          {!notification.read && (
            <span className="shrink-0 size-2 rounded-full bg-emerald-500" />
          )}
        </div>
        {notification.message && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
            {notification.message}
          </p>
        )}
        <span className="text-[10px] text-muted-foreground/70 mt-1 block">
          {formatTimestamp(notification.timestamp)}
        </span>
      </div>
    </motion.button>
  )
}

// ---------------------------------------------------------------------------
// Notification Bell component
// ---------------------------------------------------------------------------

export function NotificationBell() {
  const notifications = useAppStore((s) => s.notifications)
  const unreadCount = useAppStore((s) => s.unreadNotificationCount)
  const markNotificationRead = useAppStore((s) => s.markNotificationRead)
  const markAllNotificationsRead = useAppStore((s) => s.markAllNotificationsRead)
  const clearNotifications = useAppStore((s) => s.clearNotifications)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-foreground relative"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
              className="absolute -top-0.5 -right-0.5 flex items-center justify-center"
            >
              <span className="absolute size-4 rounded-full bg-red-500 animate-ping opacity-40" />
              <Badge
                variant="destructive"
                className="size-4 min-w-4 p-0 text-[9px] font-bold flex items-center justify-center leading-none z-10"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            </motion.span>
          )}
          <span className="sr-only">
            Notifications{unreadCount > 0 ? ` (${unreadCount} unread)` : ''}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        side="right"
        sideOffset={8}
        className="w-80 p-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold">Notifications</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {notifications.length > 0 && unreadCount > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground"
                onClick={markAllNotificationsRead}
                title="Mark all read"
              >
                <CheckCheck className="size-3.5" />
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive"
                onClick={clearNotifications}
                title="Clear all"
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Notification list */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4">
            <div className="size-10 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <Bell className="size-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">No notifications</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              You&apos;re all caught up
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <AnimatePresence initial={false} mode="popLayout">
              <div className="flex flex-col py-1">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onRead={markNotificationRead}
                  />
                ))}
              </div>
            </AnimatePresence>
          </ScrollArea>
        )}

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="px-4 py-2 text-center">
              <span className="text-[10px] text-muted-foreground/60">
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                {unreadCount > 0 ? ` · ${unreadCount} unread` : ''}
              </span>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
