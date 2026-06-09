import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'

const GIT_TIMEOUT = 15000
const PROJECT_DIR = '/home/z/my-project'

function execGit(command: string, cwd?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    exec(
      command,
      {
        cwd: cwd || PROJECT_DIR,
        timeout: GIT_TIMEOUT,
        maxBuffer: 512 * 1024,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      },
      (error, stdout, stderr) => {
        resolve({
          stdout: (stdout || '').trim(),
          stderr: (stderr || '').trim(),
          exitCode: error ? (typeof error.code === 'number' ? error.code : 1) : 0,
        })
      }
    )
  })
}

interface GitFileChange {
  path: string
  status: 'M' | 'A' | 'D' | 'R' | '?' | '!'
  staged: boolean
}

function parseGitStatus(porcelain: string): GitFileChange[] {
  if (!porcelain) return []
  const files: GitFileChange[] = []
  const lines = porcelain.split('\n').filter(Boolean)

  for (const line of lines) {
    if (line.length < 4) continue
    const x = line[0] // index/staged status
    const y = line[1] // working tree status
    const filePath = line.slice(3)

    // Staged changes (index status)
    if (x !== ' ' && x !== '?') {
      const stagedStatus: GitFileChange['status'] =
        x === 'M' ? 'M' :
        x === 'A' ? 'A' :
        x === 'D' ? 'D' :
        x === 'R' ? 'R' : 'M'
      files.push({ path: filePath, status: stagedStatus, staged: true })
    }

    // Unstaged changes (working tree status)
    if (y !== ' ') {
      const unstagedStatus: GitFileChange['status'] =
        y === 'M' ? 'M' :
        y === 'D' ? 'D' :
        y === '?' ? '?' :
        y === '!' ? '!' : 'M'
      // Avoid duplicate entry for the same file if both staged and unstaged
      const alreadyStaged = files.some(f => f.path === filePath && f.staged)
      if (!alreadyStaged || y !== ' ') {
        files.push({ path: filePath, status: unstagedStatus, staged: false })
      }
    }
  }

  return files
}

interface GitLogEntry {
  hash: string
  message: string
  author: string
  date: string
  filesChanged: number
}

function parseGitLog(logOutput: string): GitLogEntry[] {
  if (!logOutput) return []
  const entries: GitLogEntry[] = []
  const lines = logOutput.split('\n').filter(Boolean)

  for (const line of lines) {
    // Format: hash|||message|||author|||date|||filesChanged
    const parts = line.split('|||')
    if (parts.length >= 4) {
      entries.push({
        hash: parts[0],
        message: parts[1],
        author: parts[2],
        date: parts[3],
        filesChanged: parseInt(parts[4] || '0', 10),
      })
    }
  }

  return entries
}

