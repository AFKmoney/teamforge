import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'
import { broadcastEvent } from '@/lib/ws-broadcast'

// Role → task type compatibility map for auto-assignment
const ROLE_TASK_COMPAT: Record<string, string[]> = {
  architect: ['feature'],
  developer: ['feature', 'bugfix', 'refactor'],
  reviewer: [], // special: handles tasks in 'in_review' status
  tester: ['test'],
  devops: ['infra'],
  pm: ['docs'],
}

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
      where: { status: { notIn: ['idle', 'sleeping'] } },
    })

    const sleepingAgents = await db.agent.findMany({
      where: { status: 'sleeping' },
    })

    return NextResponse.json({
      pendingTasks,
      freeAgents,
      busyAgents,
      sleepingAgents,
      summary: {
        pendingCount: pendingTasks.length,
        freeAgentCount: freeAgents.length,
        busyAgentCount: busyAgents.length,
        sleepingAgentCount: sleepingAgents.length,
      },
    })
  } catch (error) {
    console.error('Scheduler status error:', error)
    return NextResponse.json({ error: 'Failed to get scheduler status' }, { status: 500 })
  }
}

// POST /api/agent-scheduler - Trigger scheduler
// Accepts: { action: 'tick' | 'play' | 'stop' | 'pause' | 'assign', projectId?, agentId?, yoloMode? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { action = 'tick', projectId, agentId, yoloMode = false } = body as {
      action?: string
      projectId?: string
      agentId?: string
      yoloMode?: boolean
    }

    switch (action) {
      case 'play':
        return handlePlay(projectId, yoloMode)
      case 'stop':
        return handleStop(projectId)
      case 'pause':
        return handlePause(projectId)
      case 'assign':
        return handleAutoAssign(projectId, yoloMode)
      case 'tick':
      default:
        return handleTick(projectId, agentId, yoloMode)
    }
  } catch (error) {
    console.error('Scheduler error:', error)
    return NextResponse.json({ error: 'Scheduler failed' }, { status: 500 })
  }
}

// ===================== ACTION HANDLERS =====================

/**
 * Play: Start all idle agents → they pick up tasks via auto-assign
 * When yoloMode is true, auto-assign and immediately start executing tasks
 */
async function handlePlay(projectId?: string, yoloMode: boolean = false) {
  try {
    // Find all idle and sleeping agents
    const agents = await db.agent.findMany({
      where: { status: { in: ['idle', 'sleeping'] } },
    })

    if (agents.length === 0) {
      return NextResponse.json({ message: 'No idle/sleeping agents to start', started: 0 })
    }

    // Wake up sleeping agents
    for (const agent of agents) {
      if (agent.status === 'sleeping') {
        await db.agent.update({
          where: { id: agent.id },
          data: { status: 'idle', lastActive: new Date() },
        })
        broadcastEvent('agent:update', { id: agent.id, status: 'idle', lastActive: new Date().toISOString() })
      }
    }

    // Auto-assign tasks to idle agents
    const assignResult = await autoAssignTasks(projectId, yoloMode)

    // In YOLO mode, immediately execute tasks for all assigned agents
    if (yoloMode && assignResult.assignments.length > 0) {
      const executionResults: unknown[] = []
      for (const assignment of assignResult.assignments) {
        try {
          const result = await executeTask(assignment.taskId, assignment.agentId)
          const data = await result.json()
          executionResults.push(data)
        } catch (e) {
          console.error('YOLO mode auto-execution error:', e)
        }
      }
      return NextResponse.json({
        message: `Started ${agents.length} agents in YOLO mode`,
        started: agents.length,
        assigned: assignResult.assigned,
        assignments: assignResult.assignments,
        yoloMode: true,
        executed: executionResults.length,
      })
    }

    return NextResponse.json({
      message: `Started ${agents.length} agents`,
      started: agents.length,
      assigned: assignResult.assigned,
      assignments: assignResult.assignments,
    })
  } catch (error) {
    console.error('Play error:', error)
    return NextResponse.json({ error: 'Failed to start agents' }, { status: 500 })
  }
}

/**
 * Stop: Stop all agents → set to idle, unassign current tasks
 */
