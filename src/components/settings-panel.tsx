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
  Activity,
  Sparkles,
  HelpCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
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
import { toastSuccess } from '@/lib/toast-utils'
import { useTheme } from 'next-themes'
import { PageHeader } from '@/components/page-header'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SettingsPanel() {
  const { settings, setSettings } = useAppStore()
  const simulationEnabled = useAppStore((s) => s.simulationEnabled)
  const simulationSpeed = useAppStore((s) => s.simulationSpeed)
  const lastSimulationUpdate = useAppStore((s) => s.lastSimulationUpdate)
  const toggleSimulation = useAppStore((s) => s.toggleSimulation)
  const setSimulationSpeed = useAppStore((s) => s.setSimulationSpeed)
  const { theme, setTheme } = useTheme()
  const [localSettings, setLocalSettings] = useState<SystemSettings>(settings)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSettings(localSettings)
    setSaved(true)
    toastSuccess('Settings saved', 'Your configuration changes have been applied.')
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
    toastSuccess('Settings reset', 'All settings have been restored to their defaults.')
  }

  const updateSetting = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-4 md:space-y-6 max-w-4xl overflow-x-hidden">
      {/* Header */}
      <PageHeader
        icon={Settings}
        iconColor="muted"
        title="Settings"
        description="Configure your self-evolving AI system"
        actions={
          <>
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
          </>
        }
      />

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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <Label className="text-sm font-medium">Theme</Label>
                <p className="text-xs text-muted-foreground">Choose your preferred color scheme</p>
              </div>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger className="w-full sm:w-32">
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

      {/* Help & Tour */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.03 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <HelpCircle className="size-4 text-emerald-500" />
              <CardTitle className="text-base">Help & Tour</CardTitle>
            </div>
            <CardDescription>Get familiar with the EvoAI dashboard</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <Label className="text-sm font-medium">Guided Tour</Label>
                <p className="text-xs text-muted-foreground">
                  Take a walkthrough of all the main features and panels
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => useAppStore.getState().startTour()}
              >
                <Sparkles className="size-3.5" />
                Restart Tour
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Data Simulation */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.03 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-emerald-500" />
              <CardTitle className="text-base">Data Simulation</CardTitle>
            </div>
            <CardDescription>Control real-time data simulation for the dashboard</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <Label className="text-sm font-medium">Real-Time Simulation</Label>
                <p className="text-xs text-muted-foreground">
                  Simulate live data updates on the dashboard
                </p>
              </div>
              <div className="flex items-center gap-3">
                {simulationEnabled && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    <span className="relative flex size-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
                    </span>
                    Active
                  </span>
                )}
                <Switch
                  checked={simulationEnabled}
                  onCheckedChange={toggleSimulation}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <Label className="text-sm font-medium">Simulation Speed</Label>
                <Badge variant="secondary">{simulationSpeed}x</Badge>
              </div>
              <Slider
                min={0.5}
                max={5}
                step={0.5}
                value={[simulationSpeed]}
                onValueChange={([val]) => setSimulationSpeed(val)}
              />
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>0.5x (Slow)</span>
                <span>1x (Normal)</span>
                <span>5x (Fast)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Higher speed makes data changes more frequent for demonstration purposes
              </p>
            </div>

            <Separator />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <Label className="text-sm font-medium">Last Update</Label>
                <p className="text-xs text-muted-foreground">When the simulation last produced new data</p>
              </div>
              <span className="text-sm text-muted-foreground">
                {lastSimulationUpdate
                  ? lastSimulationUpdate.toLocaleTimeString()
                  : 'No updates yet'}
              </span>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <Label className="text-sm font-medium">Max Risk Level</Label>
                <p className="text-xs text-muted-foreground">Highest risk level allowed for auto-deployment</p>
              </div>
              <Select
                value={localSettings.maxRiskLevel}
                onValueChange={(val) => updateSetting('maxRiskLevel', val)}
              >
                <SelectTrigger className="w-full sm:w-32">
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
              <Cpu className="size-4 text-green-500" />
              <CardTitle className="text-base">Agent Management</CardTitle>
            </div>
            <CardDescription>Configure agent behavior and resource limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <Label className="text-sm font-medium">Log Verbosity</Label>
                <p className="text-xs text-muted-foreground">Control the detail level of system logs</p>
              </div>
              <Select
                value={localSettings.logVerbosity}
                onValueChange={(val) => updateSetting('logVerbosity', val)}
              >
                <SelectTrigger className="w-full sm:w-32">
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
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
