# Gmail Trigger Reference

## Available Variables

Gmail triggers provide email data in the `trigger` object:

- **`trigger.from`** - Sender email address
- **`trigger.to`** - Recipient email address (your email)
- **`trigger.subject`** - Email subject line
- **`trigger.body`** - Email body content (plain text)
- **`trigger.bodyHtml`** - Email body in HTML format
- **`trigger.date`** - Email received date (ISO string)
- **`trigger.messageId`** - Unique Gmail message ID
- **`trigger.threadId`** - Gmail thread/conversation ID
- **`trigger.labels`** - Array of Gmail labels/folders

## Configuration Options

```yaml
trigger: gmail
gmailFilters:
  label: inbox           # Gmail label/folder to monitor
  isUnread: true        # Only unread emails
  hasNoLabels: true     # Emails with no labels
gmailPollInterval: 60    # Check every 60 seconds (default)
```

## Filter Options

**Available filters:**
- `label` - Gmail label/folder name (e.g., "inbox", "work", "important")
- `isUnread` - Boolean, only process unread emails
- `hasNoLabels` - Boolean, only process emails with no labels
- `from` - Filter by sender email address
- `subject` - Filter by subject line (contains match)

**Note:** Multiple filters work with AND logic (all must match)

## Complete Working Example

```yaml
name: Process Customer Support Emails
description: Auto-respond to support emails
trigger: gmail
gmailFilters:
  label: inbox
  isUnread: true
  subject: "[Support]"    # Only emails with [Support] in subject
gmailPollInterval: 30     # Check every 30 seconds
output: json
returnValue: "{{response}}"
steps:
  # Step 1: Extract sender info
  - module: utilities.javascript.execute
    id: parse-email
    inputs:
      code: |
        const senderEmail = trigger.from;
        const senderName = senderEmail.split('@')[0];
        return {
          senderEmail,
          senderName,
          subject: trigger.subject,
          receivedAt: trigger.date
        };
    outputAs: emailInfo

  # Step 2: Generate AI response
  - module: ai.ai-sdk.generateText
    id: generate-reply
    inputs:
      prompt: |
        Generate a helpful support response for this email:

        From: {{emailInfo.senderName}}
        Subject: {{trigger.subject}}
        Message: {{trigger.body}}

        Be professional and helpful.
      model: gpt-4o-mini
      provider: openai
    outputAs: aiReply

  # Step 3: Send reply email
  - module: communication.gmail.sendEmail
    id: send-reply
    inputs:
      to: "{{trigger.from}}"
      subject: "Re: {{trigger.subject}}"
      body: "{{aiReply.content}}"
      threadId: "{{trigger.threadId}}"  # Reply in same thread
    outputAs: sentEmail

  # Step 4: Mark original as read
  - module: communication.gmail.markAsRead
    id: mark-read
    inputs:
      messageId: "{{trigger.messageId}}"
    outputAs: marked

  # Step 5: Build response
  - module: utilities.javascript.execute
    id: build-response
    inputs:
      code: |
        return {
          processed: true,
          from: emailInfo.senderEmail,
          replySent: !!sentEmail,
          markedRead: !!marked
        };
      context:
        emailInfo: "{{emailInfo}}"
        sentEmail: "{{sentEmail}}"
        marked: "{{marked}}"
    outputAs: response

# When new matching email arrives:
# 1. Email data available in trigger variables
# 2. Workflow executes automatically
# 3. Response contains processing results
```

## Common Patterns

### Pattern 1: Filter by Sender
```yaml
trigger: gmail
gmailFilters:
  from: "customer@example.com"  # Only emails from this sender
  isUnread: true
```

### Pattern 2: Monitor Specific Label
```yaml
trigger: gmail
gmailFilters:
  label: "work/urgent"   # Nested label
  isUnread: true
gmailPollInterval: 10    # Check every 10 seconds for urgent items
```

### Pattern 3: Extract Attachments
```yaml
steps:
  - module: communication.gmail.getAttachments
    id: get-attachments
    inputs:
      messageId: "{{trigger.messageId}}"
    outputAs: attachments

  - module: utilities.javascript.execute
    id: process-attachments
    inputs:
      code: |
        return {
          hasAttachments: attachments.length > 0,
          count: attachments.length,
          files: attachments.map(a => a.filename)
        };
      context:
        attachments: "{{attachments}}"
    outputAs: attachmentInfo
```

### Pattern 4: Forward to Slack
```yaml
steps:
  - module: communication.slack.sendMessage
    id: notify-slack
    inputs:
      channel: "#support"
      text: |
        New support email received!
        From: {{trigger.from}}
        Subject: {{trigger.subject}}

        {{trigger.body}}
    outputAs: slackNotification
```

## Poll Interval

**Default:** 60 seconds

**Options:**
- Minimum: 10 seconds (aggressive polling)
- Recommended: 30-60 seconds (balanced)
- Maximum: 300 seconds (5 minutes, conservative)

```yaml
gmailPollInterval: 30  # Check every 30 seconds
```

**Note:** Lower intervals = faster response but higher API usage

## Deduplication

The system automatically tracks processed emails:
- Stores `lastChecked` timestamp
- Only processes NEW emails since last check
- No duplicate processing of same email

## Labels (Folders)

**Common Gmail labels:**
- `inbox` - Main inbox
- `sent` - Sent emails
- `drafts` - Draft emails
- `important` - Important (starred)
- `spam` - Spam folder
- `trash` - Deleted emails
- Custom labels - Any label you created (e.g., "work", "personal")

**Nested labels:** Use `/` separator
- `work/urgent`
- `clients/active`
- `projects/2024`

## Error Handling

If email processing fails:
- Error logged but polling continues
- Next email will be processed
- Failed email can be retried manually

Add error handling in workflow:
```yaml
steps:
  - module: utilities.control-flow.tryCatch
    id: safe-processing
    inputs:
      tryCode: "return processEmail(trigger);"
      catchCode: "return {error: true, message: error.message};"
    outputAs: result
```

## Requirements

- Gmail account must be connected as credential
- OAuth scopes: `gmail.readonly`, `gmail.send` (for replies)
- Workflow must be active/enabled

## Important Notes

- ✅ **Polling runs while workflow is active**
- ✅ **Each email triggers ONE execution**
- ✅ **Thread ID useful for replying** in same conversation
- ✅ **Labels are case-insensitive** ("Inbox" = "inbox")
- ❌ **Don't set poll interval < 10 seconds** (rate limits)
- ❌ **Don't process same email twice** (deduplication handles this)
- ✅ **Use `isUnread: true`** to avoid reprocessing read emails

## Testing

Test your Gmail trigger:
1. Create workflow with gmail trigger
2. Set filters to match test email
3. Send test email to your Gmail
4. Wait for poll interval
5. Check workflow execution history

**Tip:** Use `gmailPollInterval: 10` for faster testing, increase for production
