// ============================================================================
// System Log API — Mock data with filtering support
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'

interface SystemLogEntry {
  id: string
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'critical'
  source: 'agent' | 'evolution' | 'safety' | 'system' | 'user'
  action: string
  details: Record<string, unknown>
  userId?: string
}

// Generate realistic mock log entries
function generateMockLogs(): SystemLogEntry[] {
  const now = Date.now()
  const hourMs = 3600000
  const minMs = 60000

  return [
    {
      id: 'log-001',
      timestamp: new Date(now - 5 * minMs).toISOString(),
      level: 'info',
      source: 'agent',
      action: 'Agent "Research Agent" completed web search task',
      details: { agentId: 'agent-1', taskType: 'web-search', duration: 3.2, tokensUsed: 1200, query: 'latest AI safety frameworks' },
      userId: 'user-admin',
    },
    {
      id: 'log-002',
      timestamp: new Date(now - 12 * minMs).toISOString(),
      level: 'warning',
      source: 'evolution',
      action: 'Evolution proposal "Optimize memory retrieval" flagged for review',
      details: { proposalId: 'evo-7', riskLevel: 'medium', improvementPercent: 8.3, flaggedReason: 'Potential side effects on working memory' },
    },
    {
      id: 'log-003',
      timestamp: new Date(now - 18 * minMs).toISOString(),
      level: 'info',
      source: 'system',
      action: 'Scheduled maintenance window started',
      details: { window: '02:00-04:00 UTC', estimatedDuration: '2h', affectedServices: ['metrics-collection', 'backup'] },
    },
    {
      id: 'log-004',
      timestamp: new Date(now - 25 * minMs).toISOString(),
      level: 'error',
      source: 'agent',
      action: 'Agent "Coding Agent" failed to execute code in sandbox',
      details: { agentId: 'agent-2', errorCode: 'TIMEOUT', duration: 30000, language: 'python', stackTrace: 'Execution timed out after 30s' },
    },
    {
      id: 'log-005',
      timestamp: new Date(now - 32 * minMs).toISOString(),
      level: 'critical',
      source: 'safety',
      action: 'Constitutional rule violation detected: output toxicity above threshold',
      details: { ruleId: 'rule-3', ruleName: 'Toxicity Prevention', toxicityScore: 0.87, threshold: 0.7, agentId: 'agent-5', blocked: true },
      userId: 'user-admin',
    },
    {
      id: 'log-006',
      timestamp: new Date(now - 45 * minMs).toISOString(),
      level: 'info',
      source: 'evolution',
      action: 'Evolution "Enhance prompt chaining" deployed to production',
      details: { proposalId: 'evo-4', improvementPercent: 12.7, validatedAt: new Date(now - 2 * hourMs).toISOString(), riskLevel: 'low' },
    },
    {
      id: 'log-007',
      timestamp: new Date(now - 1 * hourMs).toISOString(),
      level: 'info',
      source: 'user',
      action: 'User updated system settings: max concurrent agents changed from 5 to 10',
      details: { setting: 'maxConcurrentAgents', oldValue: 5, newValue: 10 },
      userId: 'user-admin',
    },
    {
      id: 'log-008',
      timestamp: new Date(now - 1.2 * hourMs).toISOString(),
      level: 'warning',
      source: 'system',
      action: 'Memory usage approaching threshold (82%)',
      details: { currentUsage: '82%', threshold: '85%', totalMemory: '16GB', processBreakdown: { agents: '4.2GB', knowledge: '3.1GB', evolution: '2.8GB', other: '3.0GB' } },
    },
    {
      id: 'log-009',
      timestamp: new Date(now - 1.5 * hourMs).toISOString(),
      level: 'info',
      source: 'agent',
      action: 'Agent "Evaluation Agent" completed benchmark suite MMLU',
      details: { agentId: 'agent-3', benchmark: 'MMLU', score: 87.3, previousScore: 85.1, improvement: 2.2 },
    },
    {
      id: 'log-010',
      timestamp: new Date(now - 1.8 * hourMs).toISOString(),
      level: 'error',
      source: 'safety',
      action: 'Validation pipeline failed on evolution proposal',
      details: { proposalId: 'evo-9', stage: 'sandbox-test', failureReason: 'Output validation failed', expectedBehavior: 'Non-harmful response', actualBehavior: 'Ambiguous response detected' },
    },
    {
      id: 'log-011',
      timestamp: new Date(now - 2 * hourMs).toISOString(),
      level: 'info',
      source: 'evolution',
      action: 'Evolution engine started observation phase',
      details: { cycleId: 'cycle-42', phase: 'observe', metricsCollected: 156, agentsMonitored: 7 },
    },
    {
      id: 'log-012',
      timestamp: new Date(now - 2.3 * hourMs).toISOString(),
      level: 'warning',
      source: 'agent',
      action: 'Agent "Deployment Agent" retry count exceeded (3/3)',
      details: { agentId: 'agent-7', taskType: 'deployment', retryCount: 3, maxRetries: 3, lastError: 'Connection refused to target environment' },
    },
    {
      id: 'log-013',
      timestamp: new Date(now - 2.5 * hourMs).toISOString(),
      level: 'info',
      source: 'system',
      action: 'Knowledge graph sync completed',
      details: { nodesAdded: 3, edgesAdded: 7, nodesUpdated: 12, syncDuration: '4.2s' },
    },
    {
      id: 'log-014',
      timestamp: new Date(now - 3 * hourMs).toISOString(),
      level: 'critical',
      source: 'system',
      action: 'Database connection pool exhausted',
      details: { poolSize: 20, activeConnections: 20, waitingRequests: 5, recoveryAction: 'Pool reset initiated', recoveredAt: new Date(now - 2.9 * hourMs).toISOString() },
    },
    {
      id: 'log-015',
      timestamp: new Date(now - 3.2 * hourMs).toISOString(),
      level: 'info',
      source: 'user',
      action: 'User triggered manual evolution cycle',
      details: { triggerType: 'manual', targetAgents: ['agent-1', 'agent-3'], focusArea: 'prompt optimization' },
      userId: 'user-researcher',
    },
    {
      id: 'log-016',
      timestamp: new Date(now - 3.5 * hourMs).toISOString(),
      level: 'warning',
      source: 'safety',
      action: 'Constitutional rule "Data Privacy" triggered soft warning',
      details: { ruleId: 'rule-5', ruleName: 'Data Privacy', triggerCount: 3, context: 'Agent attempted to cache PII in working memory', action: 'Memory cleared' },
    },
    {
      id: 'log-017',
      timestamp: new Date(now - 4 * hourMs).toISOString(),
      level: 'info',
      source: 'agent',
      action: 'Agent "Memory Agent" consolidated episodic memories',
      details: { agentId: 'agent-4', memoriesProcessed: 47, memoriesConsolidated: 12, memoriesArchived: 8, duration: '15.3s' },
    },
    {
      id: 'log-018',
      timestamp: new Date(now - 4.5 * hourMs).toISOString(),
      level: 'error',
      source: 'evolution',
      action: 'Evolution proposal rejected by validation pipeline',
      details: { proposalId: 'evo-10', type: 'architecture', rejectionReason: 'Breaking change detected in agent communication protocol', riskLevel: 'high' },
    },
    {
      id: 'log-019',
      timestamp: new Date(now - 5 * hourMs).toISOString(),
      level: 'info',
      source: 'system',
      action: 'Automatic backup completed successfully',
      details: { backupType: 'incremental', size: '2.3GB', duration: '45s', location: '/backups/2024-01-15-0300.tar.gz' },
    },
    {
      id: 'log-020',
      timestamp: new Date(now - 5.5 * hourMs).toISOString(),
      level: 'info',
      source: 'agent',
      action: 'Agent "Safety Agent" completed constitutional review',
      details: { agentId: 'agent-6', rulesReviewed: 6, violationsFound: 0, reviewDuration: '8.1s' },
    },
    {
      id: 'log-021',
      timestamp: new Date(now - 6 * hourMs).toISOString(),
      level: 'warning',
      source: 'evolution',
      action: 'Evolution cycle taking longer than expected',
      details: { cycleId: 'cycle-41', expectedDuration: '5m', currentDuration: '8m', phase: 'implement', bottleneck: 'Sandbox testing queue' },
    },
    {
      id: 'log-022',
      timestamp: new Date(now - 6.5 * hourMs).toISOString(),
      level: 'info',
      source: 'user',
      action: 'User exported benchmark report',
      details: { exportFormat: 'CSV', benchmarkIds: ['bench-1', 'bench-2', 'bench-3'], recordCount: 150 },
      userId: 'user-analyst',
    },
    {
      id: 'log-023',
      timestamp: new Date(now - 7 * hourMs).toISOString(),
      level: 'critical',
      source: 'agent',
      action: 'Agent "Research Agent" produced potentially harmful output',
      details: { agentId: 'agent-1', outputCategory: 'code-generation', flaggedContent: 'SQL injection pattern detected in generated code', blocked: true, constitutionalRule: 'rule-2' },
      userId: 'user-admin',
    },
    {
      id: 'log-024',
      timestamp: new Date(now - 7.5 * hourMs).toISOString(),
      level: 'info',
      source: 'system',
      action: 'System health check passed',
      details: { cpuUsage: '47%', memoryUsage: '62%', diskUsage: '34%', uptime: '99.97%', activeAgents: 5 },
    },
    {
      id: 'log-025',
      timestamp: new Date(now - 8 * hourMs).toISOString(),
      level: 'error',
      source: 'system',
      action: 'Failed to persist metrics to time-series store',
      details: { error: 'Write timeout', retryAttempt: 2, maxRetries: 3, affectedMetrics: 24, resolution: 'Retried successfully after 5s' },
    },
    {
      id: 'log-026',
      timestamp: new Date(now - 8.5 * hourMs).toISOString(),
      level: 'info',
      source: 'safety',
      action: 'Constitutional rules updated by admin',
      details: { addedRules: 1, modifiedRules: 2, removedRules: 0, changesBy: 'user-admin' },
      userId: 'user-admin',
    },
    {
      id: 'log-027',
      timestamp: new Date(now - 9 * hourMs).toISOString(),
      level: 'warning',
      source: 'user',
      action: 'User attempted to disable safety strict mode',
      details: { action: 'safetyStrictMode', attemptedValue: false, blocked: true, reason: 'Requires admin approval via constitutional override' },
      userId: 'user-researcher',
    },
    {
      id: 'log-028',
      timestamp: new Date(now - 9.5 * hourMs).toISOString(),
      level: 'info',
      source: 'evolution',
      action: 'Evolution engine completed full cycle',
      details: { cycleId: 'cycle-40', phases: ['observe', 'analyze', 'hypothesize', 'implement', 'evaluate'], proposalsGenerated: 3, proposalsValidated: 2, proposalsDeployed: 1, totalDuration: '28m' },
    },
    {
      id: 'log-029',
      timestamp: new Date(now - 10 * hourMs).toISOString(),
      level: 'error',
      source: 'agent',
      action: 'Agent "Deployment Agent" failed to push to production',
      details: { agentId: 'agent-7', environment: 'production', error: 'Blue-green deployment rollback triggered', rollbackReason: 'Health check failed on new version' },
    },
    {
      id: 'log-030',
      timestamp: new Date(now - 11 * hourMs).toISOString(),
      level: 'info',
      source: 'system',
      action: 'Daily system report generated',
      details: { totalAgents: 7, activeAgents: 5, evolutionCycles: 4, safetyEvents: 2, benchmarkRuns: 3, avgResponseTime: '1.2s', errorRate: '0.3%' },
    },
  ]
}

const mockLogs = generateMockLogs()

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const level = searchParams.get('level')
  const source = searchParams.get('source')
  const search = searchParams.get('search')
  const limit = parseInt(searchParams.get('limit') || '50', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  let filtered = [...mockLogs]

  // Filter by level
  if (level && level !== 'all') {
    filtered = filtered.filter((log) => log.level === level)
  }

  // Filter by source
  if (source && source !== 'all') {
    filtered = filtered.filter((log) => log.source === source)
  }

  // Search across action and details
  if (search) {
    const lowerSearch = search.toLowerCase()
    filtered = filtered.filter(
      (log) =>
        log.action.toLowerCase().includes(lowerSearch) ||
        JSON.stringify(log.details).toLowerCase().includes(lowerSearch) ||
        (log.userId && log.userId.toLowerCase().includes(lowerSearch))
    )
  }

  // Sort by timestamp descending
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const total = filtered.length
  const paginated = filtered.slice(offset, offset + limit)

  return NextResponse.json({
    logs: paginated,
    total,
    limit,
    offset,
  })
}
