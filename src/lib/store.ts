import { create } from 'zustand'
import type { Agent, Task, Message, ChatSession, ProjectFile, BuildLog, AgentActivity, IDEPanel, IDEBottomTab, Project, Notification, GitCommit, GitBranch, GitFileStatus, AIProviderType } from '@/lib/types'
import { AI_SETTINGS_KEY, DEFAULT_AI_SETTINGS, type AISettings } from '@/lib/ai-providers'

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
  // AI Provider settings
  aiProvider: 'zai' as AIProviderType,
  aiModel: 'deepseek-chat',
  nvidiaApiKey: '',
  openaiCompatibleBaseUrl: '',
  openaiCompatibleApiKey: '',
  openaiCompatibleModelId: 'custom',
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

// Save AI settings to localStorage (separate key)
function saveAISettingsLocal(settings: AISettings) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // ignore storage errors
  }
}

// NOTE: We no longer read AI settings from localStorage at store creation time.
// Instead, we always initialize with DEFAULT_AI_SETTINGS and hydrate from
// localStorage in a useEffect after mount. This prevents hydration mismatches
// where server renders with defaults but client renders with persisted values.

export type AppSettings = typeof DEFAULT_SETTINGS & AISettings

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
  chatSessions: ChatSession[]
  currentChatSessionId: string | null
  setCurrentChatSessionId: (id: string | null) => void
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

  // Find & Replace
  findReplaceOpen: boolean
  setFindReplaceOpen: (open: boolean) => void
  findQuery: string
  setFindQuery: (query: string) => void
  replaceQuery: string
  setReplaceQuery: (query: string) => void
  findCaseSensitive: boolean
  setFindCaseSensitive: (v: boolean) => void
  findWholeWord: boolean
  setFindWholeWord: (v: boolean) => void
  findRegex: boolean
  setFindRegex: (v: boolean) => void
  findMatches: { line: number; startCol: number; endCol: number; text: string }[]
  setFindMatches: (matches: { line: number; startCol: number; endCol: number; text: string }[]) => void
  currentMatchIndex: number
  setCurrentMatchIndex: (index: number) => void

  // Go to Line
  goToLineOpen: boolean
  setGoToLineOpen: (open: boolean) => void

  // Global Search
  globalSearchOpen: boolean
  setGlobalSearchOpen: (open: boolean) => void
  globalSearchQuery: string
  setGlobalSearchQuery: (query: string) => void

  // Agent detail dialog
  selectedAgentId: string | null
  setSelectedAgentId: (id: string | null) => void

  // Git state (simulated)
  currentBranch: string
  setCurrentBranch: (branch: string) => void
  branches: GitBranch[]
  setBranches: (branches: GitBranch[]) => void
  addBranch: (name: string) => void
  deleteBranch: (name: string) => void
  gitFileStatuses: Record<string, GitFileStatus>
  setGitFileStatus: (filePath: string, status: GitFileStatus) => void
  removeGitFileStatus: (filePath: string) => void
  clearGitFileStatuses: () => void
  gitCommits: GitCommit[]
  addGitCommit: (commit: GitCommit) => void

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

  // AI Provider settings (synced with localStorage)
  aiSettings: AISettings
  updateAISettings: (updates: Partial<AISettings>) => void
  hydrateAISettings: () => void

  // Loading
  loading: boolean
  setLoading: (loading: boolean) => void

  // Setters (deduplication ensures no duplicate IDs)
  setAgents: (agents: Agent[]) => void
  setTasks: (tasks: Task[]) => void
  setMessages: (messages: Message[]) => void
  setChatSessions: (sessions: ChatSession[]) => void
  setFiles: (files: ProjectFile[]) => void
  setBuildLogs: (logs: BuildLog[]) => void
  setActivities: (activities: AgentActivity[]) => void

  // Add message
  addMessage: (message: Message) => void
  addChatSession: (session: ChatSession) => void
  removeChatSession: (id: string) => void
  updateChatSession: (id: string, updates: Partial<ChatSession>) => void
  addBuildLog: (log: BuildLog) => void
  addActivity: (activity: AgentActivity) => void
  updateAgent: (id: string, updates: Partial<Agent>) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  addFile: (file: ProjectFile) => void
  removeFile: (id: string) => void
  updateFileContent: (id: string, content: string) => void

  // Save all unsaved files
  saveAllFiles: () => Promise<{ saved: number; failed: number }>

  // Fetch helpers
  fetchAgents: () => Promise<void>
  fetchTasks: () => Promise<void>
  fetchMessages: () => Promise<void>
  fetchChatSessions: () => Promise<void>
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
  chatSessions: [],
  currentChatSessionId: null,
  setCurrentChatSessionId: (id) => set({ currentChatSessionId: id }),
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

  // Find & Replace
  findReplaceOpen: false,
  setFindReplaceOpen: (open) => set({ findReplaceOpen: open }),
  findQuery: '',
  setFindQuery: (query) => set({ findQuery: query, currentMatchIndex: 0 }),
  replaceQuery: '',
  setReplaceQuery: (query) => set({ replaceQuery: query }),
  findCaseSensitive: false,
  setFindCaseSensitive: (v) => set({ findCaseSensitive: v, currentMatchIndex: 0 }),
  findWholeWord: false,
  setFindWholeWord: (v) => set({ findWholeWord: v, currentMatchIndex: 0 }),
  findRegex: false,
  setFindRegex: (v) => set({ findRegex: v, currentMatchIndex: 0 }),
  findMatches: [],
  setFindMatches: (matches) => set({ findMatches: matches }),
  currentMatchIndex: 0,
  setCurrentMatchIndex: (index) => set({ currentMatchIndex: index }),

  // Go to Line
  goToLineOpen: false,
  setGoToLineOpen: (open) => set({ goToLineOpen: open }),

  // Global Search
  globalSearchOpen: false,
  setGlobalSearchOpen: (open) => set({ globalSearchOpen: open }),
  globalSearchQuery: '',
  setGlobalSearchQuery: (query) => set({ globalSearchQuery: query }),

  // Agent detail dialog
  selectedAgentId: null,
  setSelectedAgentId: (id) => set({ selectedAgentId: id }),

  // Git state (simulated)
  currentBranch: 'main',
  setCurrentBranch: (branch) => set({ currentBranch: branch, branches: get().branches.map((b) => ({ ...b, isCurrent: b.name === branch })) }),
  branches: [
    { name: 'main', isCurrent: true, lastCommitDate: new Date().toISOString() },
  ],
  setBranches: (branches) => set({ branches }),
  addBranch: (name) => set((s) => ({
    branches: [...s.branches, { name, isCurrent: false, lastCommitDate: new Date().toISOString() }],
  })),
  deleteBranch: (name) => set((s) => ({
    branches: s.branches.filter((b) => b.name !== name),
  })),
  gitFileStatuses: {},
  setGitFileStatus: (filePath, status) => set((s) => ({
    gitFileStatuses: { ...s.gitFileStatuses, [filePath]: status },
  })),
  removeGitFileStatus: (filePath) => set((s) => {
    const next = { ...s.gitFileStatuses }
    delete next[filePath]
    return { gitFileStatuses: next }
  }),
  clearGitFileStatuses: () => set({ gitFileStatuses: {} }),
  gitCommits: [],
  addGitCommit: (commit) => set((s) => ({ gitCommits: [commit, ...s.gitCommits] })),

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

  // AI Provider settings — always start with defaults to avoid hydration mismatch
  aiSettings: DEFAULT_AI_SETTINGS,
  updateAISettings: (updates) => {
    const next = { ...get().aiSettings, ...updates }
    saveAISettingsLocal(next)
    // Also update the main settings for backward compat
    const settingsNext = { ...get().settings }
    if (updates.provider !== undefined) settingsNext.aiProvider = updates.provider
    if (updates.model !== undefined) settingsNext.aiModel = updates.model
    if (updates.nvidiaApiKey !== undefined) settingsNext.nvidiaApiKey = updates.nvidiaApiKey
    if (updates.openaiCompatibleBaseUrl !== undefined) settingsNext.openaiCompatibleBaseUrl = updates.openaiCompatibleBaseUrl
    if (updates.openaiCompatibleApiKey !== undefined) settingsNext.openaiCompatibleApiKey = updates.openaiCompatibleApiKey
    if (updates.openaiCompatibleModelId !== undefined) settingsNext.openaiCompatibleModelId = updates.openaiCompatibleModelId
    saveSettings(settingsNext)
    set({ aiSettings: next, settings: settingsNext })
  },
  // Hydrate AI settings from localStorage after client mount
  hydrateAISettings: () => {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem(AI_SETTINGS_KEY)
      if (stored) {
        const persisted = { ...DEFAULT_AI_SETTINGS, ...JSON.parse(stored) }
        set({ aiSettings: persisted })
      }
    } catch {
      // ignore parse errors
    }
  },

  // Loading
  loading: false,
  setLoading: (loading) => set({ loading }),

  // Setters (deduplication ensures no duplicate IDs)
  setAgents: (agents) => set({ agents: deduplicateById(agents) }),
  setTasks: (tasks) => set({ tasks: deduplicateById(tasks) }),
  setMessages: (messages) => set({ messages: deduplicateById(messages) }),
  setChatSessions: (sessions) => set({ chatSessions: deduplicateById(sessions) }),
  setFiles: (files) => set({ files: deduplicateById(files) }),
  setBuildLogs: (logs) => set({ buildLogs: deduplicateById(logs) }),
  setActivities: (activities) => set({ activities: deduplicateById(activities) }),

  // Add message
  addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  addChatSession: (session) => set((s) => ({ chatSessions: [session, ...s.chatSessions] })),
  removeChatSession: (id) => set((s) => ({ chatSessions: s.chatSessions.filter((cs) => cs.id !== id) })),
  updateChatSession: (id, updates) => set((s) => ({
    chatSessions: s.chatSessions.map((cs) => cs.id === id ? { ...cs, ...updates } : cs),
  })),
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

  // Save all unsaved files
  saveAllFiles: async () => {
    const { files, unsavedFileIds, markFileSaved } = get()
    const unsavedFiles = files.filter((f) => unsavedFileIds.has(f.id) && !f.isDirectory)
    let saved = 0
    let failed = 0

    const results = await Promise.allSettled(
      unsavedFiles.map(async (file) => {
        const res = await fetch(`/api/files/${file.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: file.content }),
        })
        if (res.ok) {
          markFileSaved(file.id)
          return true
        }
        throw new Error(`Failed to save ${file.path}`)
      })
    )

    for (const result of results) {
      if (result.status === 'fulfilled') saved++
      else failed++
    }

    return { saved, failed }
  },

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
    const sessionId = get().currentChatSessionId
    let url = '/api/messages'
    const params: string[] = []
    if (projectId) params.push(`projectId=${projectId}`)
    if (sessionId) params.push(`chatSessionId=${sessionId}`)
    if (params.length > 0) url += '?' + params.join('&')
    const res = await fetchWithRetry(url)
    if (res?.ok) {
      const data = await res.json()
      set({ messages: deduplicateById(data) })
    }
  },
  fetchChatSessions: async () => {
    const projectId = get().currentProject?.id
    const url = projectId ? `/api/chat-sessions?projectId=${projectId}` : '/api/chat-sessions'
    const res = await fetchWithRetry(url)
    if (res?.ok) {
      const data = await res.json()
      set({ chatSessions: deduplicateById(data) })
      // Auto-select the most recent session if none selected
      if (!get().currentChatSessionId && data.length > 0) {
        set({ currentChatSessionId: data[0].id })
      }
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
      const [agentsRes, tasksRes, messagesRes, chatSessionsRes, filesRes, logsRes, activitiesRes] = await Promise.all([
        fetchWithRetry('/api/agents'),
        fetchWithRetry(`/api/tasks?projectId=${pid}`),
        fetchWithRetry(`/api/messages?projectId=${pid}`),
        fetchWithRetry(`/api/chat-sessions?projectId=${pid}`),
        fetchWithRetry(`/api/files?projectId=${pid}`),
        fetchWithRetry(`/api/build-logs?projectId=${pid}`),
        fetchWithRetry('/api/activities'),
      ])

      const [agents, tasks, messages, chatSessions, files, buildLogs, activities] = await Promise.all([
        agentsRes?.ok ? agentsRes.json() : [],
        tasksRes?.ok ? tasksRes.json() : [],
        messagesRes?.ok ? messagesRes.json() : [],
        chatSessionsRes?.ok ? chatSessionsRes.json() : [],
        filesRes?.ok ? filesRes.json() : [],
        logsRes?.ok ? logsRes.json() : [],
        activitiesRes?.ok ? activitiesRes.json() : [],
      ])

      // Auto-select the most recent chat session if none selected
      const currentSessionId = get().currentChatSessionId
      const autoSessionId = !currentSessionId && chatSessions.length > 0 ? chatSessions[0].id : currentSessionId

      set({
        agents: deduplicateById(agents),
        tasks: deduplicateById(tasks),
        messages: deduplicateById(messages),
        chatSessions: deduplicateById(chatSessions),
        currentChatSessionId: autoSessionId,
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
