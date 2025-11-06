import { createCircuitBreaker } from '@/lib/resilience';
import { createRateLimiter, withRateLimit } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';

/**
 * GoHighLevel (GHL) CRM Module
 *
 * Complete CRM and marketing automation platform integration
 * - Contacts: Create, update, get, search contacts
 * - Opportunities: Manage sales pipeline and deals
 * - Appointments: Calendar and booking management
 * - Tasks: Task management and tracking
 * - Notes: Add notes to contacts and opportunities
 * - Conversations: Send SMS and email messages
 * - Built-in resilience and rate limiting
 *
 * Perfect for:
 * - Lead management and nurturing
 * - Sales pipeline automation
 * - Marketing campaign management
 * - Appointment scheduling workflows
 * - Customer communication automation
 */

const GHL_API_KEY = process.env.GHL_API_KEY || process.env.GOHIGHLEVEL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || process.env.GOHIGHLEVEL_LOCATION_ID;
const GHL_BASE_URL = 'https://services.leadconnectorhq.com';

if (!GHL_API_KEY) {
  logger.warn('⚠️  GHL_API_KEY not set. GoHighLevel features will not work.');
}

if (!GHL_LOCATION_ID) {
  logger.warn('⚠️  GHL_LOCATION_ID not set. Some GoHighLevel features may not work.');
}

// Rate limiter: GHL allows reasonable rate limits, being conservative with 10 req/sec
const ghlRateLimiter = createRateLimiter({
  maxConcurrent: 5,
  minTime: 100, // 100ms between requests
  reservoir: 100,
  reservoirRefreshAmount: 100,
  reservoirRefreshInterval: 10000,
  id: 'gohighlevel',
});

export interface GHLContact {
  id: string;
  locationId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  phone?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  companyName?: string;
  website?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
  source?: string;
  dateAdded?: string;
  dateUpdated?: string;
  [key: string]: unknown;
}

export interface GHLOpportunity {
  id: string;
  name: string;
  pipelineId: string;
  pipelineStageId: string;
  contactId: string;
  status: 'open' | 'won' | 'lost' | 'abandoned';
  monetaryValue?: number;
  assignedTo?: string;
  customFields?: Record<string, unknown>;
  dateAdded?: string;
  dateUpdated?: string;
  [key: string]: unknown;
}

export interface GHLAppointment {
  id: string;
  calendarId: string;
  locationId: string;
  contactId: string;
  title: string;
  startTime: string;
  endTime: string;
  appointmentStatus: string;
  assignedUserId?: string;
  notes?: string;
  [key: string]: unknown;
}

export interface GHLTask {
  id: string;
  title: string;
  body?: string;
  contactId: string;
  assignedTo: string;
  dueDate?: string;
  completed: boolean;
  [key: string]: unknown;
}

export interface GHLNote {
  id: string;
  body: string;
  contactId?: string;
  userId?: string;
  dateAdded?: string;
  [key: string]: unknown;
}

/**
 * Make authenticated request to GoHighLevel API
 */
async function makeGHLRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
  body?: unknown,
  customHeaders?: Record<string, string>
): Promise<T> {
  if (!GHL_API_KEY) {
    throw new Error('GoHighLevel API key not configured. Set GHL_API_KEY or GOHIGHLEVEL_API_KEY.');
  }

  const url = `${GHL_BASE_URL}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${GHL_API_KEY}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28',
      ...customHeaders,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  logger.info({ method, endpoint }, 'Making GoHighLevel API request');

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GoHighLevel API error (${response.status}): ${errorText}`);
  }

  // Handle empty responses (e.g., DELETE requests)
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    const data = await response.json();
    return data as T;
  }

  return {} as T;
}

// ============================================================================
// CONTACTS
// ============================================================================

/**
 * Create a new contact in GoHighLevel
 */
async function createContactInternal(
  data: {
    email?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    phone?: string;
    address1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    companyName?: string;
    website?: string;
    tags?: string[];
    customFields?: Record<string, unknown>;
    source?: string;
  }
): Promise<GHLContact> {
  const locationId = GHL_LOCATION_ID;
  if (!locationId) {
    throw new Error('GHL_LOCATION_ID not configured');
  }

  logger.info({ email: data.email, name: data.name }, 'Creating GoHighLevel contact');

  const payload = {
    ...data,
    locationId,
  };

  const result = await makeGHLRequest<{ contact: GHLContact }>(
    '/contacts/',
    'POST',
    payload
  );

  logger.info({ contactId: result.contact.id }, 'GoHighLevel contact created');
  return result.contact;
}

