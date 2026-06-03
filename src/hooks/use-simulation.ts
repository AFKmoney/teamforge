'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import type { ActivityLog } from '@/lib/types'

// ---------------------------------------------------------------------------
// Simulation Event Pool
// ---------------------------------------------------------------------------

const SIMULATION_EVENTS: Omit<ActivityLog, 'id' | 'timestamp'>[] = [
  { type: 'agent', message: 'Research Agent completed analysis task', severity: 'success' },
  { type: 'evolution', message: 'New prompt optimization proposed', severity: 'info' },
  { type: 'safety', message: 'Constitutional rule check passed', severity: 'success' },
  { type: 'memory', message: 'Episodic memory stored: task completion', severity: 'info' },
  { type: 'benchmark', message: 'Reasoning benchmark score updated', severity: 'info' },
  { type: 'system', message: 'Resource utilization normal', severity: 'info' },
  { type: 'agent', message: 'Coding Agent deployed hotfix #23', severity: 'success' },
  { type: 'evolution', message: 'Architecture evolution in testing phase', severity: 'warning' },
  { type: 'safety', message: 'Sandbox test completed successfully', severity: 'success' },
  { type: 'system', message: 'Memory cleanup performed', severity: 'info' },
  { type: 'agent', message: 'Evaluation Agent running benchmark suite', severity: 'info' },
  { type: 'evolution', message: 'Workflow optimization validated', severity: 'success' },
  { type: 'memory', message: 'Semantic memory consolidated from episodes', severity: 'info' },
  { type: 'agent', message: 'Deployment Agent staged release v2.1', severity: 'success' },
  { type: 'safety', message: 'Runtime constraint verified', severity: 'success' },
  { type: 'benchmark', message: 'Code quality benchmark +1.5%', severity: 'success' },
  { type: 'evolution', message: 'Prompt chain refinement deployed', severity: 'success' },
  { type: 'system', message: 'Cache refreshed for knowledge graph', severity: 'info' },
  { type: 'agent', message: 'Safety Agent reviewed output boundary', severity: 'info' },
  { type: 'memory', message: 'Procedural memory updated: workflow #7', severity: 'info' },
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
  const simulationEnabled = useAppStore((s) => s.simulationEnabled)
  const toggleSimulation = useAppStore((s) => s.toggleSimulation)
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
            ? Math.round(((dashboardData.activeAgentCount + prev.metricDeltas.activeAgentDelta) / Math.max(dashboardData.agentCount, 1)) * 100) + randInt(-5, 5)
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

    const newItem: ActivityLog = {
      id: `sim-${Date.now()}-${poolIndex}`,
      type: event.type,
      message: event.message,
      timestamp: new Date().toISOString(),
      severity: event.severity,
    }

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
      setLastSimulationUpdate(new Date())
    }, gaugeInterval)

    activityTimerRef.current = setInterval(() => {
      addActivityItem()
      setLastUpdate(new Date())
      setLastSimulationUpdate(new Date())
    }, activityInterval)

    sparklineTimerRef.current = setInterval(() => {
      updateSparklines()
      setLastUpdate(new Date())
      setLastSimulationUpdate(new Date())
    }, sparklineInterval)

    metricTimerRef.current = setInterval(() => {
      updateMetrics()
      setLastUpdate(new Date())
      setLastSimulationUpdate(new Date())
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
