'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  Info,
  XCircle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Activity,
  Download,
  FileSpreadsheet,
  FileJson,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { exportToCSV, exportToJSON } from '@/lib/export-utils'
import { useAppStore } from '@/lib/store'
import type { SafetyEvent, ConstitutionalRule, Severity } from '@/lib/types'
import { PageHeader } from '@/components/page-header'

// ---------------------------------------------------------------------------
// Severity config
// ---------------------------------------------------------------------------

const SEVERITY_CONFIG: Record<Severity, { color: string; bg: string; dot: string; icon: React.ElementType; darkBg: string; darkColor: string }> = {
  info: { color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500', icon: Info, darkBg: 'dark:bg-blue-950/40', darkColor: 'dark:text-blue-400' },
  warning: { color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500', icon: AlertTriangle, darkBg: 'dark:bg-amber-950/40', darkColor: 'dark:text-amber-400' },
  critical: { color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500', icon: XCircle, darkBg: 'dark:bg-red-950/40', darkColor: 'dark:text-red-400' },
}

// ---------------------------------------------------------------------------
// Relative time
// ---------------------------------------------------------------------------

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// ---------------------------------------------------------------------------
// Pipeline stages
// ---------------------------------------------------------------------------

const PIPELINE_STAGES = [
  { label: 'Proposed Change', key: 'proposed' },
  { label: 'Sandbox', key: 'sandbox' },
  { label: 'Validation', key: 'validation' },
  { label: 'Approval', key: 'approval' },
  { label: 'Production', key: 'production' },
] as const

function getPipelineActiveStage(): number {
  return 2
}

// ---------------------------------------------------------------------------
// Safety Score Gauge (speedometer-style)
// ---------------------------------------------------------------------------

function SafetyScoreGauge({ score, label }: { score: number; label: string }) {
  const radius = 52
  const stroke = 8
  const center = 60
  const circumference = Math.PI * radius // half circle
  const offset = circumference - (score / 100) * circumference

  const colorClass = score >= 80 ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : 'text-red-500'
  const strokeColor = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={center * 2} height={center + 10} viewBox={`0 0 ${center * 2} ${center + 10}`}>
        {/* Background arc */}
        <path
          d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
          fill="none"
          stroke="currentColor"
          className="text-muted/40"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <path
          d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
          fill="none"
          stroke={strokeColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
        />
        {/* Score text */}
        <text
          x={center}
          y={center - 8}
          textAnchor="middle"
          className={cn('fill-current text-xl font-bold', colorClass)}
          style={{ fontSize: '22px', fontWeight: 700 }}
        >
          {score}%
        </text>
        <text
          x={center}
          y={center + 12}
          textAnchor="middle"
          className="fill-current text-muted-foreground"
          style={{ fontSize: '11px' }}
        >
          {label}
        </text>
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
}

const timelineVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.06, type: 'spring', stiffness: 300, damping: 24 },
  }),
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SafetyPanel() {
  const { safetyEvents: rawEvents, setSafetyEvents } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [rules, setRules] = useState<ConstitutionalRule[]>([])
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null)

  // ------- data fetching -------
  const fetchData = useCallback(async () => {
    try {
      const [eventsRes, rulesRes] = await Promise.all([
        fetch('/api/safety'),
        fetch('/api/constitutional-rules'),
      ])
      const eventsData = await eventsRes.json()
      const rulesData = await rulesRes.json()
      setSafetyEvents(Array.isArray(eventsData) ? eventsData : [])
      setRules(Array.isArray(rulesData) ? rulesData : [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [setSafetyEvents])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  // ------- parse JSON string fields -------
  const events: SafetyEvent[] = useMemo(
    () =>
      rawEvents.map((e) => ({
        ...e,
        metadata:
          typeof e.metadata === 'string'
            ? (JSON.parse(e.metadata as string) as Record<string, unknown>)
            : e.metadata,
      })),
    [rawEvents]
  )

  // ------- derived data -------
  const unresolvedCount = useMemo(
    () => events.filter((e) => !e.resolved).length,
    [events]
  )

  const resolvedCount = useMemo(
    () => events.filter((e) => e.resolved).length,
    [events]
  )

  const safetyScore = useMemo(() => {
    if (events.length === 0) return 100
    return Math.round((resolvedCount / events.length) * 100)
  }, [events, resolvedCount])

  const overallStatus = useMemo(() => {
    if (events.some((e) => !e.resolved && e.severity === 'critical'))
      return { label: 'Critical', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/40', icon: ShieldX }
    if (events.some((e) => !e.resolved && e.severity === 'warning'))
      return { label: 'Caution', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40', icon: AlertTriangle }
    return { label: 'Safe', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40', icon: ShieldCheck }
  }, [events])

  const activeRulesCount = useMemo(
    () => rules.filter((r) => r.active).length,
    [rules]
  )

  // ------- toggle rule -------
  const handleToggleRule = useCallback(
    async (id: string, active: boolean) => {
      try {
        const res = await fetch('/api/constitutional-rules', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, active }),
        })
        if (res.ok) {
          setRules((prev) =>
            prev.map((r) => (r.id === id ? { ...r, active } : r))
          )
        }
      } catch (err) {
        console.error(err)
      }
    },
    []
  )

  const pipelineActive = getPipelineActiveStage()

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <PageHeader
        icon={Shield}
        iconColor="amber"
        title="Safety Monitor"
        description={`${unresolvedCount} active alert${unresolvedCount !== 1 ? 's' : ''}`}
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="size-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  const data = events.map((e) => ({
                    Type: e.type,
                    Severity: e.severity,
                    Description: e.description,
                    Resolved: e.resolved ? 'Yes' : 'No',
                    'Resolved By': e.resolvedBy ?? '',
                    'Agent ID': e.agentId ?? '',
                    'Created At': e.createdAt,
                    'Updated At': e.updatedAt,
                  }))
                  exportToCSV(data, 'safety-events')
                }}>
                  <FileSpreadsheet className="mr-2 size-4" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  const data = events.map((e) => ({
                    id: e.id,
                    type: e.type,
                    severity: e.severity,
                    description: e.description,
                    resolved: e.resolved,
                    resolvedBy: e.resolvedBy,
                    metadata: e.metadata,
                    agentId: e.agentId,
                    createdAt: e.createdAt,
                    updatedAt: e.updatedAt,
                  }))
                  exportToJSON(data, 'safety-events')
                }}>
                  <FileJson className="mr-2 size-4" />
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Badge className={cn('gap-1', overallStatus.bg, overallStatus.color)}>
              {(() => {
                const Icon = overallStatus.icon
                return <Icon className="h-3 w-3" />
              })()}
              {overallStatus.label}
            </Badge>
          </>
        }
      />

      {/* Safety Score Gauge + Quick Stats */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-6 flex-wrap">
            <SafetyScoreGauge score={safetyScore} label="Safety Score" />
            <div className="flex flex-col gap-3 flex-1 min-w-[200px]">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Events</span>
                <span className="ml-auto text-sm font-semibold text-foreground">{events.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-sm text-muted-foreground">Resolved</span>
                <span className="ml-auto text-sm font-semibold text-foreground">{resolvedCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-muted-foreground">Unresolved</span>
                <span className="ml-auto text-sm font-semibold text-foreground">{unresolvedCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-muted-foreground">Active Rules</span>
                <span className="ml-auto text-sm font-semibold text-foreground">{activeRulesCount}/{rules.length}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Constitutional Rules */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Constitutional Rules
          </h3>
          <span className="text-xs text-muted-foreground">
            {activeRulesCount}/{rules.length} active
          </span>
        </div>
        <motion.div
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {rules.map((rule) => (
            <motion.div key={rule.id} variants={cardVariants}>
              <Card
                className={cn(
                  'transition-all hover:shadow-md border-l-4',
                  rule.active
                    ? 'border-l-emerald-500 opacity-100'
                    : 'border-l-red-400 opacity-60 dark:opacity-50'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      {rule.active ? (
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ShieldX className="mt-0.5 h-4 w-4 shrink-0 text-red-500 dark:text-red-400" />
                      )}
                      <div className="min-w-0">
                        <h4 className="text-sm font-medium text-foreground leading-tight">
                          {rule.rule}
                        </h4>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {rule.description}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={rule.active}
                      onCheckedChange={(checked) =>
                        handleToggleRule(rule.id, checked)
                      }
                      className="shrink-0"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {rules.length === 0 && (
            <Card className="sm:col-span-2 lg:col-span-3">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No constitutional rules configured.
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>

      {/* Validation Pipeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Deployment Safety Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex items-center justify-between gap-1 overflow-x-auto">
            {PIPELINE_STAGES.map((stage, i) => {
              const isActive = i <= pipelineActive
              const isCurrent = i === pipelineActive
              return (
                <div key={stage.key} className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            'flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium transition-colors',
                            isCurrent
                              ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300 dark:bg-amber-950/50 dark:text-amber-400 dark:ring-amber-700'
                              : isActive
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {stage.label}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isCurrent ? 'Current Stage' : isActive ? 'Passed' : 'Pending'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {i < PIPELINE_STAGES.length - 1 && (
                    <ArrowRight
                      className={cn(
                        'h-3.5 w-3.5',
                        i < pipelineActive
                          ? 'text-emerald-400 dark:text-emerald-500'
                          : 'text-muted-foreground/40'
                      )}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Safety Events Timeline */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Safety Events
        </h3>
        {events.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No safety events recorded.
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="max-h-[500px]">
            <div className="relative space-y-0">
              {/* Timeline line */}
              <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

              {events.map((event, idx) => {
                const sevCfg =
                  SEVERITY_CONFIG[event.severity as Severity] ??
                  SEVERITY_CONFIG.info
                const SevIcon = sevCfg.icon
                const isExpanded = expandedEventId === event.id
                const hasMetadata =
                  event.metadata && Object.keys(event.metadata).length > 0

                return (
                  <motion.div
                    key={event.id}
                    custom={idx}
                    variants={timelineVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <div className="relative flex gap-3 pb-4 group">
                      {/* Timeline dot with animated pulse */}
                      <div className="relative z-10 mt-1.5 flex shrink-0">
                        <span
                          className={cn(
                            'h-[22px] w-[22px] rounded-full border-2 border-background flex items-center justify-center',
                            sevCfg.bg, sevCfg.darkBg
                          )}
                        >
                          <SevIcon className={cn('h-2.5 w-2.5', sevCfg.color, sevCfg.darkColor)} />
                          {/* Animated pulse ring for unresolved events */}
                          {!event.resolved && (
                            <span
                              className={cn(
                                'absolute inset-0 rounded-full animate-ping opacity-30',
                                sevCfg.dot
                              )}
                            />
                          )}
                        </span>
                      </div>

                      {/* Content card with hover effect */}
                      <Card className="flex-1 min-w-0 transition-colors hover:bg-muted/40 hover:shadow-sm">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge
                                  variant="secondary"
                                  className={cn('text-[10px]', sevCfg.bg, sevCfg.color, sevCfg.darkBg, sevCfg.darkColor)}
                                >
                                  {event.type}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-[10px]',
                                    event.resolved
                                      ? 'text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800'
                                      : 'text-red-600 border-red-200 dark:text-red-400 dark:border-red-800'
                                  )}
                                >
                                  {event.resolved ? (
                                    <span className="flex items-center gap-0.5">
                                      <CheckCircle2 className="h-2.5 w-2.5" />
                                      Resolved
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-0.5">
                                      <XCircle className="h-2.5 w-2.5" />
                                      Unresolved
                                    </span>
                                  )}
                                </Badge>
                              </div>
                              <p className="mt-1.5 text-sm text-foreground">
                                {event.description}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Clock className="h-2.5 w-2.5" />
                                {relativeTime(event.createdAt)}
                              </span>
                              {hasMetadata && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={() =>
                                    setExpandedEventId((prev) =>
                                      prev === event.id ? null : event.id
                                    )
                                  }
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-3 w-3" />
                                  ) : (
                                    <ChevronDown className="h-3 w-3" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>

                          {event.resolved && event.resolvedBy && (
                            <p className="mt-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                              Resolved by {event.resolvedBy}
                            </p>
                          )}

                          {/* Expanded metadata */}
                          <AnimatePresence>
                            {isExpanded && hasMetadata && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <Separator className="my-2" />
                                <pre className="rounded-md bg-muted/50 p-2 text-[11px] text-muted-foreground overflow-auto max-h-32">
                                  {JSON.stringify(event.metadata, null, 2)}
                                </pre>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </CardContent>
                      </Card>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
