import { describe, it, expect } from 'vitest';
import * as todoist from '@/modules/productivity/todoist';

describe('Todoist Module', () => {
  describe('Task Operations', () => {
    it('should export getAllTasks function', () => {
      expect(todoist.getAllTasks).toBeDefined();
      expect(typeof todoist.getAllTasks).toBe('function');
    });

    it('should export getTask function', () => {
      expect(todoist.getTask).toBeDefined();
      expect(typeof todoist.getTask).toBe('function');
    });

    it('should export createTask function', () => {
      expect(todoist.createTask).toBeDefined();
      expect(typeof todoist.createTask).toBe('function');
    });

    it('should export updateTask function', () => {
      expect(todoist.updateTask).toBeDefined();
      expect(typeof todoist.updateTask).toBe('function');
    });

    it('should export closeTask function', () => {
      expect(todoist.closeTask).toBeDefined();
      expect(typeof todoist.closeTask).toBe('function');
    });

    it('should export reopenTask function', () => {
      expect(todoist.reopenTask).toBeDefined();
      expect(typeof todoist.reopenTask).toBe('function');
    });

    it('should export deleteTask function', () => {
      expect(todoist.deleteTask).toBeDefined();
      expect(typeof todoist.deleteTask).toBe('function');
    });
  });

  describe('Project Operations', () => {
    it('should export getAllProjects function', () => {
      expect(todoist.getAllProjects).toBeDefined();
      expect(typeof todoist.getAllProjects).toBe('function');
    });

    it('should export getProject function', () => {
      expect(todoist.getProject).toBeDefined();
      expect(typeof todoist.getProject).toBe('function');
    });

    it('should export createProject function', () => {
      expect(todoist.createProject).toBeDefined();
      expect(typeof todoist.createProject).toBe('function');
    });

    it('should export updateProject function', () => {
      expect(todoist.updateProject).toBeDefined();
      expect(typeof todoist.updateProject).toBe('function');
    });

    it('should export deleteProject function', () => {
      expect(todoist.deleteProject).toBeDefined();
      expect(typeof todoist.deleteProject).toBe('function');
    });
  });

  describe('Section Operations', () => {
    it('should export getAllSections function', () => {
      expect(todoist.getAllSections).toBeDefined();
      expect(typeof todoist.getAllSections).toBe('function');
    });

    it('should export getSection function', () => {
      expect(todoist.getSection).toBeDefined();
      expect(typeof todoist.getSection).toBe('function');
    });

    it('should export createSection function', () => {
      expect(todoist.createSection).toBeDefined();
      expect(typeof todoist.createSection).toBe('function');
    });

    it('should export updateSection function', () => {
      expect(todoist.updateSection).toBeDefined();
      expect(typeof todoist.updateSection).toBe('function');
    });

    it('should export deleteSection function', () => {
      expect(todoist.deleteSection).toBeDefined();
      expect(typeof todoist.deleteSection).toBe('function');
    });
  });

  describe('Comment Operations', () => {
    it('should export getAllComments function', () => {
      expect(todoist.getAllComments).toBeDefined();
      expect(typeof todoist.getAllComments).toBe('function');
    });

    it('should export getComment function', () => {
      expect(todoist.getComment).toBeDefined();
      expect(typeof todoist.getComment).toBe('function');
    });

    it('should export createComment function', () => {
      expect(todoist.createComment).toBeDefined();
      expect(typeof todoist.createComment).toBe('function');
    });

    it('should export updateComment function', () => {
      expect(todoist.updateComment).toBeDefined();
      expect(typeof todoist.updateComment).toBe('function');
    });

    it('should export deleteComment function', () => {
      expect(todoist.deleteComment).toBeDefined();
      expect(typeof todoist.deleteComment).toBe('function');
    });
  });

  describe('Label Operations', () => {
    it('should export getAllLabels function', () => {
      expect(todoist.getAllLabels).toBeDefined();
      expect(typeof todoist.getAllLabels).toBe('function');
    });

    it('should export getLabel function', () => {
      expect(todoist.getLabel).toBeDefined();
      expect(typeof todoist.getLabel).toBe('function');
    });

    it('should export createLabel function', () => {
      expect(todoist.createLabel).toBeDefined();
      expect(typeof todoist.createLabel).toBe('function');
    });

    it('should export updateLabel function', () => {
      expect(todoist.updateLabel).toBeDefined();
      expect(typeof todoist.updateLabel).toBe('function');
    });

    it('should export deleteLabel function', () => {
      expect(todoist.deleteLabel).toBeDefined();
      expect(typeof todoist.deleteLabel).toBe('function');
    });
  });

  describe('Module Integration', () => {
    it('should have all 27 functions exported', () => {
      const exports = Object.keys(todoist);
      expect(exports.length).toBeGreaterThanOrEqual(27);
    });
  });
});
