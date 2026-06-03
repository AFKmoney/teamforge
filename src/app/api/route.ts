import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    name: 'Autonomous IDE API',
    version: '1.0.0',
    endpoints: [
      '/api/projects',
      '/api/agents',
      '/api/tasks',
      '/api/messages',
      '/api/files',
      '/api/build-logs',
      '/api/activities',
      '/api/chat',
    ],
  })
}
