import { create } from 'zustand'
import type { Agent, Task, Message, ProjectFile, BuildLog, AgentActivity, IDEPanel, IDEBottomTab, Project, Notification } from '@/lib/types'

/**
 * Fetch with retry logic and graceful error handling.
 * Retries up to `retries` times with exponential backoff.
 * Returns null on failure instead of throwing.
 */
async function fetchWithRetry(url: string, retries = 2, baseDelay = 500): Promise<Response | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url)
      if (res.ok) return res
      // Don't retry client errors (4xx)
      if (res.status >= 400 && res.status < 500) return res
      // Server error — retry if we have attempts left
      if (attempt < retries) {
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise((r) => setTimeout(r, delay))
        continue
      }
      return res
    } catch {
      // Network error — retry if we have attempts left
      if (attempt < retries) {
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise((r) => setTimeout(r, delay))
        continue
      }
      // All retries exhausted — return null silently
      return null
    }
  }
  return null
}

/**
 * Deduplicate an array of objects by id, keeping the last occurrence.
 */
function deduplicateById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Map<string, T>()
  for (const item of items) {
    seen.set(item.id, item)
  }
  return Array.from(seen.values())
}

// Settings defaults
const DEFAULT_SETTINGS = {
  fontSize: 13,
  tabSize: 2,
  wordWrap: false,
  minimapEnabled: true,
  lineNumbers: true,
  autoSave: true,
  pollingInterval: 30,
}

// Load settings from localStorage
function loadSettings(): typeof DEFAULT_SETTINGS {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const stored = localStorage.getItem('teamforge-ide-settings')
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_SETTINGS
}

// Save settings to localStorage
function saveSettings(settings: typeof DEFAULT_SETTINGS) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('teamforge-ide-settings', JSON.stringify(settings))
  } catch {
    // ignore storage errors
  }
}

export type AppSettings = typeof DEFAULT_SETTINGS

interface AppState {
  // Current project
  currentProject: Project | null
  setCurrentProject: (project: Project | null) => void

  // Settings
  settings: AppSettings
  updateSettings: (updates: Partial<AppSettings>) => void
  settingsOpen: boolean
  setSettingsOpen: (open: boolean) => void
  fileSearchOpen: boolean
  setFileSearchOpen: (open: boolean) => void

  // Data
  agents: Agent[]
  tasks: Task[]
  messages: Message[]
  files: ProjectFile[]
  buildLogs: BuildLog[]
  activities: AgentActivity[]

  // IDE state
  activePanel: IDEPanel
  setActivePanel: (panel: IDEPanel) => void
  activeBottomTab: IDEBottomTab
  setActiveBottomTab: (tab: IDEBottomTab) => void
  activeFileId: string | null
  setActiveFileId: (id: string | null) => void
  bottomPanelOpen: boolean
  setBottomPanelOpen: (open: boolean) => void
  bottomPanelHeight: number
  setBottomPanelHeight: (h: number) => void
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  rightPanelOpen: boolean
  setRightPanelOpen: (open: boolean) => void
  terminalMinimized: boolean
  setTerminalMinimized: (min: boolean) => void

  // Editor state
  unsavedFileIds: Set<string>
  markFileUnsaved: (id: string) => void
  markFileSaved: (id: string) => void
  cursorLine: number
  cursorColumn: number
  setCursorPosition: (line: number, column: number) => void

  // Agent detail dialog
  selectedAgentId: string | null
  setSelectedAgentId: (id: string | null) => void

  // Running state for top bar
  isRunning: boolean
  setIsRunning: (running: boolean) => void

  // Notifications
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  clearNotifications: () => void
  generateSeedNotifications: () => void

  // Loading
  loading: boolean
  setLoading: (loading: boolean) => void

  // Setters (deduplication ensures no duplicate IDs)
  setAgents: (agents: Agent[]) => void
  setTasks: (tasks: Task[]) => void
  setMessages: (messages: Message[]) => void
  setFiles: (files: ProjectFile[]) => void
  setBuildLogs: (logs: BuildLog[]) => void
  setActivities: (activities: AgentActivity[]) => void

  // Add message
  addMessage: (message: Message) => void
  addBuildLog: (log: BuildLog) => void
  addActivity: (activity: AgentActivity) => void
  updateAgent: (id: string, updates: Partial<Agent>) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  addFile: (file: ProjectFile) => void
  removeFile: (id: string) => void
  updateFileContent: (id: string, content: string) => void

