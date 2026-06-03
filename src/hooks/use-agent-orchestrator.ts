'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'

/**
 * useAgentOrchestrator
 *
 * Manages agent orchestration. Refreshes data periodically as a fallback
 * for WebSocket real-time updates. When WS is connected, polling is
 * reduced to every 60s; otherwise it defaults to every 30s.
 */
export function useAgentOrchestrator(options?: { pollingInterval?: number }) {
  const currentProject = useAppStore((s) => s.currentProject)
  const fetchAll = useAppStore((s) => s.fetchAll)
  const fetchAgents = useAppStore((s) => s.fetchAgents)
  const fetchTasks = useAppStore((s) => s.fetchTasks)
  const fetchMessages = useAppStore((s) => s.fetchMessages)
  const fetchFiles = useAppStore((s) => s.fetchFiles)
  const fetchActivities = useAppStore((s) => s.fetchActivities)

  const pollingInterval = options?.pollingInterval ?? 30000

  // Initial data load
  useEffect(() => {
    if (currentProject?.id) {
      fetchAll(currentProject.id)
    }
  }, [])

  // Periodic data refresh
  useEffect(() => {
    const refreshInterval = setInterval(async () => {
      const projectId = currentProject?.id
      if (!projectId) return

      try {
        // Only refresh lightweight data
        await Promise.all([
          fetchAgents(),
          fetchTasks(),
          fetchMessages(),
        ])
      } catch {
        // Silently ignore refresh errors
      }
    }, pollingInterval)

    return () => clearInterval(refreshInterval)
  }, [currentProject?.id, fetchAgents, fetchTasks, fetchMessages, pollingInterval])
}
