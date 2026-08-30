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
  Download,
  FileSpreadsheet,
  FileJson,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { exportToCSV, exportToJSON } from '@/lib/export-utils'
import { toastSuccess } from '@/lib/toast-utils'
import { useAppStore } from '@/lib/store'
import { PageHeader } from '@/components/page-header'

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
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
}

const statVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BenchmarksPanel() {
  const { setBenchmarks } = useAppStore()
  const [benchmarks, setBenchmarksState] = useState<unknown[]>([])
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
        if (!cancelled) setBenchmarksState(Array.isArray(data) ? data : [])
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
  const parsedBenchmarks = useMemo(
    () =>
      benchmarks.map((b) => {
        const benchmark = b as unknown as Record<string, unknown>
        return {
          ...benchmark,
          details:
            typeof benchmark.details === 'string'
              ? (JSON.parse(benchmark.details) as Record<string, unknown>)
              : benchmark.details,
        }
      }),
    [benchmarks]
  )

  // ------- filter by category -------
  const filtered = useMemo(() => {
    if (category === 'All') return parsedBenchmarks
    const key = CATEGORY_KEYS[category] ?? category.toLowerCase()
    return parsedBenchmarks.filter((b) => (b as any).category === key)
  }, [parsedBenchmarks, category])

  // ------- avg score -------
  const avgScore = useMemo(() => {
    if (filtered.length === 0) return 0
    return Math.round(
      filtered.reduce((sum, b) => {
        const benchmark = b as any
        return sum + ((benchmark.score as number / benchmark.maxScore as number) * 100)
      }, 0) / filtered.length
    )
  }, [filtered])

  // ------- best category -------
  const bestCategory = useMemo(() => {
    if (parsedBenchmarks.length === 0) return { name: 'N/A', score: 0 }
    const catScores: Record<string, { total: number; count: number }> = {}
    for (const b of parsedBenchmarks) {
      const benchmark = b as any
      const cat = benchmark.category as string
      if (!catScores[cat]) catScores[cat] = { total: 0, count: 0 }
      catScores[cat].total += ((benchmark.score as number / benchmark.maxScore as number) * 100)
      catScores[cat].count++
    }
    let best = { name: 'N/A', score: 0 }
    for (const [cat, { total, count }] of Object.entries(catScores)) {
      const avg = Math.round(total / count)
      if (avg > best.score) best = { name: CATEGORY_LABELS[cat] ?? cat, score: avg }
    }
    return best
  }, [parsedBenchmarks])

  // ------- chart data -------
  const chartData = useMemo(
    () =>
      filtered.map((b) => {
        const benchmark = b as any
        const scorePct = ((benchmark.score as number / benchmark.maxScore as number) * 100)
        return {
          name: benchmark.name as string,
          score: Math.round(scorePct),
          previousScore:
            benchmark.previousScore !== null
              ? Math.round(((benchmark.previousScore as number / benchmark.maxScore as number) * 100))
              : 0,
          fill: scoreColor(scorePct),
        }
      }),
    [filtered]
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 md:h-72 w-full" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 overflow-x-hidden">
      {/* Header */}
      <PageHeader
        icon={BarChart3}
        iconColor="teal"
        title="Benchmark Suite"
        description={`Avg score: ${avgScore}%`}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="size-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                const data = filtered.map((b) => {
                  const benchmark = b as any
                  return {
                    Name: benchmark.name as string,
                    Category: benchmark.category as string,
                    Version: benchmark.version as string,
                    Score: benchmark.score as number,
                    'Max Score': benchmark.maxScore as number,
                    'Score %': Math.round(((benchmark.score as number / benchmark.maxScore as number) * 100)),
                    'Previous Score': benchmark.previousScore !== undefined ? benchmark.previousScore as number : null,
                    'Created At': benchmark.createdAt as string,
                  }
                })
                exportToCSV(data, 'benchmarks')
                toastSuccess('Export complete', 'Benchmarks exported as CSV.')
              }}>
                <FileSpreadsheet className="mr-2 size-4" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const data = filtered.map((b) => ({
                  id: (b as Record<string, unknown>).id as string,
                  name: (b as Record<string, unknown>).name as string,
                  category: (b as Record<string, unknown>).category as string,
                  version: (b as Record<string, unknown>).version as string,
                  score: (b as Record<string, unknown>).score as number,
                  maxScore: (b as Record<string, unknown>).maxScore as number,
                  previousScore: (b as Record<string, unknown>).previousScore as number,
                  details: (b as Record<string, unknown>).details,
                  createdAt: (b as Record<string, unknown>).createdAt as string,
                }))
                exportToJSON(data, 'benchmarks')
                toastSuccess('Export complete', 'Benchmarks exported as JSON.')
              }}>
                <FileJson className="mr-2 size-4" />
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {/* Summary Stats Row */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4"
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
        <TabsList className="flex h-auto flex-wrap gap-1 bg-transparent p-0 overflow-x-auto scrollbar-none" style={{ scrollbarWidth: 'none' }}>
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
            <div className="h-48 md:h-72">
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
            const score = (bench as Record<string, unknown>).score as number
            const maxScore = (bench as Record<string, unknown>).maxScore as number
            const pct = Math.round((score / maxScore) * 100)
            const previousScore = (bench as Record<string, unknown>).previousScore as number | null
            const delta =
              previousScore !== null
                ? Math.round(
                    ((score - previousScore) / maxScore) * 100
                  )
                : null
            const isExpanded = expandedId === (bench as Record<string, unknown>).id
            const hasDetails =
              (bench as Record<string, unknown>).details && Object.keys((bench as Record<string, unknown>).details as Record<string, unknown>).length > 0

            return (
              <motion.div
                key={(bench as Record<string, unknown>).id as string}
                variants={cardVariants}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
              >
                <Card className={cn('overflow-hidden border-l-4 transition-colors hover:bg-muted/30', scoreBorderClass(pct))}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-foreground">
                            {(bench as Record<string, unknown>).name as string}
                          </h3>
                          <Badge variant="outline" className="text-[10px]">
                            {(bench as Record<string, unknown>).category as string}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5"
                          >
                            v{(bench as any).version as string}
                          </Badge>
                        </div>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="flex-1">
                            <Progress value={pct} className="h-2" />
                          </div>
                          <span
                            className={cn('text-sm font-semibold', scoreBgClass(pct).split(' ').slice(1).join(' '))}
                          >
                            {(bench as any).score}/{(bench as any).maxScore}
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
                        {(bench as any).details && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              setExpandedId((prev) =>
                                prev === (bench as any).id ? null : (bench as any).id
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
                      {isExpanded && (bench as any).details && (
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
                              {JSON.stringify((bench as any).details, null, 2)}
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
