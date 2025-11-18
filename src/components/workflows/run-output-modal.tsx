'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, MessageSquare } from 'lucide-react';
import { OutputRenderer } from './output-renderer';
import { OutputDisplayConfig } from '@/lib/workflows/analyze-output-display';
import { useState, useEffect } from 'react';
import { ChatInterface } from './chat-interface';
import { logger } from '@/lib/logger';

interface WorkflowRun {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
  output: unknown;
  error: string | null;
  errorStep: string | null;
  triggerType: string;
}

interface ChatConversation {
  id: string;
  workflowId: string;
  workflowRunId: string | null;
  title: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface RunOutputModalProps {
  run: WorkflowRun | null;
  modulePath?: string;
  workflowConfig?: Record<string, unknown>;
  workflowId?: string;
  triggerType?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RunOutputModal({
  run,
  modulePath,
  workflowConfig,
  workflowId,
  triggerType,
  open,
  onOpenChange,
}: RunOutputModalProps) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [workflowName, setWorkflowName] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Determine if this is a chat workflow
  const isChatWorkflow = triggerType === 'chat';

  // Fetch conversations if this is a chat workflow
  useEffect(() => {
    if (open && isChatWorkflow && workflowId) {
      setLoadingConversations(true);
      fetch(`/api/workflows/${workflowId}/conversations`)
        .then((res) => res.json())
        .then((data) => {
          setConversations(data.conversations || []);
          setWorkflowName(data.workflow?.name || '');
        })
        .catch((error) => {
          logger.error({ error }, 'Failed to load conversations');
        })
        .finally(() => {
          setLoadingConversations(false);
        });
    }
  }, [open, isChatWorkflow, workflowId]);

  // For chat workflows, we show conversation history even without a specific run
  if (!run && !isChatWorkflow) return null;

  // Extract outputDisplay config from workflow config if provided
  // Transform from workflow JSON format to OutputDisplayConfig format
  // workflowConfig might be: { config: { outputDisplay: {...} } } OR { steps: [...], outputDisplay: {...} }
  // OR it might be a string that needs parsing
  let parsedConfig = workflowConfig;

  // If workflowConfig is a string, parse it
  if (typeof workflowConfig === 'string') {
    try {
      parsedConfig = JSON.parse(workflowConfig);
    } catch (error) {
      logger.error({ error }, 'Failed to parse workflowConfig');
      parsedConfig = undefined;
    }
  }

  // Try to get config object and outputDisplay
  // Handle two cases: parsedConfig might be the full workflow object OR just the config object
  const parsedConfigRecord = parsedConfig as Record<string, unknown> | undefined;
  const hasConfigProperty = parsedConfigRecord?.config !== undefined;
  const configObj = hasConfigProperty
    ? (parsedConfigRecord.config as Record<string, unknown>)
    : parsedConfigRecord;

  const outputDisplay = configObj?.outputDisplay as Record<string, unknown> | undefined;

  // Extract returnValue - check both correct location (config.returnValue) and legacy location (outputDisplay.returnValue)
  const returnValue = (configObj?.returnValue as string | undefined) || (outputDisplay?.returnValue as string | undefined);

  // Apply returnValue to extract the specific data from run.output if configured
  // NOTE: As of the executor fix, run.output already contains the extracted value from returnValue
  // This code handles backward compatibility for old runs that stored full context.variables
  let processedOutput = run?.output;
  if (returnValue && run?.output && typeof run.output === 'object' && !Array.isArray(run.output)) {
    // Only try to extract if run.output is an object (not already an array)
    // Parse template string like "{{sortedProducts}}" or "{{result.data}}"
    const match = returnValue.match(/^\{\{([^}]+)\}\}$/);
    if (match) {
      const path = match[1].trim();
      const keys = path.split('.');
      let value: unknown = run.output;

      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = (value as Record<string, unknown>)[key];
        } else {
          // Path not found - this is expected when executor already extracted the value
          // Only warn if the output doesn't look like it was already extracted
          if (value === run?.output && typeof value === 'object' && !Array.isArray(value)) {
            logger.warn({ path, returnValue, outputType: typeof value }, 'RunOutputModal: returnValue path not found in output, using full output');
          }
          value = run?.output;
          break;
        }
      }

