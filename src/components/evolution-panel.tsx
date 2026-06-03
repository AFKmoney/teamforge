'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Dna,
  Plus,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import type { EvolutionEvent, EvolutionType, EvolutionStatus, RiskLevel } from '@/lib/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function safeJsonParse<T>(value: string | T[] | Record<string, unknown> | undefined, fallback: T): T {
  if (value === undefined || value === null) return fallback
  if (typeof value === 'object') return value as T
  try {
    return JSON.parse(value as string) as T
  } catch {
    return fallback
  }
}

// ---------------------------------------------------------------------------
// Config maps
// ---------------------------------------------------------------------------

const TYPE_BADGE: Record<EvolutionType, { bg: string; label: string }> = {
  prompt: { bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', label: 'Prompt' },
  workflow: { bg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20', label: 'Workflow' },
  architecture: { bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20', label: 'Architecture' },
  tool: { bg: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20', label: 'Tool' },
}

const STATUS_BADGE: Record<EvolutionStatus, { bg: string; label: string }> = {
  proposed: { bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', label: 'Proposed' },
  testing: { bg: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20', label: 'Testing' },
  validated: { bg: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20', label: 'Validated' },
  deployed: { bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', label: 'Deployed' },
  rejected: { bg: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20', label: 'Rejected' },
}

const RISK_BADGE: Record<RiskLevel, { bg: string; label: string }> = {
  low: { bg: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20', label: 'Low' },
  medium: { bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', label: 'Medium' },
  high: { bg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20', label: 'High' },
  critical: { bg: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20', label: 'Critical' },
}

/** Left border color accent for event cards based on status */
const STATUS_BORDER: Record<EvolutionStatus, string> = {
  proposed: 'border-l-blue-500',
  testing: 'border-l-amber-500',
  validated: 'border-l-green-500',
  deployed: 'border-l-emerald-500',
  rejected: 'border-l-red-500',
}

const EVOLUTION_PHASES = ['Observe', 'Analyze', 'Hypothesize', 'Implement', 'Evaluate', 'Deploy'] as const

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const cardVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.06,
      duration: 0.35,
      ease: 'easeOut',
    },
  }),
  exit: { opacity: 0, y: -8, scale: 0.97, transition: { duration: 0.2 } },
}

// ---------------------------------------------------------------------------
// Raw event type from API
// ---------------------------------------------------------------------------

interface RawEvolutionEvent {
  id: string
  agentId: string | null
  type: string
  title: string
  description: string
  status: string
  beforeState: string
  afterState: string
  metrics: string
  improvementPercent: number
  riskLevel: string
  approvedBy: string | null
  createdAt: string
  validatedAt: string | null
  deployedAt: string | null
  agent?: { id: string; name: string; role: string } | null
}

function parseEvent(raw: RawEvolutionEvent): EvolutionEvent {
  return {
    id: raw.id,
    agentId: raw.agentId,
    type: raw.type as EvolutionType,
    title: raw.title,
    description: raw.description,
    status: raw.status as EvolutionStatus,
    beforeState: safeJsonParse<Record<string, unknown>>(raw.beforeState, {}),
    afterState: safeJsonParse<Record<string, unknown>>(raw.afterState, {}),
    metrics: safeJsonParse<Record<string, unknown>>(raw.metrics, {}),
    improvementPercent: raw.improvementPercent,
    riskLevel: raw.riskLevel as RiskLevel,
    approvedBy: raw.approvedBy,
    createdAt: raw.createdAt,
    validatedAt: raw.validatedAt,
    deployedAt: raw.deployedAt,
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EvolutionPanel() {
  const { evolutionEvents, setEvolutionEvents } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [proposeOpen, setProposeOpen] = useState(false)
  const [activePhase, setActivePhase] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({})

  // Form state
  const [formType, setFormType] = useState<EvolutionType>('prompt')
  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formRisk, setFormRisk] = useState<RiskLevel>('low')

  // Cycle animation
  useEffect(() => {
    const interval = setInterval(() => {
      setActivePhase((prev) => (prev + 1) % EVOLUTION_PHASES.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // Fetch events
  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/evolution')
      if (res.ok) {
        const data: RawEvolutionEvent[] = await res.json()
        setEvolutionEvents(data.map(parseEvent))
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [setEvolutionEvents])

  useEffect(() => {
    fetchEvents()
    const interval = setInterval(fetchEvents, 30000)
    return () => clearInterval(interval)
  }, [fetchEvents])

  // Propose improvement
  const handlePropose = async () => {
    if (!formType || !formTitle || !formDesc) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/evolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formType,
          title: formTitle,
          description: formDesc,
          riskLevel: formRisk,
        }),
      })
      if (res.ok) {
        setProposeOpen(false)
        setFormType('prompt')
        setFormTitle('')
        setFormDesc('')
        setFormRisk('low')
        await fetchEvents()
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false)
    }
  }

  // Status transition actions
  const handleStatusChange = async (id: string, newStatus: EvolutionStatus) => {
    try {
      const res = await fetch(`/api/evolution/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        await fetchEvents()
      }
    } catch {
      // silently fail
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedEvents((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Filter events by tab
  const filteredEvents = activeTab === 'all'
    ? evolutionEvents
    : evolutionEvents.filter((e) => e.status === activeTab)

  const countByStatus = (status: string) =>
    evolutionEvents.filter((e) => e.status === status).length

  // ---------------------------------------------------------------------------
  // Loading skeleton
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-24" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-500/10">
            <Dna className="size-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Evolution Engine</h2>
          <Badge variant="secondary" className="text-sm">{evolutionEvents.length}</Badge>
        </div>
        <Button size="sm" onClick={() => setProposeOpen(true)}>
          <Plus className="size-4 mr-1" />
          Propose Improvement
        </Button>
      </div>

      {/* Evolution Loop Visualization */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {EVOLUTION_PHASES.map((phase, idx) => (
          <div key={phase} className="flex items-center gap-1 shrink-0">
            <div
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium transition-all duration-500',
                idx === activePhase
                  ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/30 shadow-sm'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {phase}
            </div>
            {idx < EVOLUTION_PHASES.length - 1 && (
              <ArrowRight
                className={cn(
                  'size-4 shrink-0 transition-colors duration-500',
                  idx === activePhase ? 'text-emerald-500' : 'text-muted-foreground/50'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Current phase indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="inline-block size-2 rounded-full bg-emerald-500 animate-pulse" />
        Current phase: <span className="font-medium text-emerald-700 dark:text-emerald-400">{EVOLUTION_PHASES[activePhase]}</span>
      </div>

      {/* Status Filter Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all">All ({evolutionEvents.length})</TabsTrigger>
          <TabsTrigger value="proposed">Proposed ({countByStatus('proposed')})</TabsTrigger>
          <TabsTrigger value="testing">Testing ({countByStatus('testing')})</TabsTrigger>
          <TabsTrigger value="validated">Validated ({countByStatus('validated')})</TabsTrigger>
          <TabsTrigger value="deployed">Deployed ({countByStatus('deployed')})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({countByStatus('rejected')})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-4">
          {filteredEvents.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              No evolution events found.
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {filteredEvents.map((event, index) => {
              const typeCfg = TYPE_BADGE[event.type] ?? TYPE_BADGE.prompt
              const statusCfg = STATUS_BADGE[event.status] ?? STATUS_BADGE.proposed
              const riskCfg = RISK_BADGE[event.riskLevel] ?? RISK_BADGE.low
              const borderClass = STATUS_BORDER[event.status] ?? STATUS_BORDER.proposed
              const isExpanded = expandedEvents[event.id] ?? false

              return (
                <motion.div
                  key={event.id}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  custom={index}
                  layout
                >
                  <Card className={cn('border-l-4', borderClass, 'transition-shadow hover:shadow-md')}>
                    <CardContent className="p-4 space-y-3">
                      {/* Top row: badges + timestamp */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={cn('text-xs', typeCfg.bg)}>
                          {typeCfg.label}
                        </Badge>
                        <Badge variant="outline" className={cn('text-xs', statusCfg.bg)}>
                          {statusCfg.label}
                        </Badge>
                        <Badge variant="outline" className={cn('text-xs', riskCfg.bg)}>
                          {riskCfg.label} Risk
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {timeAgo(event.createdAt)}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="font-medium text-foreground">{event.title}</h3>

                      {/* Description */}
                      <p className={cn('text-sm text-muted-foreground', isExpanded ? '' : 'line-clamp-2')}>
                        {event.description}
                      </p>

                      {/* Improvement % */}
                      {event.improvementPercent !== 0 && (
                        <div className="flex items-center gap-1 text-sm font-medium">
                          {event.improvementPercent > 0 ? (
                            <>
                              <ArrowUp className="size-4 text-green-600 dark:text-green-400" />
                              <span className="text-green-600 dark:text-green-400">+{event.improvementPercent.toFixed(0)}%</span>
                            </>
                          ) : (
                            <>
                              <ArrowDown className="size-4 text-red-600 dark:text-red-400" />
                              <span className="text-red-600 dark:text-red-400">{event.improvementPercent.toFixed(0)}%</span>
                            </>
                          )}
                        </div>
                      )}

                      {/* Collapsible Before/After */}
                      <Collapsible open={isExpanded} onOpenChange={() => toggleExpand(event.id)}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground">
                            {isExpanded ? (
                              <ChevronDown className="size-3" />
                            ) : (
                              <ChevronRight className="size-3" />
                            )}
                            Before / After
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                            <div>
                              <h4 className="text-xs font-medium text-muted-foreground mb-1">Before</h4>
                              <pre className="text-xs bg-muted/50 rounded-md p-3 overflow-x-auto max-h-48 text-foreground">
                                {JSON.stringify(event.beforeState, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <h4 className="text-xs font-medium text-muted-foreground mb-1">After</h4>
                              <pre className="text-xs bg-muted/50 rounded-md p-3 overflow-x-auto max-h-48 text-foreground">
                                {JSON.stringify(event.afterState, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {event.status === 'proposed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(event.id, 'testing')}
                          >
                            Approve for Testing
                          </Button>
                        )}
                        {event.status === 'testing' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-green-500/30 text-green-600 dark:text-green-400 hover:bg-green-500/10"
                              onClick={() => handleStatusChange(event.id, 'validated')}
                            >
                              <Check className="size-3.5 mr-1" />
                              Validate
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10"
                              onClick={() => handleStatusChange(event.id, 'rejected')}
                            >
                              <X className="size-3.5 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                        {event.status === 'validated' && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(event.id, 'deployed')}
                          >
                            Deploy
                          </Button>
                        )}
                        {event.status === 'deployed' && (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" variant="outline">
                            <Check className="size-3 mr-1" />
                            Deployed
                          </Badge>
                        )}
                        {event.status === 'rejected' && (
                          <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" variant="outline">
                            <X className="size-3 mr-1" />
                            Rejected
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </TabsContent>
      </Tabs>

      {/* Propose Improvement Dialog */}
      <Dialog open={proposeOpen} onOpenChange={setProposeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Propose Improvement</DialogTitle>
            <DialogDescription>Suggest a new evolution improvement</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="evo-type">Type</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as EvolutionType)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prompt">Prompt</SelectItem>
                  <SelectItem value="workflow">Workflow</SelectItem>
                  <SelectItem value="architecture">Architecture</SelectItem>
                  <SelectItem value="tool">Tool</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="evo-title">Title *</Label>
              <Input
                id="evo-title"
                placeholder="Improvement title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="evo-desc">Description *</Label>
              <Textarea
                id="evo-desc"
                placeholder="Describe the improvement"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="evo-risk">Risk Level</Label>
              <Select value={formRisk} onValueChange={(v) => setFormRisk(v as RiskLevel)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select risk level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProposeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePropose} disabled={!formType || !formTitle || !formDesc || submitting}>
              {submitting && <Loader2 className="size-4 mr-1 animate-spin" />}
              Propose
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
