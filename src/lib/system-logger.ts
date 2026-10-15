import type { SystemLogLevel, SystemLogSource } from '@/lib/types'

export interface LogEntryInput {
  level?: SystemLogLevel
  source?: SystemLogSource
  action: string
  details?: Record<string, unknown>
  userId?: string
}

/**
 * Persist a system log entry via /api/system-log.
 * Fire-and-forget: never throws, failures are logged to console only.
 */
export function logEvent(input: LogEntryInput): void {
  try {
    void fetch('/api/system-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: input.level ?? 'info',
        source: input.source ?? 'system',
        action: input.action,
        details: input.details ?? {},
        userId: input.userId,
      }),
    }).catch((err) => {
      console.warn('logEvent failed:', err)
    })
  } catch {
    // ignore synchronous failures (e.g. during SSR)
  }
}
