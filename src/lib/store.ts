// ============================================================================
// Self-Evolving AI System — Zustand Store
// ============================================================================

import { create } from 'zustand'
import type {
  Agent,
  Benchmark,
  ChatMessage,
  DashboardData,
  EvolutionEvent,
  Experiment,
  KnowledgeEdge,
  KnowledgeNode,
  Memory,
  SafetyEvent,
  SystemMetric,
  SystemSettings,
  Notification,
} from '@/lib/types'

// ---------------------------------------------------------------------------
// Page navigation
// ---------------------------------------------------------------------------

export type Page =
  | 'dashboard'
  | 'agents'
  | 'evolution'
  | 'memory'
  | 'knowledge'
  | 'research'
  | 'benchmarks'
  | 'safety'
  | 'chat'
  | 'activity'
  | 'settings'
  | 'topology'

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

interface AppState {
  // Navigation
  currentPage: Page
  sidebarOpen: boolean
  sidebarCollapsed: boolean

  // Data
  dashboardData: DashboardData | null
  agents: Agent[]
  evolutionEvents: EvolutionEvent[]
  memories: Memory[]
  knowledgeNodes: KnowledgeNode[]
  knowledgeEdges: KnowledgeEdge[]
  benchmarks: Benchmark[]
  safetyEvents: SafetyEvent[]
  experiments: Experiment[]
  metrics: SystemMetric[]
  chatMessages: ChatMessage[]
  settings: SystemSettings
  notifications: Notification[]
  unreadNotificationCount: number

  // Command Palette
  commandPaletteOpen: boolean

  // Realtime
  realtimeConnected: boolean

  // Loading state
  isLoading: boolean

  // Actions — Navigation
  setCurrentPage: (page: Page) => void
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void

  // Actions — Data setters
  setDashboardData: (data: DashboardData) => void
  setAgents: (agents: Agent[]) => void
  setEvolutionEvents: (events: EvolutionEvent[]) => void
  setMemories: (memories: Memory[]) => void
  setKnowledgeNodes: (nodes: KnowledgeNode[]) => void
  setKnowledgeEdges: (edges: KnowledgeEdge[]) => void
  setBenchmarks: (benchmarks: Benchmark[]) => void
  setSafetyEvents: (events: SafetyEvent[]) => void
  setExperiments: (experiments: Experiment[]) => void
  setMetrics: (metrics: SystemMetric[]) => void
  setSettings: (settings: SystemSettings) => void

  // Actions — Chat
  addChatMessage: (message: ChatMessage) => void

  // Actions — Notifications
  addNotification: (notification: Notification) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  clearNotifications: () => void

  // Actions — Command Palette
  setCommandPaletteOpen: (open: boolean) => void
  toggleCommandPalette: () => void

  // Actions — Realtime
  setRealtimeConnected: (connected: boolean) => void

  // Actions — Loading
  setIsLoading: (loading: boolean) => void
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useAppStore = create<AppState>((set) => ({
  // Navigation defaults
  currentPage: 'dashboard',
  sidebarOpen: true,
  sidebarCollapsed: false,

  // Data defaults
  dashboardData: null,
  agents: [],
  evolutionEvents: [],
  memories: [],
  knowledgeNodes: [],
  knowledgeEdges: [],
  benchmarks: [],
  safetyEvents: [],
  experiments: [],
  metrics: [],
  chatMessages: [],
  settings: {
    autoEvolution: true,
    maxConcurrentAgents: 10,
    safetyStrictMode: true,
    evolutionIntervalMinutes: 30,
    memoryRetentionDays: 90,
    maxRiskLevel: 'medium',
    enableResearchLab: true,
    logVerbosity: 'normal',
  },
  notifications: [],
  unreadNotificationCount: 0,

  // Command Palette default
  commandPaletteOpen: false,

  // Realtime default
  realtimeConnected: false,

  // Loading default
  isLoading: false,

  // Navigation actions
  setCurrentPage: (page) => set({ currentPage: page }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  // Data setter actions
  setDashboardData: (data) => set({ dashboardData: data }),
  setAgents: (agents) => set({ agents }),
  setEvolutionEvents: (events) => set({ evolutionEvents: events }),
  setMemories: (memories) => set({ memories }),
  setKnowledgeNodes: (nodes) => set({ knowledgeNodes: nodes }),
  setKnowledgeEdges: (edges) => set({ knowledgeEdges: edges }),
  setBenchmarks: (benchmarks) => set({ benchmarks }),
  setSafetyEvents: (events) => set({ safetyEvents: events }),
  setExperiments: (experiments) => set({ experiments }),
  setMetrics: (metrics) => set({ metrics }),
  setSettings: (settings) => set({ settings }),

  // Chat action — append message
  addChatMessage: (message) =>
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),

  // Notification actions
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 50),
      unreadNotificationCount: state.unreadNotificationCount + (notification.read ? 0 : 1),
    })),
  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadNotificationCount: Math.max(0, state.unreadNotificationCount - 1),
    })),
  markAllNotificationsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadNotificationCount: 0,
    })),
  clearNotifications: () => set({ notifications: [], unreadNotificationCount: 0 }),

  // Command Palette actions
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleCommandPalette: () => set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),

  // Realtime action
  setRealtimeConnected: (connected) => set({ realtimeConnected: connected }),

  // Loading action
  setIsLoading: (loading) => set({ isLoading: loading }),
}))
