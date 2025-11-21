import { describe, it, expect } from 'vitest';
import * as productivity from '@/modules/productivity';

describe('Todoist Module Registry', () => {
  it('should be accessible through productivity namespace', () => {
    expect(productivity.todoist).toBeDefined();
  });

  it('should export all task functions through namespace', () => {
    expect(productivity.todoist.getAllTasks).toBeDefined();
    expect(productivity.todoist.getTask).toBeDefined();
    expect(productivity.todoist.createTask).toBeDefined();
    expect(productivity.todoist.updateTask).toBeDefined();
    expect(productivity.todoist.closeTask).toBeDefined();
    expect(productivity.todoist.reopenTask).toBeDefined();
    expect(productivity.todoist.deleteTask).toBeDefined();
  });

  it('should export all project functions through namespace', () => {
    expect(productivity.todoist.getAllProjects).toBeDefined();
    expect(productivity.todoist.getProject).toBeDefined();
    expect(productivity.todoist.createProject).toBeDefined();
    expect(productivity.todoist.updateProject).toBeDefined();
    expect(productivity.todoist.deleteProject).toBeDefined();
  });

  it('should export all section functions through namespace', () => {
    expect(productivity.todoist.getAllSections).toBeDefined();
    expect(productivity.todoist.getSection).toBeDefined();
    expect(productivity.todoist.createSection).toBeDefined();
    expect(productivity.todoist.updateSection).toBeDefined();
    expect(productivity.todoist.deleteSection).toBeDefined();
  });

  it('should export all comment functions through namespace', () => {
    expect(productivity.todoist.getAllComments).toBeDefined();
    expect(productivity.todoist.getComment).toBeDefined();
    expect(productivity.todoist.createComment).toBeDefined();
    expect(productivity.todoist.updateComment).toBeDefined();
    expect(productivity.todoist.deleteComment).toBeDefined();
  });

  it('should export all label functions through namespace', () => {
    expect(productivity.todoist.getAllLabels).toBeDefined();
    expect(productivity.todoist.getLabel).toBeDefined();
    expect(productivity.todoist.createLabel).toBeDefined();
    expect(productivity.todoist.updateLabel).toBeDefined();
    expect(productivity.todoist.deleteLabel).toBeDefined();
  });
});
