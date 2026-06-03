# Task 1: Build all API routes for the Autonomous IDE

## Agent: API Route Builder

## Summary

Built all 12 API routes for the new Autonomous IDE data model (Project, Agent, Task, Message, ProjectFile, BuildLog, AgentActivity).

## Changes Made

### Deleted old API routes
- Removed: agents/, benchmarks/, chat/, constitutional-rules/, dashboard/, evolution/, knowledge/, memory/, metrics/, research/, safety/, system-log/

### Schema Updates
- Added `assignee Agent? @relation(fields: [assigneeId], references: [id])` to Task model
- Added `assignedTasks Task[]` to Agent model
- Pushed schema to database

### New API Routes Created

| Route | Methods | Features |
|-------|---------|----------|
| `/api/projects` | GET, POST | List with _count, create with techStack JSON |
| `/api/projects/[id]` | GET, PATCH, DELETE | Detail with tasks/messages, selective update |
| `/api/agents` | GET, POST | List with latest activity, create with required fields |
| `/api/agents/[id]` | GET, PATCH, DELETE | Detail with activities/messages, update all fields |
| `/api/tasks` | GET, POST | Filters: projectId, status; includes assignee |
| `/api/tasks/[id]` | GET, PATCH, DELETE | Auto completedAt on done, includes assignee |
| `/api/messages` | GET, POST | Filters: projectId, limit; includes agent, asc order |
| `/api/files` | GET, POST | Filter: projectId; upsert by projectId+path |
| `/api/files/[id]` | GET, PATCH, DELETE | Update content/language |
| `/api/build-logs` | GET, POST | Filters: projectId, type, limit; desc order |
| `/api/activities` | GET | Includes agent, limit param, desc order |
| `/api/chat` | POST | z-ai-web-dev-sdk integration, saves user+AI messages |

### Other Changes
- Updated `/src/lib/db.ts` with schema version check for PrismaClient cache invalidation
- Updated root `/src/app/api/route.ts` with API endpoint listing
- Simplified `/src/app/page.tsx` to remove broken imports from old project

## Verification
- `bun run lint` passes clean
- API routes tested: `/api/projects` and `/api/agents` returning 200 with correct data
