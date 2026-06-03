import { NextRequest, NextResponse } from 'next/server'

/**
 * Execute a shell command and return the output.
 * Only allows safe, whitelisted commands.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { command } = body

    if (!command || typeof command !== 'string') {
      return NextResponse.json({ error: 'Command is required' }, { status: 400 })
    }

    // Whitelist of allowed commands
    const allowedCommands = ['bun run lint', 'bun run build', 'bun run test', 'bun run check']
    const isAllowed = allowedCommands.some((allowed) => command === allowed || command.startsWith(allowed + ' '))
    if (!isAllowed) {
      return NextResponse.json({
        error: `Command not allowed. Allowed commands: ${allowedCommands.join(', ')}`,
      }, { status: 403 })
    }

    // Execute the command
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: '/home/z/my-project',
        timeout: 60000, // 60 second timeout
        maxBuffer: 1024 * 1024, // 1MB buffer
      })

      const output = (stdout || '') + (stderr ? '\n' + stderr : '')
      return NextResponse.json({
        output: output.trim() || 'Command completed with no output.',
        exitCode: 0,
      })
    } catch (execError: unknown) {
      const err = execError as { stdout?: string; stderr?: string; code?: number }
      const output = (err.stdout || '') + (err.stderr ? '\n' + err.stderr : '')
      return NextResponse.json({
        output: output.trim() || `Command failed with exit code ${err.code || 1}`,
        exitCode: err.code || 1,
      })
    }
  } catch (error) {
    console.error('Failed to execute command:', error)
    return NextResponse.json({ error: 'Failed to execute command' }, { status: 500 })
  }
}
