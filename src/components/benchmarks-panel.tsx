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

// ---------------------------------------------------------------------------
// Score color
// ---------------------------------------------------------------------------

function scoreColor(score: number): string {
  if (score >= 85) return '#059669' // emerald
  if (score >= 75) return '#16a34a' // green
  if (score >= 60) return '#d97706' // amber
  return '#dc2626' // red
}

function scoreBgClass(score: number): string {
  if (score >= 85) return 'bg-emerald-50 text-emerald-700'
  if (score >= 75) return 'bg-green-50 text-green-700'
  if (score >= 60) return 'bg-amber-50 text-amber-700'
  return 'bg-red-50 text-red-700'
}

function deltaIcon(delta: number | null) {
  if (delta === null) return <Minus className="h-3 w-3 text-slate-400" />
  if (delta > 0) return <TrendingUp className="h-3 w-3 text-green-600" />
  if (delta < 0) return <TrendingDown className="h-3 w-3 text-red-600" />
  return <Minus className="h-3 w-3 text-slate-400" />
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
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
            <BarChart3 className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Benchmark Suite
            </h2>
            <p className="text-sm text-slate-500">
              Avg score: <span className="font-medium">{avgScore}%</span>
            </p>
          </div>
        </div>
      </div>

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
              className="data-[state=active]:bg-slate-900 data-[state=active]:text-white rounded-md px-3 py-1.5 text-xs"
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
            <CardTitle className="text-sm font-medium text-slate-600">
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
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fontSize: 11 }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                    }}
                    formatter={(value: number, name: string) => [
                      `${value}%`,
                      name === 'previousScore' ? 'Previous' : 'Current',
                    ]}
                  />
                  <Legend
                    formatter={(value) =>
                      value === 'previousScore' ? 'Previous' : 'Current'
                    }
                  />
                  <Bar
                    dataKey="previousScore"
                    fill="#e2e8f0"
                    radius={[0, 4, 4, 0]}
                    barSize={14}
                    name="previousScore"
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
      <div className="space-y-3">
        {filtered.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
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
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                <Card className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-slate-900">
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
                            className={`text-sm font-semibold ${scoreBgClass(pct).split(' ')[1]}`}
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
                                  ? 'text-green-600'
                                  : delta < 0
                                    ? 'text-red-600'
                                    : 'text-slate-400'
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
                            <pre className="rounded-md bg-slate-50 p-3 text-xs text-slate-700">
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
      </div>
    </div>
  )
}
