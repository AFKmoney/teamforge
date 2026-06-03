'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

// ---------------------------------------------------------------------------
// Reusable Skeleton Patterns
// ---------------------------------------------------------------------------

/**
 * CardSkeleton — Card with shimmer lines: icon circle, title, value, description
 */
export function CardSkeleton({ className, count = 1 }: { className?: string; count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className={cn('overflow-hidden', className)}>
          <CardContent className="p-4 space-y-3">
            {/* Icon circle + title row */}
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full animate-shimmer shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 rounded animate-shimmer" />
                <div className="h-5 w-16 rounded animate-shimmer" />
              </div>
            </div>
            {/* Description line */}
            <div className="h-3 w-3/4 rounded animate-shimmer" />
          </CardContent>
        </Card>
      ))}
    </>
  )
}

/**
 * TableSkeleton — 5 rows with varying widths
 */
export function TableSkeleton({ className, count = 5 }: { className?: string; count?: number }) {
  const widths = ['w-1/4', 'w-1/3', 'w-1/2', 'w-2/5', 'w-3/5']
  return (
    <div className={cn('rounded-md border', className)}>
      {/* Header row */}
      <div className="grid grid-cols-5 gap-4 px-4 py-3 border-b bg-muted/30">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-3 w-2/3 rounded animate-shimmer" />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: count }).map((_, rowIdx) => (
        <div key={rowIdx} className="grid grid-cols-5 gap-4 px-4 py-3 border-b last:border-b-0">
          {Array.from({ length: 5 }).map((_, colIdx) => (
            <div
              key={colIdx}
              className={cn('h-3 rounded animate-shimmer', widths[(rowIdx + colIdx) % widths.length])}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * ChartSkeleton — Rectangular area with shimmer
 */
export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      {/* Title */}
      <div className="h-4 w-32 rounded animate-shimmer mb-4" />
      {/* Chart area */}
      <div className="h-48 w-full rounded animate-shimmer" />
      {/* Legend */}
      <div className="flex gap-4 mt-3">
        <div className="h-3 w-16 rounded animate-shimmer" />
        <div className="h-3 w-16 rounded animate-shimmer" />
        <div className="h-3 w-16 rounded animate-shimmer" />
      </div>
    </div>
  )
}

/**
 * ListSkeleton — N items with avatar + text lines
 */
export function ListSkeleton({ className, count = 5 }: { className?: string; count?: number }) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
          {/* Avatar */}
          <div className="size-10 rounded-full animate-shimmer shrink-0" />
          {/* Text lines */}
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded animate-shimmer" />
            <div className="h-3 w-2/3 rounded animate-shimmer" />
          </div>
          {/* Meta */}
          <div className="h-3 w-16 rounded animate-shimmer shrink-0" />
        </div>
      ))}
    </div>
  )
}

/**
 * DetailSkeleton — Hero section + content blocks
 */
export function DetailSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Hero section */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="size-16 rounded-xl animate-shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-48 rounded animate-shimmer" />
            <div className="h-4 w-64 rounded animate-shimmer" />
            <div className="h-3 w-32 rounded animate-shimmer" />
          </div>
        </div>
      </div>

      {/* Content blocks */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <div className="h-4 w-24 rounded animate-shimmer" />
              <div className="h-8 w-16 rounded animate-shimmer" />
              <div className="h-3 w-full rounded animate-shimmer" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Description block */}
      <div className="space-y-2">
        <div className="h-4 w-20 rounded animate-shimmer" />
        <div className="h-3 w-full rounded animate-shimmer" />
        <div className="h-3 w-5/6 rounded animate-shimmer" />
        <div className="h-3 w-4/6 rounded animate-shimmer" />
      </div>
    </div>
  )
}
