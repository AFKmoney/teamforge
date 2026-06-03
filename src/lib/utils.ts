import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { useSyncExternalStore } from "react"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const emptySubscribe = () => () => {}

/**
 * Returns `true` only after the component has hydrated on the client.
 * Returns `false` during server rendering and the initial client hydration pass.
 * Uses `useSyncExternalStore` to avoid the `setState`-in-effect lint rule
 * and prevent hydration mismatches.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(emptySubscribe, () => true, () => false)
}

/**
 * Format a date string as a relative time string (e.g. "just now", "5m ago", "2h ago", "3d ago")
 */
export function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(dateStr).toLocaleDateString()
}
