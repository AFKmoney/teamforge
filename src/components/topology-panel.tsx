'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Network,
  X,
  Activity,
  CircleDot,
  Zap,
  Shield,
  Database,
  Cpu,
  Brain,
  GitBranch,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  RotateCcw,
  Search,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

type NodeType =
  | 'controller'
  | 'agent'
  | 'memory'
  | 'evolution'
  | 'safety'
  | 'data'
  | 'external'

type ConnectionType = 'data' | 'control' | 'feedback'

interface TopoNode {
  id: string
  label: string
  type: NodeType
  x: number
  y: number
  radius: number
  description: string
  status: 'active' | 'inactive'
  metrics: { label: string; value: string }[]
  connections: string[]
}

interface TopoEdge {
  source: string
  target: string
  type: ConnectionType
}

// ---------------------------------------------------------------------------
// Color maps
// ---------------------------------------------------------------------------

const TYPE_COLORS: Record<NodeType, { fill: string; stroke: string; text: string; bg: string; darkText: string; darkBg: string }> = {
  controller: {
    fill: '#10b981',
    stroke: '#059669',
    text: 'text-emerald-600',
    bg: 'bg-emerald-500/10',
    darkText: 'dark:text-emerald-400',
    darkBg: 'dark:bg-emerald-500/20',
  },
  agent: {
    fill: '#8b5cf6',
    stroke: '#7c3aed',
    text: 'text-purple-600',
    bg: 'bg-purple-500/10',
    darkText: 'dark:text-purple-400',
    darkBg: 'dark:bg-purple-500/20',
  },
  memory: {
    fill: '#06b6d4',
    stroke: '#0891b2',
    text: 'text-cyan-600',
    bg: 'bg-cyan-500/10',
    darkText: 'dark:text-cyan-400',
    darkBg: 'dark:bg-cyan-500/20',
  },
  evolution: {
    fill: '#f59e0b',
    stroke: '#d97706',
    text: 'text-amber-600',
    bg: 'bg-amber-500/10',
    darkText: 'dark:text-amber-400',
    darkBg: 'dark:bg-amber-500/20',
  },
  safety: {
    fill: '#ef4444',
    stroke: '#dc2626',
    text: 'text-red-600',
    bg: 'bg-red-500/10',
    darkText: 'dark:text-red-400',
    darkBg: 'dark:bg-red-500/20',
  },
  data: {
    fill: '#64748b',
    stroke: '#475569',
    text: 'text-foreground',
    bg: 'bg-muted/50',
    darkText: 'dark:text-muted-foreground',
    darkBg: 'dark:bg-muted/30',
  },
  external: {
    fill: '#14b8a6',
    stroke: '#0d9488',
    text: 'text-teal-600',
    bg: 'bg-teal-500/10',
    darkText: 'dark:text-teal-400',
    darkBg: 'dark:bg-teal-500/20',
  },
}

const CONNECTION_COLORS: Record<ConnectionType, string> = {
  data: '#06b6d4',
  control: '#8b5cf6',
  feedback: '#f59e0b',
}

const CONNECTION_LABELS: Record<ConnectionType, string> = {
  data: 'Data Flow',
  control: 'Control Flow',
  feedback: 'Feedback',
}

// ---------------------------------------------------------------------------
// SVG viewBox constants
// ---------------------------------------------------------------------------

const VIEWBOX_W = 1300
const VIEWBOX_H = 850
const MIN_ZOOM = 0.5
const MAX_ZOOM = 3
const ZOOM_STEP = 0.2

// ---------------------------------------------------------------------------
// Topology data
// ---------------------------------------------------------------------------

