# Outlook Trigger Reference

## Available Variables

Outlook triggers provide email data in the `trigger` object:

- **`trigger.from`** - Sender email address
- **`trigger.to`** - Recipient email address (your email)
- **`trigger.subject`** - Email subject line
- **`trigger.body`** - Email body content (plain text)
- **`trigger.bodyHtml`** - Email body in HTML format
- **`trigger.date`** - Email received date (ISO string)
- **`trigger.messageId`** - Unique Outlook message ID
- **`trigger.conversationId`** - Outlook conversation/thread ID
- **`trigger.categories`** - Array of Outlook categories
- **`trigger.importance`** - Email importance (low/normal/high)

## Configuration Options

```yaml
trigger: outlook
outlookFilters:
  folder: inbox          # Outlook folder to monitor
  isUnread: true        # Only unread emails
  importance: high      # Only high-importance emails
outlookPollInterval: 60  # Check every 60 seconds (default)
```

## Filter Options

**Available filters:**
- `folder` - Outlook folder name (e.g., "inbox", "junk", "archive")
- `isUnread` - Boolean, only process unread emails
- `importance` - Filter by importance: "low", "normal", or "high"
- `from` - Filter by sender email address
- `subject` - Filter by subject line (contains match)
- `hasAttachments` - Boolean, only emails with attachments

**Note:** Multiple filters work with AND logic (all must match)

## Complete Working Example

```yaml
name: Process High Priority Outlook Emails
description: Auto-respond to important emails
trigger: outlook
outlookFilters:
  folder: inbox
  isUnread: true
  importance: high       # Only high-priority emails
outlookPollInterval: 30  # Check every 30 seconds
output: json
returnValue: "{{response}}"
steps:
  # Step 1: Extract sender info
  - module: utilities.javascript.execute
    id: parse-email
    inputs:
      code: |
        const senderEmail = trigger.from;
        const senderDomain = senderEmail.split('@')[1];
        return {
          senderEmail,
          senderDomain,
          subject: trigger.subject,
          importance: trigger.importance,
          receivedAt: trigger.date
        };
    outputAs: emailInfo

  # Step 2: Check if sender is internal
  - module: utilities.javascript.execute
    id: check-internal
    inputs:
      code: |
        const internalDomain = 'company.com';
        return emailInfo.senderDomain === internalDomain;
      context:
        emailInfo: "{{emailInfo}}"
    outputAs: isInternal

  # Step 3: Generate appropriate response
  - module: ai.ai-sdk.generateText
    id: generate-reply
    inputs:
      prompt: |
        Generate a response for this {{emailInfo.importance}} priority email:

        From: {{trigger.from}}
        Subject: {{trigger.subject}}
        Internal sender: {{isInternal}}

        Email content:
        {{trigger.body}}

        Be professional and acknowledge the priority.
      model: gpt-4o-mini
      provider: openai
      context:
        emailInfo: "{{emailInfo}}"
        isInternal: "{{isInternal}}"
    outputAs: aiReply

  # Step 4: Send reply email
  - module: communication.outlook.sendEmail
    id: send-reply
    inputs:
      to: "{{trigger.from}}"
      subject: "Re: {{trigger.subject}}"
      body: "{{aiReply.content}}"
      importance: "{{trigger.importance}}"  # Match original importance
    outputAs: sentEmail

  # Step 5: Mark as read and categorize
  - module: communication.outlook.markAsRead
    id: mark-read
    inputs:
      messageId: "{{trigger.messageId}}"
    outputAs: marked

  - module: communication.outlook.addCategory
    id: add-category
    inputs:
      messageId: "{{trigger.messageId}}"
      category: "Processed"
    outputAs: categorized

  # Step 6: Build response
  - module: utilities.javascript.execute
    id: build-response
    inputs:
      code: |
        return {
          processed: true,
          from: emailInfo.senderEmail,
          importance: emailInfo.importance,
          replySent: !!sentEmail,
          markedRead: !!marked,
          categorized: !!categorized
        };
      context:
        emailInfo: "{{emailInfo}}"
        sentEmail: "{{sentEmail}}"
        marked: "{{marked}}"
        categorized: "{{categorized}}"
    outputAs: response

# When new matching email arrives:
# 1. Email data available in trigger variables
# 2. Workflow executes automatically
# 3. Response contains processing results
```

