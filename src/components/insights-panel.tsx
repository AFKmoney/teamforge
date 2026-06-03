'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Lightbulb,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Search,
  TrendingUp,
  Brain,
  Shield,
  Zap,
  ArrowRight,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
}

// ---------------------------------------------------------------------------
// A. Treemap Data & Algorithm
// ---------------------------------------------------------------------------

interface TreemapItem {
  name: string
  value: number
  color: string
  darkColor: string
  description: string
}

const TREEMAP_DATA: TreemapItem[] = [
  { name: 'Research', value: 25, color: 'fill-violet-500', darkColor: 'dark:fill-violet-400', description: 'Research agents exploring hypotheses' },
  { name: 'Coding', value: 30, color: 'fill-emerald-500', darkColor: 'dark:fill-emerald-400', description: 'Coding agents writing and reviewing code' },
  { name: 'Evaluation', value: 15, color: 'fill-sky-500', darkColor: 'dark:fill-sky-400', description: 'Evaluation agents testing outputs' },
  { name: 'Memory', value: 10, color: 'fill-amber-500', darkColor: 'dark:fill-amber-400', description: 'Memory management systems' },
  { name: 'Evolution', value: 12, color: 'fill-teal-500', darkColor: 'dark:fill-teal-400', description: 'Self-evolution engine processes' },
  { name: 'Safety', value: 5, color: 'fill-rose-500', darkColor: 'dark:fill-rose-400', description: 'Safety validation and compliance' },
  { name: 'Deployment', value: 3, color: 'fill-orange-500', darkColor: 'dark:fill-orange-400', description: 'Deployment pipeline operations' },
]

// SVG color map (since Tailwind fill- classes don't work dynamically in SVG)
const TREEMAP_SVG_COLORS: Record<string, { light: string; dark: string }> = {
  Research: { light: '#8b5cf6', dark: '#a78bfa' },
  Coding: { light: '#10b981', dark: '#34d399' },
  Evaluation: { light: '#0ea5e9', dark: '#38bdf8' },
  Memory: { light: '#f59e0b', dark: '#fbbf24' },
  Evolution: { light: '#14b8a6', dark: '#2dd4bf' },
  Safety: { light: '#f43f5e', dark: '#fb7185' },
  Deployment: { light: '#f97316', dark: '#fb923c' },
}

interface TreemapRect {
  x: number
  y: number
  w: number
  h: number
  item: TreemapItem
}

function squarify(
  data: TreemapItem[],
  x: number,
  y: number,
  w: number,
  h: number
): TreemapRect[] {
  if (data.length === 0) return []
  if (data.length === 1) {
    return [{ x, y, w, h, item: data[0] }]
  }

  const total = data.reduce((s, d) => s + d.value, 0)

  // Sort descending
  const sorted = [...data].sort((a, b) => b.value - a.value)

  // Decide split direction based on aspect ratio
  const horizontal = w >= h

  // Find best split point
  let sum = 0
  let bestIdx = 0
  let bestRatio = Infinity

  for (let i = 0; i < sorted.length - 1; i++) {
    sum += sorted[i].value
    const ratio = Math.max(sum / total, (total - sum) / total)
    if (ratio < bestRatio) {
      bestRatio = ratio
      bestIdx = i
    }
  }

  const leftItems = sorted.slice(0, bestIdx + 1)
  const rightItems = sorted.slice(bestIdx + 1)
  const leftTotal = leftItems.reduce((s, d) => s + d.value, 0)
  const rightTotal = rightItems.reduce((s, d) => s + d.value, 0)

  if (horizontal) {
    const leftW = (leftTotal / total) * w
    return [
      ...squarify(leftItems, x, y, leftW, h),
      ...squarify(rightItems, x + leftW, y, w - leftW, h),
    ]
  } else {
    const topH = (leftTotal / total) * h
    return [
      ...squarify(leftItems, x, y, w, topH),
      ...squarify(rightItems, x, y + topH, w, h - topH),
    ]
  }
}

