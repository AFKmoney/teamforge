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
import { Settings, FileCode2, Palette, Cpu, Type, WrapText, Map, Hash, Save, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'

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

function GeneralTab() {
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const currentProject = useAppStore((s) => s.currentProject)

  return (
    <div className="space-y-1">
      <SettingRow
        icon={<Cpu className="size-4" />}
        label="Project Name"
        description="Current project (read-only)"
      >
        <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md truncate max-w-[160px] block">
          {currentProject?.name || 'TeamForge IDE'}
        </span>
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

  const fontSizes = [12, 13, 14, 15, 16, 17, 18]
  const tabSizes = [2, 4, 8]

  return (
    <div className="space-y-1">
      <SettingRow
        icon={<Type className="size-4" />}
        label="Font Size"
        description="Editor font size in pixels"
      >
        <div className="flex items-center gap-1">
          {fontSizes.map((size) => (
            <button
              key={size}
              onClick={() => updateSettings({ fontSize: size })}
              className={cn(
                'px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors',
                settings.fontSize === size
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'text-muted-foreground hover:bg-muted/50 border border-transparent',
              )}
            >
              {size}
            </button>
          ))}
        </div>
      </SettingRow>

      <div className="h-px bg-border/50" />

      <SettingRow
        icon={<FileCode2 className="size-4" />}
        label="Tab Size"
        description="Number of spaces per tab"
      >
        <div className="flex items-center gap-1">
          {tabSizes.map((size) => (
            <button
              key={size}
              onClick={() => updateSettings({ tabSize: size })}
              className={cn(
                'px-2.5 py-0.5 rounded text-[11px] font-mono transition-colors',
                settings.tabSize === size
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'text-muted-foreground hover:bg-muted/50 border border-transparent',
              )}
            >
              {size}
            </button>
          ))}
        </div>
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
  const { theme, setTheme } = useTheme()
  const rightPanelOpen = useAppStore((s) => s.rightPanelOpen)
  const setRightPanelOpen = useAppStore((s) => s.setRightPanelOpen)
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed)

  return (
    <div className="space-y-1">
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
        </div>
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
        label="Chat Panel Position"
        description="Chat panel is positioned on the right"
      >
        <span className="text-[11px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">Right</span>
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

          <div className="px-6 pb-6 pt-2">
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
