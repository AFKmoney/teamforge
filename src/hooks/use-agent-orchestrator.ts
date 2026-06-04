'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '@/lib/store'

/**
 * useAgentOrchestrator
 *
 * Manages agent orchestration. When isRunning is true, it periodically
 * triggers the agent scheduler to auto-assign tasks and execute them.
 * When WS is connected, polling is reduced to every 60s; otherwise
 * it defaults to every 30s.
 *
 * When agents are running (isRunning=true), the scheduler ticks every
 * 10 seconds to pick up and execute tasks.
 *
 * When YOLO mode is active, the scheduler tick interval is reduced to
 * 5 seconds for faster agent response, and yoloMode is passed to the
 * scheduler API so it can auto-approve and execute tasks without
 * requiring confirmation.
 */
export function useAgentOrchestrator(options?: { pollingInterval?: number }) {
  const currentProject = useAppStore((s) => s.currentProject)
  const fetchAll = useAppStore((s) => s.fetchAll)
  const fetchAgents = useAppStore((s) => s.fetchAgents)
  const fetchTasks = useAppStore((s) => s.fetchTasks)
  const fetchMessages = useAppStore((s) => s.fetchMessages)
  const fetchFiles = useAppStore((s) => s.fetchFiles)
  const fetchActivities = useAppStore((s) => s.fetchActivities)
  const isRunning = useAppStore((s) => s.isRunning)
  const agents = useAppStore((s) => s.agents)
  const yoloMode = useAppStore((s) => s.yoloMode)

  const pollingInterval = options?.pollingInterval ?? 30000
  const schedulerTickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Check if any agents are actively working (not idle or sleeping)
  const hasActiveAgents = agents.some(
    (a) => a.status !== 'idle' && a.status !== 'sleeping'
  )

  // YOLO mode reduces tick interval from 10s to 5s for faster execution
  const tickInterval = yoloMode ? 5000 : 10000

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

  // Scheduler tick: when running, trigger the scheduler to process tasks
  const triggerSchedulerTick = useCallback(async () => {
    const projectId = currentProject?.id
    if (!projectId) return

    try {
      // Auto-assign tasks first (pass yoloMode for auto-accept behavior)
      await fetch('/api/agent-scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assign', projectId, yoloMode }),
      })

      // Then tick to execute tasks (pass yoloMode for batch execution)
      await fetch('/api/agent-scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'tick', projectId, yoloMode }),
      })

      // Refresh data after tick
      await Promise.all([
        fetchAgents(),
        fetchTasks(),
        fetchActivities(),
      ])
    } catch {
      // Silently ignore scheduler errors
    }
  }, [currentProject?.id, fetchAgents, fetchTasks, fetchActivities, yoloMode])

  // Start/stop scheduler based on isRunning state
  useEffect(() => {
    if (isRunning || hasActiveAgents) {
      // Start scheduler ticks
      if (!schedulerTickRef.current) {
        // Trigger immediately
        triggerSchedulerTick()
        // Then every tickInterval (5s YOLO, 10s normal)
        schedulerTickRef.current = setInterval(triggerSchedulerTick, tickInterval)
      }
    } else {
      // Stop scheduler
      if (schedulerTickRef.current) {
        clearInterval(schedulerTickRef.current)
        schedulerTickRef.current = null
      }
    }

    return () => {
      if (schedulerTickRef.current) {
        clearInterval(schedulerTickRef.current)
        schedulerTickRef.current = null
      }
    }
  }, [isRunning, hasActiveAgents, triggerSchedulerTick, tickInterval])
}
