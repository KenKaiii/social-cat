import { describe, it, expect } from 'vitest';
import { validateWorkflowExport } from '@/lib/workflows/import-export';
import testWorkflow from '../fixtures/test-todoist-workflow.json';

describe('Todoist Workflow Validation', () => {
  it('should validate Todoist test workflow', () => {
    const result = validateWorkflowExport(testWorkflow);

    if (!result.valid) {
      console.error('Validation errors:', result.errors);
    }

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should have correct module paths for Todoist', () => {
    const steps = testWorkflow.config.steps;

    expect(steps[0].module).toBe('productivity.todoist.createTask');
    expect(steps[1].module).toBe('productivity.todoist.getAllTasks');
    expect(steps[2].module).toBe('productivity.todoist.createProject');
  });

  it('should reference credential placeholder correctly', () => {
    const steps = testWorkflow.config.steps;

    steps.forEach(step => {
      expect(step.inputs.apiKey).toBe('{{credential.todoist}}');
    });
  });

  it('should have proper output variables', () => {
    const steps = testWorkflow.config.steps;

    expect(steps[0].outputAs).toBe('taskResult');
    expect(steps[1].outputAs).toBe('allTasks');
    expect(steps[2].outputAs).toBe('projectResult');
  });

  it('should have output display configuration', () => {
    expect(testWorkflow.config.outputDisplay).toBeDefined();
    expect(testWorkflow.config.outputDisplay.type).toBe('json');
    expect(testWorkflow.config.outputDisplay.value).toBe('{{taskResult}}');
  });
});
