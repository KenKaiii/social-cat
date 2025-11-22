# Chat-Input Trigger Reference

## Available Variables

Chat-input triggers provide user-submitted form data in the `trigger` object:

- **`trigger.{fieldKey}`** - Access form field values by their key
  - Example: If field key is `email`, access with `trigger.email`
  - Example: If field key is `userName`, access with `trigger.userName`
  - CRITICAL: Use the exact field `key` you defined, not the label

## Configuration Options

```yaml
trigger: chat-input
chatInputFields:
  - id: field1
    key: email           # Variable name (use in steps as {{trigger.email}})
    label: Email Address # Display label in form
    type: text          # Field type
    required: true      # Is this field required?
    placeholder: user@example.com  # Optional placeholder

  - id: field2
    key: message
    label: Your Message
    type: textarea
    required: true
```

## Field Types

**Supported types:**
- `text` - Single-line text input
- `textarea` - Multi-line text input
- `number` - Numeric input
- `date` - Date picker
- `select` - Dropdown with options
- `checkbox` - Boolean checkbox

## Field Configuration

**Required fields:**
- `id` - Unique identifier (auto-generated if not provided)
- `key` - Variable name (alphanumeric + underscores, must start with letter)
- `label` - Display label shown to user
- `type` - Field type (from supported types above)
- `required` - Boolean, whether field is required

**Optional fields:**
- `placeholder` - Placeholder text
- `options` - For `select` type only (array of `{label, value}`)

## Complete Working Example

```yaml
name: Contact Form Handler
description: Process contact form submissions
trigger: chat-input
chatInputFields:
  - id: name-field
    key: userName
    label: Your Name
    type: text
    required: true
    placeholder: John Doe

  - id: email-field
    key: userEmail
    label: Email Address
    type: text
    required: true
    placeholder: john@example.com

  - id: topic-field
    key: topic
    label: Topic
    type: select
    required: true
    options:
      - label: General Inquiry
        value: general
      - label: Support Request
        value: support
      - label: Sales Question
        value: sales

  - id: message-field
    key: message
    label: Message
    type: textarea
    required: true
    placeholder: Enter your message here...

  - id: subscribe-field
    key: wantsNewsletter
    label: Subscribe to newsletter
    type: checkbox
    required: false

output: json
returnValue: "{{result}}"
steps:
  # Step 1: Validate email format
  - module: utilities.string-utils.isEmail
    id: validate-email
    inputs:
      str: "{{trigger.userEmail}}"
    outputAs: emailValid

  # Step 2: Build response object
  - module: utilities.javascript.execute
    id: build-response
    inputs:
      code: |
        return {
          name: trigger.userName,
          email: trigger.userEmail,
          topic: trigger.topic,
          message: trigger.message,
          newsletter: trigger.wantsNewsletter || false,
          emailValid: emailValid,
          submittedAt: new Date().toISOString()
        };
      context:
        trigger: "{{trigger}}"
        emailValid: "{{emailValid}}"
    outputAs: result

# Usage: User fills out form in UI, workflow executes with form data
# Response: Processed form data with validation results
```

## Common Patterns

### Pattern 1: Access Form Data
```yaml
steps:
  - module: utilities.javascript.execute
    id: process-data
    inputs:
      code: |
        const name = trigger.userName;      # Access by field key
        const email = trigger.userEmail;    # Not by label!
        return {processed: true, name, email};
```

### Pattern 2: Conditional Logic Based on Input
```yaml
steps:
  - module: utilities.control-flow.ifElse
    id: check-topic
    inputs:
      condition: "{{trigger.topic}} === 'support'"
      ifValue: "Priority: High"
      elseValue: "Priority: Normal"
    outputAs: priority
```

### Pattern 3: Send Email with Form Data
```yaml
steps:
  - module: communication.gmail.sendEmail
    id: send-notification
    inputs:
      to: "admin@company.com"
      subject: "New Contact Form: {{trigger.topic}}"
      body: |
        Name: {{trigger.userName}}
        Email: {{trigger.userEmail}}
        Message: {{trigger.message}}
    outputAs: emailSent
```

## Field Key Rules

**Valid keys:**
- `email` ✓
- `userName` ✓
- `user_name` ✓
- `phone_number_1` ✓

**Invalid keys:**
- `user-name` ✗ (hyphens not allowed)
- `123name` ✗ (must start with letter)
- `user name` ✗ (spaces not allowed)
- `email@` ✗ (special characters not allowed)

## Select Field Example

```yaml
chatInputFields:
  - id: country-field
    key: country
    label: Select Country
    type: select
    required: true
    options:
      - label: United States
        value: us
      - label: United Kingdom
        value: uk
      - label: Canada
        value: ca

steps:
  - module: utilities.javascript.execute
    id: use-selection
    inputs:
      code: "return `Selected country: ${trigger.country}`"  # Will be 'us', 'uk', or 'ca'
```

## Important Notes

- ✅ **Always use field `key`** for variable names, not `label`
- ✅ **Keys are case-sensitive** - `userName` ≠ `username`
- ✅ **Checkbox defaults to false** if unchecked
- ✅ **Select uses `value`** not `label` from options
- ✅ **All fields accessible** via `trigger.{key}`
- ❌ **Don't use `trigger.fields`** - fields are at root level
- ❌ **Don't reference by label** - always use key

## Validation

Field validation happens automatically:
- `required: true` - Field must have value
- `type: email` - Format validation (use string-utils.isEmail for deeper validation)
- `type: number` - Ensures numeric value
- `type: date` - Ensures valid date format

For custom validation, use workflow steps with utilities.validation modules.
