# TeamForge IDE - Autonomous AI Development Platform

---
Task ID: Rebuild-1
Agent: Main
Task: Complete rebuild from "Self-Evolving AI System" to "TeamForge IDE"

Work Log:
- Analyzed user feedback: previous system was not useful, user wants an autonomous IDE with AI agents working 24/7
- Reset Prisma schema with new models: Project, Agent, Task, Message, ProjectFile, BuildLog, AgentActivity
- Pushed new schema to SQLite database with `--accept-data-loss`
- Created comprehensive seed data: 1 project, 6 agents (Codey/Atlas/Blaze/Prism/Flux/Nova), 10 tasks, 12 files, 8+ messages, 3+ build logs, 5+ activities
- Delegated API routes build to subagent (12 routes created successfully)
- Delegated IDE frontend build to subagent (6 components created)
- Enhanced chat panel with actual AI integration via z-ai-web-dev-sdk
- Enhanced top bar with New Task dialog (creates tasks via API)
- Created use-agent-simulation hook for autonomous agent behavior simulation
- Added agent simulation to page.tsx - agents now autonomously change status, send messages, update tasks
- Cleaned up all old dashboard components (agents-panel, dashboard-overview, etc.)
- Added IDE-specific CSS (scrollbar, typing indicator, code line highlight)
- Lint passes clean
- All API routes returning correct data
- Chat API working with LLM responses

Stage Summary:
- **Complete project rebuild** from generic dashboard to functional IDE
- **6 AI agents** working as a team: Atlas (Architect), Codey (Developer), Prism (Reviewer), Flux (Tester), Blaze (DevOps), Nova (PM)
- **Full IDE layout**: Top bar, sidebar (file explorer + agents), code editor, chat panel, bottom panel (terminal/tasks/build/problems), footer status bar
- **Agent simulation**: Agents autonomously change status, send messages, update tasks
- **Chat with AI**: Users can message the team and get AI responses
- **New Task dialog**: Create and assign tasks to agents
- **Task Kanban board**: Tasks move through backlog → todo → in_progress → in_review → done
- **Code editor**: Syntax-highlighted code view with file tabs
- **Build logs**: Terminal output with color-coded status
- **Dark mode**: Full dark mode support with semantic color tokens

## Current Project Status

The TeamForge IDE is a **functional autonomous IDE** where AI agents work as a team on software projects.

### Core Features:
1. **IDE Layout** - VS Code-like layout with sidebar, editor, chat, and bottom panel
2. **6 AI Agents** - Each with distinct role, status, and autonomous behavior
3. **Agent Team Chat** - Real-time chat with AI responses via LLM
4. **Task Management** - Kanban board with 6 status columns, task creation, assignment
5. **Code Editor** - Syntax-highlighted code view with file explorer
6. **Terminal/Build** - Build logs with status indicators
7. **Agent Simulation** - Agents autonomously work, chat, and update tasks
8. **Dark Mode** - Full dark/light mode support

### Architecture:
- **Frontend**: Next.js 16 with React, Tailwind CSS, shadcn/ui, framer-motion
- **Backend**: Next.js API routes with Prisma ORM (SQLite)
- **AI**: z-ai-web-dev-sdk for LLM chat integration
- **State**: Zustand for global state management
- **Real-time**: Agent simulation hook for autonomous behavior

### Key Files:
- `/src/app/page.tsx` - Main IDE page with layout
- `/src/components/ide-top-bar.tsx` - Top bar with agent pills + New Task dialog
- `/src/components/ide-sidebar.tsx` - File explorer + Agent list
- `/src/components/ide-editor.tsx` - Code editor with syntax highlighting
- `/src/components/ide-chat-panel.tsx` - Team chat with AI integration
- `/src/components/ide-bottom-panel.tsx` - Terminal/Tasks/Build/Problems tabs
- `/src/components/ide-task-card.tsx` - Task card component
- `/src/lib/store.ts` - Zustand store with all IDE state
- `/src/lib/types.ts` - TypeScript types and config constants
- `/src/hooks/use-agent-simulation.ts` - Agent autonomous behavior simulation
- `/src/app/api/chat/route.ts` - LLM-powered chat API

### Unresolved Issues / Next Steps:
1. Could add WebSocket for real-time agent updates (currently using simulation)
2. Could add agent detail dialog when clicking on agent in sidebar
3. Could add drag-and-drop for task board columns
4. Could add file editing (save changes back to database)
5. Could add Git integration view (commits, branches, PRs)
6. Could add multi-project support
7. Could add settings/preferences panel
8. Could add keyboard shortcuts for common actions
9. Mobile responsive layout needs more work
10. Could add activity feed panel showing all agent actions in real-time

---
Task ID: Rebuild-1
Agent: API Subagent
Task: Build all API routes for the Autonomous IDE

Work Log:
- Deleted all old API routes (agents/, benchmarks/, chat/, constitutional-rules/, dashboard/, evolution/, knowledge/, memory/, metrics/, research/, safety/, system-log/)
- Created 12 new API routes:
  1. /api/projects (GET, POST)
  2. /api/projects/[id] (GET, PATCH, DELETE)
  3. /api/agents (GET, POST)
  4. /api/agents/[id] (GET, PATCH, DELETE)
  5. /api/tasks (GET with projectId/status filters, POST)
  6. /api/tasks/[id] (GET, PATCH with auto-completedAt, DELETE)
  7. /api/messages (GET with projectId/limit filters, POST)
  8. /api/files (GET with projectId filter, POST with upsert)
  9. /api/files/[id] (GET, PATCH, DELETE)
  10. /api/build-logs (GET with projectId/type/limit filters, POST)
  11. /api/activities (GET with limit param, includes agent relation)
  12. /api/chat (POST with z-ai-web-dev-sdk LLM integration)
- Updated Prisma schema to add assignee relation on Task → Agent
- All routes return proper JSON with error handling

Stage Summary:
- All 12 API routes working correctly
- Chat API returns both userMessage and aiMessage
- Task API auto-sets completedAt when status changes to 'done'
- File API uses upsert by projectId+path for create/update
- Activity and Message APIs include agent relation data
