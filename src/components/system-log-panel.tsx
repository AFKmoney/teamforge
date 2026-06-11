'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Search,
  Download,
  FileSpreadsheet,
  FileJson,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Info,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Users,
  Dna,
  Shield,
  Server,
  User,
  Radio,
} from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { exportToCSV, exportToJSON } from '@/lib/export-utils'
import type { SystemLog, SystemLogLevel, SystemLogSource } from '@/lib/types'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LEVEL_CONFIG: Record<SystemLogLevel, {
  label: string
  icon: React.ComponentType<{ className?: string }>
  dotColor: string
  badgeClass: string
  textColor: string
}> = {
  info: {
    label: 'Info',
    icon: Info,
    dotColor: 'bg-blue-500',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    textColor: 'text-blue-600 dark:text-blue-400',
  },
  warning: {
    label: 'Warning',
    icon: AlertTriangle,
    dotColor: 'bg-amber-500',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    textColor: 'text-amber-600 dark:text-amber-400',
  },
  error: {
    label: 'Error',
    icon: AlertCircle,
    dotColor: 'bg-red-500',
    badgeClass: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    textColor: 'text-red-600 dark:text-red-400',
  },
  critical: {
    label: 'Critical',
    icon: XCircle,
    dotColor: 'bg-rose-500',
    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    textColor: 'text-rose-600 dark:text-rose-400',
  },
}

const SOURCE_CONFIG: Record<SystemLogSource, {
  label: string
  icon: React.ComponentType<{ className?: string }>
  badgeClass: string
}> = {
  agent: {
    label: 'Agent',
    icon: Users,
    badgeClass: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  },
  evolution: {
    label: 'Evolution',
    icon: Dna,
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  safety: {
    label: 'Safety',
    icon: Shield,
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  system: {
    label: 'System',
    icon: Server,
    badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
  },
  user: {
    label: 'User',
    icon: User,
    badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  },
}

const LEVELS: SystemLogLevel[] = ['info', 'warning', 'error', 'critical']
const SOURCES: SystemLogSource[] = ['agent', 'evolution', 'safety', 'system', 'user']
const ITEMS_PER_PAGE = 20

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatTimestamp(isoString: string): string {
  return new Date(isoString).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
}

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
}

// ---------------------------------------------------------------------------
// JSON Syntax Highlighter
// ---------------------------------------------------------------------------

function JsonView({ data }: { data: Record<string, unknown> }) {
  const formatted = JSON.stringify(data, null, 2)

  // Simple syntax highlighting
  const highlighted = formatted
    .replace(/"([^"]+)":/g, '<span class="text-green-600 dark:text-green-400">"$1"</span>:')
    .replace(/: "([^"]*)"/g, ': <span class="text-emerald-600 dark:text-emerald-400">"$1"</span>')
    .replace(/: (\d+\.?\d*)/g, ': <span class="text-amber-600 dark:text-amber-400">$1</span>')
    .replace(/: (true|false)/g, ': <span class="text-sky-600 dark:text-sky-400">$1</span>')
    .replace(/: (null)/g, ': <span class="text-muted-foreground">$1</span>')

  return (
    <pre
      className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-all bg-muted/30 rounded-md p-3 border border-border/30 overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  )
}

// ---------------------------------------------------------------------------
// Copy Button
// ---------------------------------------------------------------------------

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [text])

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-foreground"
            onClick={handleCopy}
          >
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {copied ? 'Copied!' : 'Copy log entry'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ---------------------------------------------------------------------------
// Log Level Toggle Button
// ---------------------------------------------------------------------------

function LevelToggle({
  level,
  isActive,
  onClick,
}: {
  level: SystemLogLevel
  isActive: boolean
  onClick: () => void
}) {
  const config = LEVEL_CONFIG[level]
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 border',
        isActive
          ? cn(config.badgeClass, 'shadow-sm')
          : 'bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/60'
      )}
    >
      <span className={cn('size-2 rounded-full', config.dotColor, !isActive && 'opacity-40')} />
      {config.label}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Source Toggle Button
// ---------------------------------------------------------------------------