  // Fetch helpers
  fetchAgents: () => Promise<void>
  fetchTasks: () => Promise<void>
  fetchMessages: () => Promise<void>
  fetchFiles: () => Promise<void>
  fetchBuildLogs: () => Promise<void>
  fetchActivities: () => Promise<void>
  fetchAll: (projectId?: string) => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  // Current project
  currentProject: null,
  setCurrentProject: (project) => set({ currentProject: project }),

  // Settings
  settings: loadSettings(),
  updateSettings: (updates) => {
    const next = { ...get().settings, ...updates }
    saveSettings(next)
    set({ settings: next })
  },
  settingsOpen: false,
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  fileSearchOpen: false,
  setFileSearchOpen: (open) => set({ fileSearchOpen: open }),

  // Data
  agents: [],
  tasks: [],
  messages: [],
  files: [],
  buildLogs: [],
  activities: [],

  // IDE state
  activePanel: 'chat',
  setActivePanel: (panel) => set({ activePanel: panel }),
  activeBottomTab: 'terminal',
  setActiveBottomTab: (tab) => set({ activeBottomTab: tab }),
  activeFileId: null,
  setActiveFileId: (id) => set({ activeFileId: id }),
  bottomPanelOpen: true,
  setBottomPanelOpen: (open) => set({ bottomPanelOpen: open }),
  bottomPanelHeight: 220,
  setBottomPanelHeight: (h) => set({ bottomPanelHeight: Math.max(100, Math.min(500, h)) }),
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  rightPanelOpen: true,
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
  terminalMinimized: false,
  setTerminalMinimized: (min) => set({ terminalMinimized: min }),

  // Editor state
  unsavedFileIds: new Set<string>(),
  markFileUnsaved: (id) => set((s) => {
    const next = new Set(s.unsavedFileIds)
    next.add(id)
    return { unsavedFileIds: next }
  }),
  markFileSaved: (id) => set((s) => {
    const next = new Set(s.unsavedFileIds)
    next.delete(id)
    return { unsavedFileIds: next }
  }),
  cursorLine: 1,
  cursorColumn: 1,
  setCursorPosition: (line, column) => set({ cursorLine: line, cursorColumn: column }),

  // Agent detail dialog
  selectedAgentId: null,
  setSelectedAgentId: (id) => set({ selectedAgentId: id }),

  // Running state
  isRunning: false,
  setIsRunning: (running) => set({ isRunning: running }),

  // Notifications
  notifications: [],
  addNotification: (notification) => set((s) => ({
    notifications: [{
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      read: false,
      createdAt: new Date().toISOString(),
    }, ...s.notifications],
  })),
  markNotificationRead: (id) => set((s) => ({
    notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
  })),
  markAllNotificationsRead: () => set((s) => ({
    notifications: s.notifications.map((n) => ({ ...n, read: true })),
  })),
  clearNotifications: () => set({ notifications: [] }),
  generateSeedNotifications: () => {
    // No-op: removed seed/placeholder notifications
  },

  // Loading
  loading: false,
  setLoading: (loading) => set({ loading }),

  // Setters (deduplication ensures no duplicate IDs)
  setAgents: (agents) => set({ agents: deduplicateById(agents) }),
  setTasks: (tasks) => set({ tasks: deduplicateById(tasks) }),
  setMessages: (messages) => set({ messages: deduplicateById(messages) }),
  setFiles: (files) => set({ files: deduplicateById(files) }),
  setBuildLogs: (logs) => set({ buildLogs: deduplicateById(logs) }),
  setActivities: (activities) => set({ activities: deduplicateById(activities) }),

  // Add message
  addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  addBuildLog: (log) => set((s) => ({ buildLogs: [log, ...s.buildLogs] })),
  addActivity: (activity) => set((s) => ({ activities: [activity, ...s.activities] })),
  updateAgent: (id, updates) => set((s) => ({
    agents: s.agents.map((a) => (a.id === id ? { ...a, ...updates } : a)),
  })),
  updateTask: (id, updates) => set((s) => ({
    tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
  })),
  addFile: (file) => set((s) => ({ files: [...s.files, file] })),
  removeFile: (id) => set((s) => ({ files: s.files.filter((f) => f.id !== id) })),
  updateFileContent: (id, content) => set((s) => ({
    files: s.files.map((f) => (f.id === id ? { ...f, content } : f)),
  })),

