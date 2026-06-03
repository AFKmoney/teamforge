// ============================================================================
// Self-Evolving AI System — Zustand Store
// ============================================================================

import { create } from 'zustand'
import type {
  Agent,
  Benchmark,
  ChatConversation,
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
  RecentPage,
  Page,
} from '@/lib/types'

// Re-export Page for convenience
export type { Page }

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

interface AppState {
  // Navigation
  currentPage: Page
  sidebarOpen: boolean
  sidebarCollapsed: boolean

  // Onboarding Tour
  tourActive: boolean
  tourStep: number
  tourCompleted: boolean

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
  chatConversations: ChatConversation[]
  currentConversationId: string | null
  settings: SystemSettings
  notifications: Notification[]
  unreadNotificationCount: number

  // Command Palette
  commandPaletteOpen: boolean

  // Realtime
  realtimeConnected: boolean

  // Simulation
  simulationEnabled: boolean
  simulationSpeed: number
  lastSimulationUpdate: Date | null

  // Recent pages history
  recentPages: RecentPage[]

  // Loading state
  isLoading: boolean

  // Actions — Navigation
  setCurrentPage: (page: Page) => void
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  clearRecentPages: () => void

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
  setChatMessages: (messages: ChatMessage[]) => void
  setChatConversations: (conversations: ChatConversation[]) => void
  setCurrentConversationId: (id: string | null) => void
  createNewConversation: () => void
  switchConversation: (id: string) => void
  deleteConversation: (id: string) => void
  updateMessageReaction: (messageId: string, reaction: 'thumbs-up' | 'thumbs-down' | null) => void
  clearChatHistory: () => void

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

  // Actions — Simulation
  toggleSimulation: () => void
  setSimulationSpeed: (speed: number) => void
  setLastSimulationUpdate: (date: Date) => void

  // Actions — Loading
  setIsLoading: (loading: boolean) => void

  // Actions — Tour
  startTour: () => void
  nextTourStep: () => void
  prevTourStep: () => void
  endTour: () => void
  completeTour: () => void
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
  chatConversations: [],
  currentConversationId: null,
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

  // Simulation defaults
  simulationEnabled: true,
  simulationSpeed: 1,
  lastSimulationUpdate: null,

  // Loading default
  isLoading: false,

  // Recent pages default
  recentPages: [],

