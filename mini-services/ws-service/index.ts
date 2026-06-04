import { createServer, IncomingMessage, ServerResponse } from 'http'
import { Server, Socket } from 'socket.io'
import { Database } from 'bun:sqlite'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const WS_PORT = 3003
const INTERNAL_PORT = 3004
const DB_PATH = '/home/z/my-project/db/custom.db'
const POLL_INTERVAL_MS = 3000 // Poll DB every 3 seconds

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

let db: Database

function openDb(): Database {
  const database = new Database(DB_PATH, { readonly: true, create: false })
  database.run('PRAGMA busy_timeout=5000')
  return database
}

try {
  db = openDb()
  console.log(`[DB] Opened SQLite database at ${DB_PATH}`)
} catch (err) {
  console.error(`[DB] Failed to open database: ${err}`)
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Change tracking — last-seen timestamps per table
// ---------------------------------------------------------------------------

interface ChangeTracker {
  agents: string       // ISO timestamp of last seen updatedAt
  tasks: string
  messages: string     // ISO timestamp of last seen createdAt
  buildLogs: string
  activities: string
}

// Initialize to 24 hours ago so we pick up any recent changes on startup
const initTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
const tracker: ChangeTracker = {
  agents: initTime,
  tasks: initTime,
  messages: initTime,
  buildLogs: initTime,
  activities: initTime,
}

// ---------------------------------------------------------------------------
// Socket.IO Server (port 3003) — for frontend clients
// ---------------------------------------------------------------------------

const wsServer = createServer()
const io = new Server(wsServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Track connected clients and their subscriptions
const clientProjects = new Map<string, Set<string>>() // socketId -> Set<projectId>

io.on('connection', (socket: Socket) => {
  console.log(`[WS] Client connected: ${socket.id}`)

  // Send welcome event
  socket.emit('connected', {
    message: 'TeamForge IDE real-time service',
    timestamp: new Date().toISOString(),
  })

  // Handle subscribe — client scopes updates to a project
  socket.on('subscribe', (data: { projectId: string }) => {
    const { projectId } = data
    if (!projectId) return

    let projects = clientProjects.get(socket.id)
    if (!projects) {
      projects = new Set()
      clientProjects.set(socket.id, projects)
    }
    projects.add(projectId)
    console.log(`[WS] Client ${socket.id} subscribed to project ${projectId}`)
  })

  // Handle unsubscribe
  socket.on('unsubscribe', (data: { projectId: string }) => {
    const { projectId } = data
    const projects = clientProjects.get(socket.id)
    if (projects) {
      projects.delete(projectId)
      if (projects.size === 0) {
        clientProjects.delete(socket.id)
      }
    }
  })

  socket.on('disconnect', (reason) => {
    clientProjects.delete(socket.id)
    console.log(`[WS] Client disconnected: ${socket.id} - reason: ${reason}`)
  })

  socket.on('error', (error) => {
    console.error(`[WS] Socket error (${socket.id}):`, error)
  })
})

// ---------------------------------------------------------------------------
// Broadcast helpers — emit to all clients, or only those subscribed to a project
// ---------------------------------------------------------------------------

function broadcastToAll(event: string, data: unknown) {
  io.emit(event, data)
}

function broadcastToProject(projectId: string, event: string, data: unknown) {
  // Emit to all connected sockets; clients filter by subscription in the hook
  // But we also do server-side filtering for efficiency
  for (const [socketId, projects] of clientProjects.entries()) {
    if (projects.has(projectId)) {
      const socket = io.sockets.sockets.get(socketId)
      if (socket) {
        socket.emit(event, data)
      }
    }
  }
  // Also emit to clients that haven't subscribed to any project (they get everything)
  for (const [socketId, projects] of clientProjects.entries()) {
    if (projects.size === 0) {
      const socket = io.sockets.sockets.get(socketId)
      if (socket) {
        socket.emit(event, data)
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Database polling — detect changes and broadcast events
// ---------------------------------------------------------------------------

function queryAgents(since: string): Array<Record<string, unknown>> {
  try {
    const rows = db.query(
      `SELECT id, name, role, status, avatar, specialty, currentTaskId, tokensUsed, tasksCompleted, successRate, lastActive, createdAt, updatedAt
       FROM Agent WHERE updatedAt > ?`
    ).all(since)
    return rows as unknown as Array<Record<string, unknown>>
  } catch {
    return []
  }
}

function queryTasks(since: string): Array<Record<string, unknown>> {
  try {
    const rows = db.query(
      `SELECT id, projectId, title, description, status, priority, type, assigneeId, parentTaskId, subtasks, output, createdAt, updatedAt, completedAt
       FROM Task WHERE updatedAt > ?`
    ).all(since)
    return rows as unknown as Array<Record<string, unknown>>
  } catch {
    return []
  }
}

function queryMessages(since: string): Array<Record<string, unknown>> {
  try {
    const rows = db.query(
      `SELECT id, projectId, chatSessionId, agentId, content, type, metadata, createdAt
       FROM Message WHERE createdAt > ?`
    ).all(since)
    return rows as unknown as Array<Record<string, unknown>>
  } catch {
    return []
  }
}

function queryBuildLogs(since: string): Array<Record<string, unknown>> {
  try {
    const rows = db.query(
      `SELECT id, projectId, output, status, type, createdAt
       FROM BuildLog WHERE createdAt > ?`
    ).all(since)
    return rows as unknown as Array<Record<string, unknown>>
  } catch {
    return []
  }
}

function queryActivities(since: string): Array<Record<string, unknown>> {
  try {
    const rows = db.query(
      `SELECT id, agentId, action, description, metadata, createdAt
       FROM AgentActivity WHERE createdAt > ?`
    ).all(since)
    return rows as unknown as Array<Record<string, unknown>>
  } catch {
    return []
  }
}

function parseJsonField(value: unknown): unknown {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }
  return value
}

function serializeRow(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (key === 'metadata' || key === 'subtasks' || key === 'techStack') {
      result[key] = parseJsonField(value)
    } else {
      result[key] = value
    }
  }
  return result
}

function pollDatabase() {
  try {
    pollDatabaseInner()
  } catch (err) {
    console.error('[DB Poll] Error during poll:', err)
  }
}

function pollDatabaseInner() {
  const now = new Date().toISOString()

  // --- Agent changes ---
  const agentChanges = queryAgents(tracker.agents)
  for (const row of agentChanges) {
    const serialized = serializeRow(row)
    // Format dates as ISO strings
    if (serialized.lastActive) serialized.lastActive = new Date(serialized.lastActive as string).toISOString()
    if (serialized.createdAt) serialized.createdAt = new Date(serialized.createdAt as string).toISOString()
    if (serialized.updatedAt) serialized.updatedAt = new Date(serialized.updatedAt as string).toISOString()

    broadcastToAll('agent:update', serialized)
    console.log(`[DB Poll] agent:update id=${serialized.id}`)
  }
  if (agentChanges.length > 0) {
    tracker.agents = now
  }

  // --- Task changes ---
  const taskChanges = queryTasks(tracker.tasks)
  for (const row of taskChanges) {
    const serialized = serializeRow(row)
    if (serialized.createdAt) serialized.createdAt = new Date(serialized.createdAt as string).toISOString()
    if (serialized.updatedAt) serialized.updatedAt = new Date(serialized.updatedAt as string).toISOString()
    if (serialized.completedAt) serialized.completedAt = new Date(serialized.completedAt as string).toISOString()

    const projectId = serialized.projectId as string
    broadcastToProject(projectId, 'task:update', serialized)
    console.log(`[DB Poll] task:update id=${serialized.id} project=${projectId}`)
  }
  if (taskChanges.length > 0) {
    tracker.tasks = now
  }

  // --- New messages ---
  const newMessages = queryMessages(tracker.messages)
  for (const row of newMessages) {
    const serialized = serializeRow(row)
    if (serialized.createdAt) serialized.createdAt = new Date(serialized.createdAt as string).toISOString()

    const projectId = serialized.projectId as string
    broadcastToProject(projectId, 'message:new', serialized)
    console.log(`[DB Poll] message:new id=${serialized.id} project=${projectId}`)
  }
  if (newMessages.length > 0) {
    tracker.messages = now
  }

  // --- New build logs ---
  const newBuildLogs = queryBuildLogs(tracker.buildLogs)
  for (const row of newBuildLogs) {
    const serialized = serializeRow(row)
    if (serialized.createdAt) serialized.createdAt = new Date(serialized.createdAt as string).toISOString()

    const projectId = serialized.projectId as string
    broadcastToProject(projectId, 'build:new', serialized)
    console.log(`[DB Poll] build:new id=${serialized.id} project=${projectId}`)
  }
  if (newBuildLogs.length > 0) {
    tracker.buildLogs = now
  }

  // --- New activities ---
  const newActivities = queryActivities(tracker.activities)
  for (const row of newActivities) {
    const serialized = serializeRow(row)
    if (serialized.createdAt) serialized.createdAt = new Date(serialized.createdAt as string).toISOString()

    broadcastToAll('activity:new', serialized)
    console.log(`[DB Poll] activity:new id=${serialized.id}`)
  }
  if (newActivities.length > 0) {
    tracker.activities = now
  }
}

// Start polling
const pollTimer = setInterval(pollDatabase, POLL_INTERVAL_MS)

// Periodic heartbeat log every 30 seconds
const heartbeatTimer = setInterval(() => {
  console.log(`[Heartbeat] uptime=${Math.round(process.uptime())}s clients=${io.sockets.sockets.size} agents_tracker=${tracker.agents}`)
}, 30000)

// Do an initial poll to set the baseline (don't emit events for existing data)
function initializeTracker() {
  const now = new Date().toISOString()
  tracker.agents = now
  tracker.tasks = now
  tracker.messages = now
  tracker.buildLogs = now
  tracker.activities = now
  console.log(`[DB Poll] Tracker initialized at ${now} — will detect changes from now on`)
}

initializeTracker()

// ---------------------------------------------------------------------------
// Internal HTTP API (port 3004) — for Next.js backend to broadcast events
// ---------------------------------------------------------------------------

const internalServer = createServer((req: IncomingMessage, res: ServerResponse) => {
  // POST /broadcast — broadcast an event to all or project-scoped clients
  if (req.method === 'POST' && req.url === '/broadcast') {
    let body = ''
    req.on('data', (chunk: Buffer) => { body += chunk.toString() })
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body)
        const { event, data, projectId } = parsed

        if (!event || typeof event !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Missing or invalid "event" field' }))
          return
        }

        if (projectId) {
          broadcastToProject(projectId, event, data)
        } else {
          broadcastToAll(event, data)
        }
        console.log(`[Broadcast] event="${event}" projectId=${projectId || 'all'} to connected clients`)

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true, event, projectId: projectId || null }))
      } catch (err) {
        console.error('[Internal API] Failed to parse broadcast body:', err)
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON body' }))
      }
    })
    return
  }

  // GET /status — health check
  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'ok',
      connectedClients: io.sockets.sockets.size,
      tracker,
      uptime: process.uptime(),
    }))
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found. Use POST /broadcast or GET /status' }))
})

// ---------------------------------------------------------------------------
// Start both servers
// ---------------------------------------------------------------------------

wsServer.listen(WS_PORT, '0.0.0.0', () => {
  console.log(`[TeamForge WS] Socket.IO server listening on port ${WS_PORT}`)
})

internalServer.listen(INTERNAL_PORT, '0.0.0.0', () => {
  console.log(`[TeamForge WS] Internal broadcast API listening on port ${INTERNAL_PORT}`)
})

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

const shutdown = () => {
  console.log('\n[TeamForge WS] Shutting down...')
  clearInterval(pollTimer)
  clearInterval(heartbeatTimer)
  io.disconnectSockets()
  wsServer.close(() => {
    internalServer.close(() => {
      try { db.close() } catch { /* ignore */ }
      console.log('[TeamForge WS] Servers closed')
      process.exit(0)
    })
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

// Catch unhandled errors that might crash the process silently
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err)
})

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason)
})
