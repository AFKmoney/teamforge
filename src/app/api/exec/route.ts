import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'

// Dangerous command patterns that should be blocked
const BLOCKED_PATTERNS = [
  /rm\s+-rf\s+\//,            // rm -rf /
  /rm\s+-rf\s+\~/,            // rm -rf ~
  /rm\s+-rf\s+\.\./,          // rm -rf ..
  /sudo\s+/,                   // sudo
  /mkfs/,                      // format filesystem
  /dd\s+if=/,                  // dd write
  />\s*\/dev\//,               // redirect to device
  /chmod\s+(-R\s+)?000\s+\//,  // remove all perms from root
  /chown\s+(-R\s+)?/,          // change ownership recursively
  /shutdown/,                   // shutdown system
  /reboot/,                     // reboot system
  /init\s+[06]/,               // change runlevel
  /kill\s+-9\s+1/,             // kill init
  /curl\s+.*\|\s*(sh|bash)/,   // curl pipe to shell
  /wget\s+.*\|\s*(sh|bash)/,   // wget pipe to shell
  /format\s+[a-z]:/i,          // format drive
  /del\s+\/[sfq]/i,            // windows delete
  /rd\s+\/[sfq]/i,             // windows rmdir
  /\:\(\)\{\s*\:\|\:\&\s*\}\;\s*\:/, // fork bomb
  /mv\s+.*\/dev\/null/,        // move to /dev/null
  /nc\s+-l/,                   // netcat listen
  /python\s+-c\s+.*import\s+os/,  // python import os
  /node\s+-e\s+.*require\s*\(.*child_process/, // node spawn child
]

// Allowed command prefixes for safe execution
const ALLOWED_PREFIXES = [
  'bun run ',
  'bun test',
  'bun ',
  'npm run ',
  'npm test',
  'npx ',
  'node ',
  'python3 ',
  'python ',
  'git ',
  'ls',
  'cat ',
  'head ',
  'tail ',
  'wc ',
  'grep ',
  'find ',
  'which ',
  'echo ',
  'pwd',
  'date',
  'whoami',
  'env',
  'printenv',
  'type ',
  'tsc ',
  'next ',
  'prisma ',
]

const TIMEOUT_MS = 30000

function isCommandAllowed(command: string): boolean {
  const trimmed = command.trimStart()

  // Check blocked patterns first
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(trimmed)) return false
  }

  // Check allowed prefixes
  return ALLOWED_PREFIXES.some((prefix) => trimmed.startsWith(prefix))
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { command, cwd, projectId } = body as { command: string; cwd?: string; projectId?: string }

    if (!command || typeof command !== 'string') {
      return NextResponse.json({ error: 'Command is required' }, { status: 400 })
    }

    // Security: block dangerous commands
    if (!isCommandAllowed(command)) {
      return NextResponse.json({
        stdout: '',
        stderr: `⛔ Command not allowed for safety. Allowed: bun, npm, npx, node, python3, git, ls, cat, tsc, next, prisma`,
        exitCode: 1,
        timedOut: false,
      })
    }

    // Determine working directory
    const workDir = cwd || (projectId ? `/home/z/my-project` : process.cwd())

    // Execute command with timeout
    const result = await new Promise<{ stdout: string; stderr: string; exitCode: number; timedOut: boolean }>((resolve) => {
      const child = exec(
        command,
        {
          cwd: workDir,
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
