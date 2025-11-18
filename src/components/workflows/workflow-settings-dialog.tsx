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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ChevronDown, ChevronsUpDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { CronTriggerConfig } from './trigger-configs/cron-trigger-config';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getModelIdsByProvider, getDefaultModel, fetchOpenRouterModels, type AIProvider } from '@/lib/ai-models';
import { logger } from '@/lib/logger';

interface WorkflowSettingsDialogProps {
  workflowId: string;
  workflowName: string;
  workflowConfig: Record<string, unknown>;
  workflowTrigger: {
    type: 'manual' | 'cron' | 'webhook' | 'telegram' | 'discord' | 'chat' | 'chat-input' | 'gmail' | 'outlook';
    config: Record<string, unknown>;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

interface ConfigurableStep {
  stepId: string;
  stepIndex: number;
  moduleName: string;
  moduleCategory: string;
  configurableFields: ConfigurableField[];
}

interface ConfigurableField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select';
  value: unknown;
  placeholder?: string;
  description?: string;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
}

export function WorkflowSettingsDialog({
  workflowId,
  workflowName,
  workflowConfig,
  workflowTrigger,
  open,
  onOpenChange,
  onUpdated,
}: WorkflowSettingsDialogProps) {
  const [configurableSteps, setConfigurableSteps] = useState<ConfigurableStep[]>([]);
  const [stepSettings, setStepSettings] = useState<Record<string, Record<string, unknown>>>({});
  const [triggerSettings, setTriggerSettings] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [openSteps, setOpenSteps] = useState<Record<string, boolean>>({});
  const [initialized, setInitialized] = useState(false);
  const [selectOpenStates, setSelectOpenStates] = useState<Record<string, boolean>>({});
  const [openRouterModels, setOpenRouterModels] = useState<string[]>([]);

  // Fetch OpenRouter models when dialog opens
  useEffect(() => {
    if (open) {
      fetchOpenRouterModels().then((models) => {
        setOpenRouterModels(models.map((m) => m.id));
      });
    }
  }, [open]);

  // Extract configurable steps from workflow config
  useEffect(() => {
    if (open && !initialized) {
      const steps = extractConfigurableSteps(workflowConfig);
      setConfigurableSteps(steps);

      // Initialize settings for each step
      const initialSettings: Record<string, Record<string, unknown>> = {};
      const initialOpenState: Record<string, boolean> = {};
      steps.forEach((step, index) => {
        const stepKey = `step-${step.stepIndex}`;
        initialSettings[stepKey] = {};
        step.configurableFields.forEach((field) => {
          initialSettings[stepKey][field.key] = field.value;
        });
        // Auto-open first step
        initialOpenState[stepKey] = index === 0;
      });

      // Auto-open trigger section if it has configurable fields
      if (workflowTrigger.type !== 'manual') {
        initialOpenState['trigger'] = steps.length === 0; // Open if no other steps
      }

      setStepSettings(initialSettings);
      setOpenSteps(initialOpenState);

      // Initialize trigger settings
      setTriggerSettings(workflowTrigger.config || {});
      setInitialized(true);
    } else if (!open) {
      // Reset initialization when dialog closes
      setInitialized(false);
    }
  }, [open, initialized, workflowConfig, workflowTrigger]);

  const handleSave = async () => {
    try {
      setSaving(true);

      // Update the workflow config with new settings
      const updatedConfig = applyStepSettings(workflowConfig, stepSettings);

      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: updatedConfig,
          trigger: {
            type: workflowTrigger.type,
            config: triggerSettings,
          },
        }),
      });

      if (!response.ok) {
        toast.error('Failed to save workflow settings');
      } else {
        toast.success('Workflow settings saved');
        onUpdated?.();
        onOpenChange(false);
      }
    } catch (error) {
      logger.error({ error }, 'Error saving workflow settings');
      toast.error('Error saving workflow settings');
    } finally {
      setSaving(false);
    }
  };

  const updateStepSetting = (stepKey: string, fieldKey: string, value: unknown) => {
    setStepSettings((prev) => {
      const newSettings = {
        ...prev,
        [stepKey]: {
          ...prev[stepKey],
          [fieldKey]: value,
        },
      };

      // If provider changed, reset model to default for new provider
      if (fieldKey === 'provider') {
        const defaultModel = getDefaultModel(value as AIProvider);
        newSettings[stepKey]['model'] = defaultModel;
      }

      return newSettings;
    });
  };

  const updateTriggerSetting = (fieldKey: string, value: unknown) => {
    setTriggerSettings((prev) => ({
      ...prev,
      [fieldKey]: value,
    }));
  };

  const handleCronConfigChange = useCallback((config: Record<string, unknown>) => {
    setTriggerSettings((prev) => ({
      ...prev,
      ...config,
    }));
  }, []);

  const toggleStep = (stepKey: string) => {
    setOpenSteps((prev) => ({
      ...prev,
      [stepKey]: !prev[stepKey],
    }));
  };

  const hasConfigurableSteps = configurableSteps.length > 0;
  const hasTriggerSettings = workflowTrigger.type !== 'manual';
  const hasAnySettings = hasConfigurableSteps || hasTriggerSettings;

  const renderTriggerField = (field: ConfigurableField) => {
    const value = triggerSettings[field.key];

    switch (field.type) {
      case 'textarea':
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={`trigger-${field.key}`} className="text-sm">
              {field.label}
            </Label>
            <Textarea
              id={`trigger-${field.key}`}
              value={(value as string) || ''}
              onChange={(e) => updateTriggerSetting(field.key, e.target.value)}
              placeholder={field.placeholder}
              className="text-sm min-h-[100px]"
            />
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
          </div>
        );

      case 'number':
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={`trigger-${field.key}`} className="text-sm">
              {field.label}
            </Label>
            <Input
              id={`trigger-${field.key}`}
              type="number"
              min={field.min}
              max={field.max}
              step={field.step}
              value={(value as number) ?? ''}
              onChange={(e) =>
                updateTriggerSetting(
                  field.key,
                  field.step && field.step < 1
                    ? parseFloat(e.target.value)
                    : parseInt(e.target.value)
                )
              }
              placeholder={field.placeholder}
              className="text-sm"
            />
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
          </div>
        );

      case 'text':
      default:
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={`trigger-${field.key}`} className="text-sm">
              {field.label}
            </Label>
            <Input
              id={`trigger-${field.key}`}
              value={(value as string) || ''}
              onChange={(e) => updateTriggerSetting(field.key, e.target.value)}
              placeholder={field.placeholder}
              className="text-sm"
            />
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
          </div>
        );
    }
  };

  const renderField = (stepKey: string, field: ConfigurableField) => {
    const value = stepSettings[stepKey]?.[field.key];

    switch (field.type) {
      case 'textarea':
        return (
          <div key={field.key} className="bg-muted/50 rounded-lg p-3 border border-border/50 space-y-2">
            <Label htmlFor={`${stepKey}-${field.key}`} className="text-sm font-medium">
              {field.label}
            </Label>
            <Textarea
              id={`${stepKey}-${field.key}`}
              value={(value as string) || ''}
              onChange={(e) => updateStepSetting(stepKey, field.key, e.target.value)}
              placeholder={field.placeholder}
              className="text-sm min-h-[100px] bg-background text-foreground"
            />
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
          </div>
        );

      case 'number':
        return (
          <div key={field.key} className="bg-muted/50 rounded-lg p-3 border border-border/50 space-y-2">
            <Label htmlFor={`${stepKey}-${field.key}`} className="text-sm font-medium">
              {field.label}
            </Label>
            <Input
              id={`${stepKey}-${field.key}`}
              type="number"
              min={field.min}
              max={field.max}
              step={field.step}
              value={value === null || value === undefined ? '' : (value as number)}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  // Allow clearing the field
                  updateStepSetting(stepKey, field.key, null);
                } else {
                  updateStepSetting(
                    stepKey,
                    field.key,
                    field.step && field.step < 1
                      ? parseFloat(val)
                      : parseInt(val)
                  );
                }
              }}
              placeholder={field.placeholder}
              className="text-sm bg-background text-foreground"
            />
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
          </div>
        );

      case 'select':
        const selectKey = `${stepKey}-${field.key}`;
        const isSelectOpen = selectOpenStates[selectKey] || false;

        // For model field, dynamically get options based on current provider
        let selectOptions = field.options || [];
        if (field.key === 'model') {
          const currentProvider = (stepSettings[stepKey]?.['provider'] as string) || 'openai';
          if (currentProvider === 'openrouter') {
            selectOptions = openRouterModels;
          } else {
            selectOptions = getModelsForProvider(currentProvider);
          }
        }

        return (
          <div key={field.key} className="bg-muted/50 rounded-lg p-3 border border-border/50 space-y-2">
            <Label htmlFor={`${stepKey}-${field.key}`} className="text-sm font-medium">
              {field.label}
            </Label>
            <Popover open={isSelectOpen} onOpenChange={(open) => setSelectOpenStates(prev => ({ ...prev, [selectKey]: open }))} modal={true}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isSelectOpen}
                  className="w-full justify-between font-normal h-9 text-sm"
                >
                  {(value as string) || selectOptions[0] || 'Select...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                <Command loop>
                  <CommandInput
                    placeholder={field.key === 'model' ? 'Search models...' : 'Search...'}
                    className="h-9"
                  />
                  <CommandList className="max-h-[300px]">
                    <CommandEmpty>No {field.key} found.</CommandEmpty>
                    <CommandGroup>
                      {selectOptions.map((option) => (
                        <CommandItem
                          key={option}
                          value={option}
                          onSelect={() => {
                            updateStepSetting(stepKey, field.key, option);
                            setSelectOpenStates(prev => ({ ...prev, [selectKey]: false }));
                          }}
                          className="text-sm"
                        >
                          <Check className={`mr-2 h-4 w-4 ${value === option ? 'opacity-100' : 'opacity-0'}`} />
                          {option}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
          </div>
        );

      case 'text':
      default:
        return (
          <div key={field.key} className="bg-muted/50 rounded-lg p-3 border border-border/50 space-y-2">
            <Label htmlFor={`${stepKey}-${field.key}`} className="text-sm font-medium">
              {field.label}
            </Label>
            <Input
              id={`${stepKey}-${field.key}`}
              value={(value as string) || ''}
              onChange={(e) => updateStepSetting(stepKey, field.key, e.target.value)}
              placeholder={field.placeholder}
              className="text-sm bg-background text-foreground"
            />
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">Workflow Settings: {workflowName}</DialogTitle>
          <DialogDescription className="text-xs">
            Configure workflow step parameters
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto py-3 px-1 -mx-1 flex-1 space-y-3 scrollbar-none">
          {hasAnySettings ? (
            <>
              {/* Trigger Configuration */}
              {hasTriggerSettings && (
                <Collapsible
                  open={openSteps['trigger']}
                  onOpenChange={() => toggleStep('trigger')}
                >
                  <CollapsibleTrigger className="group flex items-center justify-between w-full rounded-lg border border-border/50 bg-muted/30 px-4 py-3 text-sm hover:bg-muted/50 hover:border-border transition-all duration-200">
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                        Trigger: {formatTriggerName(workflowTrigger.type)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Configure trigger settings
                      </span>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground group-hover:text-primary transition-all duration-300 ${
                        openSteps['trigger'] ? 'rotate-180' : ''
                      }`}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3 px-1 space-y-3">
                    {workflowTrigger.type === 'cron' ? (
                      <CronTriggerConfig
                        initialConfig={triggerSettings}
                        onConfigChange={handleCronConfigChange}
                      />
                    ) : (
                      getTriggerFields(workflowTrigger.type, workflowTrigger.config).map((field) =>
                        renderTriggerField(field)
                      )
                    )}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Workflow Steps */}
              {configurableSteps.map((step) => {
                const stepKey = `step-${step.stepIndex}`;
                return (
                  <Collapsible
                    key={stepKey}
                    open={openSteps[stepKey]}
                    onOpenChange={() => toggleStep(stepKey)}
                  >
                    <CollapsibleTrigger className="group flex items-center justify-between w-full rounded-lg border border-border/50 bg-muted/30 px-4 py-3 text-sm hover:bg-muted/50 hover:border-border transition-all duration-200">
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                          Step {step.stepIndex + 1}: {step.moduleCategory}
                        </span>
                        <span className="text-xs text-muted-foreground">{step.moduleName}</span>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground group-hover:text-primary transition-all duration-300 ${
                          openSteps[stepKey] ? 'rotate-180' : ''
                        }`}
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3 px-1 space-y-3">
                      {step.configurableFields.map((field) => renderField(stepKey, field))}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </>
          ) : (
            <div className="rounded-md border border-border/50 bg-muted/30 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                This workflow has no configurable settings
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !hasAnySettings}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Get available models for a given AI provider
 * Uses centralized AI models configuration
 */
function getModelsForProvider(provider: string): string[] {
  return getModelIdsByProvider(provider as AIProvider);
}

/**
 * Get configurable fields for a trigger type
 */
function getTriggerFields(
  triggerType: string,
  triggerConfig: Record<string, unknown>
): ConfigurableField[] {
  const fields: ConfigurableField[] = [];

  switch (triggerType) {
    case 'cron':
      fields.push({
        key: 'schedule',
        label: 'Cron Schedule',
        type: 'text',
        value: triggerConfig.schedule || '0 9 * * *',
        placeholder: '0 9 * * * (daily at 9 AM)',
        description: 'Cron expression for schedule (e.g., 0 9 * * * for daily at 9 AM)',
      });
      break;

    case 'telegram':
      fields.push({
        key: 'botToken',
        label: 'Bot Token',
        type: 'text',
        value: triggerConfig.botToken || '',
        placeholder: 'Enter Telegram bot token',
        description: 'Telegram bot API token',
      });
      break;

    case 'discord':
      fields.push({
        key: 'botToken',
        label: 'Bot Token',
        type: 'text',
        value: triggerConfig.botToken || '',
        placeholder: 'Enter Discord bot token',
        description: 'Discord bot API token',
      });
      fields.push({
        key: 'applicationId',
        label: 'Application ID',
        type: 'text',
        value: triggerConfig.applicationId || '',
        placeholder: 'Enter Discord application ID',
        description: 'Discord application/client ID',
      });
      break;
  }

  return fields;
}

/**
 * Format trigger name for display
 */
function formatTriggerName(triggerType: string): string {
  const triggerMap: Record<string, string> = {
    manual: 'Manual',
    cron: 'Scheduled (Cron)',
    webhook: 'Webhook',
    telegram: 'Telegram Bot',
    discord: 'Discord Bot',
    chat: 'Chat Interface',
  };

  return triggerMap[triggerType] || triggerType;
}

/**
 * Extract configurable steps from workflow config
 */
function extractConfigurableSteps(config: Record<string, unknown>): ConfigurableStep[] {
  const configurableSteps: ConfigurableStep[] = [];

  // Add null/undefined checks
  if (!config || !config.steps || !Array.isArray(config.steps)) {
    return configurableSteps;
  }

  const steps = config.steps as Array<{
    id: string;
    module: string;
    inputs: Record<string, unknown>;
  }>;

  steps.forEach((step, index) => {
    const fields = getConfigurableFields(step.module, step.inputs);

    if (fields.length > 0) {
      const [category, moduleName] = step.module.split('.');

      configurableSteps.push({
        stepId: step.id,
        stepIndex: index,
        moduleName: formatModuleName(moduleName || step.module),
        moduleCategory: formatCategoryName(category || 'general'),
        configurableFields: fields,
      });
    }
  });

  return configurableSteps;
}

/**
 * Get configurable fields for a specific module
 */
function getConfigurableFields(
  modulePath: string,
  inputs: Record<string, unknown>
): ConfigurableField[] {
  const fields: ConfigurableField[] = [];

  // AI modules (ai.ai-sdk, ai.openai, ai.anthropic, ai.openai-workflow)
  if (modulePath.startsWith('ai.') || modulePath.toLowerCase().includes('openai') || modulePath.toLowerCase().includes('anthropic')) {
    // Check if inputs are nested under 'options' (common pattern for AI modules)
    const options = inputs.options as Record<string, unknown> | undefined;
    const aiInputs = options || inputs;

    // Check if this AI module has meaningful configurable content
    // We'll show config if: prompt exists (static or dynamic), or system prompt is defined, or model is non-default
    const hasPrompt = aiInputs.prompt !== undefined;
    const hasSystemPrompt = aiInputs.systemPrompt !== undefined || aiInputs.system !== undefined;
    const hasNonDefaultModel = aiInputs.model !== undefined && aiInputs.model !== 'gpt-4o-mini';
    const hasTemperature = aiInputs.temperature !== undefined;

    // If this AI step has no configurable context (no prompt, no system, default model only), skip it
    if (!hasPrompt && !hasSystemPrompt && !hasNonDefaultModel && !hasTemperature) {
      return fields;
    }

    // Provider selection (for ai-sdk module only, not legacy modules)
    if (modulePath.includes('ai-sdk')) {
      fields.push({
        key: 'provider',
        label: 'AI Provider',
        type: 'select',
        value: aiInputs.provider || 'openai',
        options: ['openai', 'anthropic', 'openrouter'],
        description: 'OpenAI (GPT), Anthropic (Claude), or OpenRouter (hundreds of models)',
      });
    }

    // System prompt - always show for AI modules so users can add instructions
    fields.push({
      key: 'systemPrompt',
      label: 'System Prompt',
      type: 'textarea',
      value: aiInputs.systemPrompt || aiInputs.system || '',
      placeholder: 'You are a helpful AI assistant...',
      description: 'Instructions that guide the AI behavior and responses. This will override any system prompt in the workflow.',
    });

    // Model selection - always show for AI modules as dropdown
    // Get current provider to determine available models
    const currentProvider = (aiInputs.provider as string) || 'openai';
    const availableModels = getModelsForProvider(currentProvider);

    fields.push({
      key: 'model',
      label: 'Model',
      type: 'select',
      value: aiInputs.model || getDefaultModel(currentProvider as AIProvider),
      options: availableModels,
      description: 'AI model to use',
    });

    // Temperature (always show for AI modules)
    fields.push({
      key: 'temperature',
      label: 'Temperature',
      type: 'number',
      value: aiInputs.temperature ?? 0.7,
      min: 0,
      max: 2,
      step: 0.1,
      placeholder: '0.7 (leave empty to use model default)',
      description: 'Controls randomness (0 = focused, 2 = creative). Leave empty for models that don\'t support it.',
    });

    // Max tokens (always show for AI modules)
    fields.push({
      key: 'maxTokens',
      label: 'Max Output Tokens',
      type: 'number',
      value: aiInputs.maxTokens ?? 500,
      min: 1,
      max: 16000,
      step: 1,
      placeholder: '500 (leave empty to use model default)',
      description: 'Maximum length of AI response. Leave empty for models that don\'t support it.',
    });

    // Prompt field (for modules that use 'prompt' instead of separate system/user)
    if (aiInputs.prompt !== undefined && typeof aiInputs.prompt === 'string' && !aiInputs.prompt.includes('{{')) {
      fields.push({
        key: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        value: aiInputs.prompt || '',
        placeholder: 'Enter your prompt...',
        description: 'The prompt to send to the AI',
      });
    }
  }

  // Social media modules
  if (modulePath.startsWith('social.twitter')) {
    if (inputs.maxResults !== undefined) {
      fields.push({
        key: 'maxResults',
        label: 'Max Results',
        type: 'number',
        value: inputs.maxResults ?? 10,
        min: 1,
        max: 100,
        step: 1,
        placeholder: '10',
        description: 'Maximum number of results to fetch',
      });
    }
  }

  // String manipulation modules
  if (modulePath.includes('string.truncate')) {
    if (inputs.maxLength !== undefined) {
      fields.push({
        key: 'maxLength',
        label: 'Max Length',
        type: 'number',
        value: inputs.maxLength ?? 100,
        min: 1,
        step: 1,
        placeholder: '100',
        description: 'Maximum string length',
      });
    }
  }

  // Communication modules
  if (modulePath.startsWith('communication.')) {
    if (inputs.text !== undefined && typeof inputs.text === 'string' && !inputs.text.includes('{{')) {
      fields.push({
        key: 'text',
        label: 'Message Text',
        type: 'textarea',
        value: inputs.text || '',
        placeholder: 'Enter message text...',
        description: 'The message to send',
      });
    }
  }

  return fields;
}

/**
 * Apply step settings back to workflow config
 */
function applyStepSettings(
  config: Record<string, unknown>,
  stepSettings: Record<string, Record<string, unknown>>
): Record<string, unknown> {
  // Add null/undefined checks
  if (!config || !config.steps || !Array.isArray(config.steps)) {
    return config;
  }

  const updatedConfig = JSON.parse(JSON.stringify(config)); // Deep clone

  const steps = updatedConfig.steps as Array<{
    id: string;
    module: string;
    inputs: Record<string, unknown>;
  }>;

  steps.forEach((step, index) => {
    const stepKey = `step-${index}`;
    const settings = stepSettings[stepKey];

    if (settings) {
      if (!step.inputs) step.inputs = {};

      // For AI modules, check if inputs are nested under 'options'
      const isAIModule = step.module.startsWith('ai.') ||
                         step.module.toLowerCase().includes('openai') ||
                         step.module.toLowerCase().includes('anthropic');
      const hasOptionsNesting = isAIModule && step.inputs.options && typeof step.inputs.options === 'object';

      // Apply all settings for this step
      Object.entries(settings).forEach(([key, value]) => {
        // Allow empty strings for systemPrompt and prompt to enable clearing them
        const allowEmpty = key === 'systemPrompt' || key === 'prompt';

        // For numeric fields, allow empty to remove the parameter
        const isNumericField = key === 'temperature' || key === 'maxTokens';
        const shouldRemove = isNumericField && (value === '' || value === null || value === undefined);
        const shouldApply = value !== undefined && value !== null && (allowEmpty || value !== '');

        if (shouldRemove) {
          // Remove the parameter for models that don't support it
          if (hasOptionsNesting) {
            delete (step.inputs.options as Record<string, unknown>)[key];
          } else {
            delete step.inputs[key];
          }
        } else if (shouldApply) {
          // Special handling for systemPrompt - map to 'system' if that's what's being used
          const actualKey = key === 'systemPrompt' && hasOptionsNesting ?
            (step.inputs.options as Record<string, unknown>).system !== undefined ? 'system' : 'systemPrompt'
            : key;

          if (hasOptionsNesting) {
            // Set nested in options for AI modules with that structure
            (step.inputs.options as Record<string, unknown>)[actualKey] = value;
          } else {
            // Set at top level for other modules
            step.inputs[actualKey] = value;
          }
        }
      });
    }
  });

  return updatedConfig;
}

/**
 * Format module name for display
 */
function formatModuleName(name: string): string {
  return name
    .split(/[.-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format category name for display
 */
function formatCategoryName(category: string): string {
  const categoryMap: Record<string, string> = {
    ai: 'AI',
    social: 'Social Media',
    communication: 'Communication',
    utilities: 'Utilities',
    content: 'Content',
  };

  return categoryMap[category] || category.charAt(0).toUpperCase() + category.slice(1);
}