// ---------------------------------------------------------------------------
// B. Heatmap Data
// ---------------------------------------------------------------------------

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

function generateHeatmapData(): Map<string, number> {
  const data = new Map<string, number>()
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const isWeekend = day >= 5
      const isWorkHour = hour >= 8 && hour <= 18
      const isPeak = hour >= 10 && hour <= 16

      let base: number
      if (isWeekend) {
        base = isWorkHour ? 15 + Math.random() * 20 : 2 + Math.random() * 5
      } else {
        if (isPeak) base = 30 + Math.random() * 25
        else if (isWorkHour) base = 15 + Math.random() * 20
        else base = 2 + Math.random() * 8
      }
      data.set(`${day}-${hour}`, Math.round(base))
    }
  }
  return data
}

// Seeded random for consistent data
function seededHeatmapData(): Map<string, number> {
  const data = new Map<string, number>()
  let seed = 42
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const isWeekend = day >= 5
      const isWorkHour = hour >= 8 && hour <= 18
      const isPeak = hour >= 10 && hour <= 16

      let base: number
      if (isWeekend) {
        base = isWorkHour ? 15 + rand() * 20 : 2 + rand() * 5
      } else {
        if (isPeak) base = 30 + rand() * 25
        else if (isWorkHour) base = 15 + rand() * 20
        else base = 2 + rand() * 8
      }
      data.set(`${day}-${hour}`, Math.round(base))
    }
  }
  return data
}

const HEATMAP_DATA = seededHeatmapData()

function getHeatmapColor(value: number, max: number): string {
  const ratio = value / max
  if (ratio < 0.1) return 'fill-emerald-100 dark:fill-emerald-950'
  if (ratio < 0.25) return 'fill-emerald-200 dark:fill-emerald-900'
  if (ratio < 0.4) return 'fill-emerald-300 dark:fill-emerald-800'
  if (ratio < 0.55) return 'fill-emerald-400 dark:fill-emerald-700'
  if (ratio < 0.7) return 'fill-emerald-500 dark:fill-emerald-600'
  if (ratio < 0.85) return 'fill-emerald-600 dark:fill-emerald-500'
  return 'fill-emerald-700 dark:fill-emerald-400'
}

function getHeatmapSvgColor(value: number, max: number): string {
  const ratio = value / max
  if (ratio < 0.1) return '#d1fae5' // emerald-100
  if (ratio < 0.25) return '#a7f3d0' // emerald-200
  if (ratio < 0.4) return '#6ee7b7' // emerald-300
  if (ratio < 0.55) return '#34d399' // emerald-400
  if (ratio < 0.7) return '#10b981' // emerald-500
  if (ratio < 0.85) return '#059669' // emerald-600
  return '#047857' // emerald-700
}

// ---------------------------------------------------------------------------
// C. Prediction Chart Data
// ---------------------------------------------------------------------------

interface PredictionPoint {
  day: string
  actual: number | null
  predicted: number | null
  lower: number | null
  upper: number | null
}

const PREDICTION_DATA: PredictionPoint[] = [
  { day: 'Mar 1', actual: 72, predicted: null, lower: null, upper: null },
  { day: 'Mar 2', actual: 68, predicted: null, lower: null, upper: null },
  { day: 'Mar 3', actual: 75, predicted: null, lower: null, upper: null },
  { day: 'Mar 4', actual: 71, predicted: null, lower: null, upper: null },
  { day: 'Mar 5', actual: 79, predicted: null, lower: null, upper: null },
  { day: 'Mar 6', actual: 82, predicted: null, lower: null, upper: null },
  { day: 'Mar 7', actual: 78, predicted: 78, lower: null, upper: null },
  { day: 'Mar 8', actual: null, predicted: 80, lower: 73, upper: 87 },
  { day: 'Mar 9', actual: null, predicted: 83, lower: 74, upper: 92 },
  { day: 'Mar 10', actual: null, predicted: 85, lower: 75, upper: 95 },
]

// ---------------------------------------------------------------------------
// D. Anomaly Data
// ---------------------------------------------------------------------------