const createContactWithBreaker = createCircuitBreaker(createContactInternal, {
  timeout: 15000,
  name: 'ghl-create-contact',
});

const createContactRateLimited = withRateLimit(
  async (data: Parameters<typeof createContactInternal>[0]) =>
    createContactWithBreaker.fire(data),
  ghlRateLimiter
);

export async function createContact(
  data: Parameters<typeof createContactInternal>[0]
): Promise<GHLContact> {
  return (await createContactRateLimited(data)) as unknown as GHLContact;
}

/**
 * Update an existing contact
 */
export async function updateContact(
  contactId: string,
  data: Partial<{
    email: string;
    firstName: string;
    lastName: string;
    name: string;
    phone: string;
    address1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    companyName: string;
    website: string;
    tags: string[];
    customFields: Record<string, unknown>;
  }>
): Promise<GHLContact> {
  logger.info({ contactId }, 'Updating GoHighLevel contact');

  const result = await makeGHLRequest<{ contact: GHLContact }>(
    `/contacts/${contactId}`,
    'PUT',
    data
  );

  logger.info({ contactId: result.contact.id }, 'GoHighLevel contact updated');
  return result.contact;
}

/**
 * Get contact by ID
 */
export async function getContact(contactId: string): Promise<GHLContact> {
  logger.info({ contactId }, 'Getting GoHighLevel contact');

  const result = await makeGHLRequest<{ contact: GHLContact }>(
    `/contacts/${contactId}`,
    'GET'
  );

  logger.info({ contactId: result.contact.id }, 'GoHighLevel contact retrieved');
  return result.contact;
}

/**
 * Get contact by email
 */
export async function getContactByEmail(email: string): Promise<GHLContact | null> {
  logger.info({ email }, 'Getting GoHighLevel contact by email');

  const result = await makeGHLRequest<{ contacts: GHLContact[] }>(
    `/contacts/?email=${encodeURIComponent(email)}`,
    'GET'
  );

  if (result.contacts && result.contacts.length > 0) {
    logger.info({ contactId: result.contacts[0].id }, 'GoHighLevel contact found');
    return result.contacts[0];
  }

  logger.info('GoHighLevel contact not found');
  return null;
}

/**
 * Search contacts with filters
 */
export async function searchContacts(
  query?: string,
  limit: number = 20,
  locationId?: string
): Promise<GHLContact[]> {
  const locId = locationId || GHL_LOCATION_ID;
  if (!locId) {
    throw new Error('GHL_LOCATION_ID not configured');
  }

  logger.info({ query, limit }, 'Searching GoHighLevel contacts');

  const queryParams = new URLSearchParams({
    locationId: locId,
    limit: limit.toString(),
  });

  if (query) {
    queryParams.append('query', query);
  }

  const result = await makeGHLRequest<{ contacts: GHLContact[] }>(
    `/contacts/?${queryParams.toString()}`,
    'GET'
  );

  logger.info({ resultCount: result.contacts?.length || 0 }, 'GoHighLevel contacts search completed');
  return result.contacts || [];
}

/**
 * Delete contact
 */
export async function deleteContact(contactId: string): Promise<void> {
  logger.info({ contactId }, 'Deleting GoHighLevel contact');

  await makeGHLRequest(
    `/contacts/${contactId}`,
    'DELETE'
  );

  logger.info({ contactId }, 'GoHighLevel contact deleted');
}

/**
 * Add tags to contact
 */
export async function addTagsToContact(
  contactId: string,
  tags: string[]
): Promise<GHLContact> {
  logger.info({ contactId, tags }, 'Adding tags to GoHighLevel contact');

  const result = await makeGHLRequest<{ contact: GHLContact }>(
    `/contacts/${contactId}/tags`,
    'POST',
    { tags }
  );

  logger.info({ contactId }, 'Tags added to GoHighLevel contact');
  return result.contact;
}

/**
 * Remove tags from contact
 */
