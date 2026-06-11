'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Color map — maps iconColor key to actual Tailwind classes
// ---------------------------------------------------------------------------

const ICON_BG_MAP: Record<string, string> = {
  emerald: 'bg-emerald-500/10 dark:bg-emerald-500/20',
  violet: 'bg-green-500/10 dark:bg-green-500/20',
  amber: 'bg-amber-500/10 dark:bg-amber-500/20',
  teal: 'bg-teal-500/10 dark:bg-teal-500/20',
  rose: 'bg-rose-500/10 dark:bg-rose-500/20',
  slate: 'bg-slate-500/10 dark:bg-slate-500/20',
  muted: 'bg-muted',
  primary: 'bg-primary/10',
  gradient: 'bg-gradient-to-br from-emerald-500/20 to-green-500/20',
}

const ICON_TEXT_MAP: Record<string, string> = {
  emerald: 'text-emerald-600 dark:text-emerald-400',
  violet: 'text-green-600 dark:text-green-400',
  amber: 'text-amber-600 dark:text-amber-400',
  teal: 'text-teal-600 dark:text-teal-400',
  rose: 'text-rose-600 dark:text-rose-400',
  slate: 'text-slate-600 dark:text-slate-400',
  muted: 'text-muted-foreground',
  primary: 'text-primary',
  gradient: 'text-emerald-600 dark:text-emerald-400',
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const headerVariants = {
  hidden: { opacity: 0, y: -8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PageHeaderProps {
  /** The icon component to display (e.g., Users, Dna, Shield) */
  icon: React.ComponentType<{ className?: string }>
  /** Color key for the icon background and text (e.g., 'emerald', 'violet', 'amber') */
  iconColor: string
  /** Page title */
  title: string
  /** Page description */
  description?: string
  /** Optional badge next to the title (e.g., count badge) */
  badge?: React.ReactNode
  /** Right-side action buttons */
  actions?: React.ReactNode
  /** Additional class names for the root element */
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PageHeader({
  icon: Icon,
  iconColor,
  title,
  description,
  badge,
  actions,
  className,
}: PageHeaderProps) {
  const bgClass = ICON_BG_MAP[iconColor] ?? ICON_BG_MAP.emerald
  const textClass = ICON_TEXT_MAP[iconColor] ?? ICON_TEXT_MAP.emerald

  return (
    <motion.div
      variants={headerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4',
        className
      )}
    >
      {/* Left: icon + title/description */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex items-center justify-center size-10 shrink-0 rounded-lg',
            bgClass
          )}
        >
          <Icon className={cn('size-5', textClass)} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">{title}</h2>
            {badge}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>

      {/* Right: actions */}
      {actions && (
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap">{actions}</div>
      )}
    </motion.div>
  )
}
