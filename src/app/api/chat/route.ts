import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(req: NextRequest) {
  try {
    const { message, projectId, agentId } = await req.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Handle command-style messages
    if (message.startsWith('/')) {
      return handleCommand(message, projectId, agentId)
    }

    // Save the user message
    const userMessage = await db.message.create({
      data: {
        projectId,
        agentId: agentId || null,
        content: message,
        type: 'chat',
        metadata: JSON.stringify({ sender: 'user' }),
      },
      include: { agent: true },
    })

    // Fetch project context for the LLM
    const [files, tasks, agents] = await Promise.all([
      db.projectFile.findMany({
        where: { projectId, isDirectory: false },
        orderBy: { path: 'asc' },
        take: 20,
      }),
      db.task.findMany({
        where: { projectId },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        include: { assignee: true },
      }),
      db.agent.findMany(),
    ])

    // Build file context summary
    const fileContext = files.map((f) => {
      const lines = f.content.split('\n')
      const preview = lines.slice(0, 30).join('\n')
      const trunc = lines.length > 30 ? '\n... (truncated)' : ''
      return `### ${f.path} (${lines.length} lines)\n\`\`\`\n${preview}${trunc}\n\`\`\``
    }).join('\n\n')

    // Build task context
    const taskContext = tasks.map((t) =>
      `- [${t.status}] ${t.title} (${t.priority} priority, assigned to: ${t.assignee?.name || 'unassigned'})`
    ).join('\n')

    // Build agent context
    const agentContext = agents.map((a) =>
      `- ${a.name} (${a.role}): ${a.status} | Tasks completed: ${a.tasksCompleted} | Success rate: ${(a.successRate * 100).toFixed(0)}%`
    ).join('\n')

    // Get AI response with project context
    const zai = await ZAI.create()
    const response = await zai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `You are an AI development assistant in the TeamForge IDE - an autonomous development platform where AI agents collaborate to build software.

You have access to the current project context. Use this information to give relevant, specific answers.

## Project Files:
${fileContext || 'No files yet.'}

## Current Tasks:
${taskContext || 'No tasks yet.'}

## Agent Team:
${agentContext || 'No agents active.'}

Be concise, helpful, and action-oriented. If you see issues in the code or tasks, mention them. If someone asks about the project state, reference real file names and task statuses.`,
        },
        { role: 'user', content: message },
      ],
      thinking: { type: 'disabled' },
    })

    const aiContent = response.choices[0]?.message?.content || 'I apologize, I could not generate a response.'

    // Save the AI response message
    const aiMessage = await db.message.create({
      data: {
        projectId,
        agentId: agentId || null,
        content: aiContent,
        type: 'chat',
        metadata: JSON.stringify({ sender: 'ai' }),
      },
      include: { agent: true },
    })

    return NextResponse.json({ userMessage, aiMessage })
  } catch (error) {
    console.error('Failed to process chat message:', error)
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 })
  }
}

