'use client'

import { useAppStore } from '@/lib/store'
import { AGENT_ROLE_CONFIG, AGENT_STATUS_CONFIG, type ProjectFile, type Agent, type AgentRole, type AgentStatus, type AgentActivity, type GitFileStatus } from '@/lib/types'
import { FileCreationDialog } from '@/components/file-creation-dialog'
import { GitPanel } from '@/components/git-panel'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  PanelLeftClose,
  PanelLeftOpen,
  FolderOpen,
  FileCode2,
  Folder,
  ChevronRight,
  ChevronDown,
  Users,
  Search,
  Plus,
  FilePlus,
  FolderPlus,
  Trash2,
  Pencil,
  X,
  Activity,
  Play,
  CheckCircle2,
  TestTube2,
  Rocket,
  MessageSquare,
  Pin,
  FileX2,
  Clipboard,
  Files,
  ChevronsDownUp,
  GitBranch,
  RefreshCw,
  BarChart3,
  Upload,
  ArrowRightLeft,
  UserCheck,
  CheckCircle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react'
import { cn, formatRelativeTime, useHydrated } from '@/lib/utils'
import { toast } from 'sonner'

// File tree node type
interface FileTreeNode {
  name: string
  path: string
  isDir: boolean
  children: FileTreeNode[]
  file?: ProjectFile
}

function buildFileTree(files: ProjectFile[]): FileTreeNode[] {
  const root: FileTreeNode[] = []

  for (const file of files) {
    const parts = file.path.split('/')
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      const path = parts.slice(0, i + 1).join('/')

      if (isLast && !file.isDirectory) {
        // File
        current.push({ name: part, path, isDir: false, children: [], file })
      } else {
        // Directory
        let dir = current.find((n) => n.isDir && n.name === part)
        if (!dir) {
          dir = { name: part, path, isDir: true, children: [], file: file.isDirectory ? file : undefined }
          current.push(dir)
        }
        current = dir.children
      }
    }
  }

  // Sort: directories first, then alphabetical
  const sortNodes = (nodes: FileTreeNode[]): FileTreeNode[] => {
    return nodes.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
      return a.name.localeCompare(b.name)
    }).map((n) => ({ ...n, children: sortNodes(n.children) }))
  }

  return sortNodes(root)
}

// Get file icon based on extension
function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'tsx':
    case 'ts':
      return <FileCode2 className="size-3.5 text-blue-500" />
    case 'jsx':
    case 'js':
      return <FileCode2 className="size-3.5 text-amber-500" />
    case 'json':
      return <FileCode2 className="size-3.5 text-yellow-500" />
    case 'prisma':
      return <FileCode2 className="size-3.5 text-teal-500" />
    case 'css':
      return <FileCode2 className="size-3.5 text-pink-500" />
    case 'md':
    case 'mdx':
      return <FileCode2 className="size-3.5 text-gray-400" />
    default:
      return <FileCode2 className="size-3.5 text-muted-foreground" />
  }
}

// Get the file type accent color for the left bar on hover
function getFileTypeColor(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'tsx': case 'ts': return 'bg-blue-500'
    case 'jsx': case 'js': return 'bg-amber-500'
    case 'json': return 'bg-yellow-500'
    case 'prisma': return 'bg-teal-500'
    case 'css': return 'bg-pink-500'
    case 'md': case 'mdx': return 'bg-gray-400'
    default: return 'bg-muted-foreground'
  }
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Format line count for display
function formatLineInfo(content: string): string {
  const lines = content.split('\n').length
  return `${lines}L`
}