const NODES: TopoNode[] = [
  // === Executive Controller (center) ===
  {
    id: 'controller',
    label: 'Executive Controller',
    type: 'controller',
    x: 650,
    y: 390,
    radius: 44,
    description: 'The central brain of the Self-Evolving AI System. Orchestrates all agents, manages system-wide decisions, and coordinates the evolution cycle.',
    status: 'active',
    metrics: [
      { label: 'Uptime', value: '99.97%' },
      { label: 'Decisions/min', value: '142' },
      { label: 'Active Tasks', value: '23' },
      { label: 'Agent Coordination', value: '7/7' },
    ],
    connections: ['agent-research', 'agent-coding', 'agent-evaluation', 'agent-memory', 'agent-evolution', 'agent-safety', 'agent-deployment', 'ext-llm', 'ext-vllm', 'ext-ollama'],
  },
  // === 7 Agent Nodes ===
  {
    id: 'agent-research',
    label: 'Research',
    type: 'agent',
    x: 430,
    y: 250,
    radius: 28,
    description: 'Autonomous research agent that explores new techniques, gathers information from external sources, and proposes novel approaches for system improvement.',
    status: 'active',
    metrics: [
      { label: 'Tasks Completed', value: '847' },
      { label: 'Success Rate', value: '94.2%' },
      { label: 'Avg Response', value: '2.3s' },
    ],
    connections: ['controller', 'ext-llm', 'data-knowledge'],
  },
  {
    id: 'agent-coding',
    label: 'Coding',
    type: 'agent',
    x: 650,
    y: 210,
    radius: 28,
    description: 'Code generation and modification agent. Implements changes proposed by the evolution engine, writes tests, and maintains the codebase.',
    status: 'active',
    metrics: [
      { label: 'Tasks Completed', value: '1,203' },
      { label: 'Success Rate', value: '91.7%' },
      { label: 'Lines Changed', value: '48.2K' },
    ],
    connections: ['controller', 'evo-implement', 'safety-sandbox'],
  },
  {
    id: 'agent-evaluation',
    label: 'Evaluation',
    type: 'agent',
    x: 870,
    y: 250,
    radius: 28,
    description: 'Evaluates proposed changes and system performance. Runs benchmarks, analyzes results, and provides feedback on improvement quality.',
    status: 'active',
    metrics: [
      { label: 'Tasks Completed', value: '634' },
      { label: 'Success Rate', value: '96.8%' },
      { label: 'Benchmarks Run', value: '2,451' },
    ],
    connections: ['controller', 'evo-evaluate', 'data-metrics'],
  },
  {
    id: 'agent-memory',
    label: 'Memory',
    type: 'agent',
    x: 390,
    y: 490,
    radius: 28,
    description: 'Manages all memory subsystems. Stores and retrieves episodic, semantic, procedural, and working memories for the system.',
    status: 'active',
    metrics: [
      { label: 'Tasks Completed', value: '1,892' },
      { label: 'Success Rate', value: '98.1%' },
      { label: 'Retrievals/min', value: '340' },
    ],
    connections: ['controller', 'mem-working', 'mem-episodic', 'mem-semantic', 'mem-procedural', 'mem-evolution', 'data-sqlite'],
  },
  {
    id: 'agent-evolution',
    label: 'Evolution',
    type: 'agent',
    x: 910,
    y: 490,
    radius: 28,
    description: 'Drives the self-improvement cycle. Observes system behavior, forms hypotheses, and proposes changes through the evolution engine.',
    status: 'active',
    metrics: [
      { label: 'Tasks Completed', value: '423' },
      { label: 'Success Rate', value: '87.3%' },
      { label: 'Improvements', value: '156' },
    ],
    connections: ['controller', 'evo-observe', 'evo-analyze', 'evo-hypothesize'],
  },
  {
    id: 'agent-safety',
    label: 'Safety',
    type: 'agent',
    x: 480,
    y: 590,
    radius: 28,
    description: 'Ensures all system changes comply with constitutional rules. Validates proposals through the safety pipeline before deployment.',
    status: 'active',
    metrics: [
      { label: 'Tasks Completed', value: '567' },
      { label: 'Success Rate', value: '99.4%' },
      { label: 'Violations Caught', value: '89' },
    ],
    connections: ['controller', 'safety-rules', 'safety-validation', 'safety-sandbox'],
  },
  {
    id: 'agent-deployment',
    label: 'Deployment',
    type: 'agent',
    x: 820,
    y: 590,
    radius: 28,
    description: 'Handles the deployment of validated changes to production. Manages rollouts, monitors for issues, and can trigger rollbacks.',
    status: 'active',
    metrics: [
      { label: 'Tasks Completed', value: '312' },
      { label: 'Success Rate', value: '97.8%' },
      { label: 'Deployments', value: '142' },
    ],
    connections: ['controller', 'evo-deploy', 'safety-validation'],
  },
  // === External APIs (top) ===
  {
    id: 'ext-llm',
    label: 'LLM Providers',
    type: 'external',
    x: 500,
    y: 65,
    radius: 24,
    description: 'External Large Language Model providers (OpenAI, Anthropic, etc.). Provide reasoning capabilities for the system.',
    status: 'active',
    metrics: [
      { label: 'API Calls/min', value: '89' },
      { label: 'Avg Latency', value: '1.2s' },
      { label: 'Tokens Used', value: '2.4M' },
    ],
    connections: ['controller', 'agent-research'],
  },
  {
    id: 'ext-vllm',
    label: 'vLLM',
    type: 'external',
    x: 650,
    y: 45,
    radius: 24,
    description: 'High-performance local LLM inference server. Provides fast, batched inference for system operations.',
    status: 'active',
    metrics: [
      { label: 'Throughput', value: '1,240 tok/s' },
      { label: 'Queue Depth', value: '3' },
      { label: 'GPU Util', value: '78%' },
    ],
    connections: ['controller'],
  },
  {
    id: 'ext-ollama',
    label: 'Ollama',
    type: 'external',
    x: 800,
    y: 65,
    radius: 24,
    description: 'Local model runtime for running open-source LLMs. Provides fallback and specialized model access.',
    status: 'active',
    metrics: [
      { label: 'Models Loaded', value: '4' },
      { label: 'Avg Latency', value: '0.8s' },
      { label: 'Memory Usage', value: '12.3 GB' },
    ],
    connections: ['controller'],
  },
  // === Memory System (left) ===
  {
    id: 'mem-working',
    label: 'Working Memory',
    type: 'memory',
    x: 110,
    y: 280,
    radius: 22,
    description: 'Short-term memory for active task context. Holds current conversation, intermediate results, and active reasoning chains.',
    status: 'active',
    metrics: [
      { label: 'Capacity', value: '128 KB' },
      { label: 'Usage', value: '67%' },
      { label: 'Items', value: '342' },
    ],
    connections: ['agent-memory'],
  },
  {
    id: 'mem-episodic',
    label: 'Episodic Memory',
    type: 'memory',
    x: 85,
    y: 370,
    radius: 22,
    description: 'Stores sequences of events and experiences. Enables learning from past interactions and tracking system history.',
    status: 'active',
    metrics: [
      { label: 'Episodes', value: '12,847' },
      { label: 'Size', value: '2.3 GB' },
      { label: 'Recall Accuracy', value: '94.1%' },
    ],
    connections: ['agent-memory'],
  },
  {
    id: 'mem-semantic',
    label: 'Semantic Memory',
    type: 'memory',
    x: 85,
    y: 460,
    radius: 22,
    description: 'Stores factual knowledge and concepts. Provides structured understanding of the domain and general knowledge.',
    status: 'active',
    metrics: [
      { label: 'Concepts', value: '45,231' },
      { label: 'Size', value: '4.1 GB' },
      { label: 'Query Speed', value: '<5ms' },
    ],
    connections: ['agent-memory'],
  },
  {
    id: 'mem-procedural',
    label: 'Procedural Memory',
    type: 'memory',
    x: 110,
    y: 550,
    radius: 22,
    description: 'Stores learned procedures and skills. Contains optimized workflows, code patterns, and automated responses.',
    status: 'active',
    metrics: [
      { label: 'Procedures', value: '1,247' },
      { label: 'Size', value: '890 MB' },
      { label: 'Hit Rate', value: '87.3%' },
    ],
    connections: ['agent-memory'],
  },
  {
    id: 'mem-evolution',
    label: 'Evolution Memory',
    type: 'memory',
    x: 145,
    y: 640,
    radius: 22,
    description: 'Records all evolution events, outcomes, and learned improvements. Tracks the system\'s self-improvement history.',
    status: 'active',
    metrics: [
      { label: 'Events Recorded', value: '3,456' },
      { label: 'Size', value: '1.2 GB' },
      { label: 'Successful', value: '72.4%' },
    ],
    connections: ['agent-memory', 'agent-evolution'],
  },
  // === Evolution Engine (right) ===
  {
    id: 'evo-observe',
    label: 'Observe',
    type: 'evolution',
    x: 1160,
    y: 260,
    radius: 22,
    description: 'First phase: Monitors system performance metrics, user interactions, and environmental changes to identify improvement opportunities.',
    status: 'active',
    metrics: [
      { label: 'Metrics Tracked', value: '234' },
      { label: 'Anomalies Detected', value: '12' },
    ],
    connections: ['agent-evolution', 'evo-analyze'],
  },
  {
    id: 'evo-analyze',
    label: 'Analyze',
    type: 'evolution',
    x: 1220,
    y: 350,
    radius: 22,
    description: 'Second phase: Deep analysis of observations. Identifies root causes, patterns, and potential areas for optimization.',
    status: 'active',
    metrics: [
      { label: 'Patterns Found', value: '89' },
      { label: 'Root Causes', value: '34' },
    ],
    connections: ['evo-observe', 'evo-hypothesize'],
  },
  {
    id: 'evo-hypothesize',
    label: 'Hypothesize',
    type: 'evolution',
    x: 1220,
    y: 440,
    radius: 22,
    description: 'Third phase: Forms testable hypotheses about potential improvements. Generates multiple candidate solutions.',
    status: 'active',
    metrics: [
      { label: 'Hypotheses Active', value: '7' },
      { label: 'Avg Confidence', value: '0.82' },
    ],
    connections: ['evo-analyze', 'evo-implement'],
  },
  {
    id: 'evo-implement',
    label: 'Implement',
    type: 'evolution',
    x: 1160,
    y: 530,
    radius: 22,
    description: 'Fourth phase: Implements proposed changes in a sandboxed environment. Creates code modifications and configuration updates.',
    status: 'active',
    metrics: [
      { label: 'Changes Pending', value: '3' },
      { label: 'Code Modified', value: '48.2K lines' },
    ],
    connections: ['evo-hypothesize', 'agent-coding', 'evo-evaluate'],
  },
  {
    id: 'evo-evaluate',
    label: 'Evaluate',
    type: 'evolution',
    x: 1080,
    y: 610,
    radius: 22,
    description: 'Fifth phase: Rigorously tests implemented changes against benchmarks and safety criteria. Determines if the change is beneficial.',
    status: 'active',
    metrics: [
      { label: 'Tests Running', value: '4' },
      { label: 'Pass Rate', value: '89.2%' },
    ],
    connections: ['evo-implement', 'agent-evaluation', 'evo-deploy'],
  },
  {
    id: 'evo-deploy',
    label: 'Deploy',
    type: 'evolution',
    x: 970,
    y: 670,
    radius: 22,
    description: 'Sixth phase: Deploys validated changes to production. Monitors for regressions and triggers rollback if needed.',
    status: 'active',
    metrics: [
      { label: 'Deployments', value: '142' },
      { label: 'Rollbacks', value: '3' },
    ],
    connections: ['evo-evaluate', 'agent-deployment', 'evo-observe'],
  },
  // === Safety Layer (bottom) ===
  {
    id: 'safety-rules',
    label: 'Constitutional Rules',
    type: 'safety',
    x: 430,
    y: 740,
    radius: 24,
    description: 'Core safety rules that govern system behavior. All changes must pass constitutional validation before deployment.',
    status: 'active',
    metrics: [
      { label: 'Active Rules', value: '6' },
      { label: 'Violations Blocked', value: '89' },
    ],
    connections: ['agent-safety', 'safety-validation'],
  },
  {
    id: 'safety-validation',
    label: 'Validation Pipeline',
    type: 'safety',
    x: 650,
    y: 770,
    radius: 24,
    description: 'Multi-stage validation pipeline that verifies changes against safety rules, runs tests, and ensures compliance before deployment.',
    status: 'active',
    metrics: [
      { label: 'Validations Run', value: '1,247' },
      { label: 'Approval Rate', value: '87.3%' },
    ],
    connections: ['safety-rules', 'safety-sandbox', 'agent-deployment'],
  },
  {
    id: 'safety-sandbox',
    label: 'Sandbox',
    type: 'safety',
    x: 870,
    y: 740,
    radius: 24,
    description: 'Isolated execution environment for testing proposed changes. Prevents unvalidated modifications from affecting production.',
    status: 'active',
    metrics: [
      { label: 'Active Sandboxes', value: '2' },
      { label: 'Tests Executed', value: '5,672' },
    ],
    connections: ['safety-validation', 'agent-coding'],
  },
  // === Data Stores (bottom-left) ===
  {
    id: 'data-sqlite',
    label: 'SQLite',
    type: 'data',
    x: 180,
    y: 730,
    radius: 22,
    description: 'Primary relational database for persistent storage. Stores agents, evolution events, benchmarks, and system metrics.',
    status: 'active',
    metrics: [
      { label: 'Size', value: '847 MB' },
      { label: 'Tables', value: '11' },
      { label: 'Queries/min', value: '1,240' },
    ],
    connections: ['agent-memory', 'data-knowledge'],
  },
  {
    id: 'data-knowledge',
    label: 'Knowledge Graph',
    type: 'data',
    x: 300,
    y: 790,
    radius: 22,
    description: 'Graph-structured knowledge base. Stores concepts, skills, patterns, tools, and strategies with typed relationships.',
    status: 'active',
    metrics: [
      { label: 'Nodes', value: '8' },
      { label: 'Edges', value: '10' },
      { label: 'Query Time', value: '<3ms' },
    ],
    connections: ['data-sqlite', 'agent-research'],
  },
  {
    id: 'data-metrics',
    label: 'Metrics Store',
    type: 'data',
    x: 170,
    y: 810,
    radius: 22,
    description: 'Time-series metrics storage. Tracks system performance, resource usage, and operational health indicators.',
    status: 'active',
    metrics: [
      { label: 'Data Points', value: '144K' },
      { label: 'Retention', value: '90 days' },
      { label: 'Write Rate', value: '50/s' },
    ],
    connections: ['data-sqlite', 'agent-evaluation'],
  },
]

