'use client'

import { useAppStore } from '@/lib/store'
import type { GitFileStatus, GitBranch } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  GitBranch,
  GitCommit,
  Plus,
  Trash2,
  RotateCcw,
  Check,
  FileCode2,
  ChevronDown,
  X,
  AlertCircle,
} from 'lucide-react'
import { useState, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

// Status badge config
const GIT_STATUS_CONFIG: Record<GitFileStatus, { label: string; color: string; bgColor: string }> = {
  modified: { label: 'M', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-500/15 border-amber-500/30' },
  untracked: { label: 'U', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-500/15 border-emerald-500/30' },
  deleted: { label: 'D', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-500/15 border-red-500/30' },
  staged: { label: 'S', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-500/15 border-blue-500/30' },
}

function GitFileStatusBadge({ status }: { status: GitFileStatus }) {
  const config = GIT_STATUS_CONFIG[status]
  return (
    <Badge
      variant="outline"
      className={cn('text-[9px] font-mono font-bold px-1 py-0 h-4 w-4 flex items-center justify-center border', config.bgColor, config.color)}
    >
      {config.label}
    </Badge>
  )
}

function BranchSelector() {
  const currentBranch = useAppStore((s) => s.currentBranch)
  const branches = useAppStore((s) => s.branches)
  const setCurrentBranch = useAppStore((s) => s.setCurrentBranch)
  const addBranch = useAppStore((s) => s.addBranch)
  const deleteBranch = useAppStore((s) => s.deleteBranch)
  const [open, setOpen] = useState(false)
  const [newBranchName, setNewBranchName] = useState('')
  const [showNewBranch, setShowNewBranch] = useState(false)

  const handleSwitchBranch = useCallback((name: string) => {
    setCurrentBranch(name)
    setOpen(false)
    toast.success(`Switched to branch "${name}"`)
  }, [setCurrentBranch])

  const handleCreateBranch = useCallback(() => {
    const name = newBranchName.trim()
    if (!name) return
    if (branches.some((b) => b.name === name)) {
      toast.error(`Branch "${name}" already exists`)
      return
    }
    addBranch(name)
    setNewBranchName('')
    setShowNewBranch(false)
    toast.success(`Created branch "${name}"`)
  }, [newBranchName, branches, addBranch])

  const handleDeleteBranch = useCallback((name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (name === currentBranch) {
      toast.error('Cannot delete the current branch')
      return
    }
    deleteBranch(name)
    toast.success(`Deleted branch "${name}"`)
  }, [currentBranch, deleteBranch])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs hover:bg-muted/60 transition-colors w-full">
          <GitBranch className="size-3 text-emerald-500 shrink-0" />
          <span className="text-foreground font-medium truncate">{currentBranch}</span>
          <ChevronDown className="size-3 text-muted-foreground ml-auto shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-2">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
            Branches
          </div>
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {branches.map((branch) => (
              <div
                key={branch.name}
                onClick={() => handleSwitchBranch(branch.name)}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors group',
                  branch.name === currentBranch
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'hover:bg-muted/60 text-foreground/80',
                )}
              >
                <GitBranch className="size-3 shrink-0" />
                <span className="truncate flex-1">{branch.name}</span>
                {branch.name === currentBranch && (
                  <Check className="size-3 text-emerald-500 shrink-0" />
                )}
                {branch.name !== currentBranch && (
                  <button
                    onClick={(e) => handleDeleteBranch(branch.name, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  >
                    <Trash2 className="size-3 text-muted-foreground/50 hover:text-red-500" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="border-t mt-2 pt-2">
            {showNewBranch ? (
              <div className="flex items-center gap-1.5">
                <Input
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateBranch()
                    if (e.key === 'Escape') { setShowNewBranch(false); setNewBranchName('') }
                  }}
                  placeholder="branch name..."
                  className="h-7 text-xs"
                  autoFocus
                />
                <Button size="icon" className="size-7 shrink-0" onClick={handleCreateBranch} disabled={!newBranchName.trim()}>
                  <Check className="size-3" />
                </Button>
                <Button size="icon" variant="ghost" className="size-7 shrink-0" onClick={() => { setShowNewBranch(false); setNewBranchName('') }}>
                  <X className="size-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs gap-1.5 justify-start"
                onClick={() => setShowNewBranch(true)}
              >
                <Plus className="size-3" />
                New Branch
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function ChangedFileItem({
  filePath,
  status,
  onOpen,
  onDiscard,
}: {
  filePath: string
  status: GitFileStatus
  onOpen: () => void
  onDiscard: () => void
}) {
  const fileName = filePath.split('/').pop() || filePath
  const config = GIT_STATUS_CONFIG[status]

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs hover:bg-muted/50 transition-colors group">
      <GitFileStatusBadge status={status} />
      <button
        onClick={onOpen}
        className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
      >
        <FileCode2 className={cn('size-3 shrink-0', config.color)} />
        <span className="text-foreground/80 truncate">{fileName}</span>
        <span className="text-muted-foreground/40 truncate text-[9px] shrink-0">
          {filePath.split('/').slice(0, -1).join('/')}
        </span>
      </button>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onDiscard}
              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-0.5 rounded hover:bg-red-500/10"
            >
              <RotateCcw className="size-3 text-muted-foreground/60 hover:text-red-500" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">Discard Changes</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

export function GitPanel() {
  const files = useAppStore((s) => s.files)
  const unsavedFileIds = useAppStore((s) => s.unsavedFileIds)
  const gitFileStatuses = useAppStore((s) => s.gitFileStatuses)
  const setGitFileStatus = useAppStore((s) => s.setGitFileStatus)
  const removeGitFileStatus = useAppStore((s) => s.removeGitFileStatus)
  const clearGitFileStatuses = useAppStore((s) => s.clearGitFileStatuses)
  const markFileSaved = useAppStore((s) => s.markFileSaved)
  const setActiveFileId = useAppStore((s) => s.setActiveFileId)
  const currentBranch = useAppStore((s) => s.currentBranch)
  const addGitCommit = useAppStore((s) => s.addGitCommit)
  const saveAllFiles = useAppStore((s) => s.saveAllFiles)

  const [commitMessage, setCommitMessage] = useState('')
  const [showCommitInput, setShowCommitInput] = useState(false)
  const [isCommitting, setIsCommitting] = useState(false)

  // Sync git file statuses with unsaved files
  const changedFiles = useMemo(() => {
    const result: { filePath: string; fileId: string; status: GitFileStatus }[] = []

    // Add files with explicit git statuses
    for (const [filePath, status] of Object.entries(gitFileStatuses)) {
      const file = files.find((f) => f.path === filePath)
      if (file) {
        result.push({ filePath, fileId: file.id, status })
      }
    }

    // Add unsaved files as modified (if not already tracked)
    for (const fileId of unsavedFileIds) {
      const file = files.find((f) => f.id === fileId)
      if (file && !gitFileStatuses[file.path]) {
        result.push({ filePath: file.path, fileId: file.id, status: 'modified' })
      }
    }

    return result
  }, [files, unsavedFileIds, gitFileStatuses])

  // Count changes by type
  const changeCounts = useMemo(() => {
    const counts = { modified: 0, untracked: 0, deleted: 0, staged: 0, total: 0 }
    for (const f of changedFiles) {
      counts[f.status]++
      counts.total++
    }
    return counts
  }, [changedFiles])

  const handleOpenFile = useCallback((fileId: string) => {
    setActiveFileId(fileId)
  }, [setActiveFileId])

  const handleDiscardChanges = useCallback((filePath: string, fileId: string) => {
    // Mark file as saved (revert simulation)
    markFileSaved(fileId)
    removeGitFileStatus(filePath)
    toast.success(`Discarded changes to ${filePath.split('/').pop()}`)
  }, [markFileSaved, removeGitFileStatus])

  const handleCommit = useCallback(async () => {
    if (!commitMessage.trim()) {
      toast.error('Please enter a commit message')
      return
    }
    if (changedFiles.length === 0) {
      toast.error('No changes to commit')
      return
    }

    setIsCommitting(true)
    try {
      // Save all unsaved files first
      await saveAllFiles()

      // Create a simulated commit
      const commitId = Math.random().toString(36).slice(2, 9)
      addGitCommit({
        id: commitId,
        message: commitMessage.trim(),
        timestamp: new Date().toISOString(),
        filesChanged: changedFiles.length,
        branch: currentBranch,
      })

      // Clear all git statuses
      clearGitFileStatuses()

      toast.success(`Committed ${changedFiles.length} file${changedFiles.length > 1 ? 's' : ''}`)
      setCommitMessage('')
      setShowCommitInput(false)
    } catch {
      toast.error('Commit failed')
    } finally {
      setIsCommitting(false)
    }
  }, [commitMessage, changedFiles, currentBranch, addGitCommit, clearGitFileStatuses, saveAllFiles])

  return (
    <div className="flex flex-col">
      {/* Branch Selector */}
      <div className="px-2 py-1">
        <BranchSelector />
      </div>

      {/* Change Summary */}
      <div className="px-3 py-1 flex items-center gap-1.5">
        <span className="text-[10px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
          Changes
        </span>
        {changeCounts.total > 0 ? (
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 ml-auto bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
            {changeCounts.total}
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 ml-auto bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
            Clean
          </Badge>
        )}
      </div>

      {/* Changed Files List */}
      <div className="max-h-48 overflow-y-auto thin-scrollbar px-1">
        {changedFiles.length === 0 ? (
          <div className="flex items-center justify-center py-4 text-muted-foreground/50 text-[10px]">
            <GitCommit className="size-3 mr-1.5 opacity-40" />
            No changes detected
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {changedFiles.map((f) => (
              <motion.div
                key={f.filePath}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
              >
                <ChangedFileItem
                  filePath={f.filePath}
                  status={f.status}
                  onOpen={() => handleOpenFile(f.fileId)}
                  onDiscard={() => handleDiscardChanges(f.filePath, f.fileId)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Commit Section */}
      {changedFiles.length > 0 && (
        <div className="px-2 pt-1 pb-1 border-t mt-1">
          {showCommitInput ? (
            <div className="space-y-1.5">
              <Input
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && commitMessage.trim()) handleCommit()
                  if (e.key === 'Escape') { setShowCommitInput(false); setCommitMessage('') }
                }}
                placeholder="Commit message..."
                className="h-7 text-xs"
                autoFocus
              />
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  className="h-6 text-[10px] gap-1 flex-1"
                  onClick={handleCommit}
                  disabled={!commitMessage.trim() || isCommitting}
                >
                  {isCommitting ? (
                    <span className="size-2.5 border border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="size-2.5" />
                  )}
                  Commit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[10px] px-2"
                  onClick={() => { setShowCommitInput(false); setCommitMessage('') }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-[10px] gap-1.5"
              onClick={() => setShowCommitInput(true)}
            >
              <GitCommit className="size-3" />
              Commit {changeCounts.total} Change{changeCounts.total > 1 ? 's' : ''}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
