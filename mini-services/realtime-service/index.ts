import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RealtimeEvent {
  id: string
  type: 'metric' | 'agent_status' | 'evolution' | 'safety' | 'system' | 'notification'
  payload: Record<string, unknown>
  timestamp: string
}

const generateId = () => Math.random().toString(36).substr(2, 9)

// ---------------------------------------------------------------------------
// Simulated real-time data generators
// ---------------------------------------------------------------------------

const agentNames = [
  'Research Agent', 'Coding Agent', 'Evaluation Agent',
  'Memory Agent', 'Evolution Agent', 'Safety Agent', 'Deployment Agent',
]
const agentStatuses = ['active', 'busy', 'idle', 'active', 'active', 'active', 'idle']
const metricTypes = ['task_success_rate', 'cost', 'latency', 'throughput', 'error_rate']
const evolutionTypes = ['prompt', 'workflow', 'architecture', 'tool']
const safetySeverities = ['info', 'warning', 'critical']

function generateMetricEvent(): RealtimeEvent {
  return {
    id: generateId(),
    type: 'metric',
    payload: {
      metric: metricTypes[Math.floor(Math.random() * metricTypes.length)],
      value: Math.round((Math.random() * 100 + 50) * 100) / 100,
      unit: ['%', 'USD', 'ms', 'req/s', '%'][Math.floor(Math.random() * 5)],
    },
    timestamp: new Date().toISOString(),
  }
}

function generateAgentStatusEvent(): RealtimeEvent {
  const idx = Math.floor(Math.random() * agentNames.length)
  const newStatus = agentStatuses[Math.floor(Math.random() * agentStatuses.length)]
  return {
    id: generateId(),
    type: 'agent_status',
    payload: {
      agentId: `agent-${idx + 1}`,
      agentName: agentNames[idx],
      previousStatus: agentStatuses[idx],
      newStatus,
      task: newStatus === 'busy'
        ? 'Processing task #' + Math.floor(Math.random() * 200)
        : newStatus === 'idle'
          ? 'Waiting for assignment'
          : 'Monitoring system',
    },
    timestamp: new Date().toISOString(),
  }
}

function generateEvolutionEvent(): RealtimeEvent {
  return {
    id: generateId(),
    type: 'evolution',
    payload: {
      evolutionType: evolutionTypes[Math.floor(Math.random() * evolutionTypes.length)],
      title: [
        'Optimized prompt template for reasoning tasks',
        'Refactored workflow pipeline stage 3',
        'Upgraded agent communication protocol',
        'Generated new tool: data-summarizer',
        'Improved memory retrieval algorithm',
      ][Math.floor(Math.random() * 5)],
      improvement: Math.round((Math.random() * 15 + 1) * 10) / 10,
      status: ['proposed', 'testing', 'validated', 'deployed'][Math.floor(Math.random() * 4)],
    },
    timestamp: new Date().toISOString(),
  }
}

function generateSafetyEvent(): RealtimeEvent {
  return {
    id: generateId(),
    type: 'safety',
    payload: {
      severity: safetySeverities[Math.floor(Math.random() * safetySeverities.length)],
      message: [
        'Safety validation passed for evolution #47',
        'Agent resource usage within bounds',
        'Constitutional rule check completed',
        'New evolution proposal requires review',
        'Sandbox test completed successfully',
      ][Math.floor(Math.random() * 5)],
    },
    timestamp: new Date().toISOString(),
  }
}

function generateNotificationEvent(): RealtimeEvent {
  return {
    id: generateId(),
    type: 'notification',
    payload: {
      title: [
        'New Evolution Proposed',
        'Agent Status Changed',
        'Safety Alert',
        'Benchmark Improved',
        'Memory Archived',
        'Research Complete',
      ][Math.floor(Math.random() * 6)],
      message: [
        'A new prompt evolution has been proposed and awaits approval.',
        'Research Agent has transitioned from idle to active.',
        'Agent CPU usage briefly exceeded threshold - auto-resolved.',
        'Reasoning benchmark score improved by 3.2%.',
        '30-day old episodic memories have been archived.',
        'Experiment #5 has completed with score 87/100.',
      ][Math.floor(Math.random() * 6)],
      severity: ['info', 'success', 'warning', 'success', 'info', 'success'][Math.floor(Math.random() * 6)],
    },
    timestamp: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Connection handling
// ---------------------------------------------------------------------------

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`)

  // Send initial burst of data
  socket.emit('initial', {
    metrics: Array.from({ length: 5 }, generateMetricEvent),
    notifications: Array.from({ length: 3 }, generateNotificationEvent),
  })

  // --- Metric updates every 8 seconds ---
  const metricInterval = setInterval(() => {
    socket.emit('event', generateMetricEvent())
  }, 8000)

  // --- Agent status changes every 15 seconds ---
  const agentInterval = setInterval(() => {
    socket.emit('event', generateAgentStatusEvent())
  }, 15000)

  // --- Evolution events every 25 seconds ---
  const evolutionInterval = setInterval(() => {
    socket.emit('event', generateEvolutionEvent())
  }, 25000)

  // --- Safety events every 20 seconds ---
  const safetyInterval = setInterval(() => {
    socket.emit('event', generateSafetyEvent())
  }, 20000)

  // --- Notifications every 12 seconds ---
  const notificationInterval = setInterval(() => {
    socket.emit('event', generateNotificationEvent())
  }, 12000)

  // --- System heartbeat every 5 seconds ---
  const heartbeatInterval = setInterval(() => {
    socket.emit('event', {
      id: generateId(),
      type: 'system',
      payload: {
        cpu: Math.round(Math.random() * 40 + 40),
        memory: Math.round(Math.random() * 35 + 30),
        network: Math.round(Math.random() * 40 + 20),
        uptime: process.uptime(),
      },
      timestamp: new Date().toISOString(),
    })
  }, 5000)

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`)
    clearInterval(metricInterval)
    clearInterval(agentInterval)
    clearInterval(evolutionInterval)
    clearInterval(safetyInterval)
    clearInterval(notificationInterval)
    clearInterval(heartbeatInterval)
  })
})

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`EvoAI Real-time Service running on port ${PORT}`)
})