async function handleStop(projectId?: string) {
  try {
    const taskFilter: Record<string, unknown> = {}
    if (projectId) taskFilter.projectId = projectId

    // Find all busy agents (not idle and not sleeping)
    const busyAgents = await db.agent.findMany({
      where: { status: { notIn: ['idle', 'sleeping'] } },
    })

    // Reset all busy agents to idle
    for (const agent of busyAgents) {
      await db.agent.update({
        where: { id: agent.id },
        data: { status: 'idle', currentTaskId: null, lastActive: new Date() },
      })
      broadcastEvent('agent:update', { id: agent.id, status: 'idle', currentTaskId: null, lastActive: new Date().toISOString() })

      // Log the stop
      await db.agentActivity.create({
        data: {
          agentId: agent.id,
          action: 'status_change',
          description: `${agent.name} status changed to idle`,
          metadata: JSON.stringify({ previousStatus: agent.status, newStatus: 'idle', action: 'stop' }),
        },
      })
    }

    // Move in_progress tasks back to todo
    const inProgressTasks = await db.task.findMany({
      where: { ...taskFilter, status: 'in_progress' },
    })

    for (const task of inProgressTasks) {
      await db.task.update({
        where: { id: task.id },
        data: { status: 'todo', assigneeId: null },
      })
      broadcastEvent('task:update', { id: task.id, status: 'todo', assigneeId: null })
    }

    return NextResponse.json({
      message: `Stopped ${busyAgents.length} agents, reverted ${inProgressTasks.length} tasks`,
      stopped: busyAgents.length,
      revertedTasks: inProgressTasks.length,
    })
  } catch (error) {
    console.error('Stop error:', error)
    return NextResponse.json({ error: 'Failed to stop agents' }, { status: 500 })
  }
}

/**
 * Pause: Pause all agents → set to sleeping
 */
async function handlePause(projectId?: string) {
  try {
    // Find all agents that are not sleeping
    const activeAgents = await db.agent.findMany({
      where: { status: { notIn: ['sleeping'] } },
    })

    for (const agent of activeAgents) {
      await db.agent.update({
        where: { id: agent.id },
        data: { status: 'sleeping', lastActive: new Date() },
      })
      broadcastEvent('agent:update', { id: agent.id, status: 'sleeping', lastActive: new Date().toISOString() })

      // Log the pause
      await db.agentActivity.create({
        data: {
          agentId: agent.id,
          action: 'status_change',
          description: `${agent.name} status changed to sleeping`,
          metadata: JSON.stringify({ previousStatus: agent.status, newStatus: 'sleeping', action: 'pause' }),
        },
      })
    }

    return NextResponse.json({
      message: `Paused ${activeAgents.length} agents`,
      paused: activeAgents.length,
    })
  } catch (error) {
    console.error('Pause error:', error)
    return NextResponse.json({ error: 'Failed to pause agents' }, { status: 500 })
  }
}

/**
 * Auto-assign: Find unassigned tasks and match them to idle agents based on role
 */
async function handleAutoAssign(projectId?: string, yoloMode: boolean = false) {
  const result = await autoAssignTasks(projectId, yoloMode)
  return NextResponse.json(result)
}

/**
 * Tick: Find ONE task with an idle agent and execute it
 * When yoloMode is true, auto-assign and immediately execute all tasks
 */
