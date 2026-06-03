'use client'

import { useAppStore } from '@/lib/store'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Search, X, FileCode2, ChevronDown, ChevronRight, Filter,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface SearchResult {
  fileId: string
  filePath: string
  line: number
  startCol: number
  endCol: number
  matchText: string
  context: string[]
  contextLineOffset?: number
}

export function GlobalSearchPanel() {
  const globalSearchOpen = useAppStore((s) => s.globalSearchOpen)
  const setGlobalSearchOpen = useAppStore((s) => s.setGlobalSearchOpen)
  const globalSearchQuery = useAppStore((s) => s.globalSearchQuery)
  const setGlobalSearchQuery = useAppStore((s) => s.setGlobalSearchQuery)
  const files = useAppStore((s) => s.files)
  const setActiveFileId = useAppStore((s) => s.setActiveFileId)
  const setCursorPosition = useAppStore((s) => s.setCursorPosition)

  const [filterExt, setFilterExt] = useState<string>('')
  // Track manually collapsed files (files user has explicitly collapsed)
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when panel opens
  useEffect(() => {
    if (globalSearchOpen) {
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [globalSearchOpen])

  // Perform global search
  const searchResults = useMemo(() => {
    if (!globalSearchQuery.trim()) return []

    const results: SearchResult[] = []
    const queryFiles = files.filter((f) => !f.isDirectory)

    // Filter by extension if specified
    const filteredFiles = filterExt
      ? queryFiles.filter((f) => f.path.endsWith(`.${filterExt}`))
      : queryFiles

    try {
      const escaped = globalSearchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(escaped, 'gi')

      for (const file of filteredFiles) {
        if (!file.content) continue
        const lines = file.content.split('\n')

        for (let i = 0; i < lines.length; i++) {
          regex.lastIndex = 0
          const line = lines[i]
          if (regex.test(line)) {
            // Get context: 2 lines before and after
            const contextStart = Math.max(0, i - 2)
            const contextEnd = Math.min(lines.length - 1, i + 2)
            const context = []
            for (let j = contextStart; j <= contextEnd; j++) {
              context.push(lines[j])
            }

            // Find the actual match position
            regex.lastIndex = 0
            const match = regex.exec(line)
            results.push({
              fileId: file.id,
              filePath: file.path,
              line: i + 1,
              startCol: match ? match.index + 1 : 1,
              endCol: match ? match.index + match[0].length + 1 : line.length + 1,
              matchText: match ? match[0] : globalSearchQuery,
              context,
              contextLineOffset: contextStart,
            })
          }
        }
      }
    } catch {
      // Invalid search
    }

    return results
  }, [globalSearchQuery, files, filterExt])

  // Group results by file
  const groupedResults = useMemo(() => {
    const groups = new Map<string, SearchResult[]>()
    for (const result of searchResults) {
      const existing = groups.get(result.filePath) || []
      existing.push(result)
      groups.set(result.filePath, existing)
    }
    return groups
  }, [searchResults])

  // Compute expanded files: first group is always expanded unless manually collapsed
  const expandedFiles = useMemo(() => {
    const expanded = new Set<string>()
    const keys = Array.from(groupedResults.keys())
    for (const key of keys) {
      if (!collapsedFiles.has(key)) {
        expanded.add(key)
      }
    }
    return expanded
  }, [groupedResults, collapsedFiles])

  const toggleFileExpand = useCallback((filePath: string) => {
    setCollapsedFiles((prev) => {
      const next = new Set(prev)
      if (next.has(filePath)) {
        next.delete(filePath) // un-collapse = expand
      } else {
        next.add(filePath) // collapse
      }
      return next
    })
  }, [])

  const handleResultClick = useCallback((result: SearchResult) => {
    setActiveFileId(result.fileId)
    setCursorPosition(result.line, result.startCol)
    setGlobalSearchOpen(false)
  }, [setActiveFileId, setCursorPosition, setGlobalSearchOpen])

  // Get unique file extensions for filter
  const fileExtensions = useMemo(() => {
    const exts = new Set<string>()
    for (const file of files) {
      if (file.isDirectory) continue
      const ext = file.path.split('.').pop()
      if (ext && ext.length <= 10) exts.add(ext)
    }
    return Array.from(exts).sort()
  }, [files])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setGlobalSearchOpen(false)
    }
  }, [setGlobalSearchOpen])

  // Highlight matching text in context lines
  const highlightMatch = useCallback((text: string, query: string) => {
    if (!query.trim()) return text
    try {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
      return parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-amber-500/30 text-foreground rounded-sm px-0.5">{part}</mark>
          : part
      )
    } catch {
      return text
    }
  }, [])

  if (!globalSearchOpen) return null

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="border-t border-border/50 bg-card/95 backdrop-blur-xl overflow-hidden shrink-0"
      style={{ maxHeight: '40vh' }}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30">
          <Search className="size-3.5 text-emerald-500 shrink-0" />
          <span className="text-[11px] font-semibold text-foreground">Search</span>
          <div className="flex-1" />
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {searchResults.length > 0
              ? `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} in ${groupedResults.size} file${groupedResults.size !== 1 ? 's' : ''}`
              : globalSearchQuery.trim() ? 'No results' : ''}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-5 text-muted-foreground hover:text-foreground"
            onClick={() => setGlobalSearchOpen(false)}
          >
            <X className="size-3" />
          </Button>
        </div>

        {/* Search input row */}
        <div className="flex items-center gap-2 px-3 py-1.5">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search across all files..."
              className="h-7 text-xs bg-muted/30 border-border/50 focus:border-emerald-500/50 font-mono"
            />
          </div>

          {/* Extension filter */}
          <div className="relative">
            <select
              value={filterExt}
              onChange={(e) => setFilterExt(e.target.value)}
              className="h-7 text-[10px] bg-muted/30 border border-border/50 rounded-md px-2 pr-6 appearance-none cursor-pointer focus:border-emerald-500/50 focus:outline-none text-muted-foreground hover:text-foreground"
            >
              <option value="">All files</option>
              {fileExtensions.map((ext) => (
                <option key={ext} value={ext}>.{ext}</option>
              ))}
            </select>
            <Filter className="size-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Results */}
        <ScrollArea className="flex-1 max-h-[280px]">
          {searchResults.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-[11px] text-muted-foreground/60">
              {globalSearchQuery.trim() ? 'No matches found' : 'Type to search across all project files'}
            </div>
          ) : (
            <div className="px-1 pb-2">
              {Array.from(groupedResults.entries()).map(([filePath, results]) => {
                const isExpanded = expandedFiles.has(filePath)
                return (
                  <div key={filePath} className="mb-0.5">
                    {/* File header */}
                    <button
                      onClick={() => toggleFileExpand(filePath)}
                      className="flex items-center gap-1.5 w-full px-2 py-1 rounded-md hover:bg-muted/50 transition-colors text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="size-3 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="size-3 text-muted-foreground shrink-0" />
                      )}
                      <FileCode2 className="size-3 text-emerald-500/70 shrink-0" />
                      <span className="text-[11px] text-foreground/80 truncate flex-1">{filePath}</span>
                      <Badge variant="secondary" className="text-[9px] h-4 px-1.5 shrink-0">
                        {results.length}
                      </Badge>
                    </button>

                    {/* Individual results */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          {results.map((result, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleResultClick(result)}
                              className="flex flex-col w-full pl-7 pr-2 py-1 rounded-md hover:bg-emerald-500/5 transition-colors text-left group"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                                  Ln {result.line}
                                </span>
                                <span className="text-[11px] text-foreground/70 truncate font-mono">
                                  {highlightMatch(
                                    result.context[Math.min(2, result.context.length - 1)]?.substring(0, 120) || '',
                                    globalSearchQuery,
                                  )}
                                </span>
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    </motion.div>
  )
}
