'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    logger.error({ error }, 'Global error boundary triggered');
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center">
          <div className="text-center">
            <h1 className="text-5xl font-bold">500</h1>
            <p className="mt-4 text-xl">Something went wrong</p>
            <div className="mt-8">
              <button
                onClick={() => reset()}
                className="px-4 py-2 bg-black text-white border-none rounded-md cursor-pointer hover:opacity-90"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