async function handleTick(projectId?: string, specificAgentId?: string, yoloMode: boolean = false) {
  try {
    // First, auto-assign any unassigned tasks
    await autoAssignTasks(projectId, yoloMode)

    // In YOLO mode, process all pending tasks (not just one)
    if (yoloMode) {
      const allTodoFilter: Record<string, unknown> = {
        status: 'todo',
        assigneeId: { not: null },
      }
      if (projectId) allTodoFilter.projectId = projectId

      const allPendingTasks = await db.task.findMany({
        where: allTodoFilter,
        include: { assignee: true },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' },
        ],
      })

      const executionResults: unknown[] = []
      for (const pendingTask of allPendingTasks) {
        if (pendingTask.assigneeId) {
          const agent = await db.agent.findUnique({ where: { id: pendingTask.assigneeId } })
          if (agent && agent.status === 'idle') {
            try {
              const result = await executeTask(pendingTask.id, agent.id)
              const data = await result.json()
              executionResults.push(data)
            } catch (e) {
              console.error('YOLO tick execution error:', e)
            }
          }
        }
      }

      if (executionResults.length > 0) {
        return NextResponse.json({
          message: `YOLO mode: executed ${executionResults.length} tasks`,
          executed: executionResults.length,
          yoloMode: true,
          results: executionResults,
        })
      }
    }

    // Find ONE task that's in 'todo' status with an assigned agent that is idle
    const taskFilter: Record<string, unknown> = {
      status: 'todo',
      assigneeId: { not: null },
    }
    if (projectId) taskFilter.projectId = projectId

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
      // Check for in_review tasks that a reviewer can pick up
      const reviewTasks = await db.task.findMany({
        where: { status: 'in_review', assigneeId: null },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        take: 1,
      })

      if (reviewTasks.length > 0) {
        // Find an idle reviewer
        const reviewer = await db.agent.findFirst({
          where: { role: 'reviewer', status: 'idle' },
        })
        if (reviewer) {
          await db.task.update({
            where: { id: reviewTasks[0].id },
            data: { assigneeId: reviewer.id },
          })
          // Now execute with this reviewer
          return executeTask(reviewTasks[0].id, reviewer.id)
        }
      }

      return NextResponse.json({
        message: 'No pending tasks with idle agents',
        executed: 0,
      })
    }

    const task = pendingTasks[0]
    if (!task.assigneeId || !task.assignee) {
      return NextResponse.json({ message: 'No assignee', executed: 0 })
    }

    // If specific agent requested, only execute if it matches
    if (specificAgentId && task.assigneeId !== specificAgentId) {
      // Check if the specific agent has a task
      const agentTask = await db.task.findFirst({
        where: { assigneeId: specificAgentId, status: 'todo' },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      })
      if (agentTask) {
        return executeTask(agentTask.id, specificAgentId)
      }
      return NextResponse.json({ message: 'Specified agent has no tasks', executed: 0 })
    }

    // Check if the agent is idle
    const agent = await db.agent.findUnique({ where: { id: task.assigneeId } })
    if (!agent || (agent.status !== 'idle')) {
      return NextResponse.json({ message: 'Agent busy', executed: 0 })
    }

    return executeTask(task.id, agent.id)
  } catch (error) {
    console.error('Tick error:', error)
    return NextResponse.json({ error: 'Scheduler tick failed' }, { status: 500 })
  }
}

// ===================== CORE FUNCTIONS =====================

/**
 * Auto-assign unassigned tasks to idle agents based on role compatibility
 */
async function autoAssignTasks(projectId?: string, yoloMode: boolean = false): Promise<{ assigned: number; assignments: Array<{ taskId: string; taskTitle: string; agentId: string; agentName: string }> }> {
  const assignments: Array<{ taskId: string; taskTitle: string; agentId: string; agentName: string }> = []

  // Find unassigned todo tasks
  const taskFilter: Record<string, unknown> = {
    status: 'todo',
    assigneeId: null,
  }
  if (projectId) taskFilter.projectId = projectId

  const unassignedTasks = await db.task.findMany({
    where: taskFilter,
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'asc' },
    ],
  })

  if (unassignedTasks.length === 0) {
    return { assigned: 0, assignments }
  }

  // Find idle agents
  const idleAgents = await db.agent.findMany({
    where: { status: 'idle' },
    select: { id: true, name: true, role: true, tasksCompleted: true, successRate: true },
  })

  if (idleAgents.length === 0) {
    return { assigned: 0, assignments }
  }

  // Track which agents have been assigned in this batch
  const assignedAgentIds = new Set<string>()

  for (const task of unassignedTasks) {
    // Find the best agent for this task
    const bestAgent = findBestAgent(task.type, task.status, idleAgents, assignedAgentIds)

    if (bestAgent) {
      await db.task.update({
        where: { id: task.id },
        data: { assigneeId: bestAgent.id },
      })
      broadcastEvent('task:update', { id: task.id, assigneeId: bestAgent.id })

      // Log assignment activity
      await db.agentActivity.create({
        data: {
          agentId: bestAgent.id,
          action: 'task_assigned',
          description: yoloMode
            ? `${bestAgent.name} YOLO auto-assigned to task: ${task.title}`
            : `${bestAgent.name} auto-assigned to task: ${task.title}`,
          metadata: JSON.stringify({ taskId: task.id, taskType: task.type, action: yoloMode ? 'yolo_auto_assign' : 'auto_assign', yoloMode }),
        },
      })
      broadcastEvent('activity:new', { agentId: bestAgent.id, action: 'task_assigned' })

      assignedAgentIds.add(bestAgent.id)
      assignments.push({
        taskId: task.id,
        taskTitle: task.title,
        agentId: bestAgent.id,
        agentName: bestAgent.name,
      })
    }
  }

  return { assigned: assignments.length, assignments }
}

