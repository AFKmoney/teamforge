'use client'

import { useEffect, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Keyboard, X } from 'lucide-react'

interface Shortcut {
  keys: string[]
  action: string
}

interface ShortcutCategory {
  title: string
  shortcuts: Shortcut[]
}

const shortcutCategories: ShortcutCategory[] = [
  {
    title: 'General',
    shortcuts: [
      { keys: ['Ctrl', 'K'], action: 'Command Palette' },
      { keys: ['Ctrl', 'Shift', '/'], action: 'Keyboard Shortcuts' },
      { keys: ['F1'], action: 'Keyboard Shortcuts' },
    ],
  },
  {
    title: 'File',
    shortcuts: [
      { keys: ['Ctrl', 'S'], action: 'Save File' },
      { keys: ['Ctrl', 'P'], action: 'Quick Open File' },
      { keys: ['Ctrl', 'N'], action: 'New File' },
    ],
  },
  {
    title: 'Search',
    shortcuts: [
      { keys: ['Ctrl', 'F'], action: 'Find' },
      { keys: ['Ctrl', 'H'], action: 'Find & Replace' },
      { keys: ['Ctrl', 'Shift', 'F'], action: 'Global Search' },
      { keys: ['Enter'], action: 'Next Match' },
      { keys: ['Shift', 'Enter'], action: 'Previous Match' },
    ],
  },
  {
    title: 'Editor',
    shortcuts: [
      { keys: ['Ctrl', 'G'], action: 'Go to Line' },
      { keys: ['Ctrl', '/'], action: 'Toggle Comment' },
      { keys: ['Tab'], action: 'Indent Selection' },
      { keys: ['Shift', 'Tab'], action: 'Outdent Selection' },
      { keys: ['Alt', '↑'], action: 'Move Line Up' },
      { keys: ['Alt', '↓'], action: 'Move Line Down' },
      { keys: ['Shift', 'Alt', '↓'], action: 'Duplicate Line' },
      { keys: ['Ctrl', 'Shift', 'K'], action: 'Delete Line' },
      { keys: ['Ctrl', 'L'], action: 'Select Current Line' },
      { keys: ['Ctrl', '+'], action: 'Increase Font Size' },
      { keys: ['Ctrl', '-'], action: 'Decrease Font Size' },
      { keys: ['F5'], action: 'Run Build' },
    ],
  },
  {
    title: 'View',
    shortcuts: [
      { keys: ['Ctrl', 'B'], action: 'Toggle Sidebar' },
      { keys: ['Ctrl', 'J'], action: 'Toggle Terminal' },
      { keys: ['Ctrl', 'Shift', 'E'], action: 'Explorer' },
      { keys: ['Ctrl', 'Shift', 'M'], action: 'Chat' },
    ],
  },
  {
    title: 'Tasks',
    shortcuts: [
      { keys: ['Ctrl', 'Shift', 'T'], action: 'Run Tests' },
      { keys: ['Ctrl', 'Shift', 'B'], action: 'Build' },
      { keys: ['Ctrl', 'Shift', 'D'], action: 'Deploy' },
    ],
  },
]

function KbdKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md border border-border bg-muted/80 shadow-[0_1px_0_1px_rgba(0,0,0,0.1),0_2px_0_0_rgba(0,0,0,0.06),inset_0_1px_0_0_rgba(255,255,255,0.1)] font-mono text-[11px] font-medium text-foreground/90 select-none">
      {children}
    </kbd>
  )
}

function KeyCombo({ keys }: { keys: string[] }) {
  return (
    <div className="flex items-center gap-1">
      {keys.map((key, i) => (
        <span key={i} className="flex items-center gap-1">
          <KbdKey>{key}</KbdKey>
          {i < keys.length - 1 && (
            <span className="text-muted-foreground/50 text-[10px]">+</span>
          )}
        </span>
      ))}
    </div>
  )
}

export function KeyboardShortcutsOverlay() {
  const [open, setOpen] = useState(false)

  // Keyboard shortcut: Ctrl+Shift+/ or F1
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+/
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === '/') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      // F1
      if (e.key === 'F1') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      // Escape to close
      if (e.key === 'Escape' && open) {
        e.preventDefault()
        setOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  const handleClose = useCallback(() => {
    setOpen(false)
  }, [])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop with glass effect */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md"
            onClick={handleClose}
          />

          {/* Overlay panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl"
          >
            <div className="rounded-xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-500/10">
                    <Keyboard className="size-4 text-emerald-500" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Keyboard Shortcuts</h2>
                    <p className="text-[11px] text-muted-foreground">Quick reference for all available shortcuts</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="flex items-center justify-center size-7 rounded-md border border-border/50 bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Close keyboard shortcuts"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              {/* Shortcuts grid */}
              <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {shortcutCategories.map((category) => (
                    <div key={category.title}>
                      {/* Category header */}
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {category.title}
                        </h3>
                        <div className="flex-1 h-px bg-border/50" />
                      </div>

                      {/* Shortcuts list */}
                      <div className="space-y-2">
                        {category.shortcuts.map((shortcut, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between gap-3 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
                          >
                            <span className="text-[13px] text-foreground/90">
                              {shortcut.action}
                            </span>
                            <KeyCombo keys={shortcut.keys} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-border/50 px-6 py-3 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <KbdKey>Esc</KbdKey>
                    <span>to close</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <KbdKey>Ctrl</KbdKey>
                    <span>+</span>
                    <KbdKey>Shift</KbdKey>
                    <span>+</span>
                    <KbdKey>/</KbdKey>
                    <span>toggle</span>
                  </span>
                </div>
                <span className="text-muted-foreground/60">TeamForge IDE</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
