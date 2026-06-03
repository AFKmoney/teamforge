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

    // Get AI response
    const zai = await ZAI.create()
    const response = await zai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'assistant', content: 'You are an AI development agent in an autonomous IDE team. You help build software collaboratively with other agents. Be concise and action-oriented.' },
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
