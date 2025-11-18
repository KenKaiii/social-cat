'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { OutputRenderer } from './output-renderer';
import { formatDuration } from '@/lib/format-utils';

interface ExecutionResult {
  success: boolean;
  output?: unknown;
  error?: string;
  errorStep?: string;
  duration?: number;
}

interface ExecutionResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: ExecutionResult | null;
  workflowName: string;
}

export function ExecutionResultDialog({
  open,
  onOpenChange,
  result,
  workflowName,
}: ExecutionResultDialogProps) {
  if (!result) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto scrollbar-none">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {result.success ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            )}
            <DialogTitle>
              {result.success ? 'Execution Successful' : 'Execution Failed'}
            </DialogTitle>
          </div>
          <DialogDescription>{workflowName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <Badge
              variant={result.success ? 'gradient-success' : 'gradient-error'}
            >
              {result.success ? 'Success' : 'Error'}
            </Badge>
            {result.duration && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{formatDuration(result.duration)}</span>
              </div>
            )}
          </div>

          {/* Error Information */}
          {!result.success && result.error && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Error Details</h3>
              <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {result.error}
                </p>
                {result.errorStep && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Failed at step: {result.errorStep}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Output Data */}
          {result.success && result.output !== undefined && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Output</h3>
              <OutputRenderer output={result.output} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