  // Tour defaults
  tourActive: false,
  tourStep: 0,
  tourCompleted: (() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('evoai-tour-completed') === 'true'
    }
    return false
  })(),

  // Navigation actions
  setCurrentPage: (page) =>
    set((state) => {
      const now = new Date().toISOString()
      // Remove any existing entry for this page, then prepend
      const filtered = state.recentPages.filter((r) => r.page !== page)
      const updatedRecent = [{ page, visitedAt: now }, ...filtered].slice(0, 5)
      return { currentPage: page, recentPages: updatedRecent }
    }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  clearRecentPages: () => set({ recentPages: [] }),

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

  // Chat actions
  addChatMessage: (message) =>
    set((state) => {
      const updatedMessages = [...state.chatMessages, message]
      // Auto-update conversation title from first user message
      const currentConv = state.chatConversations.find(
        (c) => c.id === state.currentConversationId
      )
      let updatedConversations = state.chatConversations
      if (currentConv && currentConv.title === 'New Conversation' && message.role === 'user') {
        updatedConversations = state.chatConversations.map((c) =>
          c.id === currentConv.id
            ? { ...c, title: message.content.slice(0, 50), messages: updatedMessages, updatedAt: new Date().toISOString() }
            : c
        )
      } else if (currentConv) {
        updatedConversations = state.chatConversations.map((c) =>
          c.id === currentConv.id
            ? { ...c, messages: updatedMessages, updatedAt: new Date().toISOString() }
            : c
        )
      }
      return { chatMessages: updatedMessages, chatConversations: updatedConversations }
    }),

  setChatMessages: (messages) => set({ chatMessages: messages }),

  setChatConversations: (conversations) => set({ chatConversations: conversations }),

  setCurrentConversationId: (id) => set({ currentConversationId: id }),

  createNewConversation: () =>
    set((state) => {
      // Save current conversation if it has messages
      let updatedConversations = state.chatConversations
      if (state.chatMessages.length > 0 && state.currentConversationId) {
        updatedConversations = state.chatConversations.map((c) =>
          c.id === state.currentConversationId
            ? { ...c, messages: state.chatMessages, updatedAt: new Date().toISOString() }
            : c
        )
      }
      const newId = Date.now().toString()
      const newConv: ChatConversation = {
        id: newId,
        title: 'New Conversation',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      return {
        chatMessages: [],
        currentConversationId: newId,
        chatConversations: [newConv, ...updatedConversations].slice(0, 10),
      }
    }),

  switchConversation: (id) =>
    set((state) => {
      // Save current messages to current conversation
      let updatedConversations = state.chatConversations
      if (state.chatMessages.length > 0 && state.currentConversationId) {
        updatedConversations = state.chatConversations.map((c) =>
          c.id === state.currentConversationId
            ? { ...c, messages: state.chatMessages, updatedAt: new Date().toISOString() }
            : c
        )
      }
      const targetConv = updatedConversations.find((c) => c.id === id)
      return {
        chatMessages: targetConv?.messages ?? [],
        currentConversationId: id,
        chatConversations: updatedConversations,
      }
    }),

  deleteConversation: (id) =>
    set((state) => {
      const filtered = state.chatConversations.filter((c) => c.id !== id)
      if (id === state.currentConversationId) {
        const newId = filtered.length > 0 ? filtered[0].id : Date.now().toString()
        const targetConv = filtered.find((c) => c.id === newId)
        if (filtered.length === 0) {
          const newConv: ChatConversation = {
            id: newId,
            title: 'New Conversation',
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          return {
            chatConversations: [newConv],
            currentConversationId: newId,
            chatMessages: [],
          }
        }
        return {
          chatConversations: filtered,
          currentConversationId: newId,
          chatMessages: targetConv?.messages ?? [],
        }
      }
      return { chatConversations: filtered }
    }),

  updateMessageReaction: (messageId, reaction) =>
    set((state) => {
      const updatedMessages = state.chatMessages.map((m) =>
        m.id === messageId ? { ...m, reaction } : m
      )
      const currentConvId = state.currentConversationId
      const updatedConversations = state.chatConversations.map((c) =>
        c.id === currentConvId ? { ...c, messages: updatedMessages } : c
      )
      return { chatMessages: updatedMessages, chatConversations: updatedConversations }
    }),

  clearChatHistory: () =>
    set((state) => {
      const currentConvId = state.currentConversationId
      const updatedConversations = state.chatConversations.map((c) =>
        c.id === currentConvId ? { ...c, messages: [], title: 'New Conversation', updatedAt: new Date().toISOString() } : c
      )
      return { chatMessages: [], chatConversations: updatedConversations }
    }),

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

  // Simulation actions
  toggleSimulation: () => set((s) => ({ simulationEnabled: !s.simulationEnabled })),
  setSimulationSpeed: (speed) => set({ simulationSpeed: speed }),
  setLastSimulationUpdate: (date) => set({ lastSimulationUpdate: date }),

  // Loading action
  setIsLoading: (loading) => set({ isLoading: loading }),

  // Tour actions
  startTour: () => set({ tourActive: true, tourStep: 0 }),
  nextTourStep: () => set((state) => ({ tourStep: state.tourStep + 1 })),
  prevTourStep: () => set((state) => ({ tourStep: Math.max(0, state.tourStep - 1) })),
  endTour: () => set({ tourActive: false }),
  completeTour: () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('evoai-tour-completed', 'true')
    }
    set({ tourActive: false, tourCompleted: true })
  },
}))
