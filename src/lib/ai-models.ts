/**
 * AI Models Configuration
 *
 * Central source of truth for all AI models across the application.
 * Update this file when new models are released or deprecated.
 */

export type AIProvider = 'openai' | 'anthropic' | 'openrouter';

export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  contextWindow: number;
  description?: string;
  deprecated?: boolean;
  /** For OpenRouter models, indicates the underlying provider */
  openRouterProvider?: string;
}

/**
 * OpenAI Models
 * Documentation: https://platform.openai.com/docs/models
 */
export const OPENAI_MODELS: AIModel[] = [
  // GPT-5 Series (Latest)
  {
    id: 'gpt-5',
    name: 'GPT-5',
    provider: 'openai',
    contextWindow: 128000,
    description: 'Latest flagship model with enhanced reasoning',
  },
  {
    id: 'gpt-5-turbo',
    name: 'GPT-5 Turbo',
    provider: 'openai',
    contextWindow: 128000,
    description: 'Faster variant of GPT-5',
  },

  // GPT-4.5 Series
  {
    id: 'gpt-4.5-turbo',
    name: 'GPT-4.5 Turbo',
    provider: 'openai',
    contextWindow: 128000,
    description: 'Enhanced GPT-4 with improved capabilities',
  },

  // GPT-4o Series
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    contextWindow: 128000,
    description: 'Multimodal flagship model',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    contextWindow: 128000,
    description: 'Affordable and intelligent small model',
  },

  // GPT-4 Series
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    contextWindow: 128000,
    description: 'Previous generation flagship',
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    contextWindow: 8192,
    description: 'Original GPT-4',
    deprecated: true,
  },

  // o-Series (Reasoning Models)
  {
    id: 'o3',
    name: 'o3',
    provider: 'openai',
    contextWindow: 128000,
    description: 'Latest reasoning model with enhanced problem-solving',
  },
  {
    id: 'o3-mini',
    name: 'o3 Mini',
    provider: 'openai',
    contextWindow: 128000,
    description: 'Smaller reasoning model',
  },
  {
    id: 'o1',
    name: 'o1',
    provider: 'openai',
    contextWindow: 128000,
    description: 'Advanced reasoning model',
  },
  {
    id: 'o1-mini',
    name: 'o1 Mini',
    provider: 'openai',
    contextWindow: 128000,
    description: 'Faster reasoning model',
  },
];

/**
 * Anthropic Models (Claude)
 * Documentation: https://docs.anthropic.com/claude/docs/models-overview
 */
export const ANTHROPIC_MODELS: AIModel[] = [
  // Claude 4.5 Series (Latest)
  {
    id: 'claude-sonnet-4.5-20250514',
    name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    contextWindow: 200000,
    description: 'Latest Sonnet with enhanced capabilities',
  },
  {
    id: 'claude-haiku-4.5-20250514',
    name: 'Claude Haiku 4.5',
    provider: 'anthropic',
    contextWindow: 200000,
    description: 'Latest fast and efficient model',
  },
  {
    id: 'claude-opus-4.5-20250514',
    name: 'Claude Opus 4.5',
    provider: 'anthropic',
    contextWindow: 200000,
    description: 'Most powerful Claude model',
  },

  // Claude 3.5 Series
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    contextWindow: 200000,
    description: 'Balance of intelligence and speed',
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    contextWindow: 200000,
    description: 'Fastest Claude model',
  },

  // Claude 3 Series
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    contextWindow: 200000,
    description: 'Most capable Claude 3 model',
  },
  {
    id: 'claude-3-sonnet-20240229',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    contextWindow: 200000,
    description: 'Balanced Claude 3 model',
    deprecated: true,
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    contextWindow: 200000,
    description: 'Fastest Claude 3 model',
    deprecated: true,
  },
];

/**
 * OpenRouter Models
 * Documentation: https://openrouter.ai/docs
 *
 * OpenRouter provides access to 300+ models from multiple providers.
 * Instead of listing all models statically, we fetch them dynamically.
 * This ensures we always have the latest models without manual updates.
 *
 * Use fetchOpenRouterModels() to get the current list.
 */
export const OPENROUTER_MODELS: AIModel[] = [];

/**
 * Fetch available models from OpenRouter API
 * Returns the current list of all available models
 */
export async function fetchOpenRouterModels(): Promise<AIModel[]> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models');

    if (!response.ok) {
      console.error('Failed to fetch OpenRouter models');
      return [];
    }

    const data: { data: Array<{ id: string; name: string; context_length: number; description?: string }> } = await response.json();

    return data.data.map((model) => ({
      id: model.id,
      name: model.name,
      provider: 'openrouter' as AIProvider,
      contextWindow: model.context_length,
      description: model.description,
      openRouterProvider: model.id.split('/')[0],
    }));
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error);
    return [];
  }
}

/**
 * All available AI models
 */
export const ALL_MODELS: AIModel[] = [...OPENAI_MODELS, ...ANTHROPIC_MODELS, ...OPENROUTER_MODELS];

/**
 * Get models for a specific provider
 */
export function getModelsByProvider(provider: AIProvider): AIModel[] {
  return ALL_MODELS.filter((model) => model.provider === provider);
}

/**
 * Get active (non-deprecated) models for a provider
 */
export function getActiveModelsByProvider(provider: AIProvider): AIModel[] {
  return ALL_MODELS.filter((model) => model.provider === provider && !model.deprecated);
}

/**
 * Get model IDs for a specific provider
 * Note: For OpenRouter, this returns an empty array. Use fetchOpenRouterModels() instead.
 */
export function getModelIdsByProvider(provider: AIProvider, includeDeprecated = false): string[] {
  // OpenRouter models are fetched dynamically, not stored statically
  if (provider === 'openrouter') {
    return [];
  }

  const models = includeDeprecated
    ? getModelsByProvider(provider)
    : getActiveModelsByProvider(provider);
  return models.map((model) => model.id);
}

/**
 * Get a model by ID
 */
export function getModelById(modelId: string): AIModel | undefined {
  return ALL_MODELS.find((model) => model.id === modelId);
}

/**
 * Check if a model ID is valid
 */
export function isValidModel(modelId: string): boolean {
  return ALL_MODELS.some((model) => model.id === modelId);
}

/**
 * Get the provider for a model ID
 */
export function getProviderForModel(modelId: string): AIProvider | undefined {
  const model = getModelById(modelId);
  return model?.provider;
}

/**
 * Default models for each provider
 */
export const DEFAULT_MODELS: Record<AIProvider, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-sonnet-20241022',
  openrouter: 'openai/gpt-4o-mini',
};

/**
 * Get default model for a provider
 */
export function getDefaultModel(provider: AIProvider): string {
  return DEFAULT_MODELS[provider];
}

/**
 * Recommended models for different use cases
 */
export const RECOMMENDED_MODELS = {
  fast: {
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-5-haiku-20241022',
    openrouter: 'openai/gpt-4o-mini',
  },
  balanced: {
    openai: 'gpt-4o',
    anthropic: 'claude-3-5-sonnet-20241022',
    openrouter: 'anthropic/claude-3.5-sonnet',
  },
  powerful: {
    openai: 'gpt-5',
    anthropic: 'claude-opus-4.5-20250514',
    openrouter: 'meta-llama/llama-3.1-405b-instruct',
  },
  reasoning: {
    openai: 'o3',
    anthropic: 'claude-opus-4.5-20250514',
    openrouter: 'openai/o1',
  },
};
