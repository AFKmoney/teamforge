'use client'

import { useState, useCallback, useMemo } from 'react'
import { type Task, type Agent, type TaskStatus, type TaskPriority, type TaskType, TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG, TASK_TYPE_CONFIG, AGENT_ROLE_CONFIG } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  X,
  Save,
  Clock,
  User,
  Tag,
  Type,
  AlertTriangle,
  CheckSquare,
  FileText,
  History,
  GitBranch,
  ShieldOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface TaskHistoryEntry {
  id: string
  timestamp: string
  field: string
  oldValue: string
  newValue: string
}

interface TaskDetailPanelProps {
  task: Task
  agents: Agent[]
  allTasks: Task[]
  onClose: () => void
  onUpdate: (id: string, updates: Partial<Task>) => void
  onRefresh: () => Promise<void>
}

export function TaskDetailPanel({ task, agents, allTasks, onClose, onUpdate, onRefresh }: TaskDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editDescription, setEditDescription] = useState(task.description)
  const [editStatus, setEditStatus] = useState<TaskStatus>(task.status as TaskStatus)
  const [editPriority, setEditPriority] = useState<TaskPriority>(task.priority as TaskPriority)
  const [editType, setEditType] = useState<TaskType>(task.type as TaskType)
  const [editAssigneeId, setEditAssigneeId] = useState(task.assigneeId || '')
  const [editOutput, setEditOutput] = useState(task.output || '')
  const [isSaving, setIsSaving] = useState(false)

  const assignee = useMemo(() => task.assigneeId ? agents.find((a) => a.id === task.assigneeId) : null, [task.assigneeId, agents])
  const roleConfig = assignee ? AGENT_ROLE_CONFIG[assignee.role] : null

  // Find blocking tasks (tasks this task depends on - via parentTaskId or shared subtasks)
  const blockedBy = useMemo(() => {
    const blocking: Task[] = []
    if (task.parentTaskId) {
      const parent = allTasks.find((t) => t.id === task.parentTaskId)
      if (parent && parent.status !== 'done') blocking.push(parent)
    }
    // Tasks that share subtasks or have this task in their subtasks
    for (const t of allTasks) {
      if (t.id === task.id) continue
      try {
        const subtasks = typeof t.subtasks === 'string' ? JSON.parse(t.subtasks) : t.subtasks
        if (Array.isArray(subtasks) && subtasks.includes(task.id) && t.status !== 'done') {
          if (!blocking.find((b) => b.id === t.id)) blocking.push(t)
        }
      } catch {
        // ignore parse errors
      }
    }
    return blocking
  }, [task, allTasks])

  // Simple task history - derive from the task itself
  const historyEntries = useMemo((): TaskHistoryEntry[] => {
    const entries: TaskHistoryEntry[] = []
    entries.push({
      id: 'created',
      timestamp: task.createdAt,
      field: 'Created',
      oldValue: '',
      newValue: 'Task created',
    })
    if (task.updatedAt !== task.createdAt) {
      entries.push({
        id: 'updated',
        timestamp: task.updatedAt,
        field: 'Updated',
        oldValue: '',
        newValue: 'Task modified',
      })
    }
    if (task.completedAt) {
      entries.push({
        id: 'completed',
        timestamp: task.completedAt,
        field: 'Completed',
        oldValue: task.status,
        newValue: 'done',
      })
    }
    if (task.assigneeId) {
      entries.push({
        id: 'assigned',
        timestamp: task.updatedAt,
        field: 'Assigned',
        oldValue: 'Unassigned',
        newValue: assignee?.name || task.assigneeId,
      })
    }
    return entries
  }, [task, assignee])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const updates: Partial<Task> = {
        title: editTitle.trim(),
        description: editDescription.trim(),
        status: editStatus,
        priority: editPriority,
        type: editType,
        assigneeId: editAssigneeId || null,
        output: editOutput.trim(),
      }
      onUpdate(task.id, updates)

      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (res.ok) {
        await onRefresh()
        toast.success('Task updated')
        setIsEditing(false)
      } else {
        toast.error('Failed to update task')
        await onRefresh()
      }
    } catch {
      toast.error('Failed to update task')
    } finally {
      setIsSaving(false)
    }
  }, [task.id, editTitle, editDescription, editStatus, editPriority, editType, editAssigneeId, editOutput, onUpdate, onRefresh])

  const handleCancel = useCallback(() => {
    setEditTitle(task.title)
    setEditDescription(task.description)
    setEditStatus(task.status as TaskStatus)
    setEditPriority(task.priority as TaskPriority)
    setEditType(task.type as TaskType)
    setEditAssigneeId(task.assigneeId || '')
    setEditOutput(task.output || '')
    setIsEditing(false)
  }, [task])

  const statusConfig = TASK_STATUS_CONFIG[task.status as keyof typeof TASK_STATUS_CONFIG]
  const priorityConfig = TASK_PRIORITY_CONFIG[task.priority as keyof typeof TASK_PRIORITY_CONFIG]
  const typeConfig = TASK_TYPE_CONFIG[task.type as keyof typeof TASK_TYPE_CONFIG]

  return (
    <div className="flex flex-col h-full border-l border-border/40 bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-emerald-500" />
          <span className="text-sm font-semibold">Task Details</span>
        </div>
        <div className="flex items-center gap-1">
          {!isEditing ? (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : <><Save className="size-3" /> Save</>}
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
            <X className="size-3.5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Title */}
          <div className="space-y-1">
            <Label icon={<Tag className="size-3" />} text="Title" />
            {isEditing ? (
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-8 text-sm" />
            ) : (
              <p className="text-sm font-medium text-foreground">{task.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label icon={<FileText className="size-3" />} text="Description" />
            {isEditing ? (
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full min-h-[80px] rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none"
              />
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {task.description || 'No description'}
              </p>
            )}
          </div>

          <Separator />

          {/* Status, Priority, Type grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label icon={<CheckSquare className="size-3" />} text="Status" />
              {isEditing ? (
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
                  className="w-full h-8 rounded-md border bg-transparent px-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500/50"
                >
                  {(Object.entries(TASK_STATUS_CONFIG) as [TaskStatus, typeof TASK_STATUS_CONFIG[TaskStatus]][]).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
              ) : (
                statusConfig && (
                  <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-5', statusConfig.color, statusConfig.bgColor)}>
                    {statusConfig.label}
                  </Badge>
                )
              )}
            </div>
            <div className="space-y-1">
              <Label icon={<AlertTriangle className="size-3" />} text="Priority" />
              {isEditing ? (
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                  className="w-full h-8 rounded-md border bg-transparent px-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500/50"
                >
                  {(Object.entries(TASK_PRIORITY_CONFIG) as [TaskPriority, typeof TASK_PRIORITY_CONFIG[TaskPriority]][]).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.icon} {cfg.label}</option>
                  ))}
                </select>
              ) : (
                priorityConfig && (
                  <span className="text-xs">{priorityConfig.icon} {priorityConfig.label}</span>
                )
              )}
            </div>
            <div className="space-y-1">
              <Label icon={<Type className="size-3" />} text="Type" />
              {isEditing ? (
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as TaskType)}
                  className="w-full h-8 rounded-md border bg-transparent px-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500/50"
                >
                  {(Object.entries(TASK_TYPE_CONFIG) as [TaskType, typeof TASK_TYPE_CONFIG[TaskType]][]).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
              ) : (
                typeConfig && (
                  <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-5', typeConfig.color)}>
                    {typeConfig.label}
                  </Badge>
                )
              )}
            </div>
          </div>

          {/* Assignee */}
          <div className="space-y-1">
            <Label icon={<User className="size-3" />} text="Assignee" />
            {isEditing ? (
              <select
                value={editAssigneeId}
                onChange={(e) => setEditAssigneeId(e.target.value)}
                className="w-full h-8 rounded-md border bg-transparent px-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500/50"
              >
                <option value="">Unassigned</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>{agent.avatar} {agent.name}</option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-2">
                {assignee ? (
                  <>
                    <span className="text-sm">{assignee.avatar}</span>
                    <span className={cn('text-xs font-medium', roleConfig?.color)}>{assignee.name}</span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">{roleConfig?.label}</Badge>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">Unassigned</span>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Subtasks */}
          <div className="space-y-1">
            <Label icon={<CheckSquare className="size-3" />} text="Subtasks" />
            {(() => {
              try {
                const subtasks = typeof task.subtasks === 'string' ? JSON.parse(task.subtasks) : task.subtasks
                if (Array.isArray(subtasks) && subtasks.length > 0) {
                  return (
                    <div className="space-y-1">
                      {subtasks.map((st: string, i: number) => {
                        const subTask = allTasks.find((t) => t.id === st)
                        return (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className={cn('size-2 rounded-full', subTask?.status === 'done' ? 'bg-emerald-500' : 'bg-muted-foreground/40')} />
                            <span className={subTask?.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}>
                              {subTask?.title || st}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )
                }
              } catch {
                // ignore
              }
              return <span className="text-xs text-muted-foreground">No subtasks</span>
            })()}
          </div>

          {/* Output */}
          <div className="space-y-1">
            <Label icon={<FileText className="size-3" />} text="Output" />
            {isEditing ? (
              <textarea
                value={editOutput}
                onChange={(e) => setEditOutput(e.target.value)}
                className="w-full min-h-[60px] rounded-md border bg-transparent px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none font-mono"
              />
            ) : (
              <p className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                {task.output || 'No output'}
              </p>
            )}
          </div>

          {/* Blocked By */}
          {blockedBy.length > 0 && (
            <div className="space-y-1">
              <Label icon={<ShieldOff className="size-3" />} text="Blocked By" />
              <div className="space-y-1">
                {blockedBy.map((bt) => (
                  <div key={bt.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-red-500/5 border border-red-500/20 text-xs">
                    <ShieldOff className="size-3 text-red-500 shrink-0" />
                    <span className="text-foreground truncate">{bt.title}</span>
                    <Badge variant="outline" className={cn('text-[9px] px-1 py-0 h-4 ml-auto shrink-0', TASK_STATUS_CONFIG[bt.status as keyof typeof TASK_STATUS_CONFIG]?.color)}>
                      {TASK_STATUS_CONFIG[bt.status as keyof typeof TASK_STATUS_CONFIG]?.label}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Timestamps */}
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="size-3" />
              <span>Created: {new Date(task.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="size-3" />
              <span>Updated: {new Date(task.updatedAt).toLocaleString()}</span>
            </div>
            {task.completedAt && (
              <div className="flex items-center gap-2">
                <CheckSquare className="size-3 text-emerald-500" />
                <span>Completed: {new Date(task.completedAt).toLocaleString()}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* History */}
          <div className="space-y-1.5">
            <Label icon={<History className="size-3" />} text="History" />
            <div className="space-y-1">
              {historyEntries.map((entry) => (
                <div key={entry.id} className="flex items-start gap-2 text-xs py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-foreground">{entry.newValue}</span>
                    {entry.field !== 'Created' && entry.oldValue && (
                      <span className="text-muted-foreground"> (was: {entry.oldValue})</span>
                    )}
                    <div className="text-[10px] text-muted-foreground/60">
                      {new Date(entry.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

function Label({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
      {icon}
      <span>{text}</span>
    </div>
  )
}
