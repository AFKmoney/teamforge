/**
 * AI Provider System for TeamForge IDE
 *
 * Supports multiple AI backends:
 * - zai: Default provider using z-ai-web-dev-sdk (deepseek-chat)
 * - nvidia: NVIDIA NIM API (OpenAI-compatible format)
 * - openai-compatible: Any OpenAI-compatible API endpoint
 */

// ===== Provider Types =====

export type AIProviderType = 'zai' | 'nvidia' | 'openai-compatible'

export interface AIModel {
  id: string
  name: string
  provider: AIProviderType
  description?: string
}

export interface AIProviderConfig {
  type: AIProviderType
  label: string
  description: string
  baseUrl: string
  requiresApiKey: boolean
  apiKeyPrefix?: string
  models: AIModel[]
}

// ===== Provider Definitions =====

export const AI_PROVIDERS: AIProviderConfig[] = [
  {
    type: 'zai',
    label: 'Z-AI (Default)',
    description: 'Built-in AI provider using z-ai-web-dev-sdk. No API key needed.',
    baseUrl: '',
    requiresApiKey: false,
    models: [
      {
        id: 'deepseek-chat',
        name: 'DeepSeek Chat',
        provider: 'zai',
        description: 'Default model — fast and capable',
      },
    ],
  },
  {
    type: 'nvidia',
    label: 'NVIDIA NIM',
    description: 'NVIDIA NIM API — 80+ free models via build.nvidia.com. OpenAI-compatible format. Requires nvapi-... key.',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    requiresApiKey: true,
    apiKeyPrefix: 'nvapi-',
    models: [
      // ============================
      // Meta Llama Family
      // ============================
      { id: 'meta/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'nvidia', description: 'Meta\'s latest 70B instruct, top-tier reasoning + tool calling' },
      { id: 'meta/llama-3.1-405b-instruct', name: 'Llama 3.1 405B', provider: 'nvidia', description: 'Meta\'s largest open model, exceptional quality' },
      { id: 'meta/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'nvidia', description: 'Balanced performance and speed, tool calling' },
      { id: 'meta/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', provider: 'nvidia', description: 'Fast lightweight, tool calling support' },
      { id: 'meta/llama-3.2-1b-instruct', name: 'Llama 3.2 1B', provider: 'nvidia', description: 'Ultra-fast tiny model for basic tasks' },
      { id: 'meta/llama-3.2-3b-instruct', name: 'Llama 3.2 3B', provider: 'nvidia', description: 'Small model, fast responses' },
      { id: 'meta/llama-3.2-11b-vision-instruct', name: 'Llama 3.2 11B Vision', provider: 'nvidia', description: 'Multimodal — image + text understanding' },
      { id: 'meta/llama-3.2-90b-vision-instruct', name: 'Llama 3.2 90B Vision', provider: 'nvidia', description: 'Multimodal — advanced image understanding' },
      // ============================
      // NVIDIA Nemotron Family
      // ============================
      { id: 'nvidia/llama-3.3-nemotron-super-49b-v1.5', name: 'Nemotron Super 49B v1.5', provider: 'nvidia', description: 'Reasoning model, excels at agentic tasks, RAG, tool calling' },
      { id: 'nvidia/llama-3.3-nemotron-super-49b-v1', name: 'Nemotron Super 49B v1', provider: 'nvidia', description: 'NVIDIA reasoning model for agentic tasks' },
      { id: 'nvidia/llama-3.1-nemotron-70b-instruct', name: 'Nemotron 70B', provider: 'nvidia', description: 'NVIDIA fine-tuned Llama for helpfulness' },
      { id: 'nvidia/llama-3.1-nemotron-ultra-253b-v1', name: 'Nemotron Ultra 253B', provider: 'nvidia', description: 'NVIDIA\'s largest Nemotron, tool calling + reasoning' },
      { id: 'nvidia/llama-3.1-nemotron-nano-8b-v1', name: 'Nemotron Nano 8B v1', provider: 'nvidia', description: 'Compact Nemotron, tool calling support' },
      { id: 'nvidia/llama3.1-nemotron-nano-4b-v1.1', name: 'Nemotron Nano 4B v1.1', provider: 'nvidia', description: 'Ultra-compact, LoRA + tool calling' },
      { id: 'nvidia/nvidia-nemotron-nano-9b-v2', name: 'Nemotron Nano 9B v2', provider: 'nvidia', description: 'Compact reasoning and chat model, tool calling' },
      { id: 'nvidia/nemotron-3-super-120b-a12b', name: 'Nemotron 3 Super 120B', provider: 'nvidia', description: 'LatentMoE architecture, tool calling + reasoning' },
      { id: 'nvidia/nemotron-3-nano', name: 'Nemotron 3 Nano', provider: 'nvidia', description: 'NVIDIA reasoning nano model' },
      { id: 'nvidia/nemotron-4-340b-instruct', name: 'Nemotron 4 340B Instruct', provider: 'nvidia', description: 'Massive instruct model' },
      { id: 'nvidia/nemotron-4-340b-reward', name: 'Nemotron 4 340B Reward', provider: 'nvidia', description: 'Reward model for alignment' },
      // ============================
      // DeepSeek Family
      // ============================
      { id: 'deepseek-ai/deepseek-r1', name: 'DeepSeek R1', provider: 'nvidia', description: 'Advanced chain-of-thought reasoning' },
      { id: 'deepseek-ai/deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill 70B', provider: 'nvidia', description: 'Distilled reasoning in Llama format' },
      { id: 'deepseek-ai/deepseek-r1-distill-llama-8b', name: 'DeepSeek R1 Distill 8B', provider: 'nvidia', description: 'Distilled reasoning, compact Llama' },
      { id: 'deepseek-ai/deepseek-r1-distill-qwen-32b', name: 'DeepSeek R1 Distill Qwen 32B', provider: 'nvidia', description: 'Distilled reasoning in Qwen format' },
      { id: 'deepseek-ai/deepseek-v3.1-terminus', name: 'DeepSeek V3.1 Terminus', provider: 'nvidia', description: 'Latest DeepSeek V3.1, tool calling + parallel tools' },
      { id: 'deepseek-ai/deepseek-v32-exp-nim', name: 'DeepSeek V3.2 Exp', provider: 'nvidia', description: 'Experimental DeepSeek V3.2, tool calling' },
      { id: 'deepseek-ai/deepseek-v4-flash', name: 'DeepSeek V4 Flash', provider: 'nvidia', description: 'DeepSeek V4 fast variant, tool calling' },
      { id: 'deepseek-ai/deepseek-v4-pro', name: 'DeepSeek V4 Pro', provider: 'nvidia', description: 'DeepSeek V4 premium variant, tool calling' },
      { id: 'deepseek-ai/deepseek-coder-v2-lite-instruct', name: 'DeepSeek Coder V2 Lite', provider: 'nvidia', description: 'Code-specialized model' },
      // ============================
      // Mistral Family
      // ============================
      { id: 'mistralai/mistral-7b-instruct-v0.3', name: 'Mistral 7B v0.3', provider: 'nvidia', description: 'Fast lightweight, LoRA + tool calling' },
      { id: 'mistralai/mistral-small-24b-instruct-2501', name: 'Mistral Small 24B', provider: 'nvidia', description: 'Balanced size and quality' },
      { id: 'mistralai/mixtral-8x7b-instruct-v0.1', name: 'Mixtral 8x7B', provider: 'nvidia', description: 'MoE model, efficient inference' },
      { id: 'mistralai/mixtral-8x22b-instruct-v0.1', name: 'Mixtral 8x22B', provider: 'nvidia', description: 'MoE, efficient and powerful' },
      { id: 'nv-mistralai/mistral-nemo-12b-instruct', name: 'Mistral NeMo 12B', provider: 'nvidia', description: 'NVIDIA-optimized Mistral NeMo' },
      // ============================
      // Qwen Family (Alibaba)
      // ============================
      { id: 'qwen/qwen3-32b', name: 'Qwen 3 32B', provider: 'nvidia', description: 'Latest Qwen 3, tool calling support' },
      { id: 'qwen/qwen3-coder-next', name: 'Qwen 3 Coder Next', provider: 'nvidia', description: 'Qwen 3 coding specialist, tool calling' },
      { id: 'qwen/qwen3-next-80b-a3b-instruct', name: 'Qwen 3 Next 80B MoE', provider: 'nvidia', description: 'MoE architecture, tool + parallel calling' },
      { id: 'qwen/qwen3-next-80b-a3b-thinking', name: 'Qwen 3 Next 80B Thinking', provider: 'nvidia', description: 'Qwen 3 thinking/reasoning model' },
      { id: 'qwen/qwen2.5-coder-32b-instruct', name: 'Qwen 2.5 Coder 32B', provider: 'nvidia', description: 'Specialized coding model' },
      { id: 'qwen/qwen-2.5-7b-instruct', name: 'Qwen 2.5 7B', provider: 'nvidia', description: 'Compact multilingual model' },
      // ============================
      // Google Gemma Family
      // ============================
      { id: 'google/gemma-3-1b-it', name: 'Gemma 3 1B', provider: 'nvidia', description: 'Google Gemma 3 ultra-compact, tool calling' },
      { id: 'google/gemma-2-27b-it', name: 'Gemma 2 27B', provider: 'nvidia', description: 'Google instruction-tuned, balanced' },
      { id: 'google/gemma-2-9b-it', name: 'Gemma 2 9B', provider: 'nvidia', description: 'Google compact instruction model' },
      { id: 'google/gemma-2-2b-instruct', name: 'Gemma 2 2B', provider: 'nvidia', description: 'Google ultra-lightweight instruction' },
      // ============================
      // Microsoft Phi Family
      // ============================
      { id: 'microsoft/phi-4-mini-instruct', name: 'Phi-4 Mini', provider: 'nvidia', description: 'Microsoft compact reasoning, tool calling' },
      { id: 'microsoft/phi-3-mini-4k-instruct', name: 'Phi-3 Mini 4K', provider: 'nvidia', description: 'Microsoft compact model, 4K context' },
      // ============================
      // GLM Family (Zhipu AI / zai-org)
      // ============================
      { id: 'zai-org/glm-51', name: 'GLM-5.1', provider: 'nvidia', description: 'Zhipu AI flagship, tool + parallel calling' },
      { id: 'zai-org/glm-5', name: 'GLM-5', provider: 'nvidia', description: 'Zhipu AI model, tool + parallel calling' },
      // ============================
      // OpenAI GPT-OSS
      // ============================
      { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B', provider: 'nvidia', description: 'OpenAI open-source 120B, LoRA + tool calling' },
      { id: 'openai/gpt-oss-20b', name: 'GPT-OSS 20B', provider: 'nvidia', description: 'OpenAI open-source 20B, LoRA + tool calling' },
      // ============================
      // MiniMax Family
      // ============================
      { id: 'minimax-ai/minimax-m27', name: 'MiniMax M2.7', provider: 'nvidia', description: 'MiniMax flagship, tool + parallel calling' },
      { id: 'minimax-ai/minimax-m25', name: 'MiniMax M2.5', provider: 'nvidia', description: 'MiniMax advanced, tool + parallel calling' },
      // ============================
      // Moonshot (Kimi) Family
      // ============================
      { id: 'moonshotai/kimi-k2-thinking', name: 'Kimi K2 Thinking', provider: 'nvidia', description: 'Moonshot reasoning model' },
      // ============================
      // Xiaomi MiMo
      // ============================
      { id: 'xiaomi/mimo-v2-flash-experimental', name: 'MiMo V2 Flash', provider: 'nvidia', description: 'Xiaomi model, tool + parallel calling' },
      // ============================
      // IBM Granite
      // ============================
      { id: 'ibm-granite/granite-3.3-8b-instruct', name: 'Granite 3.3 8B', provider: 'nvidia', description: 'IBM enterprise model, latest generation' },
      // ============================
      // Snowflake
      // ============================
      { id: 'snowflake/snowflake-arctic-instruct', name: 'Snowflake Arctic', provider: 'nvidia', description: 'Enterprise-grade model' },
      // ============================
      // Sarvam AI (Multilingual)
      // ============================
      { id: 'sarvamai/sarvam-m', name: 'Sarvam-M', provider: 'nvidia', description: 'Indian multilingual model' },
      // ============================
      // SILMA AI
      // ============================
      { id: 'silma-ai/silma-9b-instruct-v1.0', name: 'SILMA 9B', provider: 'nvidia', description: 'Arabic-English bilingual model' },
      // ============================
      // BigCode StarCoder
      // ============================
      { id: 'bigcode/starcoder2-7b', name: 'StarCoder2 7B', provider: 'nvidia', description: 'Code generation model' },
      // ============================
      // GreenNode
      // ============================
      { id: 'greennode/greenmind-medium-14b-r1', name: 'GreenMind 14B R1', provider: 'nvidia', description: 'GreenNode reasoning model' },
      // ============================
      // Stockmark (Japanese)
      // ============================
      { id: 'stockmark/stockmark-2-100b-instruct', name: 'Stockmark 2 100B', provider: 'nvidia', description: 'Japanese-focused 100B model, LoRA' },
      // ============================
      // Kakao Kanana (Korean)
      // ============================
      { id: 'kakaocorp/kanana-1.5-8b-instruct-2505', name: 'Kanana 1.5 8B', provider: 'nvidia', description: 'Korean-focused model, tool calling' },
      // ============================
      // SCB 10X Typhoon (Thai)
      // ============================
      { id: 'scb10x/llama3.1-typhoon2-8b-instruct', name: 'Typhoon 2 8B', provider: 'nvidia', description: 'Thai-focused Llama, LoRA + tool calling' },
      { id: 'scb10x/llama-3.1-typhoon2-70b-instruct', name: 'Typhoon 2 70B', provider: 'nvidia', description: 'Thai-focused Llama 70B, LoRA + tool calling' },
      // ============================
      // SpeakLeash Bielik (Polish)
      // ============================
      { id: 'speakleash/bielik-11b-v2.3-instruct', name: 'Bielik 11B v2.3', provider: 'nvidia', description: 'Polish-focused model' },
      // ============================
      // UTTER Project EuroLLM
      // ============================
      { id: 'utter-project/eurollm-9b-instruct', name: 'EuroLLM 9B', provider: 'nvidia', description: 'European multilingual model' },
      // ============================
      // GoToCompany Sahabat-AI (Indonesian)
      // ============================
      { id: 'gotocompany/gemma2-9b-cpt-sahabatai-v1-instruct', name: 'Sahabat-AI 9B', provider: 'nvidia', description: 'Indonesian-focused Gemma, LoRA' },
      // ============================
      // OpenGPT-X Teuken (European)
      // ============================
      { id: 'opengpt-x/teuken-7b-instruct-commercial-v0.4', name: 'Teuken 7B', provider: 'nvidia', description: 'European commercial model' },
      // ============================
      // Defog SQLCoder
      // ============================
      { id: 'defog/llama-3-sqlcoder-8b', name: 'SQLCoder 8B', provider: 'nvidia', description: 'SQL generation specialist' },
      // ============================
      // NVIDIA Riva Translate
      // ============================
      { id: 'nvidia/riva-translate-4b-instruct-v1.1', name: 'Riva Translate 4B', provider: 'nvidia', description: 'NVIDIA translation model' },
    ],
  },
  {
    type: 'openai-compatible',
    label: 'OpenAI-Compatible',
    description: 'Any OpenAI-compatible API endpoint (e.g., Ollama, LM Studio, vLLM).',
    baseUrl: '',
    requiresApiKey: true,
    models: [
      {
        id: 'custom',
        name: 'Custom Model',
        provider: 'openai-compatible',
        description: 'Specify model name in settings',
      },
    ],
  },
]

// ===== Utility Functions =====

/** Get a flat list of all available models across all providers */
export function getAllModels(): AIModel[] {
  return AI_PROVIDERS.flatMap((p) => p.models)
}

/** Get provider config by type */
export function getProviderConfig(type: AIProviderType): AIProviderConfig | undefined {
  return AI_PROVIDERS.find((p) => p.type === type)
}

/** Get models for a specific provider */
export function getModelsForProvider(type: AIProviderType): AIModel[] {
  const provider = getProviderConfig(type)
  return provider?.models ?? []
}

/** Get the default model for a provider */
export function getDefaultModel(provider: AIProviderType): string {
  const models = getModelsForProvider(provider)
  return models[0]?.id ?? 'deepseek-chat'
}

/** Validate an NVIDIA API key format */
export function validateNvidiaApiKey(key: string): { valid: boolean; message: string } {
  if (!key.trim()) {
    return { valid: false, message: 'API key is required' }
  }
  if (!key.startsWith('nvapi-')) {
    return { valid: false, message: 'NVIDIA API keys should start with "nvapi-"' }
  }
  if (key.length < 20) {
    return { valid: false, message: 'API key appears too short' }
  }
  return { valid: true, message: 'API key format looks valid' }
}

/** Validate an OpenAI-compatible base URL */
export function validateBaseUrl(url: string): { valid: boolean; message: string } {
  if (!url.trim()) {
    return { valid: false, message: 'Base URL is required' }
  }
  try {
    new URL(url)
    return { valid: true, message: 'Valid URL format' }
  } catch {
    return { valid: false, message: 'Invalid URL format' }
  }
}

/** Validate an OpenAI-compatible API key format */
export function validateOpenAIApiKey(key: string): { valid: boolean; message: string } {
  if (!key.trim()) {
    return { valid: false, message: 'API key is empty' }
  }
  if (key.length < 8) {
    return { valid: false, message: 'API key appears too short' }
  }
  if (key.startsWith('sk-')) {
    return { valid: true, message: 'Looks like an OpenAI key format' }
  }
  // Accept any reasonably long key
  return { valid: true, message: 'API key format looks valid' }
}

/** Build the request for NVIDIA NIM API */
export function buildNvidiaRequest(
  model: string,
  messages: { role: string; content: string }[],
  apiKey: string,
) {
  return {
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    options: {
      method: 'POST' as const,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
        stream: false,
      }),
    },
  }
}

