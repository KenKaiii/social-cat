import { type Tool } from 'ai';
import { z } from 'zod';
import { logger } from '@/lib/logger';

/**
 * Agent Tools Library
 *
 * Curated, well-defined tools specifically designed for AI agents.
 * Each tool has:
 * - Clear, detailed descriptions
 * - Proper type schemas with validation
 * - Simplified interfaces returning plain data
 * - Robust error handling
 *
 * These tools wrap existing modules but provide AI-friendly interfaces.
 */

// ============================================================================
// WEB & CONTENT TOOLS
// ============================================================================

/**
 * Fetch and extract text content from a web page
 */
export const fetchWebPageTool: Tool = {
  description: `Fetch and extract the main text content from any web page URL.
Returns the page title and full text content. Use this to read articles, blog posts, documentation, or any web content.
Examples: news articles, documentation pages, blog posts, product pages.`,
  inputSchema: z.object({
    url: z.string().url().describe('The full URL to fetch (must start with http:// or https://)'),
  }),
  execute: async (params) => {
    // Extract url from params - handle both direct string and object format
    const url = typeof params === 'string' ? params : (params as { url: string }).url;

    try {
      logger.info({ url }, 'Agent tool: Fetching web page');

      // Dynamic import to avoid circular dependencies
      const { fetchHtml } = await import('@/modules/utilities/scraper');

      const $ = await fetchHtml(url);

      // Extract meaningful content
      const title = $('title').text().trim() || 'No title';

      // Try to get main content from common content containers
      const contentSelectors = [
        'article',
        'main',
        '[role="main"]',
        '.content',
        '.post-content',
        '.article-content',
        '#content',
        'body'
      ];

      let text = '';
      for (const selector of contentSelectors) {
        const content = $(selector).first();
        if (content.length > 0) {
          // Remove script and style tags
          content.find('script, style, nav, header, footer, .ad, .advertisement').remove();
          text = content.text().trim();
          if (text.length > 100) break; // Found substantial content
        }
      }

      // Fallback to body if nothing found
      if (!text || text.length < 100) {
        $('body').find('script, style, nav, header, footer').remove();
        text = $('body').text().trim();
      }

      // Clean up whitespace
      text = text.replace(/\s+/g, ' ').trim();

      logger.info({ url, titleLength: title.length, textLength: text.length }, 'Web page fetched successfully');

      return {
        success: true,
        url,
        title,
        text,
        textLength: text.length,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ url, error: errorMessage }, 'Failed to fetch web page');

      return {
        success: false,
        url,
        error: errorMessage,
      };
    }
  },
};

// ============================================================================
// AI & GENERATION TOOLS
// ============================================================================

/**
 * Generate text using an AI model
 */
export const generateTextTool: Tool = {
  description: `Generate text using an AI language model.
Use this for writing, brainstorming, analysis, or any text generation task.
Supports any OpenAI or Anthropic model with configurable temperature and max tokens.`,
  inputSchema: z.object({
    prompt: z.string().min(1).describe('The prompt or instruction for text generation'),
    model: z.string().optional().describe('AI model to use (e.g., gpt-4o, gpt-4o-mini, claude-3-5-sonnet-20241022). Default: gpt-4o-mini'),
    temperature: z.number().min(0).max(2).optional().describe('Creativity level 0-2, higher = more creative (default: 0.7)'),
    maxTokens: z.number().min(1).max(4096).optional().describe('Maximum length of response in tokens (default: 1000)'),
  }),
  execute: async (params) => {
    const { prompt, model = 'gpt-4o-mini', temperature = 0.7, maxTokens = 1000 } = params as {
      prompt: string;
      model?: string;
      temperature?: number;
      maxTokens?: number;
    };

    try {
      logger.info({ model, promptLength: prompt.length }, 'Agent tool: Generating text');

      const { generateText: aiGenerateText } = await import('./ai-sdk');

      const result = await aiGenerateText({
        prompt,
        model,
        temperature,
        maxTokens,
      });

      logger.info({ model, responseLength: result.content.length }, 'Text generation completed');

      return {
        success: true,
        text: result.content,
        model,
        usage: result.usage,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ model, error: errorMessage }, 'Text generation failed');

      return {
        success: false,
        error: errorMessage,
      };
    }
  },
};

// ============================================================================
// COMMUNICATION TOOLS
// ============================================================================

// ============================================================================
// DATA & UTILITIES TOOLS
// ============================================================================

/**
 * Get current date and time
 */
export const getCurrentDateTimeTool: Tool = {
  description: `Get the current date and time in various formats.
Use this when you need to know what time it is, what day it is, or need timestamps.
Returns ISO format, human-readable format, and Unix timestamp.`,
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const now = new Date();

      return {
        success: true,
        iso: now.toISOString(),
        humanReadable: now.toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZoneName: 'short',
        }),
        unix: Math.floor(now.getTime() / 1000),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
};