export async function removeTagsFromContact(
  contactId: string,
  tags: string[]
): Promise<GHLContact> {
  logger.info({ contactId, tags }, 'Removing tags from GoHighLevel contact');

  const result = await makeGHLRequest<{ contact: GHLContact }>(
    `/contacts/${contactId}/tags`,
    'DELETE',
    { tags }
  );

  logger.info({ contactId }, 'Tags removed from GoHighLevel contact');
  return result.contact;
}

// ============================================================================
// OPPORTUNITIES
// ============================================================================

/**
 * Create a new opportunity
 */
export async function createOpportunity(
  data: {
    name: string;
    pipelineId: string;
    pipelineStageId: string;
    contactId: string;
    status: 'open' | 'won' | 'lost' | 'abandoned';
    monetaryValue?: number;
    assignedTo?: string;
    customFields?: Record<string, unknown>;
  }
): Promise<GHLOpportunity> {
  const locationId = GHL_LOCATION_ID;
  if (!locationId) {
    throw new Error('GHL_LOCATION_ID not configured');
  }

  logger.info({ name: data.name, contactId: data.contactId }, 'Creating GoHighLevel opportunity');

  const payload = {
    ...data,
    locationId,
  };

  const result = await makeGHLRequest<{ opportunity: GHLOpportunity }>(
    '/opportunities/',
    'POST',
    payload
  );

  logger.info({ opportunityId: result.opportunity.id }, 'GoHighLevel opportunity created');
  return result.opportunity;
}

/**
 * Update an existing opportunity
 */
export async function updateOpportunity(
  opportunityId: string,
  data: Partial<{
    name: string;
    pipelineStageId: string;
    status: 'open' | 'won' | 'lost' | 'abandoned';
    monetaryValue: number;
    assignedTo: string;
    customFields: Record<string, unknown>;
  }>
): Promise<GHLOpportunity> {
  logger.info({ opportunityId }, 'Updating GoHighLevel opportunity');

  const result = await makeGHLRequest<{ opportunity: GHLOpportunity }>(
    `/opportunities/${opportunityId}`,
    'PUT',
    data
  );

  logger.info({ opportunityId: result.opportunity.id }, 'GoHighLevel opportunity updated');
  return result.opportunity;
}

/**
 * Get opportunity by ID
 */
export async function getOpportunity(opportunityId: string): Promise<GHLOpportunity> {
  logger.info({ opportunityId }, 'Getting GoHighLevel opportunity');

  const result = await makeGHLRequest<{ opportunity: GHLOpportunity }>(
    `/opportunities/${opportunityId}`,
    'GET'
  );

  logger.info({ opportunityId: result.opportunity.id }, 'GoHighLevel opportunity retrieved');
  return result.opportunity;
}

/**
 * Search opportunities
 */
export async function searchOpportunities(
  pipelineId?: string,
  contactId?: string,
  status?: 'open' | 'won' | 'lost' | 'abandoned',
  limit: number = 20
): Promise<GHLOpportunity[]> {
  const locationId = GHL_LOCATION_ID;
  if (!locationId) {
    throw new Error('GHL_LOCATION_ID not configured');
  }

  logger.info({ pipelineId, contactId, status, limit }, 'Searching GoHighLevel opportunities');

  const queryParams = new URLSearchParams({
    locationId,
    limit: limit.toString(),
  });

  if (pipelineId) queryParams.append('pipelineId', pipelineId);
  if (contactId) queryParams.append('contactId', contactId);
  if (status) queryParams.append('status', status);

  const result = await makeGHLRequest<{ opportunities: GHLOpportunity[] }>(
    `/opportunities/search?${queryParams.toString()}`,
    'GET'
  );

  logger.info({ resultCount: result.opportunities?.length || 0 }, 'GoHighLevel opportunities search completed');
  return result.opportunities || [];
}

/**
 * Delete opportunity
 */
export async function deleteOpportunity(opportunityId: string): Promise<void> {
  logger.info({ opportunityId }, 'Deleting GoHighLevel opportunity');

  await makeGHLRequest(
    `/opportunities/${opportunityId}`,
    'DELETE'
  );

  logger.info({ opportunityId }, 'GoHighLevel opportunity deleted');
}

// ============================================================================
// APPOINTMENTS
// ============================================================================