## Common Patterns

### Pattern 1: Filter by Sender Domain
```yaml
trigger: outlook
outlookFilters:
  from: "@clients.com"   # Any email from clients.com domain
  isUnread: true
```

### Pattern 2: Monitor Specific Folder
```yaml
trigger: outlook
outlookFilters:
  folder: "Work/Urgent"  # Nested folder
  isUnread: true
outlookPollInterval: 10  # Check every 10 seconds for urgent items
```

### Pattern 3: High-Priority with Attachments
```yaml
trigger: outlook
outlookFilters:
  importance: high
  hasAttachments: true
  isUnread: true
```

### Pattern 4: Forward to Teams Channel
```yaml
steps:
  - module: communication.teams.sendMessage
    id: notify-teams
    inputs:
      channelId: "urgent-alerts"
      title: "High Priority Email: {{trigger.subject}}"
      text: |
        From: {{trigger.from}}
        Importance: {{trigger.importance}}
        Received: {{trigger.date}}

        {{trigger.body}}
    outputAs: teamsNotification
```

## Poll Interval

**Default:** 60 seconds

**Options:**
- Minimum: 10 seconds (aggressive polling)
- Recommended: 30-60 seconds (balanced)
- Maximum: 300 seconds (5 minutes, conservative)

```yaml
outlookPollInterval: 30  # Check every 30 seconds
```

**Note:** Lower intervals = faster response but higher API usage

## Importance Levels

**Available options:**
- `low` - Low importance/priority
- `normal` - Normal/default priority
- `high` - High importance/priority

**Usage:**
```yaml
outlookFilters:
  importance: high  # Only high-priority emails
```

## Outlook Folders

**Common Outlook folders:**
- `inbox` - Main inbox
- `sentitems` - Sent emails
- `drafts` - Draft emails
- `junkemail` - Spam folder
- `deleteditems` - Trash/deleted
- `archive` - Archived emails
- Custom folders - Any folder you created

**Nested folders:** Use `/` separator
- `Work/Projects`
- `Clients/Active`
- `Personal/Finance`

## Categories

Outlook supports email categories (like Gmail labels):
- Apply categories with `communication.outlook.addCategory`
- Filter by categories in trigger config
- Useful for organizing processed emails

## Deduplication

The system automatically tracks processed emails:
- Stores `lastChecked` timestamp
- Only processes NEW emails since last check
- No duplicate processing of same email

## Attachments

Access email attachments:
```yaml
steps:
  - module: communication.outlook.getAttachments
    id: get-attachments
    inputs:
      messageId: "{{trigger.messageId}}"
    outputAs: attachments

  - module: utilities.array-utils.pluck
    id: list-filenames
    inputs:
      arr: "{{attachments}}"
      key: filename
    outputAs: filenames
```

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

- Outlook/Microsoft 365 account must be connected as credential
- OAuth scopes: `Mail.Read`, `Mail.Send` (for replies)
- Workflow must be active/enabled

## Differences from Gmail Trigger

| Feature | Gmail | Outlook |
|---------|-------|---------|
| Folder property | `label` | `folder` |
| Thread ID | `threadId` | `conversationId` |
| Priority | Not built-in | `importance` field |
| Categories | `labels` (array) | `categories` (array) |
| Nested items | Labels with `/` | Folders with `/` |

## Important Notes

- ✅ **Polling runs while workflow is active**
- ✅ **Each email triggers ONE execution**
- ✅ **Conversation ID useful for replying** in same thread
- ✅ **Folders are case-insensitive** ("Inbox" = "inbox")
- ✅ **Use `isUnread: true`** to avoid reprocessing
- ✅ **Importance filtering** is Outlook-specific (not in Gmail)
- ❌ **Don't set poll interval < 10 seconds** (rate limits)
- ❌ **Don't process same email twice** (deduplication handles this)

## Testing

Test your Outlook trigger:
1. Create workflow with outlook trigger
2. Set filters to match test email
3. Send test email to your Outlook
4. Wait for poll interval
5. Check workflow execution history

**Tip:** Use `outlookPollInterval: 10` for faster testing, increase for production
