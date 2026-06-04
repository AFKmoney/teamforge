'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import type { Agent, AgentActivity, Message, Task } from '@/lib/types'
import { AGENT_ROLE_CONFIG, AGENT_STATUS_CONFIG } from '@/lib/types'

// Simulated autonomous agent behavior
// Each agent periodically performs actions, sends messages, and updates tasks
const AGENT_BEHAVIORS: Record<string, {
  actions: string[]
  messages: string[]
  statusCycle: string[]
}> = {
  architect: {
    actions: ['Reviewed architecture decisions', 'Updated component diagram', 'Analyzed performance bottleneck', 'Designed API schema', 'Refactored module boundaries'],
    messages: [
      'I recommend we split the monolithic API into micro-services. The current architecture won\'t scale past 10k users.',
      'Just finished the data flow diagram. The key insight: we should use event sourcing for the activity feed.',
      'Performance review shows N+1 queries in the dashboard. I\'ll create a task for that.',
      'The WebSocket architecture is solid. Let me sketch out the reconnection strategy.',
      'I\'ve updated the system architecture doc. Key change: moved to CQRS pattern for read-heavy endpoints.',
    ],
    statusCycle: ['thinking', 'reviewing', 'thinking', 'idle'],
  },
  developer: {
    actions: ['Implemented new feature', 'Fixed bug in auth flow', 'Refactored component', 'Added error handling', 'Updated API endpoint'],
    messages: [
      'Just pushed the sidebar component. Added collapsible behavior and responsive breakpoints.',
      'Fixed that race condition in the WebSocket handler. Turns out we needed a debounce on reconnect.',
      'Implementing the chat panel now. Should have a working version in 15 min.',
      'Found a memory leak in the useEffect cleanup. Pushing a fix now.',
      'Dark mode is fully implemented. All components use semantic color tokens now.',
    ],
    statusCycle: ['coding', 'thinking', 'coding', 'reviewing', 'coding'],
  },
  reviewer: {
    actions: ['Completed code review', 'Approved PR with suggestions', 'Found security issue', 'Suggested refactoring', 'Verified test coverage'],
    messages: [
      'Reviewed PR #147. Looks good overall, but I found 3 issues: 1) Missing error boundary, 2) Unused imports, 3) Potential XSS in user input rendering.',
      'The auth module is clean. Nice use of JWT refresh tokens. One suggestion: add rate limiting.',
      'Just noticed we\'re not sanitizing user input before rendering. Creating a security task.',
      'Code coverage is at 78%. We need to hit 85% before release. I\'ll flag the uncovered paths.',
      'Approved the API refactor. The separation of concerns is much cleaner now.',
    ],
    statusCycle: ['reviewing', 'thinking', 'reviewing', 'idle', 'reviewing'],
  },
  tester: {
    actions: ['Ran test suite', 'Found regression bug', 'Added E2E test', 'Verified fix', 'Updated test snapshots'],
    messages: [
      'Running E2E test suite for the chat panel... Found a flaky test in the message auto-scroll behavior.',
      'All 147 unit tests passing! But the integration test for auth redirect is failing intermittently.',
      'Added 12 new test cases for the file upload feature. Edge cases: large files, invalid types, network errors.',
      'Performance test results: page load < 800ms, Time to Interactive < 1.2s. Within targets!',
      'Found a regression: the sidebar doesn\'t collapse on mobile after the latest merge. Creating a bug report.',
    ],
    statusCycle: ['testing', 'thinking', 'testing', 'idle'],
  },
  devops: {
    actions: ['Deployed to staging', 'Configured CI pipeline', 'Updated Docker image', 'Set up monitoring', 'Rotated secrets'],
    messages: [
      'Deployed v0.4.0-rc.2 to staging. Health checks passing. URL: https://staging.teamforge.dev',
      'CI pipeline is now configured: lint → test → build → deploy. Runs on every PR.',
      'Docker image size reduced by 40% using multi-stage builds. Down to 85MB.',
      'Set up Prometheus + Grafana monitoring. Alert rules for CPU > 80% and memory > 90%.',
      'Rotated all secrets and updated .env files. No downtime during rotation.',
    ],
    statusCycle: ['deploying', 'idle', 'deploying', 'thinking'],
  },
  pm: {
    actions: ['Updated sprint board', 'Created new task', 'Resolved blocker', 'Updated timeline', 'Triaged bug reports'],
    messages: [
      'Sprint 4 Day 3 update: 7 tasks completed, 3 in progress, 2 in backlog. Velocity: 16 story points/day. On track! 🎯',
      'Created 3 new tasks from user feedback: 1) Mobile nav UX, 2) Search performance, 3) Export functionality.',
      'Blocked task resolved: DevOps provisioned the staging database. Coder can proceed with integration.',
      'Updated the roadmap: Q2 milestone moved up by 1 week. Great work team! 🚀',
      'Triage complete: 2 critical bugs, 5 medium, 8 low. Critical ones assigned to Coder and Reviewer.',
    ],
    statusCycle: ['thinking', 'coding', 'thinking', 'idle'],
  },
}

