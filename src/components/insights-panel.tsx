'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lightbulb,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Search,
  TrendingUp,
  TrendingDown,
  Brain,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle2,
  Eye,
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

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
  status: string
}

const TREEMAP_DATA: TreemapItem[] = [
  { name: 'Research', value: 25, color: 'fill-violet-500', darkColor: 'dark:fill-violet-400', description: 'Research agents exploring hypotheses', status: 'active' },
  { name: 'Coding', value: 30, color: 'fill-emerald-500', darkColor: 'dark:fill-emerald-400', description: 'Coding agents writing and reviewing code', status: 'active' },
  { name: 'Evaluation', value: 15, color: 'fill-sky-500', darkColor: 'dark:fill-sky-400', description: 'Evaluation agents testing outputs', status: 'busy' },
  { name: 'Memory', value: 10, color: 'fill-amber-500', darkColor: 'dark:fill-amber-400', description: 'Memory management systems', status: 'active' },
  { name: 'Evolution', value: 12, color: 'fill-teal-500', darkColor: 'dark:fill-teal-400', description: 'Self-evolution engine processes', status: 'active' },
  { name: 'Safety', value: 5, color: 'fill-rose-500', darkColor: 'dark:fill-rose-400', description: 'Safety validation and compliance', status: 'idle' },
  { name: 'Deployment', value: 3, color: 'fill-orange-500', darkColor: 'dark:fill-orange-400', description: 'Deployment pipeline operations', status: 'active' },
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

function getHeatmapSvgColor(value: number, max: number): string {
  const ratio = value / max
  // Stronger green gradient with more distinct steps
  if (ratio < 0.1) return '#d1fae5'  // emerald-100
  if (ratio < 0.2) return '#a7f3d0'  // emerald-200
  if (ratio < 0.35) return '#6ee7b7' // emerald-300
  if (ratio < 0.5) return '#34d399'  // emerald-400
  if (ratio < 0.65) return '#10b981' // emerald-500
  if (ratio < 0.8) return '#059669'  // emerald-600
  if (ratio < 0.9) return '#047857'  // emerald-700
  return '#065f46'                     // emerald-800
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
const PREV_EFFICIENCY_SCORE = 75.4 // Last week's score for trend

const SUB_SCORES = [
  { label: 'Agent Utilization', value: 85, color: 'bg-emerald-500', panel: 'agents' as const },
  { label: 'Memory Efficiency', value: 72, color: 'bg-amber-500', panel: 'memory' as const },
  { label: 'Evolution ROI', value: 68, color: 'bg-teal-500', panel: 'evolution' as const },
  { label: 'Safety Compliance', value: 95, color: 'bg-violet-500', panel: 'safety' as const },
]

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// --- Treemap ---
function TreemapVisualization() {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<TreemapItem | null>(null)
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

  const handleClick = useCallback((item: TreemapItem) => {
    setSelectedItem(item)
  }, [])

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
          <div className="size-6 rounded bg-violet-500/10 dark:bg-violet-500/20 flex items-center justify-center">
            <Zap className="size-3.5 text-violet-600 dark:text-violet-400" />
          </div>
          Resource Allocation
          {selectedItem && (
            <Popover open={!!selectedItem} onOpenChange={(open) => { if (!open) setSelectedItem(null) }}>
              <PopoverTrigger asChild>
                <span />
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" side="bottom" align="start">
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="size-3 rounded-sm shrink-0"
                      style={{ backgroundColor: TREEMAP_SVG_COLORS[selectedItem.name]?.light }}
                    />
                    <span className="font-semibold text-sm text-foreground">{selectedItem.name}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] ml-auto',
                        selectedItem.status === 'active' && 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
                        selectedItem.status === 'busy' && 'border-amber-500/30 text-amber-600 dark:text-amber-400',
                        selectedItem.status === 'idle' && 'border-muted-foreground/30 text-muted-foreground',
                      )}
                    >
                      {selectedItem.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{selectedItem.description}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md bg-muted/50 p-2">
                      <div className="text-muted-foreground">Allocation</div>
                      <div className="font-semibold text-foreground">{selectedItem.value}%</div>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2">
                      <div className="text-muted-foreground">Status</div>
                      <div className={cn(
                        'font-semibold',
                        selectedItem.status === 'active' && 'text-emerald-600 dark:text-emerald-400',
                        selectedItem.status === 'busy' && 'text-amber-600 dark:text-amber-400',
                        selectedItem.status === 'idle' && 'text-muted-foreground',
                      )}>
                        {selectedItem.status.charAt(0).toUpperCase() + selectedItem.status.slice(1)}
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
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
              const isSelected = selectedItem?.name === rect.item.name
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
                    className="transition-all duration-200 cursor-pointer"
                    style={{
                      filter: isHovered || isSelected ? 'brightness(1.2)' : 'none',
                      stroke: isSelected ? 'hsl(var(--foreground))' : 'none',
                      strokeWidth: isSelected ? 2 : 0,
                    }}
                    onMouseEnter={(e) => handleMouseEnter(rect.item, e)}
                    onMouseMove={(e) => handleMouseMove(rect.item, e)}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => handleClick(rect.item)}
                  />
                  {/* Dark mode overlay */}
                  <rect
                    x={rect.x}
                    y={rect.y}
                    width={rect.w}
                    height={rect.h}
                    rx={4}
                    fill={colors.dark}
                    opacity={0}
                    className="transition-all duration-200 dark:opacity-[var(--dark-opacity)] cursor-pointer"
                    style={
                      {
                        '--dark-opacity': isHovered || isSelected
                          ? 1
                          : hoveredItem
                            ? 0.6
                            : 1,
                      } as React.CSSProperties
                    }
                    onMouseEnter={(e) => handleMouseEnter(rect.item, e)}
                    onMouseMove={(e) => handleMouseMove(rect.item, e)}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => handleClick(rect.item)}
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
            {tooltipInfo && !selectedItem && (
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
              <button
                key={item.name}
                className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                onClick={() => setSelectedItem(item)}
              >
                <div
                  className="size-2.5 rounded-sm"
                  style={{ backgroundColor: colors.light }}
                />
                <span className="text-xs text-muted-foreground">
                  {item.name} ({item.value}%)
                </span>
              </button>
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

  // Compute peak hours (top 3 busiest)
  const peakHours = useMemo(() => {
    const hourTotals: { hour: number; total: number }[] = []
    for (let h = 0; h < 24; h++) {
      let total = 0
      for (let d = 0; d < 7; d++) {
        total += HEATMAP_DATA.get(`${d}-${h}`) ?? 0
      }
      hourTotals.push({ hour: h, total })
    }
    hourTotals.sort((a, b) => b.total - a.total)
    return hourTotals.slice(0, 3)
  }, [])

  const cellSize = 20
  const gap = 2
  const labelWidth = 30
  const labelHeight = 20
  const svgWidth = labelWidth + 24 * (cellSize + gap) + 10
  const svgHeight = labelHeight + 7 * (cellSize + gap) + 10

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
            <div className="size-6 rounded bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            Agent Activity Patterns
          </CardTitle>
          {/* Peak Hours indicator */}
          <div className="hidden sm:flex items-center gap-2">
            <Clock className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[10px] text-muted-foreground">Peak:</span>
            {peakHours.map((ph, i) => (
              <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                {ph.hour.toString().padStart(2, '0')}:00
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto"
            style={{ maxHeight: '240px' }}
          >
            {/* Hour labels */}
            {HOURS.filter((h) => h % 3 === 0).map((hour) => {
              const isPeak = peakHours.some((p) => p.hour === hour)
              return (
                <text
                  key={`h-${hour}`}
                  x={labelWidth + hour * (cellSize + gap) + cellSize / 2}
                  y={12}
                  textAnchor="middle"
                  className={cn(isPeak ? 'fill-emerald-600 dark:fill-emerald-400 font-semibold' : 'fill-muted-foreground')}
                  fontSize={9}
                >
                  {hour.toString().padStart(2, '0')}
                </text>
              )
            })}
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
            {[0.05, 0.15, 0.25, 0.4, 0.55, 0.7, 0.85, 0.95].map((ratio, i) => (
              <div
                key={i}
                className="size-3.5 rounded-sm"
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
  const isPrediction = point.actual === null && point.predicted !== null
  const now = new Date()
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-xs min-w-[140px]">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-foreground">{point.day}</span>
        <span className="text-[10px] text-muted-foreground">{timeStr}</span>
      </div>
      <div className="mt-1.5 space-y-1">
        {point.actual !== null && (
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-emerald-600 dark:text-emerald-400">Actual: {point.actual}%</span>
          </div>
        )}
        {point.predicted !== null && (
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-400" />
            <span className="text-amber-600 dark:text-amber-400">Predicted: {point.predicted}%</span>
          </div>
        )}
        {point.upper !== null && point.lower !== null && (
          <div className="text-muted-foreground pl-[18px]">
            Range: {point.lower}% — {point.upper}%
          </div>
        )}
      </div>
      {isPrediction && (
        <div className="mt-1.5 pt-1.5 border-t border-border text-muted-foreground">
          <Eye className="size-3 inline mr-1" />
          Forecast zone
        </div>
      )}
    </div>
  )
}

// --- Prediction Chart ---
function PredictionChart() {
  // Find peak and trough in actual data
  const actualPoints = PREDICTION_DATA.filter((p) => p.actual !== null)
  const peakPoint = actualPoints.reduce((best, p) => (p.actual! > best.actual! ? p : best), actualPoints[0])
  const troughPoint = actualPoints.reduce((best, p) => (p.actual! < best.actual! ? p : best), actualPoints[0])

  const MODEL_CONFIDENCE = 87

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
            <div className="size-6 rounded bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center">
              <Brain className="size-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            Performance Forecast
          </CardTitle>
          <div className="flex items-center gap-3">
            {/* Model Confidence indicator */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground hidden sm:inline">Confidence</span>
              <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${MODEL_CONFIDENCE}%` }}
                  transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
                />
              </div>
              <Badge
                variant="outline"
                className="text-xs border-amber-500/30 text-amber-600 dark:text-amber-400"
              >
                {MODEL_CONFIDENCE}%
              </Badge>
            </div>
          </div>
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
                dot={(props: Record<string, unknown>) => {
                  const { cx, cy, payload } = props as { cx: number; cy: number; payload: PredictionPoint }
                  const isPeak = payload.day === peakPoint.day
                  const isTrough = payload.day === troughPoint.day
                  if (isPeak || isTrough) {
                    return (
                      <g key={`dot-${payload.day}`}>
                        <circle cx={cx} cy={cy} r={6} fill={isPeak ? '#10b981' : '#ef4444'} opacity={0.2} />
                        <circle cx={cx} cy={cy} r={4} fill={isPeak ? '#10b981' : '#ef4444'} stroke="#fff" strokeWidth={1.5} />
                      </g>
                    )
                  }
                  return <circle key={`dot-${payload.day}`} cx={cx} cy={cy} r={3} fill="#10b981" />
                }}
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
              {/* Annotation for peak */}
              <ReferenceLine
                x={peakPoint.day}
                stroke="#10b981"
                strokeDasharray="2 2"
                strokeWidth={1}
              />
              {/* Annotation for trough */}
              <ReferenceLine
                x={troughPoint.day}
                stroke="#ef4444"
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
            <div className="size-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs text-muted-foreground">Peak ({peakPoint.actual}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-2.5 rounded-full bg-red-500" />
            <span className="text-xs text-muted-foreground">Trough ({troughPoint.actual}%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// --- Anomaly Alerts ---
function AnomalyAlerts() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set())
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning'>('all')
  const [showDismissed, setShowDismissed] = useState(false)

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id))
  }

  const handleAcknowledge = (id: string) => {
    setAcknowledged((prev) => new Set(prev).add(id))
  }

  const allAnomalies = ANOMALIES
  const activeAnomalies = allAnomalies.filter((a) => !dismissed.has(a.id))
  const visibleAnomalies = activeAnomalies.filter((a) => {
    if (severityFilter === 'all') return true
    if (severityFilter === 'critical') return a.severity === 'critical'
    if (severityFilter === 'warning') return a.severity === 'warning' || a.severity === 'error'
    return true
  })

  const criticalCount = allAnomalies.filter((a) => a.severity === 'critical' && !dismissed.has(a.id)).length
  const warningCount = allAnomalies.filter((a) => (a.severity === 'warning' || a.severity === 'error') && !dismissed.has(a.id)).length
  const dismissedCount = dismissed.size

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
            <div className="size-6 rounded bg-rose-500/10 dark:bg-rose-500/20 flex items-center justify-center">
              <AlertTriangle className="size-3.5 text-rose-600 dark:text-rose-400" />
            </div>
            Anomaly Detection
            <Badge variant="outline" className="text-xs border-rose-500/30 text-rose-600 dark:text-rose-400">
              {activeAnomalies.length} active
            </Badge>
          </CardTitle>
          {/* Severity filter */}
          <div className="flex items-center gap-1">
            <Filter className="size-3 text-muted-foreground mr-1" />
            <Button
              variant={severityFilter === 'all' ? 'default' : 'ghost'}
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => setSeverityFilter('all')}
            >
              All
            </Button>
            <Button
              variant={severityFilter === 'critical' ? 'default' : 'ghost'}
              size="sm"
              className={cn('h-6 text-[10px] px-2', severityFilter === 'critical' && 'bg-rose-600 hover:bg-rose-700')}
              onClick={() => setSeverityFilter('critical')}
            >
              Critical ({criticalCount})
            </Button>
            <Button
              variant={severityFilter === 'warning' ? 'default' : 'ghost'}
              size="sm"
              className={cn('h-6 text-[10px] px-2', severityFilter === 'warning' && 'bg-amber-600 hover:bg-amber-700')}
              onClick={() => setSeverityFilter('warning')}
            >
              Warning ({warningCount})
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          <AnimatePresence mode="popLayout">
            {visibleAnomalies.map((anomaly, idx) => {
              const cfg = SEVERITY_CONFIG[anomaly.severity]
              const Icon = cfg.icon
              const isAcknowledged = acknowledged.has(anomaly.id)
              return (
                <motion.div
                  key={anomaly.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10, transition: { duration: 0.15 } }}
                  transition={{ delay: idx * 0.05 }}
                  className={cn(
                    'border-l-4 rounded-r-lg p-3 bg-card border border-border/50 transition-opacity',
                    cfg.borderClass,
                    isAcknowledged && 'opacity-60'
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
                        {isAcknowledged && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                            acknowledged
                          </Badge>
                        )}
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
                              className="h-7 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                              onClick={() => handleAcknowledge(anomaly.id)}
                              disabled={isAcknowledged}
                            >
                              <CheckCircle2 className="size-3 mr-0.5" />
                              Ack
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Acknowledge this alert</TooltipContent>
                        </UiTooltip>
                      </TooltipProvider>
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
          </AnimatePresence>
          {visibleAnomalies.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              {activeAnomalies.length === 0
                ? 'All anomalies dismissed. No active alerts.'
                : 'No anomalies match the current filter.'}
            </div>
          )}
        </div>
        {/* View dismissed */}
        {dismissedCount > 0 && !showDismissed && (
          <button
            className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            onClick={() => setShowDismissed(true)}
          >
            <ChevronDown className="size-3" />
            View {dismissedCount} dismissed alert{dismissedCount > 1 ? 's' : ''}
          </button>
        )}
        {showDismissed && dismissedCount > 0 && (
          <div className="mt-2">
            <button
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 mb-2"
              onClick={() => setShowDismissed(false)}
            >
              <ChevronUp className="size-3" />
              Hide dismissed alerts
            </button>
            <div className="space-y-1">
              {allAnomalies
                .filter((a) => dismissed.has(a.id))
                .map((anomaly) => {
                  const cfg = SEVERITY_CONFIG[anomaly.severity]
                  return (
                    <div
                      key={anomaly.id}
                      className={cn(
                        'border-l-4 rounded-r-md p-2 bg-muted/30 opacity-50',
                        cfg.borderClass
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground line-through">{anomaly.title}</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground">
                          dismissed
                        </Badge>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// --- Efficiency Score ---
function EfficiencyScore() {
  const score = EFFICIENCY_SCORE
  const prevScore = PREV_EFFICIENCY_SCORE
  const trendPercent = ((score - prevScore) / prevScore * 100).toFixed(1)
  const isTrendingUp = score > prevScore
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
              <motion.circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                className={cn('text-4xl font-bold', scoreColor)}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.3 }}
              >
                {score}
              </motion.span>
              <span className="text-xs text-muted-foreground mt-0.5">
                out of 100
              </span>
            </div>
          </div>

          {/* Trend indicator */}
          <div className={cn(
            'flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-medium',
            isTrendingUp
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-500/10 text-red-600 dark:text-red-400'
          )}>
            {isTrendingUp ? (
              <TrendingUp className="size-3.5" />
            ) : (
              <TrendingDown className="size-3.5" />
            )}
            <span>{isTrendingUp ? '+' : ''}{trendPercent}% from last week</span>
          </div>

          {/* Sub-scores */}
          <div className="w-full mt-4 space-y-2.5">
            {SUB_SCORES.map((sub) => (
              <TooltipProvider key={sub.label} delayDuration={0}>
                <UiTooltip>
                  <TooltipTrigger asChild>
                    <button className="w-full text-left space-y-1 hover:opacity-80 transition-opacity">
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
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Click to view {sub.label} details</p>
                    <p className="text-xs text-muted-foreground">Navigate to {sub.panel} panel</p>
                  </TooltipContent>
                </UiTooltip>
              </TooltipProvider>
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
