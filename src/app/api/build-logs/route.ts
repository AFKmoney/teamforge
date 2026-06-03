import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { broadcastEvent } from '@/lib/ws-broadcast'
import { exec } from 'child_process'

const BUILD_TIMEOUT_MS = 30000

// Command map for each build type
const BUILD_COMMANDS: Record<string, string> = {
  lint: 'bun run lint',
  build: 'next build',
  test: 'bun test',
}

// Simulated deploy output (don't actually deploy)
const DEPLOY_SIMULATION = `$ bun run deploy
⠋ Initializing deployment pipeline...
⠋ Building production artifacts...
✓ Build artifacts compiled
⠋ Running pre-deploy checks...
✓ All pre-deploy checks passed
⠋ Uploading to CDN...
✓ CDN upload complete
⠋ Purging cache...
✓ Cache purged
⠋ Health check: https://teamforge.app...
✓ Health check passed (200 OK)

🚀 Deployment successful!
   URL: https://teamforge.app
   Region: us-east-1
   Duration: 8.3s

Done in 8.3s`

function executeCommand(command: string, cwd: string): Promise<{ stdout: string; stderr: string; exitCode: number; timedOut: boolean }> {
  return new Promise((resolve) => {
    const child = exec(
      command,
      {
        cwd,
        timeout: BUILD_TIMEOUT_MS,
        maxBuffer: 2 * 1024 * 1024,
        env: { ...process.env },
      },
      (error, stdout, stderr) => {
        if (error && error.killed) {
          resolve({ stdout: stdout || '', stderr: stderr || '', exitCode: -1, timedOut: true })
          return
        }
        resolve({
          stdout: stdout || '',
          stderr: stderr || '',
          exitCode: error ? (error.code ?? 1) : 0,
          timedOut: false,
        })
      }
    )
  })
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const type = searchParams.get('type')
    const limit = searchParams.get('limit')

    const where: Record<string, unknown> = {}
    if (projectId) where.projectId = projectId
    if (type) where.type = type

    const buildLogs = await db.buildLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit, 10) : 50,
    })

    return NextResponse.json(buildLogs)
  } catch (error) {
    console.error('Failed to fetch build logs:', error)
    return NextResponse.json({ error: 'Failed to fetch build logs' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, type } = body as { projectId: string; type: string }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    const buildType = type || 'build'

    // For deploy type, use simulation
    if (buildType === 'deploy') {
      const buildLog = await db.buildLog.create({
        data: {
          projectId,
          output: DEPLOY_SIMULATION,
          status: 'success',
          type: 'deploy',
        },
      })
      broadcastEvent('build:new', buildLog)
      return NextResponse.json(buildLog, { status: 201 })
    }

    // For lint, build, test - run actual commands
    const command = BUILD_COMMANDS[buildType]
    if (!command) {
      return NextResponse.json({ error: `Unknown build type: ${buildType}` }, { status: 400 })
    }

    // Create a "running" build log first
    const runningLog = await db.buildLog.create({
      data: {
        projectId,
        output: `$ ${command}\n⠋ Running...`,
        status: 'running',
        type: buildType,
      },
    })
    broadcastEvent('build:new', runningLog)

    // Execute the actual command
    const result = await executeCommand(command, process.cwd())

    // Combine output
    const fullOutput = `$ ${command}\n${result.stdout}${result.stderr ? '\n' + result.stderr : ''}${result.timedOut ? '\n⏱️ Command timed out after 30 seconds' : ''}`

    // Determine status
    let status: string
    if (result.timedOut) {
      status = 'warning'
    } else if (result.exitCode === 0) {
      // Check for warnings in lint output
      const hasWarnings = result.stdout.toLowerCase().includes('warning') || result.stderr.toLowerCase().includes('warning')
      status = hasWarnings ? 'warning' : 'success'
    } else {
      status = 'failed'
    }

    // Update the build log with actual results
    const buildLog = await db.buildLog.update({
      where: { id: runningLog.id },
      data: {
        output: fullOutput.trim(),
        status,
      },
    })

    broadcastEvent('build:update', buildLog)
    return NextResponse.json(buildLog, { status: 201 })
  } catch (error) {
    console.error('Failed to create build log:', error)
    return NextResponse.json({ error: 'Failed to create build log' }, { status: 500 })
  }
}
