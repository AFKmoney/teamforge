import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'

// Dangerous command patterns that should be blocked
const BLOCKED_PATTERNS = [
  /rm\s+-rf\s+\//,            // rm -rf /
  /rm\s+-rf\s+\~/,            // rm -rf ~
  /rm\s+-rf\s+\.\./,          // rm -rf ..
  /rm\s+-rf\s+\*/,            // rm -rf *
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
  'bun add',
  'bun remove',
  'bun ',
  'npm run ',
  'npm test',
  'npm install',
  'npm ',
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
  'rg ',
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
  'mkdir ',
  'touch ',
  'cp ',
  'mv ',         // mv is allowed but mv to /dev/null is blocked above
  'cd ',         // cd itself doesn't work in exec, but we handle it client-side
  'clear',
  'help',
  'tree ',
  'du ',
  'df ',
  'sort ',
  'uniq ',
  'awk ',
  'sed ',
  'curl ',       // curl is allowed but curl|sh is blocked
  'wget ',
  'tar ',
  'unzip ',
  'chmod ',      // chmod is allowed but chmod 000 / is blocked
  'dotnet ',
  'cargo ',
  'rustc ',
  'go ',
  'make ',
  'cmake ',
  'docker ',
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
    const { command, cwd } = body as { command: string; cwd?: string }

    if (!command || typeof command !== 'string') {
      return NextResponse.json({ error: 'Command is required' }, { status: 400 })
    }

    // Security: block dangerous commands
    if (!isCommandAllowed(command)) {
      return NextResponse.json({
        stdout: '',
        stderr: `⛔ Command blocked for safety. Allowed prefixes: bun, npm, npx, node, python, git, ls, cat, tsc, next, prisma, and more. Type 'help' for details.`,
        exitCode: 1,
        timedOut: false,
        cwd: cwd || process.cwd(),
      })
    }

    // Determine working directory
    const workDir = cwd || process.cwd()

    // Execute command with timeout
    const result = await new Promise<{
      stdout: string
      stderr: string
      exitCode: number
      timedOut: boolean
      cwd: string
    }>((resolve) => {
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
              cwd: workDir,
            })
            return
          }

          resolve({
            stdout: stdout || '',
            stderr: stderr || '',
            exitCode: error ? (typeof error.code === 'number' ? error.code : 1) : 0,
            timedOut: false,
            cwd: workDir,
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
            cwd: workDir,
          })
        }
      }, TIMEOUT_MS + 1000)
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Terminal execute error:', error)
    return NextResponse.json(
      { stdout: '', stderr: `Execution error: ${error instanceof Error ? error.message : 'Unknown error'}`, exitCode: 1, timedOut: false, cwd: process.cwd() },
      { status: 500 }
    )
  }
}

// GET endpoint: return current working directory info
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const cwd = url.searchParams.get('cwd') || process.cwd()

  return NextResponse.json({
    cwd,
    home: process.env.HOME || '/home/z',
    user: process.env.USER || 'z',
    shell: process.env.SHELL || '/bin/bash',
  })
}
