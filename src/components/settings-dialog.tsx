'use client'

import { useAppStore } from '@/lib/store'
import { useTheme } from 'next-themes'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Settings, FileCode2, Palette, Cpu, Type, WrapText, Map, Hash, Save, Timer, FolderKanban, Link, ChevronDown, Eye, EyeOff, CheckCircle2, XCircle, Loader2, Zap, Globe, Key, Bot, Search, RotateCcw, PanelLeft, MessageSquare, LayoutDashboard, Columns } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useCallback, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { AI_PROVIDERS, getModelsForProvider, validateNvidiaApiKey, validateBaseUrl, validateOpenAIApiKey, DEFAULT_AI_SETTINGS, type AIProviderType } from '@/lib/ai-providers'

function SettingRow({
  icon,
  label,
  description,
  children,
}: {
  icon: React.ReactNode
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 px-1">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className="shrink-0 mt-0.5 text-muted-foreground/70">{icon}</div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground/90">{label}</p>
          {description && (
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

const TECH_STACK_OPTIONS = [
  'TypeScript',
  'React',
  'Next.js',
  'Prisma',
  'Tailwind CSS',
  'Node.js',
  'Bun',
  'PostgreSQL',
  'SQLite',
  'Redis',
  'Socket.io',
  'Zustand',
  'TanStack Query',
  'Framer Motion',
  'shadcn/ui',
  'Lucide',
]

const PROJECT_STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: 'text-emerald-600 dark:text-emerald-400' },
  { value: 'paused', label: 'Paused', color: 'text-amber-600 dark:text-amber-400' },
  { value: 'completed', label: 'Completed', color: 'text-blue-600 dark:text-blue-400' },
  { value: 'archived', label: 'Archived', color: 'text-muted-foreground' },
]

function ProjectTab() {
  const currentProject = useAppStore((s) => s.currentProject)
  const setCurrentProject = useAppStore((s) => s.setCurrentProject)

  const [projectName, setProjectName] = useState(currentProject?.name || '')
  const [projectDescription, setProjectDescription] = useState(currentProject?.description || '')
  const [techStack, setTechStack] = useState<string[]>(() => {
    const raw = currentProject?.techStack
    if (Array.isArray(raw)) return raw
    if (typeof raw === 'string') { try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : [] } catch { return [] } }
    return []
  })
  const [status, setStatus] = useState<string>(currentProject?.status || 'active')
  const [repoUrl, setRepoUrl] = useState(currentProject?.repoUrl || '')
  const [isSaving, setIsSaving] = useState(false)
  const [showTechSelect, setShowTechSelect] = useState(false)

  // Sync state when currentProject changes
  useEffect(() => {
    if (currentProject) {
      setProjectName(currentProject.name)
      setProjectDescription(currentProject.description)
      setTechStack((() => {
        const raw = currentProject.techStack
        if (Array.isArray(raw)) return raw
        if (typeof raw === 'string') { try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : [] } catch { return [] } }
        return []
      })())
      setStatus(currentProject.status)
      setRepoUrl(currentProject.repoUrl || '')
    }
  }, [currentProject])

  const toggleTech = useCallback((tech: string) => {
    setTechStack((prev) =>
      prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech]
    )
  }, [])

  const handleSave = useCallback(async () => {
    if (!currentProject?.id) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/projects/${currentProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName.trim() || undefined,
          description: projectDescription,
          techStack,
          status,
          repoUrl: repoUrl.trim() || null,
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        // Ensure techStack is an array (API should return arrays, but be defensive)
        if (typeof updated.techStack === 'string') {
          try { updated.techStack = JSON.parse(updated.techStack) } catch { updated.techStack = [] }
        }
        if (!Array.isArray(updated.techStack)) updated.techStack = []
        setCurrentProject(updated)
        toast.success('Project settings saved')
      } else {
        toast.error('Failed to save project settings')
      }
    } catch {
      toast.error('Failed to save project settings')
    } finally {
      setIsSaving(false)
    }
  }, [currentProject, projectName, projectDescription, techStack, status, repoUrl, setCurrentProject])

  return (
    <div className="space-y-1">
      {/* Project Name */}
      <SettingRow
        icon={<FolderKanban className="size-4" />}
        label="Project Name"
        description="The display name for this project"
      >
        <Input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="h-7 text-xs w-44"
          placeholder="My Project"
        />
      </SettingRow>

      <div className="h-px bg-border/50" />

      {/* Project Description */}
      <SettingRow
        icon={<Cpu className="size-4" />}
        label="Description"
        description="A brief description of the project"
      >
        <div className="w-44">
          <Textarea
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            className="text-xs min-h-[60px] resize-none"
            placeholder="Project description..."
          />
        </div>
      </SettingRow>

      <div className="h-px bg-border/50" />

      {/* Tech Stack */}
      <div className="py-3 px-1">
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5 text-muted-foreground/70">
            <FileCode2 className="size-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground/90">Tech Stack</p>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">Technologies used in this project</p>
            {/* Selected tech badges */}
            <div className="flex flex-wrap gap-1 mt-2">
              {techStack.map((tech) => (
                <button
                  key={tech}
                  onClick={() => toggleTech(tech)}
                  className="px-2 py-0.5 rounded-md text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-colors flex items-center gap-1"
                >
                  {tech}
                  <span className="text-[8px]">×</span>
                </button>
              ))}
              {techStack.length === 0 && (
                <span className="text-[10px] text-muted-foreground/50">No tech selected</span>
              )}
            </div>
            {/* Tech selector */}
            <div className="mt-2">
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] gap-1"
                onClick={() => setShowTechSelect(!showTechSelect)}
              >
                <ChevronDown className={cn('size-2.5 transition-transform', showTechSelect && 'rotate-180')} />
                Add Technology
              </Button>
              {showTechSelect && (
                <div className="mt-1.5 p-2 rounded-md border bg-card max-h-32 overflow-y-auto">
                  <div className="flex flex-wrap gap-1">
                    {TECH_STACK_OPTIONS.filter((t) => !techStack.includes(t)).map((tech) => (
                      <button
                        key={tech}
                        onClick={() => toggleTech(tech)}
                        className="px-2 py-0.5 rounded text-[10px] text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors border border-transparent hover:border-border"
                      >
                        + {tech}
                      </button>
                    ))}
                    {TECH_STACK_OPTIONS.filter((t) => !techStack.includes(t)).length === 0 && (
                      <span className="text-[10px] text-muted-foreground/50">All options selected</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-border/50" />

      {/* Status */}
      <SettingRow
        icon={<Save className="size-4" />}
        label="Status"
        description="Current project status"
      >
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-7 text-xs w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROJECT_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <span className={opt.color}>{opt.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>

      <div className="h-px bg-border/50" />

      {/* Repository URL */}
      <SettingRow
        icon={<Link className="size-4" />}
        label="Repository URL"
        description="Optional link to the Git repository"
      >
        <Input
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          className="h-7 text-xs w-44"
          placeholder="https://github.com/..."
        />
      </SettingRow>

      <div className="h-px bg-border/50" />

      {/* Save Button */}
      <div className="flex justify-end pt-2 pb-1">
        <Button
          size="sm"
          className="gap-1.5 h-8 text-xs"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <span className="size-3 border border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="size-3" />
          )}
          {isSaving ? 'Saving...' : 'Save Project Settings'}
        </Button>
      </div>
    </div>
  )
}

function GeneralTab() {
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-1">
      <SettingRow
        icon={<Cpu className="size-4" />}
        label="Project Name"
        description="Current project (read-only)"
      >
        <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md truncate max-w-[160px] block">
          {useAppStore((s) => s.currentProject)?.name || 'TeamForge IDE'}
        </span>
      </SettingRow>

      <div className="h-px bg-border/50" />

      <SettingRow
        icon={<Palette className="size-4" />}
        label="Theme"
        description="Switch between light and dark mode"
      >
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTheme('light')}
            className={cn(
              'px-2.5 py-1 rounded text-[11px] transition-colors flex items-center gap-1.5',
              theme === 'light'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : 'text-muted-foreground hover:bg-muted/50 border border-transparent',
            )}
          >
            <span className="size-3 rounded-full bg-yellow-400 border border-yellow-500/50" />
            Light
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={cn(
              'px-2.5 py-1 rounded text-[11px] transition-colors flex items-center gap-1.5',
              theme === 'dark'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : 'text-muted-foreground hover:bg-muted/50 border border-transparent',
            )}
          >
            <span className="size-3 rounded-full bg-zinc-700 border border-zinc-600" />
            Dark
          </button>
          <button
            onClick={() => setTheme('system')}
            className={cn(
              'px-2.5 py-1 rounded text-[11px] transition-colors',
              theme === 'system'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : 'text-muted-foreground hover:bg-muted/50 border border-transparent',
            )}
          >
            System
          </button>
        </div>
      </SettingRow>

      <div className="h-px bg-border/50" />

      <SettingRow
        icon={<Save className="size-4" />}
        label="Auto Save"
        description="Automatically save file changes"
      >
        <Switch
          checked={settings.autoSave}
          onCheckedChange={(checked) => updateSettings({ autoSave: checked })}
        />
      </SettingRow>

      <div className="h-px bg-border/50" />

      <SettingRow
        icon={<Timer className="size-4" />}
        label={`Polling Interval: ${settings.pollingInterval}s`}
        description="How often to poll for updates when WebSocket is disconnected"
      >
        <div className="w-32 flex items-center gap-2">
          <Slider
            value={[settings.pollingInterval]}
            min={5}
            max={120}
            step={5}
            onValueChange={([val]) => updateSettings({ pollingInterval: val })}
            className="flex-1"
          />
          <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">
            {settings.pollingInterval}s
          </span>
        </div>
      </SettingRow>
    </div>
  )
}

