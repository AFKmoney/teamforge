'use client'

import { useAppStore } from '@/lib/store'
import type { Notification, NotificationType, NotificationCategory } from '@/lib/types'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Bell, Check, CheckCheck, Trash2, Info, CheckCircle2, AlertTriangle, XCircle, Hammer, Bot, Settings, MessageSquare } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useState, useEffect, useCallback } from 'react'

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

// Type config for colors and icons
const NOTIFICATION_TYPE_CONFIG: Record<NotificationType, { borderColor: string; bgColor: string; icon: React.ElementType; iconColor: string }> = {
  info: {
    borderColor: 'border-l-blue-500',
    bgColor: 'bg-blue-500/5',
    icon: Info,
    iconColor: 'text-blue-500',
  },
  success: {
    borderColor: 'border-l-emerald-500',
    bgColor: 'bg-emerald-500/5',
    icon: CheckCircle2,
    iconColor: 'text-emerald-500',
  },
  warning: {
    borderColor: 'border-l-amber-500',
    bgColor: 'bg-amber-500/5',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
  },
  error: {
    borderColor: 'border-l-red-500',
    bgColor: 'bg-red-500/5',
    icon: XCircle,
    iconColor: 'text-red-500',
  },
}

const NOTIFICATION_CATEGORY_CONFIG: Record<NotificationCategory, { icon: React.ElementType; label: string }> = {
  task: { icon: Check, label: 'Task' },
  build: { icon: Hammer, label: 'Build' },
  agent: { icon: Bot, label: 'Agent' },
  system: { icon: Settings, label: 'System' },
  chat: { icon: MessageSquare, label: 'Chat' },
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
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/70">
            {(() => {
              const CatIcon = categoryConfig.icon
              return <CatIcon className="size-2.5" />
            })()}
            {categoryConfig.label}
          </span>
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
  const notifications = useAppStore((s) => s.notifications)
  const markNotificationRead = useAppStore((s) => s.markNotificationRead)
  const markAllNotificationsRead = useAppStore((s) => s.markAllNotificationsRead)
  const clearNotifications = useAppStore((s) => s.clearNotifications)

  const unreadCount = notifications.filter((n) => !n.read).length
  const hasUnread = unreadCount > 0

  const handleMarkAllRead = useCallback(() => {
    markAllNotificationsRead()
  }, [markAllNotificationsRead])

  const handleClear = useCallback(() => {
    clearNotifications()
  }, [clearNotifications])

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
              >
                <Trash2 className="size-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Notification list */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div className="size-10 rounded-full bg-muted/50 flex items-center justify-center mb-2">
              <Bell className="size-5 text-muted-foreground/50" />
            </div>
            <p className="text-xs text-muted-foreground font-medium">No notifications</p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">You&apos;re all caught up!</p>
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <AnimatePresence mode="popLayout">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={markNotificationRead}
                />
              ))}
            </AnimatePresence>
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
