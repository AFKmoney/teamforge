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
  Search,
  Filter,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { PageHeader } from '@/components/page-header'

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

const NODE_RADIUS = 26
const NODE_TYPES = ['concept', 'skill', 'pattern', 'tool', 'strategy'] as const

// ---------------------------------------------------------------------------
// Force-directed layout (100 iterations, cached via useRef)
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

function computeForceLayout(
  nodes: KnowledgeNode[],
  edges: KnowledgeEdge[]
): { layoutNodes: LayoutNode[]; layoutEdges: LayoutEdge[] } {
  if (nodes.length === 0) return { layoutNodes: [], layoutEdges: [] }

  const cx = 500
  const cy = 375
  const radius = Math.min(280, 70 * Math.sqrt(nodes.length))

  // Group nodes by type for initial clustering
  const typeGroups = new Map<string, number>()
  let groupIndex = 0
  for (const n of nodes) {
    if (!typeGroups.has(n.type)) {
      typeGroups.set(n.type, groupIndex++)
    }
  }

  // Initial positions: circular layout grouped by type
  const layoutNodes: LayoutNode[] = nodes.map((n, i) => {
    const group = typeGroups.get(n.type) ?? 0
    const groupNodes = nodes.filter((nn) => nn.type === n.type)
    const indexInGroup = groupNodes.indexOf(n)
    const groupSize = groupNodes.length

    // Spread groups around the circle
    const groupAngleStart = (2 * Math.PI * group) / typeGroups.size - Math.PI / 2
    const groupAngleSpan = (2 * Math.PI) / typeGroups.size * 0.7
    const angleOffset = groupSize > 1
      ? (indexInGroup / (groupSize - 1) - 0.5) * groupAngleSpan
      : 0
    const angle = groupAngleStart + angleOffset

    // Vary radius slightly for visual interest
    const r = radius * (0.7 + 0.3 * ((i % 3) / 2))

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

  const layoutEdges: LayoutEdge[] = edges
    .filter((e) => nodeMap.has(e.sourceId) && nodeMap.has(e.targetId))
    .map((e) => ({
      source: e.sourceId,
      target: e.targetId,
      relation: e.relation,
      weight: e.weight,
    }))

  // Force-directed simulation: 100 iterations
  const repulsionStrength = 8000
  const attractionStrength = 0.04
  const centerGravity = 0.01
  const idealEdgeLength = 140

  for (let iter = 0; iter < 100; iter++) {
    const temp = 1 - iter / 100 // cooling factor

    // Repulsive force between all nodes
    for (let i = 0; i < layoutNodes.length; i++) {
      for (let j = i + 1; j < layoutNodes.length; j++) {
        const a = layoutNodes[i]
        const b = layoutNodes[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const distSq = dx * dx + dy * dy || 1
        const dist = Math.sqrt(distSq)
        const force = (repulsionStrength * temp) / distSq
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        a.x -= fx
        a.y -= fy
        b.x += fx
        b.y += fy
      }
    }

    // Attractive force along edges
    for (const edge of layoutEdges) {
      const s = nodeMap.get(edge.source)!
      const t = nodeMap.get(edge.target)!
      const dx = t.x - s.x
      const dy = t.y - s.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const force = attractionStrength * (dist - idealEdgeLength) * temp
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      s.x += fx
      s.y += fy
      t.x -= fx
      t.y -= fy
    }

    // Center gravity force
    for (const node of layoutNodes) {
      node.x += (cx - node.x) * centerGravity * temp
      node.y += (cy - node.y) * centerGravity * temp
    }
  }

  return { layoutNodes, layoutEdges }
}

// ---------------------------------------------------------------------------
// Compute group clusters for background visualization
// ---------------------------------------------------------------------------

interface GroupCluster {
  type: string
  cx: number
  cy: number
  rx: number
  ry: number
  count: number
}

function computeGroupClusters(layoutNodes: LayoutNode[]): GroupCluster[] {
  const groups = new Map<string, LayoutNode[]>()
  for (const n of layoutNodes) {
    const list = groups.get(n.type) ?? []
    list.push(n)
    groups.set(n.type, list)
  }

  const clusters: GroupCluster[] = []
  for (const [type, nodes] of groups) {
    if (nodes.length === 0) continue
    const avgX = nodes.reduce((s, n) => s + n.x, 0) / nodes.length
    const avgY = nodes.reduce((s, n) => s + n.y, 0) / nodes.length
    const maxDx = Math.max(NODE_RADIUS * 2, ...nodes.map((n) => Math.abs(n.x - avgX)))
    const maxDy = Math.max(NODE_RADIUS * 2, ...nodes.map((n) => Math.abs(n.y - avgY)))
    clusters.push({
      type,
      cx: avgX,
      cy: avgY,
      rx: maxDx + NODE_RADIUS + 30,
      ry: maxDy + NODE_RADIUS + 30,
      count: nodes.length,
    })
  }
  return clusters
}

// ---------------------------------------------------------------------------
// Compute bezier path for an edge
// ---------------------------------------------------------------------------

function computeEdgePath(
  source: LayoutNode,
  target: LayoutNode,
  isSameType: boolean
): string {
  const dx = target.x - source.x
  const dy = target.y - source.y
  const dist = Math.sqrt(dx * dx + dy * dy) || 1

  // Curvature: more pronounced for cross-type edges
  const curvature = isSameType ? 0.15 : 0.25

  // Midpoint offset perpendicular to the edge
  const midX = (source.x + target.x) / 2
  const midY = (source.y + target.y) / 2

  // Perpendicular direction
  const nx = -dy / dist
  const ny = dx / dist

  // Offset amount proportional to distance
  const offset = dist * curvature
  const ctrlX = midX + nx * offset
  const ctrlY = midY + ny * offset

  return `M ${source.x} ${source.y} Q ${ctrlX} ${ctrlY} ${target.x} ${target.y}`
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
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTypes, setActiveTypes] = useState<Set<string>>(
    () => new Set(NODE_TYPES)
  )
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
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
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

  // ------- layout (computed via useMemo, only recalculates when data changes) -------
  const { layoutNodes, layoutEdges } = useMemo(
    () => computeForceLayout(nodes, edges),
    [nodes, edges]
  )

  const nodeMap = useMemo(
    () => new Map(layoutNodes.map((n) => [n.id, n])),
    [layoutNodes]
  )

  // ------- group clusters -------
  const groupClusters = useMemo(
    () => computeGroupClusters(layoutNodes),
    [layoutNodes]
  )

  // ------- search & filter -------
  const filteredNodeIds = useMemo(() => {
    const ids = new Set<string>()
    for (const n of layoutNodes) {
      if (!activeTypes.has(n.type)) continue
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (
          !n.label.toLowerCase().includes(q) &&
          !n.type.toLowerCase().includes(q) &&
          !n.description.toLowerCase().includes(q)
        )
          continue
      }
      ids.add(n.id)
    }
    return ids
  }, [layoutNodes, activeTypes, searchQuery])

  const visibleCount = filteredNodeIds.size
  const totalCount = layoutNodes.length

  // ------- toggle type filter -------
  const toggleType = useCallback((type: string) => {
    setActiveTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }, [])

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

  // ------- connection count for each node -------
  const connectionCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const e of edges) {
      counts.set(e.sourceId, (counts.get(e.sourceId) ?? 0) + 1)
      counts.set(e.targetId, (counts.get(e.targetId) ?? 0) + 1)
    }
    return counts
  }, [edges])

  // ------- pan / zoom -------
  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(z + 0.2, 4)), [])
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(z - 0.2, 0.2)), [])
  const handleReset = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  const handleFitAll = useCallback(() => {
    if (layoutNodes.length === 0) return
    const minX = Math.min(...layoutNodes.map((n) => n.x))
    const maxX = Math.max(...layoutNodes.map((n) => n.x))
    const minY = Math.min(...layoutNodes.map((n) => n.y))
    const maxY = Math.max(...layoutNodes.map((n) => n.y))
    const padding = NODE_RADIUS * 3
    const contentW = maxX - minX + padding * 2
    const contentH = maxY - minY + padding * 2
    const svgW = 1000
    const svgH = 750
    const scale = Math.min(svgW / contentW, svgH / contentH, 2)
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    setZoom(scale)
    setPan({
      x: svgW / 2 - centerX * scale,
      y: svgH / 2 - centerY * scale,
    })
  }, [layoutNodes])

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom((z) => Math.min(Math.max(z + delta, 0.2), 4))
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if ((e.target as Element).closest('.graph-node')) return
      isPanning.current = true
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
    },
    [pan]
  )

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanning.current) return
    setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y })
  }, [])

  const handleMouseUp = useCallback(() => {
    isPanning.current = false
  }, [])

  // ------- get node initials -------
  const getNodeInitials = useCallback((label: string) => {
    const words = label.split(/[\s_-]+/).filter(Boolean)
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase()
    }
    return label.slice(0, 2).toUpperCase()
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
    <div className="space-y-4 overflow-x-hidden">
      {/* Header */}
      <PageHeader
        icon={Network}
        iconColor="teal"
        title="Knowledge Graph"
        description={`${nodes.length} nodes \u00b7 ${edges.length} edges`}
      />

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground mr-1" />
          {NODE_TYPES.map((type) => {
            const isActive = activeTypes.has(type)
            return (
              <Button
                key={type}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'h-7 text-xs px-2.5 capitalize transition-all',
                  isActive && 'hover:opacity-90'
                )}
                style={
                  isActive
                    ? { backgroundColor: NODE_COLORS[type], borderColor: NODE_COLORS[type] }
                    : undefined
                }
                onClick={() => toggleType(type)}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full mr-1.5 shrink-0"
                  style={{ backgroundColor: isActive ? '#fff' : NODE_COLORS[type] }}
                />
                {type}
              </Button>
            )
          })}
          <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
            {visibleCount} of {totalCount} nodes visible
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-4">
        {/* Graph SVG */}
        <Card className="flex-1 overflow-hidden">
          <CardContent className="p-0 relative">
            {/* Zoom controls */}
            <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 md:h-8 md:w-8 bg-card min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
                      onClick={handleZoomIn}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Zoom In</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 md:h-8 md:w-8 bg-card min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
                      onClick={handleZoomOut}
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Zoom Out</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 md:h-8 md:w-8 bg-card min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
                      onClick={handleFitAll}
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Fit All</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 md:h-8 md:w-8 bg-card text-xs font-bold"
                      onClick={handleReset}
                    >
                      1:1
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reset Zoom</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Zoom percentage */}
            <div className="absolute top-3 left-3 z-10 bg-card/80 backdrop-blur-sm border rounded-md px-2 py-1 text-xs font-mono text-muted-foreground">
              {Math.round(zoom * 100)}%
            </div>

            <TooltipProvider delayDuration={200}>
              <svg
                ref={svgRef}
                width="100%"
                height="550"
                viewBox="0 0 1000 750"
                className="select-none cursor-grab active:cursor-grabbing bg-muted/50 dark:bg-muted/30 max-h-[250px] md:max-h-[550px]"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
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
                    @keyframes flow-dot {
                      0% { offset-distance: 0%; opacity: 0; }
                      10% { opacity: 1; }
                      90% { opacity: 1; }
                      100% { offset-distance: 100%; opacity: 0; }
                    }
                    .flow-dot {
                      animation: flow-dot 2.5s linear infinite;
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
                  {/* Drop shadow for nodes */}
                  <filter id="node-shadow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
                  </filter>
                </defs>
                <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
                  {/* Group cluster backgrounds */}
                  {groupClusters.map((cluster) => {
                    const clusterColor = NODE_COLORS[cluster.type] ?? '#475569'
                    const clusterVisible =
                      [...filteredNodeIds].some((id) => {
                        const n = nodeMap.get(id)
                        return n?.type === cluster.type
                      })
                    if (!clusterVisible) return null
                    return (
                      <g key={`cluster-${cluster.type}`}>
                        <ellipse
                          cx={cluster.cx}
                          cy={cluster.cy}
                          rx={cluster.rx}
                          ry={cluster.ry}
                          fill={clusterColor}
                          opacity={0.04}
                          stroke={clusterColor}
                          strokeWidth={1}
                          strokeOpacity={0.12}
                          strokeDasharray="6 4"
                        />
                        <text
                          x={cluster.cx - cluster.rx + 16}
                          y={cluster.cy - cluster.ry + 18}
                          fontSize="11"
                          fill={clusterColor}
                          opacity={0.35}
                          fontWeight={600}
                          textAnchor="start"
                          className="pointer-events-none select-none capitalize"
                        >
                          {cluster.type}s ({cluster.count})
                        </text>
                      </g>
                    )
                  })}

                  {/* Edges */}
                  {layoutEdges.map((edge, i) => {
                    const source = nodeMap.get(edge.source)
                    const target = nodeMap.get(edge.target)
                    if (!source || !target) return null

                    const isHighlighted =
                      hoveredNodeId === edge.source || hoveredNodeId === edge.target
                    const isRelatedToSelected =
                      selectedNodeId === edge.source || selectedNodeId === edge.target
                    const isSameType = source.type === target.type
                    const edgeColor = isSameType
                      ? (NODE_COLORS[source.type] ?? '#9ca3af')
                      : (EDGE_COLORS[edge.relation] ?? '#9ca3af')
                    const path = computeEdgePath(source, target, isSameType)

                    // Compute midpoint for flow dot
                    const dx = target.x - source.x
                    const dy = target.y - source.y
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1
                    const curvature = isSameType ? 0.15 : 0.25
                    const nx = -dy / dist
                    const ny = dx / dist
                    const midX = (source.x + target.x) / 2 + nx * dist * curvature
                    const midY = (source.y + target.y) / 2 + ny * dist * curvature

                    return (
                      <g key={`edge-${i}`}>
                        <path
                          d={path}
                          fill="none"
                          stroke={edgeColor}
                          strokeWidth={isHighlighted ? 2.5 : 1.2}
                          opacity={
                            hoveredNodeId
                              ? isHighlighted
                                ? 0.8
                                : 0.08
                              : isRelatedToSelected
                                ? 0.6
                                : 0.4
                          }
                          strokeDasharray={isHighlighted ? '6 4' : 'none'}
                          className={cn(
                            'transition-all duration-200',
                            isHighlighted && 'edge-animated'
                          )}
                        />
                        {/* Animated flow dot */}
                        {isHighlighted && (
                          <circle r="2.5" fill={edgeColor} opacity={0.8}>
                            <animateMotion
                              dur="2s"
                              repeatCount="indefinite"
                              path={`M ${source.x} ${source.y} Q ${midX} ${midY} ${target.x} ${target.y}`}
                            />
                          </circle>
                        )}
                      </g>
                    )
                  })}

                  {/* Nodes */}
                  {layoutNodes.map((node) => {
                    const isSelected = selectedNodeId === node.id
                    const isHovered = hoveredNodeId === node.id
                    const isConnected =
                      !hoveredNodeId || highlightedNodeIds.has(node.id)
                    const isVisible = filteredNodeIds.has(node.id)
                    const dimmed = (hoveredNodeId && !isConnected) || !isVisible
                    const r = isSelected ? NODE_RADIUS + 4 : isHovered ? NODE_RADIUS + 2 : NODE_RADIUS

                    const nodeColor = NODE_COLORS[node.type] ?? '#475569'
                    const initials = getNodeInitials(node.label)
                    const connCount = connectionCounts.get(node.id) ?? 0

                    return (
                      <Tooltip key={node.id}>
                        <TooltipTrigger asChild>
                          <g
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
                                r={r + 8}
                                fill="none"
                                stroke={nodeColor}
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
                                r={r + 5}
                                fill="none"
                                stroke={nodeColor}
                                strokeWidth={1.5}
                                opacity={0.2}
                                filter="url(#glow-hover)"
                                className="transition-all duration-200"
                              />
                            )}
                            {/* Node circle with drop shadow */}
                            <circle
                              cx={node.x}
                              cy={node.y}
                              r={r}
                              fill={nodeColor}
                              opacity={dimmed ? 0.1 : 1}
                              stroke="hsl(var(--card))"
                              strokeWidth={3}
                              filter={!dimmed ? 'url(#node-shadow)' : undefined}
                              className="transition-all duration-200"
                            />
                            {/* Initials text inside node */}
                            <text
                              x={node.x}
                              y={node.y + 1}
                              textAnchor="middle"
                              dominantBaseline="central"
                              fontSize="11"
                              fill="white"
                              fontWeight={700}
                              opacity={dimmed ? 0.1 : 1}
                              className="pointer-events-none select-none transition-opacity duration-200"
                            >
                              {initials}
                            </text>
                            {/* Label background rect */}
                            {!dimmed && (
                              <>
                                <rect
                                  x={node.x - 40}
                                  y={node.y + r + 6}
                                  width={80}
                                  height={18}
                                  rx={4}
                                  fill="hsl(var(--card))"
                                  opacity={0.85}
                                  className="pointer-events-none"
                                />
                                <text
                                  x={node.x}
                                  y={node.y + r + 18}
                                  textAnchor="middle"
                                  fontSize="12"
                                  fill="hsl(var(--muted-foreground))"
                                  fontWeight={isSelected ? 600 : 400}
                                  opacity={1}
                                  className="pointer-events-none select-none transition-opacity duration-200"
                                >
                                  {node.label.length > 14
                                    ? node.label.slice(0, 12) + '...'
                                    : node.label}
                                </text>
                              </>
                            )}
                            {/* Scale-up animation hint on hover */}
                            {isHovered && !dimmed && (
                              <circle
                                cx={node.x}
                                cy={node.y}
                                r={r}
                                fill="none"
                                stroke={nodeColor}
                                strokeWidth={1}
                                opacity={0.15}
                              />
                            )}
                          </g>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          sideOffset={12}
                          className="max-w-[240px] p-3 space-y-2"
                        >
                          {/* Node name */}
                          <div className="font-semibold text-sm text-foreground leading-tight">
                            {node.label}
                          </div>
                          {/* Type badge */}
                          <Badge
                            variant="secondary"
                            className="text-[10px] capitalize"
                            style={{
                              backgroundColor: NODE_BG_COLORS[node.type] ?? '#f1f5f9',
                              color: nodeColor,
                            }}
                          >
                            {node.type}
                          </Badge>
                          {/* Description */}
                          {node.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {node.description}
                            </p>
                          )}
                          {/* Connections count */}
                          <div className="text-xs text-muted-foreground">
                            {connCount} connection{connCount !== 1 ? 's' : ''}
                          </div>
                          {/* Click hint */}
                          <div className="text-[10px] text-muted-foreground/60 italic">
                            Click for details
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </g>
              </svg>
            </TooltipProvider>

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
                      <span className="capitalize">{type}</span>
                    </span>
                  ))}
                </div>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-4">
                  <span className="font-medium text-muted-foreground">Edges:</span>
                  {Object.entries(EDGE_COLORS).map(([rel, color]) => (
                    <span key={rel} className="flex items-center gap-1">
                      <span
                        className="inline-block h-0.5 w-4 rounded-full"
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
              className="lg:w-80 w-full"
            >
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{selectedNode.label}</CardTitle>
                      <Badge
                        variant="secondary"
                        className="mt-1 capitalize"
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
                      className="h-8 w-8 md:h-7 md:w-7"
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
                      <p className="text-sm text-foreground/80 leading-relaxed">
                        {selectedNode.description}
                      </p>
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
                                <span className="truncate text-foreground/80">
                                  {other?.label ?? otherId}
                                </span>
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
