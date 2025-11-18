'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { WorkflowCredentialsStatus } from './workflow-credentials-status';
import { logger } from '@/lib/logger';

interface CredentialsConfigDialogProps {
  workflowId: string;
  workflowName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CredentialsConfigDialog({
  workflowId,
  workflowName,
  open,
  onOpenChange,
}: CredentialsConfigDialogProps) {
  const [hasCredentials, setHasCredentials] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;

    const checkCredentials = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/workflows/${workflowId}/credentials`);
        if (response.ok) {
          const data = await response.json();
          setHasCredentials(data.credentials && data.credentials.length > 0);
        }
      } catch (error) {
        logger.error({ error }, 'Failed to check credentials');
      } finally {
        setLoading(false);
      }
    };

    checkCredentials();
  }, [workflowId, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] scrollbar-none">
        <DialogHeader>
          <DialogTitle className="text-foreground">Credentials & API Keys: {workflowName}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Configure OAuth connections and API keys required for this workflow.
            Select which accounts or keys to use for each platform.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 scrollbar-none">
          {loading ? (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Required Credentials:</div>
              <div className="space-y-1.5">
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            </div>
          ) : hasCredentials === false ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">
                No external credentials required for this workflow.
              </p>
            </div>
          ) : (
            <WorkflowCredentialsStatus workflowId={workflowId} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
