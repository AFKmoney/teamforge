'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FlaskConical,
  Plus,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAppStore } from '@/lib/store'
import type { Experiment, ExperimentStatus } from '@/lib/types'

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  ExperimentStatus,
  { color: string; bg: string; icon: React.ElementType; label: string }
> = {
  draft: {
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    icon: FileText,
    label: 'Draft',
  },
  running: {
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    icon: Loader2,
    label: 'Running',
  },
  completed: {
    color: 'text-green-600',
    bg: 'bg-green-50',
    icon: CheckCircle2,
    label: 'Completed',
  },
  failed: {
    color: 'text-red-600',
    bg: 'bg-red-50',
    icon: XCircle,
    label: 'Failed',
  },
}

// ---------------------------------------------------------------------------
// Pipeline stages
// ---------------------------------------------------------------------------

const PIPELINE_STAGES = [
  'Hypothesis',
  'Build',
  'Run',
  'Collect',
  'Analyze',
  'Publish',
] as const

function getPipelineStage(status: ExperimentStatus, hasResults: boolean, hasConclusion: boolean): number {
  switch (status) {
    case 'draft':
      return 0
    case 'running':
      if (hasConclusion) return 5
      if (hasResults) return 4
      return 2
    case 'completed':
      return 5
    case 'failed':
      return 2
    default:
      return 0
  }
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
// Component
// ---------------------------------------------------------------------------

export function ResearchPanel() {
  const { experiments: rawExperiments, setExperiments } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ title: '', hypothesis: '', methodology: '' })
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // ------- data fetching -------
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/research')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        setExperiments(Array.isArray(data) ? data : [])
      })
      .catch(console.error)
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [setExperiments])

  // ------- parse JSON string fields -------
  const experiments: Experiment[] = useMemo(
    () =>
      rawExperiments.map((e) => ({
        ...e,
        results:
          typeof e.results === 'string'
            ? (JSON.parse(e.results as string) as Record<string, unknown>)
            : e.results,
      })),
    [rawExperiments]
  )

  // ------- form submit -------
  const handleSubmit = useCallback(async () => {
    if (!form.title || !form.hypothesis || !form.methodology) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const newExp = await res.json()
        setExperiments([
          { ...newExp, results: JSON.parse(newExp.results || '{}') },
          ...rawExperiments,
        ])
        setForm({ title: '', hypothesis: '', methodology: '' })
        setDialogOpen(false)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }, [form, rawExperiments, setExperiments])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-20 w-full" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
            <FlaskConical className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Research Laboratory
            </h2>
            <p className="text-sm text-slate-500">
              {experiments.length} experiments
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              New Experiment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Experiment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Title
                </label>
                <Input
                  placeholder="Experiment title"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Hypothesis
                </label>
                <Textarea
                  placeholder="What do you expect to find?"
                  rows={3}
                  value={form.hypothesis}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, hypothesis: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Methodology
                </label>
                <Textarea
                  placeholder="How will you test this?"
                  rows={3}
                  value={form.methodology}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, methodology: e.target.value }))
                  }
                />
              </div>
              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={
                  submitting ||
                  !form.title ||
                  !form.hypothesis ||
                  !form.methodology
                }
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Experiment'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pipeline Visualization */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-1 overflow-x-auto">
            {PIPELINE_STAGES.map((stage, i) => {
              const maxStage = experiments.length
                ? Math.max(
                    ...experiments.map((e) =>
                      getPipelineStage(
                        e.status as ExperimentStatus,
                        Object.keys(e.results).length > 0,
                        !!e.conclusion
                      )
                    )
                  )
                : 0
              const isActive = i <= maxStage
              return (
                <div key={stage} className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={`flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {stage}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isActive ? 'Active' : 'Pending'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {i < PIPELINE_STAGES.length - 1 && (
                    <div
                      className={`h-0.5 w-4 ${
                        i < maxStage ? 'bg-emerald-400' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Experiments list */}
      <div className="space-y-3">
        {experiments.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              No experiments yet. Create one to get started.
            </CardContent>
          </Card>
        )}
        <AnimatePresence>
          {experiments.map((exp) => {
            const cfg = STATUS_CONFIG[exp.status as ExperimentStatus] ?? STATUS_CONFIG.draft
            const Icon = cfg.icon
            const isExpanded = expandedId === exp.id
            const hasResults = Object.keys(exp.results).length > 0

            return (
              <motion.div
                key={exp.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="overflow-hidden">
                  <CardContent className="p-4">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-slate-900 truncate">
                            {exp.title}
                          </h3>
                          <Badge
                            variant="secondary"
                            className={`${cfg.bg} ${cfg.color} shrink-0 gap-1`}
                          >
                            <Icon className={`h-3 w-3 ${exp.status === 'running' ? 'animate-spin' : ''}`} />
                            {cfg.label}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-500 line-clamp-1">
                          {exp.hypothesis}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {exp.score !== null && (
                          <div className="flex items-center gap-1.5">
                            <Progress
                              value={exp.score ?? 0}
                              className="h-2 w-16"
                            />
                            <span className="text-xs font-medium text-slate-600">
                              {exp.score}%
                            </span>
                          </div>
                        )}
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="h-3 w-3" />
                          {relativeTime(exp.createdAt)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            setExpandedId((prev) =>
                              prev === exp.id ? null : exp.id
                            )
                          }
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 space-y-3">
                            <div>
                              <h4 className="text-xs font-semibold uppercase text-slate-500 mb-1">
                                Hypothesis
                              </h4>
                              <p className="text-sm text-slate-700">
                                {exp.hypothesis}
                              </p>
                            </div>
                            <Separator />
                            <div>
                              <h4 className="text-xs font-semibold uppercase text-slate-500 mb-1">
                                Methodology
                              </h4>
                              <p className="text-sm text-slate-700">
                                {exp.methodology}
                              </p>
                            </div>
                            {hasResults && (
                              <>
                                <Separator />
                                <div>
                                  <h4 className="text-xs font-semibold uppercase text-slate-500 mb-1">
                                    Results
                                  </h4>
                                  <pre className="rounded-md bg-slate-50 p-3 text-xs text-slate-700 overflow-auto max-h-40">
                                    {JSON.stringify(exp.results, null, 2)}
                                  </pre>
                                </div>
                              </>
                            )}
                            {exp.conclusion && (
                              <>
                                <Separator />
                                <div>
                                  <h4 className="text-xs font-semibold uppercase text-slate-500 mb-1">
                                    Conclusion
                                  </h4>
                                  <p className="text-sm text-slate-700">
                                    {exp.conclusion}
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
