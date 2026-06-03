// ============================================================================
// Self-Evolving AI System — TypeScript Type Definitions
// ============================================================================

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export type AgentRole =
  | 'research'
  | 'coding'
  | 'evaluation'
  | 'memory'
  | 'evolution'
  | 'safety'
  | 'deployment'

export type AgentStatus = 'idle' | 'active' | 'busy' | 'error' | 'offline'

export interface Agent {
  id: string
  name: string
  role: AgentRole
  status: AgentStatus
  description: string
  goals: string[]
  tools: string[]
  config: Record<string, unknown>
  successRate: number
  tasksCompleted: number
  tokensUsed: number
  lastActive: string
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Memory
// ---------------------------------------------------------------------------

export type MemoryType =
  | 'working'
  | 'episodic'
  | 'semantic'
  | 'procedural'
  | 'evolution'

export interface Memory {
  id: string
  agentId: string | null
  type: MemoryType
  category: string
  content: string
  metadata: Record<string, unknown>
  importance: number
  accessCount: number
  createdAt: string
  updatedAt: string
  expiresAt: string | null
}

// ---------------------------------------------------------------------------
// Knowledge Graph
// ---------------------------------------------------------------------------

export interface KnowledgeNode {
  id: string
  label: string
  type: string
  description: string
  data: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface KnowledgeEdge {
  id: string
  sourceId: string
  targetId: string
  relation: string
  weight: number
  metadata: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Evolution
// ---------------------------------------------------------------------------

export type EvolutionType = 'prompt' | 'workflow' | 'architecture' | 'tool'
export type EvolutionStatus =
  | 'proposed'
  | 'testing'
  | 'validated'
  | 'deployed'
  | 'rejected'
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface EvolutionEvent {
  id: string
  agentId: string | null
  type: EvolutionType
  title: string
  description: string
  status: EvolutionStatus
  beforeState: Record<string, unknown>
  afterState: Record<string, unknown>
  metrics: Record<string, unknown>
  improvementPercent: number
  riskLevel: RiskLevel
  approvedBy: string | null
  createdAt: string
  validatedAt: string | null
  deployedAt: string | null
}

// ---------------------------------------------------------------------------
// Benchmarks
// ---------------------------------------------------------------------------

export interface Benchmark {
  id: string
  name: string
  category: string
  score: number
  maxScore: number
  previousScore: number | null
  version: number
  runAt: string
  details: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Safety
// ---------------------------------------------------------------------------

export type Severity = 'info' | 'warning' | 'critical'

export interface SafetyEvent {
  id: string
  type: string
  severity: Severity
  description: string
  agentId: string | null
  resolved: boolean
  resolvedBy: string | null
  metadata: Record<string, unknown>
  createdAt: string
  resolvedAt: string | null
}

// ---------------------------------------------------------------------------
// Experiments
// ---------------------------------------------------------------------------

export type ExperimentStatus = 'draft' | 'running' | 'completed' | 'failed'

export interface Experiment {
  id: string
  agentId: string | null
  title: string
  hypothesis: string
  methodology: string
  status: ExperimentStatus
  results: Record<string, unknown>
  conclusion: string | null
  score: number | null
  createdAt: string
  completedAt: string | null
}

// ---------------------------------------------------------------------------
// System Metrics
// ---------------------------------------------------------------------------

export interface SystemMetric {
  id: string
  metric: string
  value: number
  unit: string
  timestamp: string
}

// ---------------------------------------------------------------------------
// Constitutional Rules
// ---------------------------------------------------------------------------

export interface ConstitutionalRule {
  id: string
  rule: string
  description: string
  active: boolean
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Dashboard Aggregate
// ---------------------------------------------------------------------------

export interface DashboardData {
  agentCount: number
  activeAgentCount: number
  memoryCount: number
  evolutionEventCount: number
  evolutionStatusBreakdown: Record<string, number>
  latestEvolutionEvents: EvolutionEvent[]
  avgBenchmarkScore: number
  unresolvedSafetyCount: number
  healthMetrics: Record<string, number>
  totalTokensUsed: number
  totalTasksCompleted: number
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// ---------------------------------------------------------------------------
// Activity Log
// ---------------------------------------------------------------------------

export interface ActivityLog {
  id: string
  type: 'agent' | 'evolution' | 'safety' | 'memory' | 'benchmark' | 'system'
  message: string
  timestamp: string
  severity?: 'info' | 'warning' | 'success' | 'error'
}

// ---------------------------------------------------------------------------
// System Settings
// ---------------------------------------------------------------------------

export interface SystemSettings {
  autoEvolution: boolean
  maxConcurrentAgents: number
  safetyStrictMode: boolean
  evolutionIntervalMinutes: number
  memoryRetentionDays: number
  maxRiskLevel: string
  enableResearchLab: boolean
  logVerbosity: string
}
