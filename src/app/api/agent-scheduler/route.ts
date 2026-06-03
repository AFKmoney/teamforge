import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'

// GET /api/agent-scheduler - Get scheduler status
export async function GET() {
  try {
    const pendingTasks = await db.task.findMany({
      where: {
        status: { in: ['todo', 'in_progress'] },
        assigneeId: { not: null },
      },
      include: { assignee: true },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    })

    const freeAgents = await db.agent.findMany({
      where: { status: 'idle' },
    })

    const busyAgents = await db.agent.findMany({
      where: { status: { not: 'idle' } },
    })

    return NextResponse.json({
      pendingTasks,
      freeAgents,
      busyAgents,
      summary: {
        pendingCount: pendingTasks.length,
        freeAgentCount: freeAgents.length,
        busyAgentCount: busyAgents.length,
      },
    })
  } catch (error) {
    console.error('Scheduler status error:', error)
    return NextResponse.json({ error: 'Failed to get scheduler status' }, { status: 500 })
  }
}

// POST /api/agent-scheduler - Trigger scheduler to assign and execute ONE task
// This is intentionally lightweight - only one task per tick to avoid blocking
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { projectId } = body

    // Find ONE task with status 'todo' or 'in_progress' assigned to an idle agent
    const taskFilter: Record<string, unknown> = {
      status: { in: ['todo'] },
      assigneeId: { not: null },
    }
    if (projectId) {
      taskFilter.projectId = projectId
    }

    const pendingTasks = await db.task.findMany({
      where: taskFilter,
      include: { assignee: true },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
      take: 1,
    })

    if (pendingTasks.length === 0) {
      return NextResponse.json({
        message: 'No pending tasks with idle agents',
        executed: 0,
      })
    }

    const task = pendingTasks[0]
    if (!task.assigneeId || !task.assignee) {
      return NextResponse.json({ message: 'No assignee', executed: 0 })
    }

    // Check if the agent is idle
    const agent = await db.agent.findUnique({ where: { id: task.assigneeId } })
    if (!agent || agent.status !== 'idle') {
      return NextResponse.json({ message: 'Agent busy', executed: 0 })
    }

    // Execute the task directly (no internal fetch loop)
    try {
      // Update agent status
      const workStatus = getWorkStatus(agent.role)
      await db.agent.update({
        where: { id: agent.id },
        data: { status: workStatus, lastActive: new Date() },
      })

      // Update task status to in_progress
      await db.task.update({
        where: { id: task.id },
        data: { status: 'in_progress' },
      })

      // Get project files for context
      const files = await db.projectFile.findMany({
        where: { projectId: task.projectId, isDirectory: false },
        select: { path: true, content: true, language: true },
        take: 10,
      })

      // Build file context for LLM (file names + first 30 lines each)
      const fileContext = files.map(f => {
        const lines = f.content.split('\n').slice(0, 30).join('\n')
        return `--- ${f.path} (${f.language}) ---\n${lines}`
      }).join('\n\n')

      // Get system prompt based on agent role
      const systemPrompt = getAgentPrompt(agent, task)

      // Call LLM with timeout
      const zai = await ZAI.create()
      const response = await zai.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'assistant', content: systemPrompt },
          { role: 'user', content: `Current project files:\n${fileContext}\n\nPlease work on this task and respond with your actions in the required JSON format.` },
        ],
        thinking: { type: 'disabled' },
      })

      const content = response.choices[0]?.message?.content || ''

      // Parse and execute actions from LLM response
      const actions = parseActions(content)
      const executedActions: string[] = []

      for (const action of actions) {
        try {
          switch (action.type) {
            case 'write_file': {
              if (action.path && action.content !== undefined) {
                // Auto-create parent directories
                const pathParts = action.path.split('/').filter(Boolean)
                for (let i = 1; i < pathParts.length; i++) {
                  const dirPath = '/' + pathParts.slice(0, i).join('/')
                  await db.projectFile.upsert({
                    where: { projectId_path: { projectId: task.projectId, path: dirPath } },
                    update: {},
                    create: { projectId: task.projectId, path: dirPath, isDirectory: true, content: '', language: '' },
                  })
                }
                await db.projectFile.upsert({
                  where: { projectId_path: { projectId: task.projectId, path: action.path } },
                  update: { content: action.content, language: detectLang(action.path), isDirectory: false, updatedAt: new Date() },
                  create: { projectId: task.projectId, path: action.path, content: action.content, language: detectLang(action.path), isDirectory: false },
                })
                executedActions.push(`Wrote file: ${action.path}`)
              }
              break
            }
            case 'message': {
              if (action.content) {
                await db.message.create({
                  data: {
                    projectId: task.projectId,
                    agentId: agent.id,
                    content: action.content,
                    type: 'chat',
                    metadata: JSON.stringify({ sender: 'agent', taskTitle: task.title }),
                  },
                })
                executedActions.push(`Sent message`)
              }
              break
            }
            case 'update_task': {
              if (action.status) {
                const validStatuses = ['todo', 'in_progress', 'in_review', 'done']
                if (validStatuses.includes(action.status)) {
                  await db.task.update({
                    where: { id: task.id },
                    data: {
                      status: action.status,
                      ...(action.status === 'done' ? { completedAt: new Date() } : {}),
                    },
                  })
                  executedActions.push(`Task status → ${action.status}`)
                }
              }
              break
            }
            case 'create_task': {
              if (action.title) {
                await db.task.create({
                  data: {
                    projectId: task.projectId,
                    title: action.title,
                    description: action.description || '',
                    priority: action.priority || 'medium',
                    type: action.taskType || 'feature',
                    status: 'todo',
                  },
                })
                executedActions.push(`Created task: ${action.title}`)
              }
              break
            }
          }
        } catch (e) {
          console.error('Action execution error:', e)
        }
      }

      // Log activity
      await db.agentActivity.create({
        data: {
          agentId: agent.id,
          action: 'task_completed',
          description: `Worked on: ${task.title}. Actions: ${executedActions.join(', ') || 'none'}`,
          metadata: JSON.stringify({ taskId: task.id, actions: executedActions }),
        },
      })

      // Reset agent to idle
      await db.agent.update({
        where: { id: agent.id },
        data: { status: 'idle', lastActive: new Date(), tasksCompleted: { increment: 1 }, tokensUsed: { increment: Math.floor(content.length * 0.5) } },
      })

      return NextResponse.json({
        executed: 1,
        taskTitle: task.title,
        agentName: agent.name,
        actions: executedActions,
      })
    } catch (error) {
      console.error('Agent execution error:', error)

      // Reset agent to idle on error
      await db.agent.update({
        where: { id: agent.id },
        data: { status: 'idle' },
      }).catch(() => {})

      return NextResponse.json({
        executed: 0,
        error: 'Agent execution failed',
        taskTitle: task.title,
      })
    }
  } catch (error) {
    console.error('Scheduler error:', error)
    return NextResponse.json({ error: 'Scheduler failed' }, { status: 500 })
  }
}

