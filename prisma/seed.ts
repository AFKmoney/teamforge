import { db } from '@/lib/db'

async function seed() {
  // Create agents
  const agents = await Promise.all([
    db.agent.create({
      data: {
        name: 'Atlas',
        role: 'research',
        status: 'active',
        description: 'Research Agent - Searches information, generates hypotheses, and produces comprehensive reports.',
        goals: JSON.stringify(['Search and synthesize information', 'Generate testable hypotheses', 'Produce research reports']),
        tools: JSON.stringify(['web_search', 'document_reader', 'hypothesis_generator']),
        successRate: 0.89,
        tasksCompleted: 147,
        tokensUsed: 2340000,
      }
    }),
    db.agent.create({
      data: {
        name: 'CodeX',
        role: 'coding',
        status: 'active',
        description: 'Coding Agent - Writes software, generates tests, and refactors code with high precision.',
        goals: JSON.stringify(['Write production-quality code', 'Generate comprehensive tests', 'Refactor and optimize']),
        tools: JSON.stringify(['code_generator', 'test_runner', 'linter', 'debugger']),
        successRate: 0.94,
        tasksCompleted: 312,
        tokensUsed: 4560000,
      }
    }),
    db.agent.create({
      data: {
        name: 'Evalyn',
        role: 'evaluation',
        status: 'active',
        description: 'Evaluation Agent - Benchmarks outputs, detects regressions, and ensures quality standards.',
        goals: JSON.stringify(['Benchmark system outputs', 'Detect regressions', 'Validate improvements']),
        tools: JSON.stringify(['benchmark_runner', 'regression_detector', 'quality_scorer']),
        successRate: 0.97,
        tasksCompleted: 89,
        tokensUsed: 890000,
      }
    }),
    db.agent.create({
      data: {
        name: 'Mnemo',
        role: 'memory',
        status: 'active',
        description: 'Memory Agent - Curates memories, consolidates knowledge, and optimizes recall.',
        goals: JSON.stringify(['Curate and organize memories', 'Consolidate knowledge', 'Optimize recall efficiency']),
        tools: JSON.stringify(['memory_indexer', 'knowledge_consolidator', 'recall_optimizer']),
        successRate: 0.92,
        tasksCompleted: 203,
        tokensUsed: 1200000,
      }
    }),
    db.agent.create({
      data: {
        name: 'Evo',
        role: 'evolution',
        status: 'busy',
        description: 'Evolution Agent - Proposes system improvements and drives self-optimization cycles.',
        goals: JSON.stringify(['Identify improvement opportunities', 'Propose system changes', 'Drive evolution cycles']),
        tools: JSON.stringify(['evolution_analyzer', 'improvement_proposer', 'ab_tester']),
        successRate: 0.78,
        tasksCompleted: 56,
        tokensUsed: 3450000,
      }
    }),
    db.agent.create({
      data: {
        name: 'Sentinel',
        role: 'safety',
        status: 'active',
        description: 'Safety Agent - Reviews every modification and ensures constitutional compliance.',
        goals: JSON.stringify(['Review all modifications', 'Ensure safety compliance', 'Prevent unauthorized changes']),
        tools: JSON.stringify(['policy_checker', 'safety_validator', 'audit_logger']),
        successRate: 0.99,
        tasksCompleted: 567,
        tokensUsed: 670000,
      }
    }),
    db.agent.create({
      data: {
        name: 'Deploy',
        role: 'deployment',
        status: 'idle',
        description: 'Deployment Agent - Manages releases and ensures safe rollouts of validated improvements.',
        goals: JSON.stringify(['Manage releases', 'Ensure safe rollouts', 'Monitor deployments']),
        tools: JSON.stringify(['release_manager', 'rollback_handler', 'deploy_monitor']),
        successRate: 0.96,
        tasksCompleted: 34,
        tokensUsed: 450000,
      }
    }),
  ])

  // Create memories
  await Promise.all([
    db.memory.create({
      data: {
        agentId: agents[0].id,
        type: 'episodic',
        category: 'research',
        content: 'Successfully identified a novel approach to multi-hop reasoning using chain-of-thought decomposition. The technique improved accuracy by 23% on complex queries.',
        importance: 0.9,
        accessCount: 15,
      }
    }),
    db.memory.create({
      data: {
        agentId: agents[1].id,
        type: 'procedural',
        category: 'coding',
        content: 'Refactoring pattern: When optimizing database queries, first check for N+1 problems, then add appropriate indexes, and finally consider caching strategies.',
        importance: 0.85,
        accessCount: 42,
      }
    }),
    db.memory.create({
      data: {
        type: 'semantic',
        category: 'knowledge',
        content: 'Self-evolution requires a closed-loop feedback system: Observe → Analyze → Hypothesize → Implement → Evaluate → Deploy. Each cycle must be validated independently.',
        importance: 0.95,
        accessCount: 78,
      }
    }),
    db.memory.create({
      data: {
        agentId: agents[3].id,
        type: 'working',
        category: 'current_task',
        content: 'Currently consolidating episodic memories from the last 24 hours. Found 3 high-value patterns that should be promoted to semantic memory.',
        importance: 0.7,
        accessCount: 5,
      }
    }),
    db.memory.create({
      data: {
        agentId: agents[4].id,
        type: 'evolution',
        category: 'improvement',
        content: 'Prompt evolution experiment #47: Changing the planning prompt to include explicit step decomposition improved task completion rates from 72% to 84%.',
        importance: 0.92,
        accessCount: 23,
      }
    }),
    db.memory.create({
      data: {
        type: 'semantic',
        category: 'pattern',
        content: 'Pattern: Agent coordination works best with a hub-and-spoke model for up to 7 agents. Beyond that, hierarchical delegation with mid-level coordinators is more efficient.',
        importance: 0.88,
        accessCount: 31,
      }
    }),
  ])

  // Create knowledge nodes
  const nodes = await Promise.all([
    db.knowledgeNode.create({
      data: {
        label: 'Self-Evolution',
        type: 'concept',
        description: 'The capability of an AI system to autonomously improve its own performance.',
        data: JSON.stringify({ domain: 'meta-learning', maturity: 'advanced' }),
      }
    }),
    db.knowledgeNode.create({
      data: {
        label: 'Prompt Engineering',
        type: 'skill',
        description: 'Techniques for crafting effective prompts to guide AI behavior.',
        data: JSON.stringify({ domain: 'ai-engineering', maturity: 'core' }),
      }
    }),
    db.knowledgeNode.create({
      data: {
        label: 'Multi-Agent Coordination',
        type: 'pattern',
        description: 'Patterns for orchestrating multiple AI agents working together.',
        data: JSON.stringify({ domain: 'distributed-ai', maturity: 'developing' }),
      }
    }),
    db.knowledgeNode.create({
      data: {
        label: 'Chain-of-Thought',
        type: 'strategy',
        description: 'Reasoning strategy that decomposes complex tasks into sequential steps.',
        data: JSON.stringify({ domain: 'reasoning', maturity: 'proven' }),
      }
    }),
    db.knowledgeNode.create({
      data: {
        label: 'Reinforcement Learning',
        type: 'concept',
        description: 'Learning paradigm where agents improve through reward signals.',
        data: JSON.stringify({ domain: 'ml', maturity: 'core' }),
      }
    }),
    db.knowledgeNode.create({
      data: {
        label: 'Safety Validation',
        type: 'tool',
        description: 'Automated pipeline for validating changes before deployment.',
        data: JSON.stringify({ domain: 'safety', maturity: 'critical' }),
      }
    }),
    db.knowledgeNode.create({
      data: {
        label: 'Memory Consolidation',
        type: 'pattern',
        description: 'Process of converting short-term memories into long-term knowledge.',
        data: JSON.stringify({ domain: 'memory', maturity: 'developing' }),
      }
    }),
    db.knowledgeNode.create({
      data: {
        label: 'Genetic Prompt Optimization',
        type: 'strategy',
        description: 'Using evolutionary algorithms to optimize prompt effectiveness.',
        data: JSON.stringify({ domain: 'optimization', maturity: 'experimental' }),
      }
    }),
  ])

  // Create knowledge edges
  await Promise.all([
    db.knowledgeEdge.create({ data: { sourceId: nodes[0].id, targetId: nodes[1].id, relation: 'improves', weight: 0.9 } }),
    db.knowledgeEdge.create({ data: { sourceId: nodes[0].id, targetId: nodes[2].id, relation: 'dependsOn', weight: 0.8 } }),
    db.knowledgeEdge.create({ data: { sourceId: nodes[1].id, targetId: nodes[3].id, relation: 'derivedFrom', weight: 0.7 } }),
    db.knowledgeEdge.create({ data: { sourceId: nodes[3].id, targetId: nodes[4].id, relation: 'connectedTo', weight: 0.6 } }),
    db.knowledgeEdge.create({ data: { sourceId: nodes[0].id, targetId: nodes[5].id, relation: 'dependsOn', weight: 1.0 } }),
    db.knowledgeEdge.create({ data: { sourceId: nodes[6].id, targetId: nodes[0].id, relation: 'improves', weight: 0.85 } }),
    db.knowledgeEdge.create({ data: { sourceId: nodes[7].id, targetId: nodes[1].id, relation: 'improves', weight: 0.75 } }),
    db.knowledgeEdge.create({ data: { sourceId: nodes[4].id, targetId: nodes[7].id, relation: 'connectedTo', weight: 0.5 } }),
    db.knowledgeEdge.create({ data: { sourceId: nodes[2].id, targetId: nodes[6].id, relation: 'connectedTo', weight: 0.65 } }),
    db.knowledgeEdge.create({ data: { sourceId: nodes[5].id, targetId: nodes[0].id, relation: 'connectedTo', weight: 0.9 } }),
  ])

  // Create evolution events
  await Promise.all([
    db.evolutionEvent.create({
      data: {
        agentId: agents[4].id,
        type: 'prompt',
        title: 'Planning Prompt Optimization v3.2',
        description: 'Optimized the planning prompt to include explicit step decomposition and priority scoring. This reduced planning errors by 35% in test runs.',
        status: 'deployed',
        beforeState: JSON.stringify({ promptVersion: '3.1', avgSteps: 8.2, errorRate: 0.18 }),
        afterState: JSON.stringify({ promptVersion: '3.2', avgSteps: 5.7, errorRate: 0.12 }),
        metrics: JSON.stringify({ accuracy: 0.84, efficiency: 0.91, userSatisfaction: 0.88 }),
        improvementPercent: 35,
        riskLevel: 'low',
        approvedBy: 'human-admin',
        validatedAt: new Date(Date.now() - 86400000 * 2),
        deployedAt: new Date(Date.now() - 86400000),
      }
    }),
    db.evolutionEvent.create({
      data: {
        agentId: agents[4].id,
        type: 'workflow',
        title: 'Agent Chain Optimization: Research Pipeline',
        description: 'Restructured the research pipeline from sequential to parallel execution where possible, reducing average completion time by 42%.',
        status: 'deployed',
        beforeState: JSON.stringify({ pipelineType: 'sequential', avgTime: 45, successRate: 0.72 }),
        afterState: JSON.stringify({ pipelineType: 'hybrid-parallel', avgTime: 26, successRate: 0.78 }),
        metrics: JSON.stringify({ speedImprovement: 0.42, accuracyMaintained: true }),
        improvementPercent: 42,
        riskLevel: 'medium',
        approvedBy: 'human-admin',
        validatedAt: new Date(Date.now() - 86400000 * 5),
        deployedAt: new Date(Date.now() - 86400000 * 4),
      }
    }),
    db.evolutionEvent.create({
      data: {
        agentId: agents[4].id,
        type: 'architecture',
        title: 'New Agent Type: Quality Assurance Specialist',
        description: 'Proposed a new specialized QA agent that focuses on edge cases and boundary conditions that general evaluation agents miss.',
        status: 'testing',
        beforeState: JSON.stringify({ agentTypes: 6, edgeCaseCoverage: 0.65 }),
        afterState: JSON.stringify({ agentTypes: 7, edgeCaseCoverage: 0.83 }),
        metrics: JSON.stringify({ edgeCaseDetection: 0.83, falsePositiveRate: 0.08 }),
        improvementPercent: 28,
        riskLevel: 'medium',
      }
    }),
    db.evolutionEvent.create({
      data: {
        type: 'tool',
        title: 'Auto-generated API Integration Tool',
        description: 'System generated a new tool that automatically creates API integration wrappers from OpenAPI specs, reducing integration time from hours to minutes.',
        status: 'validated',
        beforeState: JSON.stringify({ manualIntegration: true, avgTime: 120 }),
        afterState: JSON.stringify({ autoIntegration: true, avgTime: 8 }),
        metrics: JSON.stringify({ timeReduction: 0.93, accuracy: 0.91 }),
        improvementPercent: 93,
        riskLevel: 'high',
        approvedBy: 'human-admin',
        validatedAt: new Date(Date.now() - 86400000),
      }
    }),
    db.evolutionEvent.create({
      data: {
        agentId: agents[4].id,
        type: 'prompt',
        title: 'Code Review Prompt Enhancement',
        description: 'Attempted to optimize code review prompts using aggressive mutation strategies.',
        status: 'rejected',
        beforeState: JSON.stringify({ promptVersion: '2.1', reviewAccuracy: 0.88 }),
        afterState: JSON.stringify({ promptVersion: '2.2-mutated', reviewAccuracy: 0.72 }),
        metrics: JSON.stringify({ regression: 0.16, safetyViolation: true }),
        improvementPercent: -18,
        riskLevel: 'critical',
      }
    }),
  ])

  // Create benchmarks
  await Promise.all([
    db.benchmark.create({ data: { name: 'HumanEval', category: 'coding', score: 89.2, maxScore: 100, previousScore: 85.7, version: 3, details: JSON.stringify({ "pass@1": 0.892, "pass@10": 0.956 }) } }),
    db.benchmark.create({ data: { name: 'GSM8K', category: 'math', score: 78.5, maxScore: 100, previousScore: 74.2, version: 3, details: JSON.stringify({ accuracy: 0.785, avgSteps: 4.2 }) } }),
    db.benchmark.create({ data: { name: 'MMLU', category: 'reasoning', score: 82.1, maxScore: 100, previousScore: 79.8, version: 3, details: JSON.stringify({ stem: 0.85, humanities: 0.78, social: 0.83 }) } }),
    db.benchmark.create({ data: { name: 'AgentBench', category: 'agent', score: 71.3, maxScore: 100, previousScore: 68.9, version: 2, details: JSON.stringify({ web: 0.82, os: 0.65, db: 0.67 }) } }),
    db.benchmark.create({ data: { name: 'PlanBench', category: 'planning', score: 76.8, maxScore: 100, previousScore: 73.1, version: 2, details: JSON.stringify({ simple: 0.92, moderate: 0.78, complex: 0.6 }) } }),
    db.benchmark.create({ data: { name: 'ToolBench', category: 'tool_use', score: 68.4, maxScore: 100, previousScore: 65.2, version: 2, details: JSON.stringify({ singleTool: 0.89, multiTool: 0.62, novel: 0.54 }) } }),
    db.benchmark.create({ data: { name: 'ResearchBench', category: 'research', score: 74.2, maxScore: 100, previousScore: 70.5, version: 1, details: JSON.stringify({ hypothesis: 0.82, experiment: 0.71, analysis: 0.7 }) } }),
  ])

  // Create safety events
  await Promise.all([
    db.safetyEvent.create({
      data: {
        type: 'policy_violation',
        severity: 'warning',
        description: 'Evolution Agent attempted to modify safety validation threshold from 0.95 to 0.89. Change was blocked automatically.',
        agentId: agents[4].id,
        resolved: true,
        resolvedBy: 'Sentinel',
        metadata: JSON.stringify({ attemptedChange: 'safety_threshold', blockedBy: 'constitutional_rule_3' }),
        resolvedAt: new Date(Date.now() - 86400000 * 3),
      }
    }),
    db.safetyEvent.create({
      data: {
        type: 'hallucination',
        severity: 'warning',
        description: 'Research Agent produced a citation to a non-existent paper. Hallucination detected by cross-reference validation.',
        agentId: agents[0].id,
        resolved: true,
        resolvedBy: 'Evalyn',
        metadata: JSON.stringify({ citation: 'fake_paper_2024', confidence: 0.72 }),
        resolvedAt: new Date(Date.now() - 86400000),
      }
    }),
    db.safetyEvent.create({
      data: {
        type: 'constitutional_breach',
        severity: 'critical',
        description: 'Code Review Prompt Enhancement evolution attempted to bypass validation pipeline. Automatically rejected and flagged.',
        resolved: true,
        resolvedBy: 'Sentinel',
        metadata: JSON.stringify({ evolutionId: 'rejected', bypassAttempt: 'validation_skip' }),
        resolvedAt: new Date(Date.now() - 86400000 * 2),
      }
    }),
    db.safetyEvent.create({
      data: {
        type: 'unauthorized_access',
        severity: 'info',
        description: 'Deployment Agent attempted to access production environment during testing phase. Access denied by role-based policy.',
        agentId: agents[6].id,
        resolved: true,
        resolvedBy: 'system',
        metadata: JSON.stringify({ target: 'production', phase: 'testing' }),
        resolvedAt: new Date(Date.now() - 86400000 * 4),
      }
    }),
  ])

  // Create experiments
  await Promise.all([
    db.experiment.create({
      data: {
        agentId: agents[4].id,
        title: 'Hybrid Reasoning Strategy',
        hypothesis: 'Combining chain-of-thought with tree-of-thought reasoning will improve complex problem-solving by 15-25%.',
        methodology: 'Run 500 problems from MMLU and GSM8K using both strategies independently and in combination. Measure accuracy, time, and token usage.',
        status: 'completed',
        results: JSON.stringify({ cotAccuracy: 0.78, totAccuracy: 0.74, hybridAccuracy: 0.86, timeOverhead: 0.12 }),
        conclusion: 'Hybrid approach shows 18% improvement over CoT alone with only 12% time overhead. Recommend deployment.',
        score: 0.86,
        completedAt: new Date(Date.now() - 86400000 * 6),
      }
    }),
    db.experiment.create({
      data: {
        agentId: agents[4].id,
        title: 'Dynamic Agent Pool Sizing',
        hypothesis: 'Dynamically adjusting the number of active agents based on workload will reduce resource consumption by 30% without degrading performance.',
        methodology: 'Implement adaptive scaling algorithm, measure resource usage and task completion rates over 1000 tasks.',
        status: 'running',
        results: JSON.stringify({ tasksCompleted: 674, resourceReduction: 0.28, performanceImpact: -0.02 }),
      }
    }),
    db.experiment.create({
      data: {
        agentId: agents[0].id,
        title: 'Self-Supervised Knowledge Extraction',
        hypothesis: 'Unstructured interaction logs contain extractable knowledge that can improve system performance.',
        methodology: 'Apply NLP extraction pipeline to 10000 interaction logs, validate extracted knowledge against ground truth.',
        status: 'draft',
      }
    }),
  ])

  // Create constitutional rules
  await Promise.all([
    db.constitutionalRule.create({ data: { rule: 'Safety systems cannot be removed or disabled', description: 'The safety validation and monitoring systems are permanent and cannot be bypassed, disabled, or removed by any agent or evolution process.' } }),
    db.constitutionalRule.create({ data: { rule: 'Evaluation systems cannot be modified by evolution', description: 'The evaluation and benchmarking systems must remain independent and cannot be modified through the evolution pipeline.' } }),
    db.constitutionalRule.create({ data: { rule: 'Validation pipeline must not be bypassed', description: 'All changes must pass through the complete validation pipeline before deployment. No shortcuts or exceptions are permitted.' } }),
    db.constitutionalRule.create({ data: { rule: 'Unauthorized resource access is forbidden', description: 'Agents cannot access resources, APIs, or data stores beyond their explicitly assigned permissions.' } }),
    db.constitutionalRule.create({ data: { rule: 'Self-replication is controlled', description: 'The system cannot create copies of itself or spawn new instances without explicit human approval and resource allocation.' } }),
    db.constitutionalRule.create({ data: { rule: 'Human override always takes priority', description: 'Any human-initiated override or command takes absolute priority over autonomous decisions and cannot be deferred or ignored.' } }),
  ])

  // Create system metrics (last 24 hours, hourly)
  const now = Date.now()
  const metrics = []
  for (let i = 23; i >= 0; i--) {
    const timestamp = new Date(now - i * 3600000)
    metrics.push(
      { metric: 'cpu_usage', value: 30 + Math.random() * 40, unit: '%', timestamp },
      { metric: 'memory_usage', value: 40 + Math.random() * 30, unit: '%', timestamp },
      { metric: 'task_success_rate', value: 0.75 + Math.random() * 0.2, unit: 'ratio', timestamp },
      { metric: 'token_usage', value: 50000 + Math.random() * 100000, unit: 'tokens', timestamp },
      { metric: 'active_agents', value: 4 + Math.floor(Math.random() * 4), unit: 'count', timestamp },
      { metric: 'cost', value: 0.5 + Math.random() * 2, unit: 'USD', timestamp },
    )
  }
  await db.systemMetric.createMany({ data: metrics })

  console.log('Seed completed successfully!')
  console.log(`Created ${agents.length} agents, knowledge nodes, evolution events, benchmarks, safety events, experiments, constitutional rules, and system metrics.`)
}

seed()
  .catch(console.error)
  .finally(() => process.exit())
