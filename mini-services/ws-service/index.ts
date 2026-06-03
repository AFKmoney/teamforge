import { createServer, IncomingMessage, ServerResponse } from 'http'
import { Server, Socket } from 'socket.io'

// ---------------------------------------------------------------------------
// Socket.IO Server (port 3003) - for frontend clients
// ---------------------------------------------------------------------------

const wsServer = createServer()
const io = new Server(wsServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Track connected clients
const connectedClients = new Set<string>()

io.on('connection', (socket: Socket) => {
  connectedClients.add(socket.id)
  console.log(`[WS] Client connected: ${socket.id} (${connectedClients.size} total)`)

  // Send welcome event
  socket.emit('connected', {
    message: 'TeamForge IDE real-time service',
    timestamp: new Date().toISOString(),
  })

  socket.on('disconnect', (reason) => {
    connectedClients.delete(socket.id)
    console.log(`[WS] Client disconnected: ${socket.id} (${connectedClients.size} total) - reason: ${reason}`)
  })

  socket.on('error', (error) => {
    console.error(`[WS] Socket error (${socket.id}):`, error)
  })
})

// ---------------------------------------------------------------------------
// Internal HTTP API (port 3004) - for Next.js backend to broadcast events
// ---------------------------------------------------------------------------

const internalServer = createServer((req: IncomingMessage, res: ServerResponse) => {
  // Only accept POST /broadcast
  if (req.method !== 'POST' || req.url !== '/broadcast') {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found. Use POST /broadcast' }))
    return
  }

  let body = ''
  req.on('data', (chunk: Buffer) => {
    body += chunk.toString()
  })

  req.on('end', () => {
    try {
      const parsed = JSON.parse(body)
      const { event, data } = parsed

      if (!event || typeof event !== 'string') {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Missing or invalid "event" field' }))
        return
      }

      // Broadcast to all connected socket.io clients
      io.emit(event, data)
      console.log(`[Broadcast] event="${event}" to ${connectedClients.size} clients`)

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, event, clientsReached: connectedClients.size }))
    } catch (err) {
      console.error('[Internal API] Failed to parse broadcast body:', err)
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Invalid JSON body' }))
    }
  })
})

// ---------------------------------------------------------------------------
// Start both servers
// ---------------------------------------------------------------------------

const WS_PORT = 3003
const INTERNAL_PORT = 3004

wsServer.listen(WS_PORT, () => {
  console.log(`[TeamForge WS] Socket.IO server listening on port ${WS_PORT}`)
})

internalServer.listen(INTERNAL_PORT, () => {
  console.log(`[TeamForge WS] Internal broadcast API listening on port ${INTERNAL_PORT}`)
})

// Graceful shutdown
const shutdown = () => {
  console.log('\n[TeamForge WS] Shutting down...')
  io.disconnectSockets()
  wsServer.close(() => {
    internalServer.close(() => {
      console.log('[TeamForge WS] Servers closed')
      process.exit(0)
    })
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
