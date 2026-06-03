import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function seed() {
  console.log('🌱 Seeding Autonomous IDE database...')

  // Create a project
  const project = await db.project.create({
    data: {
      id: 'proj_01',
      name: 'TeamForge Dashboard',
      description: 'A modern web dashboard built by the autonomous AI team. Full-stack Next.js application with real-time features.',
      status: 'active',
      techStack: JSON.stringify(['TypeScript', 'Next.js', 'React', 'Tailwind CSS', 'Prisma']),
    },
  })

  // Create 6 AI agents
  const agents = await Promise.all([
    db.agent.create({
      data: {
        id: 'agent_atlas',
        name: 'Atlas',
        role: 'architect',
        status: 'thinking',
        avatar: '🏗️',
        specialty: 'System architecture, tech decisions, API design',
        successRate: 0.97,
        tasksCompleted: 34,
        tokensUsed: 245000,
      },
    }),
    db.agent.create({
      data: {
        id: 'agent_coder',
        name: 'Coder',
        role: 'developer',
        status: 'coding',
        avatar: '💻',
        specialty: 'Full-stack development, React, TypeScript, APIs',
        currentTaskId: 'task_03',
        successRate: 0.94,
        tasksCompleted: 67,
        tokensUsed: 890000,
      },
    }),
    db.agent.create({
      data: {
        id: 'agent_review',
        name: 'Review',
        role: 'reviewer',
        status: 'idle',
        avatar: '🔍',
        specialty: 'Code review, quality assurance, best practices',
        successRate: 0.99,
        tasksCompleted: 52,
        tokensUsed: 312000,
      },
    }),
    db.agent.create({
      data: {
        id: 'agent_tester',
        name: 'Tester',
        role: 'tester',
        status: 'testing',
        avatar: '🧪',
        specialty: 'Unit tests, integration tests, E2E, performance',
        currentTaskId: 'task_05',
        successRate: 0.92,
        tasksCompleted: 41,
        tokensUsed: 198000,
      },
    }),
    db.agent.create({
      data: {
        id: 'agent_deploy',
        name: 'Deploy',
        role: 'devops',
        status: 'idle',
        avatar: '🚀',
        specialty: 'CI/CD, Docker, infrastructure, deployment',
        successRate: 0.98,
        tasksCompleted: 28,
        tokensUsed: 156000,
      },
    }),
    db.agent.create({
      data: {
        id: 'agent_pm',
        name: 'Plan',
        role: 'pm',
        status: 'thinking',
        avatar: '📋',
        specialty: 'Task breakdown, project management, progress tracking',
        successRate: 0.96,
        tasksCompleted: 45,
        tokensUsed: 178000,
      },
    }),
  ])

  // Create tasks across all stages
  const tasks = await Promise.all([
    db.task.create({
      data: {
        id: 'task_01',
        projectId: project.id,
        title: 'Design system architecture',
        description: 'Design the overall system architecture including component hierarchy, data flow, and API contracts.',
        status: 'done',
        priority: 'critical',
        type: 'feature',
        assigneeId: 'agent_atlas',
        output: 'Architecture document created with component tree, API spec, and database schema.',
        completedAt: new Date(Date.now() - 86400000 * 2),
      },
    }),
    db.task.create({
      data: {
        id: 'task_02',
        projectId: project.id,
        title: 'Set up project structure and dependencies',
        description: 'Initialize Next.js project with TypeScript, Tailwind CSS, and all required dependencies.',
        status: 'done',
        priority: 'high',
        type: 'infra',
        assigneeId: 'agent_deploy',
        output: 'Project initialized with all dependencies. ESLint, Prettier, and CI pipeline configured.',
        completedAt: new Date(Date.now() - 86400000),
      },
    }),
    db.task.create({
      data: {
        id: 'task_03',
        projectId: project.id,
        title: 'Implement dashboard layout and sidebar',
        description: 'Create the main dashboard layout with collapsible sidebar, responsive navigation, and theme support.',
        status: 'in_progress',
        priority: 'high',
        type: 'feature',
        assigneeId: 'agent_coder',
      },
    }),
    db.task.create({
      data: {
        id: 'task_04',
        projectId: project.id,
        title: 'Review dashboard layout PR',
        description: 'Review the dashboard layout implementation for code quality, accessibility, and performance.',
        status: 'todo',
        priority: 'medium',
        type: 'refactor',
        assigneeId: 'agent_review',
      },
    }),
    db.task.create({
      data: {
        id: 'task_05',
        projectId: project.id,
        title: 'Write E2E tests for authentication flow',
        description: 'Create end-to-end tests for the user authentication flow including login, signup, and password reset.',
        status: 'in_progress',
        priority: 'high',
        type: 'test',
        assigneeId: 'agent_tester',
      },
    }),
    db.task.create({
      data: {
        id: 'task_06',
        projectId: project.id,
        title: 'Set up CI/CD pipeline',
        description: 'Configure GitHub Actions for automated testing, linting, and deployment to staging.',
        status: 'todo',
        priority: 'high',
        type: 'infra',
        assigneeId: 'agent_deploy',
      },
    }),
    db.task.create({
      data: {
        id: 'task_07',
        projectId: project.id,
        title: 'Implement real-time notifications',
        description: 'Add WebSocket-based real-time notification system with toast alerts and activity feed.',
        status: 'backlog',
        priority: 'medium',
        type: 'feature',
      },
    }),
    db.task.create({
      data: {
        id: 'task_08',
        projectId: project.id,
        title: 'Fix mobile responsive issues',
        description: 'Fix sidebar overlay on mobile, improve card layouts, and ensure touch-friendly interactions.',
        status: 'backlog',
        priority: 'medium',
        type: 'bugfix',
      },
    }),
    db.task.create({
      data: {
        id: 'task_09',
        projectId: project.id,
        title: 'Add dark mode support',
        description: 'Implement theme switching with next-themes, update all components for dark mode compatibility.',
        status: 'done',
        priority: 'high',
        type: 'feature',
        assigneeId: 'agent_coder',
        output: 'Dark mode implemented with next-themes. All components updated with semantic colors.',
        completedAt: new Date(Date.now() - 43200000),
      },
    }),
    db.task.create({
      data: {
        id: 'task_10',
        projectId: project.id,
        title: 'Performance optimization',
        description: 'Optimize bundle size, implement code splitting, lazy loading, and image optimization.',
        status: 'backlog',
        priority: 'low',
        type: 'refactor',
      },
    }),
  ])

  // Create project files
  const files = await Promise.all([
    db.projectFile.create({
      data: {
        projectId: project.id,
        path: '/src/app/page.tsx',
        content: `import { Dashboard } from '@/components/dashboard'\n\nexport default function Home() {\n  return <Dashboard />\n}`,
        language: 'typescript',
      },
    }),
    db.projectFile.create({
      data: {
        projectId: project.id,
        path: '/src/app/layout.tsx',
        content: `import type { Metadata } from 'next'\nimport { Inter } from 'next/font/google'\nimport './globals.css'\n\nconst inter = Inter({ subsets: ['latin'] })\n\nexport const metadata: Metadata = {\n  title: 'TeamForge Dashboard',\n  description: 'Built by autonomous AI agents',\n}\n\nexport default function RootLayout({ children }) {\n  return (\n    <html lang="en">\n      <body className={inter.className}>{children}</body>\n    </html>\n  )\n}`,
        language: 'typescript',
      },
    }),
    db.projectFile.create({
      data: {
        projectId: project.id,
        path: '/src/components/dashboard.tsx',
        content: `'use client'\n\nimport { useState } from 'react'\nimport { Sidebar } from './sidebar'\nimport { MainContent } from './main-content'\n\nexport function Dashboard() {\n  return (\n    <div className="flex h-screen">\n      <Sidebar />\n      <MainContent />\n    </div>\n  )\n}`,
        language: 'typescript',
      },
    }),
    db.projectFile.create({
      data: {
        projectId: project.id,
        path: '/src/lib/api.ts',
        content: `const API_BASE = '/api'\n\nexport async function fetchProjects() {\n  const res = await fetch(\`\${API_BASE}/projects\`)\n  return res.json()\n}\n\nexport async function fetchTasks(projectId: string) {\n  const res = await fetch(\`\${API_BASE}/tasks?projectId=\${projectId}\`)\n  return res.json()\n}`,
        language: 'typescript',
      },
    }),
    db.projectFile.create({
      data: {
        projectId: project.id,
        path: '/src/app/globals.css',
        content: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n:root {\n  --background: 0 0% 100%;\n  --foreground: 222.2 84% 4.9%;\n  --primary: 142.1 76.2% 36.3%;\n}\n\n.dark {\n  --background: 222.2 84% 4.9%;\n  --foreground: 210 40% 98%;\n  --primary: 142.1 70.6% 45.3%;\n}`,
        language: 'css',
      },
    }),
    db.projectFile.create({
      data: {
        projectId: project.id,
        path: '/package.json',
        content: `{\n  "name": "teamforge-dashboard",\n  "version": "0.1.0",\n  "private": true,\n  "scripts": {\n    "dev": "next dev",\n    "build": "next build",\n    "start": "next start"\n  },\n  "dependencies": {\n    "next": "^14.0.0",\n    "react": "^18.2.0",\n    "react-dom": "^18.2.0"\n  }\n}`,
        language: 'json',
      },
    }),
    db.projectFile.create({
      data: {
        projectId: project.id,
        path: '/src/components/sidebar.tsx',
        content: `'use client'\n\nimport { useState } from 'react'\nimport { NavItem } from './nav-item'\n\nexport function Sidebar() {\n  const [collapsed, setCollapsed] = useState(false)\n  \n  return (\n    <aside className={collapsed ? 'w-16' : 'w-64'}>\n      {/* Navigation items */}\n    </aside>\n  )\n}`,
        language: 'typescript',
      },
    }),
    db.projectFile.create({
      data: {
        projectId: project.id,
        path: '/README.md',
        content: `# TeamForge Dashboard\n\nA modern web dashboard built autonomously by AI agents.\n\n## Getting Started\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n\nOpen [http://localhost:3000](http://localhost:3000) in your browser.`,
        language: 'markdown',
      },
    }),
    db.projectFile.create({
      data: { projectId: project.id, path: '/src', content: '', language: '', isDirectory: true },
    }),
    db.projectFile.create({
      data: { projectId: project.id, path: '/src/components', content: '', language: '', isDirectory: true },
    }),
    db.projectFile.create({
      data: { projectId: project.id, path: '/src/lib', content: '', language: '', isDirectory: true },
    }),
    db.projectFile.create({
      data: { projectId: project.id, path: '/src/app', content: '', language: '', isDirectory: true },
    }),
  ])

  // Create agent messages (team chat)
  const messages = await Promise.all([
    db.message.create({
      data: {
        projectId: project.id,
        agentId: 'agent_pm',
        content: 'Alright team, let\'s review our progress. We\'ve completed the architecture design and project setup. Coder is working on the dashboard layout.',
        type: 'chat',
      },
    }),
    db.message.create({
      data: {
        projectId: project.id,
        agentId: 'agent_atlas',
        content: 'The architecture is solid. I recommend we focus on the core layout components first, then build out features incrementally. The component hierarchy I designed should scale well.',
        type: 'chat',
      },
    }),
    db.message.create({
      data: {
        projectId: project.id,
        agentId: 'agent_coder',
        content: 'I\'m implementing the sidebar with collapsible navigation. The responsive breakpoints are set up. Should have a PR ready in about 10 minutes.',
        type: 'chat',
      },
    }),
    db.message.create({
      data: {
        projectId: project.id,
        agentId: 'agent_review',
        content: 'I\'ll be ready to review as soon as the PR is up. I\'ll check for accessibility compliance and performance best practices.',
        type: 'chat',
      },
    }),
    db.message.create({
      data: {
        projectId: project.id,
        agentId: 'agent_tester',
        content: 'Running E2E tests on the auth flow now. Found a minor issue with the password reset redirect — I\'ll add it to the task notes.',
        type: 'action',
        metadata: JSON.stringify({ action: 'test_issue_found', severity: 'minor' }),
      },
    }),
    db.message.create({
      data: {
        projectId: project.id,
        agentId: 'agent_deploy',
        content: 'CI/CD pipeline config is drafted. Need to verify the Docker build steps before pushing to staging.',
        type: 'chat',
      },
    }),
    db.message.create({
      data: {
        projectId: project.id,
        agentId: 'agent_coder',
        content: 'Sidebar PR is ready for review! Added dark mode support and mobile responsive overlay.',
        type: 'code_change',
        metadata: JSON.stringify({ files: ['sidebar.tsx', 'nav-item.tsx'], additions: 145, deletions: 12 }),
      },
    }),
    db.message.create({
      data: {
        projectId: project.id,
        agentId: 'agent_pm',
        content: 'Great progress everyone! @Review please prioritize the sidebar review. @Deploy once tests pass, let\'s push to staging.',
        type: 'chat',
      },
    }),
  ])

  // Create build logs
  const buildLogs = await Promise.all([
    db.buildLog.create({
      data: {
        projectId: project.id,
        output: `[12:04:32] Starting build...\n[12:04:33] Compiling TypeScript...\n[12:04:45] TypeScript compilation successful\n[12:04:46] Bundling with webpack...\n[12:04:58] Build completed in 26s\n✓ Build successful`,
        status: 'success',
        type: 'build',
      },
    }),
    db.buildLog.create({
      data: {
        projectId: project.id,
        output: `[12:05:01] Running test suite...\n[12:05:02] ✓ auth.test.ts (3 tests passed)\n[12:05:03] ✓ api.test.ts (7 tests passed)\n[12:05:04] ✓ components.test.tsx (12 tests passed)\n[12:05:05] ✗ integration.test.ts (1 test failed)\n  → Expected redirect to /dashboard, received /login\n\nTests: 22 passed, 1 failed\n⚠ Test run completed with failures`,
        status: 'warning',
        type: 'test',
      },
    }),
    db.buildLog.create({
      data: {
        projectId: project.id,
        output: `[12:06:15] Running ESLint...\n[12:06:16] Scanning src/...\n[12:06:18] ✓ No lint errors found\n✓ Lint check passed`,
        status: 'success',
        type: 'lint',
      },
    }),
  ])

  // Create agent activities
  const activities = await Promise.all([
    db.agentActivity.create({
      data: {
        agentId: 'agent_atlas',
        action: 'task_started',
        description: 'Started: Design system architecture',
        metadata: JSON.stringify({ taskId: 'task_01' }),
      },
    }),
    db.agentActivity.create({
      data: {
        agentId: 'agent_coder',
        action: 'code_written',
        description: 'Created sidebar.tsx with collapsible navigation (145 lines)',
        metadata: JSON.stringify({ file: 'sidebar.tsx', lines: 145 }),
      },
    }),
    db.agentActivity.create({
      data: {
        agentId: 'agent_tester',
        action: 'test_run',
        description: 'Ran E2E test suite: 22 passed, 1 failed',
        metadata: JSON.stringify({ passed: 22, failed: 1 }),
      },
    }),
    db.agentActivity.create({
      data: {
        agentId: 'agent_review',
        action: 'review_completed',
        description: 'Completed code review for auth module — approved with minor suggestions',
        metadata: JSON.stringify({ result: 'approved', suggestions: 2 }),
      },
    }),
    db.agentActivity.create({
      data: {
        agentId: 'agent_deploy',
        action: 'deploy_triggered',
        description: 'Deployed v0.3.1 to staging environment',
        metadata: JSON.stringify({ version: '0.3.1', env: 'staging' }),
      },
    }),
  ])

  console.log(`✅ Seeded: ${1} project, ${agents.length} agents, ${tasks.length} tasks, ${files.length} files, ${messages.length} messages, ${buildLogs.length} build logs, ${activities.length} activities`)
}

seed()
  .then(async () => await db.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await db.$disconnect()
    process.exit(1)
  })
