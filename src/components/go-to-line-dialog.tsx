'use client'

import { useAppStore } from '@/lib/store'
import { Input } from '@/components/ui/input'
import { motion, AnimatePresence } from 'framer-motion'
import { useCallback, useRef, useEffect } from 'react'

export function GoToLineDialog() {
  const goToLineOpen = useAppStore((s) => s.goToLineOpen)
  const setGoToLineOpen = useAppStore((s) => s.setGoToLineOpen)
  const cursorLine = useAppStore((s) => s.cursorLine)
  const setCursorPosition = useAppStore((s) => s.setCursorPosition)
  const files = useAppStore((s) => s.files)
  const activeFileId = useAppStore((s) => s.activeFileId)
  const inputRef = useRef<HTMLInputElement>(null)
  const prevOpenRef = useRef(false)

  const activeFile = files.find((f) => f.id === activeFileId)
  const totalLines = activeFile?.content?.split('\n').length ?? 0

  // Focus input when dialog opens (using ref callback pattern)
  useEffect(() => {
    if (goToLineOpen && inputRef.current) {
      inputRef.current.value = ''
      inputRef.current.focus()
    }
    prevOpenRef.current = goToLineOpen
  }, [goToLineOpen])

  const handleGoToLine = useCallback((value: string) => {
    const line = parseInt(value, 10)
    if (isNaN(line) || line < 1) return
    const clampedLine = Math.min(line, totalLines)
    setCursorPosition(clampedLine, 1)
    setGoToLineOpen(false)
  }, [totalLines, setCursorPosition, setGoToLineOpen])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const target = e.target as HTMLInputElement
      handleGoToLine(target.value)
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setGoToLineOpen(false)
    }
  }, [handleGoToLine, setGoToLineOpen])

  return (
    <AnimatePresence>
      {goToLineOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className="absolute top-2 right-4 z-30"
        >
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-card/95 backdrop-blur-xl shadow-lg shadow-black/30">
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
              Go to Line:
            </span>
            <Input
              ref={inputRef}
              onKeyDown={handleKeyDown}
              placeholder={`${cursorLine}`}
              className="h-7 w-20 text-xs bg-muted/30 border-border/50 focus:border-emerald-500/50 font-mono tabular-nums text-center"
            />
            {totalLines > 0 && (
              <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap">
                (1-{totalLines})
              </span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
