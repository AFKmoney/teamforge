'use client'

import { useEffect, useRef } from 'react'
import { useAppStore } from '@/lib/store'

/**
 * useAgentOrchestrator
 *
 * Manages agent orchestration. Currently only refreshes data periodically.
 * Agent execution is triggered manually via the UI or API.
 */
export function useAgentOrchestrator() {
  const currentProject = useAppStore((s) => s.currentProject)
  const fetchAll = useAppStore((s) => s.fetchAll)
  const fetchAgents = useAppStore((s) => s.fetchAgents)
  const fetchTasks = useAppStore((s) => s.fetchTasks)
  const fetchMessages = useAppStore((s) => s.fetchMessages)
  const fetchFiles = useAppStore((s) => s.fetchFiles)
  const fetchActivities = useAppStore((s) => s.fetchActivities)

  // Initial data load
  useEffect(() => {
    if (currentProject?.id) {
      fetchAll(currentProject.id)
    }
  }, [])

  // Periodic data refresh every 30 seconds
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
    }, 30000)

    return () => clearInterval(refreshInterval)
  }, [currentProject?.id, fetchAgents, fetchTasks, fetchMessages])
}
