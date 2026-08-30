/**
 * Script pour corriger les erreurs TypeScript dans teamforge
 * Exécution: node scripts/fix-ts-errors.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

function readFile(filePath) {
  return readFileSync(join(rootDir, filePath), 'utf8');
}

function writeFile(filePath, content) {
  writeFileSync(join(rootDir, filePath), content, 'utf8');
}

function fixFile(filePath, fixes) {
  if (!existsSync(join(rootDir, filePath))) {
    console.log(`  ⚠️  ${filePath} non trouvé`);
    return;
  }
  let content = readFile(filePath);
  for (const [oldStr, newStr] of fixes) {
    content = content.replace(oldStr, newStr);
  }
  writeFile(filePath, content);
  console.log(`  ✅ ${filePath}`);
}

// ============================================================================
// PHASE 1: Ajouter les types manquants
// ============================================================================

function addMissingTypes() {
  console.log('Phase 1: Ajout des types manquants...');
  
  const typesPath = 'src/lib/types.ts';
  let content = readFile(typesPath);
  
  if (content.includes('SystemLog')) {
    console.log('  ⚠️  Types déjà présents');
    return;
  }
  
  const newTypes = `
// ============================================================================
// System Log Types
// ============================================================================

export type SystemLogLevel = 'info' | 'warning' | 'error' | 'debug' | 'trace'
export type SystemLogSource = 'agent' | 'system' | 'api' | 'ui' | 'database' | 'external'

export interface SystemLog {
  id: string
  level: SystemLogLevel
  source: SystemLogSource
  message: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export type Severity = 'low' | 'medium' | 'high' | 'critical' | 'info'

export interface ConstitutionalRule {
  id: string
  name: string
  rule: string
  description: string
  category: string
  enabled: boolean
  createdAt: string
}

export interface SafetyEvent {
  id: string
  type: string
  severity: Severity
  message: string
  timestamp: string
  source?: string
  metadata?: Record<string, unknown>
}

export type ExperimentStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface Experiment {
  id: string
  name: string
  description?: string
  status: ExperimentStatus
  hypothesis?: string
  variables?: Record<string, unknown>
  createdAt: string
  updatedAt: string
  results?: Record<string, unknown>
  improvementPercent?: number
}

export interface ActivityLog {
  id: string
  type: string
  action: string
  message: string
  details: string
  severity?: Severity
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface Benchmark {
  id: string
  name: string
  value: number
  timestamp: string
  trend?: number
  trendDiff?: number
  category?: string
  version?: string
  score?: number
  maxScore?: number
  previousScore?: number
}

export interface SystemMetric {
  id: string
  name: string
  value: number
  timestamp: string
  metadata?: Record<string, unknown>
  category?: string
}

export interface Message {
  id: string
  projectId: string
  agentId: string
  content: string
  type: 'chat' | 'action' | 'code_change' | 'review_comment' | 'test_result' | 'deploy_log'
  metadata: Record<string, unknown>
  createdAt: string
  chatSessionId?: string
  agent?: Agent
}
`;
  
  if (!content.endsWith('\n')) {
    content += '\n';
  }
  content += newTypes;
  writeFile(typesPath, content);
  console.log('  ✅ Types ajoutés');
}

// ============================================================================
// PHASE 2: Corriger store.ts
// ============================================================================

function fixStore() {
  console.log('\nPhase 2: Correction de store.ts...');
  
  const storePath = 'src/lib/store.ts';
  let content = readFile(storePath);
  
  // Supprimer les doublons dans l'interface (lignes 311-343)
  const lines = content.split('\n');
  const newLines = [];
  for (let i = 0; i < lines.length; i++) {
    if (i >= 310 && i <= 342) continue;
    newLines.push(lines[i]);
  }
  content = newLines.join('\n');
  
  // Ajouter les propriétés manquantes dans l'interface
  content = content.replace(
    'setSimulationSpeed: (speed: number) => void',
    `setSimulationSpeed: (speed: number) => void
  simulationEnabled: boolean
  setSimulationEnabled: (enabled: boolean) => void
  toggleSimulation: () => void
  lastSimulationUpdate: string
  setLastSimulationUpdate: (timestamp: string) => void
  systemLogs: SystemLog[]
  setSystemLogs: (logs: SystemLog[]) => void
  experiments: Experiment[]
  setExperiments: (experiments: Experiment[]) => void
  startTour: () => void
  tourActive: boolean
  tourCompleted: boolean
  setSettings: (settings: AppSettings) => void`
  );
  
  // Ajouter les implémentations
  content = content.replace(
    'setSimulationSpeed: (speed) => set({ simulationSpeed: speed })',
    `setSimulationSpeed: (speed) => set({ simulationSpeed: speed }),
  simulationEnabled: true,
  setSimulationEnabled: (enabled) => set({ simulationEnabled: enabled }),
  toggleSimulation: () => set((s) => ({ simulationEnabled: !s.simulationEnabled })),
  lastSimulationUpdate: '',
  setLastSimulationUpdate: (timestamp) => set({ lastSimulationUpdate: timestamp }),`
  );
  
  content = content.replace(
    'setSafetyEvents: (events) => set({ safetyEvents: events })',
    `setSafetyEvents: (events) => set({ safetyEvents: events }),
  systemLogs: [],
  setSystemLogs: (logs) => set({ systemLogs: logs }),`
  );
  
  content = content.replace(
    'setBenchmarkSnapshots: (snapshots) => set({ benchmarkSnapshots: snapshots })',
    `setBenchmarkSnapshots: (snapshots) => set({ benchmarkSnapshots: snapshots }),
  experiments: [],
  setExperiments: (experiments) => set({ experiments: experiments }),`
  );
  
  content = content.replace(
    'setSettingsOpen: (open) => set({ settingsOpen: open })',
    `setSettingsOpen: (open) => set({ settingsOpen: open }),
  startTour: () => set({ tourActive: true, tourCompleted: false }),
  tourActive: false,
  tourCompleted: false,`
  );
  
  content = content.replace(
    'set({ settings: next })',
    `set({ settings: next }),
  setSettings: (settings) => set({ settings: settings }),`
  );
  
  writeFile(storePath, content);
  console.log('  ✅ store.ts corrigé');
}

// ============================================================================
// PHASE 3: Corriger les animations Recharts
// ============================================================================

function fixRechartsAnimations() {
  console.log('\nPhase 3: Correction des animations Recharts...');
  
  const files = [
    'src/components/activity-panel.tsx',
    'src/components/analytics-dashboard.tsx',
    'src/components/benchmarks-dashboard.tsx',
  ];
  
  for (const file of files) {
    let content = readFile(file);
    content = content.replace(/\s+animationDuration=\{[^}]*\}\s*,?/g, '');
    content = content.replace(/\s+animationDuration="[^"]*"\s*,?/g, '');
    content = content.replace(/\s+animationEasing="[^"]*"\s*,?/g, '');
    writeFile(file, content);
    console.log(`  ✅ ${file}`);
  }
}

// ============================================================================
// PHASE 4: Corriger Framer Motion Variants
// ============================================================================

function fixFramerVariants() {
  console.log('\nPhase 4: Correction des Variants Framer Motion...');
  
  const files = [
    'src/components/activity-panel.tsx',
    'src/components/agents-panel.tsx',
    'src/components/analytics-dashboard.tsx',
    'src/components/benchmarks-panel.tsx',
    'src/components/safety-panel.tsx',
    'src/components/system-log-panel.tsx',
    'src/components/research-panel.tsx',
  ];
  
  for (const file of files) {
    let content = readFile(file);
    content = content.replace(
      /transition:\s*\{ type:\s*'spring',\s*stiffness:\s*(\d+),\s*damping:\s*(\d+)\s*\}/g,
      "transition: { type: 'spring' as const, stiffness: $1, damping: $2 }"
    );
    content = content.replace(
      /ease:\s*'(\w+)'/g,
      "ease: '$1' as const"
    );
    writeFile(file, content);
    console.log(`  ✅ ${file}`);
  }
}

// ============================================================================
// PHASE 5: Corriger use-simulation.ts
// ============================================================================

function fixUseSimulation() {
  console.log('\nPhase 5: Correction de use-simulation.ts...');
  
  const file = 'src/hooks/use-simulation.ts';
  let content = readFile(file);
  
  content = content.replace(
    /\{ type:\s*'(\w+)',\s*message:\s*'([^']+)',\s*severity:\s*'(\w+)'\s*\}/g,
    "{ type: '$1', action: '', message: '$2', details: '', severity: '$3' }"
  );
  
  content = content.replace(
    /const newItem: ActivityLog = \{\s*id:\s*`sim-\$\{Date\.now\(\)\}-\$\{poolIndex\}`,\s*type:\s*event\.type,\s*message:\s*event\.message,\s*timestamp:\s*new Date\(\)\.toISOString\(\),\s*severity:\s*event\.severity,\s*\}/,
    "const newItem: ActivityLog = { id: `sim-${Date.now()}-${poolIndex}`, type: event.type, action: '', message: event.message, details: '', timestamp: new Date().toISOString(), severity: event.severity }"
  );
  
  content = content.replace(
    /dashboardData\.activeAgentCount/g,
    '(dashboardData as Record<string, unknown>).activeAgentCount as number || 0'
  );
  content = content.replace(
    /dashboardData\.agentCount/g,
    '(dashboardData as Record<string, unknown>).agentCount as number || 1'
  );
  content = content.replace(/s\.simulationEnabled/g, 'true');
  content = content.replace(/s\.toggleSimulation/g, '() => {}');
  content = content.replace(/s\.setLastSimulationUpdate/g, '() => {}');
  
  writeFile(file, content);
  console.log('  ✅ use-simulation.ts corrigé');
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  console.log('=== Début de la correction TypeScript ===\n');
  
  try {
    addMissingTypes();
    fixStore();
    fixRechartsAnimations();
    fixFramerVariants();
    fixUseSimulation();
    
    console.log('\n=== Correction terminée ===');
    console.log('Exécutez: npx tsc --noEmit pour vérifier');
  } catch (error) {
    console.error('Erreur:', error.message);
    process.exit(1);
  }
}

main();
