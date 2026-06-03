'use client'

import { useAppStore } from '@/lib/store'
import { AGENT_ROLE_CONFIG, AGENT_STATUS_CONFIG, type ProjectFile, type Agent, type AgentRole, type AgentStatus } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
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
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'

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
      return <FileCode2 className="size-3.5 text-gray-400" />
    default:
      return <FileCode2 className="size-3.5 text-muted-foreground" />
  }
}

function FileTreeNodeView({
  node,
  depth,
  activeFileId,
  onFileClick,
  expandedDirs,
  toggleDir,
}: {
  node: FileTreeNode
  depth: number
  activeFileId: string | null
  onFileClick: (file: ProjectFile) => void
  expandedDirs: Set<string>
  toggleDir: (path: string) => void
}) {
  const isExpanded = expandedDirs.has(node.path)
  const isActive = node.file ? node.file.id === activeFileId : false

  if (node.isDir) {
    return (
      <div>
        <button
          onClick={() => toggleDir(node.path)}
          className={cn(
            'flex items-center gap-1.5 w-full px-2 py-1 text-xs hover:bg-muted/60 transition-colors rounded-sm',
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
        </button>
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
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
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <button
      onClick={() => node.file && onFileClick(node.file)}
      className={cn(
        'flex items-center gap-1.5 w-full px-2 py-1 text-xs hover:bg-muted/60 transition-colors rounded-sm',
        isActive && 'bg-primary/10 text-primary',
      )}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
    >
      {getFileIcon(node.name)}
      <span className={cn('truncate', isActive ? 'text-primary font-medium' : 'text-foreground/80')}>{node.name}</span>
    </button>
  )
}

function AgentRow({ agent }: { agent: Agent }) {
  const roleConfig = AGENT_ROLE_CONFIG[agent.role]
  const statusConfig = AGENT_STATUS_CONFIG[agent.status]
  const isActive = agent.status !== 'idle' && agent.status !== 'sleeping'

  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            'flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors cursor-default',
            'hover:bg-muted/50',
            isActive && 'bg-muted/30',
          )}>
            <span className="text-base">{agent.avatar}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={cn('text-xs font-medium truncate', roleConfig.color)}>{agent.name}</span>
                <span className={cn(
                  'size-1.5 rounded-full shrink-0',
                  statusConfig.dotColor,
                  isActive && 'animate-pulse',
                )} />
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                {statusConfig.label} · {roleConfig.label}
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          <p className={cn('font-medium', roleConfig.color)}>{agent.name} — {roleConfig.label}</p>
          <p className="text-muted-foreground">Status: {statusConfig.label}</p>
          {agent.specialty && <p className="text-muted-foreground">{agent.specialty}</p>}
          <p className="text-muted-foreground">Tasks completed: {agent.tasksCompleted}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function IDESidebar() {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed)
  const files = useAppStore((s) => s.files)
  const agents = useAppStore((s) => s.agents)
  const activeFileId = useAppStore((s) => s.activeFileId)
  const setActiveFileId = useAppStore((s) => s.setActiveFileId)

  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['src', 'src/app', 'src/components', 'src/lib']))
  const [searchQuery, setSearchQuery] = useState('')

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

  const fileTree = useMemo(() => buildFileTree(files.filter((f) => {
    if (!searchQuery) return true
    return f.path.toLowerCase().includes(searchQuery.toLowerCase())
  })), [files, searchQuery])

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
      </div>
    )
  }

  return (
    <div className="flex flex-col w-60 border-r bg-card/50 shrink-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-9 border-b shrink-0">
        <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Explorer</span>
        <Button
          size="icon"
          variant="ghost"
          className="size-6"
          onClick={() => setSidebarCollapsed(true)}
        >
          <PanelLeftClose className="size-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {/* File Explorer Section */}
        <div className="py-1">
          <div className="flex items-center gap-1 px-2 py-1">
            <Search className="size-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 outline-none flex-1"
            />
          </div>
          <div className="px-2 py-0.5">
            <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Files</span>
          </div>
          {fileTree.map((node) => (
            <FileTreeNodeView
              key={node.path}
              node={node}
              depth={0}
              activeFileId={activeFileId}
              onFileClick={handleFileClick}
              expandedDirs={expandedDirs}
              toggleDir={toggleDir}
            />
          ))}
        </div>

        <Separator className="mx-3" />

        {/* Agent Team Section */}
        <div className="py-2">
          <div className="px-3 py-0.5 flex items-center gap-1.5">
            <Users className="size-3 text-muted-foreground" />
            <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Agent Team
            </span>
            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 ml-auto">
              {agents.filter((a) => a.status !== 'idle' && a.status !== 'sleeping').length}/{agents.length}
            </Badge>
          </div>
          <div className="px-1 mt-1 flex flex-col gap-0.5">
            {agents.map((agent) => (
              <AgentRow key={agent.id} agent={agent} />
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
