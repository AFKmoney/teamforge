'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toastError } from '@/lib/toast-utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseApiOptions {
  /** Auto-fetch on mount (default: true) */
  autoFetch?: boolean
  /** Fetch interval in ms (0 = disabled) */
  interval?: number
  /** Max retry attempts (default: 3) */
  maxRetries?: number
  /** Base delay for exponential backoff in ms (default: 1000) */
  baseDelay?: number
  /** Whether to show error toast on permanent failure (default: true) */
  showToast?: boolean
}

interface UseApiReturn<T> {
  data: T | null
  error: Error | null
  isLoading: boolean
  refetch: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const cache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_TTL = 30_000 // 30 seconds

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Custom hook for API calls with retry logic and exponential backoff.
 *
 * - Auto-retries failed requests up to `maxRetries` times
 * - Uses exponential backoff between retries
 * - Caches successful responses for 30 seconds
 * - Shows toast on permanent failure
 * - Supports manual refetch
 */
export function useApi<T = unknown>(
  url: string,
  options: UseApiOptions = {}
): UseApiReturn<T> {
  const {
    autoFetch = true,
    interval = 0,
    maxRetries = 3,
    baseDelay = 1000,
    showToast = true,
  } = options

  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  /**
   * Fetch with retry logic and exponential backoff
   */
  const fetchWithRetry = useCallback(
    async (attempt = 0): Promise<T | null> => {
      // Check cache first (only on first attempt)
      if (attempt === 0) {
        const cached = cache.get(url)
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          return cached.data as T
        }
      }

      try {
        // Cancel any in-flight request
        if (abortRef.current) {
          abortRef.current.abort()
        }
        const controller = new AbortController()
        abortRef.current = controller

        const res = await fetch(url, { signal: controller.signal })

        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`)
        }

        const result = await res.json() as T

        // Cache the successful response
        cache.set(url, { data: result, timestamp: Date.now() })

        return result
      } catch (err) {
        // Don't retry aborted requests
        if (err instanceof DOMException && err.name === 'AbortError') {
          return null
        }

        const error = err instanceof Error ? err : new Error(String(err))

        // Retry with exponential backoff
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt)
          await new Promise((resolve) => setTimeout(resolve, delay))
          return fetchWithRetry(attempt + 1)
        }

        // All retries exhausted — permanent failure
        if (showToast) {
          toastError(
            'Request failed',
            `Could not load data from ${url.split('?')[0]}. ${error.message}`
          )
        }

        throw error
      }
    },
    [url, maxRetries, baseDelay, showToast]
  )

  /**
   * Fetch data and update state
   */
  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchWithRetry()
      if (result !== null) {
        setData(result)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
    } finally {
      setIsLoading(false)
    }
  }, [fetchWithRetry])

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      refetch()
    }
  }, [url, autoFetch, refetch])

  // Interval-based polling
  useEffect(() => {
    if (interval > 0) {
      const id = setInterval(refetch, interval)
      return () => clearInterval(id)
    }
  }, [interval, refetch])

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort()
      }
    }
  }, [])

  return { data, error, isLoading, refetch }
}