/**
 * Find the best agent for a task based on role compatibility
 */
interface AgentPick { id: string; name: string; role: string; tasksCompleted: number; successRate: number }

function findBestAgent(
  taskType: string,
  taskStatus: string,
  idleAgents: AgentPick[],
  alreadyAssigned: Set<string>,
): AgentPick | null {
  // Special handling for in_review tasks → reviewer
  if (taskStatus === 'in_review') {
    const reviewer = idleAgents.find(a => a.role === 'reviewer' && !alreadyAssigned.has(a.id))
    if (reviewer) return reviewer
  }

  // Role-based assignment
  const compatibleRoles = ROLE_TASK_COMPAT
  const compatibleAgents = idleAgents
    .filter(a => !alreadyAssigned.has(a.id))
    .filter(a => {
      const compatibleTypes = compatibleRoles[a.role]
      return compatibleTypes && compatibleTypes.includes(taskType)
    })
    .sort((a, b) => {
      // Prefer agents with higher success rate, then more tasks completed
      if (a.successRate !== b.successRate) return b.successRate - a.successRate
      return b.tasksCompleted - a.tasksCompleted
    })

  if (compatibleAgents.length > 0) return compatibleAgents[0]

  // Fallback: developer can handle any task type
  const developer = idleAgents.find(a => a.role === 'developer' && !alreadyAssigned.has(a.id))
  if (developer) return developer

  // Last resort: any idle agent
  const anyAgent = idleAgents.find(a => !alreadyAssigned.has(a.id))
  return anyAgent || null
}

/**
 * Execute a task: update statuses, call LLM, parse actions, update task
 */
