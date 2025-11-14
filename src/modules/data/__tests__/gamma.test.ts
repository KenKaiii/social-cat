import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as gamma from '../gamma';

/**
 * Tests for data/gamma
 *
 * Tests basic module structure, exports, and error handling
 */

describe('gamma module', () => {
  beforeEach(() => {
    // Clear environment variables for consistent test state
    delete process.env.GAMMA_API_KEY;
  });

  it('should export all required functions', () => {
    expect(gamma).toBeDefined();
    expect(gamma.generateGamma).toBeDefined();
    expect(gamma.getGenerationStatus).toBeDefined();
    expect(gamma.waitForCompletion).toBeDefined();
  });

  it('should have correct function types', () => {
    expect(typeof gamma.generateGamma).toBe('function');
    expect(typeof gamma.getGenerationStatus).toBe('function');
    expect(typeof gamma.waitForCompletion).toBe('function');
  });

  describe('generateGamma', () => {
    it('should throw error when no API key is provided', async () => {
      await expect(
        gamma.generateGamma({
          inputText: 'Test content'
        })
      ).rejects.toThrow(/API key not found/);
    });

    it('should accept apiKey in options', async () => {
      // Mock fetch to avoid actual API calls
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          generationId: 'gen_123'
        })
      });

      const result = await gamma.generateGamma({
        apiKey: 'test_key',
        inputText: 'Test content',
        format: 'presentation'
      });

      expect(result).toBeDefined();
      expect(result.generationId).toBe('gen_123');
    });
  });

  describe('getGenerationStatus', () => {
    it('should throw error when no API key is provided', async () => {
      await expect(
        gamma.getGenerationStatus({
          generationId: 'gen_123'
        })
      ).rejects.toThrow(/API key not found/);
    });

    it('should accept apiKey in options', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          generationId: 'gen_123',
          status: 'completed',
          gammaUrl: 'https://gamma.app/test'
        })
      });

      const result = await gamma.getGenerationStatus({
        apiKey: 'test_key',
        generationId: 'gen_123'
      });

      expect(result).toBeDefined();
      expect(result.generationId).toBe('gen_123');
      expect(result.status).toBe('completed');
      expect(result.gammaUrl).toBe('https://gamma.app/test');
    });
  });

  describe('waitForCompletion', () => {
    it('should throw error when no API key is provided', async () => {
      await expect(
        gamma.waitForCompletion({
          generationId: 'gen_123',
          maxRetries: 1
        })
      ).rejects.toThrow(/API key not found/);
    });

    it('should return completed generation', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          generationId: 'gen_123',
          status: 'completed',
          gammaUrl: 'https://gamma.app/test'
        })
      });

      const result = await gamma.waitForCompletion({
        apiKey: 'test_key',
        generationId: 'gen_123',
        maxRetries: 1,
        retryDelayMs: 100
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.gammaUrl).toBe('https://gamma.app/test');
    });
  });
});
