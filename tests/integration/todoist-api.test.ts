import { describe, it, expect } from 'vitest';
import * as todoist from '@/modules/productivity/todoist';

// Integration test with real Todoist API
// This test will create and clean up real data in Todoist
// Set TODOIST_API_KEY environment variable to run these tests
describe('Todoist API Integration', () => {
  const API_KEY = process.env.TODOIST_API_KEY || '';

  let createdTaskId: string | undefined;
  let createdProjectId: string | undefined;

  // Skip all tests if API key is not provided
  if (!API_KEY) {
    it.skip('Todoist API key not provided - skipping integration tests', () => {
      expect(true).toBe(true);
    });
    return;
  }

  it('should create a task', async () => {
    const result = await todoist.createTask({
      content: '[B0T TEST] Integration test task - safe to delete',
      description: 'This task was created by b0t integration test',
      priority: 1,
      apiKey: API_KEY
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.content).toBe('[B0T TEST] Integration test task - safe to delete');

    createdTaskId = result.id;
    console.log('✓ Created task:', result.id);
  }, 10000);

  it('should get all tasks', async () => {
    const result = await todoist.getAllTasks({
      apiKey: API_KEY
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    console.log('✓ Retrieved', result.length, 'tasks');
  }, 10000);

  it('should get the created task by ID', async () => {
    if (!createdTaskId) {
      throw new Error('No task ID from previous test');
    }

    const result = await todoist.getTask({
      taskId: createdTaskId,
      apiKey: API_KEY
    });

    expect(result).toBeDefined();
    expect(result.id).toBe(createdTaskId);
    expect(result.content).toBe('[B0T TEST] Integration test task - safe to delete');

    console.log('✓ Retrieved task by ID:', result.id);
  }, 10000);

  it('should update the task', async () => {
    if (!createdTaskId) {
      throw new Error('No task ID from previous test');
    }

    const result = await todoist.updateTask({
      taskId: createdTaskId,
      content: '[B0T TEST] UPDATED - Integration test task',
      priority: 2,
      apiKey: API_KEY
    });

    expect(result).toBeDefined();
    expect(result.id).toBe(createdTaskId);
    expect(result.content).toBe('[B0T TEST] UPDATED - Integration test task');
    expect(result.priority).toBe(2);

    console.log('✓ Updated task:', result.id);
  }, 10000);

  it('should create a project', async () => {
    const result = await todoist.createProject({
      name: '[B0T TEST] Integration test project',
      color: 'blue',
      apiKey: API_KEY
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.name).toBe('[B0T TEST] Integration test project');

    createdProjectId = result.id;
    console.log('✓ Created project:', result.id);
  }, 10000);

  it('should get all projects', async () => {
    const result = await todoist.getAllProjects({
      apiKey: API_KEY
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    console.log('✓ Retrieved', result.length, 'projects');
  }, 10000);

  // Cleanup: Close the task
  it('should close the task', async () => {
    if (!createdTaskId) {
      throw new Error('No task ID from previous test');
    }

    const result = await todoist.closeTask({
      taskId: createdTaskId,
      apiKey: API_KEY
    });

    expect(result).toBeDefined();
    console.log('✓ Closed task:', createdTaskId);
  }, 10000);

  // Cleanup: Delete the project
  it('should delete the project', async () => {
    if (!createdProjectId) {
      throw new Error('No project ID from previous test');
    }

    const result = await todoist.deleteProject({
      projectId: createdProjectId,
      apiKey: API_KEY
    });

    expect(result).toBeDefined();
    console.log('✓ Deleted project:', createdProjectId);
  }, 10000);

  it('should verify cleanup - task should be completed', async () => {
    if (!createdTaskId) {
      throw new Error('No task ID from previous test');
    }

    const result = await todoist.getTask({
      taskId: createdTaskId,
      apiKey: API_KEY
    });

    // Task should still exist but be completed
    expect(result).toBeDefined();
    expect(result.is_completed).toBe(true);

    console.log('✓ Verified task is completed');
  }, 10000);
});
