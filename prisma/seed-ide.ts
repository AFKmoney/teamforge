import { db } from '../src/lib/db'

async function seed() {
  console.log('🌱 Seeding IDE database...')

  // Clean up existing data
  await db.agentActivity.deleteMany()
  await db.buildLog.deleteMany()
  await db.message.deleteMany()
  await db.projectFile.deleteMany()
  await db.task.deleteMany()
  await db.agent.deleteMany()
  await db.project.deleteMany()

  // Create project
  const project = await db.project.create({
    data: {
      id: 'proj_01',
      name: 'TeamForge IDE',
      description: 'An autonomous IDE where AI agents collaborate to build software',
      status: 'active',
      techStack: '["TypeScript", "React", "Next.js", "Prisma", "Tailwind CSS"]',
      repoUrl: 'https://github.com/teamforge/ide',
    },
  })

  // Create 6 agents
  const agents = await Promise.all([
    db.agent.create({
      data: {
        id: 'agent_arch',
        name: 'Atlas',
        role: 'architect',
        status: 'thinking',
        avatar: '🏗️',
        specialty: 'System design & architecture patterns',
        currentTaskId: 'task_01',
        tokensUsed: 142000,
        tasksCompleted: 23,
        successRate: 0.97,
        lastActive: new Date(),
      },
    }),
    db.agent.create({
      data: {
        id: 'agent_dev',
        name: 'Codey',
        role: 'developer',
        status: 'coding',
        avatar: '💻',
        specialty: 'Full-stack implementation & refactoring',
        currentTaskId: 'task_02',
        tokensUsed: 285000,
        tasksCompleted: 47,
        successRate: 0.94,
        lastActive: new Date(),
      },
    }),
    db.agent.create({
      data: {
        id: 'agent_rev',
        name: 'Prism',
        role: 'reviewer',
        status: 'reviewing',
        avatar: '🔍',
        specialty: 'Code review & quality assurance',
        currentTaskId: 'task_03',
        tokensUsed: 98000,
        tasksCompleted: 62,
        successRate: 0.99,
        lastActive: new Date(Date.now() - 120000),
      },
    }),
    db.agent.create({
      data: {
        id: 'agent_test',
        name: 'Flux',
        role: 'tester',
        status: 'testing',
        avatar: '🧪',
        specialty: 'Test automation & edge case detection',
        currentTaskId: 'task_04',
        tokensUsed: 76000,
        tasksCompleted: 38,
        successRate: 0.92,
        lastActive: new Date(Date.now() - 300000),
      },
    }),
    db.agent.create({
      data: {
        id: 'agent_ops',
        name: 'Blaze',
        role: 'devops',
        status: 'deploying',
        avatar: '🚀',
        specialty: 'CI/CD pipelines & infrastructure',
        currentTaskId: 'task_05',
        tokensUsed: 54000,
        tasksCompleted: 19,
        successRate: 0.96,
        lastActive: new Date(Date.now() - 60000),
      },
    }),
    db.agent.create({
      data: {
        id: 'agent_pm',
        name: 'Nova',
        role: 'pm',
        status: 'idle',
        avatar: '📋',
        specialty: 'Sprint planning & task coordination',
        currentTaskId: null,
        tokensUsed: 43000,
        tasksCompleted: 31,
        successRate: 0.98,
        lastActive: new Date(Date.now() - 600000),
      },
    }),
  ])

  // Create tasks
  const tasks = await Promise.all([
    db.task.create({
      data: {
        id: 'task_01',
        projectId: project.id,
        title: 'Design WebSocket event pipeline',
        description: 'Architect the real-time event pipeline for agent communication using Socket.IO',
        status: 'in_progress',
        priority: 'critical',
        type: 'feature',
        assigneeId: 'agent_arch',
        subtasks: '["Define event schema", "Design message broker", "Plan reconnection strategy"]',
        output: '',
      },
    }),
    db.task.create({
      data: {
        id: 'task_02',
        projectId: project.id,
        title: 'Implement file tree component',
        description: 'Build a recursive file tree with drag-and-drop support and virtual scrolling',
        status: 'in_progress',
        priority: 'high',
        type: 'feature',
        assigneeId: 'agent_dev',
        subtasks: '["Create TreeNode model", "Add drag-drop handlers", "Implement virtual scroll"]',
        output: '',
      },
    }),
    db.task.create({
      data: {
        id: 'task_03',
        projectId: project.id,
        title: 'Review PR #142: Auth middleware',
        description: 'Review the authentication middleware implementation for security best practices',
        status: 'in_review',
        priority: 'high',
        type: 'refactor',
        assigneeId: 'agent_rev',
        subtasks: '[]',
        output: 'Found 3 potential issues: JWT secret rotation, CSRF token validation, rate limiting',
      },
    }),
    db.task.create({
      data: {
        id: 'task_04',
        projectId: project.id,
        title: 'E2E tests for chat panel',
        description: 'Write end-to-end tests for the agent chat panel including message history and auto-scroll',
        status: 'in_progress',
        priority: 'medium',
        type: 'test',
        assigneeId: 'agent_test',
        subtasks: '["Test message rendering", "Test auto-scroll", "Test message input"]',
        output: '',
      },
    }),
    db.task.create({
      data: {
        id: 'task_05',
        projectId: project.id,
        title: 'Deploy staging environment',
        description: 'Set up staging deployment with Docker and configure CI/CD pipeline',
        status: 'in_progress',
        priority: 'high',
        type: 'infra',
        assigneeId: 'agent_ops',
        subtasks: '["Configure Docker", "Set up CI pipeline", "Configure staging env vars"]',
        output: '',
      },
    }),
    db.task.create({
      data: {
        id: 'task_06',
        projectId: project.id,
        title: 'Plan Sprint 4 backlog',
        description: 'Organize and prioritize the Sprint 4 backlog based on team velocity',
        status: 'todo',
        priority: 'medium',
        type: 'feature',
        assigneeId: 'agent_pm',
        subtasks: '[]',
        output: '',
      },
    }),
    db.task.create({
      data: {
        id: 'task_07',
        projectId: project.id,
        title: 'Fix memory leak in editor',
        description: 'Resolve memory leak when opening/closing multiple file tabs rapidly',
        status: 'backlog',
        priority: 'critical',
        type: 'bugfix',
        assigneeId: null,
        subtasks: '[]',
        output: '',
      },
    }),
    db.task.create({
      data: {
        id: 'task_08',
        projectId: project.id,
        title: 'Add syntax highlighting for Rust',
        description: 'Extend the syntax highlighter to support Rust language constructs',
        status: 'backlog',
        priority: 'low',
        type: 'feature',
        assigneeId: null,
        subtasks: '[]',
        output: '',
      },
    }),
    db.task.create({
      data: {
        id: 'task_09',
        projectId: project.id,
        title: 'Optimize build performance',
        description: 'Reduce build times by implementing incremental compilation and caching',
        status: 'done',
        priority: 'high',
        type: 'refactor',
        assigneeId: 'agent_dev',
        subtasks: '[]',
        output: 'Build time reduced from 45s to 12s using incremental compilation',
        completedAt: new Date(Date.now() - 86400000),
      },
    }),
    db.task.create({
      data: {
        id: 'task_10',
        projectId: project.id,
        title: 'Update API documentation',
        description: 'Update API docs to reflect the new v2 endpoints',
        status: 'done',
        priority: 'medium',
        type: 'docs',
        assigneeId: 'agent_pm',
        subtasks: '[]',
        output: 'API docs updated with 14 new endpoints documented',
        completedAt: new Date(Date.now() - 172800000),
      },
    }),
  ])

  // Create project files
  const files = await Promise.all([
    db.projectFile.create({
      data: {
        id: 'file_01',
        projectId: project.id,
        path: 'src/app/page.tsx',
        language: 'typescript',
        isDirectory: false,
        content: `'use client'\n\nimport { useAppStore } from '@/lib/store'\nimport { IDETopBar } from '@/components/ide-top-bar'\nimport { IDESidebar } from '@/components/ide-sidebar'\nimport { IDEEditor } from '@/components/ide-editor'\nimport { IDEChatPanel } from '@/components/ide-chat-panel'\nimport { IDEBottomPanel } from '@/components/ide-bottom-panel'\n\nexport default function Home() {\n  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)\n  const rightPanelOpen = useAppStore((s) => s.rightPanelOpen)\n\n  return (\n    <div className="h-screen flex flex-col bg-background">\n      <IDETopBar />\n      <div className="flex flex-1 overflow-hidden">\n        <IDESidebar />\n        <div className="flex flex-1 overflow-hidden">\n          <IDEEditor />\n          {rightPanelOpen && <IDEChatPanel />}\n        </div>\n      </div>\n      <IDEBottomPanel />\n    </div>\n  )\n}`,
      },
    }),
    db.projectFile.create({
      data: {
        id: 'file_02',
        projectId: project.id,
        path: 'src/lib/store.ts',
        language: 'typescript',
        isDirectory: false,
        content: `import { create } from 'zustand'\nimport type { Agent, Task, Message, ProjectFile, BuildLog } from '@/lib/types'\n\ninterface AppState {\n  agents: Agent[]\n  tasks: Task[]\n  messages: Message[]\n  files: ProjectFile[]\n  buildLogs: BuildLog[]\n  activeFileId: string | null\n  setActiveFileId: (id: string | null) => void\n  sidebarCollapsed: boolean\n  setSidebarCollapsed: (collapsed: boolean) => void\n  rightPanelOpen: boolean\n  setRightPanelOpen: (open: boolean) => void\n}\n\nexport const useAppStore = create<AppState>((set) => ({\n  agents: [],\n  tasks: [],\n  messages: [],\n  files: [],\n  buildLogs: [],\n  activeFileId: null,\n  setActiveFileId: (id) => set({ activeFileId: id }),\n  sidebarCollapsed: false,\n  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),\n  rightPanelOpen: true,\n  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),\n}))`,
      },
    }),
    db.projectFile.create({
      data: {
        id: 'file_03',
        projectId: project.id,
        path: 'src/lib/types.ts',
        language: 'typescript',
        isDirectory: false,
        content: `export type AgentRole = 'architect' | 'developer' | 'reviewer' | 'tester' | 'devops' | 'pm'\nexport type AgentStatus = 'idle' | 'thinking' | 'coding' | 'reviewing' | 'testing' | 'deploying' | 'sleeping'\nexport type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked'\nexport type TaskPriority = 'critical' | 'high' | 'medium' | 'low'\nexport type MessageType = 'chat' | 'system' | 'action' | 'code_change' | 'review_comment' | 'test_result'\n\nexport interface Agent {\n  id: string\n  name: string\n  role: AgentRole\n  status: AgentStatus\n  avatar: string\n  specialty: string\n  currentTaskId: string | null\n  tokensUsed: number\n  tasksCompleted: number\n  successRate: number\n  lastActive: string\n}\n\nexport interface Task {\n  id: string\n  projectId: string\n  title: string\n  description: string\n  status: TaskStatus\n  priority: TaskPriority\n  type: string\n  assigneeId: string | null\n}\n\nexport interface Message {\n  id: string\n  projectId: string\n  agentId: string | null\n  content: string\n  type: MessageType\n  metadata: Record<string, unknown>\n  createdAt: string\n  agent?: Agent | null\n}`,
      },
    }),
    db.projectFile.create({
      data: {
        id: 'file_04',
        projectId: project.id,
        path: 'src/components/ide-top-bar.tsx',
        language: 'typescript',
        isDirectory: false,
        content: `'use client'\n\nimport { useAppStore } from '@/lib/store'\nimport { AGENT_ROLE_CONFIG, AGENT_STATUS_CONFIG } from '@/lib/types'\nimport { Button } from '@/components/ui/button'\nimport { Badge } from '@/components/ui/badge'\nimport { Play, Square, Plus, Sun, Moon, Zap } from 'lucide-react'\nimport { useTheme } from 'next-themes'\n\nexport function IDETopBar() {\n  const agents = useAppStore((s) => s.agents)\n  const { theme, setTheme } = useTheme()\n\n  return (\n    <div className="flex items-center h-12 px-3 border-b bg-card/80 backdrop-blur-sm gap-2">\n      <div className="flex items-center gap-2 font-semibold">\n        <Zap className="size-4 text-emerald-500" />\n        <span>TeamForge IDE</span>\n      </div>\n      <div className="h-4 w-px bg-border mx-2" />\n      <div className="flex items-center gap-1.5 overflow-x-auto flex-1">\n        {agents.map((agent) => {\n          const roleConfig = AGENT_ROLE_CONFIG[agent.role]\n          const statusConfig = AGENT_STATUS_CONFIG[agent.status]\n          return (\n            <div key={agent.id} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50 text-xs">\n              <span>{agent.avatar}</span>\n              <span className={roleConfig.color}>{agent.name}</span>\n              <span className={\`size-1.5 rounded-full \${statusConfig.dotColor}\`} />\n            </div>\n          )\n        })\n      </div>\n      <Button size="sm" variant="outline" className="gap-1.5 h-7">\n        <Plus className="size-3.5" /> New Task\n      </Button>\n      <div className="flex items-center gap-1">\n        <Button size="icon" variant="ghost" className="size-7 text-emerald-500">\n          <Play className="size-3.5\" />\n        </Button>\n        <Button size="icon" variant="ghost" className="size-7 text-red-500">\n          <Square className="size-3.5" />\n        </Button>\n      </div>\n      <Button\n        size="icon"\n        variant="ghost"\n        className="size-7"\n        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}\n      >\n        {theme === 'dark' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}\n      </Button>\n    </div>\n  )\n}`,
      },
    }),
    db.projectFile.create({
      data: {
        id: 'file_05',
        projectId: project.id,
        path: 'src/app/api/agents/route.ts',
        language: 'typescript',
        isDirectory: false,
        content: `import { db } from '@/lib/db'\nimport { NextResponse } from 'next/server'\n\nexport async function GET() {\n  try {\n    const agents = await db.agent.findMany({ orderBy: { createdAt: 'asc' } })\n    return NextResponse.json(agents)\n  } catch (e) {\n    console.error('Failed to fetch agents:', e)\n    return NextResponse.json([], { status: 500 })\n  }\n}`,
      },
    }),
    db.projectFile.create({
      data: {
        id: 'file_dir_01',
        projectId: project.id,
        path: 'src/components',
        language: '',
        isDirectory: true,
        content: '',
      },
    }),
    db.projectFile.create({
      data: {
        id: 'file_dir_02',
        projectId: project.id,
        path: 'src/app',
        language: '',
        isDirectory: true,
        content: '',
      },
    }),
    db.projectFile.create({
      data: {
        id: 'file_dir_03',
        projectId: project.id,
        path: 'src/lib',
        language: '',
        isDirectory: true,
        content: '',
      },
    }),
    db.projectFile.create({
      data: {
        id: 'file_dir_04',
        projectId: project.id,
        path: 'src/hooks',
        language: '',
        isDirectory: true,
        content: '',
      },
    }),
    db.projectFile.create({
      data: {
        id: 'file_dir_05',
        projectId: project.id,
        path: 'prisma',
        language: '',
        isDirectory: true,
        content: '',
      },
    }),
    db.projectFile.create({
      data: {
        id: 'file_06',
        projectId: project.id,
        path: 'prisma/schema.prisma',
        language: 'prisma',
        isDirectory: false,
        content: `generator client {\n  provider = "prisma-client-js"\n}\n\ndatasource db {\n  provider = "sqlite"\n  url      = env("DATABASE_URL")\n}\n\nmodel Project {\n  id          String   @id @default(cuid())\n  name        String\n  description String   @default("")\n  status      String   @default("active")\n  techStack   String   @default("[]")\n  repoUrl     String?\n  createdAt   DateTime @default(now())\n  updatedAt   DateTime @updatedAt\n  tasks       Task[]\n  messages    Message[]\n  files       ProjectFile[]\n  buildLogs   BuildLog[]\n}\n\nmodel Agent {\n  id            String   @id @default(cuid())\n  name          String\n  role          String\n  status        String   @default("idle")\n  avatar        String   @default("")\n  specialty     String   @default("")\n  currentTaskId String?\n  tokensUsed    Int      @default(0)\n  tasksCompleted Int     @default(0)\n  successRate   Float    @default(0.95)\n  lastActive    DateTime @default(now())\n  createdAt     DateTime @default(now())\n  updatedAt     DateTime @updatedAt\n  messages      Message[]\n  activities    AgentActivity[]\n}`,
      },
    }),
    db.projectFile.create({
      data: {
        id: 'file_07',
        projectId: project.id,
        path: 'package.json',
        language: 'json',
        isDirectory: false,
        content: `{\n  "name": "teamforge-ide",\n  "version": "0.1.0",\n  "private": true,\n  "scripts": {\n    "dev": "next dev -p 3000",\n    "build": "next build",\n    "lint": "eslint ."\n  },\n  "dependencies": {\n    "next": "^16.1.1",\n    "react": "^19.0.0",\n    "zustand": "^5.0.6",\n    "lucide-react": "^0.525.0",\n    "framer-motion": "^12.23.2",\n    "@prisma/client": "^6.11.1"\n  }\n}`,
      },
    }),
    db.projectFile.create({
      data: {
        id: 'file_08',
        projectId: project.id,
        path: 'tailwind.config.ts',
        language: 'typescript',
        isDirectory: false,
        content: `import type { Config } from "tailwindcss"\n\nconst config: Config = {\n  darkMode: ["class"],\n  content: [\n    "./src/**/*.{ts,tsx}\",\n  ],\n  theme: {\n    extend: {\n      fontFamily: {\n        sans: ["var(--font-geist-sans)"],\n        mono: ["var(--font-geist-mono)"],\n      },\n    },\n  },\n  plugins: [require("tailwindcss-animate")],\n}\n\nexport default config`,
      },
    }),
    db.projectFile.create({
      data: {
        id: 'file_09',
        projectId: project.id,
        path: 'next.config.ts',
        language: 'typescript',
        isDirectory: false,
        content: `import type { NextConfig } from "next"\n\nconst nextConfig: NextConfig = {\n  reactStrictMode: true,\n}\n\nexport default nextConfig`,
      },
    }),
  ])

  // Create messages
  const messages = await Promise.all([
    db.message.create({
      data: {
        projectId: project.id,
        agentId: 'agent_pm',
        content: 'Good morning team! Sprint 4 is starting. I\'ve prioritized the backlog — the WebSocket pipeline is our top priority this week.',
        type: 'chat',
        metadata: '{}',
      },
    }),
    db.message.create({
      data: {
        projectId: project.id,
        agentId: 'agent_arch',
        content: 'I\'ve drafted the event pipeline architecture. Key decisions: Socket.IO for transport, Redis-backed message broker for persistence, and exponential backoff for reconnection. PR is up for review.',
        type: 'chat',
        metadata: '{}',
      },
    }),
    db.message.create({
      data: {
        projectId: project.id,
        agentId: 'agent_dev',
        content: 'Starting implementation of the file tree component. Using virtual scrolling with react-window for performance with large directories.',
        type: 'action',
        metadata: '{"action": "task_started", "taskId": "task_02"}',
      },
    }),
    db.message.create({
      data: {
        projectId: project.id,
        agentId: 'agent_rev',
        content: 'Reviewed PR #142. Found 3 issues: 1) JWT secret needs rotation mechanism, 2) CSRF token validation missing on mutation endpoints, 3) Rate limiting not configured for auth routes.',
        type: 'review_comment',
        metadata: '{"filesReviewed": 4, "issuesFound": 3, "severity": "medium"}',
      },
    }),
    db.message.create({
      data: {
        projectId: project.id,
        agentId: 'agent_dev',
        content: 'Modified 3 files for the file tree implementation:\n• src/components/file-tree.tsx (+142/-0)\n• src/hooks/use-virtual-scroll.ts (+89/-0)\n• src/lib/tree-utils.ts (+56/-0)',
        type: 'code_change',
        metadata: '{"filesChanged": 3, "linesAdded": 287, "linesRemoved": 0}',
      },
    }),
    db.message.create({
      data: {
        projectId: project.id,
        agentId: 'agent_test',
        content: 'Running E2E test suite for chat panel... Test cases: message rendering, auto-scroll behavior, input validation, concurrent message handling.',
        type: 'action',
        metadata: '{"action": "test_started", "taskId": "task_04"}',
      },
    }),
    db.message.create({
      data: {
        projectId: project.id,
        agentId: 'agent_ops',
        content: 'Staging deployment in progress. Docker image built successfully. Configuring CI/CD pipeline with GitHub Actions.',
        type: 'deploy_log',
        metadata: '{"environment": "staging", "dockerTag": "v0.4.0-rc.1"}',
      },
    }),
    db.message.create({
      data: {
        projectId: project.id,
        agentId: 'agent_test',
        content: '✅ E2E tests passed: 24/24 test cases successful. Auto-scroll behavior verified with rapid message sequences.',
        type: 'test_result',
        metadata: '{"passed": 24, "failed": 0, "duration": "45s"}',
      },
    }),
    db.message.create({
      data: {
        projectId: project.id,
        agentId: null,
        content: 'Build completed successfully in 12.3s. All 147 tests passing. Bundle size: 342KB gzipped.',
        type: 'system',
        metadata: '{"buildTime": "12.3s", "testCount": 147, "bundleSize": "342KB"}',
      },
    }),
    db.message.create({
      data: {
        projectId: project.id,
        agentId: 'agent_arch',
        content: 'Updated the WebSocket pipeline design based on Prism\'s review feedback. Added connection pooling and message deduplication layer. Ready for implementation.',
        type: 'code_change',
        metadata: '{"filesChanged": 2, "linesAdded": 89, "linesRemoved": 23}',
      },
    }),
    db.message.create({
      data: {
        projectId: project.id,
        agentId: 'agent_ops',
        content: '🚀 Staging deployed successfully! Health checks passing. URL: https://staging.teamforge.dev',
        type: 'deploy_log',
        metadata: '{"environment": "staging", "url": "https://staging.teamforge.dev", "status": "healthy"}',
      },
    }),
    db.message.create({
      data: {
        projectId: project.id,
        agentId: 'agent_pm',
        content: 'Sprint 4 Day 1 status: 5 tasks in progress, 2 in backlog. On track for the milestone. Team velocity looking strong at 14 story points/day.',
        type: 'chat',
        metadata: '{}',
      },
    }),
  ])

  // Create build logs
  const buildLogs = await Promise.all([
    db.buildLog.create({
      data: {
        projectId: project.id,
        output: '✓ Compiled successfully in 12.3s\n✓ 147 tests passed\n✓ Bundle size: 342KB gzipped\n✓ No lint errors\n✓ Type check passed',
        status: 'success',
        type: 'build',
      },
    }),
    db.buildLog.create({
      data: {
        projectId: project.id,
        output: 'Running test suite...\n✓ src/lib/utils.test.ts (8 tests)\n✓ src/components/editor.test.tsx (12 tests)\n✓ src/hooks/use-store.test.ts (6 tests)\n✓ Total: 147 tests passed, 0 failed',
        status: 'success',
        type: 'test',
      },
    }),
    db.buildLog.create({
      data: {
        projectId: project.id,
        output: 'Linting...\n⚠ src/components/ide-chat-panel.tsx:42:5 - Unused variable \'scrollRef\'\n✓ All other files clean\n1 warning(s)',
        status: 'warning',
        type: 'lint',
      },
    }),
    db.buildLog.create({
      data: {
        projectId: project.id,
        output: 'Deploying to staging...\n✓ Docker image built: v0.4.0-rc.1\n✓ Pushed to registry\n✓ Deployed to staging cluster\n✓ Health check passed',
        status: 'success',
        type: 'deploy',
      },
    }),
    db.buildLog.create({
      data: {
        projectId: project.id,
        output: '✓ Compiled successfully in 15.1s\n✗ Type check failed:\n  src/lib/api.ts:23:7 - Type \'string\' is not assignable to type \'number\'\n  src/components/editor.tsx:89:12 - Property \'scrollTo\' does not exist on type \'HTMLElement | null\'',
        status: 'failed',
        type: 'build',
      },
    }),
  ])

  // Create agent activities
  const activities = await Promise.all([
    db.agentActivity.create({
      data: {
        agentId: 'agent_arch',
        action: 'code_written',
        description: 'Updated WebSocket pipeline design document',
        metadata: '{"filesChanged": 2, "linesAdded": 89}',
      },
    }),
    db.agentActivity.create({
      data: {
        agentId: 'agent_dev',
        action: 'code_written',
        description: 'Implemented file tree component with virtual scrolling',
        metadata: '{"filesChanged": 3, "linesAdded": 287}',
      },
    }),
    db.agentActivity.create({
      data: {
        agentId: 'agent_rev',
        action: 'review_completed',
        description: 'Completed code review for PR #142 (Auth middleware)',
        metadata: '{"filesReviewed": 4, "issuesFound": 3}',
      },
    }),
    db.agentActivity.create({
      data: {
        agentId: 'agent_test',
        action: 'test_run',
        description: 'Executed E2E test suite for chat panel - 24/24 passed',
        metadata: '{"passed": 24, "failed": 0, "duration": "45s"}',
      },
    }),
    db.agentActivity.create({
      data: {
        agentId: 'agent_ops',
        action: 'deploy_triggered',
        description: 'Deployed staging environment v0.4.0-rc.1',
        metadata: '{"environment": "staging", "tag": "v0.4.0-rc.1"}',
      },
    }),
    db.agentActivity.create({
      data: {
        agentId: 'agent_pm',
        action: 'message_sent',
        description: 'Shared Sprint 4 Day 1 status update',
        metadata: '{}',
      },
    }),
  ])

  console.log(`✅ Seeded: ${agents.length} agents, ${tasks.length} tasks, ${files.length} files, ${messages.length} messages, ${buildLogs.length} build logs, ${activities.length} activities`)
}

seed()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
