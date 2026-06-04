import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // KnowledgeNode and KnowledgeEdge models do not exist in schema — return empty
    return NextResponse.json({ nodes: [], edges: [] })
  } catch (error) {
    console.error('Knowledge GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch knowledge graph' },
      { status: 500 }
    )
  }
}
