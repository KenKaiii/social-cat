# AI Models Configuration

Central source of truth for all AI models across the application.

## File Location
`/src/lib/ai-models.ts`

## Purpose
This module provides a centralized, easy-to-update list of all supported AI models from various providers (OpenAI, Anthropic). By maintaining models in one place, we ensure consistency across the entire application.

## Updating Models

### When to Update
- New models are released by providers
- Models are deprecated or retired
- Model names or IDs change
- New providers are added

### How to Update

1. **Adding a new model:**
```typescript
// Add to the appropriate provider array (OPENAI_MODELS or ANTHROPIC_MODELS)
{
  id: 'model-id-here',
  name: 'Human Readable Name',
  provider: 'openai', // or 'anthropic'
  contextWindow: 128000,
  description: 'Brief description of the model',
}
```

2. **Deprecating a model:**
```typescript
{
  id: 'old-model-id',
  name: 'Old Model',
  provider: 'openai',
  contextWindow: 8192,
  description: 'Description',
  deprecated: true, // Add this flag
}
```

3. **Removing a model:**
Simply delete the entire model object from the array.

4. **Updating default models:**
```typescript
export const DEFAULT_MODELS: Record<AIProvider, string> = {
  openai: 'gpt-4o-mini', // Update this
  anthropic: 'claude-3-5-sonnet-20241022', // Or this
};
```

## Current Models

### OpenAI Models
- **GPT-5 Series**: Latest flagship models with enhanced reasoning
- **GPT-4.5 Series**: Enhanced GPT-4 capabilities
- **GPT-4o Series**: Multimodal models
- **GPT-4 Series**: Previous generation (some deprecated)
- **o-Series**: Specialized reasoning models (o3, o3-mini, o1, o1-mini)

### Anthropic Models
- **Claude 4.5 Series**: Latest models (Sonnet, Haiku, Opus)
- **Claude 3.5 Series**: Current generation (Sonnet, Haiku)
- **Claude 3 Series**: Previous generation (some deprecated)

### OpenRouter Models
Access hundreds of models through a single API:
- **OpenAI via OpenRouter**: GPT-4o, GPT-4o Mini, o1
- **Anthropic via OpenRouter**: Claude 3.5 Sonnet, Claude 3.5 Haiku
- **Google**: Gemini 2.0 Flash, Gemini Pro 1.5
- **Meta**: Llama 3.3 70B, Llama 3.1 405B
- **Mistral**: Mistral Large, Mixtral 8x22B
- **Cohere**: Command R+
- **DeepSeek**: DeepSeek Chat
- **Perplexity**: Sonar Large (with online search)

**OpenRouter Benefits:**
- One API key for hundreds of models
- Pay-as-you-go pricing
- No monthly commitments
- Automatic failover
- Latest models immediately available

## Usage Examples

```typescript
import {
  getModelIdsByProvider,
  getDefaultModel,
  getModelById,
  isValidModel,
  type AIProvider
} from '@/lib/ai-models';

// Get all OpenAI model IDs
const openaiModels = getModelIdsByProvider('openai');

// Get default model for a provider
const defaultModel = getDefaultModel('anthropic');

// Get model details
const model = getModelById('gpt-4o');
console.log(model.contextWindow); // 128000

// Validate a model ID
if (isValidModel('gpt-5')) {
  // Model exists
}
```

## Where This Is Used

1. **AI SDK Module** (`/src/modules/ai/ai-sdk.ts`): Core AI functionality
2. **Workflow Settings Dialog** (`/src/components/workflows/workflow-settings-dialog.tsx`): Model selection UI
3. **Anywhere models need to be validated or listed**

## Model Information Sources

- **OpenAI Models**: https://platform.openai.com/docs/models
- **Anthropic Models**: https://docs.anthropic.com/claude/docs/models-overview
- **OpenRouter Models**: https://openrouter.ai/docs
- **OpenRouter Model List**: https://openrouter.ai/models (browse all available models)

## Setting Up OpenRouter

To use OpenRouter models:

1. Sign up at https://openrouter.ai
2. Generate an API key at https://openrouter.ai/keys
3. Add the key to your credentials in the b0t dashboard
4. Select "openrouter" as the provider in workflow settings
5. Choose from hundreds of available models

**Why use OpenRouter?**
- Access models not directly available (Google Gemini, Meta Llama, etc.)
- Try different models without multiple API keys
- Cost optimization - compare prices across providers
- Automatic failover for high availability

## Best Practices

1. Always check provider documentation before adding new models
2. Test model changes in development before deploying
3. Keep deprecated models in the list for backwards compatibility (mark with `deprecated: true`)
4. Update the `contextWindow` values as providers update them
5. Use descriptive names and descriptions to help users choose the right model
