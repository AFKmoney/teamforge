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
    description: 'NVIDIA NIM API with OpenAI-compatible format. Requires nvapi-... key.',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    requiresApiKey: true,
    apiKeyPrefix: 'nvapi-',
    models: [
      {
        id: 'meta/llama-3.1-405b-instruct',
        name: 'Llama 3.1 405B',
        provider: 'nvidia',
        description: 'Meta\'s largest open model, top-tier reasoning',
      },
      {
        id: 'mistralai/mixtral-8x22b-instruct',
        name: 'Mixtral 8x22B',
        provider: 'nvidia',
        description: 'Mistral\'s mixture-of-experts model',
      },
      {
        id: 'nvidia/llama-3.1-nemotron-70b-instruct',
        name: 'Nemotron 70B',
        provider: 'nvidia',
        description: 'NVIDIA fine-tuned Llama for instruction following',
      },
      {
        id: 'nvidia/nemotron-4-340b-reward',
        name: 'Nemotron 4 340B Reward',
        provider: 'nvidia',
        description: 'NVIDIA\'s reward model for alignment',
      },
      {
        id: 'google/gemma-2-27b-it',
        name: 'Gemma 2 27B',
        provider: 'nvidia',
        description: 'Google\'s lightweight instruction-tuned model',
      },
      {
        id: 'microsoft/phi-3-mini-128k-instruct',
        name: 'Phi-3 Mini 128K',
        provider: 'nvidia',
        description: 'Microsoft\'s compact model with long context',
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
