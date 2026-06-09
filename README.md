<div align="center">

# ⚡ TeamForge IDE

**Autonomous Agentic IDE — AI-Powered Software Development**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

*A full-stack IDE where autonomous AI agents collaborate to design, build, review, test, and deploy software — all in one interface.*

[Getting Started](#-getting-started) · [Features](#-features) · [Architecture](#-architecture) · [Agents](#-ai-agents) · [Slash Commands](#-slash-commands) · [API](#-api-reference)

</div>

---

## 📖 Overview

TeamForge IDE is a browser-based, AI-powered development environment where **6 specialized AI agents** work together autonomously to build software. Instead of writing code alone, you orchestrate a team of AI agents — each with a distinct role — that plan, code, review, test, and deploy while you supervise or let them run in **YOLO Mode** for full autonomy.

### Why TeamForge?

| Traditional IDE | TeamForge IDE |
|---|---|
| You write every line of code | AI agents write code collaboratively |
| Manual testing & review | Agents auto-review and test |
| Switch between tools | Everything in one interface |
| Single developer flow | Multi-agent orchestration |
| Manual deployment | One-click build & deploy |

---

## ✨ Features

### 🤖 Multi-Agent AI System
- **6 specialized agents** — PM, Architect, Developer, Reviewer, Tester, DevOps
- **Autonomous task execution** — agents pick up, execute, and complete tasks
- **YOLO Mode** — full autonomy where agents auto-approve and execute without confirmation
- **Real-time status tracking** — see each agent's state (idle, thinking, coding, reviewing, testing, deploying)

### 💬 AI Chat with Context Awareness
- **Context-aware AI** — the system prompt includes project structure, active file content, dependencies, build output, and chat history
- **Multi-provider support** — Z-AI (GLM-4), NVIDIA NIM (80+ models), OpenAI-Compatible endpoints
- **Slash commands** — `/run`, `/edit`, `/fix`, `/refactor`, `/optimize`, `/search`, `/commit`, `/status`, `/deploy`, `/build`, `/test`
- **Chat sessions** — create, rename, switch, and delete conversation histories

### 📝 Full Code Editor
- **Syntax-highlighted editor** with line numbers, code folding, and minimap
- **Multi-file tabs** with drag-to-reorder
- **Breadcrumb navigation** with clickable path segments
- **Find & Replace** with regex, case-sensitive, and whole-word support
- **Go to Line** quick navigation (Ctrl+G)
- **Global Search** across all project files (Ctrl+Shift+F)
- **Run current file** with Ctrl+Enter (auto-detects language: bun, python3, bash)
- **Auto-save** with unsaved file indicators

### 🗂️ Project Management
- **Virtual File System** — create, edit, delete files and directories via API
- **Task board** — backlog, todo, in-progress, in-review, done, blocked
- **Task assignment** — agents auto-assign based on role and availability
- **Build & deploy** — real lint, build, and test execution with output streaming
- **Git integration** — branch tracking, file status, commit history

### 🎨 Dark-First Design
- **Catppuccin Mocha** color theme — easy on the eyes, beautiful by default
- **Responsive layout** — works on desktop, tablet, and mobile
- **Animated transitions** — smooth Framer Motion animations throughout
- **Command Palette** — Ctrl+Shift+P for quick actions
- **Keyboard shortcuts** — 30+ shortcuts for power users

### 🔌 Real-Time Updates
- **WebSocket** connection for live agent status updates
- **Polling fallback** when WebSocket is disconnected
- **Activity feed** — real-time log of all agent actions
- **Notification system** — task completions, build results, code changes

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     TeamForge IDE                        │
├──────────┬──────────────────────────┬───────────────────┤
│          │                          │                   │
│  Agent   │       Code Editor        │    Chat Panel     │
│  Sidebar │   (Multi-file tabs)      │  (AI + Sessions)  │
│          │                          │                   │
│  - Nova  │   ┌──────────────────┐   │  - Context-aware  │
│  - Codey │   │  Syntax Highlight │   │  - Multi-provider │
│  - Atlas │   │  Find & Replace   │   │  - Slash commands │
│  - Blaze │   │  Run File (Ctrl↵) │   │  - Chat history   │
│  - Prism │   └──────────────────┘   │                   │
│  - Flux  │                          │                   │
│          ├──────────────────────────┴───────────────────┤
│          │            Bottom Panel                       │
│          │  Terminal │ Tasks │ Build │ Activities │ Git  │
├──────────┴──────────────────────────────────────────────┤
│                    Status Bar                            │
│  Live ● │ Agents │ Tasks │ Tokens │ Uptime │ AI │ Branch│
└─────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 (strict) |
| **Styling** | Tailwind CSS 4 + shadcn/ui |
| **State** | Zustand (client) + TanStack Query (server) |
| **Database** | Prisma ORM (SQLite) |
| **AI SDK** | z-ai-web-dev-sdk |
| **Animations** | Framer Motion |
| **Real-time** | WebSocket (socket.io-client) |
| **Icons** | Lucide React |

### Project Structure

```
src/
├── app/
│   ├── page.tsx              # Main IDE layout
│   ├── layout.tsx            # Root layout with providers
│   ├── globals.css           # Global styles + Catppuccin theme
│   └── api/
│       ├── agents/           # Agent CRUD + status updates
│       ├── tasks/            # Task CRUD + assignment
│       ├── chat-sessions/    # Chat session management
│       ├── messages/         # Message CRUD
│       ├── files/            # Virtual File System CRUD
│       ├── ai/chat/          # AI chat endpoint (multi-provider)
│       ├── agent-scheduler/  # Agent orchestration + task assignment
│       ├── exec/             # Shell command execution
│       ├── build-logs/       # Build/deploy log management
│       ├── activities/       # Agent activity feed
│       ├── projects/         # Project management + import/export
│       └── ...               # Other API routes
├── components/
│   ├── ide-top-bar.tsx       # Top toolbar (play/stop, YOLO, actions)
│   ├── ide-sidebar.tsx       # Left sidebar (agents, files, activity)
│   ├── ide-editor.tsx        # Code editor with tabs
│   ├── ide-chat-panel.tsx    # AI chat with slash commands
│   ├── ide-bottom-panel.tsx  # Terminal, tasks, build, activities
│   ├── agent-detail-dialog.tsx
│   ├── command-palette.tsx
│   ├── settings-dialog.tsx
│   ├── keyboard-shortcuts-overlay.tsx
│   ├── file-search-overlay.tsx
│   ├── global-search-panel.tsx
│   └── ui/                   # shadcn/ui components
├── hooks/
│   ├── use-agent-orchestrator.ts  # Agent polling + scheduler
│   ├── use-realtime-ws.ts         # WebSocket connection
│   ├── use-api.ts                 # API fetch helpers
│   └── ...
└── lib/
    ├── store.ts              # Zustand store (all app state)
    ├── types.ts              # TypeScript interfaces + configs
    ├── ai-providers.ts       # AI provider definitions + request builders
    ├── db.ts                 # Prisma client
    └── utils.ts              # Utility functions + useHydrated hook
```

---

## 🤖 AI Agents

| Agent | Role | Icon | Specialty |
|---|---|---|---|
| **Nova** | PM | 📋 | Project management, task coordination, sprint planning |
| **Atlas** | Architect | 🏗️ | System design, API design, tech decisions, scalability |
| **Codey** | Developer | 💻 | Code implementation, debugging, feature development |
| **Prism** | Reviewer | 🔍 | Code review, quality assurance, best practices |
| **Flux** | Tester | 🧪 | Test creation, validation, edge case detection |
| **Blaze** | DevOps | 🚀 | CI/CD, deployment, infrastructure, monitoring |

### Agent Lifecycle

```
idle → thinking → coding/reviewing/testing/deploying → idle
  ↑                                                         │
  └─────────────── task completed ──────────────────────────┘
```

### YOLO Mode

When **YOLO Mode** is enabled:
- Agents **auto-approve** all tasks without confirmation
- The scheduler **batch-executes** all pending tasks in sequence
- Polling interval is **reduced from 10s to 5s** for faster response
- The AI system prompt grants **full autonomy** to create/modify/delete files

---

## 💬 Slash Commands

| Command | Description | Example |
|---|---|---|
| `/run <cmd>` | Execute a whitelisted shell command | `/run bun run lint` |
| `/edit <path> <instruction>` | AI-assisted file editing | `/edit src/app/page.tsx Add a dark mode toggle` |
| `/fix [path]` | AI analyzes and fixes bugs/issues | `/fix src/lib/utils.ts` |
| `/refactor [path]` | AI refactors for better code quality | `/refactor src/components/card.tsx` |
| `/optimize [path]` | AI optimizes for performance | `/optimize src/hooks/use-data.ts` |
| `/explain [path]` | AI explains a file's code | `/explain src/lib/store.ts` |
| `/search <query>` | Search all project files | `/search useAppStore` |
| `/commit` | Generate a conventional commit message | `/commit` |
| `/status` | Get real-time project status | `/status` |
| `/build` | Run the project build | `/build` |
| `/test` | Run tests | `/test` |
| `/deploy` | Run pre-deploy checks | `/deploy` |
| `/create_file <path>` | Create a new file via AI | `/create_file src/lib/helper.ts` |

> **Note:** `/fix`, `/refactor`, and `/optimize` use the currently active file if no path is specified.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+P` | Command Palette |
| `Ctrl+P` | Quick Open File |
| `Ctrl+S` | Save Current File |
| `Ctrl+Shift+S` | Save All Files |
| `Ctrl+N` | New File |
| `Ctrl+,` | Settings |
| `Ctrl+Enter` | Run Current File |
| `Ctrl+J` | Toggle Terminal |
| `Ctrl+B` | Toggle Sidebar |
| `Ctrl+F` | Find |
| `Ctrl+H` | Find & Replace |
| `Ctrl+G` | Go to Line |
| `Ctrl+Shift+F` | Global Search |
| `Ctrl+/` | Toggle Comment |
| `Ctrl+Shift+/` | Keyboard Shortcuts |
| `F1` | Keyboard Shortcuts |
| `Ctrl+Shift+B` | Run Build |
| `Ctrl+Shift+T` | Run Tests |
| `Ctrl+Shift+L` | Run Lint |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ or **Bun** runtime
- **npm** or **bun** package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/AFKmoney/teamforge.git
cd teamforge

# Install dependencies
bun install

# Set up the database
bun run db:push

# Start the development server
bun run dev
```

The app will be available at `http://localhost:3000`.

### Environment Variables

Create a `.env` file in the project root:

```env
# Optional: NVIDIA NIM API key for 80+ models
NVIDIA_API_KEY=nvapi-...

# Optional: OpenAI-Compatible endpoint
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_API_KEY=sk-...

# The app works out-of-the-box with Z-AI (GLM-4) — no API key needed
```

### Available Scripts

| Script | Description |
|---|---|
| `bun run dev` | Start development server (port 3000) |
| `bun run build` | Production build |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint |
| `bun run db:push` | Push Prisma schema to database |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:migrate` | Run database migrations |
| `bun run db:reset` | Reset database |

---

## 🔌 API Reference

### Agents

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/agents` | List all agents |
| `GET` | `/api/agents/[id]` | Get agent details |
| `PATCH` | `/api/agents/[id]` | Update agent status |

### Tasks

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/tasks` | List tasks (filter by `projectId`) |
| `POST` | `/api/tasks` | Create a task |
| `GET` | `/api/tasks/[id]` | Get task details |
| `PATCH` | `/api/tasks/[id]` | Update task |

### Chat Sessions

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/chat-sessions` | List sessions (filter by `projectId`) |
| `POST` | `/api/chat-sessions` | Create a session |
| `GET` | `/api/chat-sessions/[id]` | Get session with messages |
| `PATCH` | `/api/chat-sessions/[id]` | Update session (rename) |
| `DELETE` | `/api/chat-sessions/[id]` | Delete session |

### AI Chat

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ai/chat` | Send message to AI (multi-provider) |
| `POST` | `/api/chat` | Send message to AI (legacy route) |

### Files (Virtual File System)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/files` | List files (filter by `projectId`) |
| `POST` | `/api/files` | Create file/directory |
| `GET` | `/api/files/[id]` | Get file content |
| `PATCH` | `/api/files/[id]` | Update file content |
| `DELETE` | `/api/files/[id]` | Delete file |

### Execution

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/exec` | Execute whitelisted shell command |
| `POST` | `/api/agent-scheduler` | Agent task scheduling & orchestration |

### Projects

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/projects` | List projects |
| `POST` | `/api/projects` | Create project |
| `GET` | `/api/projects/[id]` | Get project details |
| `PATCH` | `/api/projects/[id]` | Update project |
| `POST` | `/api/projects/import` | Import project from ZIP |
| `GET` | `/api/projects/[id]/export` | Export project as ZIP |

---

## 🎨 AI Providers

### Z-AI (Default — No API Key Needed)

| Model | Description |
|---|---|
| GLM-4 | Zhipu AI flagship model — powerful and versatile |
| GLM-4 Flash | Fast variant — quick responses |

### NVIDIA NIM (80+ Free Models)

Requires an API key from [build.nvidia.com](https://build.nvidia.com/). Includes models from:

- **Meta** — Llama 3.3 70B, Llama 3.1 405B/70B/8B, Llama 3.2 Vision
- **NVIDIA** — Nemotron Super 49B, Nemotron Ultra 253B, Nemotron Nano
- **DeepSeek** — R1, V3.1, V4 Pro/Flash, Coder V2
- **Mistral** — Mistral 7B/24B, Mixtral 8x7B/8x22B
- **Qwen** — Qwen 3 32B, Qwen 3 Coder, Qwen 2.5 Coder
- **Google** — Gemma 3 1B, Gemma 2 27B/9B/2B
- **Microsoft** — Phi-4 Mini, Phi-3 Mini
- **OpenAI** — GPT-OSS 120B/20B
- + 30 more models in multiple languages

### OpenAI-Compatible

Connect to any OpenAI-compatible endpoint:
- **Ollama** — Local LLM inference
- **LM Studio** — Desktop LLM runner
- **vLLM** — High-throughput serving
- **Together AI**, **Fireworks AI**, **Anyscale** — Cloud inference

---

## 🧩 Key Components

| Component | File | Description |
|---|---|---|
| IDE Layout | `src/app/page.tsx` | Main 3-column layout with responsive design |
| Top Bar | `src/components/ide-top-bar.tsx` | Play/Stop/Pause agents, YOLO toggle, Actions menu |
| Sidebar | `src/components/ide-sidebar.tsx` | Agent list, file tree, activity feed |
| Editor | `src/components/ide-editor.tsx` | Syntax highlighting, tabs, find/replace, run file |
| Chat Panel | `src/components/ide-chat-panel.tsx` | AI chat, slash commands, session history |
| Bottom Panel | `src/components/ide-bottom-panel.tsx` | Terminal, tasks, build logs, activities, git |
| Command Palette | `src/components/command-palette.tsx` | Quick actions (Ctrl+Shift+P) |
| Settings | `src/components/settings-dialog.tsx` | AI providers, API keys, editor preferences |
| Agent Detail | `src/components/agent-detail-dialog.tsx` | Agent stats, capabilities, activity, files |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style (TypeScript strict, ES6+ imports)
- Use shadcn/ui components — no custom UI primitives
- All new features must be responsive (mobile-first)
- Add proper TypeScript types — no `any`
- Run `bun run lint` before committing

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ by the TeamForge community**

[Report Bug](https://github.com/AFKmoney/teamforge/issues) · [Request Feature](https://github.com/AFKmoney/teamforge/issues) · [Discussions](https://github.com/AFKmoney/teamforge/discussions)

</div>
