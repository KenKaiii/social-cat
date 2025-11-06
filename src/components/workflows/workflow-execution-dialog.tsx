'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Play, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ChatTriggerConfig } from './trigger-configs/chat-trigger-config';
import { WebhookTriggerConfig } from './trigger-configs/webhook-trigger-config';
import { RunOutputModal } from './run-output-modal';

interface WorkflowExecutionDialogProps {
  workflowId: string;
  workflowName: string;
  workflowDescription?: string;
  workflowConfig?: Record<string, unknown>;
  triggerType: 'manual' | 'cron' | 'webhook' | 'telegram' | 'discord' | 'chat';
  triggerConfig?: Record<string, unknown>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExecuted?: () => void;
}

interface ExecutionResult {
  id: string;
  status: 'success' | 'error' | 'running';
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
  output: unknown;
  error: string | null;
  errorStep: string | null;
  triggerType: string;
}

export function WorkflowExecutionDialog({
  workflowId,
  workflowName,
  workflowDescription,
  workflowConfig,
  triggerType,
  open,
  onOpenChange,
  onExecuted,
}: WorkflowExecutionDialogProps) {
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [showOutputModal, setShowOutputModal] = useState(false);
  const [triggerData, setTriggerData] = useState<Record<string, unknown>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setExecutionResult(null);
      setTriggerData({});
      setShowOutputModal(false);
    }
  }, [open]);

  const handleExecute = useCallback(async (data?: Record<string, unknown>) => {
    setExecuting(true);
    setExecutionResult(null);

    try {
      const response = await fetch(`/api/workflows/${workflowId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggerData: data || triggerData }),
      });

      const responseData = await response.json();

      if (response.ok) {
        // Fetch the latest run to get full details
        const runsResponse = await fetch(`/api/workflows/${workflowId}/runs?limit=1`);
        const runsData = await runsResponse.json();

        if (runsData.runs && runsData.runs.length > 0) {
          setExecutionResult(runsData.runs[0]);
        }

        toast.success('Workflow executed successfully');
        onExecuted?.();
      } else {
        // Create error result
        setExecutionResult({
          id: 'error',
          status: 'error',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          duration: 0,
          output: null,
          error: responseData.error || 'Workflow execution failed',
          errorStep: null,
          triggerType: 'manual',
        });
        toast.error(responseData.error || 'Workflow execution failed');
      }
    } catch (error) {
      console.error('Execution error:', error);
      setExecutionResult({
        id: 'error',
        status: 'error',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        duration: 0,
        output: null,
        error: 'Failed to execute workflow',
        errorStep: null,
        triggerType: 'manual',
      });
      toast.error('Failed to execute workflow');
    } finally {
      setExecuting(false);
    }
  }, [workflowId, triggerData, onExecuted]);

  const getTriggerDescription = () => {
    switch (triggerType) {
      case 'chat':
        return 'Chat with this workflow to trigger execution with conversational context.';
      case 'webhook':
        return 'Test webhook triggers for this workflow.';
      default:
        return 'Execute this workflow now.';
    }
  };

  const handleExecuteWrapper = async (data: Record<string, unknown>) => {
    await handleExecute(data);
    return { success: true };
  };

  const renderTriggerConfig = () => {
    switch (triggerType) {
      case 'chat':
        return (
          <ChatTriggerConfig
            workflowId={workflowId}
            workflowName={workflowName}
            workflowDescription={workflowDescription}
            onConfigChange={setTriggerData}
            onExecute={handleExecuteWrapper}
            onFullscreenChange={setIsFullscreen}
          />
        );
      case 'webhook':
        return (
          <WebhookTriggerConfig
            workflowId={workflowId}
            onConfigChange={setTriggerData}
            onExecute={handleExecuteWrapper}
          />
        );
      default:
        return null; // Manual and other triggers just show the execute button
    }
  };

  const handleViewResults = () => {
    setShowOutputModal(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={
            triggerType === 'chat' && !isFullscreen
              ? 'sm:max-w-4xl w-full h-[85vh] flex flex-col p-0 border-0 gap-0 outline-0 ring-0'
              : isFullscreen
                ? '!max-w-none w-screen h-screen flex flex-col p-0 rounded-none border-0 gap-0 outline-0 ring-0'
                : 'sm:max-w-md'
          }
          onOpenAutoFocus={triggerType === 'chat' ? (e) => e.preventDefault() : undefined}
          onPointerDownOutside={triggerType === 'chat' ? (e) => e.preventDefault() : undefined}
        >
          {triggerType === 'chat' && !isFullscreen ? (
            <DialogHeader>
              <DialogTitle className="sr-only">{workflowName}</DialogTitle>
              <DialogDescription className="sr-only">
                {getTriggerDescription()}
              </DialogDescription>
            </DialogHeader>
          ) : triggerType !== 'chat' ? (
            <DialogHeader>
              <DialogTitle>{workflowName}</DialogTitle>
              <DialogDescription className="text-xs">
                {getTriggerDescription()}
              </DialogDescription>
            </DialogHeader>
          ) : null}

          <div className={triggerType === 'chat' ? 'flex-1 min-h-0 overflow-hidden' : 'py-4'}>
            {/* Render trigger-specific configuration */}
            {renderTriggerConfig()}
          </div>

          {triggerType !== 'chat' && (
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={executing}
                className="flex-1 sm:flex-none"
              >
                Close
              </Button>
              {/* Only show Execute button for triggers without built-in execution UI */}
              {triggerType !== 'webhook' && !executionResult && (
                <Button
                  onClick={() => handleExecute()}
                  disabled={executing}
                  className="flex-1 sm:flex-auto"
                  size="lg"
                >
                  {executing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Execute
                    </>
                  )}
                </Button>
              )}
              {executionResult && (
                <Button
                  onClick={handleViewResults}
                  className="flex-1 sm:flex-auto"
                  size="lg"
                  variant={executionResult.status === 'error' ? 'destructive' : 'default'}
                >
                  {executionResult.status === 'success' ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      View Results
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-2 h-4 w-4" />
                      View Error
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <RunOutputModal
        run={executionResult}
        modulePath={getLastStepModule(workflowConfig)}
        workflowConfig={workflowConfig}
        open={showOutputModal}
        onOpenChange={setShowOutputModal}
      />
    </>
  );
}

/**
 * Helper to get the module path of the last step (most likely to produce final output)
 */
function getLastStepModule(config: Record<string, unknown> | undefined): string {
  if (!config?.steps || !Array.isArray(config.steps)) return '';
  const lastStep = config.steps[config.steps.length - 1];
  if (lastStep && typeof lastStep === 'object' && 'module' in lastStep) {
    return String(lastStep.module);
  }
  return '';
}
