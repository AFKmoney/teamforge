'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAppStore } from '@/lib/store'
import type { Agent, Task, Message, BuildLog, AgentActivity, Notification } from '@/lib/types'

/**
 * useRealtimeWS
 *
 * Connects to the TeamForge WebSocket service via socket.io and
 * updates the Zustand store in real-time when events arrive.
 * Replaces the 30-second polling with instant updates.
 */
export function useRealtimeWS() {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // Zustand actions
  const updateAgent = useAppStore((s) => s.updateAgent)
  const updateTask = useAppStore((s) => s.updateTask)
  const addMessage = useAppStore((s) => s.addMessage)
  const addBuildLog = useAppStore((s) => s.addBuildLog)
  const addActivity = useAppStore((s) => s.addActivity)
  const addNotification = useAppStore((s) => s.addNotification)
  const fetchAgents = useAppStore((s) => s.fetchAgents)
  const fetchTasks = useAppStore((s) => s.fetchTasks)
  const fetchMessages = useAppStore((s) => s.fetchMessages)
  const fetchBuildLogs = useAppStore((s) => s.fetchBuildLogs)
  const fetchActivities = useAppStore((s) => s.fetchActivities)

  // Refetch all data after reconnection to ensure consistency
  const handleReconnect = useCallback(() => {
    console.log('[WS] Reconnected - refreshing all data')
    Promise.all([
      fetchAgents(),
      fetchTasks(),
      fetchMessages(),
      fetchBuildLogs(),
      fetchActivities(),
    ]).catch(() => {
      // Silently ignore refresh errors
    })
  }, [fetchAgents, fetchTasks, fetchMessages, fetchBuildLogs, fetchActivities])

  useEffect(() => {
    // Connect to the WS service
    // When accessed through the Caddy gateway (port 81), use XTransformPort query param
    // When accessed directly (localhost:3000 dev mode), connect directly to WS service
    const isDevDirect = typeof window !== 'undefined' && window.location.port === '3000'
    const socketUrl = isDevDirect ? 'http://localhost:3003' : ''
    const socketPath = isDevDirect ? undefined : '/'

    const socket = io(socketUrl, {
      path: socketPath,
      query: isDevDirect ? undefined : { XTransformPort: '3003' },
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 10000,
    })

    socketRef.current = socket

    // --- Connection events ---
    socket.on('connect', () => {
      setIsConnected(true)
      console.log('[WS] Connected to TeamForge real-time service')
    })

    socket.on('disconnect', (reason) => {
      setIsConnected(false)
      console.log(`[WS] Disconnected: ${reason}`)
    })

    socket.on('connect_error', (error) => {
      console.warn('[WS] Connection error:', error.message)
    })

    // After reconnection, refresh all data
    socket.io.on('reconnect', () => {
      handleReconnect()
    })

    // --- Application events ---

    // Agent updated
    socket.on('agent:update', (data: { id: string } & Partial<Agent>) => {
      console.log('[WS] agent:update', data.id)
      updateAgent(data.id, data)
    })

    // Task updated or created
    socket.on('task:update', (data: { id: string } & Partial<Task>) => {
      console.log('[WS] task:update', data.id)
      updateTask(data.id, data)
    })

    // New message
    socket.on('message:new', (data: Message) => {
      console.log('[WS] message:new', data.id)
      addMessage(data)
    })

    // New build log
    socket.on('build:new', (data: BuildLog) => {
      console.log('[WS] build:new', data.id)
      addBuildLog(data)
    })

    // New activity
    socket.on('activity:new', (data: AgentActivity) => {
      console.log('[WS] activity:new', data.id)
      addActivity(data)
    })

    // New notification
    socket.on('notification:new', (data: Omit<Notification, 'id' | 'read' | 'createdAt'>) => {
      console.log('[WS] notification:new', data.title)
      addNotification(data)
    })

    // Full data refresh event (e.g., after bulk operations)
    socket.on('data:refresh', () => {
      console.log('[WS] data:refresh - fetching all data')
      Promise.all([
        fetchAgents(),
        fetchTasks(),
        fetchMessages(),
      ]).catch(() => {
        // Silently ignore
      })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
      setIsConnected(false)
    }
  }, [
    updateAgent,
    updateTask,
    addMessage,
    addBuildLog,
    addActivity,
    addNotification,
    fetchAgents,
    fetchTasks,
    fetchMessages,
    fetchBuildLogs,
    fetchActivities,
    handleReconnect,
  ])

  return { isConnected }
}
