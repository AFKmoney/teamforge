import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'
import type { AIProviderType } from '@/lib/types'

interface ChatRequest {
  message: string
  projectId: string
  agentId?: string
  provider?: AIProviderType
  model?: string
  // API keys passed from client-side localStorage
  nvidiaApiKey?: string
  openaiCompatibleBaseUrl?: string
  openaiCompatibleApiKey?: string
  openaiCompatibleModelId?: string
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json()
    const {
      message,
      projectId,
      agentId,
      provider = 'zai',
      model = 'deepseek-chat',
      nvidiaApiKey,
      openaiCompatibleBaseUrl,
      openaiCompatibleApiKey,
      openaiCompatibleModelId,
    } = body

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Save the user message
    const userMessage = await db.message.create({
      data: {
        projectId,
        agentId: agentId || null,
        content: message,
        type: 'chat',
        metadata: JSON.stringify({ sender: 'user', provider, model }),
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

    // Build context
    const systemPrompt = buildSystemPrompt(files, tasks, agents)

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ]

    // Get AI response based on provider
    let aiContent: string

    try {
      switch (provider) {
        case 'nvidia':
          aiContent = await callNvidiaAPI(messages, model, nvidiaApiKey || '')
          break
        case 'openai-compatible':
          aiContent = await callOpenAICompatibleAPI(
            messages,
            openaiCompatibleModelId || model,
            openaiCompatibleBaseUrl || '',
            openaiCompatibleApiKey,
          )
          break
        case 'zai':
        default:
          aiContent = await callZaiAPI(messages, model)
          break
      }
    } catch (providerError) {
      // Fallback to z-ai on provider failure
      console.warn(`Provider ${provider} failed, falling back to zai:`, providerError)
      try {
        aiContent = await callZaiAPI(messages, 'deepseek-chat')
      } catch {
        aiContent = 'I apologize, I could not generate a response. Please check your AI provider settings and API key.'
      }
    }

    // Save the AI response message
    const aiMessage = await db.message.create({
      data: {
        projectId,
        agentId: agentId || null,
        content: aiContent,
        type: 'chat',
        metadata: JSON.stringify({ sender: 'ai', provider, model }),
      },
      include: { agent: true },
    })

    return NextResponse.json({ userMessage, aiMessage })
  } catch (error) {
    console.error('Failed to process AI chat message:', error)
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 })
  }
}

/** Build the system prompt with project context */
function buildSystemPrompt(
  files: { path: string; content: string }[],
  tasks: { title: string; status: string; priority: string; assignee: { name: string } | null }[],
  agents: { name: string; role: string; status: string; tasksCompleted: number; successRate: number }[],
): string {
  const fileContext = files.map((f) => {
    const lines = f.content.split('\n')
    const preview = lines.slice(0, 30).join('\n')
    const trunc = lines.length > 30 ? '\n... (truncated)' : ''
    return `### ${f.path} (${lines.length} lines)\n\`\`\`\n${preview}${trunc}\n\`\`\``
  }).join('\n\n')

  const taskContext = tasks.map((t) =>
    `- [${t.status}] ${t.title} (${t.priority} priority, assigned to: ${t.assignee?.name || 'unassigned'})`
  ).join('\n')

  const agentContext = agents.map((a) =>
    `- ${a.name} (${a.role}): ${a.status} | Tasks completed: ${a.tasksCompleted} | Success rate: ${(a.successRate * 100).toFixed(0)}%`
  ).join('\n')

  return `You are an AI development assistant in the TeamForge IDE - an autonomous development platform where AI agents collaborate to build software.

You have access to the current project context. Use this information to give relevant, specific answers.

## Project Files:
${fileContext || 'No files yet.'}

## Current Tasks:
${taskContext || 'No tasks yet.'}

## Agent Team:
${agentContext || 'No agents active.'}

Be concise, helpful, and action-oriented. If you see issues in the code or tasks, mention them. If someone asks about the project state, reference real file names and task statuses.`
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

/** Call NVIDIA NIM API */
async function callNvidiaAPI(
  messages: { role: string; content: string }[],
  model: string,
  apiKey: string,
): Promise<string> {
  if (!apiKey) {
    throw new Error('NVIDIA API key is required. Set it in Settings → AI Provider.')
  }

  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
      stream: false,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`NVIDIA API error (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || 'I apologize, I could not generate a response.'
}

/** Call OpenAI-compatible API */
async function callOpenAICompatibleAPI(
  messages: { role: string; content: string }[],
  model: string,
  baseUrl: string,
  apiKey?: string,
): Promise<string> {
  if (!baseUrl) {
    throw new Error('Base URL is required for OpenAI-compatible provider. Set it in Settings → AI Provider.')
  }

  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
      stream: false,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`OpenAI-compatible API error (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || 'I apologize, I could not generate a response.'
}

/** Test connection endpoint — used by the UI to verify API keys */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const provider = searchParams.get('provider') as AIProviderType | null
  const apiKey = searchParams.get('apiKey')
  const baseUrl = searchParams.get('baseUrl')
  const model = searchParams.get('model') || 'deepseek-chat'

  if (!provider) {
    return NextResponse.json({ error: 'Provider is required' }, { status: 400 })
  }

  try {
    const testMessages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Say "Connection successful!" in exactly those words.' },
    ]

    let result: string
    switch (provider) {
      case 'nvidia':
        if (!apiKey) {
          return NextResponse.json({ success: false, error: 'API key is required for NVIDIA' }, { status: 400 })
        }
        result = await callNvidiaAPI(testMessages, model, apiKey)
        break
      case 'openai-compatible':
        if (!baseUrl) {
          return NextResponse.json({ success: false, error: 'Base URL is required for OpenAI-compatible' }, { status: 400 })
        }
        result = await callOpenAICompatibleAPI(testMessages, model, baseUrl, apiKey || undefined)
        break
      case 'zai':
      default:
        result = await callZaiAPI(testMessages, 'deepseek-chat')
        break
    }

    return NextResponse.json({ success: true, response: result.substring(0, 200) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message })
  }
}
