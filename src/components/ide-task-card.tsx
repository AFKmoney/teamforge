'use client'

import { Task, TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG, TASK_TYPE_CONFIG, AGENT_ROLE_CONFIG, Agent } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface IDETaskCardProps {
  task: Task
  agents: Agent[]
  compact?: boolean
}

const STATUS_BORDER: Record<string, string> = {
  backlog: 'border-l-muted-foreground/40',
  todo: 'border-l-blue-500',
  in_progress: 'border-l-amber-500',
  in_review: 'border-l-violet-500',
  done: 'border-l-emerald-500',
  blocked: 'border-l-red-500',
}

export function IDETaskCard({ task, agents, compact = false }: IDETaskCardProps) {
  const statusConfig = TASK_STATUS_CONFIG[task.status as keyof typeof TASK_STATUS_CONFIG]
  const priorityConfig = TASK_PRIORITY_CONFIG[task.priority as keyof typeof TASK_PRIORITY_CONFIG]
  const typeConfig = TASK_TYPE_CONFIG[task.type as keyof typeof TASK_TYPE_CONFIG]
  const assignee = task.assigneeId ? agents.find((a) => a.id === task.assigneeId) : null
  const roleConfig = assignee ? AGENT_ROLE_CONFIG[assignee.role] : null

  if (compact) {
    return (
      <div className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded text-xs border-l-2',
        STATUS_BORDER[task.status] || 'border-l-muted-foreground/40',
        'bg-card hover:bg-muted/50 transition-colors',
      )}>
        <span className="text-[10px]">{priorityConfig?.icon || '⚪'}</span>
        <span className="truncate flex-1 text-foreground">{task.title}</span>
        {assignee && (
          <span className="text-[10px] shrink-0" title={assignee.name}>{assignee.avatar}</span>
        )}
      </div>
    )
  }

  return (
    <div className={cn(
      'rounded-md border border-l-3 bg-card p-3 hover:shadow-sm transition-all',
      STATUS_BORDER[task.status] || 'border-l-muted-foreground/40',
    )}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-foreground leading-snug">{task.title}</span>
        <span className="text-xs shrink-0">{priorityConfig?.icon || '⚪'}</span>
      </div>
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {statusConfig && (
          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-5', statusConfig.color, statusConfig.bgColor)}>
            {statusConfig.label}
          </Badge>
        )}
        {typeConfig && (
          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-5', typeConfig.color)}>
            {typeConfig.label}
          </Badge>
        )}
        {assignee && roleConfig && (
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-xs">{assignee.avatar}</span>
            <span className={cn('text-[10px]', roleConfig.color)}>{assignee.name}</span>
          </div>
        )}
      </div>
    </div>
  )
}