async function executeTask(taskId: string, agentId: string) {
  const task = await db.task.findUnique({ where: { id: taskId } })
  const agent = await db.agent.findUnique({ where: { id: agentId } })

  if (!task || !agent) {
    return NextResponse.json({ message: 'Task or agent not found', executed: 0 })
  }

  try {
    // Update agent status to working
    const workStatus = getWorkStatus(agent.role)
    await db.agent.update({
      where: { id: agent.id },
      data: { status: workStatus, currentTaskId: task.id, lastActive: new Date() },
    })
    broadcastEvent('agent:update', { id: agent.id, status: workStatus, currentTaskId: task.id, lastActive: new Date().toISOString() })

    // Update task status to in_progress
    await db.task.update({
      where: { id: task.id },
      data: { status: 'in_progress' },
    })
    broadcastEvent('task:update', { id: task.id, status: 'in_progress' })

    // Log task started activity
    const startActivity = await db.agentActivity.create({
      data: {
        agentId: agent.id,
        action: 'task_started',
        description: `${agent.name} started working on: ${task.title}`,
        metadata: JSON.stringify({ taskId: task.id, taskType: task.type, taskPriority: task.priority }),
      },
      include: { agent: true },
    })
    broadcastEvent('activity:new', startActivity)

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
      model: 'glm-5.1',
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
              const newMsg = await db.message.create({
                data: {
                  projectId: task.projectId,
                  agentId: agent.id,
                  content: action.content,
                  type: 'chat',
                  metadata: JSON.stringify({ sender: 'agent', taskTitle: task.title }),
                },
                include: { agent: true },
              })
              broadcastEvent('message:new', newMsg)
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
                    output: action.output || '',
                    ...(action.status === 'done' ? { completedAt: new Date() } : {}),
                  },
                })
                broadcastEvent('task:update', { id: task.id, status: action.status })
                executedActions.push(`Task status → ${action.status}`)
              }
            }
            break
          }
          case 'create_task': {
            if (action.title) {
              const newTask = await db.task.create({
                data: {
                  projectId: task.projectId,
                  title: action.title,
                  description: action.description || '',
                  priority: action.priority || 'medium',
                  type: action.taskType || 'feature',
                  status: 'todo',
                },
                include: { assignee: true },
              })
              broadcastEvent('task:update', newTask)
              executedActions.push(`Created task: ${action.title}`)
            }
            break
          }
        }
      } catch (e) {
        console.error('Action execution error:', e)
      }
    }

    // Determine final task status if not explicitly set by actions
    const updatedTask = await db.task.findUnique({ where: { id: task.id } })
    let finalStatus = updatedTask?.status || 'in_progress'

    // If the LLM didn't update the task status, move it forward based on role
    if (finalStatus === 'in_progress') {
      if (agent.role === 'reviewer') {
        finalStatus = 'done' // Reviewers mark tasks as done after review
        await db.task.update({
          where: { id: task.id },
          data: { status: 'done', completedAt: new Date(), output: actions.length > 0 ? `Review completed. ${executedActions.join(', ')}` : 'Review completed.' },
        })
      } else if (agent.role === 'tester') {
        finalStatus = 'in_review' // Testers move to review
        await db.task.update({
          where: { id: task.id },
          data: { status: 'in_review', output: `Testing completed. ${executedActions.join(', ')}` },
        })
      } else if (executedActions.length > 0) {
        // If actions were executed, move to in_review
        finalStatus = 'in_review'
        await db.task.update({
          where: { id: task.id },
          data: { status: 'in_review', output: executedActions.join('\n') },
        })
      }
      broadcastEvent('task:update', { id: task.id, status: finalStatus })
    }

    // Log activity for task completion
    const completeActivity = await db.agentActivity.create({
      data: {
        agentId: agent.id,
        action: executedActions.some(a => a.includes('Wrote file')) ? 'code_written' : 'task_completed',
        description: `${agent.name} completed: ${task.title}. Actions: ${executedActions.join(', ') || 'analysis only'}`,
        metadata: JSON.stringify({ taskId: task.id, actions: executedActions, finalStatus }),
      },
      include: { agent: true },
    })
    broadcastEvent('activity:new', completeActivity)

    // Reset agent to idle
    await db.agent.update({
      where: { id: agent.id },
      data: {
        status: 'idle',
        currentTaskId: null,
        lastActive: new Date(),
        tasksCompleted: { increment: 1 },
        tokensUsed: { increment: Math.floor(content.length * 0.5) },
      },
    })
    broadcastEvent('agent:update', { id: agent.id, status: 'idle', currentTaskId: null, lastActive: new Date().toISOString() })

    return NextResponse.json({
      executed: 1,
      taskTitle: task.title,
      agentName: agent.name,
      actions: executedActions,
      finalStatus,
    })
  } catch (error) {
    console.error('Agent execution error:', error)

    // Reset agent to idle on error
    await db.agent.update({
      where: { id: agent.id },
      data: { status: 'idle', currentTaskId: null },
    }).catch(() => {})
    broadcastEvent('agent:update', { id: agent.id, status: 'idle', currentTaskId: null })

    // Log error activity
    await db.agentActivity.create({
      data: {
        agentId: agent.id,
        action: 'status_change',
        description: `${agent.name} status changed to idle (error while working on: ${task.title})`,
        metadata: JSON.stringify({ taskId: task.id, previousStatus: getWorkStatus(agent.role), newStatus: 'idle', error: true, errorMessage: error instanceof Error ? error.message : 'Unknown error' }),
      },
    }).catch(() => {})

    return NextResponse.json({
      executed: 0,
      error: 'Agent execution failed',
      taskTitle: task.title,
    })
  }
}

// ===================== HELPERS =====================

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

function getAgentPrompt(agent: { name: string; role: string }, task: { title: string; description: string; type: string; priority: string }): string {
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
    {"type": "update_task", "status": "in_review", "output": "Summary of work done"},
    {"type": "create_task", "title": "Follow-up task", "description": "...", "priority": "medium", "taskType": "test"}
  ]
}
\`\`\`

Action types:
- write_file: Create or update a file. Include path, content, and optionally language.
- message: Send a message to the team chat about your progress.
- update_task: Update the current task status (todo, in_progress, in_review, done) and optionally add output.
- create_task: Create a new follow-up task.

Current task: ${task.title}
Task type: ${task.type}
Task priority: ${task.priority}
Task description: ${task.description}

Write REAL, COMPLETE code - no placeholders, no TODOs, no "implementation goes here". The code must be production-ready.`
}

interface ParsedAction {
  type: string
  path?: string
  content?: string
  status?: string
  output?: string
  title?: string
  description?: string
  priority?: string
  taskType?: string
  language?: string
}

function parseActions(content: string): ParsedAction[] {
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
