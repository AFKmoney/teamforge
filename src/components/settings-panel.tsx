'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Settings,
  Cpu,
  Shield,
  Database,
  Dna,
  FlaskConical,
  Save,
  RotateCcw,
  Check,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { useAppStore } from '@/lib/store'
import type { SystemSettings } from '@/lib/types'
import { useTheme } from 'next-themes'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SettingsPanel() {
  const { settings, setSettings } = useAppStore()
  const { theme, setTheme } = useTheme()
  const [localSettings, setLocalSettings] = useState<SystemSettings>(settings)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSettings(localSettings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = () => {
    const defaults: SystemSettings = {
      autoEvolution: true,
      maxConcurrentAgents: 10,
      safetyStrictMode: true,
      evolutionIntervalMinutes: 30,
      memoryRetentionDays: 90,
      maxRiskLevel: 'medium',
      enableResearchLab: true,
      logVerbosity: 'normal',
    }
    setLocalSettings(defaults)
    setSettings(defaults)
  }

  const updateSetting = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
            <Settings className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
            <p className="text-sm text-muted-foreground">
              Configure your self-evolving AI system
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
            <RotateCcw className="size-4" />
            Reset Defaults
          </Button>
          <Button size="sm" onClick={handleSave} className="gap-2" disabled={saved}>
            {saved ? (
              <>
                <Check className="size-4" />
                Saved!
              </>
            ) : (
              <>
                <Save className="size-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Appearance */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="size-4 text-muted-foreground" />
              <CardTitle className="text-base">Appearance</CardTitle>
            </div>
            <CardDescription>Customize the look and feel of the interface</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Theme</Label>
                <p className="text-xs text-muted-foreground">Choose your preferred color scheme</p>
              </div>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Evolution Engine Settings */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.05 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Dna className="size-4 text-amber-500" />
              <CardTitle className="text-base">Evolution Engine</CardTitle>
            </div>
            <CardDescription>Control how the system evolves and improves itself</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Auto-Evolution</Label>
                <p className="text-xs text-muted-foreground">Allow the system to automatically evolve</p>
              </div>
              <Switch
                checked={localSettings.autoEvolution}
                onCheckedChange={(checked) => updateSetting('autoEvolution', checked)}
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Evolution Interval</Label>
                <Badge variant="secondary">{localSettings.evolutionIntervalMinutes} min</Badge>
              </div>
              <Slider
                min={5}
                max={120}
                step={5}
                value={[localSettings.evolutionIntervalMinutes]}
                onValueChange={([val]) => updateSetting('evolutionIntervalMinutes', val)}
              />
              <p className="text-xs text-muted-foreground">How often the system checks for improvement opportunities</p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Max Risk Level</Label>
                <p className="text-xs text-muted-foreground">Highest risk level allowed for auto-deployment</p>
              </div>
              <Select
                value={localSettings.maxRiskLevel}
                onValueChange={(val) => updateSetting('maxRiskLevel', val)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Agent Management */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cpu className="size-4 text-purple-500" />
              <CardTitle className="text-base">Agent Management</CardTitle>
            </div>
            <CardDescription>Configure agent behavior and resource limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Max Concurrent Agents</Label>
                <Badge variant="secondary">{localSettings.maxConcurrentAgents}</Badge>
              </div>
              <Slider
                min={1}
                max={50}
                step={1}
                value={[localSettings.maxConcurrentAgents]}
                onValueChange={([val]) => updateSetting('maxConcurrentAgents', val)}
              />
              <p className="text-xs text-muted-foreground">Maximum number of agents that can run simultaneously</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Safety Settings */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.15 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-red-500" />
              <CardTitle className="text-base">Safety & Compliance</CardTitle>
            </div>
            <CardDescription>Configure safety guardrails and compliance rules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Strict Safety Mode</Label>
                <p className="text-xs text-muted-foreground">Require human approval for all high-risk changes</p>
              </div>
              <Switch
                checked={localSettings.safetyStrictMode}
                onCheckedChange={(checked) => updateSetting('safetyStrictMode', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Research Laboratory</Label>
                <p className="text-xs text-muted-foreground">Allow the system to conduct autonomous research</p>
              </div>
              <Switch
                checked={localSettings.enableResearchLab}
                onCheckedChange={(checked) => updateSetting('enableResearchLab', checked)}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Memory & Storage */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="size-4 text-cyan-500" />
              <CardTitle className="text-base">Memory & Storage</CardTitle>
            </div>
            <CardDescription>Manage memory retention and storage policies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Memory Retention</Label>
                <Badge variant="secondary">{localSettings.memoryRetentionDays} days</Badge>
              </div>
              <Slider
                min={7}
                max={365}
                step={7}
                value={[localSettings.memoryRetentionDays]}
                onValueChange={([val]) => updateSetting('memoryRetentionDays', val)}
              />
              <p className="text-xs text-muted-foreground">How long memories are retained before archival</p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Log Verbosity</Label>
                <p className="text-xs text-muted-foreground">Control the detail level of system logs</p>
              </div>
              <Select
                value={localSettings.logVerbosity}
                onValueChange={(val) => updateSetting('logVerbosity', val)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="verbose">Verbose</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* System Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.25 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FlaskConical className="size-4 text-emerald-500" />
              <CardTitle className="text-base">System Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Version</p>
                <p className="text-sm font-medium">1.0.0</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Framework</p>
                <p className="text-sm font-medium">Next.js 16</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">AI Engine</p>
                <p className="text-sm font-medium">Z.ai SDK</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Database</p>
                <p className="text-sm font-medium">SQLite / Prisma</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