type Severity = 'warning' | 'error' | 'critical'

interface Anomaly {
  id: string
  title: string
  severity: Severity
  description: string
  timestamp: string
  currentValue: string
  expectedRange: string
}

const ANOMALIES: Anomaly[] = [
  {
    id: 'anom-1',
    title: 'Agent CPU spike',
    severity: 'error',
    description: 'Coding Agent CPU at 94% (expected <80%)',
    timestamp: '2 min ago',
    currentValue: '94%',
    expectedRange: '< 80%',
  },
  {
    id: 'anom-2',
    title: 'Memory usage trend',
    severity: 'warning',
    description: 'Episodic memory growing 15% faster than baseline',
    timestamp: '18 min ago',
    currentValue: '+15%',
    expectedRange: 'Baseline rate',
  },
  {
    id: 'anom-3',
    title: 'Evolution success rate dip',
    severity: 'warning',
    description: 'Last 5 evolutions: 40% success (baseline 72%)',
    timestamp: '1 hr ago',
    currentValue: '40%',
    expectedRange: '72% baseline',
  },
  {
    id: 'anom-4',
    title: 'Safety validation timeout',
    severity: 'error',
    description: '2 validations exceeded 30s threshold',
    timestamp: '3 hrs ago',
    currentValue: '2 timeouts',
    expectedRange: '0 timeouts',
  },
  {
    id: 'anom-5',
    title: 'Token cost anomaly',
    severity: 'critical',
    description: 'Daily token cost 3x above 30-day average',
    timestamp: '5 hrs ago',
    currentValue: '3x avg',
    expectedRange: '1x avg',
  },
]

const SEVERITY_CONFIG: Record<Severity, { icon: React.ComponentType<{ className?: string }>; borderClass: string; iconColor: string; bgClass: string }> = {
  warning: {
    icon: AlertTriangle,
    borderClass: 'border-l-amber-500',
    iconColor: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-500/10 dark:bg-amber-500/20',
  },
  error: {
    icon: AlertCircle,
    borderClass: 'border-l-red-500',
    iconColor: 'text-red-600 dark:text-red-400',
    bgClass: 'bg-red-500/10 dark:bg-red-500/20',
  },
  critical: {
    icon: XCircle,
    borderClass: 'border-l-rose-600',
    iconColor: 'text-rose-600 dark:text-rose-400',
    bgClass: 'bg-rose-500/10 dark:bg-rose-500/20',
  },
}

// ---------------------------------------------------------------------------
// E. Efficiency Score Data
// ---------------------------------------------------------------------------

const EFFICIENCY_SCORE = 78