export function useAgentSimulation() {
  const agents = useAppStore((s) => s.agents)
  const updateAgent = useAppStore((s) => s.updateAgent)
  const addMessage = useAppStore((s) => s.addMessage)
  const addActivity = useAppStore((s) => s.addActivity)
  const tasks = useAppStore((s) => s.tasks)
  const updateTask = useAppStore((s) => s.updateTask)
  const currentProject = useAppStore((s) => s.currentProject)
  const intervalRefs = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const simulateAgent = useCallback((agent: Agent) => {
    const behavior = AGENT_BEHAVIORS[agent.role]
    if (!behavior) return

    // Cycle agent status
    const currentStatusIdx = behavior.statusCycle.indexOf(agent.status)
    const nextStatusIdx = (currentStatusIdx + 1) % behavior.statusCycle.length
    const nextStatus = behavior.statusCycle[nextStatusIdx] as Agent['status']
    
    updateAgent(agent.id, {
      status: nextStatus,
      lastActive: new Date().toISOString(),
      tokensUsed: agent.tokensUsed + Math.floor(Math.random() * 500) + 100,
    })

    // Sometimes send a message (40% chance)
    if (Math.random() < 0.4) {
      const randomMsg = behavior.messages[Math.floor(Math.random() * behavior.messages.length)]
      const msgTypes = ['chat', 'action', 'code_change', 'review_comment', 'test_result', 'deploy_log'] as const
      const typeWeights: Record<string, number> = {
        architect: 0, developer: 2, reviewer: 4, tester: 5, devops: 6, pm: 0,
      }
      const msgType = msgTypes[typeWeights[agent.role] || 0]

      const message: Message = {
        id: `sim_${agent.id}_${Date.now()}`,
        projectId: currentProject?.id || 'proj_01',
        agentId: agent.id,
        content: randomMsg,
        type: msgType,
        metadata: {},
        createdAt: new Date().toISOString(),
        agent,
      }
      addMessage(message)
    }

    // Sometimes add an activity (60% chance)
    if (Math.random() < 0.6) {
      const randomAction = behavior.actions[Math.floor(Math.random() * behavior.actions.length)]
      const activity: AgentActivity = {
        id: `act_${agent.id}_${Date.now()}`,
        agentId: agent.id,
        action: 'task_started',
        description: randomAction,
        metadata: {},
        createdAt: new Date().toISOString(),
        agent,
      }
      addActivity(activity)
    }

    // Sometimes update a task (20% chance)
    if (Math.random() < 0.2 && tasks.length > 0) {
      const inProgressTasks = tasks.filter((t) => t.status === 'in_progress' || t.status === 'todo')
      if (inProgressTasks.length > 0) {
        const task = inProgressTasks[Math.floor(Math.random() * inProgressTasks.length)]
        const statusTransitions: Record<string, Task['status']> = {
          'todo': 'in_progress',
          'in_progress': 'in_review',
          'in_review': 'done',
        }
        const newStatus = statusTransitions[task.status]
        if (newStatus) {
          updateTask(task.id, {
            status: newStatus,
            ...(newStatus === 'done' ? { completedAt: new Date().toISOString() } : {}),
          })
        }
      }
    }
  }, [agents, tasks, currentProject, updateAgent, addMessage, addActivity, updateTask])

  useEffect(() => {
    // Clear existing intervals
    intervalRefs.current.forEach((interval) => clearInterval(interval))
    intervalRefs.current.clear()

    // Set up simulation for each agent with different intervals
    for (const agent of agents) {
      // Different agents have different speeds
      const speeds: Record<string, number> = {
        architect: 25000,
        developer: 18000,
        reviewer: 22000,
        tester: 20000,
        devops: 30000,
        pm: 28000,
      }
      const interval = speeds[agent.role] || 25000

      // Stagger start times
      const timeout = setTimeout(() => {
        simulateAgent(agent)
        const iv = setInterval(() => simulateAgent(agent), interval + Math.random() * 5000)
        intervalRefs.current.set(agent.id, iv)
      }, Math.random() * 10000)

      // Clean up timeout too
      const cleanup = () => clearTimeout(timeout)
      intervalRefs.current.set(`timeout_${agent.id}`, cleanup as unknown as NodeJS.Timeout)
    }

    return () => {
      intervalRefs.current.forEach((interval) => clearInterval(interval))
      intervalRefs.current.clear()
    }
  }, [agents.length, simulateAgent])
}