function EditorTab() {
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)

  return (
    <div className="space-y-1">
      <SettingRow
        icon={<Type className="size-4" />}
        label={`Font Size: ${settings.fontSize}px`}
        description="Editor font size in pixels"
      >
        <div className="w-32 flex items-center gap-2">
          <Slider
            value={[settings.fontSize]}
            min={10}
            max={24}
            step={1}
            onValueChange={([val]) => updateSettings({ fontSize: val })}
            className="flex-1"
          />
          <span className="text-[10px] text-muted-foreground w-6 text-right tabular-nums">
            {settings.fontSize}
          </span>
        </div>
      </SettingRow>

      <div className="h-px bg-border/50" />

      <SettingRow
        icon={<FileCode2 className="size-4" />}
        label="Tab Size"
        description="Number of spaces per tab"
      >
        <Select value={String(settings.tabSize)} onValueChange={(val) => updateSettings({ tabSize: Number(val) })}>
          <SelectTrigger className="h-7 text-xs w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2 spaces</SelectItem>
            <SelectItem value="4">4 spaces</SelectItem>
            <SelectItem value="8">8 spaces</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <div className="h-px bg-border/50" />

      <SettingRow
        icon={<WrapText className="size-4" />}
        label="Word Wrap"
        description="Wrap long lines in the editor"
      >
        <Switch
          checked={settings.wordWrap}
          onCheckedChange={(checked) => updateSettings({ wordWrap: checked })}
        />
      </SettingRow>

      <div className="h-px bg-border/50" />

      <SettingRow
        icon={<Map className="size-4" />}
        label="Minimap"
        description="Show minimap in the editor"
      >
        <Switch
          checked={settings.minimapEnabled}
          onCheckedChange={(checked) => updateSettings({ minimapEnabled: checked })}
        />
      </SettingRow>

      <div className="h-px bg-border/50" />

      <SettingRow
        icon={<Hash className="size-4" />}
        label="Line Numbers"
        description="Show line numbers in the editor"
      >
        <Switch
          checked={settings.lineNumbers}
          onCheckedChange={(checked) => updateSettings({ lineNumbers: checked })}
        />
      </SettingRow>
    </div>
  )
}