async function handleCommand(message: string, projectId: string, agentId: string | null) {
  const parts = message.trim().split(/\s+/)
  const command = parts[0].toLowerCase()

  switch (command) {
    case '/create_file': {
      const filePath = parts[1]
      const content = parts.slice(2).join(' ') || ''

      if (!filePath) {
        return NextResponse.json({ error: 'Usage: /create_file <path> [content]' }, { status: 400 })
      }

      // Auto-create parent directories
      const pathParts = filePath.split('/').filter(Boolean)
      for (let i = 1; i < pathParts.length; i++) {
        const dirPath = '/' + pathParts.slice(0, i).join('/')
        await db.projectFile.upsert({
          where: { projectId_path: { projectId, path: dirPath } },
          update: { isDirectory: true, content: '', language: '' },
          create: { projectId, path: dirPath, isDirectory: true, content: '', language: '' },
        })
      }

      const ext = filePath.split('.').pop()?.toLowerCase() || ''
      const langMap: Record<string, string> = {
        ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
        css: 'css', html: 'html', json: 'json', md: 'markdown',
      }

      const file = await db.projectFile.upsert({
        where: { projectId_path: { projectId, path: filePath } },
        update: { content, language: langMap[ext] ?? 'plaintext', isDirectory: false },
        create: { projectId, path: filePath, content, language: langMap[ext] ?? 'plaintext', isDirectory: false },
      })

      // Save as a system message
      const sysMessage = await db.message.create({
        data: {
          projectId,
          content: `Created file: ${filePath}`,
          type: 'code_change',
          metadata: JSON.stringify({ sender: 'system', command: 'create_file', path: filePath }),
        },
      })

      return NextResponse.json({ file, message: sysMessage })
    }

    case '/run_tests': {
      // Find the tester agent and assign/create a test task
      const tester = await db.agent.findFirst({ where: { role: 'tester' } })
      if (!tester) {
        return NextResponse.json({ error: 'No tester agent found' }, { status: 404 })
      }

      const testTask = await db.task.create({
        data: {
          projectId,
          title: 'Run test suite',
          description: 'Execute the full test suite and report results. Focus on any failing tests and provide fixes.',
          status: 'todo',
          priority: 'high',
          type: 'test',
          assigneeId: tester.id,
        },
      })

      const sysMessage = await db.message.create({
        data: {
          projectId,
          agentId: tester.id,
          content: `Test task created and assigned to ${tester.name}. The test agent will pick it up on the next scheduler tick.`,
          type: 'system',
          metadata: JSON.stringify({ sender: 'system', command: 'run_tests', taskId: testTask.id }),
        },
        include: { agent: true },
      })

      return NextResponse.json({ task: testTask, message: sysMessage })
    }

    case '/deploy': {
      // Find the devops agent and assign a deploy task
      const devops = await db.agent.findFirst({ where: { role: 'devops' } })
      if (!devops) {
        return NextResponse.json({ error: 'No DevOps agent found' }, { status: 404 })
      }

      const deployTask = await db.task.create({
        data: {
          projectId,
          title: 'Deploy to staging',
          description: 'Build and deploy the current project to the staging environment. Verify health checks pass.',
          status: 'todo',
          priority: 'high',
          type: 'infra',
          assigneeId: devops.id,
        },
      })

      const sysMessage = await db.message.create({
        data: {
          projectId,
          agentId: devops.id,
          content: `Deploy task created and assigned to ${devops.name}. The DevOps agent will handle deployment on the next scheduler tick.`,
          type: 'system',
          metadata: JSON.stringify({ sender: 'system', command: 'deploy', taskId: deployTask.id }),
        },
        include: { agent: true },
      })

      return NextResponse.json({ task: deployTask, message: sysMessage })
    }

    case '/status': {
      const [tasks, agents, files, recentMessages] = await Promise.all([
        db.task.findMany({ where: { projectId }, include: { assignee: true } }),
        db.agent.findMany(),
        db.projectFile.findMany({ where: { projectId, isDirectory: false } }),
        db.message.findMany({ where: { projectId }, orderBy: { createdAt: 'desc' }, take: 5, include: { agent: true } }),
      ])

      const statusSummary = {
        project: projectId,
        tasks: {
          total: tasks.length,
          backlog: tasks.filter((t) => t.status === 'backlog').length,
          todo: tasks.filter((t) => t.status === 'todo').length,
          in_progress: tasks.filter((t) => t.status === 'in_progress').length,
          in_review: tasks.filter((t) => t.status === 'in_review').length,
          done: tasks.filter((t) => t.status === 'done').length,
          blocked: tasks.filter((t) => t.status === 'blocked').length,
        },
        agents: agents.map((a) => ({ name: a.name, role: a.role, status: a.status, tasksCompleted: a.tasksCompleted })),
        files: files.length,
        recentActivity: recentMessages.map((m) => ({
          from: m.agent?.name || 'User',
          content: m.content.substring(0, 100),
          type: m.type,
        })),
      }

      // Format as a readable message
      const statusText = `**Project Status**

📊 **Tasks**: ${statusSummary.tasks.total} total
  - ✅ Done: ${statusSummary.tasks.done}
  - 🔄 In Progress: ${statusSummary.tasks.in_progress}
  - 👁️ In Review: ${statusSummary.tasks.in_review}
  - 📋 Todo: ${statusSummary.tasks.todo}
  - 📦 Backlog: ${statusSummary.tasks.backlog}
  - 🚫 Blocked: ${statusSummary.tasks.blocked}

👥 **Agents**:
${statusSummary.agents.map((a) => `  - ${a.name} (${a.role}): ${a.status} | ${a.tasksCompleted} tasks completed`).join('\n')}

📁 **Files**: ${statusSummary.files} files in project

🕐 **Recent Activity**:
${statusSummary.recentActivity.map((a) => `  - **${a.from}**: ${a.content}${a.content.length >= 100 ? '...' : ''}`).join('\n')}`

      const statusMessage = await db.message.create({
        data: {
          projectId,
          content: statusText,
          type: 'system',
          metadata: JSON.stringify({ sender: 'system', command: 'status', data: statusSummary }),
        },
      })

      return NextResponse.json({ message: statusMessage, data: statusSummary })
    }

    default:
      return NextResponse.json({
        error: `Unknown command: ${command}. Available: /create_file, /run_tests, /deploy, /status`,
      }, { status: 400 })
  }
}
