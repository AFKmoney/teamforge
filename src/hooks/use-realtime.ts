'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { io, Socket } from 'socket.io-client'

export interface RealtimeEvent {
  id: string
  type: 'metric' | 'agent_status' | 'evolution' | 'safety' | 'system' | 'notification'
  payload: Record<string, unknown>
  timestamp: string
}

export function useRealtimeService() {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null)
  const listenersRef = useRef<Map<string, Set<(event: RealtimeEvent) => void>>>(new Map())

  useEffect(() => {
    const socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
      console.log('[Realtime] Connected')
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
      console.log('[Realtime] Disconnected')
    })

    socket.on('event', (event: RealtimeEvent) => {
      setLastEvent(event)
      // Notify type-specific listeners
      const typeListeners = listenersRef.current.get(event.type)
      if (typeListeners) {
        typeListeners.forEach((fn) => fn(event))
      }
      // Notify wildcard listeners
      const allListeners = listenersRef.current.get('*')
      if (allListeners) {
        allListeners.forEach((fn) => fn(event))
      }
    })

    socket.on('initial', (data: { metrics: RealtimeEvent[]; notifications: RealtimeEvent[] }) => {
      // Process initial burst
      const allEvents = [...data.metrics, ...data.notifications]
      allEvents.forEach((event) => {
        const typeListeners = listenersRef.current.get(event.type)
        if (typeListeners) typeListeners.forEach((fn) => fn(event))
        const allListeners = listenersRef.current.get('*')
        if (allListeners) allListeners.forEach((fn) => fn(event))
      })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  const addListener = useCallback((type: string, fn: (event: RealtimeEvent) => void) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, new Set())
    }
    listenersRef.current.get(type)!.add(fn)
    return () => {
      listenersRef.current.get(type)?.delete(fn)
    }
  }, [])

  return { isConnected, lastEvent, addListener }
}