/**
 * Perform calculations
 */
export const calculateTool: Tool = {
  description: `Perform mathematical calculations safely.
Supports basic arithmetic, percentages, powers, and common math functions.
Use this for any mathematical operations or computations.`,
  inputSchema: z.object({
    expression: z.string().min(1).describe('Mathematical expression to evaluate (e.g., "2 + 2", "sqrt(16)", "10 * 5 + 3")'),
  }),
  execute: async (params) => {
    const { expression } = params as { expression: string };

    try {
      logger.info({ expression }, 'Agent tool: Calculating');

      // Safe evaluation - only allow math operations
      // Remove any dangerous operations
      const sanitized = expression.replace(/[^0-9+\-*/().,\s]/g, '');

      // Use Function constructor for safe evaluation
      const result = Function('"use strict"; return (' + sanitized + ')')();

      logger.info({ expression, result }, 'Calculation completed');

      return {
        success: true,
        expression,
        result: Number(result),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ expression, error: errorMessage }, 'Calculation failed');

      return {
        success: false,
        expression,
        error: errorMessage,
      };
    }
  },
};

// ============================================================================
// TOOL REGISTRY
// ============================================================================

/**
 * All available agent tools
 */
export const agentToolsLibrary: Record<string, Tool> = {
  // Web & Content
  fetchWebPage: fetchWebPageTool,
  // searchWeb: searchWebTool, // TODO: Enable when serper module is available

  // AI & Generation
  generateText: generateTextTool,
  // generateImage: generateImageTool, // TODO: Enable when DALL-E module is available

  // Communication
  // sendEmail: sendEmailTool, // TODO: Enable when Resend module is available

  // Data & Utilities
  getCurrentDateTime: getCurrentDateTimeTool,
  calculate: calculateTool,
};

/**
 * Get agent tools by category
 */
export function getAgentToolsByCategory(categories: string[]): Record<string, Tool> {
  const categoryMap: Record<string, string[]> = {
    web: ['fetchWebPage'], // 'searchWeb' when available
    ai: ['generateText'], // 'generateImage' when available
    communication: [], // 'sendEmail' when available
    utilities: ['getCurrentDateTime', 'calculate'],
  };

  const tools: Record<string, Tool> = {};

  for (const category of categories) {
    const toolNames = categoryMap[category.toLowerCase()] || [];
    for (const toolName of toolNames) {
      if (agentToolsLibrary[toolName]) {
        tools[toolName] = agentToolsLibrary[toolName];
      }
    }
  }

  return tools;
}

/**
 * Get specific tools by name
 */
export function getAgentTools(toolNames: string[]): Record<string, Tool> {
  const tools: Record<string, Tool> = {};

  for (const toolName of toolNames) {
    if (agentToolsLibrary[toolName]) {
      tools[toolName] = agentToolsLibrary[toolName];
    }
  }

  return tools;
}

/**
 * Get all agent tools
 */
export function getAllAgentTools(): Record<string, Tool> {
  return { ...agentToolsLibrary };
}

/**
 * Get MCP tools for agents
 * This function dynamically loads tools from connected MCP servers
 * and automatically connects to servers that aren't already connected
 */
export async function getMCPAgentTools(mcpServers?: string[]): Promise<Record<string, Tool>> {
  try {
    // Dynamic import to avoid circular dependencies
    const { getMCPTools, getAllMCPTools, getMCPClient, connectToMCPServer } = await import(
      '@/lib/mcp/client'
    );
    const { MCP_SERVER_CONFIGS } = await import('@/lib/mcp/server-configs');

    // If specific servers are requested, connect to them if needed
    if (mcpServers && mcpServers.length > 0) {
      logger.info({ mcpServers }, 'Connecting to requested MCP servers');

      // Connect to each server if not already connected
      for (const serverName of mcpServers) {
        const existingClient = getMCPClient(serverName);

        if (!existingClient) {
          const serverConfig = MCP_SERVER_CONFIGS[serverName];

          if (!serverConfig) {
            logger.warn({ serverName }, 'MCP server config not found');
            continue;
          }

          try {
            logger.info({ serverName }, 'Connecting to MCP server');
            await connectToMCPServer(serverConfig);
            logger.info({ serverName }, 'Successfully connected to MCP server');
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error({ serverName, error: errorMessage }, 'Failed to connect to MCP server');
          }
        } else {
          logger.info({ serverName }, 'MCP server already connected');
        }
      }

      return getMCPTools(mcpServers);
    }

    return getAllMCPTools();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage }, 'Failed to load MCP tools');
    return {};
  }
}