      processedOutput = value;
    }
  } else if (returnValue && run?.output && Array.isArray(run.output)) {
    // run.output is already the extracted array (new behavior after executor fix)
    logger.debug({ returnValue, outputLength: run.output.length }, 'RunOutputModal: returnValue configured and run.output is already extracted array');
    processedOutput = run.output;
  } else if (returnValue && run?.output) {
    // Only log if there's actual output but it couldn't be applied
    logger.debug({ returnValue, hasOutput: !!run?.output, isObject: typeof run?.output === 'object' }, 'RunOutputModal: returnValue configured but not applied');
  } else if (!returnValue && run?.output && typeof run.output === 'object' && !Array.isArray(run.output)) {
    // No returnValue specified - auto-filter internal variables
    logger.debug({}, 'RunOutputModal: No returnValue - applying auto-detection filter');
    const internalKeys = ['user', 'trigger'];
    const filteredOutput: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(run.output as Record<string, unknown>)) {
      // Skip internal variables
      if (internalKeys.includes(key)) continue;
      // Skip credential variables
      if (key.includes('_apikey') || key.includes('_api_key')) continue;
      // Skip known credential platforms
      if (['openai', 'anthropic', 'youtube', 'slack', 'twitter', 'github', 'reddit'].includes(key)) continue;

      filteredOutput[key] = value;
    }

    // If we have filtered variables, use them; otherwise use original (backward compat)
    if (Object.keys(filteredOutput).length > 0) {
      logger.debug({ filteredKeys: Object.keys(filteredOutput) }, 'RunOutputModal: Filtered output keys');
      processedOutput = filteredOutput;
    }
  }

  const outputDisplayHint = outputDisplay
    ? ({
        type: outputDisplay.type as string,
        config: {
          columns: outputDisplay.columns,
        },
      } as OutputDisplayConfig)
    : undefined;

  // Hide default close button for all output types (we have floating buttons now)
  const hasOutput = run?.status === 'success' && run.output;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={isChatWorkflow ? "sm:max-w-2xl max-h-[85vh] flex flex-col" : "!max-w-[98vw] !w-[98vw] max-h-[95vh] overflow-auto scrollbar-none p-6 pt-12"}
          showCloseButton={!hasOutput}
        >
          {isChatWorkflow ? (
            <>
              <DialogHeader>
                <DialogTitle>Conversation History</DialogTitle>
                <DialogDescription>
                  Past conversations from this chat workflow
                </DialogDescription>
              </DialogHeader>
            </>
          ) : (
            <>
              <DialogTitle className="sr-only">Workflow Output</DialogTitle>
              <DialogDescription className="sr-only">Workflow execution output</DialogDescription>
            </>
          )}

          {/* Show conversation history for chat workflows */}
          {isChatWorkflow ? (
            loadingConversations ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No conversations yet. Start a chat to begin.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto -mx-6 px-6 scrollbar-none">
                <div className="relative overflow-hidden rounded-lg border-0 bg-gradient-to-br from-primary/5 via-blue-500/3 to-primary/5 backdrop-blur-sm shadow-sm">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-400 to-primary opacity-80" />
                  <table className="w-full mt-1">
                    <thead className="sticky top-0 bg-background/95 backdrop-blur z-10">
                      <tr className="border-b border-border/50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-foreground/80 tracking-wide">
                          Conversation
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-foreground/80 tracking-wide">
                          Messages
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-foreground/80 tracking-wide">
                          Last Updated
                        </th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {conversations.map((conv) => (
                        <tr
                          key={conv.id}
                          className="border-b border-border/30 transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-500/5 hover:to-transparent"
                        >
                          <td className="px-4 py-3.5">
                            <div className="font-medium text-sm">
                              {conv.title || 'Untitled Conversation'}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="text-right text-xs font-mono text-secondary tabular-nums">
                              {conv.messageCount}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="text-right text-xs text-secondary tabular-nums">
                              {new Date(conv.updatedAt).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <button
                              onClick={() => {
                                setSelectedConversationId(conv.id);
                                setChatModalOpen(true);
                              }}
                              className="px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 bg-muted hover:bg-muted/80"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : run ? (
            // Show normal output for non-chat workflows
            <>
              {run.status === 'success' && run.output !== undefined ? (
          <>
            {/* Debug panel - only show when output is problematic */}
            {(Array.isArray(processedOutput) && processedOutput.length === 0) || (!Array.isArray(processedOutput) && outputDisplayHint?.type === 'table') ? (
              <div className="mb-4 rounded-lg border border-blue-500/50 bg-blue-500/5 p-3">
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium text-blue-600 dark:text-blue-400 select-none">
                    Workflow Execution Details
                  </summary>
                  <div className="mt-3 space-y-3 text-xs">
                    <div className="bg-black/5 dark:bg-white/5 rounded p-3 font-mono">
                      <div className="space-y-1 text-muted-foreground">
                        <div className="font-semibold mb-2">Execution Summary:</div>
                        <div>Status: <span className="text-green-600 dark:text-green-400">{run.status}</span></div>
                        <div>Duration: {run.duration ? `${run.duration}ms` : 'N/A'}</div>
                        <div>Output Type: {Array.isArray(processedOutput) ? `Array[${processedOutput.length}]` : typeof processedOutput}</div>
                        <div>Display Mode: {outputDisplayHint?.type || 'auto-detected'}</div>
                        {returnValue && <div>Return Value: {returnValue}</div>}
                      </div>
                    </div>

                    <div className="bg-black/5 dark:bg-white/5 rounded p-3">
                      <div className="font-semibold mb-2 font-mono text-muted-foreground">Raw Output Sample:</div>
                      <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap break-all">
{JSON.stringify(processedOutput, null, 2).slice(0, 300)}{JSON.stringify(processedOutput).length > 300 ? '\n...(truncated)' : ''}
                      </pre>
                    </div>
                  </div>
                </details>
              </div>
            ) : null}

            <OutputRenderer
              output={processedOutput}
              modulePath={modulePath}
              displayHint={outputDisplayHint}
              onClose={() => onOpenChange(false)}
            />
          </>
        ) : run.status === 'error' ? (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4">
            <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">
              Error Details
            </h4>
            <p className="text-sm text-red-600 dark:text-red-400">
              {run.error || 'Unknown error occurred'}
            </p>
            {run.errorStep && (
              <p className="text-xs text-muted-foreground mt-2">
                Failed at step: {run.errorStep}
              </p>
            )}
          </div>
        ) : run.status === 'running' ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Workflow is still running...</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">
              No output available.
            </p>
          </div>
        )}
            </>
          ) : (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">
                No run data available.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Chat modal for viewing conversations */}
      {selectedConversationId && workflowId && (
        <Dialog open={chatModalOpen} onOpenChange={setChatModalOpen}>
          <DialogContent
            className={
              isFullscreen
                ? '!max-w-none w-screen h-screen flex flex-col p-0 rounded-none border-0 gap-0 outline-0 ring-0'
                : 'sm:max-w-4xl w-full h-[85vh] flex flex-col p-0 border-0 rounded-lg gap-0 outline-0 ring-0'
            }
          >
            <DialogTitle className="sr-only">View Conversation</DialogTitle>
            <DialogDescription className="sr-only">
              View and continue conversation
            </DialogDescription>
            <ChatInterface
              workflowId={workflowId}
              workflowName={workflowName}
              conversationId={selectedConversationId}
              onFullscreenChange={setIsFullscreen}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
