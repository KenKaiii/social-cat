# AI Modules Reference

## Available AI Modules

Search with: `curl "http://localhost:3123/api/modules/search?q=generate&limit=5"`

**Main module:** `ai.ai-sdk.generateText`
- Signature: `generateText(options)`
- Wrapper: `options`
- Requires: OpenAI or Anthropic API key

## How to Use

```yaml
- module: ai.ai-sdk.generateText
  id: generate-content
  inputs:
    prompt: "Your prompt here or {{variable}}"
    model: gpt-4o-mini          # For OpenAI
    provider: openai
    maxTokens: 500              # Optional
    temperature: 0.7            # Optional
```

## Credentials

AI modules need API keys. The credential is auto-injected:
- OpenAI: `{{credential.openai_api_key}}`
- Anthropic: `{{credential.anthropic_api_key}}`

You DON'T need to add `apiKey` parameter - it's automatic!

## Common Pattern: AI with User Input

```yaml
trigger: webhook
webhookSync: true
steps:
  - module: ai.ai-sdk.generateText
    id: generate
    inputs:
      prompt: "{{trigger.body.userPrompt}}"
      model: gpt-4o-mini
      provider: openai
    outputAs: aiResponse

  - module: utilities.json-transform.get
    id: extract-text
    inputs:
      obj: "{{aiResponse}}"
      path: content
    outputAs: result
```

## Available Models

**OpenAI (provider: openai):**
- `gpt-4o-mini` - Fast, cheap
- `gpt-4o` - High quality
- `gpt-4-turbo` - Balanced

**Anthropic (provider: anthropic):**
- `claude-3-5-sonnet-20241022` - Best
- `claude-3-haiku-20240307` - Fast
