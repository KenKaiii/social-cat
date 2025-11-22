# Chat Trigger Reference

## Available Variables

Chat triggers provide a `trigger` object with:

- **`trigger.userInput`** or **`trigger.message`** - User's message text
- **`trigger.conversationId`** - Unique conversation ID

## Configuration

```yaml
trigger: chat
# No additional config needed - inputVariable auto-set to "userInput"
```

## Complete Working Example

```yaml
name: AI Chat Assistant
description: Responds to user messages with AI-generated content
trigger: chat
output: markdown
returnValue: "{{response}}"
steps:
  - module: ai.ai-sdk.generateText
    id: generate-response
    inputs:
      prompt: "{{trigger.userInput}}"  # User's message
      model: gpt-4o-mini
      provider: openai
    outputAs: aiResponse

  - module: utilities.javascript.execute
    id: format-response
    inputs:
      code: "return aiResponse.content;"
      context:
        aiResponse: "{{aiResponse}}"
    outputAs: response
```

## Critical Rules

1. Use `trigger.userInput` or `trigger.message` for user's text
2. Chat workflows appear in chat interface automatically
3. Output is sent back as chat message
4. Use `returnValue` to control response content
