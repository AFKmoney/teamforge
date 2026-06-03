'use client'

import { Task, TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG, TASK_TYPE_CONFIG, AGENT_ROLE_CONFIG, Agent } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'

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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      task,
      type: 'task',
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const statusConfig = TASK_STATUS_CONFIG[task.status as keyof typeof TASK_STATUS_CONFIG]
  const priorityConfig = TASK_PRIORITY_CONFIG[task.priority as keyof typeof TASK_PRIORITY_CONFIG]
  const typeConfig = TASK_TYPE_CONFIG[task.type as keyof typeof TASK_TYPE_CONFIG]
  const assignee = task.assigneeId ? agents.find((a) => a.id === task.assigneeId) : null
  const roleConfig = assignee ? AGENT_ROLE_CONFIG[assignee.role] : null

  if (compact) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded text-xs border-l-2',
          STATUS_BORDER[task.status] || 'border-l-muted-foreground/40',
          'bg-card hover:bg-muted/50 transition-colors',
          isDragging && 'opacity-50 shadow-lg scale-[1.02]',
        )}
        {...attributes}
        {...listeners}
      >
        <span className="text-[10px]">{priorityConfig?.icon || '⚪'}</span>
        <span className="truncate flex-1 text-foreground">{task.title}</span>
        {assignee && (
          <span className="text-[10px] shrink-0" title={assignee.name}>{assignee.avatar}</span>
        )}
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-md border border-l-3 bg-card p-3 transition-all group',
        STATUS_BORDER[task.status] || 'border-l-muted-foreground/40',
        isDragging
          ? 'shadow-xl scale-[1.03] ring-2 ring-emerald-500/30 opacity-90 z-50'
          : 'hover:shadow-sm',
      )}
    >
      <div className="flex items-start gap-1.5">
        {/* Drag handle */}
        <button
          className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground/80 transition-colors shrink-0 touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" />
        </button>
        <div className="flex-1 min-w-0">
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
      </div>
    </div>
  )
}
