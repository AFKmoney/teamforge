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

// Deploy: run lint + build as pre-deploy checks, then report
const DEPLOY_COMMANDS = ['bun run lint', 'bun run build']

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

    // For deploy type, run lint + build as pre-deploy checks
    if (buildType === 'deploy') {
      // Create a "running" deploy log
      const runningLog = await db.buildLog.create({
        data: {
          projectId,
          output: `$ deploy\n⠋ Running pre-deploy checks...`,
          status: 'running',
          type: 'deploy',
        },
      })
      broadcastEvent('build:new', runningLog)

      let fullOutput = '$ deploy\n'
      let allPassed = true

      for (const cmd of DEPLOY_COMMANDS) {
        fullOutput += `$ ${cmd}\n`
        const result = await executeCommand(cmd, process.cwd())
        fullOutput += result.stdout + (result.stderr ? '\n' + result.stderr : '')
        if (result.exitCode !== 0) {
          allPassed = false
          fullOutput += `\n✗ ${cmd} failed with exit code ${result.exitCode}\n`
          break
        } else {
          fullOutput += `✓ ${cmd} passed\n\n`
        }
      }

      if (allPassed) {
        fullOutput += `🚀 Pre-deploy checks passed. Build is ready for deployment.\n   Note: Actual deployment requires a configured deployment target.`
      } else {
        fullOutput += `\n❌ Pre-deploy checks failed. Fix the errors above before deploying.`
      }

      const deployLog = await db.buildLog.update({
        where: { id: runningLog.id },
        data: {
          output: fullOutput.trim(),
          status: allPassed ? 'success' : 'failed',
        },
      })

      broadcastEvent('build:update', deployLog)
      return NextResponse.json(deployLog, { status: 201 })
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
