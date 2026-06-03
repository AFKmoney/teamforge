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
    description: 'NVIDIA NIM API with OpenAI-compatible format. 32 free models. Requires nvapi-... key.',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    requiresApiKey: true,
    apiKeyPrefix: 'nvapi-',
    models: [
      // === Meta Llama ===
      {
        id: 'meta/llama-3.3-70b-instruct',
        name: 'Llama 3.3 70B',
        provider: 'nvidia',
        description: 'Meta\'s latest 70B instruct model, top-tier reasoning',
      },
      {
        id: 'meta/llama-3.1-405b-instruct',
        name: 'Llama 3.1 405B',
        provider: 'nvidia',
        description: 'Meta\'s largest open model, exceptional quality',
      },
      {
        id: 'meta/llama-3.1-70b-instruct',
        name: 'Llama 3.1 70B',
        provider: 'nvidia',
        description: 'Balanced performance and speed',
      },
      {
        id: 'meta/llama-3.1-8b-instruct',
        name: 'Llama 3.1 8B',
        provider: 'nvidia',
        description: 'Fast lightweight model for simple tasks',
      },
      {
        id: 'meta/llama-3.2-1b-instruct',
        name: 'Llama 3.2 1B',
        provider: 'nvidia',
        description: 'Ultra-fast tiny model for basic tasks',
      },
      {
        id: 'meta/llama-3.2-3b-instruct',
        name: 'Llama 3.2 3B',
        provider: 'nvidia',
        description: 'Small model, fast responses',
      },
      {
        id: 'meta/llama-3.2-11b-vision-instruct',
        name: 'Llama 3.2 11B Vision',
        provider: 'nvidia',
        description: 'Multimodal — image + text understanding',
      },
      {
        id: 'meta/llama-3.2-90b-vision-instruct',
        name: 'Llama 3.2 90B Vision',
        provider: 'nvidia',
        description: 'Multimodal — advanced image understanding',
      },
      // === NVIDIA Nemotron ===
      {
        id: 'nvidia/llama-3.3-nemotron-super-49b-v1.5',
        name: 'Nemotron Super 49B v1.5',
        provider: 'nvidia',
        description: 'NVIDIA reasoning model, excels at agentic tasks & RAG',
      },
      {
        id: 'nvidia/llama-3.1-nemotron-70b-instruct',
        name: 'Nemotron 70B',
        provider: 'nvidia',
        description: 'NVIDIA fine-tuned Llama for instruction following',
      },
      {
        id: 'nvidia/llama-3.1-nemotron-51b-instruct',
        name: 'Nemotron 51B',
        provider: 'nvidia',
        description: 'NVIDIA optimized Llama, balanced speed and quality',
      },
      {
        id: 'nvidia/nemotron-nano-9b-v2',
        name: 'Nemotron Nano 9B v2',
        provider: 'nvidia',
        description: 'Compact reasoning and chat model',
      },
      {
        id: 'nvidia/nemotron-4-340b-reward',
        name: 'Nemotron 4 340B Reward',
        provider: 'nvidia',
        description: 'NVIDIA\'s reward model for alignment',
      },
      // === DeepSeek ===
      {
        id: 'deepseek-ai/deepseek-r1',
        name: 'DeepSeek R1',
        provider: 'nvidia',
        description: 'DeepSeek reasoning model, advanced chain-of-thought',
      },
      {
        id: 'deepseek-ai/deepseek-r1-distill-llama-70b',
        name: 'DeepSeek R1 Distill 70B',
        provider: 'nvidia',
        description: 'Distilled reasoning in Llama format',
      },
      {
        id: 'deepseek-ai/deepseek-r1-distill-qwen-32b',
        name: 'DeepSeek R1 Distill Qwen 32B',
        provider: 'nvidia',
        description: 'Distilled reasoning in Qwen format',
      },
      // === Mistral ===
      {
        id: 'mistralai/mistral-large-2-instruct',
        name: 'Mistral Large 2',
        provider: 'nvidia',
        description: 'Mistral\'s flagship model, advanced reasoning',
      },
      {
        id: 'mistralai/mixtral-8x22b-instruct-v0.1',
        name: 'Mixtral 8x22B',
        provider: 'nvidia',
        description: 'Mixture-of-experts, efficient and powerful',
      },
      {
        id: 'mistralai/codestral-22b-instruct',
        name: 'Codestral 22B',
        provider: 'nvidia',
        description: 'Mistral\'s specialized coding model',
      },
      {
        id: 'mistralai/mistral-7b-instruct',
        name: 'Mistral 7B',
        provider: 'nvidia',
        description: 'Fast lightweight model for quick tasks',
      },
      // === Qwen ===
      {
        id: 'qwen/qwen2.5-72b-instruct',
        name: 'Qwen 2.5 72B',
        provider: 'nvidia',
        description: 'Alibaba\'s flagship model, multilingual',
      },
      {
        id: 'qwen/qwen2.5-coder-32b-instruct',
        name: 'Qwen 2.5 Coder 32B',
        provider: 'nvidia',
        description: 'Specialized coding model by Alibaba',
      },
      {
        id: 'qwen/qwen2-72b-instruct',
        name: 'Qwen 2 72B',
        provider: 'nvidia',
        description: 'Alibaba\'s previous-gen flagship',
      },
      // === Google Gemma ===
      {
        id: 'google/gemma-2-27b-it',
        name: 'Gemma 2 27B',
        provider: 'nvidia',
        description: 'Google\'s instruction-tuned lightweight model',
      },
      {
        id: 'google/gemma-2-9b-it',
        name: 'Gemma 2 9B',
        provider: 'nvidia',
        description: 'Google\'s compact instruction model',
      },
      // === Microsoft Phi ===
      {
        id: 'microsoft/phi-4-mini-instruct',
        name: 'Phi-4 Mini',
        provider: 'nvidia',
        description: 'Microsoft\'s latest compact reasoning model',
      },
      {
        id: 'microsoft/phi-3.5-mini-instruct',
        name: 'Phi-3.5 Mini',
        provider: 'nvidia',
        description: 'Microsoft\'s improved compact model',
      },
      {
        id: 'microsoft/phi-3-medium-128k-instruct',
        name: 'Phi-3 Medium 128K',
        provider: 'nvidia',
        description: 'Microsoft mid-size model with long context',
      },
      {
        id: 'microsoft/phi-3-mini-128k-instruct',
        name: 'Phi-3 Mini 128K',
        provider: 'nvidia',
        description: 'Microsoft compact model, long context window',
      },
      {
        id: 'microsoft/phi-3-small-128k-instruct',
        name: 'Phi-3 Small 128K',
        provider: 'nvidia',
        description: 'Microsoft small model with 128K context',
      },
      // === Snowflake ===
      {
        id: 'snowflake/snowflake-arctic-instruct',
        name: 'Snowflake Arctic',
        provider: 'nvidia',
        description: 'Snowflake\'s enterprise-grade model',
      },
      // === IBM ===
      {
        id: 'ibm/granite-34b-code-instruct',
        name: 'Granite 34B Code',
        provider: 'nvidia',
        description: 'IBM\'s code-specialized model',
      },
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
