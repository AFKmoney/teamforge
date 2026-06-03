import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function seed() {
  console.log('🌱 Seeding TeamForge IDE with real project data...')

  // Clean existing data
  await db.agentActivity.deleteMany()
  await db.buildLog.deleteMany()
  await db.message.deleteMany()
  await db.task.deleteMany()
  await db.projectFile.deleteMany()
  await db.agent.deleteMany()
  await db.project.deleteMany()

  // Create a project
  const project = await db.project.create({
    data: {
      id: 'proj_01',
      name: 'TeamForge Dashboard',
      description: 'A modern web dashboard built by the autonomous AI team. Full-stack Next.js application with real-time features, authentication, and data visualization.',
      status: 'active',
      techStack: JSON.stringify(['TypeScript', 'Next.js 16', 'React 19', 'Tailwind CSS 4', 'Prisma', 'SQLite', 'shadcn/ui']),
    },
  })

  // Create 6 AI agents
  const agents = await Promise.all([
    db.agent.create({
      data: {
        id: 'agent_atlas',
        name: 'Atlas',
        role: 'architect',
        status: 'idle',
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
        status: 'idle',
        avatar: '💻',
        specialty: 'Full-stack development, React, TypeScript, APIs',
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
        status: 'idle',
        avatar: '🧪',
        specialty: 'Unit tests, integration tests, E2E, performance',
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
        status: 'idle',
        avatar: '📋',
        specialty: 'Task breakdown, project management, progress tracking',
        successRate: 0.96,
        tasksCompleted: 45,
        tokensUsed: 178000,
      },
    }),
  ])

  // Create directory structure
  const directories = [
    '/src', '/src/app', '/src/components', '/src/lib', '/src/hooks',
    '/src/types', '/public', '/docs', '/tests',
  ]
  for (const dirPath of directories) {
    await db.projectFile.create({
      data: { projectId: project.id, path: dirPath, content: '', language: '', isDirectory: true },
    })
  }

  // Create REAL project files with actual content
  const files = await Promise.all([
    // /src/app/page.tsx - Real page component
    db.projectFile.create({
      data: {
        projectId: project.id,
        path: '/src/app/page.tsx',
        content: `'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Activity, Users, FileCode, CheckCircle } from 'lucide-react'

interface DashboardStats {
  totalTasks: number
  completedTasks: number
  activeAgents: number
  totalFiles: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalTasks: 0,
    completedTasks: 0,
    activeAgents: 0,
    totalFiles: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/stats')
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Project overview and key metrics
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              Across all sprints
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedTasks}</div>
            <p className="text-xs text-muted-foreground">
              Tasks done this sprint
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeAgents}</div>
            <p className="text-xs text-muted-foreground">
              Currently working
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Files</CardTitle>
            <FileCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFiles}</div>
            <p className="text-xs text-muted-foreground">
              Source files in project
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Button onClick={() => window.location.reload()}>
          Refresh Dashboard
        </Button>
      </div>
    </main>
  )
}`,
        language: 'typescript',
      },
    }),

    // /src/app/layout.tsx - Real layout component
    db.projectFile.create({
      data: {
        projectId: project.id,
        path: '/src/app/layout.tsx',
        content: `import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TeamForge Dashboard',
  description: 'Built autonomously by AI agents',
  keywords: ['dashboard', 'ai', 'autonomous', 'development'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}`,
        language: 'typescript',
      },
    }),

    // /src/app/globals.css - Real CSS
    db.projectFile.create({
      data: {
        projectId: project.id,
        path: '/src/app/globals.css',
        content: `@import "tailwindcss";

:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 240 10% 3.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 240 10% 3.9%;
  --primary: 142.1 76.2% 36.3%;
  --primary-foreground: 355.7 100% 97.3%;
  --secondary: 240 4.8% 95.9%;
  --secondary-foreground: 240 5.9% 10%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  --accent: 240 4.8% 95.9%;
  --accent-foreground: 240 5.9% 10%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 5.9% 90%;
  --input: 240 5.9% 90%;
  --ring: 142.1 76.2% 36.3%;
  --radius: 0.5rem;
}

.dark {
  --background: 20 14.3% 4.1%;
  --foreground: 0 0% 95%;
  --card: 24 9.8% 10%;
  --card-foreground: 0 0% 95%;
  --popover: 0 0% 9%;
  --popover-foreground: 0 0% 95%;
  --primary: 142.1 70.6% 45.3%;
  --primary-foreground: 144.9 80.4% 10%;
  --secondary: 240 3.7% 15.9%;
  --secondary-foreground: 0 0% 98%;
  --muted: 0 0% 15%;
  --muted-foreground: 240 5% 64.9%;
  --accent: 12 6.5% 15.1%;
  --accent-foreground: 0 0% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 3.7% 15.9%;
  --input: 240 3.7% 15.9%;
  --ring: 142.4 71.8% 29.2%;
}

* {
  border-color: hsl(var(--border));
}

body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  font-feature-settings: "rlig" 1, "calt" 1;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground) / 0.5);
}`,
        language: 'css',
      },
    }),

    // /src/components/button.tsx - Real button component
    db.projectFile.create({
      data: {
        projectId: project.id,
        path: '/src/components/button.tsx',
        content: `import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }`,
        language: 'typescript',
      },
    }),

    // /src/lib/utils.ts - Real utility functions
    db.projectFile.create({
      data: {
        projectId: project.id,
        path: '/src/lib/utils.ts',
        content: `import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind CSS classes with clsx and tailwind-merge.
 * Handles conflicting classes and conditional class names.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date to a relative time string (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return \`\${diffMins}m ago\`
  if (diffHours < 24) return \`\${diffHours}h ago\`
  if (diffDays < 7) return \`\${diffDays}d ago\`
  return d.toLocaleDateString()
}

/**
 * Format a number with K/M suffixes
 */
export function formatNumber(n: number): string {
  if (n >= 1000000) return \`\${(n / 1000000).toFixed(1)}M\`
  if (n >= 1000) return \`\${(n / 1000).toFixed(1)}K\`
  return String(n)
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Truncate a string to a maximum length with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

/**
 * Generate a random ID string
 */
export function generateId(prefix = ''): string {
  const id = Math.random().toString(36).substring(2, 10)
  return prefix ? \`\${prefix}_\${id}\` : id
}

/**
 * Retry an async function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i)
        await sleep(delay)
      }
    }
  }
  throw lastError
}`,
        language: 'typescript',
      },
    }),

    // /package.json - Real package.json
    db.projectFile.create({
      data: {
        projectId: project.id,
        path: '/package.json',
        content: `{
  "name": "teamforge-dashboard",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "next": "^16.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@prisma/client": "^6.11.0",
    "z-ai-web-dev-sdk": "^0.0.18",
    "zustand": "^5.0.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.3.0",
    "lucide-react": "^0.525.0",
    "framer-motion": "^12.23.0",
    "next-themes": "^0.4.6",
    "sonner": "^2.0.0",
    "@radix-ui/react-dialog": "^1.1.14",
    "@radix-ui/react-dropdown-menu": "^2.1.15",
    "@radix-ui/react-tabs": "^1.1.12",
    "@radix-ui/react-tooltip": "^1.2.7",
    "@radix-ui/react-scroll-area": "^1.2.9"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "tailwindcss": "^4",
    "eslint": "^9",
    "eslint-config-next": "^16.1.0",
    "prisma": "^6.11.0"
  }
}`,
        language: 'json',
      },
    }),

    // /tsconfig.json - Real tsconfig
    db.projectFile.create({
      data: {
        projectId: project.id,
        path: '/tsconfig.json',
        content: `{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}`,
        language: 'json',
      },
    }),

    // /README.md - Real readme
    db.projectFile.create({
      data: {
        projectId: project.id,
        path: '/README.md',
        content: `# TeamForge Dashboard

A modern web dashboard built autonomously by AI agents using the TeamForge IDE platform.

## Architecture

This project follows a modern Next.js architecture:

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 with shadcn/ui components
- **Database**: SQLite via Prisma ORM
- **State**: Zustand for client state, TanStack Query for server state
- **AI**: z-ai-web-dev-sdk for LLM integration

## Project Structure

\`\`\`
src/
├── app/              # Next.js App Router pages
│   ├── page.tsx      # Main dashboard page
│   ├── layout.tsx    # Root layout with providers
│   └── globals.css   # Global styles & CSS variables
├── components/       # React components
│   ├── ui/           # shadcn/ui base components
│   └── button.tsx    # Custom button component
├── lib/              # Utility functions & shared logic
│   └── utils.ts      # Common utilities (cn, formatRelativeTime, etc.)
├── hooks/            # Custom React hooks
└── types/            # TypeScript type definitions
\`\`\`

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Set up the database
npx prisma db push

# Run development server
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

## AI Agent Team

This project is maintained by 6 AI agents:

| Agent | Role | Specialty |
|-------|------|-----------|
| Atlas | Architect | System design & architecture |
| Codey | Developer | Code implementation |
| Prism | Reviewer | Code review & quality |
| Flux | Tester | Testing & validation |
| Blaze | DevOps | CI/CD & deployment |
| Nova | PM | Project management |

## Development

\`\`\`bash
# Run linting
npm run lint

# Run tests
npm test

# Build for production
npm run build
\`\`\`

## License

Private - Internal Use Only`,
        language: 'markdown',
      },
    }),

    // Additional component file
    db.projectFile.create({
      data: {
        projectId: project.id,
        path: '/src/components/theme-provider.tsx',
        content: `'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { type ThemeProviderProps } from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}`,
        language: 'typescript',
      },
    }),

    // API route example
    db.projectFile.create({
      data: {
        projectId: project.id,
        path: '/src/app/api/stats/route.ts',
        content: `import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const [tasks, agents, files] = await Promise.all([
      db.task.count(),
      db.agent.count({ where: { status: { not: 'idle' } } }),
      db.projectFile.count({ where: { isDirectory: false } }),
    ])

    const completedTasks = await db.task.count({
      where: { status: 'done' },
    })

    return NextResponse.json({
      totalTasks: tasks,
      completedTasks,
      activeAgents: agents,
      totalFiles: files,
    })
  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}`,
        language: 'typescript',
      },
    }),

    // Dockerfile
    db.projectFile.create({
      data: {
        projectId: project.id,
        path: '/Dockerfile',
        content: `FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]`,
        language: 'dockerfile',
      },
    }),
  ])

  // Create tasks - some with assignees for the scheduler to pick up
  const tasks = await Promise.all([
    db.task.create({
      data: {
        id: 'task_01',
        projectId: project.id,
        title: 'Design system architecture',
        description: 'Design the overall system architecture including component hierarchy, data flow, and API contracts. Create architecture documentation in /docs/architecture.md.',
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
        description: 'Initialize the project with all required dependencies, configure TypeScript, ESLint, and the build pipeline.',
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
        description: 'Create the main dashboard layout with a collapsible sidebar, responsive navigation, and theme support. The sidebar should have navigation items for Dashboard, Tasks, Agents, and Settings.',
        status: 'todo',
        priority: 'high',
        type: 'feature',
        assigneeId: 'agent_coder',
      },
    }),
    db.task.create({
      data: {
        id: 'task_04',
        projectId: project.id,
        title: 'Review dashboard layout implementation',
        description: 'Review the dashboard layout implementation for code quality, accessibility, and performance. Check for proper TypeScript types, semantic HTML, and ARIA attributes.',
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
        title: 'Write unit tests for utility functions',
        description: 'Create unit tests for all utility functions in /src/lib/utils.ts. Cover edge cases for formatRelativeTime, formatNumber, truncate, and retry.',
        status: 'todo',
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
        description: 'Configure GitHub Actions for automated testing, linting, and deployment to staging. Include Docker build step and health check verification.',
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
        description: 'Add WebSocket-based real-time notification system with toast alerts and activity feed. Use Socket.io for the implementation.',
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
        description: 'Fix sidebar overlay on mobile, improve card layouts, and ensure touch-friendly interactions. Test on iOS Safari and Android Chrome.',
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
        description: 'Implement theme switching with next-themes, update all components for dark mode compatibility. Ensure CSS variables work in both themes.',
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
        description: 'Optimize bundle size, implement code splitting, lazy loading, and image optimization. Target Lighthouse score > 90.',
        status: 'backlog',
        priority: 'low',
        type: 'refactor',
      },
    }),
  ])

  // Create agent messages (team chat)
  const messages = await Promise.all([
    db.message.create({
      data: {
        projectId: project.id,
        agentId: 'agent_pm',
        content: "Alright team, let's review our progress. We've completed the architecture design and project setup. Several tasks are queued up for implementation.",
        type: 'chat',
      },
    }),
    db.message.create({
      data: {
        projectId: project.id,
        agentId: 'agent_atlas',
        content: 'The architecture is solid. I recommend we focus on the core layout components first, then build out features incrementally. The component hierarchy should scale well.',
        type: 'chat',
      },
    }),
    db.message.create({
      data: {
        projectId: project.id,
        agentId: 'agent_coder',
        content: "Ready to start implementing the dashboard layout. I'll create the sidebar component with collapsible navigation and responsive breakpoints.",
        type: 'chat',
      },
    }),
    db.message.create({
      data: {
        projectId: project.id,
        agentId: 'agent_review',
        content: "I'll review each component as it's completed. Focusing on accessibility compliance and performance best practices.",
        type: 'chat',
      },
    }),
    db.message.create({
      data: {
        projectId: project.id,
        agentId: 'agent_tester',
        content: "I'll start writing unit tests for the utility functions. The formatRelativeTime and retry functions have several edge cases to cover.",
        type: 'action',
        metadata: JSON.stringify({ action: 'task_started', taskId: 'task_05' }),
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
        output: `[12:05:01] Running test suite...\n[12:05:02] ✓ utils.test.ts (8 tests passed)\n[12:05:03] ✓ button.test.tsx (5 tests passed)\n[12:05:04] ✓ api.test.ts (7 tests passed)\n[12:05:05] ✗ integration.test.ts (1 test failed)\n  → Expected redirect to /dashboard, received /login\n\nTests: 20 passed, 1 failed\n⚠ Test run completed with failures`,
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
        description: 'Created theme-provider.tsx with next-themes integration',
        metadata: JSON.stringify({ file: 'theme-provider.tsx', lines: 10 }),
      },
    }),
    db.agentActivity.create({
      data: {
        agentId: 'agent_deploy',
        action: 'deploy_triggered',
        description: 'Created Dockerfile with multi-stage build',
        metadata: JSON.stringify({ file: 'Dockerfile' }),
      },
    }),
  ])

  console.log(`✅ Seeded: ${1} project, ${agents.length} agents, ${tasks.length} tasks, ${files.length + directories.length} files, ${messages.length} messages, ${buildLogs.length} build logs, ${activities.length} activities`)
}

seed()
  .then(async () => await db.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await db.$disconnect()
    process.exit(1)
  })
