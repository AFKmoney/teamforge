import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'
import { buildNvidiaRequest, buildOpenAICompatibleRequest, type AIProviderType } from '@/lib/ai-providers'

interface ChatRequestBody {
  message: string
  projectId: string
  agentId?: string
  chatSessionId?: string
  provider?: AIProviderType
  model?: string
  nvidiaApiKey?: string
  openaiCompatibleBaseUrl?: string
  openaiCompatibleApiKey?: string
  openaiCompatibleModelId?: string
  yoloMode?: boolean
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequestBody = await req.json()
    const {
      message,
      projectId,
      agentId,
      chatSessionId,
      provider = 'zai',
      model = 'deepseek-chat',
      nvidiaApiKey,
      openaiCompatibleBaseUrl,
      openaiCompatibleApiKey,
      openaiCompatibleModelId,
      yoloMode = false,
    } = body

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Handle command-style messages
    if (message.startsWith('/')) {
      return handleCommand(message, projectId, agentId ?? null, provider, model)
    }

    // Save the user message
    const userMessage = await db.message.create({
      data: {
        projectId,
        chatSessionId: chatSessionId || null,
        agentId: agentId || null,
        content: message,
        type: 'chat',
        metadata: JSON.stringify({ sender: 'user', provider, model }),
      },
      include: { agent: true },
    })

    // Fetch project context for the LLM
    const [files, tasks, agents, buildLogs, recentMessages] = await Promise.all([
      db.projectFile.findMany({
        where: { projectId },
        orderBy: { path: 'asc' },
      }),
      db.task.findMany({
        where: { projectId },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        include: { assignee: true },
      }),
      db.agent.findMany(),
      db.buildLog.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
      db.message.findMany({
        where: { projectId, type: 'chat' },
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: { agent: true },
      }),
    ])

    // Build context-aware system prompt
    const systemPrompt = buildContextAwareSystemPrompt(files, tasks, agents, buildLogs, recentMessages, yoloMode)

    // Get AI response based on provider
    let aiContent: string
    const resolvedModel = provider === 'openai-compatible'
      ? (openaiCompatibleModelId || model)
      : model