// POST: Execute git operations
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, message, files, branch, remote } = body as {
      action: string
      message?: string
      files?: string[]
      branch?: string
      remote?: string
    }

    switch (action) {
      case 'status': {
        const [statusResult, branchResult] = await Promise.all([
          execGit('git status --porcelain=v1'),
          execGit('git rev-parse --abbrev-ref HEAD'),
        ])

        const currentBranch = branchResult.stdout || 'main'
        const changedFiles = parseGitStatus(statusResult.stdout)

        // Get branch list
        const branchesResult = await execGit('git branch --list --format="%(refname:short)|||%(HEAD)|||%(committerdate:iso8601)"')
        const branches = branchesResult.stdout.split('\n').filter(Boolean).map((line) => {
          const parts = line.replace(/"/g, '').split('|||')
          return {
            name: parts[0]?.trim() || '',
            isCurrent: parts[1]?.trim() === '*' || false,
            lastCommitDate: parts[2]?.trim() || new Date().toISOString(),
          }
        }).filter(b => b.name)

        return NextResponse.json({
          currentBranch,
          branches,
          changedFiles,
          clean: changedFiles.length === 0,
        })
      }

      case 'commit': {
        if (!message?.trim()) {
          return NextResponse.json({ error: 'Commit message is required' }, { status: 400 })
        }

        // Stage all changed files if specific files not provided
        if (files && files.length > 0) {
          for (const file of files) {
            await execGit(`git add "${file}"`)
          }
        } else {
          await execGit('git add -A')
        }

        // Create the commit
        const commitResult = await execGit(`git commit -m "${message.replace(/"/g, '\\"')}"`)

        if (commitResult.exitCode !== 0) {
          // Check if there's nothing to commit
          if (commitResult.stdout.includes('nothing to commit') || commitResult.stdout.includes('no changes added')) {
            return NextResponse.json({ error: 'Nothing to commit', success: false }, { status: 400 })
          }
          return NextResponse.json({
            error: commitResult.stderr || commitResult.stdout || 'Commit failed',
            success: false,
          }, { status: 500 })
        }

        // Get the commit hash
        const hashResult = await execGit('git rev-parse --short HEAD')

        return NextResponse.json({
          success: true,
          hash: hashResult.stdout,
          message: commitResult.stdout,
        })
      }

      case 'push': {
        const remoteName = remote || 'origin'
        // Get current branch
        const branchResult = await execGit('git rev-parse --abbrev-ref HEAD')
        const currentBranch = branchResult.stdout || 'main'

        const pushResult = await execGit(`git push ${remoteName} ${currentBranch} 2>&1`)

        return NextResponse.json({
          success: pushResult.exitCode === 0,
          message: pushResult.stdout || pushResult.stderr,
          branch: currentBranch,
        })
      }

      case 'pull': {
        const remoteName = remote || 'origin'
        const branchResult = await execGit('git rev-parse --abbrev-ref HEAD')
        const currentBranch = branchResult.stdout || 'main'

        const pullResult = await execGit(`git pull ${remoteName} ${currentBranch} 2>&1`)

        return NextResponse.json({
          success: pullResult.exitCode === 0,
          message: pullResult.stdout || pullResult.stderr,
          branch: currentBranch,
        })
      }

      case 'stage': {
        if (!files || files.length === 0) {
          return NextResponse.json({ error: 'Files are required for staging' }, { status: 400 })
        }
        for (const file of files) {
          await execGit(`git add "${file}"`)
        }
        return NextResponse.json({ success: true, staged: files })
      }

      case 'unstage': {
        if (!files || files.length === 0) {
          return NextResponse.json({ error: 'Files are required for unstaging' }, { status: 400 })
        }
        for (const file of files) {
          await execGit(`git reset HEAD "${file}"`)
        }
        return NextResponse.json({ success: true, unstaged: files })
      }

      case 'checkout': {
        if (!branch) {
          return NextResponse.json({ error: 'Branch name is required' }, { status: 400 })
        }
        const checkoutResult = await execGit(`git checkout "${branch}"`)
        if (checkoutResult.exitCode !== 0) {
          return NextResponse.json({
            error: checkoutResult.stderr || 'Checkout failed',
            success: false,
          }, { status: 500 })
        }
        return NextResponse.json({ success: true, branch })
      }

      case 'create-branch': {
        if (!branch) {
          return NextResponse.json({ error: 'Branch name is required' }, { status: 400 })
        }
        const createResult = await execGit(`git checkout -b "${branch}"`)
        if (createResult.exitCode !== 0) {
          return NextResponse.json({
            error: createResult.stderr || 'Branch creation failed',
            success: false,
          }, { status: 500 })
        }
        return NextResponse.json({ success: true, branch })
      }

      case 'delete-branch': {
        if (!branch) {
          return NextResponse.json({ error: 'Branch name is required' }, { status: 400 })
        }
        const deleteResult = await execGit(`git branch -d "${branch}"`)
        if (deleteResult.exitCode !== 0) {
          return NextResponse.json({
            error: deleteResult.stderr || 'Branch deletion failed',
            success: false,
          }, { status: 500 })
        }
        return NextResponse.json({ success: true, deletedBranch: branch })
      }

      case 'diff': {
        const file = files?.[0]
        let diffCmd = 'git diff'
        if (file) {
          diffCmd = `git diff -- "${file}"`
        }
        const diffResult = await execGit(diffCmd)
        return NextResponse.json({
          diff: diffResult.stdout,
          file: file || null,
        })
      }

      case 'log': {
        const count = body.count || 20
        const logResult = await execGit(
          `git log --pretty=format:"%h|||%s|||%an|||%ai|||" --numstat -${count} | head -200`
        )

        // Parse a simpler format
        const simpleLogResult = await execGit(
          `git log -${count} --pretty=format:"%h|||%s|||%an|||%ai"`
        )
        const commits = parseGitLog(simpleLogResult.stdout)

        return NextResponse.json({ commits })
      }

      case 'discard': {
        if (!files || files.length === 0) {
          return NextResponse.json({ error: 'Files are required' }, { status: 400 })
        }
        for (const file of files) {
          await execGit(`git checkout -- "${file}"`)
        }
        return NextResponse.json({ success: true, discarded: files })
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (error) {
    console.error('Git API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET: Quick status check
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'status'

    if (action === 'status') {
      const [statusResult, branchResult] = await Promise.all([
        execGit('git status --porcelain=v1'),
        execGit('git rev-parse --abbrev-ref HEAD'),
      ])

      const currentBranch = branchResult.stdout || 'main'
      const changedFiles = parseGitStatus(statusResult.stdout)

      return NextResponse.json({
        currentBranch,
        changedFiles,
        clean: changedFiles.length === 0,
      })
    }

    if (action === 'branches') {
      const branchesResult = await execGit('git branch --list --format="%(refname:short)|||%(HEAD)|||%(committerdate:iso8601)"')
      const branches = branchesResult.stdout.split('\n').filter(Boolean).map((line) => {
        const parts = line.replace(/"/g, '').split('|||')
        return {
          name: parts[0]?.trim() || '',
          isCurrent: parts[1]?.trim() === '*' || false,
          lastCommitDate: parts[2]?.trim() || new Date().toISOString(),
        }
      }).filter(b => b.name)

      const currentBranch = branches.find(b => b.isCurrent)?.name || 'main'

      return NextResponse.json({ currentBranch, branches })
    }

    if (action === 'log') {
      const count = url.searchParams.get('count') || '20'
      const simpleLogResult = await execGit(
        `git log -${count} --pretty=format:"%h|||%s|||%an|||%ai"`
      )
      const commits = parseGitLog(simpleLogResult.stdout)
      return NextResponse.json({ commits })
    }

    if (action === 'diff') {
      const file = url.searchParams.get('file')
      const diffCmd = file ? `git diff -- "${file}"` : 'git diff'
      const diffResult = await execGit(diffCmd)
      return NextResponse.json({ diff: diffResult.stdout, file })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (error) {
    console.error('Git API GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
