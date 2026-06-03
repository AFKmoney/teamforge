'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { motion, AnimatePresence } from 'framer-motion'
import { FileCode2, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// Get file icon based on extension (same as sidebar)
function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'tsx':
    case 'ts':
      return <FileCode2 className="size-4 text-blue-500" />
    case 'jsx':
    case 'js':
      return <FileCode2 className="size-4 text-amber-500" />
    case 'json':
      return <FileCode2 className="size-4 text-yellow-500" />
    case 'prisma':
      return <FileCode2 className="size-4 text-teal-500" />
    case 'css':
      return <FileCode2 className="size-4 text-pink-500" />
    case 'md':
    case 'mdx':
      return <FileCode2 className="size-4 text-gray-400" />
    default:
      return <FileCode2 className="size-4 text-muted-foreground" />
  }
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Highlight matching text in the path
function highlightMatch(text: string, query: string) {
  if (!query) return text
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const index = lowerText.indexOf(lowerQuery)
  if (index === -1) return text

  return (
    <>
      {text.slice(0, index)}
      <span className="text-emerald-400 font-semibold">{text.slice(index, index + query.length)}</span>
      {text.slice(index + query.length)}
    </>
  )
}

export function FileSearchOverlay() {
  const fileSearchOpen = useAppStore((s) => s.fileSearchOpen)
  const setFileSearchOpen = useAppStore((s) => s.setFileSearchOpen)
  const files = useAppStore((s) => s.files)
  const setActiveFileId = useAppStore((s) => s.setActiveFileId)

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Filter files (non-directories) based on query
  const filteredFiles = useMemo(() => {
    const fileItems = files.filter((f) => !f.isDirectory)
    if (!query.trim()) return fileItems

    const q = query.toLowerCase()
    return fileItems.filter((f) => f.path.toLowerCase().includes(q))
  }, [files, query])

  // Focus input when overlay opens (DOM side effect only)
  useEffect(() => {
    if (fileSearchOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [fileSearchOpen])

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.querySelector('[data-selected="true"]')
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  const handleQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery)
    setSelectedIndex(0)
  }, [])

  const handleClose = useCallback(() => {
    setFileSearchOpen(false)
    setQuery('')
    setSelectedIndex(0)
  }, [setFileSearchOpen])

  const handleSelect = useCallback((fileId: string) => {
    setActiveFileId(fileId)
    setFileSearchOpen(false)
    setQuery('')
    setSelectedIndex(0)
  }, [setActiveFileId, setFileSearchOpen])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, filteredFiles.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (filteredFiles[selectedIndex]) {
          handleSelect(filteredFiles[selectedIndex].id)
        }
        break
      case 'Escape':
        e.preventDefault()
        handleClose()
        break
    }
  }, [filteredFiles, selectedIndex, handleSelect, handleClose])

  return (
    <AnimatePresence>
      {fileSearchOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed left-1/2 top-[12%] z-50 w-full max-w-lg -translate-x-1/2"
          >
            <div className="rounded-xl border border-border/50 bg-card shadow-2xl shadow-black/40 overflow-hidden">
              {/* Search Input */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-gradient-to-r from-card to-card/95">
                <Search className="size-4 text-emerald-500 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search files by name..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
                />
                {query && (
                  <button
                    onClick={() => handleQueryChange('')}
                    className="text-muted-foreground/50 hover:text-foreground transition-colors"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
                <kbd className="rounded border border-border/60 bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  Esc
                </kbd>
              </div>

              {/* File List */}
              <div
                ref={listRef}
                className="max-h-80 overflow-y-auto thin-scrollbar"
              >
                {filteredFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/50">
                    <Search className="size-5 mb-2 opacity-40" />
                    <span className="text-xs">No files found</span>
                  </div>
                ) : (
                  <div className="py-1">
                    {filteredFiles.map((file, index) => {
                      const fileSize = new Blob([file.content]).size
                      const isSelected = index === selectedIndex

                      return (
                        <div
                          key={file.id}
                          data-selected={isSelected}
                          onClick={() => handleSelect(file.id)}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={cn(
                            'flex items-center gap-2.5 px-4 py-2 cursor-pointer transition-colors',
                            isSelected
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'hover:bg-muted/50 text-foreground/80',
                          )}
                        >
                          {/* File icon */}
                          <div className="shrink-0">{getFileIcon(file.path)}</div>

                          {/* File path */}
                          <div className="flex-1 min-w-0">
                            <span className="text-sm truncate block">
                              {highlightMatch(file.path, query)}
                            </span>
                          </div>

                          {/* File size */}
                          <span className={cn(
                            'text-[10px] shrink-0 tabular-nums',
                            isSelected ? 'text-emerald-500/70' : 'text-muted-foreground/40',
                          )}>
                            {formatFileSize(fileSize)}
                          </span>

                          {/* Keyboard hint for selected */}
                          {isSelected && (
                            <kbd className="rounded border border-border/60 bg-muted px-1 py-0.5 font-mono text-[9px] text-muted-foreground shrink-0">
                              ↵
                            </kbd>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-border/50 px-4 py-2 text-[10px] text-muted-foreground/60">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border border-border/60 bg-muted px-1 py-0.5 font-mono text-[9px]">↑↓</kbd>
                    navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border border-border/60 bg-muted px-1 py-0.5 font-mono text-[9px]">↵</kbd>
                    open
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border border-border/60 bg-muted px-1 py-0.5 font-mono text-[9px]">esc</kbd>
                    close
                  </span>
                </div>
                <span className="text-muted-foreground/40">
                  {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