const EDGES: TopoEdge[] = [
  // Controller ↔ Agents (control flow)
  { source: 'controller', target: 'agent-research', type: 'control' },
  { source: 'controller', target: 'agent-coding', type: 'control' },
  { source: 'controller', target: 'agent-evaluation', type: 'control' },
  { source: 'controller', target: 'agent-memory', type: 'control' },
  { source: 'controller', target: 'agent-evolution', type: 'control' },
  { source: 'controller', target: 'agent-safety', type: 'control' },
  { source: 'controller', target: 'agent-deployment', type: 'control' },
  // Controller ↔ External (data flow)
  { source: 'controller', target: 'ext-llm', type: 'data' },
  { source: 'controller', target: 'ext-vllm', type: 'data' },
  { source: 'controller', target: 'ext-ollama', type: 'data' },
  // Agents ↔ Subsystems (data flow)
  { source: 'agent-research', target: 'ext-llm', type: 'data' },
  { source: 'agent-research', target: 'data-knowledge', type: 'data' },
  { source: 'agent-coding', target: 'evo-implement', type: 'data' },
  { source: 'agent-coding', target: 'safety-sandbox', type: 'data' },
  { source: 'agent-evaluation', target: 'evo-evaluate', type: 'data' },
  { source: 'agent-evaluation', target: 'data-metrics', type: 'data' },
  { source: 'agent-memory', target: 'mem-working', type: 'data' },
  { source: 'agent-memory', target: 'mem-episodic', type: 'data' },
  { source: 'agent-memory', target: 'mem-semantic', type: 'data' },
  { source: 'agent-memory', target: 'mem-procedural', type: 'data' },
  { source: 'agent-memory', target: 'mem-evolution', type: 'data' },
  { source: 'agent-memory', target: 'data-sqlite', type: 'data' },
  { source: 'agent-evolution', target: 'evo-observe', type: 'data' },
  { source: 'agent-evolution', target: 'mem-evolution', type: 'data' },
  { source: 'agent-safety', target: 'safety-rules', type: 'control' },
  { source: 'agent-safety', target: 'safety-validation', type: 'control' },
  { source: 'agent-safety', target: 'safety-sandbox', type: 'control' },
  { source: 'agent-deployment', target: 'evo-deploy', type: 'data' },
  { source: 'agent-deployment', target: 'safety-validation', type: 'data' },
  // Evolution Engine cycle (feedback)
  { source: 'evo-observe', target: 'evo-analyze', type: 'feedback' },
  { source: 'evo-analyze', target: 'evo-hypothesize', type: 'feedback' },
  { source: 'evo-hypothesize', target: 'evo-implement', type: 'feedback' },
  { source: 'evo-implement', target: 'evo-evaluate', type: 'feedback' },
  { source: 'evo-evaluate', target: 'evo-deploy', type: 'feedback' },
  { source: 'evo-deploy', target: 'evo-observe', type: 'feedback' },
  // Safety internal
  { source: 'safety-rules', target: 'safety-validation', type: 'control' },
  { source: 'safety-validation', target: 'safety-sandbox', type: 'control' },
  // Data store connections
  { source: 'data-sqlite', target: 'data-knowledge', type: 'data' },
  { source: 'data-sqlite', target: 'data-metrics', type: 'data' },
]

