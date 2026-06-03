import { NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

const SYSTEM_PROMPT = `You are an AI assistant for a Self-Evolving AI System dashboard. You have deep knowledge about the system's architecture and can provide insights on:

1. **System Architecture**: The system consists of multiple AI agents (research, coding, evaluation, memory, evolution, safety, deployment) that work together to autonomously improve themselves.

2. **Evolution Process**: The system proposes, tests, validates, and deploys changes to its own prompts, workflows, architecture, and tools. Each evolution event goes through stages: proposed → testing → validated → deployed (or rejected).

3. **Memory System**: The system uses multiple memory types:
   - Working memory: Short-term active processing
   - Episodic memory: Sequences of events and experiences
   - Semantic memory: Facts and concepts
   - Procedural memory: How to perform tasks
   - Evolution memory: Records of successful evolutionary changes

4. **Knowledge Graph**: A network of interconnected concepts, skills, patterns, tools, and strategies that the system has learned, connected by relationships like "improves", "dependsOn", "derivedFrom", "replaces".

5. **Safety & Governance**: The system has constitutional rules, safety event monitoring, and requires human approval for high-risk changes. Safety events track policy violations, hallucinations, unauthorized access, and constitutional breaches.

6. **Benchmarks**: The system continuously evaluates itself across categories like coding, reasoning, math, agent capabilities, planning, tool use, and research.

7. **Research & Experiments**: The system runs experiments with hypotheses, methodologies, and measures results to validate improvements.

Provide thoughtful, detailed responses about the system. When asked about improvements, consider the safety implications and the evolutionary framework. Be helpful, knowledgeable, and insightful.`

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { message, conversationHistory } = body

    if (!message) {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      )
    }

    const zai = await ZAI.create()

    // Build messages array with conversation history if provided
    // Note: the SDK uses 'assistant' role for system prompts
    const messages: Array<{ role: 'assistant' | 'user'; content: string }> = [
      { role: 'assistant', content: SYSTEM_PROMPT },
    ]

    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: msg.content })
        }
      }
    }

    messages.push({ role: 'user', content: message })

    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' },
    })

    const responseText = completion.choices[0]?.message?.content ?? ''

    return NextResponse.json({
      response: responseText,
    })
  } catch (error) {
    console.error('Chat POST error:', error)
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    )
  }
}
