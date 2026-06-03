# Task 4 - WebSocket Agent

## Task: Add real-time WebSocket updates via socket.io mini-service

### Work Done:
- Created `/mini-services/ws-service/` with socket.io server on port 3003 and internal HTTP broadcast API on port 3004
- Created `/src/lib/ws-broadcast.ts` helper for fire-and-forget event broadcasting
- Created `/src/hooks/use-realtime-ws.ts` hook connecting to socket.io and updating Zustand store
- Updated `/src/hooks/use-agent-orchestrator.ts` to accept configurable polling interval
- Updated `/src/app/page.tsx` to use `useRealtimeWS()` with Live/Polling status indicator in footer
- Added broadcast calls to API routes:
  - `/api/tasks/route.ts` (POST) → broadcasts `task:update`
  - `/api/tasks/[id]/route.ts` (PATCH) → broadcasts `task:update`
  - `/api/agents/[id]/route.ts` (PATCH) → broadcasts `agent:update`
  - `/api/messages/route.ts` (POST) → broadcasts `message:new`
  - `/api/build-logs/route.ts` (POST) → broadcasts `build:new`
  - `/api/agent-scheduler/route.ts` (POST) → broadcasts `agent:update`, `task:update`, `message:new`, `activity:new`

### Key Decisions:
- WS service runs on port 3003 (socket.io) + port 3004 (internal broadcast API)
- Frontend connects via `io("/?XTransformPort=3003")` through gateway
- Backend POSTs broadcast events to `http://localhost:3004/broadcast`
- Polling reduced from 30s to 60s when WS is connected
- Footer shows "Live" (green) when WS connected, "Polling" (amber) when disconnected
- Graceful reconnection: all data refreshed after WS reconnect
