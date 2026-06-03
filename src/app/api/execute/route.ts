import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'

// Dangerous commands that should be blocked
const BLOCKED_PATTERNS = [
  /rm\s+-rf\s+\//,            // rm -rf /
  /rm\s+-rf\s+\~/,            // rm -rf ~
  /rm\s+-rf\s+\.\./,          // rm -rf ..
  /mkfs/,                      // format filesystem
  /dd\s+if=/,                  // dd write
  />\s*\/dev\//,               // redirect to device
  /chmod\s+(-R\s+)?000\s+\//,  // remove all perms from root
  /chown\s+(-R\s+)?/,          // change ownership recursively
  /shutdown/,                   // shutdown system
  /reboot/,                     // reboot system
  /init\s+[06]/,               // change runlevel
  /kill\s+-9\s+1/,             // kill init
  /curl\s+.*\|\s*sh/,          // curl pipe to shell
  /wget\s+.*\|\s*sh/,          // wget pipe to shell
  /format\s+[a-z]:/i,          // format drive
  /del\s+\/[sfq]/i,            // windows delete
  /rd\s+\/[sfq]/i,             // windows rmdir
  /\:\(\)\{\s*\:\|\:\&\s*\}\;\s*\:/, // fork bomb
  /mv\s+.*\/dev\/null/,        // move to /dev/null
]

const TIMEOUT_MS = 30000

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { command, cwd } = body as { command: string; cwd?: string }

    if (!command || typeof command !== 'string') {
      return NextResponse.json({ error: 'Command is required' }, { status: 400 })
    }

    // Security: block dangerous commands
    const trimmedCommand = command.trim()
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(trimmedCommand)) {
        return NextResponse.json({
          stdout: '',
          stderr: `⛔ Command blocked for safety: this command pattern is not allowed.`,
          exitCode: 1,
          timedOut: false,
        })
      }
    }

    // Execute command with timeout
    const result = await new Promise<{ stdout: string; stderr: string; exitCode: number; timedOut: boolean }>((resolve) => {
      const child = exec(
        trimmedCommand,
        {
          cwd: cwd || process.cwd(),
          timeout: TIMEOUT_MS,
          maxBuffer: 1024 * 1024, // 1MB max output
          env: { ...process.env },
        },
        (error, stdout, stderr) => {
          if (error && error.killed) {
            resolve({
              stdout: stdout || '',
              stderr: stderr || '',
              exitCode: -1,
              timedOut: true,
            })
            return
          }

          resolve({
            stdout: stdout || '',
            stderr: stderr || '',
            exitCode: error ? error.code ?? 1 : 0,
            timedOut: false,
          })
        }
      )

      // Additional timeout safety
      setTimeout(() => {
        if (!child.killed) {
          child.kill('SIGTERM')
          resolve({
            stdout: '',
            stderr: 'Command timed out after 30 seconds',
            exitCode: -1,
            timedOut: true,
          })
        }
      }, TIMEOUT_MS + 1000)
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Execute error:', error)
    return NextResponse.json(
      { stdout: '', stderr: `Execution error: ${error instanceof Error ? error.message : 'Unknown error'}`, exitCode: 1, timedOut: false },
      { status: 500 }
    )
  }
}