// ---------------------------------------------------------------------------
// Helper: get node by id
// ---------------------------------------------------------------------------

const nodeMap = new Map(NODES.map((n) => [n.id, n]))

// ---------------------------------------------------------------------------
// ALL_NODE_TYPES for filtering
// ---------------------------------------------------------------------------

const ALL_NODE_TYPES: NodeType[] = ['controller', 'agent', 'memory', 'evolution', 'safety', 'data', 'external']

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TopologyPanel() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isAnimating, setIsAnimating] = useState(false)
  const svgContainerRef = useRef<HTMLDivElement>(null)
  const isPanningRef = useRef(false)
  const panStartRef = useRef({ x: 0, y: 0 })
  const panOriginRef = useRef({ x: 0, y: 0 })

  // Node type filtering
  const [activeTypes, setActiveTypes] = useState<Set<NodeType>>(
    () => new Set(ALL_NODE_TYPES)
  )

  // Search
  const [searchQuery, setSearchQuery] = useState('')

  const selectedNode = useMemo(
    () => (selectedNodeId ? nodeMap.get(selectedNodeId) ?? null : null),
    [selectedNodeId]
  )

  // Compute highlighted node ids (connected to hovered)
  const highlightedNodeIds = useMemo(() => {
    if (!hoveredNodeId) return new Set<string>()
    const ids = new Set<string>([hoveredNodeId])
    for (const e of EDGES) {
      if (e.source === hoveredNodeId) ids.add(e.target)
      if (e.target === hoveredNodeId) ids.add(e.source)
    }
    return ids
  }, [hoveredNodeId])

  // Compute edges connected to selected node
  const selectedNodeEdges = useMemo(() => {
    if (!selectedNodeId) return []
    return EDGES.filter(
      (e) => e.source === selectedNodeId || e.target === selectedNodeId
    )
  }, [selectedNodeId])

  // Connected node labels for detail panel
  const connectedNodes = useMemo(() => {
    if (!selectedNode) return []
    const ids = new Set<string>()
    for (const e of EDGES) {
      if (e.source === selectedNode.id) ids.add(e.target)
      if (e.target === selectedNode.id) ids.add(e.source)
    }
    return Array.from(ids)
      .map((id) => nodeMap.get(id))
      .filter(Boolean) as TopoNode[]
  }, [selectedNode])

  // Search matching
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>()
    const q = searchQuery.toLowerCase().trim()
    return new Set(
      NODES.filter(
        (n) =>
          n.label.toLowerCase().includes(q) ||
          n.id.toLowerCase().includes(q) ||
          n.type.toLowerCase().includes(q)
      ).map((n) => n.id)
    )
  }, [searchQuery])

  const hasSearch = searchQuery.trim().length > 0

  // Count nodes by type
  const typeCounts = useMemo(() => {
    const counts: Partial<Record<NodeType, number>> = {}
    for (const n of NODES) {
      counts[n.type] = (counts[n.type] ?? 0) + 1
    }
    return counts
  }, [])

  // Label collision detection and positioning
  const labelPositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number; above: boolean; fontSize: number }> = {}
    const occupied: { x: number; y: number; w: number; h: number }[] = []

    // Determine initial positions
    const initialPositions = NODES.map((node) => {
      const isController = node.type === 'controller'
      const fontSize = isController ? 13 : 11
      // Controller always above; near top → below; near bottom → above
      let above: boolean
      if (isController) {
        above = true
      } else if (node.y < VIEWBOX_H * 0.35) {
        above = false // near top, label below
      } else if (node.y > VIEWBOX_H * 0.65) {
        above = true // near bottom, label above
      } else {
        above = false // middle, label below (default)
      }

      const labelY = above
        ? node.y - node.radius - 8
        : node.y + node.radius + fontSize + 4

      return { id: node.id, x: node.x, y: labelY, above, fontSize, w: 100, h: fontSize + 4 }
    })

    // Simple collision detection: if two labels overlap vertically, offset one
    for (const pos of initialPositions) {
      let finalY = pos.y
      let collisionCount = 0
      for (const occ of occupied) {
        const overlapsX = Math.abs(pos.x - occ.x) < (pos.w + occ.w) / 2
        const overlapsY = Math.abs(finalY - occ.y) < (pos.h + occ.h) / 2
        if (overlapsX && overlapsY) {
          collisionCount++
          finalY += pos.above ? -(pos.h + 2) : (pos.h + 2)
        }
      }
      occupied.push({ x: pos.x, y: finalY, w: pos.w, h: pos.h })
      positions[pos.id] = { x: pos.x, y: finalY, above: pos.above, fontSize: pos.fontSize }
    }

    return positions
  }, [])

  const handleNodeClick = useCallback(
    (id: string) => {
      setSelectedNodeId((prev) => (prev === id ? null : id))
    },
    []
  )

  // ---- Zoom helpers ----
  const clampZoom = useCallback((z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z)), [])

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => clampZoom(prev + ZOOM_STEP))
  }, [clampZoom])

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => clampZoom(prev - ZOOM_STEP))
  }, [clampZoom])

  const handleResetView = useCallback(() => {
    setIsAnimating(true)
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setTimeout(() => setIsAnimating(false), 350)
  }, [])

  const handleFitToScreen = useCallback(() => {
    if (!svgContainerRef.current) return
    setIsAnimating(true)
    const container = svgContainerRef.current
    const containerW = container.clientWidth
    const containerH = container.clientHeight
    const scaleX = containerW / VIEWBOX_W
    const scaleY = containerH / VIEWBOX_H
    const fitScale = Math.min(scaleX, scaleY) * 0.9
    const newZoom = clampZoom(fitScale)
    setZoom(newZoom)
    setPan({ x: 0, y: 0 })
    setTimeout(() => setIsAnimating(false), 350)
  }, [clampZoom])

  // Mouse wheel zoom (Ctrl+scroll)
  useEffect(() => {
    const container = svgContainerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const delta = e.deltaY > 0 ? -ZOOM_STEP * 0.5 : ZOOM_STEP * 0.5
      setZoom((prev) => clampZoom(prev + delta))
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [clampZoom])

  // Panning cursor state
  const [isPanning, setIsPanning] = useState(false)

  // Pan with mouse drag
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return
      const target = e.target as SVGElement
      if (target.closest('.topo-node-group')) return
      isPanningRef.current = true
      setIsPanning(true)
      panStartRef.current = { x: e.clientX, y: e.clientY }
      panOriginRef.current = { ...pan }
    },
    [pan]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanningRef.current) return
      const dx = (e.clientX - panStartRef.current.x) / zoom
      const dy = (e.clientY - panStartRef.current.y) / zoom
      setPan({
        x: panOriginRef.current.x + dx,
        y: panOriginRef.current.y + dy,
      })
    },
    [zoom]
  )

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false
    setIsPanning(false)
  }, [])

  // Minimap click handler
  const minimapRef = useRef<SVGSVGElement>(null)

  const handleMinimapClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!minimapRef.current) return
      const rect = minimapRef.current.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const clickY = e.clientY - rect.top
      // Map minimap coords to viewBox coords
      const minimapScaleX = 150 / VIEWBOX_W
      const minimapScaleY = 100 / VIEWBOX_H
      const viewBoxX = clickX / minimapScaleX
      const viewBoxY = clickY / minimapScaleY
      // Center the view on this point
      setIsAnimating(true)
      setPan({
        x: VIEWBOX_W / 2 - viewBoxX,
        y: VIEWBOX_H / 2 - viewBoxY,
      })
      setTimeout(() => setIsAnimating(false), 350)
    },
    []
  )

  // Filter toggle helpers
  const toggleType = useCallback((type: NodeType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }, [])

  const selectAllTypes = useCallback(() => {
    setActiveTypes(new Set(ALL_NODE_TYPES))
  }, [])

  const selectNoTypes = useCallback(() => {
    setActiveTypes(new Set())
  }, [])

  const healthColor = (status: string) =>
    status === 'active' ? '#10b981' : '#f59e0b'

  // Compute the SVG transform string
  const svgTransform = `translate(${VIEWBOX_W / 2 + pan.x}, ${VIEWBOX_H / 2 + pan.y}) scale(${zoom}) translate(${-VIEWBOX_W / 2}, ${-VIEWBOX_H / 2})`

  // Compute minimap viewport rectangle
  const minimapScaleX = 150 / VIEWBOX_W
  const minimapScaleY = 100 / VIEWBOX_H

  const viewportRect = useMemo(() => {
    // The visible area in viewBox coordinates
    const visW = VIEWBOX_W / zoom
    const visH = VIEWBOX_H / zoom
    const cx = VIEWBOX_W / 2 - pan.x
    const cy = VIEWBOX_H / 2 - pan.y
    const x = cx - visW / 2
    const y = cy - visH / 2
    return {
      x: x * minimapScaleX,
      y: y * minimapScaleY,
      w: visW * minimapScaleX,
      h: visH * minimapScaleY,
    }
  }, [zoom, pan, minimapScaleX, minimapScaleY])

  // Check if a node is filtered out
  const isNodeFiltered = useCallback(
    (node: TopoNode) => !activeTypes.has(node.type),
    [activeTypes]
  )

  // Check if a node is search-dimmed
  const isSearchDimmed = useCallback(
    (node: TopoNode) => hasSearch && !searchMatches.has(node.id),
    [hasSearch, searchMatches]
  )

  const zoomPercent = Math.round(zoom * 100)

  return (
    <div className="space-y-3 overflow-x-hidden">
      {/* Header */}
      <PageHeader
        icon={Network}
        iconColor="gradient"
        title="System Topology"
        description={`${NODES.length} nodes \u00b7 ${EDGES.length} edges`}
        actions={
          <Badge variant="outline" className="text-xs gap-1">
            <span className="relative flex size-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-1.5 bg-emerald-500" />
            </span>
            All Systems Active
          </Badge>
        }
      />

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search nodes by name, ID, or type..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-9 text-sm bg-card border-border"
        />
        {hasSearch && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
              {searchMatches.size} node{searchMatches.size !== 1 ? 's' : ''} found
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 min-h-[44px] min-w-[44px]"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Node Type Filter Bar */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[11px] px-2"
          onClick={selectAllTypes}
        >
          All
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[11px] px-2"
          onClick={selectNoTypes}
        >
          None
        </Button>
        <Separator orientation="vertical" className="h-5 mx-1" />
        {ALL_NODE_TYPES.map((type) => {
          const isActive = activeTypes.has(type)
          const colors = TYPE_COLORS[type]
          return (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all duration-200 border',
                isActive
                  ? 'bg-card border-border text-foreground shadow-sm'
                  : 'bg-transparent border-border/30 text-muted-foreground/50 opacity-60'
              )}
            >
              <span
                className={cn(
                  'inline-block h-2.5 w-2.5 rounded-full transition-opacity duration-200',
                  !isActive && 'opacity-30'
                )}
                style={{ backgroundColor: colors.fill }}
              />
              <span className="capitalize">{type}</span>
              <span className="text-muted-foreground text-[9px]">({typeCounts[type] ?? 0})</span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* SVG Diagram */}
        <Card className="flex-1 overflow-hidden">
          <CardContent className="p-0 relative">
            <div
              ref={svgContainerRef}
              className="relative overflow-hidden"
              style={{ height: 280, minHeight: 220 }}
            >
              <svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
                className="select-none bg-muted/30 dark:bg-muted/20 max-h-[280px] md:max-h-[380px]"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
              >
                <defs>
                  <style>{`
                    @keyframes dash-flow {
                      to { stroke-dashoffset: -24; }
                    }
                    .edge-flowing {
                      animation: dash-flow 1.2s linear infinite;
                    }
                  `}</style>
                  <filter id="topo-glow-selected" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <filter id="topo-glow-hover" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <filter id="topo-pulse" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="8" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  {/* Search highlight glow */}
                  <filter id="topo-search-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  {/* Arrow markers for each connection type */}
                  {(['data', 'control', 'feedback'] as ConnectionType[]).map((ct) => (
                    <marker
                      key={ct}
                      id={`arrow-${ct}`}
                      viewBox="0 0 10 6"
                      refX="10"
                      refY="3"
                      markerWidth="8"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 0 L 10 3 L 0 6 z" fill={CONNECTION_COLORS[ct]} opacity="0.7" />
                    </marker>
                  ))}
                </defs>

                {/* Transform group for zoom/pan */}
                <g
                  transform={svgTransform}
                  style={{
                    transition: isAnimating ? 'transform 0.3s ease-out' : undefined,
                  }}
                >
                  {/* Edges */}
                  {EDGES.map((edge, i) => {
                    const source = nodeMap.get(edge.source)
                    const target = nodeMap.get(edge.target)
                    if (!source || !target) return null

                    const isHighlighted =
                      hoveredNodeId === edge.source || hoveredNodeId === edge.target
                    const isSelected =
                      selectedNodeId === edge.source || selectedNodeId === edge.target

                    // Dim edges if either end is filtered out
                    const sourceFiltered = isNodeFiltered(source)
                    const targetFiltered = isNodeFiltered(target)
                    const edgeFiltered = sourceFiltered || targetFiltered

                    // Dim edges if search active and neither end matches
                    const edgeSearchDimmed = hasSearch && !searchMatches.has(edge.source) && !searchMatches.has(edge.target)

                    const dimmed = (hoveredNodeId && !isHighlighted) || edgeFiltered || edgeSearchDimmed

                    // Shorten line to not overlap nodes
                    const dx = target.x - source.x
                    const dy = target.y - source.y
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1
                    const ux = dx / dist
                    const uy = dy / dist
                    const x1 = source.x + ux * (source.radius + 4)
                    const y1 = source.y + uy * (source.radius + 4)
                    const x2 = target.x - ux * (target.radius + 8)
                    const y2 = target.y - uy * (target.radius + 8)

                    const dashPattern =
                      edge.type === 'feedback'
                        ? '8 4'
                        : edge.type === 'control'
                          ? '4 4'
                          : 'none'

                    return (
                      <g key={`edge-${i}`}>
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={CONNECTION_COLORS[edge.type]}
                          strokeWidth={isHighlighted || isSelected ? 2 : 1.2}
                          opacity={dimmed ? 0.08 : isHighlighted || isSelected ? 0.8 : 0.35}
                          strokeDasharray={dashPattern}
                          markerEnd={`url(#arrow-${edge.type})`}
                          className={cn(
                            'transition-all duration-300',
                            (isHighlighted || isSelected) && 'edge-flowing'
                          )}
                        />
                        {(isHighlighted || isSelected) && !edgeFiltered && (
                          <line
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke={CONNECTION_COLORS[edge.type]}
                            strokeWidth={3}
                            opacity={0.5}
                            strokeDasharray="2 20"
                            strokeDashoffset="0"
                            className="edge-flowing"
                          />
                        )}
                      </g>
                    )
                  })}

                  {/* Nodes */}
                  {NODES.map((node) => {
                    const isSelected = selectedNodeId === node.id
                    const isHovered = hoveredNodeId === node.id
                    const isConnected = !hoveredNodeId || highlightedNodeIds.has(node.id)
                    const hoverDimmed = hoveredNodeId && !isConnected
                    const filtered = isNodeFiltered(node)
                    const searchDimmed = isSearchDimmed(node)
                    const dimmed = hoverDimmed || filtered || searchDimmed
                    const colors = TYPE_COLORS[node.type]
                    const isSearchMatch = hasSearch && searchMatches.has(node.id)
                    const labelPos = labelPositions[node.id]

                    return (
                      <g
                        key={node.id}
                        className={cn('topo-node-group', !filtered && 'cursor-pointer')}
                        onClick={() => {
                          if (!filtered) handleNodeClick(node.id)
                        }}
                        onMouseEnter={() => {
                          if (!filtered) setHoveredNodeId(node.id)
                        }}
                        onMouseLeave={() => setHoveredNodeId(null)}
                        style={{ opacity: filtered ? 0.08 : dimmed ? 0.25 : 1, transition: 'opacity 0.2s' }}
                      >
                        {/* Pulse ring for active nodes */}
                        {node.status === 'active' && !dimmed && !filtered && (
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={node.radius + 8}
                            fill="none"
                            stroke={colors.fill}
                            strokeWidth={1.5}
                            opacity={0.15}
                          >
                            <animate
                              attributeName="r"
                              values={`${node.radius + 6};${node.radius + 14};${node.radius + 6}`}
                              dur="3s"
                              repeatCount="indefinite"
                            />
                            <animate
                              attributeName="opacity"
                              values="0.2;0.05;0.2"
                              dur="3s"
                              repeatCount="indefinite"
                            />
                          </circle>
                        )}

                        {/* Selected glow ring */}
                        {isSelected && !filtered && (
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={node.radius + 12}
                            fill="none"
                            stroke={colors.fill}
                            strokeWidth={2.5}
                            opacity={0.25}
                            filter="url(#topo-glow-selected)"
                          />
                        )}

                        {/* Hover glow ring */}
                        {isHovered && !isSelected && !filtered && (
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={node.radius + 8}
                            fill="none"
                            stroke={colors.fill}
                            strokeWidth={2}
                            opacity={0.2}
                            filter="url(#topo-glow-hover)"
                          />
                        )}

                        {/* Search highlight ring */}
                        {isSearchMatch && !filtered && (
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={node.radius + 6}
                            fill="none"
                            stroke="#fbbf24"
                            strokeWidth={3}
                            opacity={0.7}
                            filter="url(#topo-search-glow)"
                          />
                        )}

                        {/* Main node circle */}
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={isSelected ? node.radius + 3 : node.radius}
                          fill={dimmed ? 'hsl(var(--muted))' : colors.fill}
                          opacity={1}
                          stroke={isSelected ? 'hsl(var(--foreground))' : colors.stroke}
                          strokeWidth={isSelected ? 3 : 1.5}
                          className="transition-all duration-200"
                        />

                        {/* Node icon/initial */}
                        <text
                          x={node.x}
                          y={node.y + 1}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={node.type === 'controller' ? 16 : 11}
                          fontWeight={700}
                          fill={dimmed ? 'hsl(var(--muted-foreground))' : '#ffffff'}
                          className="pointer-events-none select-none"
                        >
                          {node.type === 'controller'
                            ? '\u{1F9E0}'
                            : node.label.slice(0, 2).toUpperCase()}
                        </text>

                        {/* Health indicator dot */}
                        {node.status === 'active' && !dimmed && !filtered && (
                          <circle
                            cx={node.x + node.radius * 0.7}
                            cy={node.y - node.radius * 0.7}
                            r={4}
                            fill={healthColor(node.status)}
                            stroke="hsl(var(--card))"
                            strokeWidth={1.5}
                          />
                        )}

                        {/* Label with background rect */}
                        {labelPos && !filtered && (
                          <>
                            <rect
                              x={labelPos.x - 50}
                              y={labelPos.y - labelPos.fontSize - 1}
                              width={100}
                              height={labelPos.fontSize + 5}
                              rx={3}
                              fill="hsl(var(--card))"
                              opacity={0.85}
                              className="pointer-events-none"
                            />
                            <text
                              x={labelPos.x}
                              y={labelPos.y}
                              textAnchor="middle"
                              fontSize={labelPos.fontSize}
                              fontWeight={isSelected ? 600 : 400}
                              fill={dimmed ? 'hsl(var(--muted-foreground))' : isSelected ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))'}
                              className="pointer-events-none select-none"
                            >
                              {node.label.length > 16
                                ? node.label.slice(0, 14) + '\u2026'
                                : node.label}
                            </text>
                          </>
                        )}
                      </g>
                    )
                  })}

                  {/* Section labels */}
                  <text x="90" y="230" fontSize="11" fontWeight="600" fill="hsl(var(--muted-foreground))" opacity="0.5" textAnchor="middle" className="pointer-events-none select-none">
                    MEMORY SYSTEM
                  </text>
                  <text x="1140" y="220" fontSize="11" fontWeight="600" fill="hsl(var(--muted-foreground))" opacity="0.5" textAnchor="middle" className="pointer-events-none select-none">
                    EVOLUTION ENGINE
                  </text>
                  <text x="650" y="720" fontSize="11" fontWeight="600" fill="hsl(var(--muted-foreground))" opacity="0.5" textAnchor="middle" className="pointer-events-none select-none">
                    SAFETY LAYER
                  </text>
                  <text x="220" y="690" fontSize="11" fontWeight="600" fill="hsl(var(--muted-foreground))" opacity="0.5" textAnchor="middle" className="pointer-events-none select-none">
                    DATA STORES
                  </text>
                  <text x="650" y="20" fontSize="11" fontWeight="600" fill="hsl(var(--muted-foreground))" opacity="0.5" textAnchor="middle" className="pointer-events-none select-none">
                    EXTERNAL APIS
                  </text>
                </g>
              </svg>

              {/* Zoom Controls - Bottom Right */}
              <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
                <TooltipProvider>
                  <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card/95 backdrop-blur-sm shadow-md p-1.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 md:h-7 md:w-7 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
                          onClick={handleZoomIn}
                          disabled={zoom >= MAX_ZOOM}
                        >
                          <ZoomIn className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-xs">Zoom In</TooltipContent>
                    </Tooltip>

                    <div className="text-[10px] font-mono text-muted-foreground text-center px-1 py-0.5 bg-muted/50 rounded">
                      {zoomPercent}%
                    </div>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 md:h-7 md:w-7 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
                          onClick={handleZoomOut}
                          disabled={zoom <= MIN_ZOOM}
                        >
                          <ZoomOut className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-xs">Zoom Out</TooltipContent>
                    </Tooltip>

                    <Separator className="my-0.5" />

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 md:h-7 md:w-7 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
                          onClick={handleFitToScreen}
                        >
                          <Maximize className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-xs">Fit to Screen</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 md:h-7 md:w-7 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
                          onClick={handleResetView}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-xs">Reset View</TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </div>

              {/* Minimap - Bottom Left - Hidden on mobile */}
              <div className="absolute bottom-3 left-3 rounded-lg border border-border bg-card/95 backdrop-blur-sm shadow-md overflow-hidden hidden md:block">
                <svg
                  ref={minimapRef}
                  width={150}
                  height={100}
                  viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
                  className="bg-muted/30 dark:bg-muted/20 cursor-pointer"
                  onClick={handleMinimapClick}
                >
                  {/* Mini nodes */}
                  {NODES.map((node) => {
                    const filtered = isNodeFiltered(node)
                    const colors = TYPE_COLORS[node.type]
                    return (
                      <circle
                        key={node.id}
                        cx={node.x}
                        cy={node.y}
                        r={filtered ? 2 : Math.max(3, node.radius * 0.15)}
                        fill={filtered ? 'hsl(var(--muted))' : colors.fill}
                        opacity={filtered ? 0.2 : 0.8}
                      />
                    )
                  })}
                  {/* Viewport rectangle */}
                  <rect
                    x={viewportRect.x / minimapScaleX}
                    y={viewportRect.y / minimapScaleY}
                    width={viewportRect.w / minimapScaleX}
                    height={viewportRect.h / minimapScaleY}
                    fill="none"
                    stroke="hsl(var(--foreground))"
                    strokeWidth={3}
                    opacity={0.4}
                    rx={2}
                  />
                </svg>
              </div>
            </div>

            {/* Legend */}
            <div className="border-t bg-card px-4 py-3">
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                {/* Node types */}
                <div className="flex items-center gap-3">
                  <span className="font-medium text-muted-foreground">Nodes:</span>
                  {(Object.entries(TYPE_COLORS) as [NodeType, typeof TYPE_COLORS[NodeType]][]).map(
                    ([type, colors]) => (
                      <span key={type} className="flex items-center gap-1.5">
                        <span
                          className="inline-block h-3 w-3 rounded-full"
                          style={{ backgroundColor: colors.fill }}
                        />
                        <span className="text-foreground/80 capitalize">{type}</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-border/50">
                          {typeCounts[type] ?? 0}
                        </Badge>
                      </span>
                    )
                  )}
                </div>
                <Separator orientation="vertical" className="h-4" />
                {/* Connection types */}
                <div className="flex items-center gap-3">
                  <span className="font-medium text-muted-foreground">Edges:</span>
                  {(['data', 'control', 'feedback'] as ConnectionType[]).map((ct) => (
                    <span key={ct} className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-0.5 w-5 rounded"
                        style={{
                          backgroundColor: CONNECTION_COLORS[ct],
                          borderStyle:
                            ct === 'feedback' ? 'dashed' : ct === 'control' ? 'dotted' : 'solid',
                        }}
                      />
                      <span className="text-foreground/80">{CONNECTION_LABELS[ct]}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detail Side Panel */}
        <AnimatePresence mode="wait">
          {selectedNode ? (
            <motion.div
              key={selectedNode.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="xl:w-80 w-full"
            >
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          'flex items-center justify-center size-9 rounded-lg',
                          TYPE_COLORS[selectedNode.type].bg,
                          TYPE_COLORS[selectedNode.type].darkBg
                        )}
                      >
                        <CircleDot
                          className={cn(
                            'size-4',
                            TYPE_COLORS[selectedNode.type].text,
                            TYPE_COLORS[selectedNode.type].darkText
                          )}
                        />
                      </div>
                      <div>
                        <CardTitle className="text-base">{selectedNode.label}</CardTitle>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'mt-0.5 text-[10px]',
                            TYPE_COLORS[selectedNode.type].bg,
                            TYPE_COLORS[selectedNode.type].darkBg,
                            TYPE_COLORS[selectedNode.type].text,
                            TYPE_COLORS[selectedNode.type].darkText
                          )}
                        >
                          {selectedNode.type}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Health indicator */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="relative flex size-3">
                              <span
                                className={cn(
                                  'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                                  selectedNode.status === 'active'
                                    ? 'bg-emerald-400'
                                    : 'bg-amber-400'
                                )}
                              />
                              <span
                                className={cn(
                                  'relative inline-flex rounded-full size-3',
                                  selectedNode.status === 'active'
                                    ? 'bg-emerald-500'
                                    : 'bg-amber-500'
                                )}
                              />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {selectedNode.status === 'active' ? 'Active' : 'Inactive'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setSelectedNodeId(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Description */}
                  <div>
                    <h4 className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                      Description
                    </h4>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {selectedNode.description}
                    </p>
                  </div>

                  {/* Status */}
                  <div>
                    <h4 className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                      Status
                    </h4>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                          selectedNode.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        )}
                      >
                        <Activity className="size-3" />
                        {selectedNode.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {/* Key Metrics */}
                  {selectedNode.metrics.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                        Key Metrics
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedNode.metrics.map((m) => (
                          <div
                            key={m.label}
                            className="rounded-md bg-muted/50 dark:bg-muted/30 px-2.5 py-2 border border-border/30"
                          >
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                              {m.label}
                            </div>
                            <div className="text-sm font-semibold text-foreground mt-0.5">
                              {m.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Connected Components */}
                  {connectedNodes.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                        Connected Components
                      </h4>
                      <ScrollArea className="max-h-48">
                        <div className="space-y-1">
                          {connectedNodes.map((connNode) => {
                            const cColors = TYPE_COLORS[connNode.type]
                            return (
                              <button
                                key={connNode.id}
                                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/60 transition-colors"
                                onClick={() => setSelectedNodeId(connNode.id)}
                              >
                                <span
                                  className="h-2.5 w-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: cColors.fill }}
                                />
                                <span className="truncate text-foreground/80">
                                  {connNode.label}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="ml-auto text-[9px] px-1.5 py-0 h-4 border-border/50"
                                >
                                  {connNode.type}
                                </Badge>
                                <ArrowRight className="size-3 text-muted-foreground/50" />
                              </button>
                            )
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  {/* Connection Types */}
                  {selectedNodeEdges.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                        Connection Types
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {Array.from(
                          new Set(selectedNodeEdges.map((e) => e.type))
                        ).map((ct) => (
                          <Badge
                            key={ct}
                            variant="outline"
                            className="text-[10px] gap-1.5 border-border/50"
                            style={{ color: CONNECTION_COLORS[ct] }}
                          >
                            <span
                              className="inline-block h-0.5 w-3 rounded"
                              style={{ backgroundColor: CONNECTION_COLORS[ct] }}
                            />
                            {CONNECTION_LABELS[ct]}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="xl:w-80 w-full"
            >
              <Card className="h-full min-h-[200px] flex items-center justify-center">
                <CardContent className="text-center py-12">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
                    <Network className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Select a Node
                  </h3>
                  <p className="text-xs text-muted-foreground/70 mt-1 max-w-[200px] mx-auto">
                    Click on any node in the topology diagram to view its details, metrics, and connections.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
