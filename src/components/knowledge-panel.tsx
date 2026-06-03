'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Network,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { KnowledgeNode, KnowledgeEdge } from '@/lib/types'

// ---------------------------------------------------------------------------
// Colour maps
// ---------------------------------------------------------------------------

const NODE_COLORS: Record<string, string> = {
  concept: '#475569',
  skill: '#16a34a',
  pattern: '#d97706',
  tool: '#0d9488',
  strategy: '#9333ea',
}

const NODE_BG_COLORS: Record<string, string> = {
  concept: '#f1f5f9',
  skill: '#f0fdf4',
  pattern: '#fffbeb',
  tool: '#f0fdfa',
  strategy: '#faf5ff',
}

const EDGE_COLORS: Record<string, string> = {
  improves: '#16a34a',
  dependsOn: '#dc2626',
  connectedTo: '#9ca3af',
  replaces: '#ea580c',
  derivedFrom: '#2563eb',
}

// ---------------------------------------------------------------------------
// Simple force-directed layout (pre-calculated)
// ---------------------------------------------------------------------------

interface LayoutNode {
  id: string
  x: number
  y: number
  label: string
  type: string
  description: string
  data: Record<string, unknown>
}

interface LayoutEdge {
  source: string
  target: string
  relation: string
  weight: number
}

