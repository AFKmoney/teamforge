import { create } from 'zustand'
import type { Agent, Task, Message, ProjectFile, BuildLog, AgentActivity, IDEPanel, IDEBottomTab, Project } from '@/lib/types'

interface AppState {
  // Current project
  currentProject: Project | null
  setCurrentProject: (project: Project | null) => void

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
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  rightPanelOpen: boolean
  setRightPanelOpen: (open: boolean) => void
  terminalMinimized: boolean
  setTerminalMinimized: (min: boolean) => void

  // Loading
  loading: boolean
  setLoading: (loading: boolean) => void

  // Setters
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
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  rightPanelOpen: true,
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
  terminalMinimized: false,
  setTerminalMinimized: (min) => set({ terminalMinimized: min }),

  // Loading
  loading: false,
  setLoading: (loading) => set({ loading }),

  // Setters
  setAgents: (agents) => set({ agents }),
  setTasks: (tasks) => set({ tasks }),
  setMessages: (messages) => set({ messages }),
  setFiles: (files) => set({ files }),
  setBuildLogs: (logs) => set({ buildLogs: logs }),
  setActivities: (activities) => set({ activities }),

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

  // Fetch helpers
  fetchAgents: async () => {
    try {
      const res = await fetch('/api/agents')
      if (res.ok) set({ agents: await res.json() })
    } catch (e) { console.error('Failed to fetch agents:', e) }
  },
  fetchTasks: async () => {
    try {
      const projectId = get().currentProject?.id
      const url = projectId ? `/api/tasks?projectId=${projectId}` : '/api/tasks'
      const res = await fetch(url)
      if (res.ok) set({ tasks: await res.json() })
    } catch (e) { console.error('Failed to fetch tasks:', e) }
  },
  fetchMessages: async () => {
    try {
      const projectId = get().currentProject?.id
      const url = projectId ? `/api/messages?projectId=${projectId}` : '/api/messages'
      const res = await fetch(url)
      if (res.ok) set({ messages: await res.json() })
    } catch (e) { console.error('Failed to fetch messages:', e) }
  },
  fetchFiles: async () => {
    try {
      const projectId = get().currentProject?.id
      const url = projectId ? `/api/files?projectId=${projectId}` : '/api/files'
      const res = await fetch(url)
      if (res.ok) set({ files: await res.json() })
    } catch (e) { console.error('Failed to fetch files:', e) }
  },
  fetchBuildLogs: async () => {
    try {
      const projectId = get().currentProject?.id
      const url = projectId ? `/api/build-logs?projectId=${projectId}` : '/api/build-logs'
      const res = await fetch(url)
      if (res.ok) set({ buildLogs: await res.json() })
    } catch (e) { console.error('Failed to fetch build logs:', e) }
  },
  fetchActivities: async () => {
    try {
      const res = await fetch('/api/activities')
      if (res.ok) set({ activities: await res.json() })
    } catch (e) { console.error('Failed to fetch activities:', e) }
  },
  fetchAll: async (projectId) => {
    set({ loading: true })
    try {
      // Fetch project
      if (projectId) {
        const pRes = await fetch(`/api/projects/${projectId}`)
        if (pRes.ok) set({ currentProject: await pRes.json() })
      }

      // Fetch all in parallel
      const pid = projectId || get().currentProject?.id
      const [agentsRes, tasksRes, messagesRes, filesRes, logsRes, activitiesRes] = await Promise.all([
        fetch('/api/agents'),
        fetch(pid ? `/api/tasks?projectId=${pid}` : '/api/tasks'),
        fetch(pid ? `/api/messages?projectId=${pid}` : '/api/messages'),
        fetch(pid ? `/api/files?projectId=${pid}` : '/api/files'),
        fetch(pid ? `/api/build-logs?projectId=${pid}` : '/api/build-logs'),
        fetch('/api/activities'),
      ])

      const [agents, tasks, messages, files, buildLogs, activities] = await Promise.all([
        agentsRes.ok ? agentsRes.json() : [],
        tasksRes.ok ? tasksRes.json() : [],
        messagesRes.ok ? messagesRes.json() : [],
        filesRes.ok ? filesRes.json() : [],
        logsRes.ok ? logsRes.json() : [],
        activitiesRes.ok ? activitiesRes.json() : [],
      ])

      set({ agents, tasks, messages, files, buildLogs, activities })
    } catch (e) {
      console.error('Failed to fetch all:', e)
    } finally {
      set({ loading: false })
    }
  },
}))
