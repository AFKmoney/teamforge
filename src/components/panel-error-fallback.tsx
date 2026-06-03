'use client'

import { RefreshCw, Home, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Panel icon map
// ---------------------------------------------------------------------------

const PANEL_ICONS: Record<string, string> = {
  dashboard: '📊',
  agents: '🤖',
  evolution: '🧬',
  memory: '🧠',
  knowledge: '🌐',
  research: '🔬',
  benchmarks: '📈',
  safety: '🛡️',
  chat: '💬',
  settings: '⚙️',
  topology: '🗺️',
  activity: '📋',
  insights: '💡',
}

// ---------------------------------------------------------------------------
// Panel Error Fallback Component
// ---------------------------------------------------------------------------

interface PanelErrorFallbackProps {
  error: Error
  resetError: () => void
  panelName: string
}

export function PanelErrorFallback({ error, resetError, panelName }: PanelErrorFallbackProps) {
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)

  const sanitizedMessage = (error.message || 'An unexpected error occurred').split('\n')[0].slice(0, 200)
  const icon = PANEL_ICONS[panelName] ?? '⚠️'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center min-h-[250px] p-6 text-center"
    >
      {/* Panel icon */}
      <div className="flex items-center justify-center size-14 rounded-full bg-destructive/10 mb-3">
        <span className="text-2xl">{icon}</span>
      </div>

      {/* Error icon badge */}
      <div className="flex items-center justify-center size-6 rounded-full bg-destructive/20 -mt-5 ml-8 mb-3">
        <AlertTriangle className="size-3.5 text-destructive" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-foreground mb-1">
        Failed to load {panelName}
      </h3>

      {/* Error description */}
      <p className="text-sm text-muted-foreground max-w-sm mb-1">
        The {panelName} panel encountered an error and could not render.
      </p>
      <p className={cn(
        'text-xs text-muted-foreground/70 max-w-sm mb-5 font-mono',
        'bg-muted/50 px-3 py-1.5 rounded-md'
      )}>
        {sanitizedMessage}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          onClick={resetError}
          className="gap-2"
          size="sm"
        >
          <RefreshCw className="size-3.5" />
          Retry
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setCurrentPage('dashboard')}
        >
          <Home className="size-3.5" />
          Go to Dashboard
        </Button>
      </div>
    </motion.div>
  )
}