const FileTreeNodeView = memo(function FileTreeNodeView({
  node,
  depth,
  activeFileId,
  onFileClick,
  expandedDirs,
  toggleDir,
  onContextMenuAction,
  highlightPath,
  gitFileStatuses,
  unsavedFileIds,
}: {
  node: FileTreeNode
  depth: number
  activeFileId: string | null
  onFileClick: (file: ProjectFile) => void
  expandedDirs: Set<string>
  toggleDir: (path: string) => void
  onContextMenuAction: (action: string, node: FileTreeNode) => void
  highlightPath?: string | null
  gitFileStatuses: Record<string, GitFileStatus>
  unsavedFileIds: Set<string>
}) {
  const isExpanded = expandedDirs.has(node.path)
  const isActive = node.file ? node.file.id === activeFileId : false
  const fileSize = node.file && !node.isDir ? new Blob([node.file.content]).size : 0
  const isHighlighted = highlightPath === node.path

  // Git status badge config
  const GIT_STATUS_BADGE: Record<GitFileStatus, { label: string; color: string }> = {
    modified: { label: 'M', color: 'text-amber-500' },
    untracked: { label: 'U', color: 'text-emerald-500' },
    deleted: { label: 'D', color: 'text-red-500' },
    staged: { label: 'S', color: 'text-blue-500' },
  }

  // Determine git status for this file
  const gitStatus = node.file && !node.isDir
    ? (gitFileStatuses[node.path] || (unsavedFileIds.has(node.file.id) ? 'modified' as GitFileStatus : undefined))
    : undefined

  if (node.isDir) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div>
            <button
              onClick={() => toggleDir(node.path)}
              className={cn(
                'flex items-center gap-1.5 w-full px-2 py-1 text-xs hover:bg-muted/60 transition-colors rounded-sm group',
                isHighlighted && 'bg-amber-500/10 ring-1 ring-amber-500/30',
              )}
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
            >
              {isExpanded ? (
                <ChevronDown className="size-3 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="size-3 text-muted-foreground shrink-0" />
              )}
              <Folder className="size-3.5 text-amber-500/80 shrink-0" />
              <span className="text-foreground truncate">{node.name}</span>
              <span className="text-[9px] text-muted-foreground/50 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {node.children.length}
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  {node.children.map((child) => (
                    <FileTreeNodeView
                      key={child.path}
                      node={child}
                      depth={depth + 1}
                      activeFileId={activeFileId}
                      onFileClick={onFileClick}
                      expandedDirs={expandedDirs}
                      toggleDir={toggleDir}
                      onContextMenuAction={onContextMenuAction}
                      highlightPath={highlightPath}
                      gitFileStatuses={gitFileStatuses}
                      unsavedFileIds={unsavedFileIds}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-52">
          <ContextMenuItem onClick={() => onContextMenuAction('newFile', node)} className="gap-2 text-xs">
            <FilePlus className="size-3.5" />
            New File
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onContextMenuAction('newFolder', node)} className="gap-2 text-xs">
            <FolderPlus className="size-3.5" />
            New Folder
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => onContextMenuAction('rename', node)} className="gap-2 text-xs">
            <Pencil className="size-3.5" />
            Rename
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => onContextMenuAction('copyPath', node)} className="gap-2 text-xs">
            <Clipboard className="size-3.5" />
            Copy Path
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => onContextMenuAction('delete', node)} className="gap-2 text-xs text-red-500 focus:text-red-500">
            <Trash2 className="size-3.5" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    )
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          onClick={() => node.file && onFileClick(node.file)}
          className={cn(
            'file-tree-item flex items-center gap-1.5 w-full px-2 py-1 text-xs hover:bg-muted/60 transition-colors rounded-sm group relative',
            isActive && 'bg-primary/10 text-primary active-file-glow',
            isHighlighted && !isActive && 'bg-amber-500/10 ring-1 ring-amber-500/30',
          )}
          style={{ paddingLeft: `${depth * 12 + 20}px` }}
        >
          <div className={cn('file-color-bar', getFileTypeColor(node.name))} />
          {getFileIcon(node.name)}
          <span className={cn('truncate', isActive ? 'text-primary font-medium' : 'text-foreground/80')}>{node.name}</span>
          {gitStatus && (
            <span className={cn('text-[9px] font-mono font-bold shrink-0 ml-0.5', GIT_STATUS_BADGE[gitStatus].color)}>
              {GIT_STATUS_BADGE[gitStatus].label}
            </span>
          )}
          {isActive && (
            <Pin className="size-2.5 text-emerald-500/60 shrink-0 ml-auto" />
          )}
          {!isActive && !gitStatus && fileSize > 0 && node.file && (
            <span className="text-[9px] text-muted-foreground/40 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              {formatLineInfo(node.file.content)} · {formatFileSize(fileSize)}
            </span>
          )}
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem onClick={() => onContextMenuAction('openInEditor', node)} className="gap-2 text-xs">
          <FileCode2 className="size-3.5" />
          Open in Editor
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onContextMenuAction('rename', node)} className="gap-2 text-xs">
          <Pencil className="size-3.5" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onContextMenuAction('duplicate', node)} className="gap-2 text-xs">
          <Files className="size-3.5" />
          Duplicate
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onContextMenuAction('copyPath', node)} className="gap-2 text-xs">
          <Clipboard className="size-3.5" />
          Copy Path
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onContextMenuAction('delete', node)} className="gap-2 text-xs text-red-500 focus:text-red-500">
          <Trash2 className="size-3.5" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
})

