import { getModuleRegistry } from '@/lib/workflows/module-registry';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity score (0-100) between two strings
 */
function similarityScore(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 100;
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return Math.round(((maxLen - distance) / maxLen) * 100);
}

interface ModuleResult {
  path: string;
  description: string;
  signature: string;
  similarity?: number;
}

// GET /api/modules/search?q=keyword&limit=10
// Search for modules (no auth required for agent use)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase() || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    const registry = getModuleRegistry();
    const exactResults: ModuleResult[] = [];
    const allModules: ModuleResult[] = [];

    // Search through all categories and modules
    for (const category of registry) {
      for (const mod of category.modules) {
        for (const func of mod.functions) {
          const modulePath = `${category.name}.${mod.name}.${func.name}`;
          const searchText = `${modulePath} ${func.description} ${func.signature}`.toLowerCase();

          const moduleData: ModuleResult = {
            path: modulePath,
            description: func.description,
            signature: func.signature,
          };

          // Store all modules for suggestions
          allModules.push(moduleData);

          // Check for exact matches
          if (searchText.includes(query)) {
            exactResults.push(moduleData);

            if (exactResults.length >= limit) {
              return Response.json({
                results: exactResults,
                total: exactResults.length,
                suggestions: []
              });
            }
          }
        }
      }
    }

    // If no exact matches, provide fuzzy suggestions
    if (exactResults.length === 0 && query.length > 0) {
      const suggestions = allModules
        .map(mod => ({
          ...mod,
          similarity: similarityScore(query, mod.path),
        }))
        .filter(s => s.similarity > 30) // Only suggest if similarity > 30%
        .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
        .slice(0, 5);

      if (suggestions.length > 0) {
        return Response.json({
          results: [],
          total: 0,
          suggestions,
          message: `No exact matches for "${query}". Did you mean one of these?`
        });
      }
    }

    return Response.json({
      results: exactResults,
      total: exactResults.length,
      suggestions: []
    });
  } catch (error) {
    logger.error({ error }, 'Module search error');
    return new Response('Internal server error', { status: 500 });
  }
}
