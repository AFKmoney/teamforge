'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import type { ActivityLog } from '@/lib/types'

// ---------------------------------------------------------------------------
// Simulation Event Pool
// ---------------------------------------------------------------------------

const SIMULATION_EVENTS: Omit<ActivityLog, 'id' | 'timestamp'>[] = [
  { type: 'agent', action: '', message: 'Research Agent completed analysis task', details: '', severity: 'success' },
  { type: 'evolution', action: '', message: 'New prompt optimization proposed', details: '', severity: 'info' },
  { type: 'safety', action: '', message: 'Constitutional rule check passed', details: '', severity: 'success' },
  { type: 'memory', action: '', message: 'Episodic memory stored: task completion', details: '', severity: 'info' },
  { type: 'benchmark', action: '', message: 'Reasoning benchmark score updated', details: '', severity: 'info' },
  { type: 'system', action: '', message: 'Resource utilization normal', details: '', severity: 'info' },
  { type: 'agent', action: '', message: 'Coding Agent deployed hotfix #23', details: '', severity: 'success' },
  { type: 'evolution', action: '', message: 'Architecture evolution in testing phase', details: '', severity: 'warning' },
  { type: 'safety', action: '', message: 'Sandbox test completed successfully', details: '', severity: 'success' },
  { type: 'system', action: '', message: 'Memory cleanup performed', details: '', severity: 'info' },
  { type: 'agent', action: '', message: 'Evaluation Agent running benchmark suite', details: '', severity: 'info' },
  { type: 'evolution', action: '', message: 'Workflow optimization validated', details: '', severity: 'success' },
  { type: 'memory', action: '', message: 'Semantic memory consolidated from episodes', details: '', severity: 'info' },
  { type: 'agent', action: '', message: 'Deployment Agent staged release v2.1', details: '', severity: 'success' },
  { type: 'safety', action: '', message: 'Runtime constraint verified', details: '', severity: 'success' },
  { type: 'benchmark', action: '', message: 'Code quality benchmark +1.5%', details: '', severity: 'success' },
  { type: 'evolution', action: '', message: 'Prompt chain refinement deployed', details: '', severity: 'success' },
  { type: 'system', action: '', message: 'Cache refreshed for knowledge graph', details: '', severity: 'info' },
  { type: 'agent', action: '', message: 'Safety Agent reviewed output boundary', details: '', severity: 'info' },
  { type: 'memory', action: '', message: 'Procedural memory updated: workflow #7', details: '', severity: 'info' },
]

// ---------------------------------------------------------------------------
// Helper: random integer in range [min, max]
// ---------------------------------------------------------------------------

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// ---------------------------------------------------------------------------
// Simulation State
// ---------------------------------------------------------------------------