/**
 * Create a new appointment
 */
export async function createAppointment(
  data: {
    calendarId: string;
    contactId: string;
    title: string;
    startTime: string; // ISO 8601 format
    endTime: string; // ISO 8601 format
    appointmentStatus?: string;
    assignedUserId?: string;
    notes?: string;
  }
): Promise<GHLAppointment> {
  const locationId = GHL_LOCATION_ID;
  if (!locationId) {
    throw new Error('GHL_LOCATION_ID not configured');
  }

  logger.info({ title: data.title, contactId: data.contactId }, 'Creating GoHighLevel appointment');

  const payload = {
    ...data,
    locationId,
  };

  const result = await makeGHLRequest<{ appointment: GHLAppointment }>(
    '/appointments/',
    'POST',
    payload
  );

  logger.info({ appointmentId: result.appointment.id }, 'GoHighLevel appointment created');
  return result.appointment;
}

/**
 * Update an existing appointment
 */
export async function updateAppointment(
  appointmentId: string,
  data: Partial<{
    title: string;
    startTime: string;
    endTime: string;
    appointmentStatus: string;
    assignedUserId: string;
    notes: string;
  }>
): Promise<GHLAppointment> {
  logger.info({ appointmentId }, 'Updating GoHighLevel appointment');

  const result = await makeGHLRequest<{ appointment: GHLAppointment }>(
    `/appointments/${appointmentId}`,
    'PUT',
    data
  );

  logger.info({ appointmentId: result.appointment.id }, 'GoHighLevel appointment updated');
  return result.appointment;
}

/**
 * Get appointment by ID
 */
export async function getAppointment(appointmentId: string): Promise<GHLAppointment> {
  logger.info({ appointmentId }, 'Getting GoHighLevel appointment');

  const result = await makeGHLRequest<{ appointment: GHLAppointment }>(
    `/appointments/${appointmentId}`,
    'GET'
  );

  logger.info({ appointmentId: result.appointment.id }, 'GoHighLevel appointment retrieved');
  return result.appointment;
}

/**
 * Delete appointment
 */
export async function deleteAppointment(appointmentId: string): Promise<void> {
  logger.info({ appointmentId }, 'Deleting GoHighLevel appointment');

  await makeGHLRequest(
    `/appointments/${appointmentId}`,
    'DELETE'
  );

  logger.info({ appointmentId }, 'GoHighLevel appointment deleted');
}

// ============================================================================
// TASKS
// ============================================================================

/**
 * Create a new task
 */
export async function createTask(
  data: {
    title: string;
    body?: string;
    contactId: string;
    assignedTo: string;
    dueDate?: string; // ISO 8601 format
  }
): Promise<GHLTask> {
  logger.info({ title: data.title, contactId: data.contactId }, 'Creating GoHighLevel task');

  const result = await makeGHLRequest<{ task: GHLTask }>(
    '/tasks/',
    'POST',
    { ...data, completed: false }
  );

  logger.info({ taskId: result.task.id }, 'GoHighLevel task created');
  return result.task;
}

/**
 * Update an existing task
 */
export async function updateTask(
  taskId: string,
  data: Partial<{
    title: string;
    body: string;
    assignedTo: string;
    dueDate: string;
    completed: boolean;
  }>
): Promise<GHLTask> {
  logger.info({ taskId }, 'Updating GoHighLevel task');

  const result = await makeGHLRequest<{ task: GHLTask }>(
    `/tasks/${taskId}`,
    'PUT',
    data
  );

  logger.info({ taskId: result.task.id }, 'GoHighLevel task updated');
  return result.task;
}

/**
 * Get task by ID
 */
export async function getTask(taskId: string): Promise<GHLTask> {
  logger.info({ taskId }, 'Getting GoHighLevel task');

  const result = await makeGHLRequest<{ task: GHLTask }>(
    `/tasks/${taskId}`,
    'GET'
  );

  logger.info({ taskId: result.task.id }, 'GoHighLevel task retrieved');
  return result.task;
}

/**
 * Delete task
 */
export async function deleteTask(taskId: string): Promise<void> {
  logger.info({ taskId }, 'Deleting GoHighLevel task');

  await makeGHLRequest(
    `/tasks/${taskId}`,
    'DELETE'
  );

  logger.info({ taskId }, 'GoHighLevel task deleted');
}