function AppearanceTab() {
  const rightPanelOpen = useAppStore((s) => s.rightPanelOpen)
  const setRightPanelOpen = useAppStore((s) => s.setRightPanelOpen)
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed)

  return (
    <div className="space-y-1">
      <SettingRow
        icon={<PanelLeft className="size-4" />}
        label="Sidebar Visible"
        description="Toggle file explorer sidebar"
      >
        <Switch
          checked={!sidebarCollapsed}
          onCheckedChange={(checked) => setSidebarCollapsed(!checked)}
        />
      </SettingRow>

      <div className="h-px bg-border/50" />

      <SettingRow
        icon={<MessageSquare className="size-4" />}
        label="Chat Panel Visible"
        description="Toggle the AI chat panel"
      >
        <Switch
          checked={rightPanelOpen}
          onCheckedChange={setRightPanelOpen}
        />
      </SettingRow>

      <div className="h-px bg-border/50" />

      <SettingRow
        icon={<LayoutDashboard className="size-4" />}
        label="Sidebar Position"
        description="Sidebar is positioned on the left"
      >
        <span className="text-[11px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">Left</span>
      </SettingRow>

      <div className="h-px bg-border/50" />

      <SettingRow
        icon={<Columns className="size-4" />}
        label="Chat Panel Position"
        description="Chat panel is positioned on the right"
      >
        <span className="text-[11px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">Right</span>
      </SettingRow>
    </div>
  )
}