function getWorkStatus(role: string): string {
  const map: Record<string, string> = {
    architect: 'thinking',
    developer: 'coding',
    reviewer: 'reviewing',
    tester: 'testing',
    devops: 'deploying',
    pm: 'thinking',
  }
  return map[role] || 'thinking'
}

function getAgentPrompt(agent: { name: string; role: string }, task: { title: string; description: string }): string {
  const roleDescriptions: Record<string, string> = {
    architect: 'You are a system architect. Design architectures, create design documents, and define API schemas.',
    developer: 'You are a senior developer. Write production-quality, complete code implementations.',
    reviewer: 'You are a code reviewer. Review code for quality, security, and suggest improvements.',
    tester: 'You are a test engineer. Write comprehensive test files with proper assertions.',
    devops: 'You are a DevOps engineer. Create CI/CD configs, Dockerfiles, and deployment scripts.',
    pm: 'You are a project manager. Break down tasks, organize work, and create follow-up tasks.',
  }

  return `${roleDescriptions[agent.role] || 'You are an AI agent.'}

Your name is ${agent.name}. You are working on a software project in an autonomous IDE with other AI agents.

IMPORTANT: You must respond with a JSON object containing your thoughts and actions. Use this exact format:
\`\`\`json
{
  "thoughts": "Brief description of your analysis",
  "actions": [
    {"type": "write_file", "path": "/path/to/file.tsx", "content": "file content here", "language": "typescript"},
    {"type": "message", "content": "Description of what you did"},
    {"type": "update_task", "status": "in_review"},
    {"type": "create_task", "title": "Follow-up task", "description": "...", "priority": "medium", "taskType": "test"}
  ]
}
\`\`\`

Action types:
- write_file: Create or update a file. Include path, content, and optionally language.
- message: Send a message to the team chat about your progress.
- update_task: Update the current task status (todo, in_progress, in_review, done).
- create_task: Create a new follow-up task.

Current task: ${task.title}
Task description: ${task.description}

Write REAL, COMPLETE code - no placeholders, no TODOs, no "implementation goes here". The code must be production-ready.`
}

function parseActions(content: string): Array<Record<string, unknown>> {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*"actions"[\s\S]*\}/)
    if (!jsonMatch) return []

    const jsonStr = jsonMatch[1] || jsonMatch[0]
    const parsed = JSON.parse(jsonStr)

    if (parsed.actions && Array.isArray(parsed.actions)) {
      return parsed.actions
    }
    return []
  } catch {
    return []
  }
}

function detectLang(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    css: 'css', html: 'html', json: 'json', md: 'markdown',
    yml: 'yaml', yaml: 'yaml', py: 'python', rs: 'rust',
    go: 'go', sql: 'sql', sh: 'bash', prisma: 'prisma',
    dockerfile: 'dockerfile', toml: 'toml', txt: 'plaintext',
  }
  return map[ext] || 'plaintext'
}
