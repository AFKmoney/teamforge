'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Trophy,
  Target,
  BarChartHorizontal,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import type { Benchmark } from '@/lib/types'

// ---------------------------------------------------------------------------
// Category list
// ---------------------------------------------------------------------------

const CATEGORIES = [
  'All',
  'Coding',
  'Reasoning',
  'Math',
  'Agent',
  'Planning',
  'Tool Use',
  'Research',
] as const

const CATEGORY_KEYS: Record<string, string> = {
  All: 'all',
  Coding: 'coding',
  Reasoning: 'reasoning',
  Math: 'math',
  Agent: 'agent',
  Planning: 'planning',
  'Tool Use': 'tool_use',
  Research: 'research',
}

const CATEGORY_LABELS: Record<string, string> = {
  coding: 'Coding',
  reasoning: 'Reasoning',
  math: 'Math',
  agent: 'Agent',
  planning: 'Planning',
  tool_use: 'Tool Use',
  research: 'Research',
}

// ---------------------------------------------------------------------------
// Score color helpers
// ---------------------------------------------------------------------------

function scoreColor(score: number): string {
  if (score >= 85) return '#059669' // emerald
  if (score >= 75) return '#16a34a' // green
  if (score >= 60) return '#d97706' // amber
  return '#dc2626' // red
}

function scoreBgClass(score: number): string {
  if (score >= 85) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
  if (score >= 75) return 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400'
  if (score >= 60) return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
  return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
}

function scoreBorderClass(score: number): string {
  if (score >= 85) return 'border-l-emerald-500'
  if (score >= 60) return 'border-l-amber-500'
  return 'border-l-red-500'
}

function deltaIcon(delta: number | null) {
  if (delta === null) return <Minus className="h-3 w-3 text-muted-foreground" />
  if (delta > 0) return <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
  if (delta < 0) return <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" />
  return <Minus className="h-3 w-3 text-muted-foreground" />
}

// ---------------------------------------------------------------------------
// Custom chart tooltip
// ---------------------------------------------------------------------------

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
      <p className="mb-1 text-xs font-medium text-popover-foreground">{label}</p>
      {payload.map((item) => (
        <p key={item.name} className="text-xs text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full mr-1.5" style={{ backgroundColor: item.color }} />
          {item.name === 'previousScore' ? 'Previous' : 'Current'}:{' '}
          <span className="font-medium text-popover-foreground">{item.value}%</span>
        </p>
      ))}
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
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
}

const statVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BenchmarksPanel() {
  const { benchmarks: rawBenchmarks, setBenchmarks } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('All')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // ------- data fetching -------
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const r = await fetch('/api/benchmarks')
        const data = await r.json()
        if (!cancelled) setBenchmarks(Array.isArray(data) ? data : [])
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [setBenchmarks])

  // ------- parse JSON string fields -------
  const benchmarks: Benchmark[] = useMemo(
    () =>
      rawBenchmarks.map((b) => ({
        ...b,
        details:
          typeof b.details === 'string'
            ? (JSON.parse(b.details as string) as Record<string, unknown>)
            : b.details,
      })),
    [rawBenchmarks]
  )

  // ------- filter by category -------
  const filtered = useMemo(() => {
    if (category === 'All') return benchmarks
    const key = CATEGORY_KEYS[category] ?? category.toLowerCase()
    return benchmarks.filter((b) => b.category === key)
  }, [benchmarks, category])

  // ------- avg score -------
  const avgScore = useMemo(() => {
    if (filtered.length === 0) return 0
    return Math.round(
      filtered.reduce((sum, b) => sum + (b.score / b.maxScore) * 100, 0) /
        filtered.length
    )
  }, [filtered])

  // ------- best category -------
  const bestCategory = useMemo(() => {
    if (benchmarks.length === 0) return { name: 'N/A', score: 0 }
    const catScores: Record<string, { total: number; count: number }> = {}
    for (const b of benchmarks) {
      const cat = b.category
      if (!catScores[cat]) catScores[cat] = { total: 0, count: 0 }
      catScores[cat].total += (b.score / b.maxScore) * 100
      catScores[cat].count++
    }
    let best = { name: 'N/A', score: 0 }
    for (const [cat, { total, count }] of Object.entries(catScores)) {
      const avg = Math.round(total / count)
      if (avg > best.score) best = { name: CATEGORY_LABELS[cat] ?? cat, score: avg }
    }
    return best
  }, [benchmarks])

  // ------- chart data -------
  const chartData = useMemo(
    () =>
      filtered.map((b) => ({
        name: b.name.length > 18 ? b.name.slice(0, 16) + '...' : b.name,
        score: Math.round((b.score / b.maxScore) * 100),
        previousScore:
          b.previousScore !== null
            ? Math.round((b.previousScore / b.maxScore) * 100)
            : 0,
        fill: scoreColor((b.score / b.maxScore) * 100),
      })),
    [filtered]
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72 w-full" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
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
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10 dark:bg-teal-500/20">
            <BarChart3 className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Benchmark Suite
            </h2>
            <p className="text-sm text-muted-foreground">
              Avg score: <span className="font-medium text-foreground">{avgScore}%</span>
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stats Row */}
      <motion.div
        className="grid grid-cols-3 gap-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={statVariants}>
          <Card className="border-l-4 border-l-teal-500">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <BarChartHorizontal className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Total Tests</span>
              </div>
              <p className="mt-1 text-lg font-bold text-foreground">{filtered.length}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={statVariants}>
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Avg Score</span>
              </div>
              <p className="mt-1 text-lg font-bold text-foreground">{avgScore}%</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={statVariants}>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Best</span>
              </div>
              <p className="mt-1 text-lg font-bold text-foreground">{bestCategory.name}</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Category filter */}
      <Tabs
        value={category}
        onValueChange={setCategory}
        className="w-full"
      >
        <TabsList className="flex h-auto flex-wrap gap-1 bg-transparent p-0">
          {CATEGORIES.map((cat) => (
            <TabsTrigger
              key={cat}
              value={cat}
              className="data-[state=active]:bg-foreground data-[state=active]:text-background rounded-md px-3 py-1.5 text-xs"
            >
              {cat}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Overview chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Score Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                  />
                  <RechartsTooltip
                    content={<ChartTooltip />}
                  />
                  <Legend
                    formatter={(value) =>
                      value === 'previousScore' ? 'Previous' : 'Current'
                    }
                  />
                  <Bar
                    dataKey="previousScore"
                    fill="#94a3b8"
                    radius={[0, 4, 4, 0]}
                    barSize={14}
                    name="previousScore"
                    className="opacity-40 dark:opacity-30"
                  />
                  <Bar
                    dataKey="score"
                    radius={[0, 4, 4, 0]}
                    barSize={14}
                    name="score"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail cards */}
      <motion.div
        className="space-y-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {filtered.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No benchmarks found for this category.
            </CardContent>
          </Card>
        )}
        <AnimatePresence>
          {filtered.map((bench) => {
            const pct = Math.round((bench.score / bench.maxScore) * 100)
            const delta =
              bench.previousScore !== null
                ? Math.round(
                    ((bench.score - bench.previousScore) / bench.maxScore) * 100
                  )
                : null
            const isExpanded = expandedId === bench.id
            const hasDetails =
              bench.details && Object.keys(bench.details).length > 0

            return (
              <motion.div
                key={bench.id}
                variants={cardVariants}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
              >
                <Card className={cn('overflow-hidden border-l-4 transition-colors hover:bg-muted/30', scoreBorderClass(pct))}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-foreground">
                            {bench.name}
                          </h3>
                          <Badge variant="outline" className="text-[10px]">
                            {bench.category}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5"
                          >
                            v{bench.version}
                          </Badge>
                        </div>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="flex-1">
                            <Progress value={pct} className="h-2" />
                          </div>
                          <span
                            className={cn('text-sm font-semibold', scoreBgClass(pct).split(' ').slice(1).join(' '))}
                          >
                            {bench.score}/{bench.maxScore}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {delta !== null && (
                          <div className="flex items-center gap-1 text-xs">
                            {deltaIcon(delta)}
                            <span
                              className={
                                delta > 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : delta < 0
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-muted-foreground'
                              }
                            >
                              {delta > 0 ? '+' : ''}
                              {delta}%
                            </span>
                          </div>
                        )}
                        {hasDetails && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              setExpandedId((prev) =>
                                prev === bench.id ? null : bench.id
                              )
                            }
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {isExpanded && hasDetails && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <Separator className="my-3" />
                          <ScrollArea className="max-h-48">
                            <pre className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                              {JSON.stringify(bench.details, null, 2)}
                            </pre>
                          </ScrollArea>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