// Activity type config
const ACTIVITY_TYPE_CONFIG: Record<string, { icon: React.ReactNode; borderColor: string; label: string }> = {
  task_started: { icon: <Play className="size-3 text-emerald-500" />, borderColor: 'border-l-emerald-500', label: 'Task Started' },
  task_assigned: { icon: <UserCheck className="size-3 text-sky-500" />, borderColor: 'border-l-sky-500', label: 'Task Assigned' },
  task_completed: { icon: <CheckCircle className="size-3 text-green-500" />, borderColor: 'border-l-green-500', label: 'Task Completed' },
  code_written: { icon: <FileCode2 className="size-3 text-blue-500" />, borderColor: 'border-l-blue-500', label: 'Code Written' },
  review_completed: { icon: <CheckCircle2 className="size-3 text-green-500" />, borderColor: 'border-l-green-500', label: 'Review' },
  test_run: { icon: <TestTube2 className="size-3 text-amber-500" />, borderColor: 'border-l-amber-500', label: 'Test' },
  deploy_triggered: { icon: <Rocket className="size-3 text-orange-500" />, borderColor: 'border-l-orange-500', label: 'Deploy' },
  message_sent: { icon: <MessageSquare className="size-3 text-pink-500" />, borderColor: 'border-l-pink-500', label: 'Message' },
  status_change: { icon: <ArrowRightLeft className="size-3 text-teal-500" />, borderColor: 'border-l-teal-500', label: 'Status Change' },
  file_created: { icon: <FilePlus className="size-3 text-emerald-500" />, borderColor: 'border-l-emerald-500', label: 'File Created' },
  file_updated: { icon: <FileCode2 className="size-3 text-blue-500" />, borderColor: 'border-l-blue-500', label: 'File Updated' },
  code_change: { icon: <FileCode2 className="size-3 text-green-500" />, borderColor: 'border-l-green-500', label: 'Code Change' },
}