  // Fetch helpers — use retry logic and deduplication
  fetchAgents: async () => {
    const res = await fetchWithRetry('/api/agents')
    if (res?.ok) {
      const data = await res.json()
      set({ agents: deduplicateById(data) })
    }
  },
  fetchTasks: async () => {
    const projectId = get().currentProject?.id
    const url = projectId ? `/api/tasks?projectId=${projectId}` : '/api/tasks'
    const res = await fetchWithRetry(url)
    if (res?.ok) {
      const data = await res.json()
      set({ tasks: deduplicateById(data) })
    }
  },
  fetchMessages: async () => {
    const projectId = get().currentProject?.id
    const url = projectId ? `/api/messages?projectId=${projectId}` : '/api/messages'
    const res = await fetchWithRetry(url)
    if (res?.ok) {
      const data = await res.json()
      set({ messages: deduplicateById(data) })
    }
  },
  fetchFiles: async () => {
    const projectId = get().currentProject?.id
    const url = projectId ? `/api/files?projectId=${projectId}` : '/api/files'
    const res = await fetchWithRetry(url)
    if (res?.ok) {
      const data = await res.json()
      set({ files: deduplicateById(data) })
    }
  },
  fetchBuildLogs: async () => {
    const projectId = get().currentProject?.id
    const url = projectId ? `/api/build-logs?projectId=${projectId}` : '/api/build-logs'
    const res = await fetchWithRetry(url)
    if (res?.ok) {
      const data = await res.json()
      set({ buildLogs: deduplicateById(data) })
    }
  },
  fetchActivities: async () => {
    const res = await fetchWithRetry('/api/activities')
    if (res?.ok) {
      const data = await res.json()
      set({ activities: deduplicateById(data) })
    }
  },
  fetchAll: async (projectId) => {
    set({ loading: true })
    try {
      // Ensure we have a project — if no projectId, fetch or create one
      let pid = projectId || get().currentProject?.id
      if (!pid) {
        // Try to get the first project from the API
        const projectsRes = await fetchWithRetry('/api/projects')
        if (projectsRes?.ok) {
          const projects = await projectsRes.json()
          if (projects.length > 0) {
            pid = projects[0].id
            set({ currentProject: projects[0] })
          }
        }
      } else if (pid) {
        const pRes = await fetchWithRetry(`/api/projects/${pid}`)
        if (pRes?.ok) set({ currentProject: await pRes.json() })
      }

      // If still no project, we can't fetch project-scoped data
      if (!pid) {
        // Fetch at least agents (not project-scoped)
        const agentsRes = await fetchWithRetry('/api/agents')
        const agents = agentsRes?.ok ? await agentsRes.json() : []
        set({
          agents: deduplicateById(agents),
          tasks: [],
          messages: [],
          files: [],
          buildLogs: [],
          activities: [],
        })
        return
      }

      // Fetch all in parallel with retry
      const [agentsRes, tasksRes, messagesRes, filesRes, logsRes, activitiesRes] = await Promise.all([
        fetchWithRetry('/api/agents'),
        fetchWithRetry(`/api/tasks?projectId=${pid}`),
        fetchWithRetry(`/api/messages?projectId=${pid}`),
        fetchWithRetry(`/api/files?projectId=${pid}`),
        fetchWithRetry(`/api/build-logs?projectId=${pid}`),
        fetchWithRetry('/api/activities'),
      ])

      const [agents, tasks, messages, files, buildLogs, activities] = await Promise.all([
        agentsRes?.ok ? agentsRes.json() : [],
        tasksRes?.ok ? tasksRes.json() : [],
        messagesRes?.ok ? messagesRes.json() : [],
        filesRes?.ok ? filesRes.json() : [],
        logsRes?.ok ? logsRes.json() : [],
        activitiesRes?.ok ? activitiesRes.json() : [],
      ])

      set({
        agents: deduplicateById(agents),
        tasks: deduplicateById(tasks),
        messages: deduplicateById(messages),
        files: deduplicateById(files),
        buildLogs: deduplicateById(buildLogs),
        activities: deduplicateById(activities),
      })
    } catch {
      // Silently keep existing data on failure
    } finally {
      set({ loading: false })
    }
  },
}))
