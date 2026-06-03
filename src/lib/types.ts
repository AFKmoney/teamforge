// ===== Domain Types for Autonomous IDE =====

export type AgentRole = 'architect' | 'developer' | 'reviewer' | 'tester' | 'devops' | 'pm'
export type AgentStatus = 'idle' | 'thinking' | 'coding' | 'reviewing' | 'testing' | 'deploying' | 'sleeping'
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked'
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low'
export type TaskType = 'feature' | 'bugfix' | 'refactor' | 'test' | 'docs' | 'infra'
export type MessageType = 'chat' | 'system' | 'action' | 'code_change' | 'review_comment' | 'test_result' | 'deploy_log'
export type BuildStatus = 'running' | 'success' | 'failed' | 'warning'
export type BuildType = 'build' | 'test' | 'lint' | 'deploy'
export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived'
export type IDEPanel = 'agents' | 'chat' | 'tasks' | 'terminal' | 'files'
export type IDEBottomTab = 'terminal' | 'tasks' | 'build' | 'problems' | 'analytics' | 'activities'
export type NotificationType = 'info' | 'success' | 'warning' | 'error'
export type NotificationCategory = 'task' | 'build' | 'agent' | 'system' | 'chat'

export interface Notification {
  id: string
  title: string
  message: string
  type: NotificationType
  category: NotificationCategory
  read: boolean
  createdAt: string
  actionUrl?: string
}

export interface Project {
  id: string
  name: string
  description: string
  status: ProjectStatus
  techStack: string[]
  repoUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface Agent {
  id: string
  name: string
  role: AgentRole
  status: AgentStatus
  avatar: string
  specialty: string
  currentTaskId: string | null
  tokensUsed: number
  tasksCompleted: number
  successRate: number
  lastActive: string
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: string
  projectId: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  type: TaskType
  assigneeId: string | null
  parentTaskId: string | null
  subtasks: string[]
  output: string
  createdAt: string
  updatedAt: string
  completedAt: string | null
  // Joined
  assignee?: Agent | null
}

export interface Message {
  id: string
  projectId: string
  agentId: string | null
  content: string
  type: MessageType
  metadata: Record<string, unknown>
  createdAt: string
  // Joined
  agent?: Agent | null
}

export interface ProjectFile {
  id: string
  projectId: string
  path: string
  content: string
  language: string
  isDirectory: boolean
  createdAt: string
  updatedAt: string
}

export interface BuildLog {
  id: string
  projectId: string
  output: string
  status: BuildStatus
  type: BuildType
  createdAt: string
}

export interface AgentActivity {
  id: string
  agentId: string
  action: string
  description: string
  metadata: Record<string, unknown>
  createdAt: string
  // Joined
  agent?: Agent | null
}

// Agent role config
export const AGENT_ROLE_CONFIG: Record<AgentRole, { label: string; color: string; bgColor: string; darkBgColor: string; icon: string; description: string }> = {
  architect: { label: 'Architect', color: 'text-violet-600 dark:text-violet-400', bgColor: 'bg-violet-500/10', darkBgColor: 'dark:bg-violet-500/20', icon: '🏗️', description: 'System design & architecture' },
  developer: { label: 'Developer', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-500/10', darkBgColor: 'dark:bg-emerald-500/20', icon: '💻', description: 'Code implementation' },
  reviewer: { label: 'Reviewer', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-500/10', darkBgColor: 'dark:bg-blue-500/20', icon: '🔍', description: 'Code review & quality' },
  tester: { label: 'Tester', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-500/10', darkBgColor: 'dark:bg-amber-500/20', icon: '🧪', description: 'Testing & validation' },
  devops: { label: 'DevOps', color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-500/10', darkBgColor: 'dark:bg-orange-500/20', icon: '🚀', description: 'CI/CD & deployment' },
  pm: { label: 'PM', color: 'text-pink-600 dark:text-pink-400', bgColor: 'bg-pink-500/10', darkBgColor: 'dark:bg-pink-500/20', icon: '📋', description: 'Project management' },
}

export const AGENT_STATUS_CONFIG: Record<AgentStatus, { label: string; color: string; dotColor: string }> = {
  idle: { label: 'Idle', color: 'text-muted-foreground', dotColor: 'bg-muted-foreground' },
  thinking: { label: 'Thinking', color: 'text-violet-500', dotColor: 'bg-violet-500' },
  coding: { label: 'Coding', color: 'text-emerald-500', dotColor: 'bg-emerald-500' },
  reviewing: { label: 'Reviewing', color: 'text-blue-500', dotColor: 'bg-blue-500' },
  testing: { label: 'Testing', color: 'text-amber-500', dotColor: 'bg-amber-500' },
  deploying: { label: 'Deploying', color: 'text-orange-500', dotColor: 'bg-orange-500' },
  sleeping: { label: 'Sleeping', color: 'text-muted-foreground', dotColor: 'bg-muted-foreground/50' },
}

export const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bgColor: string }> = {
  backlog: { label: 'Backlog', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  todo: { label: 'To Do', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-500/10' },
  in_progress: { label: 'In Progress', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-500/10' },
  in_review: { label: 'In Review', color: 'text-violet-600 dark:text-violet-400', bgColor: 'bg-violet-500/10' },
  done: { label: 'Done', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-500/10' },
  blocked: { label: 'Blocked', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-500/10' },
}

export const TASK_PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; icon: string }> = {
  critical: { label: 'Critical', color: 'text-red-600 dark:text-red-400', icon: '🔴' },
  high: { label: 'High', color: 'text-orange-600 dark:text-orange-400', icon: '🟠' },
  medium: { label: 'Medium', color: 'text-amber-600 dark:text-amber-400', icon: '🟡' },
  low: { label: 'Low', color: 'text-muted-foreground', icon: '⚪' },
}

export const TASK_TYPE_CONFIG: Record<TaskType, { label: string; color: string }> = {
  feature: { label: 'Feature', color: 'text-emerald-600 dark:text-emerald-400' },
  bugfix: { label: 'Bug Fix', color: 'text-red-600 dark:text-red-400' },
  refactor: { label: 'Refactor', color: 'text-blue-600 dark:text-blue-400' },
  test: { label: 'Test', color: 'text-amber-600 dark:text-amber-400' },
  docs: { label: 'Docs', color: 'text-muted-foreground' },
  infra: { label: 'Infra', color: 'text-orange-600 dark:text-orange-400' },
}