function computeLayout(
  nodes: KnowledgeNode[],
  edges: KnowledgeEdge[]
): { layoutNodes: LayoutNode[]; layoutEdges: LayoutEdge[] } {
  if (nodes.length === 0) return { layoutNodes: [], layoutEdges: [] }

  const cx = 400
  const cy = 300
  const radius = Math.min(250, 60 * Math.sqrt(nodes.length))

  const layoutNodes: LayoutNode[] = nodes.map((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2
    const r = nodes.length <= 6 ? radius * 0.6 : radius
    return {
      id: n.id,
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      label: n.label,
      type: n.type,
      description: n.description,
      data: typeof n.data === 'string' ? JSON.parse(n.data as string) : n.data,
    }
  })

  const nodeMap = new Map(layoutNodes.map((n) => [n.id, n]))

  // Push connected nodes closer
  const layoutEdges: LayoutEdge[] = edges
    .filter((e) => nodeMap.has(e.sourceId) && nodeMap.has(e.targetId))
    .map((e) => ({ source: e.sourceId, target: e.targetId, relation: e.relation, weight: e.weight }))

  for (let iter = 0; iter < 30; iter++) {
    for (const edge of layoutEdges) {
      const s = nodeMap.get(edge.source)!
      const t = nodeMap.get(edge.target)!
      const dx = t.x - s.x
      const dy = t.y - s.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const force = 0.05 * (dist - 120) / dist
      s.x += dx * force
      s.y += dy * force
      t.x -= dx * force
      t.y -= dy * force
    }
  }

  return { layoutNodes, layoutEdges }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function KnowledgePanel() {
  const {
    knowledgeNodes: rawNodes,
    knowledgeEdges: rawEdges,
    setKnowledgeNodes,
    setKnowledgeEdges,
  } = useAppStore()

  const [loading, setLoading] = useState(true)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const svgRef = useRef<SVGSVGElement>(null)
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })

  // ------- data fetching -------
  useEffect(() => {
    let cancelled = false
    fetch('/api/knowledge')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        setKnowledgeNodes(data.nodes ?? [])
        setKnowledgeEdges(data.edges ?? [])
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [setKnowledgeNodes, setKnowledgeEdges])

  // ------- parse JSON string fields -------
  const nodes: KnowledgeNode[] = useMemo(
    () =>
      rawNodes.map((n) => ({
        ...n,
        data:
          typeof n.data === 'string'
            ? (JSON.parse(n.data as string) as Record<string, unknown>)
            : n.data,
      })),
    [rawNodes]
  )

  const edges: KnowledgeEdge[] = useMemo(
    () =>
      rawEdges.map((e) => ({
        ...e,
        metadata:
          typeof e.metadata === 'string'
            ? (JSON.parse(e.metadata as string) as Record<string, unknown>)
            : e.metadata,
      })),
    [rawEdges]
  )

  // ------- layout -------
  const { layoutNodes, layoutEdges } = useMemo(
    () => computeLayout(nodes, edges),
    [nodes, edges]
  )

  const nodeMap = useMemo(
    () => new Map(layoutNodes.map((n) => [n.id, n])),
    [layoutNodes]
  )

  // ------- selected node details -------
  const selectedNode = useMemo(
    () => (selectedNodeId ? nodeMap.get(selectedNodeId) : null),
    [selectedNodeId, nodeMap]
  )

  const connectedEdges = useMemo(() => {
    if (!selectedNodeId) return []
    return edges.filter(
      (e) => e.sourceId === selectedNodeId || e.targetId === selectedNodeId
    )
  }, [selectedNodeId, edges])

  const highlightedNodeIds = useMemo(() => {
    if (!hoveredNodeId) return new Set<string>()
    const ids = new Set<string>([hoveredNodeId])
    for (const e of edges) {
      if (e.sourceId === hoveredNodeId) ids.add(e.targetId)
      if (e.targetId === hoveredNodeId) ids.add(e.sourceId)
    }
    return ids
  }, [hoveredNodeId, edges])

  // ------- pan / zoom -------
  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(z + 0.2, 3)), [])
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(z - 0.2, 0.3)), [])
  const handleReset = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as Element).closest('.graph-node')) return
    isPanning.current = true
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
  }, [pan])

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanning.current) return
    setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y })
  }, [])

  const handleMouseUp = useCallback(() => {
    isPanning.current = false
  }, [])

  // ------- loading state -------
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10">
            <Network className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Knowledge Graph</h2>
            <p className="text-sm text-muted-foreground">
              {nodes.length} nodes &middot; {edges.length} edges
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Graph SVG */}
        <Card className="flex-1 overflow-hidden">
          <CardContent className="p-0 relative">
            {/* Zoom controls */}
            <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8 bg-card" onClick={handleZoomIn}>
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Zoom In</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8 bg-card" onClick={handleZoomOut}>
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Zoom Out</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8 bg-card" onClick={handleReset}>
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reset View</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <svg
              ref={svgRef}
              width="100%"
              height="500"
              viewBox="0 0 800 600"
              className="select-none cursor-grab active:cursor-grabbing bg-muted/50 dark:bg-muted/30"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <defs>
                {/* Animated dash for hovered connection lines */}
                <style>{`
                  @keyframes dash-flow {
                    to { stroke-dashoffset: -20; }
                  }
                  .edge-animated {
                    animation: dash-flow 0.6s linear infinite;
                  }
                `}</style>
                {/* Glow filter for selected nodes */}
                <filter id="glow-selected" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <filter id="glow-hover" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
                {/* Edges */}
                {layoutEdges.map((edge, i) => {
                  const source = nodeMap.get(edge.source)
                  const target = nodeMap.get(edge.target)
                  if (!source || !target) return null
                  const isHighlighted =
                    hoveredNodeId === edge.source || hoveredNodeId === edge.target
                  const isRelatedToSelected =
                    selectedNodeId === edge.source || selectedNodeId === edge.target
                  return (
                    <line
                      key={`edge-${i}`}
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      stroke={EDGE_COLORS[edge.relation] ?? '#9ca3af'}
                      strokeWidth={isHighlighted ? 2.5 : 1.2}
                      opacity={hoveredNodeId ? (isHighlighted ? 1 : 0.15) : isRelatedToSelected ? 0.8 : 0.6}
                      strokeDasharray={isHighlighted ? '6 4' : 'none'}
                      className={cn(
                        'transition-all duration-200',
                        isHighlighted && 'edge-animated'
                      )}
                    />
                  )
                })}

                {/* Nodes */}
                {layoutNodes.map((node) => {
                  const isSelected = selectedNodeId === node.id
                  const isHovered = hoveredNodeId === node.id
                  const isConnected =
                    !hoveredNodeId || highlightedNodeIds.has(node.id)
                  const dimmed = hoveredNodeId && !isConnected
                  return (
                    <g
                      key={node.id}
                      className="graph-node cursor-pointer"
                      onClick={() =>
                        setSelectedNodeId((prev) =>
                          prev === node.id ? null : node.id
                        )
                      }
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                    >
                      {/* Glow ring for selected node */}
                      {isSelected && (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={28}
                          fill="none"
                          stroke={NODE_COLORS[node.type] ?? '#475569'}
                          strokeWidth={2}
                          opacity={0.3}
                          filter="url(#glow-selected)"
                          className="transition-all duration-300"
                        />
                      )}
                      {/* Glow ring for hovered node */}
                      {isHovered && !isSelected && (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={25}
                          fill="none"
                          stroke={NODE_COLORS[node.type] ?? '#475569'}
                          strokeWidth={1.5}
                          opacity={0.2}
                          filter="url(#glow-hover)"
                          className="transition-all duration-200"
                        />
                      )}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={isSelected ? 22 : isHovered ? 20 : 16}
                        fill={NODE_COLORS[node.type] ?? '#475569'}
                        opacity={dimmed ? 0.2 : 1}
                        stroke={isSelected ? 'hsl(var(--foreground))' : 'hsl(var(--card))'}
                        strokeWidth={isSelected ? 3 : 2}
                        className="transition-all duration-200"
                      />
                      <text
                        x={node.x}
                        y={node.y + 28}
                        textAnchor="middle"
                        fontSize="11"
                        fill="hsl(var(--muted-foreground))"
                        fontWeight={isSelected ? 600 : 400}
                        opacity={dimmed ? 0.2 : 1}
                        className="transition-opacity duration-200 pointer-events-none"
                      >
                        {node.label.length > 16
                          ? node.label.slice(0, 14) + '...'
                          : node.label}
                      </text>
                    </g>
                  )
                })}
              </g>
            </svg>

            {/* Legend */}
            <div className="border-t bg-card px-4 py-3">
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                <div className="flex items-center gap-4">
                  <span className="font-medium text-muted-foreground">Nodes:</span>
                  {Object.entries(NODE_COLORS).map(([type, color]) => (
                    <span key={type} className="flex items-center gap-1">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      {type}
                    </span>
                  ))}
                </div>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-4">
                  <span className="font-medium text-muted-foreground">Edges:</span>
                  {Object.entries(EDGE_COLORS).map(([rel, color]) => (
                    <span key={rel} className="flex items-center gap-1">
                      <span
                        className="inline-block h-0.5 w-4"
                        style={{ backgroundColor: color }}
                      />
                      {rel}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details side panel */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="lg:w-80"
            >
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{selectedNode.label}</CardTitle>
                      <Badge
                        variant="secondary"
                        className="mt-1"
                        style={{
                          backgroundColor: NODE_BG_COLORS[selectedNode.type] ?? '#f1f5f9',
                          color: NODE_COLORS[selectedNode.type] ?? '#475569',
                        }}
                      >
                        {selectedNode.type}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setSelectedNodeId(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedNode.description && (
                    <div>
                      <h4 className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                        Description
                      </h4>
                      <p className="text-sm text-foreground/80 leading-relaxed">{selectedNode.description}</p>
                    </div>
                  )}

                  {/* Connections */}
                  {connectedEdges.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                        Connections
                      </h4>
                      <ScrollArea className="max-h-40">
                        <div className="space-y-1">
                          {connectedEdges.map((e) => {
                            const isSource = e.sourceId === selectedNodeId
                            const otherId = isSource ? e.targetId : e.sourceId
                            const other = nodeMap.get(otherId)
                            return (
                              <button
                                key={e.id}
                                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/60 transition-colors"
                                onClick={() => setSelectedNodeId(otherId)}
                              >
                                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                <span
                                  className="h-2 w-2 rounded-full shrink-0"
                                  style={{
                                    backgroundColor:
                                      NODE_COLORS[other?.type ?? 'concept'] ?? '#475569',
                                  }}
                                />
                                <span className="truncate text-foreground/80">{other?.label ?? otherId}</span>
                                <Badge
                                  variant="outline"
                                  className="ml-auto text-[10px] px-1.5 py-0 border-border/50"
                                  style={{ color: EDGE_COLORS[e.relation] ?? '#64748b' }}
                                >
                                  {e.relation}
                                </Badge>
                              </button>
                            )
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  {/* Node data */}
                  {selectedNode.data &&
                    Object.keys(selectedNode.data).length > 0 && (
                      <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                          Data
                        </h4>
                        <ScrollArea className="max-h-40">
                          <pre className="rounded-md bg-muted/60 p-3 text-xs text-foreground/80 overflow-auto border border-border/30">
                            {JSON.stringify(selectedNode.data, null, 2)}
                          </pre>
                        </ScrollArea>
                      </div>
                    )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
