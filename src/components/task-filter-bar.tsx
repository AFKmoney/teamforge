'use client'

import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Download,
  FileJson,
  FileSpreadsheet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TASK_PRIORITY_CONFIG, TASK_TYPE_CONFIG, TASK_STATUS_CONFIG, type TaskPriority, type TaskType, type TaskStatus, type Task, type Agent } from '@/lib/types'
import { toast } from 'sonner'

export interface TaskFilters {
  search: string
  assigneeId: string | null
  priorities: TaskPriority[]
  types: TaskType[]
  statuses: TaskStatus[]
}

export type SortField = 'priority' | 'createdAt' | 'updatedAt' | 'title'
export type SortDirection = 'asc' | 'desc'

export interface TaskSort {
  field: SortField
  direction: SortDirection
}

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

interface TaskFilterBarProps {
  filters: TaskFilters
  onFiltersChange: (filters: TaskFilters) => void
  sort: TaskSort
  onSortChange: (sort: TaskSort) => void
  agents: Agent[]
  tasks: Task[]
  selectedTaskIds: Set<string>
  onBulkAction: (action: string, value?: string) => void
}

export function TaskFilterBar({
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  agents,
  tasks,
  selectedTaskIds,
  onBulkAction,
}: TaskFilterBarProps) {
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false)
  const [sortPopoverOpen, setSortPopoverOpen] = useState(false)

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.search) count++
    if (filters.assigneeId) count++
    count += filters.priorities.length
    count += filters.types.length
    count += filters.statuses.length
    return count
  }, [filters])

  const handleClearFilters = useCallback(() => {
    onFiltersChange({
      search: '',
      assigneeId: null,
      priorities: [],
      types: [],
      statuses: [],
    })
  }, [onFiltersChange])

  const togglePriority = useCallback((p: TaskPriority) => {
    const next = filters.priorities.includes(p)
      ? filters.priorities.filter((x) => x !== p)
      : [...filters.priorities, p]
    onFiltersChange({ ...filters, priorities: next })
  }, [filters, onFiltersChange])

  const toggleType = useCallback((t: TaskType) => {
    const next = filters.types.includes(t)
      ? filters.types.filter((x) => x !== t)
      : [...filters.types, t]
    onFiltersChange({ ...filters, types: next })
  }, [filters, onFiltersChange])

  const toggleStatus = useCallback((s: TaskStatus) => {
    const next = filters.statuses.includes(s)
      ? filters.statuses.filter((x) => x !== s)
      : [...filters.statuses, s]
    onFiltersChange({ ...filters, statuses: next })
  }, [filters, onFiltersChange])

  const handleExportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'tasks.json'
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${tasks.length} tasks as JSON`)
  }, [tasks])

  const handleExportCSV = useCallback(() => {
    const headers = ['id', 'title', 'description', 'status', 'priority', 'type', 'assigneeId', 'createdAt', 'updatedAt']
    const rows = tasks.map((t) =>
      headers.map((h) => {
        const val = (t as Record<string, unknown>)[h]
        const str = val === null || val === undefined ? '' : String(val)
        return `"${str.replace(/"/g, '""')}"`
      }).join(',')
    )
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'tasks.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${tasks.length} tasks as CSV`)
  }, [tasks])

  const handleSortFieldChange = useCallback((field: SortField) => {
    if (sort.field === field) {
      onSortChange({ ...sort, direction: sort.direction === 'asc' ? 'desc' : 'asc' })
    } else {
      onSortChange({ field, direction: 'asc' })
    }
  }, [sort, onSortChange])

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[160px] max-w-[240px]">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          placeholder="Search tasks..."
          className="h-7 text-xs pl-7 pr-2"
        />
        {filters.search && (
          <button
            onClick={() => onFiltersChange({ ...filters, search: '' })}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 size-3.5 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      {/* Filter button */}
      <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 relative">
            <Filter className="size-3" />
            Filter
            {activeFilterCount > 0 && (
              <Badge className="size-4 p-0 flex items-center justify-center text-[9px] rounded-full bg-emerald-500 text-white absolute -top-1 -right-1">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3 space-y-3" align="start">
          {/* Assignee filter */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Assignee</span>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => onFiltersChange({ ...filters, assigneeId: null })}
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] border transition-colors',
                  !filters.assigneeId ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'hover:bg-muted/50',
                )}
              >
                All
              </button>
              <button
                onClick={() => onFiltersChange({ ...filters, assigneeId: 'unassigned' })}
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] border transition-colors',
                  filters.assigneeId === 'unassigned' ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400' : 'hover:bg-muted/50',
                )}
              >
                Unassigned
              </button>
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => onFiltersChange({ ...filters, assigneeId: agent.id })}
                  className={cn(
                    'flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border transition-colors',
                    filters.assigneeId === agent.id ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'hover:bg-muted/50',
                  )}
                >
                  <span>{agent.avatar}</span>
                  <span>{agent.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Priority filter */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Priority</span>
            <div className="flex flex-wrap gap-1">
              {(Object.entries(TASK_PRIORITY_CONFIG) as [TaskPriority, typeof TASK_PRIORITY_CONFIG[TaskPriority]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => togglePriority(key)}
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] border transition-colors',
                    filters.priorities.includes(key)
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : 'hover:bg-muted/50',
                  )}
                >
                  {cfg.icon} {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Type filter */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Type</span>
            <div className="flex flex-wrap gap-1">
              {(Object.entries(TASK_TYPE_CONFIG) as [TaskType, typeof TASK_TYPE_CONFIG[TaskType]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => toggleType(key)}
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] border transition-colors',
                    filters.types.includes(key)
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : 'hover:bg-muted/50',
                  )}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status filter */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Status</span>
            <div className="flex flex-wrap gap-1">
              {(Object.entries(TASK_STATUS_CONFIG) as [TaskStatus, typeof TASK_STATUS_CONFIG[TaskStatus]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => toggleStatus(key)}
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] border transition-colors',
                    filters.statuses.includes(key)
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : 'hover:bg-muted/50',
                  )}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" className="h-6 text-[10px] w-full" onClick={handleClearFilters}>
              Clear all filters
            </Button>
          )}
        </PopoverContent>
      </Popover>

      {/* Sort button */}
      <Popover open={sortPopoverOpen} onOpenChange={setSortPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
            <ArrowUpDown className="size-3" />
            Sort
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          {([
            { field: 'priority' as SortField, label: 'Priority' },
            { field: 'createdAt' as SortField, label: 'Created Date' },
            { field: 'updatedAt' as SortField, label: 'Updated Date' },
            { field: 'title' as SortField, label: 'Title' },
          ]).map((opt) => (
            <button
              key={opt.field}
              onClick={() => handleSortFieldChange(opt.field)}
              className={cn(
                'flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs hover:bg-muted/50 transition-colors',
                sort.field === opt.field && 'text-emerald-600 dark:text-emerald-400',
              )}
            >
              {sort.field === opt.field ? (
                sort.direction === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
              ) : (
                <span className="size-3" />
              )}
              {opt.label}
              {sort.field === opt.field && (
                <span className="text-muted-foreground text-[10px] ml-auto">
                  {sort.direction === 'asc' ? 'Ascending' : 'Descending'}
                </span>
              )}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      {/* Export dropdown */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
            <Download className="size-3" />
            Export
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-1" align="start">
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs hover:bg-muted/50 transition-colors"
          >
            <FileJson className="size-3.5 text-emerald-500" />
            Export as JSON
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs hover:bg-muted/50 transition-colors"
          >
            <FileSpreadsheet className="size-3.5 text-amber-500" />
            Export as CSV
          </button>
        </PopoverContent>
      </Popover>

      {/* Bulk actions (shown when tasks selected) */}
      {selectedTaskIds.size > 0 && (
        <div className="flex items-center gap-1.5 ml-1">
          <Badge variant="secondary" className="text-[10px] h-5">
            {selectedTaskIds.size} selected
          </Badge>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-amber-500/30">
                Change Status
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1" align="start">
              {(Object.entries(TASK_STATUS_CONFIG) as [TaskStatus, typeof TASK_STATUS_CONFIG[TaskStatus]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => onBulkAction('status', key)}
                  className={cn('flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs hover:bg-muted/50 transition-colors', cfg.color)}
                >
                  {cfg.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-amber-500/30">
                Change Priority
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1" align="start">
              {(Object.entries(TASK_PRIORITY_CONFIG) as [TaskPriority, typeof TASK_PRIORITY_CONFIG[TaskPriority]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => onBulkAction('priority', key)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs hover:bg-muted/50 transition-colors"
                >
                  {cfg.icon} {cfg.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-amber-500/30">
                Assign To
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-1" align="start">
              <button
                onClick={() => onBulkAction('assignee', '')}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs hover:bg-muted/50 transition-colors"
              >
                Unassign
              </button>
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => onBulkAction('assignee', agent.id)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs hover:bg-muted/50 transition-colors"
                >
                  <span>{agent.avatar}</span> {agent.name}
                </button>
              ))}
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1 border-red-500/30 text-red-500 hover:bg-red-500/10"
            onClick={() => onBulkAction('delete')}
          >
            Delete
          </Button>
        </div>
      )}

      {/* Task count */}
      <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
        {tasks.length} task{tasks.length !== 1 ? 's' : ''}
      </span>
    </div>
  )
}

// Helper to apply filters and sorting
export function applyTaskFilters(tasks: Task[], filters: TaskFilters): Task[] {
  return tasks.filter((task) => {
    if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase())) return false
    if (filters.assigneeId === 'unassigned' && task.assigneeId) return false
    if (filters.assigneeId && filters.assigneeId !== 'unassigned' && task.assigneeId !== filters.assigneeId) return false
    if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) return false
    if (filters.types.length > 0 && !filters.types.includes(task.type)) return false
    if (filters.statuses.length > 0 && !filters.statuses.includes(task.status)) return false
    return true
  })
}

export function applyTaskSort(tasks: Task[], sort: TaskSort): Task[] {
  return [...tasks].sort((a, b) => {
    let cmp = 0
    switch (sort.field) {
      case 'priority':
        cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
        break
      case 'createdAt':
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break
      case 'updatedAt':
        cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        break
      case 'title':
        cmp = a.title.localeCompare(b.title)
        break
    }
    return sort.direction === 'asc' ? cmp : -cmp
  })
}
