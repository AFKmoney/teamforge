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
import { Settings, FileCode2, Palette, Cpu, Type, WrapText, Map, Hash, Save, Timer, FolderKanban, Link, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'

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
  const [techStack, setTechStack] = useState<string[]>(currentProject?.techStack || [])
  const [status, setStatus] = useState(currentProject?.status || 'active')
  const [repoUrl, setRepoUrl] = useState(currentProject?.repoUrl || '')
  const [isSaving, setIsSaving] = useState(false)
  const [showTechSelect, setShowTechSelect] = useState(false)

  // Sync state when currentProject changes
  useEffect(() => {
    if (currentProject) {
      setProjectName(currentProject.name)
      setProjectDescription(currentProject.description)
      setTechStack(currentProject.techStack)
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
        // Parse techStack back from JSON if needed
        if (typeof updated.techStack === 'string') {
          updated.techStack = JSON.parse(updated.techStack)
        }
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
        icon={<Cpu className="size-4" />}
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
        icon={<Cpu className="size-4" />}
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
        icon={<Cpu className="size-4" />}
        label="Sidebar Position"
        description="Sidebar is positioned on the left"
      >
        <span className="text-[11px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">Left</span>
      </SettingRow>

      <div className="h-px bg-border/50" />

      <SettingRow
        icon={<Cpu className="size-4" />}
        label="Chat Panel Position"
        description="Chat panel is positioned on the right"
      >
        <span className="text-[11px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">Right</span>
      </SettingRow>
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
            <TabsContent value="appearance" className="mt-0">
              <AppearanceTab />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
