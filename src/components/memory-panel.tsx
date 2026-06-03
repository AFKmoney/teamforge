'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Database,
  Plus,
  Loader2,
  ChevronRight,
  Eye,
} from 'lucide-react'
import type { Memory, MemoryType } from '@/lib/types'
import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_CONFIG: Record<MemoryType, { label: string; badgeClass: string }> = {
  working: { label: 'Working', badgeClass: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
  episodic: { label: 'Episodic', badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  semantic: { label: 'Semantic', badgeClass: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  procedural: { label: 'Procedural', badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  evolution: { label: 'Evolution', badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
}

const ALL_TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'working', label: 'Working' },
  { key: 'episodic', label: 'Episodic' },
  { key: 'semantic', label: 'Semantic' },
  { key: 'procedural', label: 'Procedural' },
  { key: 'evolution', label: 'Evolution' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (typeof value === 'object' && value !== null) return value as T
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T
    } catch {
      return fallback
    }
  }
  return fallback
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

interface ParsedMemory extends Omit<Memory, 'metadata'> {
  metadata: Record<string, unknown>
  agent?: { id: string; name: string } | null
}

function parseMemory(raw: Record<string, unknown>): ParsedMemory {
  return {
    ...raw,
    metadata: parseJsonField<Record<string, unknown>>(raw.metadata, {}),
    importance: typeof raw.importance === 'number' ? raw.importance : 0.5,
    accessCount: typeof raw.accessCount === 'number' ? raw.accessCount : 0,
  } as ParsedMemory
}

// ---------------------------------------------------------------------------
// Memory Card
// ---------------------------------------------------------------------------

function MemoryCard({ memory }: { memory: ParsedMemory }) {
  const [expanded, setExpanded] = useState(false)
  const typeCfg = TYPE_CONFIG[memory.type as MemoryType] ?? TYPE_CONFIG.working
  const importancePercent = Math.round(memory.importance * 100)

  const importanceColor =
    memory.importance >= 0.8
      ? 'text-red-600 dark:text-red-400'
      : memory.importance >= 0.5
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-green-600 dark:text-green-400'

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          {/* Top row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Badge className={typeCfg.badgeClass}>{typeCfg.label}</Badge>
              {memory.category && memory.category !== 'general' && (
                <Badge variant="outline" className="text-xs">
                  {memory.category}
                </Badge>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {timeAgo(memory.createdAt)}
            </span>
          </div>

          {/* Content preview */}
          <Collapsible open={expanded} onOpenChange={setExpanded}>
            <p className="text-sm text-foreground line-clamp-2">{memory.content}</p>
            <CollapsibleContent>
              <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">{memory.content}</p>
            </CollapsibleContent>
            {memory.content.length > 120 && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs h-6 px-2 mt-1">
                  <ChevronRight className={`size-3 mr-1 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                  {expanded ? 'Show less' : 'Show more'}
                </Button>
              </CollapsibleTrigger>
            )}
          </Collapsible>

          {/* Importance meter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">Importance</span>
            <div className="flex-1">
              <Progress value={importancePercent} className="h-1.5" />
            </div>
            <span className={`text-xs font-medium ${importanceColor}`}>
              {(memory.importance).toFixed(1)}
            </span>
          </div>

          {/* Bottom row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Eye className="size-3" />
              {memory.accessCount} accesses
            </span>
            {memory.agent && (
              <>
                <Separator orientation="vertical" className="h-3" />
                <span>Agent: {memory.agent.name}</span>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function MemorySkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-3 w-16 ml-auto" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-1.5 flex-1" />
          <Skeleton className="h-3 w-8" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function MemoryPanel() {
  const { memories, setMemories } = useAppStore()
  const [parsedMemories, setParsedMemories] = useState<ParsedMemory[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [addOpen, setAddOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [formType, setFormType] = useState<MemoryType>('working')
  const [formCategory, setFormCategory] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formImportance, setFormImportance] = useState([0.5])

  const fetchMemories = useCallback(
    async (type?: string) => {
      try {
        const url = type && type !== 'all' ? `/api/memory?type=${type}` : '/api/memory'
        const res = await fetch(url)
        if (!res.ok) return
        const data = await res.json()
        const parsed = (data as Record<string, unknown>[]).map(parseMemory)
        setParsedMemories(parsed)
        // Store the full set only when fetching "all"
        if (!type || type === 'all') {
          setMemories(
            parsed.map((m) => ({
              ...m,
              metadata: m.metadata,
            })) as Memory[]
          )
        }
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    },
    [setMemories]
  )

  useEffect(() => {
    fetchMemories()
    const interval = setInterval(() => fetchMemories(), 30000)
    return () => clearInterval(interval)
  }, [fetchMemories])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setLoading(true)
    fetchMemories(tab)
  }

  const handleAdd = async () => {
    if (!formContent) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formType,
          category: formCategory || 'general',
          content: formContent,
          importance: formImportance[0],
        }),
      })
      if (res.ok) {
        setAddOpen(false)
        setFormType('working')
        setFormCategory('')
        setFormContent('')
        setFormImportance([0.5])
        fetchMemories(activeTab)
      }
    } catch {
      // silent
    } finally {
      setSubmitting(false)
    }
  }

  // Compute counts from parsed data (for tab badges)
  const typeCounts: Record<string, number> = { all: 0 }
  for (const key of Object.keys(TYPE_CONFIG)) {
    typeCounts[key] = 0
  }
  // We need the full set for counts. Use the store memories when tab is "all"
  // For simplicity, we count from the currently loaded data
  // When "all" tab is active, parsedMemories has everything
  for (const m of activeTab === 'all' ? parsedMemories : parsedMemories) {
    typeCounts[m.type as string] = (typeCounts[m.type as string] || 0) + 1
    typeCounts.all++
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Database className="size-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Memory System</h2>
          <Badge variant="secondary" className="ml-1">
            {typeCounts.all}
          </Badge>
        </div>

        {/* Add Memory */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4 mr-1" />
              Add Memory
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Memory</DialogTitle>
              <DialogDescription>
                Store a new memory in the system.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Type</label>
                <Select value={formType} onValueChange={(v) => setFormType(v as MemoryType)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        {cfg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Category</label>
                <Input
                  placeholder="e.g. code-pattern, strategy, error-log"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Content</label>
                <Textarea
                  placeholder="Memory content"
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">
                  Importance: {formImportance[0].toFixed(1)}
                </label>
                <Slider
                  min={0}
                  max={1}
                  step={0.1}
                  value={formImportance}
                  onValueChange={setFormImportance}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={!formContent || submitting}>
                {submitting && <Loader2 className="size-4 mr-1 animate-spin" />}
                Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Memory Type Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full flex-wrap h-auto gap-1">
          {ALL_TABS.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key} className="text-xs">
              {tab.label}
              {typeCounts[tab.key] !== undefined && (
                <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">
                  {typeCounts[tab.key]}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {ALL_TABS.map((tab) => (
          <TabsContent key={tab.key} value={tab.key}>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <MemorySkeleton key={i} />
                ))}
              </div>
            ) : parsedMemories.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Database className="size-10 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No memories found for this type.</p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="max-h-[calc(100vh-20rem)]">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {parsedMemories.map((memory) => (
                    <MemoryCard key={memory.id} memory={memory} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
