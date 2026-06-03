'use client'

import { useEffect, useCallback, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import {
  FileIcon,
  Terminal,
  Play,
  TestTube2,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  SquareTerminal,
  PlusCircle,
  FilePlus,
  Bot,
  Folder,
} from 'lucide-react'
import { AGENT_ROLE_CONFIG } from '@/lib/types'
import type { AgentRole } from '@/lib/types'

export function CommandPalette() {
  const [open, setOpen] = useState(false)

  // Store
  const files = useAppStore((s) => s.files)
  const agents = useAppStore((s) => s.agents)
  const setActiveFileId = useAppStore((s) => s.setActiveFileId)
  const setSelectedAgentId = useAppStore((s) => s.setSelectedAgentId)
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed)
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)
  const setBottomPanelOpen = useAppStore((s) => s.setBottomPanelOpen)
  const bottomPanelOpen = useAppStore((s) => s.bottomPanelOpen)
  const setActiveBottomTab = useAppStore((s) => s.setActiveBottomTab)
  const setIsRunning = useAppStore((s) => s.setIsRunning)
  const addFile = useAppStore((s) => s.addFile)
  const currentProject = useAppStore((s) => s.currentProject)

  const { theme, setTheme } = useTheme()

  // Keyboard shortcut: Ctrl+K to open/close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  // Close on Escape is handled by the Dialog primitive already,
  // but we also ensure our state stays in sync
  const handleClose = useCallback(() => {
    setOpen(false)
  }, [])

  // Filter files to only show non-directory entries
  const fileItems = files.filter((f) => !f.isDirectory)

  // Get file icon based on language/extension
  const getFileIcon = (language: string, path: string) => {
    const ext = path.split('.').pop()?.toLowerCase()
    if (language === 'typescript' || language === 'typescriptreact' || ext === 'ts' || ext === 'tsx') {
      return <FileIcon className="size-4 text-blue-400" />
    }
    if (language === 'javascript' || language === 'javascriptreact' || ext === 'js' || ext === 'jsx') {
      return <FileIcon className="size-4 text-yellow-400" />
    }
    if (language === 'css' || ext === 'css') {
      return <FileIcon className="size-4 text-pink-400" />
    }
    if (language === 'json' || ext === 'json') {
      return <FileIcon className="size-4 text-emerald-400" />
    }
    if (language === 'markdown' || ext === 'md') {
      return <FileIcon className="size-4 text-gray-400" />
    }
    return <FileIcon className="size-4 text-muted-foreground" />
  }

  // Command definitions
  const commands = [
    {
      id: 'run-build',
      label: 'Run Build',
      icon: <Play className="size-4 text-emerald-400" />,
      shortcut: '⇧⌘B',
      action: () => {
        setIsRunning(true)
        setActiveBottomTab('build')
        setBottomPanelOpen(true)
        setTimeout(() => setIsRunning(false), 3000)
        handleClose()
      },
    },
    {
      id: 'run-tests',
      label: 'Run Tests',
      icon: <TestTube2 className="size-4 text-amber-400" />,
      shortcut: '⇧⌘T',
      action: () => {
        setIsRunning(true)
        setActiveBottomTab('terminal')
        setBottomPanelOpen(true)
        setTimeout(() => setIsRunning(false), 2000)
        handleClose()
      },
    },
    {
      id: 'toggle-theme',
      label: 'Toggle Theme',
      icon: theme === 'dark' ? <Sun className="size-4 text-yellow-400" /> : <Moon className="size-4 text-violet-400" />,
      action: () => {
        setTheme(theme === 'dark' ? 'light' : 'dark')
        handleClose()
      },
    },
    {
      id: 'toggle-sidebar',
      label: 'Toggle Sidebar',
      icon: sidebarCollapsed ? <PanelLeftOpen className="size-4 text-blue-400" /> : <PanelLeftClose className="size-4 text-blue-400" />,
      shortcut: '⌘B',
      action: () => {
        setSidebarCollapsed(!sidebarCollapsed)
        handleClose()
      },
    },
    {
      id: 'toggle-terminal',
      label: 'Toggle Terminal',
      icon: <SquareTerminal className="size-4 text-emerald-400" />,
      shortcut: '⌘J',
      action: () => {
        setBottomPanelOpen(!bottomPanelOpen)
        if (!bottomPanelOpen) {
          setActiveBottomTab('terminal')
        }
        handleClose()
      },
    },
    {
      id: 'new-task',
      label: 'New Task',
      icon: <PlusCircle className="size-4 text-violet-400" />,
      action: () => {
        setActiveBottomTab('tasks')
        setBottomPanelOpen(true)
        handleClose()
      },
    },
    {
      id: 'new-file',
      label: 'New File',
      icon: <FilePlus className="size-4 text-emerald-400" />,
      shortcut: '⌘N',
      action: () => {
        // Create a new untitled file
        const newFile = {
          id: `file_${Date.now()}`,
          projectId: currentProject?.id || '',
          path: `untitled-${Date.now()}.ts`,
          content: '',
          language: 'typescript',
          isDirectory: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        addFile(newFile)
        setActiveFileId(newFile.id)
        handleClose()
      },
    },
  ]

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed left-1/2 top-[15%] z-50 w-full max-w-xl -translate-x-1/2"
          >
            <Command
              className="rounded-xl border border-border/50 bg-card shadow-2xl shadow-black/40"
              loop
            >
              <CommandInput placeholder="Type a command or search files..." />
              <CommandList className="max-h-[400px]">
                <CommandEmpty>No results found.</CommandEmpty>

                {/* Files Section */}
                <CommandGroup heading="Files">
                  {fileItems.slice(0, 10).map((file) => (
                    <CommandItem
                      key={file.id}
                      value={`file ${file.path}`}
                      onSelect={() => {
                        setActiveFileId(file.id)
                        handleClose()
                      }}
                      className="cursor-pointer"
                    >
                      {getFileIcon(file.language, file.path)}
                      <span className="truncate flex-1">{file.path}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{file.language}</span>
                    </CommandItem>
                  ))}
                  {fileItems.length > 10 && (
                    <CommandItem disabled className="text-xs text-muted-foreground justify-center">
                      +{fileItems.length - 10} more files...
                    </CommandItem>
                  )}
                </CommandGroup>

                <CommandSeparator />

                {/* Commands Section */}
                <CommandGroup heading="Commands">
                  {commands.map((cmd) => (
                    <CommandItem
                      key={cmd.id}
                      value={`command ${cmd.label}`}
                      onSelect={cmd.action}
                      className="cursor-pointer"
                    >
                      {cmd.icon}
                      <span>{cmd.label}</span>
                      {cmd.shortcut && <CommandShortcut>{cmd.shortcut}</CommandShortcut>}
                    </CommandItem>
                  ))}
                </CommandGroup>

                <CommandSeparator />

                {/* Agents Section */}
                <CommandGroup heading="Agents">
                  {agents.map((agent) => {
                    const roleConfig = AGENT_ROLE_CONFIG[agent.role as AgentRole]
                    return (
                      <CommandItem
                        key={agent.id}
                        value={`agent ${agent.name} ${agent.role} ${agent.specialty}`}
                        onSelect={() => {
                          setSelectedAgentId(agent.id)
                          handleClose()
                        }}
                        className="cursor-pointer"
                      >
                        <span className="text-sm">{roleConfig?.icon ?? '🤖'}</span>
                        <span className="truncate flex-1">{agent.name}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full ${roleConfig?.bgColor ?? 'bg-muted'} ${roleConfig?.color ?? 'text-muted-foreground'}`}
                        >
                          {roleConfig?.label ?? agent.role}
                        </span>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </CommandList>

              {/* Footer hint */}
              <div className="flex items-center justify-between border-t border-border/50 px-3 py-2 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border border-border/60 bg-muted px-1 py-0.5 font-mono text-[9px]">↑↓</kbd>
                    navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border border-border/60 bg-muted px-1 py-0.5 font-mono text-[9px]">↵</kbd>
                    select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border border-border/60 bg-muted px-1 py-0.5 font-mono text-[9px]">esc</kbd>
                    close
                  </span>
                </div>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border/60 bg-muted px-1 py-0.5 font-mono text-[9px]">Ctrl+K</kbd>
                  toggle
                </span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