const SUB_SCORES = [
  { label: 'Agent Utilization', value: 85, color: 'bg-emerald-500' },
  { label: 'Memory Efficiency', value: 72, color: 'bg-amber-500' },
  { label: 'Evolution ROI', value: 68, color: 'bg-teal-500' },
  { label: 'Safety Compliance', value: 95, color: 'bg-violet-500' },
]

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// --- Treemap ---
function TreemapVisualization() {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [tooltipInfo, setTooltipInfo] = useState<{
    name: string
    value: number
    description: string
    x: number
    y: number
  } | null>(null)

  const width = 600
  const height = 300
  const padding = 2

  const rects = useMemo(() => {
    const raw = squarify(TREEMAP_DATA, 0, 0, width, height)
    return raw.map((r) => ({
      ...r,
      x: r.x + padding,
      y: r.y + padding,
      w: Math.max(r.w - padding * 2, 0),
      h: Math.max(r.h - padding * 2, 0),
    }))
  }, [])

  const handleMouseEnter = useCallback((item: TreemapItem, e: React.MouseEvent<SVGRectElement>) => {
    setHoveredItem(item.name)
    const svgRect = (e.target as SVGElement).closest('svg')?.getBoundingClientRect()
    if (svgRect) {
      setTooltipInfo({
        name: item.name,
        value: item.value,
        description: item.description,
        x: e.clientX - svgRect.left,
        y: e.clientY - svgRect.top,
      })
    }
  }, [])

  const handleMouseLeave = useCallback(() => {
    setHoveredItem(null)
    setTooltipInfo(null)
  }, [])

  const handleMouseMove = useCallback((item: TreemapItem, e: React.MouseEvent<SVGRectElement>) => {
    const svgRect = (e.target as SVGElement).closest('svg')?.getBoundingClientRect()
    if (svgRect) {
      setTooltipInfo((prev) => prev ? {
        ...prev,
        x: e.clientX - svgRect.left,
        y: e.clientY - svgRect.top,
      } : null)
    }
  }, [])

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
          <div className="size-6 rounded bg-violet-500/10 dark:bg-violet-500/20 flex items-center justify-center">
            <Zap className="size-3.5 text-violet-600 dark:text-violet-400" />
          </div>
          Resource Allocation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto"
            style={{ maxHeight: '320px' }}
          >
            {rects.map((rect, i) => {
              const colors = TREEMAP_SVG_COLORS[rect.item.name]
              const isHovered = hoveredItem === rect.item.name
              const opacity = hoveredItem && !isHovered ? 0.6 : 1

              return (
                <g key={rect.item.name}>
                  <rect
                    x={rect.x}
                    y={rect.y}
                    width={rect.w}
                    height={rect.h}
                    rx={4}
                    fill={colors.light}
                    opacity={opacity}
                    className="transition-all duration-200"
                    style={{ filter: isHovered ? 'brightness(1.2)' : 'none' }}
                    onMouseEnter={(e) => handleMouseEnter(rect.item, e)}
                    onMouseMove={(e) => handleMouseMove(rect.item, e)}
                    onMouseLeave={handleMouseLeave}
                  />
                  {/* Dark mode overlay — we use CSS to swap */}
                  <rect
                    x={rect.x}
                    y={rect.y}
                    width={rect.w}
                    height={rect.h}
                    rx={4}
                    fill={colors.dark}
                    opacity={0}
                    className="transition-all duration-200 dark:opacity-[var(--dark-opacity)]"
                    style={
                      {
                        '--dark-opacity': isHovered
                          ? 1
                          : hoveredItem
                            ? 0.6
                            : 1,
                      } as React.CSSProperties
                    }
                    onMouseEnter={(e) => handleMouseEnter(rect.item, e)}
                    onMouseMove={(e) => handleMouseMove(rect.item, e)}
                    onMouseLeave={handleMouseLeave}
                  />
                  {/* Text label — only show if rect is large enough */}
                  {rect.w > 50 && rect.h > 30 && (
                    <text
                      x={rect.x + rect.w / 2}
                      y={rect.y + rect.h / 2 - 6}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-white text-xs font-semibold pointer-events-none"
                      fontSize={rect.w > 100 ? 13 : 11}
                    >
                      {rect.item.name}
                    </text>
                  )}
                  {rect.w > 50 && rect.h > 45 && (
                    <text
                      x={rect.x + rect.w / 2}
                      y={rect.y + rect.h / 2 + 10}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-white/80 pointer-events-none"
                      fontSize={11}
                    >
                      {rect.item.value}%
                    </text>
                  )}
                </g>
              )
            })}
            {/* Tooltip */}
            {tooltipInfo && (
              <g>
                <foreignObject
                  x={Math.min(tooltipInfo.x + 10, width - 200)}
                  y={Math.min(tooltipInfo.y - 10, height - 80)}
                  width={190}
                  height={70}
                >
                  <div className="bg-popover border border-border rounded-lg shadow-lg p-2 text-xs">
                    <div className="font-semibold text-foreground">{tooltipInfo.name}</div>
                    <div className="text-muted-foreground mt-0.5">{tooltipInfo.description}</div>
                    <div className="mt-1 text-foreground font-medium">{tooltipInfo.value}% allocation</div>
                  </div>
                </foreignObject>
              </g>
            )}
          </svg>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-border">
          {TREEMAP_DATA.map((item) => {
            const colors = TREEMAP_SVG_COLORS[item.name]
            return (
              <div key={item.name} className="flex items-center gap-1.5">
                <div
                  className="size-2.5 rounded-sm"
                  style={{ backgroundColor: colors.light }}
                />
                <span className="text-xs text-muted-foreground">
                  {item.name} ({item.value}%)
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// --- Heatmap ---
function HeatmapVisualization() {
  const [hoveredCell, setHoveredCell] = useState<{
    day: number
    hour: number
    value: number
  } | null>(null)

  const maxValue = useMemo(() => {
    let max = 0
    HEATMAP_DATA.forEach((v) => {
      if (v > max) max = v
    })
    return max
  }, [])

  const cellSize = 18
  const gap = 2
  const labelWidth = 30
  const labelHeight = 20
  const svgWidth = labelWidth + 24 * (cellSize + gap) + 10
  const svgHeight = labelHeight + 7 * (cellSize + gap) + 10

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
          <div className="size-6 rounded bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center">
            <TrendingUp className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          Agent Activity Patterns
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto"
            style={{ maxHeight: '220px' }}
          >
            {/* Hour labels */}
            {HOURS.filter((h) => h % 3 === 0).map((hour) => (
              <text
                key={`h-${hour}`}
                x={labelWidth + hour * (cellSize + gap) + cellSize / 2}
                y={12}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize={9}
              >
                {hour.toString().padStart(2, '0')}
              </text>
            ))}
            {/* Day labels & cells */}
            {DAYS.map((day, dayIdx) => (
              <g key={`day-${dayIdx}`}>
                <text
                  x={labelWidth - 4}
                  y={labelHeight + dayIdx * (cellSize + gap) + cellSize / 2}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-muted-foreground"
                  fontSize={9}
                >
                  {day}
                </text>
                {HOURS.map((hour) => {
                  const value = HEATMAP_DATA.get(`${dayIdx}-${hour}`) ?? 0
                  const isHovered =
                    hoveredCell?.day === dayIdx && hoveredCell?.hour === hour
                  return (
                    <rect
                      key={`${dayIdx}-${hour}`}
                      x={labelWidth + hour * (cellSize + gap)}
                      y={labelHeight + dayIdx * (cellSize + gap)}
                      width={cellSize}
                      height={cellSize}
                      rx={2}
                      fill={getHeatmapSvgColor(value, maxValue)}
                      opacity={hoveredCell && !isHovered ? 0.5 : 1}
                      className="transition-all duration-150 cursor-pointer"
                      style={{
                        filter: isHovered ? 'brightness(1.3)' : 'none',
                        stroke: isHovered ? 'hsl(var(--foreground))' : 'none',
                        strokeWidth: isHovered ? 1.5 : 0,
                      }}
                      onMouseEnter={() =>
                        setHoveredCell({ day: dayIdx, hour, value })
                      }
                      onMouseLeave={() => setHoveredCell(null)}
                    />
                  )
                })}
              </g>
            ))}
            {/* Hover tooltip */}
            {hoveredCell && (
              <foreignObject
                x={Math.min(
                  labelWidth + hoveredCell.hour * (cellSize + gap) + cellSize + 5,
                  svgWidth - 160
                )}
                y={labelHeight + hoveredCell.day * (cellSize + gap) - 5}
                width={155}
                height={32}
              >
                <div className="bg-popover border border-border rounded-md shadow-md px-2 py-1 text-xs text-popover-foreground">
                  {DAYS[hoveredCell.day]} {hoveredCell.hour.toString().padStart(2, '0')}:00 — {hoveredCell.value} events
                </div>
              </foreignObject>
            )}
          </svg>
        </div>
        {/* Color scale legend */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
          <span className="text-xs text-muted-foreground">Low</span>
          <div className="flex gap-0.5">
            {[0.05, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((ratio, i) => (
              <div
                key={i}
                className="size-3 rounded-sm"
                style={{ backgroundColor: getHeatmapSvgColor(ratio * maxValue, maxValue) }}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">High</span>
        </div>
      </CardContent>
    </Card>
  )
}

// --- Prediction Chart Tooltip ---
function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: PredictionPoint }> }) {
  if (!active || !payload?.[0]) return null
  const point = payload[0].payload as PredictionPoint
  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-2.5 text-xs">
      <div className="font-semibold text-foreground">{point.day}</div>
      {point.actual !== null && (
        <div className="text-emerald-600 dark:text-emerald-400 mt-0.5">
          Actual: {point.actual}%
        </div>
      )}
      {point.predicted !== null && (
        <div className="text-amber-600 dark:text-amber-400 mt-0.5">
          Predicted: {point.predicted}%
        </div>
      )}
      {point.upper !== null && point.lower !== null && (
        <div className="text-muted-foreground mt-0.5">
          Range: {point.lower}% — {point.upper}%
        </div>
      )}
    </div>
  )
}

// --- Prediction Chart ---
function PredictionChart() {

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
            <div className="size-6 rounded bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center">
              <Brain className="size-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            Performance Forecast
          </CardTitle>
          <Badge
            variant="outline"
            className="text-xs border-amber-500/30 text-amber-600 dark:text-amber-400"
          >
            Model Confidence: 87%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-48 md:h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={PREDICTION_DATA}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="predictedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis
                domain={[50, 100]}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              {/* Confidence interval (upper) */}
              <Area
                type="monotone"
                dataKey="upper"
                stroke="none"
                fill="url(#confidenceGradient)"
                connectNulls={false}
                isAnimationActive={false}
              />
              {/* Actual performance */}
              <Area
                type="monotone"
                dataKey="actual"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#actualGradient)"
                connectNulls={false}
                dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
              />
              {/* Predicted performance */}
              <Area
                type="monotone"
                dataKey="predicted"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="6 3"
                fill="url(#predictedGradient)"
                connectNulls={false}
                dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }}
              />
              {/* Lower bound (invisible, just for area) */}
              <Area
                type="monotone"
                dataKey="lower"
                stroke="none"
                fill="none"
                connectNulls={false}
                isAnimationActive={false}
              />
              {/* Reference line at transition point */}
              <ReferenceLine
                x="Mar 7"
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
              {/* Annotation */}
              <ReferenceLine
                x="Mar 5"
                stroke="#8b5cf6"
                strokeDasharray="2 2"
                strokeWidth={1}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {/* Annotation legend */}
        <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-0.5 bg-emerald-500 rounded" />
            <span className="text-xs text-muted-foreground">Historical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-0.5 bg-amber-500 rounded" style={{ borderStyle: 'dashed' }} />
            <span className="text-xs text-muted-foreground">Predicted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-3 bg-amber-500/15 rounded" />
            <span className="text-xs text-muted-foreground">Confidence interval</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-0.5 bg-violet-500 rounded" />
            <span className="text-xs text-muted-foreground">Prompt evolution deployed</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// --- Anomaly Alerts ---
function AnomalyAlerts() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id))
  }

  const visibleAnomalies = ANOMALIES.filter((a) => !dismissed.has(a.id))

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
            <div className="size-6 rounded bg-rose-500/10 dark:bg-rose-500/20 flex items-center justify-center">
              <AlertTriangle className="size-3.5 text-rose-600 dark:text-rose-400" />
            </div>
            Anomaly Detection
          </CardTitle>
          <Badge variant="outline" className="text-xs border-rose-500/30 text-rose-600 dark:text-rose-400">
            {visibleAnomalies.length} active
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {visibleAnomalies.map((anomaly, idx) => {
            const cfg = SEVERITY_CONFIG[anomaly.severity]
            const Icon = cfg.icon
            return (
              <motion.div
                key={anomaly.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={cn(
                  'border-l-4 rounded-r-lg p-3 bg-card border border-border/50',
                  cfg.borderClass
                )}
              >
                <div className="flex items-start gap-2.5">
                  <div className={cn('size-7 rounded-full flex items-center justify-center shrink-0 mt-0.5', cfg.bgClass)}>
                    <Icon className={cn('size-3.5', cfg.iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{anomaly.title}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] px-1.5 py-0',
                          anomaly.severity === 'critical' && 'border-rose-500/30 text-rose-600 dark:text-rose-400',
                          anomaly.severity === 'error' && 'border-red-500/30 text-red-600 dark:text-red-400',
                          anomaly.severity === 'warning' && 'border-amber-500/30 text-amber-600 dark:text-amber-400'
                        )}
                      >
                        {anomaly.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {anomaly.description}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] text-muted-foreground">
                        {anomaly.timestamp}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Current: <span className="text-foreground font-medium">{anomaly.currentValue}</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Expected: <span className="text-foreground font-medium">{anomaly.expectedRange}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <TooltipProvider delayDuration={0}>
                      <UiTooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => handleDismiss(anomaly.id)}
                          >
                            Dismiss
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Dismiss this alert</TooltipContent>
                      </UiTooltip>
                    </TooltipProvider>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                    >
                      <Search className="size-3 mr-1" />
                      Investigate
                    </Button>
                  </div>
                </div>
              </motion.div>
            )
          })}
          {visibleAnomalies.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              All anomalies dismissed. No active alerts.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// --- Efficiency Score ---
function EfficiencyScore() {
  const score = EFFICIENCY_SCORE
  const radius = 70
  const strokeWidth = 10
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  const scoreColor =
    score >= 80
      ? 'text-emerald-600 dark:text-emerald-400'
      : score >= 60
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400'

  const strokeColor =
    score >= 80
      ? '#10b981'
      : score >= 60
        ? '#f59e0b'
        : '#ef4444'

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
          <div className="size-6 rounded bg-teal-500/10 dark:bg-teal-500/20 flex items-center justify-center">
            <Shield className="size-3.5 text-teal-600 dark:text-teal-400" />
          </div>
          System Efficiency Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          {/* Circular Progress */}
          <div className="relative size-36 md:size-44">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
              {/* Background circle */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth={strokeWidth}
              />
              {/* Progress circle */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn('text-4xl font-bold', scoreColor)}>
                {score}
              </span>
              <span className="text-xs text-muted-foreground mt-0.5">
                out of 100
              </span>
            </div>
          </div>

          {/* Sub-scores */}
          <div className="w-full mt-4 space-y-2.5">
            {SUB_SCORES.map((sub) => (
              <div key={sub.label} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{sub.label}</span>
                  <span className="text-xs font-medium text-foreground">{sub.value}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className={cn('h-full rounded-full', sub.color)}
                    initial={{ width: 0 }}
                    animate={{ width: `${sub.value}%` }}
                    transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                  />
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" size="sm" className="mt-4 w-full text-xs">
            <ArrowRight className="size-3 mr-1" />
            View Detailed Report
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Main Panel
// ---------------------------------------------------------------------------

export function InsightsPanel() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4 md:space-y-6 overflow-x-hidden"
    >
      {/* Page Header */}
      <PageHeader
        icon={Lightbulb}
        iconColor="amber"
        title="System Insights"
        description="AI-powered analytics and performance predictions"
      />

      {/* Top row: Efficiency Score (1/3) + Anomaly Alerts (2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <motion.div variants={cardVariants} className="lg:col-span-1">
          <EfficiencyScore />
        </motion.div>
        <motion.div variants={cardVariants} className="lg:col-span-2">
          <AnomalyAlerts />
        </motion.div>
      </div>

      {/* Middle row: Treemap (1/2) + Heatmap (1/2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <motion.div variants={cardVariants}>
          <TreemapVisualization />
        </motion.div>
        <motion.div variants={cardVariants}>
          <HeatmapVisualization />
        </motion.div>
      </div>

      {/* Bottom row: Prediction Chart (full width) */}
      <motion.div variants={cardVariants}>
        <PredictionChart />
      </motion.div>
    </motion.div>
  )
}
