'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    logger.error({ error }, 'Application error boundary triggered');
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold">500</h1>
        <p className="mt-4 text-xl text-muted-foreground">Something went wrong</p>
        <p className="mt-2 text-sm text-muted-foreground">
          An error occurred while processing your request.
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