export interface SimulationState {
  /** Current gauge values driven by simulation */
  gaugeValues: {
    cpu: number
    memory: number
    network: number
    agentLoad: number
  }
  /** Activity feed items (newest first) */
  activityItems: ActivityLog[]
  /** Sparkline data arrays */
  sparklineData: {
    agents: number[]
    memories: number[]
    evolution: number[]
    safety: number[]
  }
  /** Simulation metric deltas (for card value shifts) */
  metricDeltas: {
    activeAgentDelta: number
    memoryDelta: number
    evolutionDelta: number
    safetyDelta: number
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSimulation(enabled = true) {
  const simulationSpeed = useAppStore((s) => s.simulationSpeed)
  const simulationEnabled = useAppStore((s) => true)
  const toggleSimulation = useAppStore((s) => () => {})
  const setLastSimulationUpdate = useAppStore((s) => s.setLastSimulationUpdate)
  const dashboardData = useAppStore((s) => s.dashboardData)

  const isActive = enabled && simulationEnabled

  // Simulation state
  const [state, setState] = useState<SimulationState>(() => ({
    gaugeValues: {
      cpu: 55,
      memory: 48,
      network: 35,
      agentLoad: 60,
    },
    activityItems: [],
    sparklineData: {
      agents: [3, 4, 5, 4, 6, 5, 7, 5],
      memories: [120, 135, 128, 142, 150, 148, 155, 150],
      evolution: [1, 2, 3, 2, 4, 5, 3, 5],
      safety: [98, 95, 97, 92, 94, 96, 98, 96],
    },
    metricDeltas: {
      activeAgentDelta: 0,
      memoryDelta: 0,
      evolutionDelta: 0,
      safetyDelta: 0,
    },
  }))

  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Derive isSimulating from isActive instead of separate state
  const isSimulating = isActive

  // Refs for interval management
  const gaugeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activityTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sparklineTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const metricTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const eventIndexRef = useRef(0)

  // Update gauge values (every 5-10 seconds)
  const updateGauges = useCallback(() => {
    setState((prev) => ({
      ...prev,
      gaugeValues: {
        cpu: clamp(prev.gaugeValues.cpu + randInt(-5, 5), 5, 95),
        memory: clamp(prev.gaugeValues.memory + randInt(-3, 3), 10, 90),
        network: clamp(prev.gaugeValues.network + randInt(-8, 8), 5, 85),
        agentLoad: clamp(
          dashboardData
            ? Math.round((((dashboardData as Record<string, unknown>).activeAgentCount as number || 0 + prev.metricDeltas.activeAgentDelta) / Math.max((dashboardData as Record<string, unknown>).agentCount as number || 1, 1)) * 100) + randInt(-5, 5)
            : prev.gaugeValues.agentLoad + randInt(-3, 3),
          5,
          95
        ),
      },
    }))
  }, [dashboardData])

  // Add a new activity feed item (every 15-30 seconds)
  const addActivityItem = useCallback(() => {
    const poolIndex = eventIndexRef.current % SIMULATION_EVENTS.length
    eventIndexRef.current += 1
    const event = SIMULATION_EVENTS[poolIndex]

    const newItem: ActivityLog = { id: `sim-${Date.now()}-${poolIndex}`, type: event.type, action: '', message: event.message, details: '', timestamp: new Date().toISOString(), severity: event.severity }

    setState((prev) => ({
      ...prev,
      activityItems: [newItem, ...prev.activityItems].slice(0, 20),
    }))
  }, [])

  // Update sparkline data (every 30-60 seconds)
  const updateSparklines = useCallback(() => {
    setState((prev) => {
      const shift = (arr: number[], newVal: number) => [...arr.slice(1), newVal]
      return {
        ...prev,
        sparklineData: {
          agents: shift(prev.sparklineData.agents, clamp(prev.sparklineData.agents[prev.sparklineData.agents.length - 1] + randInt(-1, 1), 1, 20)),
          memories: shift(prev.sparklineData.memories, clamp(prev.sparklineData.memories[prev.sparklineData.memories.length - 1] + randInt(-5, 5), 50, 300)),
          evolution: shift(prev.sparklineData.evolution, clamp(prev.sparklineData.evolution[prev.sparklineData.evolution.length - 1] + randInt(-1, 1), 0, 20)),
          safety: shift(prev.sparklineData.safety, clamp(prev.sparklineData.safety[prev.sparklineData.safety.length - 1] + randInt(-3, 3), 70, 100)),
        },
      }
    })
  }, [])

  // Update metric deltas (every 60 seconds)
  const updateMetrics = useCallback(() => {
    setState((prev) => ({
      ...prev,
      metricDeltas: {
        activeAgentDelta: clamp(prev.metricDeltas.activeAgentDelta + randInt(-1, 1), -3, 3),
        memoryDelta: clamp(prev.metricDeltas.memoryDelta + randInt(-2, 2), -10, 10),
        evolutionDelta: clamp(prev.metricDeltas.evolutionDelta + randInt(-1, 1), -5, 5),
        safetyDelta: clamp(prev.metricDeltas.safetyDelta + randInt(-1, 1), -3, 3),
      },
    }))
  }, [])

  // Set up / tear down timers
  useEffect(() => {
    if (!isActive) {
      // Clear all timers
      if (gaugeTimerRef.current) clearInterval(gaugeTimerRef.current)
      if (activityTimerRef.current) clearInterval(activityTimerRef.current)
      if (sparklineTimerRef.current) clearInterval(sparklineTimerRef.current)
      if (metricTimerRef.current) clearInterval(metricTimerRef.current)
      gaugeTimerRef.current = null
      activityTimerRef.current = null
      sparklineTimerRef.current = null
      metricTimerRef.current = null
      return
    }

    const speedMultiplier = simulationSpeed
    const gaugeInterval = Math.round((randInt(5000, 10000)) / speedMultiplier)
    const activityInterval = Math.round((randInt(15000, 30000)) / speedMultiplier)
    const sparklineInterval = Math.round((randInt(30000, 60000)) / speedMultiplier)
    const metricInterval = Math.round(60000 / speedMultiplier)

    gaugeTimerRef.current = setInterval(() => {
      updateGauges()
      setLastUpdate(new Date())
      setLastSimulationUpdate(new Date().toISOString())
    }, gaugeInterval)

    activityTimerRef.current = setInterval(() => {
      addActivityItem()
      setLastUpdate(new Date())
      setLastSimulationUpdate(new Date().toISOString())
    }, activityInterval)

    sparklineTimerRef.current = setInterval(() => {
      updateSparklines()
      setLastUpdate(new Date())
      setLastSimulationUpdate(new Date().toISOString())
    }, sparklineInterval)

    metricTimerRef.current = setInterval(() => {
      updateMetrics()
      setLastUpdate(new Date())
      setLastSimulationUpdate(new Date().toISOString())
    }, metricInterval)

    return () => {
      if (gaugeTimerRef.current) clearInterval(gaugeTimerRef.current)
      if (activityTimerRef.current) clearInterval(activityTimerRef.current)
      if (sparklineTimerRef.current) clearInterval(sparklineTimerRef.current)
      if (metricTimerRef.current) clearInterval(metricTimerRef.current)
      gaugeTimerRef.current = null
      activityTimerRef.current = null
      sparklineTimerRef.current = null
      metricTimerRef.current = null
    }
  }, [isActive, simulationSpeed, updateGauges, addActivityItem, updateSparklines, updateMetrics, setLastSimulationUpdate])

  return {
    ...state,
    lastUpdate,
    isSimulating,
    simulationSpeed,
    simulationEnabled,
    toggleSimulation,
  }
}