function AIProviderTab() {
  const aiSettings = useAppStore((s) => s.aiSettings)
  const updateAISettings = useAppStore((s) => s.updateAISettings)
  const [showNvidiaKey, setShowNvidiaKey] = useState(false)
  const [showOpenAIKey, setShowOpenAIKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [nvidiaTestResult, setNvidiaTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [openAITestResult, setOpenAITestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [nvidiaModelSearch, setNvidiaModelSearch] = useState('')

  const currentProvider = AI_PROVIDERS.find((p) => p.type === aiSettings.provider)
  const models = getModelsForProvider(aiSettings.provider)

  const handleProviderChange = useCallback((provider: string) => {
    const p = provider as AIProviderType
    const defaultModel = getModelsForProvider(p)[0]?.id || 'glm-5.1'
    updateAISettings({ provider: p, model: defaultModel })
    setTestResult(null)
    setNvidiaTestResult(null)
  }, [updateAISettings])

  const handleModelChange = useCallback((model: string) => {
    updateAISettings({ model })
    setTestResult(null)
    setNvidiaTestResult(null)
  }, [updateAISettings])

  const handleTestConnection = useCallback(async () => {
    setTesting(true)
    setTestResult(null)
    setNvidiaTestResult(null)
    try {
      const params = new URLSearchParams({
        provider: aiSettings.provider,
        model: aiSettings.provider === 'nvidia' ? 'meta/llama-3.3-70b-instruct' : aiSettings.model,
      })
      if (aiSettings.provider === 'nvidia' && aiSettings.nvidiaApiKey) {
        params.set('apiKey', aiSettings.nvidiaApiKey)
      }
      if (aiSettings.provider === 'openai-compatible') {
        if (aiSettings.openaiCompatibleBaseUrl) {
          params.set('baseUrl', aiSettings.openaiCompatibleBaseUrl)
        }
        if (aiSettings.openaiCompatibleApiKey) {
          params.set('apiKey', aiSettings.openaiCompatibleApiKey)
        }
      }

      const res = await fetch(`/api/ai/chat?${params.toString()}`)
      const data = await res.json()

      if (data.success) {
        const result = { success: true, message: 'Connection successful! AI responded.' }
        setTestResult(result)
        if (aiSettings.provider === 'nvidia') {
          setNvidiaTestResult(result)
        }
        if (aiSettings.provider === 'openai-compatible') {
          setOpenAITestResult(result)
        }
        toast.success('AI Provider connection test passed')
      } else {
        const result = { success: false, message: data.error || 'Connection failed' }
        setTestResult(result)
        if (aiSettings.provider === 'nvidia') {
          setNvidiaTestResult(result)
        }
        if (aiSettings.provider === 'openai-compatible') {
          setOpenAITestResult(result)
        }
        toast.error('Connection test failed')
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Network error'
      const result = { success: false, message: msg }
      setTestResult(result)
      if (aiSettings.provider === 'nvidia') {
        setNvidiaTestResult(result)
      }
      if (aiSettings.provider === 'openai-compatible') {
        setOpenAITestResult(result)
      }
      toast.error('Connection test failed')
    } finally {
      setTesting(false)
    }
  }, [aiSettings])

  const handleResetToDefault = useCallback(() => {
    updateAISettings({
      provider: DEFAULT_AI_SETTINGS.provider,
      model: DEFAULT_AI_SETTINGS.model,
      nvidiaApiKey: DEFAULT_AI_SETTINGS.nvidiaApiKey,
      openaiCompatibleBaseUrl: DEFAULT_AI_SETTINGS.openaiCompatibleBaseUrl,
      openaiCompatibleApiKey: DEFAULT_AI_SETTINGS.openaiCompatibleApiKey,
      openaiCompatibleModelId: DEFAULT_AI_SETTINGS.openaiCompatibleModelId,
    })
    setTestResult(null)
    setNvidiaTestResult(null)
    setOpenAITestResult(null)
    setNvidiaModelSearch('')
    toast.success('AI settings reset to defaults')
  }, [updateAISettings])

  const nvidiaValidation = aiSettings.nvidiaApiKey ? validateNvidiaApiKey(aiSettings.nvidiaApiKey) : null
  const baseUrlValidation = aiSettings.openaiCompatibleBaseUrl ? validateBaseUrl(aiSettings.openaiCompatibleBaseUrl) : null
  const openAIKeyValidation = aiSettings.openaiCompatibleApiKey ? validateOpenAIApiKey(aiSettings.openaiCompatibleApiKey) : null

  // Filtered NVIDIA models based on search
  const filteredNvidiaModels = useMemo(() => {
    if (!nvidiaModelSearch.trim()) return models
    const q = nvidiaModelSearch.toLowerCase()
    return models.filter((m) =>
      m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || (m.description && m.description.toLowerCase().includes(q))
    )
  }, [models, nvidiaModelSearch])

  return (
    <div className="space-y-1">
      {/* Provider Selector */}
      <SettingRow
        icon={<Zap className="size-4" />}
        label="AI Provider"
        description="Choose the AI backend for chat responses"
      >
        <Select value={aiSettings.provider} onValueChange={handleProviderChange}>
          <SelectTrigger className="h-7 text-xs w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AI_PROVIDERS.map((p) => (
              <SelectItem key={p.type} value={p.type}>
                <span className="flex items-center gap-1.5">
                  {p.type === 'zai' && <Bot className="size-3" />}
                  {p.type === 'nvidia' && <Zap className="size-3" />}
                  {p.type === 'openai-compatible' && <Globe className="size-3" />}
                  {p.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>

      <div className="h-px bg-border/50" />

      {/* Provider description */}
      {currentProvider && (
        <div className="px-1 py-2">
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5 text-muted-foreground/70">
              {currentProvider.type === 'zai' && <Bot className="size-4" />}
              {currentProvider.type === 'nvidia' && <Zap className="size-4" />}
              {currentProvider.type === 'openai-compatible' && <Globe className="size-4" />}
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground/70">{currentProvider.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Model Selector */}
      <SettingRow
        icon={<Bot className="size-4" />}
        label="Model"
        description={models.find((m) => m.id === aiSettings.model)?.description}
      >
        {aiSettings.provider === 'openai-compatible' ? (
          <Input
            value={aiSettings.openaiCompatibleModelId === 'custom' ? '' : aiSettings.openaiCompatibleModelId}
            onChange={(e) => {
              const val = e.target.value
              updateAISettings({ model: val || 'custom', openaiCompatibleModelId: val || 'custom' })
            }}
            className="h-7 text-xs w-44"
            placeholder="e.g. llama3, gpt-4"
          />
        ) : (
          <div className="flex flex-col gap-1 w-44">
            {aiSettings.provider === 'nvidia' && models.length > 10 && (
              <div className="relative">
                <Search className="size-3 text-muted-foreground/50 absolute left-2 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={nvidiaModelSearch}
                  onChange={(e) => setNvidiaModelSearch(e.target.value)}
                  placeholder="Search models..."
                  className="w-full h-7 rounded-md border bg-transparent pl-7 pr-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
            )}
            <Select value={aiSettings.model} onValueChange={handleModelChange}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {filteredNvidiaModels.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <span className="flex items-center gap-1.5">
                      <span className="truncate">{m.name}</span>
                    </span>
                  </SelectItem>
                ))}
                {filteredNvidiaModels.length === 0 && (
                  <div className="px-2 py-3 text-[10px] text-muted-foreground text-center">No models match your search</div>
                )}
              </SelectContent>
            </Select>
          </div>
        )}
      </SettingRow>

      <div className="h-px bg-border/50" />

      {/* NVIDIA API Key (conditional) */}
      {aiSettings.provider === 'nvidia' && (
        <>
          <SettingRow
            icon={<Key className="size-4" />}
            label="NVIDIA API Key"
            description="Required for NVIDIA NIM API (nvapi-...)"
          >
            <div className="flex items-center gap-1.5 w-44">
              <div className="relative flex-1">
                <Input
                  type={showNvidiaKey ? 'text' : 'password'}
                  value={aiSettings.nvidiaApiKey}
                  onChange={(e) => updateAISettings({ nvidiaApiKey: e.target.value })}
                  className="h-7 text-xs pr-7"
                  placeholder="nvapi-..."
                />
                <button
                  onClick={() => setShowNvidiaKey(!showNvidiaKey)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                >
                  {showNvidiaKey ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                </button>
              </div>
              {nvidiaValidation && (
                <span className={cn('shrink-0', nvidiaValidation.valid ? 'text-emerald-500' : 'text-red-500')}>
                  {nvidiaValidation.valid ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
                </span>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[10px] gap-1 px-2 shrink-0"
                onClick={handleTestConnection}
                disabled={testing || !aiSettings.nvidiaApiKey}
                title="Test NVIDIA API connection"
              >
                {testing ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Zap className="size-3" />
                )}
                Test
              </Button>
            </div>
          </SettingRow>
          {nvidiaValidation && !nvidiaValidation.valid && aiSettings.nvidiaApiKey && (
            <p className="text-[10px] text-red-500 px-1 ml-7">{nvidiaValidation.message}</p>
          )}
          {nvidiaTestResult && (
            <div className={cn(
              'ml-7 p-1.5 rounded-md text-[10px] border',
              nvidiaTestResult.success
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400',
            )}>
              <div className="flex items-center gap-1">
                {nvidiaTestResult.success ? <CheckCircle2 className="size-2.5" /> : <XCircle className="size-2.5" />}
                {nvidiaTestResult.message}
              </div>
            </div>
          )}
          <div className="h-px bg-border/50" />
        </>
      )}

      {/* OpenAI-Compatible Settings (conditional) */}
      {aiSettings.provider === 'openai-compatible' && (
        <>
          <SettingRow
            icon={<Globe className="size-4" />}
            label="Base URL"
            description="OpenAI-compatible API endpoint URL"
          >
            <div className="flex items-center gap-1.5 w-44">
              <Input
                value={aiSettings.openaiCompatibleBaseUrl}
                onChange={(e) => updateAISettings({ openaiCompatibleBaseUrl: e.target.value })}
                className="h-7 text-xs"
                placeholder="http://localhost:11434"
              />
              {baseUrlValidation && aiSettings.openaiCompatibleBaseUrl && (
                <span className={cn('shrink-0', baseUrlValidation.valid ? 'text-emerald-500' : 'text-red-500')}>
                  {baseUrlValidation.valid ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
                </span>
              )}
            </div>
          </SettingRow>
          {baseUrlValidation && !baseUrlValidation.valid && aiSettings.openaiCompatibleBaseUrl && (
            <p className="text-[10px] text-red-500 px-1 ml-7">{baseUrlValidation.message}</p>
          )}
          <div className="h-px bg-border/50" />

          <SettingRow
            icon={<Key className="size-4" />}
            label="API Key"
            description="Optional — leave empty if not required"
          >
            <div className="flex items-center gap-1.5 w-44">
              <div className="relative flex-1">
                <Input
                  type={showOpenAIKey ? 'text' : 'password'}
                  value={aiSettings.openaiCompatibleApiKey}
                  onChange={(e) => updateAISettings({ openaiCompatibleApiKey: e.target.value })}
                  className="h-7 text-xs pr-7"
                  placeholder="Optional API key"
                />
                <button
                  onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                >
                  {showOpenAIKey ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                </button>
              </div>
              {openAIKeyValidation && aiSettings.openaiCompatibleApiKey && (
                <span className={cn('shrink-0', openAIKeyValidation.valid ? 'text-emerald-500' : 'text-red-500')}>
                  {openAIKeyValidation.valid ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
                </span>
              )}
            </div>
          </SettingRow>
          {openAIKeyValidation && !openAIKeyValidation.valid && aiSettings.openaiCompatibleApiKey && (
            <p className="text-[10px] text-red-500 px-1 ml-7">{openAIKeyValidation.message}</p>
          )}
          <div className="h-px bg-border/50" />

          {/* Test Connection for OpenAI-Compatible */}
          <div className="py-3 px-1">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5 text-muted-foreground/70">
                  <Zap className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground/90">Test OpenAI Connection</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                    Verify your base URL and model are working
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5"
                onClick={handleTestConnection}
                disabled={testing || !aiSettings.openaiCompatibleBaseUrl}
              >
                {testing ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Zap className="size-3" />
                )}
                {testing ? 'Testing...' : 'Test'}
              </Button>
            </div>
            {openAITestResult && (
              <div className={cn(
                'mt-2 ml-7 p-2 rounded-md text-[11px] border',
                openAITestResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400',
              )}>
                <div className="flex items-center gap-1.5">
                  {openAITestResult.success ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                  {openAITestResult.message}
                </div>
              </div>
            )}
          </div>

          <div className="h-px bg-border/50" />
        </>
      )}

      {/* Test Connection */}
      <div className="py-3 px-1">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5 text-muted-foreground/70">
              <Zap className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground/90">Test Connection</p>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                Verify your API key and model are working
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5"
            onClick={handleTestConnection}
            disabled={testing}
          >
            {testing ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Zap className="size-3" />
            )}
            {testing ? 'Testing...' : 'Test'}
          </Button>
        </div>
        {testResult && (
          <div className={cn(
            'mt-2 ml-7 p-2 rounded-md text-[11px] border',
            testResult.success
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400',
          )}>
            <div className="flex items-center gap-1.5">
              {testResult.success ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
              {testResult.message}
            </div>
          </div>
        )}
      </div>

      <div className="h-px bg-border/50" />

      {/* Current status summary */}
      <div className="px-1 py-2">
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5 text-muted-foreground/70">
            <Bot className="size-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground/90">Current Configuration</p>
            <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground/70">
              <p>Provider: <span className="text-foreground/80">{currentProvider?.label || 'Unknown'}</span></p>
              <p>Model: <span className="text-foreground/80">{aiSettings.provider === 'openai-compatible' ? (aiSettings.openaiCompatibleModelId || 'custom') : aiSettings.model}</span></p>
              <p>API Key: <span className={cn(
                aiSettings.provider === 'zai' ? 'text-emerald-500' : 'text-foreground/80',
              )}>
                {aiSettings.provider === 'zai' ? 'Not required' : (aiSettings.provider === 'nvidia' ? (aiSettings.nvidiaApiKey ? '••••••••' : 'Not set') : (aiSettings.openaiCompatibleApiKey ? '••••••••' : 'Not set'))}
              </span></p>
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-border/50" />

      {/* Reset to Default */}
      <div className="py-3 px-1">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5 text-muted-foreground/70">
              <RotateCcw className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground/90">Reset to Default</p>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                Reset all AI provider settings to their default values
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5 text-amber-600 hover:text-amber-500 hover:bg-amber-500/10 border-amber-500/30"
            onClick={handleResetToDefault}
          >
            <RotateCcw className="size-3" />
            Reset
          </Button>
        </div>
      </div>
    </div>
  )
}

export function SettingsDialog() {
  const settingsOpen = useAppStore((s) => s.settingsOpen)
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen)

  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Settings className="size-4 text-emerald-500" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Configure your TeamForge IDE preferences. Changes are saved automatically.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <div className="px-6 pt-1">
            <TabsList className="w-full">
              <TabsTrigger value="project" className="flex-1 gap-1.5 text-xs">
                <FolderKanban className="size-3" />
                Project
              </TabsTrigger>
              <TabsTrigger value="general" className="flex-1 gap-1.5 text-xs">
                <Cpu className="size-3" />
                General
              </TabsTrigger>
              <TabsTrigger value="editor" className="flex-1 gap-1.5 text-xs">
                <Type className="size-3" />
                Editor
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex-1 gap-1.5 text-xs">
                <Bot className="size-3" />
                AI
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex-1 gap-1.5 text-xs">
                <Palette className="size-3" />
                Appearance
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="px-6 pb-6 pt-2 max-h-[400px] overflow-y-auto">
            <TabsContent value="project" className="mt-0">
              <ProjectTab />
            </TabsContent>
            <TabsContent value="general" className="mt-0">
              <GeneralTab />
            </TabsContent>
            <TabsContent value="editor" className="mt-0">
              <EditorTab />
            </TabsContent>
            <TabsContent value="ai" className="mt-0">
              <AIProviderTab />
            </TabsContent>
            <TabsContent value="appearance" className="mt-0">
              <AppearanceTab />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