// Format relative timestamp
function AgentRow({ agent, onClick }: { agent: Agent; onClick: () => void }) {
  const roleConfig = AGENT_ROLE_CONFIG[agent.role]
  const statusConfig = AGENT_STATUS_CONFIG[agent.status]
  const isActive = agent.status !== 'idle' && agent.status !== 'sleeping'
  const tasks = useAppStore((s) => s.tasks)

  // Calculate progress for active agent based on task status
  const progress = useMemo(() => {
    if (!isActive || !agent.currentTaskId) return 0
    const task = tasks.find((t) => t.id === agent.currentTaskId)
    if (!task) return 0
    // Simulate progress based on status
    const statusProgress: Record<string, number> = {
      todo: 10,
      in_progress: 50,
      in_review: 80,
      done: 100,
      backlog: 5,
    }
    return statusProgress[task.status] || 30
  }, [isActive, agent.currentTaskId, tasks])

  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={onClick}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-md transition-all duration-150 cursor-pointer border-l-2',
              'hover:bg-muted/60 hover:shadow-sm',
              isActive && 'bg-muted/30',
              isActive && agent.role === 'architect' && 'border-l-green-500',
              isActive && roleConfig.color === 'text-emerald-600 dark:text-emerald-400' && 'border-l-emerald-500',
              isActive && roleConfig.color === 'text-blue-600 dark:text-blue-400' && 'border-l-blue-500',
              isActive && roleConfig.color === 'text-amber-600 dark:text-amber-400' && 'border-l-amber-500',
              isActive && roleConfig.color === 'text-orange-600 dark:text-orange-400' && 'border-l-orange-500',
              isActive && roleConfig.color === 'text-pink-600 dark:text-pink-400' && 'border-l-pink-500',
              !isActive && 'border-l-transparent',
            )}
          >
            <span className="text-base">{agent.avatar}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={cn('text-xs font-medium truncate', roleConfig.color)}>{agent.name}</span>
                <span className={cn(
                  'size-1.5 rounded-full shrink-0',
                  statusConfig.dotColor,
                  isActive && 'animate-breathing',
                )} />
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                {statusConfig.label} · {roleConfig.label}
              </div>
              {isActive && (
                <div className="agent-progress-bar mt-0.5">
                  <div className="agent-progress-bar-fill" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          <p className={cn('font-medium', roleConfig.color)}>{agent.name} — {roleConfig.label}</p>
          <p className="text-muted-foreground">Status: {statusConfig.label}</p>
          {agent.specialty && <p className="text-muted-foreground">{agent.specialty}</p>}
          <p className="text-muted-foreground">Tasks completed: {agent.tasksCompleted}</p>
          {isActive && agent.currentTaskId && <p className="text-muted-foreground">Progress: {progress}%</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function ActivityFeedSection() {
  const activities = useAppStore((s) => s.activities)
  const setActiveBottomTab = useAppStore((s) => s.setActiveBottomTab)
  const setBottomPanelOpen = useAppStore((s) => s.setBottomPanelOpen)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activityFilter, setActivityFilter] = useState<string>('all')
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false)

  // Get unique action types from current activities
  const actionTypes = useMemo(() => {
    const types = new Set<string>()
    for (const a of activities) {
      types.add(a.action)
    }
    return Array.from(types).sort()
  }, [activities])

  // Filter and sort activities
  const recentActivities = useMemo(() => {
    let filtered = [...activities]
    if (activityFilter !== 'all') {
      filtered = filtered.filter((a) => a.action === activityFilter)
    }
    return filtered
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20)
  }, [activities, activityFilter])

  // Auto-scroll to top (newest) when new activities arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [recentActivities.length])

  return (
    <div className="py-2">
      <div className="px-3 py-0.5 flex items-center gap-1.5">
        <Activity className="size-3 text-muted-foreground/70" />
        <span className="text-[10px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
          Activity Feed
        </span>
        {recentActivities.length > 0 && (
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 ml-auto bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
            {recentActivities.length}
          </Badge>
        )}
        {/* Filter dropdown */}
        {actionTypes.length > 1 && (
          <div className="relative">
            <button
              onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
              className={cn(
                'size-4 flex items-center justify-center rounded-sm transition-colors',
                activityFilter !== 'all'
                  ? 'text-green-500 bg-green-500/10'
                  : 'text-muted-foreground/40 hover:text-muted-foreground/70 hover:bg-muted/40',
              )}
              title="Filter activity type"
            >
              <Search className="size-2.5" />
            </button>
            <AnimatePresence>
              {filterDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setFilterDropdownOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-full mt-1 w-36 bg-card border border-border/60 rounded-lg shadow-xl z-50 overflow-hidden"
                  >
                    <button
                      onClick={() => { setActivityFilter('all'); setFilterDropdownOpen(false) }}
                      className={cn(
                        'flex items-center gap-1.5 w-full px-2 py-1.5 text-[10px] transition-colors',
                        activityFilter === 'all' ? 'bg-emerald-500/10 text-foreground' : 'hover:bg-muted/50 text-foreground/80',
                      )}
                    >
                      <Activity className="size-2.5 text-muted-foreground" />
                      All
                    </button>
                    {actionTypes.map((type) => {
                      const config = ACTIVITY_TYPE_CONFIG[type] || {
                        icon: <Activity className="size-2.5 text-muted-foreground" />,
                        label: type,
                      }
                      return (
                        <button
                          key={type}
                          onClick={() => { setActivityFilter(type); setFilterDropdownOpen(false) }}
                          className={cn(
                            'flex items-center gap-1.5 w-full px-2 py-1.5 text-[10px] transition-colors',
                            activityFilter === type ? 'bg-emerald-500/10 text-foreground' : 'hover:bg-muted/50 text-foreground/80',
                          )}
                        >
                          {config.icon}
                          {config.label || type}
                        </button>
                      )
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {activityFilter !== 'all' && (
        <div className="px-3 mt-0.5">
          <button
            onClick={() => setActivityFilter('all')}
            className="text-[9px] text-green-500 hover:text-green-400 transition-colors"
          >
            ← Clear filter
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        className="mt-1 max-h-48 overflow-y-auto thin-scrollbar px-1"
      >
        {recentActivities.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground/50 text-[10px]">
            <Activity className="size-3 mr-1.5 opacity-40" />
            {activityFilter !== 'all' ? 'No matching activity' : 'No recent activity'}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {recentActivities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </div>

      {recentActivities.length > 0 && (
        <button
          onClick={() => {
            setActiveBottomTab('activities')
            setBottomPanelOpen(true)
          }}
          className="mx-2 mt-1.5 flex items-center justify-center gap-1 w-auto px-2 py-1 rounded-md text-[10px] text-muted-foreground/70 hover:text-foreground hover:bg-muted/40 transition-colors"
        >
          View All
          <ChevronRight className="size-2.5" />
        </button>
      )}
    </div>
  )
}

function ActivityItem({ activity }: { activity: AgentActivity }) {
  const typeConfig = ACTIVITY_TYPE_CONFIG[activity.action] || {
    icon: <Activity className="size-3 text-muted-foreground" />,
    borderColor: 'border-l-muted-foreground/40',
    label: activity.action,
  }
  const agent = activity.agent
  const roleConfig = agent ? AGENT_ROLE_CONFIG[agent.role as AgentRole] : null

  return (
    <div
      className={cn(
        'flex items-start gap-1.5 px-2 py-1.5 rounded-md border-l-2 transition-colors hover:bg-muted/40',
        typeConfig.borderColor,
      )}
    >
      <div className="shrink-0 mt-0.5">
        {typeConfig.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          {agent && (
            <span className="text-[10px] shrink-0">{agent.avatar}</span>
          )}
          <span className={cn('text-[10px] font-medium truncate', roleConfig?.color || 'text-foreground/80')}>
            {agent?.name || 'Agent'}
          </span>
          <span className="text-[9px] text-muted-foreground/50 ml-auto shrink-0">
            {formatRelativeTime(activity.createdAt)}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground/80 truncate leading-tight mt-0.5">
          {activity.description}
        </p>
      </div>
    </div>
  )
}

// File Language Stats component - shows a summary of file types in the project
function FileLanguageStats({ files }: { files: ProjectFile[] }) {
  const mounted = useHydrated()

  const languageStats = useMemo(() => {
    const counts: Record<string, { count: number; color: string }> = {}
    for (const file of files) {
      if (file.isDirectory) continue
      const ext = file.path.split('.').pop()?.toLowerCase() || ''
      if (!ext) continue
      const display = EXT_DISPLAY_MAP[ext] || ext.toUpperCase()
      const color = EXT_COLOR_MAP[ext] || 'text-muted-foreground'
      if (!counts[display]) {
        counts[display] = { count: 0, color }
      }
      counts[display].count++
    }
    // Sort by count descending
    return Object.entries(counts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 6)
  }, [files])

  if (!mounted || languageStats.length === 0) return null

  return (
    <div className="px-3 py-2 border-t bg-card/30 shrink-0">
      <div className="flex items-center gap-1 mb-1">
        <BarChart3 className="size-2.5 text-muted-foreground/50" />
        <span className="text-[9px] font-semibold tracking-wider text-muted-foreground/50 uppercase">
          Languages
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {languageStats.map(([lang, { count, color }]) => (
          <span
            key={lang}
            className={cn(
              'inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-muted/40 border border-border/30',
              color,
            )}
          >
            {count} {lang}
          </span>
        ))}
      </div>
    </div>
  )
}

const EXT_DISPLAY_MAP: Record<string, string> = {
  ts: 'TS', tsx: 'TSX', js: 'JS', jsx: 'JSX',
  json: 'JSON', css: 'CSS', scss: 'SCSS', less: 'LESS',
  md: 'MD', mdx: 'MDX', prisma: 'Prisma',
  html: 'HTML', yaml: 'YAML', yml: 'YAML',
  py: 'PY', rb: 'RB', go: 'GO', rs: 'RS',
  sql: 'SQL', sh: 'SH', bash: 'SH', toml: 'TOML',
  svg: 'SVG', txt: 'TXT', xml: 'XML',
  env: 'ENV', gitignore: 'GIT',
}

const EXT_COLOR_MAP: Record<string, string> = {
  ts: 'text-blue-500', tsx: 'text-blue-500',
  js: 'text-amber-500', jsx: 'text-amber-500',
  json: 'text-yellow-500', css: 'text-pink-500',
  scss: 'text-pink-500', prisma: 'text-teal-500',
  md: 'text-gray-400', mdx: 'text-gray-400',
  html: 'text-orange-500', yaml: 'text-red-400',
  yml: 'text-red-400', py: 'text-green-500',
  go: 'text-cyan-500', rs: 'text-orange-600',
  sql: 'text-green-500', sh: 'text-emerald-400',
  bash: 'text-emerald-400',
}

// Helper to get all directory paths in a tree
function getAllDirPaths(nodes: FileTreeNode[]): string[] {
  const paths: string[] = []
  for (const node of nodes) {
    if (node.isDir) {
      paths.push(node.path)
      paths.push(...getAllDirPaths(node.children))
    }
  }
  return paths
}

export function IDESidebar() {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed)
  const files = useAppStore((s) => s.files)
  const agents = useAppStore((s) => s.agents)
  const activeFileId = useAppStore((s) => s.activeFileId)
  const setActiveFileId = useAppStore((s) => s.setActiveFileId)
  const setSelectedAgentId = useAppStore((s) => s.setSelectedAgentId)
  const removeFile = useAppStore((s) => s.removeFile)
  const fetchFiles = useAppStore((s) => s.fetchFiles)
  const addFile = useAppStore((s) => s.addFile)
  const currentProject = useAppStore((s) => s.currentProject)
  const gitFileStatuses = useAppStore((s) => s.gitFileStatuses)
  const unsavedFileIds = useAppStore((s) => s.unsavedFileIds)
  const gitCommits = useAppStore((s) => s.gitCommits)

  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['src', 'src/app', 'src/components', 'src/lib']))
  const [searchQuery, setSearchQuery] = useState('')
  const [createFileDialog, setCreateFileDialog] = useState(false)
  const [createFolderDialog, setCreateFolderDialog] = useState(false)
  const [initialPath, setInitialPath] = useState('')
  const [highlightPath, setHighlightPath] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const dragCounterRef = useRef(0)

  // Listen for breadcrumb navigation events from the editor
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ path: string }>
      const folderPath = customEvent.detail?.path
      if (folderPath) {
        // Expand all parent directories
        setExpandedDirs((prev) => {
          const next = new Set(prev)
          const parts = folderPath.split('/')
          for (let i = 1; i <= parts.length; i++) {
            next.add(parts.slice(0, i).join('/'))
          }
          return next
        })
        // Highlight the folder
        setHighlightPath(folderPath)
      }
    }
    window.addEventListener('navigate-to-folder', handler)
    return () => window.removeEventListener('navigate-to-folder', handler)
  }, [])

  // Clear highlight after a timeout
  useEffect(() => {
    if (highlightPath) {
      const timer = setTimeout(() => setHighlightPath(null), 2000)
      return () => clearTimeout(timer)
    }
  }, [highlightPath])

  const toggleDir = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const handleFileClick = (file: ProjectFile) => {
    setActiveFileId(file.id)
  }

  const handleDeleteFile = async (fileId: string, _filePath: string) => {
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        removeFile(fileId)
        await fetchFiles()
        if (activeFileId === fileId) {
          setActiveFileId(null)
        }
        toast.success('File deleted')
      }
    } catch (e) {
      console.error('Failed to delete file:', e)
      toast.error('Failed to delete file')
    }
  }

  // Duplicate a file
  const handleDuplicateFile = useCallback(async (node: FileTreeNode) => {
    if (!node.file || node.isDir) return
    const filePath = node.file.path
    const lastDot = filePath.lastIndexOf('.')
    let newPath: string
    if (lastDot > 0) {
      newPath = filePath.substring(0, lastDot) + ' (copy)' + filePath.substring(lastDot)
    } else {
      newPath = filePath + ' (copy)'
    }

    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject?.id || '',
          path: newPath,
          content: node.file.content,
          language: node.file.language,
          isDirectory: false,
        }),
      })

      if (res.ok) {
        const newFile = await res.json()
        addFile(newFile)
        await fetchFiles()
        setActiveFileId(newFile.id)
        toast.success(`Duplicated as ${newPath}`)
      } else {
        toast.error('Failed to duplicate file')
      }
    } catch (e) {
      console.error('Failed to duplicate file:', e)
      toast.error('Failed to duplicate file')
    }
  }, [currentProject, addFile, fetchFiles, setActiveFileId])

  // Copy path to clipboard
  const handleCopyPath = useCallback(async (path: string) => {
    try {
      await navigator.clipboard.writeText(path)
      toast.success(`Copied: ${path}`)
    } catch {
      toast.error('Failed to copy path')
    }
  }, [])

  // Reveal in explorer - scroll to and highlight the file
  const handleRevealInExplorer = useCallback((node: FileTreeNode) => {
    // Make sure all parent directories are expanded
    const pathParts = node.path.split('/')
    const dirsToExpand: string[] = []
    for (let i = 1; i < pathParts.length; i++) {
      dirsToExpand.push(pathParts.slice(0, i).join('/'))
    }

    setExpandedDirs((prev) => {
      const next = new Set(prev)
      dirsToExpand.forEach(d => next.add(d))
      return next
    })
    setHighlightPath(node.path)
  }, [])

  // Collapse all folders
  const handleCollapseAll = useCallback(() => {
    setExpandedDirs(new Set())
    toast.success('All folders collapsed')
  }, [])

  // Expand all folders
  const handleExpandAll = useCallback((tree: FileTreeNode[]) => {
    const allDirs = getAllDirPaths(tree)
    setExpandedDirs(new Set(allDirs))
    toast.success(`Expanded ${allDirs.length} folders`)
  }, [])

  // Drag-and-drop handlers for file import
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types.includes('Files')) {
      dragCounterRef.current++
      setIsDragOver(true)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDragOver(false)
    }
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current = 0
    setIsDragOver(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length === 0) return

    const projectId = currentProject?.id || ''
    if (!projectId) {
      toast.error('No project selected — cannot import files')
      return
    }

    let imported = 0
    let failed = 0

    for (const file of droppedFiles) {
      // Skip directories (size === 0 and no type, or name has no extension)
      if (file.size === 0 && !file.type && !file.name.includes('.')) continue

      try {
        const content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject(reader.error)
          reader.readAsText(file)
        })

        const ext = file.name.split('.').pop()?.toLowerCase() || ''
        const languageMap: Record<string, string> = {
          ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
          json: 'json', css: 'css', scss: 'css', md: 'markdown', prisma: 'prisma',
          html: 'html', yaml: 'yaml', yml: 'yaml', py: 'python', rb: 'ruby',
          go: 'go', rs: 'rust', sql: 'sql', sh: 'bash', bash: 'bash',
        }

        const res = await fetch('/api/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            path: file.name,
            content,
            language: languageMap[ext] || 'plaintext',
            isDirectory: false,
          }),
        })

        if (res.ok) {
          imported++
          toast.success(`Imported: ${file.name}`)
        } else {
          failed++
          toast.error(`Failed to import: ${file.name}`)
        }
      } catch {
        failed++
        toast.error(`Failed to read: ${file.name}`)
      }
    }

    // Refresh the file list after all imports
    if (imported > 0) {
      await fetchFiles()
    }

    if (imported > 0 || failed > 0) {
      toast.info(`Import complete: ${imported} succeeded, ${failed} failed`)
    }
  }, [currentProject, fetchFiles])

  const handleContextMenuAction = (action: string, node: FileTreeNode) => {
    switch (action) {
      case 'openInEditor':
        if (node.file) {
          handleFileClick(node.file)
        }
        break
      case 'newFile':
        setInitialPath(node.isDir ? `${node.path}/` : `${node.path.split('/').slice(0, -1).join('/')}/`)
        setCreateFileDialog(true)
        break
      case 'newFolder':
        setInitialPath(node.isDir ? `${node.path}/` : `${node.path.split('/').slice(0, -1).join('/')}/`)
        setCreateFolderDialog(true)
        break
      case 'delete':
        if (node.file) {
          // Show confirmation toast before deleting
          const itemName = node.name
          toast.warning(`Delete "${itemName}"?`, {
            description: 'This action cannot be undone.',
            action: {
              label: 'Delete',
              onClick: () => handleDeleteFile(node.file!.id, node.file!.path),
            },
            duration: 5000,
          })
        }
        break
      case 'rename':
        setInitialPath(node.path)
        setCreateFileDialog(true)
        break
      case 'duplicate':
        handleDuplicateFile(node)
        break
      case 'copyPath':
        handleCopyPath(node.path)
        break
      case 'revealInExplorer':
        handleRevealInExplorer(node)
        break
      case 'collapseAll':
        handleCollapseAll()
        break
      case 'expandAll':
        handleExpandAll(fileTree)
        break
    }
  }

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const fileTree = useMemo(() => {
    const q = searchQuery.toLowerCase()
    const filtered = searchQuery ? files.filter((f) => f.path.toLowerCase().includes(q)) : files
    return buildFileTree(filtered)
  }, [files, searchQuery])

  if (sidebarCollapsed) {
    return (
      <div className="flex flex-col items-center w-12 border-r bg-card/50 py-2 gap-2 shrink-0">
        <Button
          size="icon"
          variant="ghost"
          className="size-8"
          onClick={() => setSidebarCollapsed(false)}
        >
          <PanelLeftOpen className="size-4" />
        </Button>
        <Separator className="w-6" />
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => setSidebarCollapsed(false)}
              >
                <FolderOpen className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Explorer</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => setSidebarCollapsed(false)}
              >
                <Users className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Agents</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => setSidebarCollapsed(false)}
              >
                <GitBranch className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Source Control</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col w-60 border-r bg-gradient-to-b from-[#0d0d0d] to-[#141414] shrink-0 overflow-hidden relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drop zone overlay */}
      <AnimatePresence>
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-2 bg-emerald-500/5 border-2 border-dashed border-emerald-500/60 rounded-lg m-1 backdrop-blur-sm"
          >
            <Upload className="size-8 text-emerald-500" />
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Drop files to import</span>
            <span className="text-[10px] text-muted-foreground/60">Files will be added to the project</span>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-9 border-b bg-card/50 shrink-0">
        <span className="text-[10px] font-semibold tracking-wider text-muted-foreground/80 uppercase">Explorer</span>
        <div className="flex items-center gap-0.5">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-5"
                  onClick={() => {
                    setInitialPath('')
                    setCreateFileDialog(true)
                  }}
                >
                  <FilePlus className="size-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">New File</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-5"
                  onClick={() => {
                    setInitialPath('')
                    setCreateFolderDialog(true)
                  }}
                >
                  <FolderPlus className="size-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">New Folder</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-5"
                  onClick={() => {
                    fetchFiles()
                    toast.success('File tree refreshed')
                  }}
                >
                  <RefreshCw className="size-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Refresh File Tree</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-5"
                  onClick={() => handleCollapseAll()}
                >
                  <ChevronsDownUp className="size-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Collapse All</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            size="icon"
            variant="ghost"
            className="size-5"
            onClick={() => setSidebarCollapsed(true)}
          >
            <PanelLeftClose className="size-3.5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {/* File Explorer Section */}
        <div className="py-1">
          <div className="flex items-center gap-1.5 mx-2 px-1.5 py-1 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
            <Search className="size-3 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 outline-none flex-1"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-muted-foreground/50 hover:text-foreground transition-colors">
                <X className="size-3" />
              </button>
            )}
          </div>
          <div className="px-3 py-1 mt-0.5 flex items-center gap-1.5">
            <span className="text-[10px] font-semibold tracking-wider text-muted-foreground/70 uppercase">Files</span>
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 ml-1 bg-muted/50 text-muted-foreground">
              {files.filter((f) => !f.isDirectory).length}
            </Badge>
          </div>
          {/* Skeleton loading when files are being fetched */}
          {files.length === 0 && !searchQuery ? (
            <div className="px-3 py-2 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="size-3.5 rounded-sm" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="flex items-center gap-2 pl-4">
                <Skeleton className="size-3.5 rounded-sm" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="flex items-center gap-2 pl-4">
                <Skeleton className="size-3.5 rounded-sm" />
                <Skeleton className="h-3 w-28" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="size-3.5 rounded-sm" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="flex items-center gap-2 pl-4">
                <Skeleton className="size-3.5 rounded-sm" />
                <Skeleton className="h-3 w-32" />
              </div>
              <div className="flex items-center gap-2 pl-4">
                <Skeleton className="size-3.5 rounded-sm" />
                <Skeleton className="h-3 w-22" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="size-3.5 rounded-sm" />
                <Skeleton className="h-3 w-18" />
              </div>
            </div>
          ) : (
            <>
              {fileTree.map((node) => (
                <FileTreeNodeView
                  key={node.path}
                  node={node}
                  depth={0}
                  activeFileId={activeFileId}
                  onFileClick={handleFileClick}
                  expandedDirs={expandedDirs}
                  toggleDir={toggleDir}
                  onContextMenuAction={handleContextMenuAction}
                  highlightPath={highlightPath}
                  gitFileStatuses={gitFileStatuses}
                  unsavedFileIds={unsavedFileIds}
                />
              ))}
              {fileTree.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground px-4">
                  <div className="empty-state-illustration">
                    <div className="size-10 rounded-xl bg-muted/30 flex items-center justify-center mb-2">
                      <FileX2 className="size-4 text-muted-foreground/40" />
                    </div>
                  </div>
                  <p className="text-[10px] text-center text-muted-foreground/50 mt-1">
                    No files match your search
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <Separator className="mx-3" />

        {/* Agent Team Section */}
        <div className="py-2">
          <div className="px-3 py-0.5 flex items-center gap-1.5">
            <Users className="size-3 text-muted-foreground/70" />
            <span className="text-[10px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
              Agent Team
            </span>
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 ml-auto bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
              {agents.filter((a) => a.status !== 'idle' && a.status !== 'sleeping').length}/{agents.length}
            </Badge>
          </div>
          <div className="px-1 mt-1 flex flex-col gap-0.5">
            {agents.map((agent) => (
              <AgentRow key={agent.id} agent={agent} onClick={() => setSelectedAgentId(agent.id)} />
            ))}
          </div>
        </div>

        <Separator className="mx-3" />

        {/* Activity Feed Section */}
        <ActivityFeedSection />

        <Separator className="mx-3" />

        {/* Source Control / Git Panel */}
        <div className="py-2">
          <div className="px-3 py-0.5 flex items-center gap-1.5">
            <GitBranch className="size-3 text-muted-foreground/70" />
            <span className="text-[10px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
              Source Control
            </span>
            {gitCommits.length > 0 && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 ml-auto bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20">
                {gitCommits.length}
              </Badge>
            )}
          </div>
          <GitPanel />
        </div>
      </ScrollArea>

      {/* File Language Stats */}
      <FileLanguageStats files={files} />

      {/* File Creation Dialogs */}
      <FileCreationDialog
        open={createFileDialog}
        onOpenChange={setCreateFileDialog}
        initialPath={initialPath}
        isFolder={false}
      />
      <FileCreationDialog
        open={createFolderDialog}
        onOpenChange={setCreateFolderDialog}
        initialPath={initialPath}
        isFolder={true}
      />
    </div>
  )
}
