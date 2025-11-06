# GoHighLevel (GHL) Integration

GoHighLevel is a comprehensive CRM and marketing automation platform. This integration allows you to automate contact management, sales pipelines, appointments, tasks, and customer communications.

## Setup

### 1. Get Your API Credentials

1. Log in to your GoHighLevel account
2. Go to **Settings** → **Business Profile** → **API Keys**
3. Create a new API key or copy your existing one
4. Note your **Location ID** (found in Settings → Business Profile)

### 2. Configure Environment Variables

Add these environment variables to your `.env.local` file:

```bash
GHL_API_KEY=your_api_key_here
GHL_LOCATION_ID=your_location_id_here
```

Alternative variable names (also supported):
```bash
GOHIGHLEVEL_API_KEY=your_api_key_here
GOHIGHLEVEL_LOCATION_ID=your_location_id_here
```

## Available Functions

### Contacts Management
- `createContact` - Create a new contact
- `updateContact` - Update existing contact
- `getContact` - Get contact by ID
- `getContactByEmail` - Find contact by email
- `searchContacts` - Search contacts with filters
- `deleteContact` - Delete a contact
- `addTagsToContact` - Add tags to contact
- `removeTagsFromContact` - Remove tags from contact

### Opportunities (Sales Pipeline)
- `createOpportunity` - Create new deal/opportunity
- `updateOpportunity` - Update opportunity
- `getOpportunity` - Get opportunity by ID
- `searchOpportunities` - Search opportunities
- `deleteOpportunity` - Delete opportunity

### Appointments
- `createAppointment` - Schedule new appointment
- `updateAppointment` - Update appointment
- `getAppointment` - Get appointment by ID
- `deleteAppointment` - Delete appointment

### Tasks
- `createTask` - Create new task
- `updateTask` - Update task
- `getTask` - Get task by ID
- `deleteTask` - Delete task
- `completeTask` - Mark task as completed

### Notes
- `createNote` - Add note to contact
- `getNote` - Get note by ID
- `getContactNotes` - Get all notes for contact
- `deleteNote` - Delete note

### Conversations & Messaging
- `sendSMS` - Send SMS to contact
- `sendEmail` - Send email to contact
- `getContactConversations` - Get contact's conversations
- `getConversationMessages` - Get messages in conversation

## Example Workflows

### Example 1: Create Contact and Send Welcome SMS

```json
{
  "name": "New Lead to GHL",
  "description": "Create contact in GoHighLevel and send welcome SMS",
  "steps": [
    {
      "module": "business.gohighlevel.createContact",
      "params": {
        "email": "john@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "phone": "+1234567890",
        "tags": ["new-lead", "website"]
      },
      "outputAs": "contact"
    },
    {
      "module": "business.gohighlevel.sendSMS",
      "params": {
        "contactId": "{{contact.id}}",
        "message": "Welcome to our service! We're excited to work with you."
      }
    }
  ]
}
```

### Example 2: Create Opportunity and Task

```json
{
  "name": "New Deal Pipeline",
  "description": "Create opportunity and follow-up task",
  "steps": [
    {
      "module": "business.gohighlevel.createOpportunity",
      "params": {
        "name": "New Business Deal",
        "pipelineId": "your_pipeline_id",
        "pipelineStageId": "your_stage_id",
        "contactId": "contact_id_here",
        "status": "open",
        "monetaryValue": 5000
      },
      "outputAs": "opportunity"
    },
    {
      "module": "business.gohighlevel.createTask",
      "params": {
        "title": "Follow up with prospect",
        "body": "Discuss next steps for deal: {{opportunity.name}}",
        "contactId": "contact_id_here",
        "assignedTo": "user_id_here",
        "dueDate": "2024-12-31T09:00:00Z"
      }
    }
  ]
}
```

### Example 3: Search Contacts and Add Tags

```json
{
  "name": "Tag Active Leads",
  "description": "Find contacts and add active-lead tag",
  "steps": [
    {
      "module": "business.gohighlevel.searchContacts",
      "params": {
        "query": "active",
        "limit": 50
      },
      "outputAs": "contacts"
    },
    {
      "module": "utilities.control-flow.forEach",
      "params": {
        "array": "{{contacts}}",
        "steps": [
          {
            "module": "business.gohighlevel.addTagsToContact",
            "params": {
              "contactId": "{{item.id}}",
              "tags": ["active-lead"]
            }
          }
        ]
      }
    }
  ]
}
```

### Example 4: Schedule Appointment and Send Confirmation

```json
{
  "name": "Book Appointment",
  "description": "Create appointment and send confirmation email",
  "steps": [
    {
      "module": "business.gohighlevel.createAppointment",
      "params": {
        "calendarId": "your_calendar_id",
        "contactId": "contact_id_here",
        "title": "Initial Consultation",
        "startTime": "2024-12-25T10:00:00Z",
        "endTime": "2024-12-25T11:00:00Z",
        "notes": "First meeting with prospect"
      },
      "outputAs": "appointment"
    },
    {
      "module": "business.gohighlevel.sendEmail",
      "params": {
        "contactId": "contact_id_here",
        "subject": "Appointment Confirmed",
        "body": "Your appointment is confirmed for {{appointment.startTime}}",
        "html": "<h2>Appointment Confirmed</h2><p>Your consultation is scheduled for {{appointment.startTime}}</p>"
      }
    }
  ]
}
```

## Common Use Cases

### Lead Management
- Automatically create contacts from form submissions
- Tag and segment contacts based on behavior
- Send automated welcome sequences

### Sales Automation
- Create opportunities when leads qualify
- Move deals through pipeline stages
- Assign tasks to sales team members

### Appointment Booking
- Schedule consultations and meetings
- Send confirmation and reminder messages
- Manage calendar availability

### Customer Communication
- Send SMS notifications and updates
- Email customers with personalized content
- Track conversation history

### Workflow Integration
Combine GHL with other modules:
- **Lead Enrichment**: Use `leads.clearbit` to enrich data before creating GHL contacts
- **CRM Sync**: Sync contacts between GHL and other CRMs (HubSpot, Salesforce)
- **Email Marketing**: Trigger email campaigns based on GHL events
- **Analytics**: Log GHL activities to analytics platforms

## Rate Limits

The module includes built-in rate limiting:
- 100 requests per 10 seconds
- 5 concurrent requests maximum
- Automatic retry with exponential backoff

## Error Handling

The module includes circuit breakers to prevent cascading failures:
- 15-second timeout per request
- Automatic error logging
- Graceful degradation

## Support

For API documentation, visit: https://marketplace.gohighlevel.com/docs/

For issues with this integration, check:
1. API credentials are correct
2. Location ID is set
3. API key has necessary permissions
4. Rate limits haven't been exceeded