/**
 * Mark task as completed
 */
export async function completeTask(taskId: string): Promise<GHLTask> {
  return updateTask(taskId, { completed: true });
}

// ============================================================================
// NOTES
// ============================================================================

/**
 * Create a note for a contact
 */
export async function createNote(
  contactId: string,
  body: string,
  userId?: string
): Promise<GHLNote> {
  logger.info({ contactId }, 'Creating GoHighLevel note');

  const result = await makeGHLRequest<{ note: GHLNote }>(
    '/notes/',
    'POST',
    { contactId, body, userId }
  );

  logger.info({ noteId: result.note.id }, 'GoHighLevel note created');
  return result.note;
}

/**
 * Get note by ID
 */
export async function getNote(noteId: string): Promise<GHLNote> {
  logger.info({ noteId }, 'Getting GoHighLevel note');

  const result = await makeGHLRequest<{ note: GHLNote }>(
    `/notes/${noteId}`,
    'GET'
  );

  logger.info({ noteId: result.note.id }, 'GoHighLevel note retrieved');
  return result.note;
}

/**
 * Get all notes for a contact
 */
export async function getContactNotes(contactId: string): Promise<GHLNote[]> {
  logger.info({ contactId }, 'Getting GoHighLevel contact notes');

  const result = await makeGHLRequest<{ notes: GHLNote[] }>(
    `/contacts/${contactId}/notes`,
    'GET'
  );

  logger.info({ noteCount: result.notes?.length || 0 }, 'GoHighLevel contact notes retrieved');
  return result.notes || [];
}

/**
 * Delete note
 */
export async function deleteNote(noteId: string): Promise<void> {
  logger.info({ noteId }, 'Deleting GoHighLevel note');

  await makeGHLRequest(
    `/notes/${noteId}`,
    'DELETE'
  );

  logger.info({ noteId }, 'GoHighLevel note deleted');
}

// ============================================================================
// CONVERSATIONS & MESSAGES
// ============================================================================

/**
 * Send SMS message to a contact
 */
export async function sendSMS(
  contactId: string,
  message: string,
  type: 'SMS' = 'SMS'
): Promise<{ messageId: string; conversationId: string }> {
  logger.info({ contactId, type }, 'Sending SMS via GoHighLevel');

  const result = await makeGHLRequest<{ messageId: string; conversationId: string }>(
    '/conversations/messages',
    'POST',
    {
      type,
      contactId,
      message,
    }
  );

  logger.info({ messageId: result.messageId }, 'SMS sent via GoHighLevel');
  return result;
}

/**
 * Send email to a contact
 */
export async function sendEmail(
  contactId: string,
  subject: string,
  body: string,
  html?: string
): Promise<{ messageId: string; conversationId: string }> {
  logger.info({ contactId }, 'Sending email via GoHighLevel');

  const result = await makeGHLRequest<{ messageId: string; conversationId: string }>(
    '/conversations/messages',
    'POST',
    {
      type: 'Email',
      contactId,
      subject,
      message: body,
      html,
    }
  );

  logger.info({ messageId: result.messageId }, 'Email sent via GoHighLevel');
  return result;
}

/**
 * Get conversations for a contact
 */
export async function getContactConversations(contactId: string): Promise<unknown[]> {
  logger.info({ contactId }, 'Getting GoHighLevel contact conversations');

  const result = await makeGHLRequest<{ conversations: unknown[] }>(
    `/conversations/?contactId=${contactId}`,
    'GET'
  );

  logger.info({ conversationCount: result.conversations?.length || 0 }, 'GoHighLevel conversations retrieved');
  return result.conversations || [];
}

/**
 * Get messages in a conversation
 */
export async function getConversationMessages(
  conversationId: string,
  limit: number = 20
): Promise<unknown[]> {
  logger.info({ conversationId, limit }, 'Getting GoHighLevel conversation messages');

  const result = await makeGHLRequest<{ messages: unknown[] }>(
    `/conversations/${conversationId}/messages?limit=${limit}`,
    'GET'
  );

  logger.info({ messageCount: result.messages?.length || 0 }, 'GoHighLevel messages retrieved');
  return result.messages || [];
}