    try {
      switch (provider) {
        case 'nvidia':
          aiContent = await callNvidiaAPI(
            [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
            resolvedModel,
            nvidiaApiKey || '',
          )
          break
        case 'openai-compatible':
          aiContent = await callOpenAICompatibleAPI(
            [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
            resolvedModel,
            openaiCompatibleBaseUrl || '',
            openaiCompatibleApiKey,
          )
          break
        case 'zai':
        default:
          aiContent = await callZaiAPI(
            [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
            resolvedModel,
          )
          break
      }
    } catch (providerError) {
      console.warn(`Provider ${provider} failed:`, providerError)
      // Fallback to Z-AI on provider failure
      try {
        aiContent = await callZaiAPI(
          [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
          'deepseek-chat',
        )
      } catch {
        const errMsg = providerError instanceof Error ? providerError.message : 'Unknown error'
        aiContent = `I apologize, I could not generate a response. Provider "${provider}" error: ${errMsg}. Please check your AI provider settings and API key.`
      }
    }

    // Save the AI response message
    const aiMessage = await db.message.create({
      data: {
        projectId,
        chatSessionId: chatSessionId || null,
        agentId: agentId || null,
        content: aiContent,
        type: 'chat',
        metadata: JSON.stringify({ sender: 'ai', provider, model: resolvedModel }),
      },
      include: { agent: true },
    })

    return NextResponse.json({ userMessage, aiMessage })
  } catch (error) {
    console.error('Failed to process chat message:', error)
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 })
  }
}

/** Build a rich, context-aware system prompt */
function buildContextAwareSystemPrompt(
  files: { path: string; content: string; isDirectory: boolean }[],
  tasks: { title: string; status: string; priority: string; description: string; assignee: { name: string; role: string } | null }[],
  agents: { name: string; role: string; status: string; specialty: string; currentTaskId: string | null; tasksCompleted: number; successRate: number }[],
  buildLogs: { output: string; status: string; type: string; createdAt: Date }[],
  recentMessages: { content: string; type: string; agent: { name: string; role: string } | null; createdAt: Date }[],
  yoloMode: boolean = false,
): string {
  // File tree structure — list all paths
  const allPaths = files.map((f) => f.path)
  const directoryPaths = files.filter((f) => f.isDirectory).map((f) => f.path)
  const filePaths = files.filter((f) => !f.isDirectory).map((f) => f.path)

  // File content previews (limited)
  const fileContentContext = files
    .filter((f) => !f.isDirectory)
    .slice(0, 20)
    .map((f) => {
      const lines = f.content.split('\n')
      const preview = lines.slice(0, 30).join('\n')
      const trunc = lines.length > 30 ? '\n... (truncated)' : ''
      return `### ${f.path} (${lines.length} lines)\n\`\`\`\n${preview}${trunc}\n\`\`\``
    }).join('\n\n')

  // Task context with descriptions
  const taskContext = tasks.map((t) =>
    `- [${t.status}] ${t.title} (${t.priority} priority, assigned to: ${t.assignee?.name || 'unassigned'} [${t.assignee?.role || ''}])\n  ${t.description?.slice(0, 100) || ''}`
  ).join('\n')

  // Agent context with capabilities and current assignments
  const agentContext = agents.map((a) => {
    const currentTask = a.currentTaskId ? ` | Current task: ${a.currentTaskId}` : ''
    return `- ${a.name} (${a.role}): ${a.status} | Specialty: ${a.specialty} | Tasks completed: ${a.tasksCompleted} | Success rate: ${(a.successRate * 100).toFixed(0)}%${currentTask}`
  }).join('\n')

  // Recent build/terminal output
  const buildContext = buildLogs.length > 0
    ? buildLogs.map((bl) => {
        const output = bl.output.length > 500 ? bl.output.slice(0, 500) + '...' : bl.output
        return `[${bl.type}/${bl.status}] ${output}`
      }).join('\n')
    : 'No recent build output.'

  // Chat session summary
  const chatSummary = recentMessages.length > 0
    ? recentMessages
        .reverse()
        .map((m) => `${m.agent ? `${m.agent.name}: ` : 'User: '}${m.content.slice(0, 120)}`)
        .join('\n')
    : 'No recent chat history.'

  return `You are an AI development assistant in the TeamForge IDE — an autonomous development platform where AI agents collaborate to build software.

You have deep access to the project environment. Use this information to give relevant, specific, and actionable answers.

## Project File Tree:
${directoryPaths.length > 0 ? `Directories:\n${directoryPaths.map((p) => `  📁 ${p}`).join('\n')}` : 'No directories.'}

Files (${filePaths.length} total):
${filePaths.map((p) => `  📄 ${p}`).join('\n') || 'No files yet.'}

## File Contents:
${fileContentContext || 'No file contents available.'}

## Current Tasks:
${taskContext || 'No tasks yet.'}

## Agent Team (Capabilities & Assignments):
${agentContext || 'No agents active.'}

## Recent Build/Terminal Output:
${buildContext}

## Recent Chat Summary:
${chatSummary}

## Your Capabilities:
You can help with:
- Code analysis, review, and suggestions
- File creation and editing (use /edit or /create_file commands)
- Running tests and builds (use /run or /run_tests commands)
- Explaining code and architecture (use /explain command)
- Project status and agent management
- Debugging and troubleshooting

Be concise, helpful, and action-oriented. If you see issues in the code or tasks, mention them. If someone asks about the project state, reference real file names and task statuses. When suggesting code, include complete, working examples.${yoloMode ? `

## ⚡ YOLO MODE ACTIVE ⚡
YOLO mode is enabled. You have FULL AUTONOMY to execute tasks without asking for user confirmation. This means:
- You can create, modify, and delete files directly — no need to ask permission
- You can run commands and scripts autonomously
- You can make code changes and immediately execute them
- You should be decisive and action-oriented — prefer doing over asking
- When asked to do something, DO IT immediately rather than explaining what you would do
- Take initiative: if you see issues, fix them without waiting for approval
- Be bold with refactoring and improvements — you have the authority to make changes
- Only ask for clarification if the request is truly ambiguous` : ''}`
}

/** Call z-ai-web-dev-sdk (default provider) */
async function callZaiAPI(
  messages: { role: string; content: string }[],
  model: string,
): Promise<string> {
  const zai = await ZAI.create()
  const response = await zai.chat.completions.create({
    model: model || 'deepseek-chat',
    messages: messages as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    thinking: { type: 'disabled' },
  })
  return response.choices[0]?.message?.content || 'I apologize, I could not generate a response.'
}

/** Call NVIDIA NIM API using buildNvidiaRequest helper */
async function callNvidiaAPI(
  messages: { role: string; content: string }[],
  model: string,
  apiKey: string,
): Promise<string> {
  if (!apiKey) {
    throw new Error('NVIDIA API key is required. Set it in Settings → AI Provider.')
  }

  const { url, options } = buildNvidiaRequest(model, messages, apiKey)
  const response = await fetch(url, options)

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`NVIDIA API error (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || 'I apologize, I could not generate a response.'
}

/** Call OpenAI-compatible API using buildOpenAICompatibleRequest helper */
async function callOpenAICompatibleAPI(
  messages: { role: string; content: string }[],
  model: string,
  baseUrl: string,
  apiKey?: string,
): Promise<string> {
  if (!baseUrl) {
    throw new Error('Base URL is required for OpenAI-compatible provider. Set it in Settings → AI Provider.')
  }

  const { url, options } = buildOpenAICompatibleRequest(baseUrl, model, messages, apiKey)
  const response = await fetch(url, options)

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`OpenAI-compatible API error (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || 'I apologize, I could not generate a response.'
}

async function handleCommand(
  message: string,
  projectId: string,
  agentId: string | null,
  provider: AIProviderType = 'zai',
  model: string = 'deepseek-chat',
) {
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

    case '/run': {
      // Execute a command via the AI assistant
      const commandToRun = parts.slice(1).join(' ')
      if (!commandToRun) {
        return NextResponse.json({
          error: 'Usage: /run <command>\nExample: /run bun run lint\nAllowed commands: bun run lint, bun run build, bun run test, bun run check',
        }, { status: 400 })
      }

      // Whitelist of allowed commands
      const allowedCommands = ['bun run lint', 'bun run build', 'bun run test', 'bun run check']
      const isAllowed = allowedCommands.some((allowed) => commandToRun === allowed || commandToRun.startsWith(allowed + ' '))
      if (!isAllowed) {
        return NextResponse.json({
          error: `Command not allowed. Allowed: ${allowedCommands.join(', ')}`,
        }, { status: 403 })
      }

      try {
        const { exec } = await import('child_process')
        const { promisify } = await import('util')
        const execAsync = promisify(exec)

        const { stdout, stderr } = await execAsync(commandToRun, {
          cwd: '/home/z/my-project',
          timeout: 60000,
          maxBuffer: 1024 * 1024,
        })

        const output = (stdout || '') + (stderr ? '\n' + stderr : '')
        const resultMsg = `▶ ${commandToRun}\n${output.trim() || 'Command completed with no output.'}`

        // Save the command output as a system message
        const sysMessage = await db.message.create({
          data: {
            projectId,
            content: resultMsg,
            type: 'system',
            metadata: JSON.stringify({ sender: 'system', command: 'run', commandToRun, exitCode: 0 }),
          },
        })

        return NextResponse.json({ message: sysMessage, output: output.trim(), exitCode: 0 })
      } catch (execError: unknown) {
        const err = execError as { stdout?: string; stderr?: string; code?: number }
        const output = (err.stdout || '') + (err.stderr ? '\n' + err.stderr : '')
        const resultMsg = `▶ ${commandToRun}\n${output.trim() || `Command failed with exit code ${err.code || 1}`}`

        const sysMessage = await db.message.create({
          data: {
            projectId,
            content: resultMsg,
            type: 'system',
            metadata: JSON.stringify({ sender: 'system', command: 'run', commandToRun, exitCode: err.code || 1 }),
          },
        })

        return NextResponse.json({ message: sysMessage, output: output.trim(), exitCode: err.code || 1 })
      }
    }

    case '/edit': {
      // Edit a specific file using AI assistance
      const filePath = parts[1]
      const editInstruction = parts.slice(2).join(' ')

      if (!filePath || !editInstruction) {
        return NextResponse.json({
          error: 'Usage: /edit <file_path> <instruction>\nExample: /edit src/app/page.tsx Add a hello world heading',
        }, { status: 400 })
      }

      // Find the file
      const file = await db.projectFile.findFirst({
        where: { projectId, path: filePath, isDirectory: false },
      })

      if (!file) {
        return NextResponse.json({ error: `File not found: ${filePath}` }, { status: 404 })
      }

      // Use AI to generate the edited content
      const editPrompt = `You are an expert code editor. Given the following file and edit instruction, output the COMPLETE updated file content. Do not include explanations, just the code.

File: ${file.path}
Current content:
\`\`\`
${file.content}
\`\`\`

Edit instruction: ${editInstruction}

Output the complete updated file:`

      let editedContent: string
      try {
        switch (provider) {
          case 'nvidia':
            editedContent = await callNvidiaAPI(
              [{ role: 'user', content: editPrompt }],
              model,
              '',
            )
            break
          case 'openai-compatible':
            editedContent = await callOpenAICompatibleAPI(
              [{ role: 'user', content: editPrompt }],
              model,
              '',
              undefined,
            )
            break
          case 'zai':
          default:
            editedContent = await callZaiAPI(
              [{ role: 'user', content: editPrompt }],
              model,
            )
            break
        }
      } catch {
        editedContent = ''
      }

      if (!editedContent) {
        const fallbackMsg = await db.message.create({
          data: {
            projectId,
            content: `⚠️ Could not generate edit for ${filePath}. The AI provider returned an empty response. Try again with a more specific instruction.`,
            type: 'system',
            metadata: JSON.stringify({ sender: 'system', command: 'edit', path: filePath }),
          },
        })
        return NextResponse.json({ message: fallbackMsg })
      }

      // Clean the response — remove markdown code fences if present
      const cleanedContent = editedContent
        .replace(/^```[\w]*\n?/, '')
        .replace(/\n?```$/, '')
        .trim()

      // Update the file
      await db.projectFile.update({
        where: { id: file.id },
        data: { content: cleanedContent },
      })

      const editMsg = await db.message.create({
        data: {
          projectId,
          content: `✏️ Edited ${filePath}\nInstruction: ${editInstruction}\n\nThe file has been updated. Review the changes in the editor.`,
          type: 'code_change',
          metadata: JSON.stringify({
            sender: 'system',
            command: 'edit',
            path: filePath,
            instruction: editInstruction,
            provider,
          }),
        },
      })

      return NextResponse.json({ message: editMsg, file: { ...file, content: cleanedContent } })
    }

    case '/explain': {
      // Explain the currently open file or a specified file
      const filePath = parts[1]

      if (!filePath) {
        return NextResponse.json({
          error: 'Usage: /explain <file_path>\nExample: /explain src/app/page.tsx',
        }, { status: 400 })
      }

      // Find the file
      const file = await db.projectFile.findFirst({
        where: { projectId, path: filePath, isDirectory: false },
      })

      if (!file) {
        return NextResponse.json({ error: `File not found: ${filePath}` }, { status: 404 })
      }

      // Use AI to explain the file
      const explainPrompt = `Explain this code file concisely. Cover: purpose, key components, data flow, and any notable patterns or issues.

File: ${file.path} (${file.content.split('\n').length} lines)

\`\`\`
${file.content.length > 4000 ? file.content.slice(0, 4000) + '\n... (truncated)' : file.content}
\`\`\``

      let explanation: string
      try {
        switch (provider) {
          case 'nvidia':
            explanation = await callNvidiaAPI(
              [{ role: 'user', content: explainPrompt }],
              model,
              '',
            )
            break
          case 'openai-compatible':
            explanation = await callOpenAICompatibleAPI(
              [{ role: 'user', content: explainPrompt }],
              model,
              '',
              undefined,
            )
            break
          case 'zai':
          default:
            explanation = await callZaiAPI(
              [{ role: 'user', content: explainPrompt }],
              model,
            )
            break
        }
      } catch {
        explanation = 'Could not generate explanation. Please check your AI provider settings.'
      }

      // Save the explanation as an AI message
      const explainMsg = await db.message.create({
        data: {
          projectId,
          content: `📖 **${filePath}**\n\n${explanation}`,
          type: 'chat',
          metadata: JSON.stringify({ sender: 'ai', command: 'explain', path: filePath, provider, model }),
        },
      })

      return NextResponse.json({ message: explainMsg })
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
        error: `Unknown command: ${command}. Available: /create_file, /run, /edit, /explain, /run_tests, /deploy, /status`,
      }, { status: 400 })
  }
}
