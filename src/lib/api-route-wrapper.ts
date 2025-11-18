import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, requireAuth as authRequireAuth } from '@/lib/auth';
import { logger } from '@/lib/logger';

/**
 * Standard API error response
 */
export interface ApiError {
  error: string;
  details?: string;
  code?: string;
}

/**
 * API route handler function type
 */
export type ApiRouteHandler = (
  request: NextRequest,
  context?: { params: Record<string, string> }
) => Promise<NextResponse>;

/**
 * Wraps an API route handler with consistent error handling
 *
 * @param handler - The API route handler function
 * @param options - Configuration options
 * @returns Wrapped handler with error handling
 *
 * @example
 * ```typescript
 * export const GET = withApiHandler(async (request) => {
 *   const data = await fetchData();
 *   return NextResponse.json({ data });
 * });
 * ```
 */
export function withApiHandler(
  handler: ApiRouteHandler,
  options?: {
    requireAuth?: boolean;
    allowedMethods?: string[];
  }
): ApiRouteHandler {
  return async (request: NextRequest, context?: { params: Record<string, string> }) => {
    try {
      // Method validation
      if (options?.allowedMethods && !options.allowedMethods.includes(request.method)) {
        return NextResponse.json(
          { error: `Method ${request.method} not allowed` } as ApiError,
          { status: 405 }
        );
      }

      // Auth check
      if (options?.requireAuth !== false) {
        const session = await getServerSession();
        if (!session?.user) {
          return NextResponse.json(
            { error: 'Unauthorized', code: 'auth_required' } as ApiError,
            { status: 401 }
          );
        }
      }

      // Execute handler
      return await handler(request, context);
    } catch (error) {
      // Log error with context
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          method: request.method,
          url: request.url,
        },
        'API route error'
      );

      // Handle specific error types
      if (error instanceof Error) {
        // Authorization errors
        if (error.message.startsWith('Unauthorized') || error.message.includes('permission')) {
          return NextResponse.json(
            { error: 'Unauthorized', details: error.message, code: 'unauthorized' } as ApiError,
            { status: 401 }
          );
        }

        // Validation errors
        if (error.message.includes('validation') || error.message.includes('invalid')) {
          return NextResponse.json(
            { error: 'Validation failed', details: error.message, code: 'validation_error' } as ApiError,
            { status: 400 }
          );
        }

        // Not found errors
        if (error.message.includes('not found')) {
          return NextResponse.json(
            { error: 'Not found', details: error.message, code: 'not_found' } as ApiError,
            { status: 404 }
          );
        }
      }

      // Generic server error
      return NextResponse.json(
        {
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error',
          code: 'internal_error',
        } as ApiError,
        { status: 500 }
      );
    }
  };
}

/**
 * Helper to require authentication in API routes
 */
export async function requireAuth() {
  return authRequireAuth();
}

/**
 * Helper to create success response
 */
export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Helper to create error response
 */
export function errorResponse(error: string, status: number = 500, details?: string) {
  return NextResponse.json(
    { error, details, code: `error_${status}` } as ApiError,
    { status }
  );
}
