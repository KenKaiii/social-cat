import { z } from 'zod';
import { createRateLimiter, withRateLimit } from '@/lib/rate-limiter';
import { createCircuitBreaker } from '@/lib/resilience';
import { logger } from '@/lib/logger';

const API_BASE_URL = 'https://api.todoist.com/rest/v2';

// Rate limiter - Todoist allows 450 requests per 15 minutes
const rateLimiter = createRateLimiter({
  maxConcurrent: 10,
  minTime: 2000, // 2 seconds between requests
  id: 'todoist'
});

// ============================================================================
// SHARED TYPES
// ============================================================================

const todoistTaskSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  section_id: z.string().nullable().optional(),
  content: z.string(),
  description: z.string(),
  is_completed: z.boolean(),
  labels: z.array(z.string()),
  parent_id: z.string().nullable().optional(),
  order: z.number(),
  priority: z.number(),
  due: z.object({
    date: z.string(),
    string: z.string(),
    datetime: z.string().optional(),
    timezone: z.string().optional(),
    is_recurring: z.boolean()
  }).nullable().optional(),
  url: z.string(),
  comment_count: z.number(),
  created_at: z.string(),
  creator_id: z.string(),
  assignee_id: z.string().nullable().optional(),
  assigner_id: z.string().nullable().optional()
});

const todoistProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  comment_count: z.number(),
  order: z.number(),
  color: z.string(),
  is_shared: z.boolean(),
  is_favorite: z.boolean(),
  parent_id: z.string().nullable().optional(),
  is_inbox_project: z.boolean(),
  is_team_inbox: z.boolean(),
  view_style: z.string(),
  url: z.string()
});

const todoistSectionSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  order: z.number(),
  name: z.string()
});

const todoistCommentSchema = z.object({
  id: z.string(),
  task_id: z.string().nullable().optional(),
  project_id: z.string().nullable().optional(),
  content: z.string(),
  posted_at: z.string(),
  attachment: z.object({
    file_name: z.string(),
    file_type: z.string(),
    file_url: z.string(),
    resource_type: z.string()
  }).nullable().optional()
});

const todoistLabelSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  order: z.number(),
  is_favorite: z.boolean()
});

// ============================================================================
// HELPER FUNCTION
// ============================================================================

