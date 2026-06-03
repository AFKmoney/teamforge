/**
 * Broadcast a real-time event to all connected WebSocket clients
 * via the internal WS service API (port 3004).
 *
 * This is fire-and-forget — errors are logged but don't block the caller.
 */
export async function broadcastEvent(event: string, data: unknown): Promise<void> {
  try {
    await fetch('http://localhost:3004/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data }),
    })
  } catch (err) {
    // WS service might not be running yet — log but don't crash
    console.warn(`[WS Broadcast] Failed to broadcast "${event}":`, err instanceof Error ? err.message : err)
  }
}