function SourceToggle({
  source,
  isActive,
  onClick,
}: {
  source: SystemLogSource
  isActive: boolean
  onClick: () => void
}) {
  const config = SOURCE_CONFIG[source]
  const Icon = config.icon
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 border',
        isActive
          ? cn(config.badgeClass, 'shadow-sm')
          : 'bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/60'
      )}
    >
      <Icon className="size-3" />
      {config.label}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function SystemLogPanel() {
  const systemLogs = useAppStore((s) => s.systemLogs)
  const setSystemLogs = useAppStore((s) => s.setSystemLogs)
  const simulationEnabled = useAppStore((s) => s.simulationEnabled)

  // Filters
  const [activeLevel, setActiveLevel] = useState<SystemLogLevel | 'all'>('all')
  const [activeSource, setActiveSource] = useState<SystemLogSource | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)

  // Expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch logs
  useEffect(() => {
    const params = new URLSearchParams()
    if (activeLevel !== 'all') params.set('level', activeLevel)
    if (activeSource !== 'all') params.set('source', activeSource)
    if (debouncedSearch) params.set('search', debouncedSearch)
    params.set('limit', '200')
    params.set('offset', '0')

    fetch(`/api/system-log?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.logs) {
          setSystemLogs(data.logs)
        }
      })
      .catch(() => {
        // silently fail
      })
  }, [activeLevel, activeSource, debouncedSearch, setSystemLogs])

  // Computed filtered & paginated logs
  const filteredLogs = useMemo(() => {
    let logs = [...systemLogs]

    // Client-side search (backup for server-side)
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      logs = logs.filter(
        (log) =>
          log.action.toLowerCase().includes(q) ||
          JSON.stringify(log.details).toLowerCase().includes(q) ||
          (log.userId && log.userId.toLowerCase().includes(q))
      )
    }

    return logs
  }, [systemLogs, debouncedSearch])

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / ITEMS_PER_PAGE))
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredLogs.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredLogs, currentPage])

  // Stats
  const stats = useMemo(() => {
    const counts = { info: 0, warning: 0, error: 0, critical: 0 }
    filteredLogs.forEach((log) => {
      counts[log.level]++
    })
    return counts
  }, [filteredLogs])

  // Toggle expanded row
  const toggleRow = useCallback((id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Level filter toggle
  const handleLevelToggle = useCallback((level: SystemLogLevel | 'all') => {
    setActiveLevel(level)
    setCurrentPage(1)
  }, [])

  // Source filter toggle
  const handleSourceToggle = useCallback((source: SystemLogSource | 'all') => {
    setActiveSource(source)
    setCurrentPage(1)
  }, [])

  // Export handlers
  const handleExportCSV = useCallback(() => {
    const data = filteredLogs.map((log) => ({
      ID: log.id,
      Timestamp: log.timestamp,
      Level: log.level,
      Source: log.source,
      Action: log.action,
      Details: JSON.stringify(log.details),
      'User ID': log.userId || '',
    }))
    exportToCSV(data, 'system-log')
  }, [filteredLogs])

  const handleExportJSON = useCallback(() => {
    const data = filteredLogs.map((log) => ({
      id: log.id,
      timestamp: log.timestamp,
      level: log.level,
      source: log.source,
      action: log.action,
      details: log.details,
      userId: log.userId || undefined,
    }))
    exportToJSON(data as unknown as Record<string, unknown>[], 'system-log')
  }, [filteredLogs])

  // Page navigation
  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }, [totalPages])

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <PageHeader
        icon={FileText}
        iconColor="slate"
        title="System Log"
        description="Centralized audit trail of all system actions"
        badge={
          simulationEnabled ? (
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1">
              <Radio className="size-3 animate-pulse" />
              Live
            </Badge>
          ) : undefined
        }
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Download className="size-3.5" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV}>
                <FileSpreadsheet className="mr-2 size-4" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJSON}>
                <FileJson className="mr-2 size-4" />
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {/* Stats Summary */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="flex flex-wrap items-center gap-3"
      >
        <span className="text-sm text-muted-foreground">
          {filteredLogs.length} entries
        </span>
        <Separator orientation="vertical" className="h-4" />
        {LEVELS.map((level) => (
          <span
            key={level}
            className={cn('text-xs font-medium', LEVEL_CONFIG[level].textColor)}
          >
            {stats[level]} {level}
          </span>
        ))}
      </motion.div>

      {/* Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.05 }}
        className="space-y-3"
      >
        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Level Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground mr-1 w-10">Level:</span>
          <LevelToggle
            level="info"
            isActive={activeLevel === 'all' || activeLevel === 'info'}
            onClick={() => handleLevelToggle(activeLevel === 'info' ? 'all' : 'info')}
          />
          <LevelToggle
            level="warning"
            isActive={activeLevel === 'all' || activeLevel === 'warning'}
            onClick={() => handleLevelToggle(activeLevel === 'warning' ? 'all' : 'warning')}
          />
          <LevelToggle
            level="error"
            isActive={activeLevel === 'all' || activeLevel === 'error'}
            onClick={() => handleLevelToggle(activeLevel === 'error' ? 'all' : 'error')}
          />
          <LevelToggle
            level="critical"
            isActive={activeLevel === 'all' || activeLevel === 'critical'}
            onClick={() => handleLevelToggle(activeLevel === 'critical' ? 'all' : 'critical')}
          />
          {activeLevel !== 'all' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => handleLevelToggle('all')}
            >
              Clear
            </Button>
          )}
        </div>

        {/* Source Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground mr-1 w-10">Source:</span>
          {SOURCES.map((source) => (
            <SourceToggle
              key={source}
              source={source}
              isActive={activeSource === 'all' || activeSource === source}
              onClick={() => handleSourceToggle(activeSource === source ? 'all' : source)}
            />
          ))}
          {activeSource !== 'all' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => handleSourceToggle('all')}
            >
              Clear
            </Button>
          )}
        </div>
      </motion.div>

      {/* Log Table */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="rounded-lg border border-border bg-card overflow-hidden"
      >
        {/* Desktop Table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[90px]">Level</TableHead>
                <TableHead className="w-[130px]">Timestamp</TableHead>
                <TableHead className="w-[100px]">Source</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {paginatedLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <FileText className="size-8 opacity-40" />
                        <span className="text-sm">No log entries found</span>
                        <span className="text-xs">Try adjusting your filters</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLogs.map((log) => {
                    const isExpanded = expandedRows.has(log.id)
                    const levelConfig = LEVEL_CONFIG[log.level]
                    const sourceConfig = SOURCE_CONFIG[log.source]
                    const LevelIcon = levelConfig.icon
                    const SourceIcon = sourceConfig.icon

                    return (
                      <motion.tr
                        key={log.id}
                        variants={rowVariants}
                        layout
                        className={cn(
                          'group cursor-pointer border-b border-border/50 transition-colors',
                          isExpanded ? 'bg-muted/20' : 'hover:bg-muted/10'
                        )}
                        onClick={() => toggleRow(log.id)}
                      >
                        {/* Level */}
                        <TableCell className="py-3">
                          <Badge
                            variant="outline"
                            className={cn('gap-1 text-[11px] font-medium', levelConfig.badgeClass)}
                          >
                            <LevelIcon className="size-3" />
                            {levelConfig.label}
                          </Badge>
                        </TableCell>

                        {/* Timestamp */}
                        <TableCell className="py-3">
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs text-muted-foreground cursor-default">
                                  {relativeTime(log.timestamp)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="font-mono text-xs">
                                {formatTimestamp(log.timestamp)}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>

                        {/* Source */}
                        <TableCell className="py-3">
                          <Badge
                            variant="outline"
                            className={cn('gap-1 text-[11px] font-medium', sourceConfig.badgeClass)}
                          >
                            <SourceIcon className="size-3" />
                            {sourceConfig.label}
                          </Badge>
                        </TableCell>

                        {/* Action */}
                        <TableCell className="py-3">
                          <span className={cn(
                            'text-sm text-foreground',
                            !isExpanded && 'line-clamp-1'
                          )}>
                            {log.action}
                          </span>
                        </TableCell>

                        {/* Expand indicator */}
                        <TableCell className="py-3 text-right">
                          <span className="text-muted-foreground">
                            {isExpanded ? (
                              <ChevronDown className="size-4" />
                            ) : (
                              <ChevronRight className="size-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </span>
                        </TableCell>
                      </motion.tr>
                    )
                  })
                )}
              </AnimatePresence>
            </TableBody>
          </Table>

          {/* Expanded details (shown below the table as a separate section) */}
          {paginatedLogs.map((log) => {
            const isExpanded = expandedRows.has(log.id)
            if (!isExpanded) return null

            return (
              <motion.div
                key={`detail-${log.id}`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                className="border-b border-border/50 bg-muted/10 px-6 py-4"
              >
                <div className="space-y-3">
                  {/* Full action */}
                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Action
                    </span>
                    <p className="text-sm text-foreground mt-0.5">{log.action}</p>
                  </div>

                  {/* Details JSON */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Details
                      </span>
                      <CopyButton text={JSON.stringify(log, null, 2)} />
                    </div>
                    <JsonView data={log.details} />
                  </div>

                  {/* User ID */}
                  {log.userId && (
                    <div>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        User
                      </span>
                      <p className="text-sm text-foreground mt-0.5 font-mono">{log.userId}</p>
                    </div>
                  )}

                  {/* Full timestamp */}
                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Timestamp
                    </span>
                    <p className="text-sm text-foreground mt-0.5 font-mono">
                      {formatTimestamp(log.timestamp)}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden">
          <ScrollArea className="max-h-[70vh]">
            <AnimatePresence mode="popLayout">
              {paginatedLogs.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                  <FileText className="size-8 opacity-40" />
                  <span className="text-sm">No log entries found</span>
                </div>
              ) : (
                paginatedLogs.map((log) => {
                  const isExpanded = expandedRows.has(log.id)
                  const levelConfig = LEVEL_CONFIG[log.level]
                  const sourceConfig = SOURCE_CONFIG[log.source]
                  const LevelIcon = levelConfig.icon
                  const SourceIcon = sourceConfig.icon

                  return (
                    <motion.div
                      key={log.id}
                      variants={rowVariants}
                      layout
                      className="border-b border-border/50 last:border-0"
                    >
                      <Collapsible
                        open={isExpanded}
                        onOpenChange={() => toggleRow(log.id)}
                      >
                        <CollapsibleTrigger asChild>
                          <button className="w-full text-left px-4 py-3 hover:bg-muted/10 transition-colors">
                            <div className="flex items-start gap-2.5">
                              <Badge
                                variant="outline"
                                className={cn('gap-1 text-[10px] font-medium shrink-0 mt-0.5', levelConfig.badgeClass)}
                              >
                                <LevelIcon className="size-3" />
                                {levelConfig.label}
                              </Badge>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-foreground line-clamp-2">{log.action}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge
                                    variant="outline"
                                    className={cn('gap-1 text-[10px] font-medium', sourceConfig.badgeClass)}
                                  >
                                    <SourceIcon className="size-2.5" />
                                    {sourceConfig.label}
                                  </Badge>
                                  <span className="text-[11px] text-muted-foreground">
                                    {relativeTime(log.timestamp)}
                                  </span>
                                </div>
                              </div>
                              <span className="text-muted-foreground shrink-0 mt-0.5">
                                {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                              </span>
                            </div>
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-4 pb-3 space-y-2">
                            <div>
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Details</span>
                              <JsonView data={log.details} />
                            </div>
                            {log.userId && (
                              <div>
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">User</span>
                                <p className="text-xs text-foreground font-mono mt-0.5">{log.userId}</p>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-muted-foreground font-mono">
                                {formatTimestamp(log.timestamp)}
                              </span>
                              <CopyButton text={JSON.stringify(log, null, 2)} />
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </motion.div>
                  )
                })
              )}
            </AnimatePresence>
          </ScrollArea>
        </div>
      </motion.div>

      {/* Pagination */}
      {filteredLogs.length > ITEMS_PER_PAGE && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between"
        >
          <span className="text-xs text-muted-foreground">
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredLogs.length)} of {filteredLogs.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
            >
              Previous
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page: number
              if (totalPages <= 5) {
                page = i + 1
              } else if (currentPage <= 3) {
                page = i + 1
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i
              } else {
                page = currentPage - 2 + i
              }
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'h-8 w-8 text-xs p-0',
                    currentPage === page && 'pointer-events-none'
                  )}
                  onClick={() => goToPage(page)}
                >
                  {page}
                </Button>
              )
            })}
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={currentPage >= totalPages}
              onClick={() => goToPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
