'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, XCircle } from 'lucide-react';
import { OutputRenderer } from './output-renderer';
import { logger } from '@/lib/logger';
import { formatDuration, formatDate } from '@/lib/format-utils';

interface WorkflowRun {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
  error: string | null;
  errorStep: string | null;
  output: unknown;
  triggerType: string;
}

interface ExecutionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId: string;
  workflowName: string;
}

export function ExecutionHistoryDialog({
  open,
  onOpenChange,
  workflowId,
  workflowName,
}: ExecutionHistoryDialogProps) {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && workflowId) {
      fetchRuns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, workflowId]);

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/workflows/${workflowId}/runs`);
      if (response.ok) {
        const data = await response.json();
        setRuns(data.runs || []);
      }
    } catch (error) {
      logger.error({ error }, 'Failed to fetch workflow runs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto scrollbar-none">
        <DialogHeader>
          <DialogTitle>Execution History</DialogTitle>
          <DialogDescription>{workflowName}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading execution history...
          </div>
        ) : runs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No executions yet
          </div>
        ) : (
          <div className="space-y-3">
            {runs.map((run) => (
              <div
                key={run.id}
                className="rounded-lg border border-border/50 bg-surface/50 p-4 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {run.status === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : run.status === 'error' ? (
                      <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    ) : (
                      <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    )}
                    <Badge
                      variant={
                        run.status === 'success'
                          ? 'gradient-success'
                          : run.status === 'error'
                            ? 'gradient-error'
                            : 'gradient-active'
                      }
                    >
                      {run.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDuration(run.duration)}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(run.startedAt)}
                  </span>
                </div>

                {run.error && (
                  <div className="text-sm text-red-600 dark:text-red-400">
                    {run.error}
                    {run.errorStep && (
                      <span className="text-xs text-muted-foreground ml-2">
                        (at {run.errorStep})
                      </span>
                    )}
                  </div>
                )}

                {run.output ? (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      View output
                    </summary>
                    <div className="mt-2">
                      <OutputRenderer output={run.output} />
                    </div>
                  </details>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