async function todoistRequest(
  endpoint: string,
  apiKey: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: unknown
) {
  const url = `${API_BASE_URL}${endpoint}`;

  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  logger.info(`Todoist API request: ${method} ${url}`);

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Todoist API error (${response.status}): ${errorText}`);
  }

  // DELETE requests may return 204 No Content
  if (response.status === 204) {
    return { success: true };
  }

  return response.json();
}

// ============================================================================
// TASK OPERATIONS
// ============================================================================

/**
 * Get all active tasks
 * @example
 * const tasks = await getAllTasks({ apiKey: 'your-api-key' });
 */
const getAllTasksSchema = z.object({
  apiKey: z.string(),
  projectId: z.string().optional(),
  sectionId: z.string().optional(),
  label: z.string().optional(),
  filter: z.string().optional(),
  lang: z.string().optional()
});

async function getAllTasksInternal(input: z.infer<typeof getAllTasksSchema>) {
  const validated = getAllTasksSchema.parse(input);

  if (!validated.apiKey) {
    throw new Error('Todoist API key required. Add credentials in Settings.');
  }

  const params = new URLSearchParams();
  if (validated.projectId) params.append('project_id', validated.projectId);
  if (validated.sectionId) params.append('section_id', validated.sectionId);
  if (validated.label) params.append('label', validated.label);
  if (validated.filter) params.append('filter', validated.filter);
  if (validated.lang) params.append('lang', validated.lang);

  const queryString = params.toString();
  const endpoint = queryString ? `/tasks?${queryString}` : '/tasks';

  const tasks = await todoistRequest(endpoint, validated.apiKey);

  return z.array(todoistTaskSchema).parse(tasks);
}

const getAllTasksWithBreaker = createCircuitBreaker(getAllTasksInternal);
const getAllTasksRateLimited = withRateLimit(
  async (input: z.infer<typeof getAllTasksSchema>) => getAllTasksWithBreaker.fire(input),
  rateLimiter
);
export async function getAllTasks(input: z.infer<typeof getAllTasksSchema>) {
  return await getAllTasksRateLimited(input);
}

/**
 * Get a single task by ID
 * @example
 * const task = await getTask({ taskId: '123456', apiKey: 'your-api-key' });
 */
const getTaskSchema = z.object({
  taskId: z.string(),
  apiKey: z.string()
});

async function getTaskInternal(input: z.infer<typeof getTaskSchema>) {
  const validated = getTaskSchema.parse(input);

  if (!validated.apiKey) {
    throw new Error('Todoist API key required. Add credentials in Settings.');
  }

  const task = await todoistRequest(`/tasks/${validated.taskId}`, validated.apiKey);

  return todoistTaskSchema.parse(task);
}

const getTaskWithBreaker = createCircuitBreaker(getTaskInternal);
const getTaskRateLimited = withRateLimit(
  async (input: z.infer<typeof getTaskSchema>) => getTaskWithBreaker.fire(input),
  rateLimiter
);
export async function getTask(input: z.infer<typeof getTaskSchema>) {
  return await getTaskRateLimited(input);
}

/**
 * Create a new task
 * @example
 * const task = await createTask({
 *   content: 'Buy milk',
 *   description: 'Get 2% milk',
 *   priority: 4,
 *   dueString: 'tomorrow at 12:00',
 *   apiKey: 'your-api-key'
 * });
 */
const createTaskSchema = z.object({
  content: z.string(),
  description: z.string().optional(),
  projectId: z.string().optional(),
  sectionId: z.string().optional(),
  parentId: z.string().optional(),
  order: z.number().optional(),
  labels: z.array(z.string()).optional(),
  priority: z.number().min(1).max(4).optional(),
  dueString: z.string().optional(),
  dueDate: z.string().optional(),
  dueDatetime: z.string().optional(),
  dueLang: z.string().optional(),
  assigneeId: z.string().optional(),
  apiKey: z.string()
});

async function createTaskInternal(input: z.infer<typeof createTaskSchema>) {
  const validated = createTaskSchema.parse(input);

  if (!validated.apiKey) {
    throw new Error('Todoist API key required. Add credentials in Settings.');
  }

  const body: Record<string, unknown> = {
    content: validated.content
  };

  if (validated.description) body.description = validated.description;
  if (validated.projectId) body.project_id = validated.projectId;
  if (validated.sectionId) body.section_id = validated.sectionId;
  if (validated.parentId) body.parent_id = validated.parentId;
  if (validated.order) body.order = validated.order;
  if (validated.labels) body.labels = validated.labels;
  if (validated.priority) body.priority = validated.priority;
  if (validated.dueString) body.due_string = validated.dueString;
  if (validated.dueDate) body.due_date = validated.dueDate;
  if (validated.dueDatetime) body.due_datetime = validated.dueDatetime;
  if (validated.dueLang) body.due_lang = validated.dueLang;
  if (validated.assigneeId) body.assignee_id = validated.assigneeId;

  const task = await todoistRequest('/tasks', validated.apiKey, 'POST', body);

  return todoistTaskSchema.parse(task);
}

const createTaskWithBreaker = createCircuitBreaker(createTaskInternal);
const createTaskRateLimited = withRateLimit(
  async (input: z.infer<typeof createTaskSchema>) => createTaskWithBreaker.fire(input),
  rateLimiter
);
export async function createTask(input: z.infer<typeof createTaskSchema>) {
  return await createTaskRateLimited(input);
}

/**
 * Update an existing task
 * @example
 * const task = await updateTask({
 *   taskId: '123456',
 *   content: 'Buy milk and eggs',
 *   priority: 3,
 *   apiKey: 'your-api-key'
 * });
 */
const updateTaskSchema = z.object({
  taskId: z.string(),
  content: z.string().optional(),
  description: z.string().optional(),
  labels: z.array(z.string()).optional(),
  priority: z.number().min(1).max(4).optional(),
  dueString: z.string().optional(),
  dueDate: z.string().optional(),
  dueDatetime: z.string().optional(),
  dueLang: z.string().optional(),
  assigneeId: z.string().optional(),
  apiKey: z.string()
});

async function updateTaskInternal(input: z.infer<typeof updateTaskSchema>) {
  const validated = updateTaskSchema.parse(input);

  if (!validated.apiKey) {
    throw new Error('Todoist API key required. Add credentials in Settings.');
  }

  const body: Record<string, unknown> = {};

  if (validated.content) body.content = validated.content;
  if (validated.description) body.description = validated.description;
  if (validated.labels) body.labels = validated.labels;
  if (validated.priority) body.priority = validated.priority;
  if (validated.dueString) body.due_string = validated.dueString;
  if (validated.dueDate) body.due_date = validated.dueDate;
  if (validated.dueDatetime) body.due_datetime = validated.dueDatetime;
  if (validated.dueLang) body.due_lang = validated.dueLang;
  if (validated.assigneeId) body.assignee_id = validated.assigneeId;

  const task = await todoistRequest(`/tasks/${validated.taskId}`, validated.apiKey, 'POST', body);

  return todoistTaskSchema.parse(task);
}

const updateTaskWithBreaker = createCircuitBreaker(updateTaskInternal);
const updateTaskRateLimited = withRateLimit(
  async (input: z.infer<typeof updateTaskSchema>) => updateTaskWithBreaker.fire(input),
  rateLimiter
);
export async function updateTask(input: z.infer<typeof updateTaskSchema>) {
  return await updateTaskRateLimited(input);
}

/**
 * Close (complete) a task
 * @example
 * await closeTask({ taskId: '123456', apiKey: 'your-api-key' });
 */
const closeTaskSchema = z.object({
  taskId: z.string(),
  apiKey: z.string()
});

async function closeTaskInternal(input: z.infer<typeof closeTaskSchema>) {
  const validated = closeTaskSchema.parse(input);

  if (!validated.apiKey) {
    throw new Error('Todoist API key required. Add credentials in Settings.');
  }

  return todoistRequest(`/tasks/${validated.taskId}/close`, validated.apiKey, 'POST');
}

const closeTaskWithBreaker = createCircuitBreaker(closeTaskInternal);
const closeTaskRateLimited = withRateLimit(
  async (input: z.infer<typeof closeTaskSchema>) => closeTaskWithBreaker.fire(input),
  rateLimiter
);
export async function closeTask(input: z.infer<typeof closeTaskSchema>) {
  return await closeTaskRateLimited(input);
}

/**
 * Reopen a completed task
 * @example
 * await reopenTask({ taskId: '123456', apiKey: 'your-api-key' });
 */
const reopenTaskSchema = z.object({
  taskId: z.string(),
  apiKey: z.string()
});

async function reopenTaskInternal(input: z.infer<typeof reopenTaskSchema>) {
  const validated = reopenTaskSchema.parse(input);

  if (!validated.apiKey) {
    throw new Error('Todoist API key required. Add credentials in Settings.');
  }

  return todoistRequest(`/tasks/${validated.taskId}/reopen`, validated.apiKey, 'POST');
}

const reopenTaskWithBreaker = createCircuitBreaker(reopenTaskInternal);
const reopenTaskRateLimited = withRateLimit(
  async (input: z.infer<typeof reopenTaskSchema>) => reopenTaskWithBreaker.fire(input),
  rateLimiter
);
export async function reopenTask(input: z.infer<typeof reopenTaskSchema>) {
  return await reopenTaskRateLimited(input);
}

/**
 * Delete a task
 * @example
 * await deleteTask({ taskId: '123456', apiKey: 'your-api-key' });
 */
const deleteTaskSchema = z.object({
  taskId: z.string(),
  apiKey: z.string()
});

async function deleteTaskInternal(input: z.infer<typeof deleteTaskSchema>) {
  const validated = deleteTaskSchema.parse(input);

  if (!validated.apiKey) {
    throw new Error('Todoist API key required. Add credentials in Settings.');
  }

  return todoistRequest(`/tasks/${validated.taskId}`, validated.apiKey, 'DELETE');
}

const deleteTaskWithBreaker = createCircuitBreaker(deleteTaskInternal);
const deleteTaskRateLimited = withRateLimit(
  async (input: z.infer<typeof deleteTaskSchema>) => deleteTaskWithBreaker.fire(input),
  rateLimiter
);
export async function deleteTask(input: z.infer<typeof deleteTaskSchema>) {
  return await deleteTaskRateLimited(input);
}

// ============================================================================
// PROJECT OPERATIONS
// ============================================================================

/**
 * Get all projects
 * @example
 * const projects = await getAllProjects({ apiKey: 'your-api-key' });
 */
const getAllProjectsSchema = z.object({
  apiKey: z.string()
});

async function getAllProjectsInternal(input: z.infer<typeof getAllProjectsSchema>) {
  const validated = getAllProjectsSchema.parse(input);

  if (!validated.apiKey) {
    throw new Error('Todoist API key required. Add credentials in Settings.');
  }

  const projects = await todoistRequest('/projects', validated.apiKey);

  return z.array(todoistProjectSchema).parse(projects);
}

const getAllProjectsWithBreaker = createCircuitBreaker(getAllProjectsInternal);
const getAllProjectsRateLimited = withRateLimit(
  async (input: z.infer<typeof getAllProjectsSchema>) => getAllProjectsWithBreaker.fire(input),
  rateLimiter
);
export async function getAllProjects(input: z.infer<typeof getAllProjectsSchema>) {
  return await getAllProjectsRateLimited(input);
}

/**
 * Get a single project by ID
 * @example
 * const project = await getProject({ projectId: '123456', apiKey: 'your-api-key' });
 */
const getProjectSchema = z.object({
  projectId: z.string(),
  apiKey: z.string()
});

async function getProjectInternal(input: z.infer<typeof getProjectSchema>) {
  const validated = getProjectSchema.parse(input);

  if (!validated.apiKey) {
    throw new Error('Todoist API key required. Add credentials in Settings.');
  }

  const project = await todoistRequest(`/projects/${validated.projectId}`, validated.apiKey);

  return todoistProjectSchema.parse(project);
}

const getProjectWithBreaker = createCircuitBreaker(getProjectInternal);
const getProjectRateLimited = withRateLimit(
  async (input: z.infer<typeof getProjectSchema>) => getProjectWithBreaker.fire(input),
  rateLimiter
);
export async function getProject(input: z.infer<typeof getProjectSchema>) {
  return await getProjectRateLimited(input);
}

/**
 * Create a new project
 * @example
 * const project = await createProject({
 *   name: 'Work Projects',
 *   color: 'blue',
 *   isFavorite: true,
 *   apiKey: 'your-api-key'
 * });
 */
const createProjectSchema = z.object({
  name: z.string(),
  parentId: z.string().optional(),
  color: z.string().optional(),
  isFavorite: z.boolean().optional(),
  viewStyle: z.enum(['list', 'board']).optional(),
  apiKey: z.string()
});

async function createProjectInternal(input: z.infer<typeof createProjectSchema>) {
  const validated = createProjectSchema.parse(input);

  if (!validated.apiKey) {
    throw new Error('Todoist API key required. Add credentials in Settings.');
  }

  const body: Record<string, unknown> = {
    name: validated.name
  };

  if (validated.parentId) body.parent_id = validated.parentId;
  if (validated.color) body.color = validated.color;
  if (validated.isFavorite !== undefined) body.is_favorite = validated.isFavorite;
  if (validated.viewStyle) body.view_style = validated.viewStyle;

  const project = await todoistRequest('/projects', validated.apiKey, 'POST', body);

  return todoistProjectSchema.parse(project);
}

const createProjectWithBreaker = createCircuitBreaker(createProjectInternal);
const createProjectRateLimited = withRateLimit(
  async (input: z.infer<typeof createProjectSchema>) => createProjectWithBreaker.fire(input),
  rateLimiter
);
export async function createProject(input: z.infer<typeof createProjectSchema>) {
  return await createProjectRateLimited(input);
}

/**
 * Update an existing project
 * @example
 * const project = await updateProject({
 *   projectId: '123456',
 *   name: 'Updated Project Name',
 *   color: 'red',
 *   apiKey: 'your-api-key'
 * });
 */
const updateProjectSchema = z.object({
  projectId: z.string(),
  name: z.string().optional(),
  color: z.string().optional(),
  isFavorite: z.boolean().optional(),
  viewStyle: z.enum(['list', 'board']).optional(),
  apiKey: z.string()
});

async function updateProjectInternal(input: z.infer<typeof updateProjectSchema>) {
  const validated = updateProjectSchema.parse(input);

  if (!validated.apiKey) {
    throw new Error('Todoist API key required. Add credentials in Settings.');
  }

  const body: Record<string, unknown> = {};

  if (validated.name) body.name = validated.name;
  if (validated.color) body.color = validated.color;
  if (validated.isFavorite !== undefined) body.is_favorite = validated.isFavorite;
  if (validated.viewStyle) body.view_style = validated.viewStyle;

  const project = await todoistRequest(`/projects/${validated.projectId}`, validated.apiKey, 'POST', body);

  return todoistProjectSchema.parse(project);
}

const updateProjectWithBreaker = createCircuitBreaker(updateProjectInternal);
const updateProjectRateLimited = withRateLimit(
  async (input: z.infer<typeof updateProjectSchema>) => updateProjectWithBreaker.fire(input),
  rateLimiter
);
export async function updateProject(input: z.infer<typeof updateProjectSchema>) {
  return await updateProjectRateLimited(input);
}

/**
 * Delete a project
 * @example
 * await deleteProject({ projectId: '123456', apiKey: 'your-api-key' });
 */
const deleteProjectSchema = z.object({
  projectId: z.string(),
  apiKey: z.string()
});

async function deleteProjectInternal(input: z.infer<typeof deleteProjectSchema>) {
  const validated = deleteProjectSchema.parse(input);

  if (!validated.apiKey) {
    throw new Error('Todoist API key required. Add credentials in Settings.');
  }

  return todoistRequest(`/projects/${validated.projectId}`, validated.apiKey, 'DELETE');
}

const deleteProjectWithBreaker = createCircuitBreaker(deleteProjectInternal);
const deleteProjectRateLimited = withRateLimit(
  async (input: z.infer<typeof deleteProjectSchema>) => deleteProjectWithBreaker.fire(input),
  rateLimiter
);
export async function deleteProject(input: z.infer<typeof deleteProjectSchema>) {
  return await deleteProjectRateLimited(input);
}

// ============================================================================
// SECTION OPERATIONS
// ============================================================================

/**
 * Get all sections in a project
 * @example
 * const sections = await getAllSections({ projectId: '123456', apiKey: 'your-api-key' });
 */
const getAllSectionsSchema = z.object({
  projectId: z.string().optional(),
  apiKey: z.string()
});

async function getAllSectionsInternal(input: z.infer<typeof getAllSectionsSchema>) {
  const validated = getAllSectionsSchema.parse(input);

  if (!validated.apiKey) {
    throw new Error('Todoist API key required. Add credentials in Settings.');
  }

  const endpoint = validated.projectId
    ? `/sections?project_id=${validated.projectId}`
    : '/sections';

  const sections = await todoistRequest(endpoint, validated.apiKey);

  return z.array(todoistSectionSchema).parse(sections);
}

const getAllSectionsWithBreaker = createCircuitBreaker(getAllSectionsInternal);
const getAllSectionsRateLimited = withRateLimit(
  async (input: z.infer<typeof getAllSectionsSchema>) => getAllSectionsWithBreaker.fire(input),
  rateLimiter
);
export async function getAllSections(input: z.infer<typeof getAllSectionsSchema>) {
  return await getAllSectionsRateLimited(input);
}

/**
 * Get a single section by ID
 * @example
 * const section = await getSection({ sectionId: '123456', apiKey: 'your-api-key' });
 */
const getSectionSchema = z.object({
  sectionId: z.string(),
  apiKey: z.string()
});

async function getSectionInternal(input: z.infer<typeof getSectionSchema>) {
  const validated = getSectionSchema.parse(input);

  if (!validated.apiKey) {
    throw new Error('Todoist API key required. Add credentials in Settings.');
  }

  const section = await todoistRequest(`/sections/${validated.sectionId}`, validated.apiKey);

  return todoistSectionSchema.parse(section);
}

const getSectionWithBreaker = createCircuitBreaker(getSectionInternal);
const getSectionRateLimited = withRateLimit(
  async (input: z.infer<typeof getSectionSchema>) => getSectionWithBreaker.fire(input),
  rateLimiter
);
export async function getSection(input: z.infer<typeof getSectionSchema>) {
  return await getSectionRateLimited(input);
}

/**
 * Create a new section
 * @example
 * const section = await createSection({
 *   name: 'To Do',
 *   projectId: '123456',
 *   apiKey: 'your-api-key'
 * });
 */
const createSectionSchema = z.object({
  name: z.string(),
  projectId: z.string(),
  order: z.number().optional(),
  apiKey: z.string()
});

async function createSectionInternal(input: z.infer<typeof createSectionSchema>) {
  const validated = createSectionSchema.parse(input);

  if (!validated.apiKey) {
    throw new Error('Todoist API key required. Add credentials in Settings.');
  }

  const body: Record<string, unknown> = {
    name: validated.name,
    project_id: validated.projectId
  };

  if (validated.order) body.order = validated.order;

  const section = await todoistRequest('/sections', validated.apiKey, 'POST', body);

  return todoistSectionSchema.parse(section);
}

const createSectionWithBreaker = createCircuitBreaker(createSectionInternal);
const createSectionRateLimited = withRateLimit(
  async (input: z.infer<typeof createSectionSchema>) => createSectionWithBreaker.fire(input),
  rateLimiter
);
export async function createSection(input: z.infer<typeof createSectionSchema>) {
  return await createSectionRateLimited(input);
}

/**
 * Update an existing section
 * @example
 * const section = await updateSection({
 *   sectionId: '123456',
 *   name: 'In Progress',
 *   apiKey: 'your-api-key'
 * });
 */
const updateSectionSchema = z.object({
  sectionId: z.string(),
  name: z.string(),
  apiKey: z.string()
});

async function updateSectionInternal(input: z.infer<typeof updateSectionSchema>) {
  const validated = updateSectionSchema.parse(input);

  if (!validated.apiKey) {
    throw new Error('Todoist API key required. Add credentials in Settings.');
  }

  const body = {
    name: validated.name
  };

  const section = await todoistRequest(`/sections/${validated.sectionId}`, validated.apiKey, 'POST', body);

  return todoistSectionSchema.parse(section);
}

const updateSectionWithBreaker = createCircuitBreaker(updateSectionInternal);
const updateSectionRateLimited = withRateLimit(
  async (input: z.infer<typeof updateSectionSchema>) => updateSectionWithBreaker.fire(input),
  rateLimiter
);
export async function updateSection(input: z.infer<typeof updateSectionSchema>) {
  return await updateSectionRateLimited(input);
}

/**
 * Delete a section
 * @example
 * await deleteSection({ sectionId: '123456', apiKey: 'your-api-key' });
 */
const deleteSectionSchema = z.object({
  sectionId: z.string(),
  apiKey: z.string()
});

async function deleteSectionInternal(input: z.infer<typeof deleteSectionSchema>) {
  const validated = deleteSectionSchema.parse(input);

  if (!validated.apiKey) {
    throw new Error('Todoist API key required. Add credentials in Settings.');
  }

  return todoistRequest(`/sections/${validated.sectionId}`, validated.apiKey, 'DELETE');
}

const deleteSectionWithBreaker = createCircuitBreaker(deleteSectionInternal);
const deleteSectionRateLimited = withRateLimit(
  async (input: z.infer<typeof deleteSectionSchema>) => deleteSectionWithBreaker.fire(input),
  rateLimiter
);
export async function deleteSection(input: z.infer<typeof deleteSectionSchema>) {
  return await deleteSectionRateLimited(input);
}

// ============================================================================
// COMMENT OPERATIONS
// ============================================================================

/**
 * Get all comments for a task or project
 * @example
 * const comments = await getAllComments({ taskId: '123456', apiKey: 'your-api-key' });
 */
const getAllCommentsSchema = z.object({
  taskId: z.string().optional(),
  projectId: z.string().optional(),
  apiKey: z.string()
}).refine(data => data.taskId || data.projectId, {
  message: 'Either taskId or projectId must be provided'
});

async function getAllCommentsInternal(input: z.infer<typeof getAllCommentsSchema>) {
  const validated = getAllCommentsSchema.parse(input);

  if (!validated.apiKey) {
    throw new Error('Todoist API key required. Add credentials in Settings.');
  }

  const params = new URLSearchParams();
  if (validated.taskId) params.append('task_id', validated.taskId);
  if (validated.projectId) params.append('project_id', validated.projectId);

  const endpoint = `/comments?${params.toString()}`;
  const comments = await todoistRequest(endpoint, validated.apiKey);

  return z.array(todoistCommentSchema).parse(comments);
}

const getAllCommentsWithBreaker = createCircuitBreaker(getAllCommentsInternal);
const getAllCommentsRateLimited = withRateLimit(
  async (input: z.infer<typeof getAllCommentsSchema>) => getAllCommentsWithBreaker.fire(input),
  rateLimiter
);
export async function getAllComments(input: z.infer<typeof getAllCommentsSchema>) {
  return await getAllCommentsRateLimited(input);
}

/**
 * Get a single comment by ID
 * @example
 * const comment = await getComment({ commentId: '123456', apiKey: 'your-api-key' });
 */
const getCommentSchema = z.object({
  commentId: z.string(),
  apiKey: z.string()
});

async function getCommentInternal(input: z.infer<typeof getCommentSchema>) {
  const validated = getCommentSchema.parse(input);

  if (!validated.apiKey) {
    throw new Error('Todoist API key required. Add credentials in Settings.');
  }

  const comment = await todoistRequest(`/comments/${validated.commentId}`, validated.apiKey);

  return todoistCommentSchema.parse(comment);
}

const getCommentWithBreaker = createCircuitBreaker(getCommentInternal);
const getCommentRateLimited = withRateLimit(
  async (input: z.infer<typeof getCommentSchema>) => getCommentWithBreaker.fire(input),
  rateLimiter
);
export async function getComment(input: z.infer<typeof getCommentSchema>) {
  return await getCommentRateLimited(input);
}

/**
 * Create a new comment
 * @example
 * const comment = await createComment({
 *   taskId: '123456',
 *   content: 'Great progress!',
 *   apiKey: 'your-api-key'
 * });
 */
const createCommentSchema = z.object({
  taskId: z.string().optional(),
  projectId: z.string().optional(),
  content: z.string(),
  apiKey: z.string()
}).refine(data => data.taskId || data.projectId, {
  message: 'Either taskId or projectId must be provided'
});

async function createCommentInternal(input: z.infer<typeof createCommentSchema>) {
  const validated = createCommentSchema.parse(input);

  if (!validated.apiKey) {
    throw new Error('Todoist API key required. Add credentials in Settings.');
  }

  const body: Record<string, unknown> = {
    content: validated.content
  };

  if (validated.taskId) body.task_id = validated.taskId;
  if (validated.projectId) body.project_id = validated.projectId;

  const comment = await todoistRequest('/comments', validated.apiKey, 'POST', body);

  return todoistCommentSchema.parse(comment);
}

const createCommentWithBreaker = createCircuitBreaker(createCommentInternal);
const createCommentRateLimited = withRateLimit(
  async (input: z.infer<typeof createCommentSchema>) => createCommentWithBreaker.fire(input),
  rateLimiter
);
export async function createComment(input: z.infer<typeof createCommentSchema>) {
  return await createCommentRateLimited(input);
}

/**
 * Update an existing comment
 * @example
 * const comment = await updateComment({
 *   commentId: '123456',
 *   content: 'Updated comment text',
 *   apiKey: 'your-api-key'
 * });
 */
const updateCommentSchema = z.object({
  commentId: z.string(),
  content: z.string(),
  apiKey: z.string()
});

async function updateCommentInternal(input: z.infer<typeof updateCommentSchema>) {
  const validated = updateCommentSchema.parse(input);

  if (!validated.apiKey) {
    throw new Error('Todoist API key required. Add credentials in Settings.');
  }

  const body = {
    content: validated.content
  };

  const comment = await todoistRequest(`/comments/${validated.commentId}`, validated.apiKey, 'POST', body);

  return todoistCommentSchema.parse(comment);
}

const updateCommentWithBreaker = createCircuitBreaker(updateCommentInternal);
const updateCommentRateLimited = withRateLimit(
  async (input: z.infer<typeof updateCommentSchema>) => updateCommentWithBreaker.fire(input),
  rateLimiter
);
export async function updateComment(input: z.infer<typeof updateCommentSchema>) {
  return await updateCommentRateLimited(input);
}

/**
 * Delete a comment
 * @example
 * await deleteComment({ commentId: '123456', apiKey: 'your-api-key' });
 */
const deleteCommentSchema = z.object({
  commentId: z.string(),
  apiKey: z.string()
});

async function deleteCommentInternal(input: z.infer<typeof deleteCommentSchema>) {
  const validated = deleteCommentSchema.parse(input);

  if (!validated.apiKey) {
    throw new Error('Todoist API key required. Add credentials in Settings.');
  }

  return todoistRequest(`/comments/${validated.commentId}`, validated.apiKey, 'DELETE');
}

const deleteCommentWithBreaker = createCircuitBreaker(deleteCommentInternal);
const deleteCommentRateLimited = withRateLimit(
  async (input: z.infer<typeof deleteCommentSchema>) => deleteCommentWithBreaker.fire(input),
  rateLimiter
);
export async function deleteComment(input: z.infer<typeof deleteCommentSchema>) {
  return await deleteCommentRateLimited(input);
}

// ============================================================================
// LABEL OPERATIONS
// ============================================================================

/**
 * Get all personal labels
 * @example
 * const labels = await getAllLabels({ apiKey: 'your-api-key' });
 */
const getAllLabelsSchema = z.object({
  apiKey: z.string()
});

async function getAllLabelsInternal(input: z.infer<typeof getAllLabelsSchema>) {
  const validated = getAllLabelsSchema.parse(input);

  if (!validated.apiKey) {
    throw new Error('Todoist API key required. Add credentials in Settings.');
  }

  const labels = await todoistRequest('/labels', validated.apiKey);

  return z.array(todoistLabelSchema).parse(labels);
}

const getAllLabelsWithBreaker = createCircuitBreaker(getAllLabelsInternal);
const getAllLabelsRateLimited = withRateLimit(
  async (input: z.infer<typeof getAllLabelsSchema>) => getAllLabelsWithBreaker.fire(input),
  rateLimiter
);
export async function getAllLabels(input: z.infer<typeof getAllLabelsSchema>) {
  return await getAllLabelsRateLimited(input);
}

/**
 * Get a single label by ID
 * @example
 * const label = await getLabel({ labelId: '123456', apiKey: 'your-api-key' });
 */
const getLabelSchema = z.object({
  labelId: z.string(),
  apiKey: z.string()
});

async function getLabelInternal(input: z.infer<typeof getLabelSchema>) {
  const validated = getLabelSchema.parse(input);

  if (!validated.apiKey) {
    throw new Error('Todoist API key required. Add credentials in Settings.');
  }

  const label = await todoistRequest(`/labels/${validated.labelId}`, validated.apiKey);

  return todoistLabelSchema.parse(label);
}

const getLabelWithBreaker = createCircuitBreaker(getLabelInternal);
const getLabelRateLimited = withRateLimit(
  async (input: z.infer<typeof getLabelSchema>) => getLabelWithBreaker.fire(input),
  rateLimiter
);
export async function getLabel(input: z.infer<typeof getLabelSchema>) {
  return await getLabelRateLimited(input);
}

/**
 * Create a new personal label
 * @example
 * const label = await createLabel({
 *   name: 'Important',
 *   color: 'red',
 *   isFavorite: true,
 *   apiKey: 'your-api-key'
 * });
 */
const createLabelSchema = z.object({
  name: z.string(),
  color: z.string().optional(),
  order: z.number().optional(),
  isFavorite: z.boolean().optional(),
  apiKey: z.string()
});

async function createLabelInternal(input: z.infer<typeof createLabelSchema>) {
  const validated = createLabelSchema.parse(input);

  if (!validated.apiKey) {
    throw new Error('Todoist API key required. Add credentials in Settings.');
  }

  const body: Record<string, unknown> = {
    name: validated.name
  };

  if (validated.color) body.color = validated.color;
  if (validated.order !== undefined) body.order = validated.order;
  if (validated.isFavorite !== undefined) body.is_favorite = validated.isFavorite;

  const label = await todoistRequest('/labels', validated.apiKey, 'POST', body);

  return todoistLabelSchema.parse(label);
}

const createLabelWithBreaker = createCircuitBreaker(createLabelInternal);
const createLabelRateLimited = withRateLimit(
  async (input: z.infer<typeof createLabelSchema>) => createLabelWithBreaker.fire(input),
  rateLimiter
);
export async function createLabel(input: z.infer<typeof createLabelSchema>) {
  return await createLabelRateLimited(input);
}

/**
 * Update an existing label
 * @example
 * const label = await updateLabel({
 *   labelId: '123456',
 *   name: 'Very Important',
 *   color: 'orange',
 *   apiKey: 'your-api-key'
 * });
 */
const updateLabelSchema = z.object({
  labelId: z.string(),
  name: z.string().optional(),
  color: z.string().optional(),
  order: z.number().optional(),
  isFavorite: z.boolean().optional(),
  apiKey: z.string()
});

async function updateLabelInternal(input: z.infer<typeof updateLabelSchema>) {
  const validated = updateLabelSchema.parse(input);

  if (!validated.apiKey) {
    throw new Error('Todoist API key required. Add credentials in Settings.');
  }

  const body: Record<string, unknown> = {};

  if (validated.name) body.name = validated.name;
  if (validated.color) body.color = validated.color;
  if (validated.order !== undefined) body.order = validated.order;
  if (validated.isFavorite !== undefined) body.is_favorite = validated.isFavorite;

  const label = await todoistRequest(`/labels/${validated.labelId}`, validated.apiKey, 'POST', body);

  return todoistLabelSchema.parse(label);
}

const updateLabelWithBreaker = createCircuitBreaker(updateLabelInternal);
const updateLabelRateLimited = withRateLimit(
  async (input: z.infer<typeof updateLabelSchema>) => updateLabelWithBreaker.fire(input),
  rateLimiter
);
export async function updateLabel(input: z.infer<typeof updateLabelSchema>) {
  return await updateLabelRateLimited(input);
}

/**
 * Delete a personal label
 * @example
 * await deleteLabel({ labelId: '123456', apiKey: 'your-api-key' });
 */
const deleteLabelSchema = z.object({
  labelId: z.string(),
  apiKey: z.string()
});

async function deleteLabelInternal(input: z.infer<typeof deleteLabelSchema>) {
  const validated = deleteLabelSchema.parse(input);

  if (!validated.apiKey) {
    throw new Error('Todoist API key required. Add credentials in Settings.');
  }

  return todoistRequest(`/labels/${validated.labelId}`, validated.apiKey, 'DELETE');
}

const deleteLabelWithBreaker = createCircuitBreaker(deleteLabelInternal);
const deleteLabelRateLimited = withRateLimit(
  async (input: z.infer<typeof deleteLabelSchema>) => deleteLabelWithBreaker.fire(input),
  rateLimiter
);
export async function deleteLabel(input: z.infer<typeof deleteLabelSchema>) {
  return await deleteLabelRateLimited(input);
}