/** Build the request for an OpenAI-compatible API */
export function buildOpenAICompatibleRequest(
  baseUrl: string,
  model: string,
  messages: { role: string; content: string }[],
  apiKey?: string,
) {
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }
  return {
    url,
    options: {
      method: 'POST' as const,
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
        stream: false,
      }),
    },
  }
}

/** Settings key for localStorage */
export const AI_SETTINGS_KEY = 'teamforge-ide-ai-settings'

export interface AISettings {
  provider: AIProviderType
  model: string
  nvidiaApiKey: string
  openaiCompatibleBaseUrl: string
  openaiCompatibleApiKey: string
  openaiCompatibleModelId: string
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'zai',
  model: 'deepseek-chat',
  nvidiaApiKey: '',
  openaiCompatibleBaseUrl: '',
  openaiCompatibleApiKey: '',
  openaiCompatibleModelId: 'custom',
}

/** Load AI settings from localStorage */
export function loadAISettings(): AISettings {
  if (typeof window === 'undefined') return DEFAULT_AI_SETTINGS
  try {
    const stored = localStorage.getItem(AI_SETTINGS_KEY)
    if (stored) return { ...DEFAULT_AI_SETTINGS, ...JSON.parse(stored) }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_AI_SETTINGS
}

/** Save AI settings to localStorage */
export function saveAISettings(settings: AISettings): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // ignore storage errors
  }
}
