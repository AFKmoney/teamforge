'use client'

import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import {
  X, ChevronUp, ChevronDown, CaseSensitive, WholeWord,
  Regex, Replace, ReplaceAll, Search,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

export function FindReplaceBar() {
  const findReplaceOpen = useAppStore((s) => s.findReplaceOpen)
  const setFindReplaceOpen = useAppStore((s) => s.setFindReplaceOpen)
  const findQuery = useAppStore((s) => s.findQuery)
  const setFindQuery = useAppStore((s) => s.setFindQuery)
  const replaceQuery = useAppStore((s) => s.replaceQuery)
  const setReplaceQuery = useAppStore((s) => s.setReplaceQuery)
  const findCaseSensitive = useAppStore((s) => s.findCaseSensitive)
  const setFindCaseSensitive = useAppStore((s) => s.setFindCaseSensitive)
  const findWholeWord = useAppStore((s) => s.findWholeWord)
  const setFindWholeWord = useAppStore((s) => s.setFindWholeWord)
  const findRegex = useAppStore((s) => s.findRegex)
  const setFindRegex = useAppStore((s) => s.setFindRegex)
  const findMatches = useAppStore((s) => s.findMatches)
  const setFindMatches = useAppStore((s) => s.setFindMatches)
  const currentMatchIndex = useAppStore((s) => s.currentMatchIndex)
  const setCurrentMatchIndex = useAppStore((s) => s.setCurrentMatchIndex)
  const activeFileId = useAppStore((s) => s.activeFileId)
  const files = useAppStore((s) => s.files)
  const updateFileContent = useAppStore((s) => s.updateFileContent)
  const markFileUnsaved = useAppStore((s) => s.markFileUnsaved)
  const setCursorPosition = useAppStore((s) => s.setCursorPosition)

  const findInputRef = useRef<HTMLInputElement>(null)
  const [showReplace, setShowReplace] = useState(false)

  const activeFile = useMemo(
    () => files.find((f) => f.id === activeFileId) || null,
    [files, activeFileId],
  )

  // Perform search whenever query or options change
  const performSearch = useCallback(() => {
    if (!activeFile || !findQuery.trim()) {
      setFindMatches([])
      return
    }

    const content = activeFile.content
    const lines = content.split('\n')
    const matches: { line: number; startCol: number; endCol: number; text: string }[] = []

    try {
      let regexPattern: RegExp
      if (findRegex) {
        regexPattern = new RegExp(findQuery, findCaseSensitive ? 'g' : 'gi')
      } else {
        const escaped = findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const wordPattern = findWholeWord ? `\\b${escaped}\\b` : escaped
        regexPattern = new RegExp(wordPattern, findCaseSensitive ? 'g' : 'gi')
      }

      lines.forEach((line, lineIndex) => {
        let match: RegExpExecArray | null
        regexPattern.lastIndex = 0
        while ((match = regexPattern.exec(line)) !== null) {
          if (match[0].length === 0) {
            regexPattern.lastIndex++
            continue
          }
          matches.push({
            line: lineIndex + 1,
            startCol: match.index + 1,
            endCol: match.index + match[0].length + 1,
            text: match[0],
          })
          // Prevent infinite loops for zero-length matches
          if (match.index === regexPattern.lastIndex) {
            regexPattern.lastIndex++
          }
        }
      })
    } catch {
      // Invalid regex - just show no matches
    }

    setFindMatches(matches)
  }, [activeFile, findQuery, findCaseSensitive, findWholeWord, findRegex, setFindMatches])

  // Run search when query or options change
  useEffect(() => {
    performSearch()
  }, [performSearch])

  // Focus input when bar opens
  useEffect(() => {
    if (findReplaceOpen) {
      requestAnimationFrame(() => {
        findInputRef.current?.focus()
        findInputRef.current?.select()
      })
    }
  }, [findReplaceOpen])

  // Navigate to current match
  const navigateToMatch = useCallback((index: number) => {
    if (findMatches.length === 0) return
    const clampedIndex = Math.max(0, Math.min(index, findMatches.length - 1))
    setCurrentMatchIndex(clampedIndex)
    const match = findMatches[clampedIndex]
    if (match) {
      setCursorPosition(match.line, match.startCol)
    }
  }, [findMatches, setCurrentMatchIndex, setCursorPosition])

  // Next/Prev match
  const nextMatch = useCallback(() => {
    if (findMatches.length === 0) return
    const next = (currentMatchIndex + 1) % findMatches.length
    navigateToMatch(next)
  }, [currentMatchIndex, findMatches.length, navigateToMatch])

  const prevMatch = useCallback(() => {
    if (findMatches.length === 0) return
    const prev = currentMatchIndex === 0 ? findMatches.length - 1 : currentMatchIndex - 1
    navigateToMatch(prev)
  }, [currentMatchIndex, findMatches.length, navigateToMatch])

  // Handle Enter key in find input
  const handleFindKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) {
        prevMatch()
      } else {
        nextMatch()
      }
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setFindReplaceOpen(false)
    }
  }, [nextMatch, prevMatch, setFindReplaceOpen])

  // Replace current match
  const replaceCurrent = useCallback(() => {
    if (!activeFile || findMatches.length === 0 || currentMatchIndex >= findMatches.length) return
    const match = findMatches[currentMatchIndex]
    const lines = activeFile.content.split('\n')
    const lineIdx = match.line - 1
    if (lineIdx < 0 || lineIdx >= lines.length) return

    const line = lines[lineIdx]
    const before = line.substring(0, match.startCol - 1)
    const after = line.substring(match.endCol - 1)
    lines[lineIdx] = before + replaceQuery + after

    updateFileContent(activeFile.id, lines.join('\n'))
    markFileUnsaved(activeFile.id)

    // After replacing, move to next match (search will re-run automatically)
    if (currentMatchIndex >= findMatches.length - 1) {
      setCurrentMatchIndex(0)
    }
  }, [activeFile, findMatches, currentMatchIndex, replaceQuery, updateFileContent, markFileUnsaved, setCurrentMatchIndex])

  // Replace all matches
  const replaceAll = useCallback(() => {
    if (!activeFile || findMatches.length === 0) return

    let content = activeFile.content
    try {
      let regexPattern: RegExp
      if (findRegex) {
        regexPattern = new RegExp(findQuery, findCaseSensitive ? 'g' : 'gi')
      } else {
        const escaped = findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const wordPattern = findWholeWord ? `\\b${escaped}\\b` : escaped
        regexPattern = new RegExp(wordPattern, findCaseSensitive ? 'g' : 'gi')
      }

      content = content.replace(regexPattern, replaceQuery)
      updateFileContent(activeFile.id, content)
      markFileUnsaved(activeFile.id)
    } catch {
      // Invalid regex
    }
  }, [activeFile, findQuery, replaceQuery, findCaseSensitive, findWholeWord, findRegex, findMatches, updateFileContent, markFileUnsaved])

  // Toggle replace section visibility
  const toggleReplace = useCallback(() => {
    setShowReplace((prev) => !prev)
  }, [])

  const matchCountText = findQuery.trim()
    ? findMatches.length > 0
      ? `${currentMatchIndex + 1} of ${findMatches.length}`
      : 'No results'
    : ''

  if (!findReplaceOpen) return null

  return (
    <div className="flex flex-col border-b border-border/50 bg-zinc-900 dark:bg-zinc-950 shrink-0 animate-in slide-in-from-top-2 duration-150">
      {/* Find row */}
      <div className="flex items-center gap-1.5 px-3 py-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="size-5 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={toggleReplace}
          title="Toggle Replace"
        >
          <ChevronDown className={cn('size-3 transition-transform', showReplace && 'rotate-180')} />
        </Button>

        <div className="relative flex-1 min-w-0">
          <Input
            ref={findInputRef}
            value={findQuery}
            onChange={(e) => setFindQuery(e.target.value)}
            onKeyDown={handleFindKeyDown}
            placeholder="Find"
            className="h-7 text-xs bg-muted/30 border-border/50 focus:border-emerald-500/50 pr-20 font-mono"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground tabular-nums pointer-events-none">
            {matchCountText}
          </span>
        </div>

        {/* Toggle buttons */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'size-6 shrink-0',
                  findCaseSensitive ? 'text-emerald-500 bg-emerald-500/10' : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setFindCaseSensitive(!findCaseSensitive)}
              >
                <CaseSensitive className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Match Case</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'size-6 shrink-0',
                  findWholeWord ? 'text-emerald-500 bg-emerald-500/10' : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setFindWholeWord(!findWholeWord)}
              >
                <WholeWord className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Match Whole Word</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'size-6 shrink-0',
                  findRegex ? 'text-emerald-500 bg-emerald-500/10' : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setFindRegex(!findRegex)}
              >
                <Regex className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Use Regular Expression</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="h-4 w-px bg-border/50 shrink-0" />

        {/* Navigation */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={prevMatch}
                disabled={findMatches.length === 0}
              >
                <ChevronUp className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Previous Match (Shift+Enter)</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={nextMatch}
                disabled={findMatches.length === 0}
              >
                <ChevronDown className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Next Match (Enter)</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="h-4 w-px bg-border/50 shrink-0" />

        <Button
          variant="ghost"
          size="icon"
          className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => setFindReplaceOpen(false)}
        >
          <X className="size-3.5" />
        </Button>
      </div>

      {/* Replace row */}
      {!showReplace ? null : (
        <div className="flex items-center gap-1.5 px-3 py-1.5">
          <div className="size-5 shrink-0" /> {/* Spacer for alignment */}

          <div className="flex-1 min-w-0">
            <Input
              value={replaceQuery}
              onChange={(e) => setReplaceQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault()
                  setFindReplaceOpen(false)
                }
              }}
              placeholder="Replace"
              className="h-7 text-xs bg-muted/30 border-border/50 focus:border-emerald-500/50 font-mono"
            />
          </div>

          <div className="flex items-center gap-1">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={replaceCurrent}
                    disabled={findMatches.length === 0}
                  >
                    <Replace className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Replace</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={replaceAll}
                    disabled={findMatches.length === 0}
                  >
                    <ReplaceAll className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Replace All</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Spacer to align with close btn */}
          <div className="w-6 shrink-0" />
        </div>
      )}
    </div>
  )
}
