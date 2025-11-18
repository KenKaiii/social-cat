'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ManualTriggerConfig } from './trigger-configs/manual-trigger-config';
import { CronTriggerConfig } from './trigger-configs/cron-trigger-config';
import { TelegramTriggerConfig } from './trigger-configs/telegram-trigger-config';
import { DiscordTriggerConfig } from './trigger-configs/discord-trigger-config';
import { ChatInputTriggerConfig } from './trigger-configs/chat-input-trigger-config';
import { GmailTriggerConfig } from './trigger-configs/gmail-trigger-config';
import { OutlookTriggerConfig } from './trigger-configs/outlook-trigger-config';
import { logger } from '@/lib/logger';

interface TriggerConfigDialogProps {
  workflowId: string;
  workflowName: string;
  triggerType: 'manual' | 'cron' | 'webhook' | 'telegram' | 'discord' | 'chat' | 'chat-input' | 'gmail' | 'outlook';
  triggerConfig?: Record<string, unknown>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export function TriggerConfigDialog({
  workflowId,
  workflowName,
  triggerType,
  triggerConfig = {},
  open,
  onOpenChange,
  onUpdated,
}: TriggerConfigDialogProps) {
  const [triggerData, setTriggerData] = useState<Record<string, unknown>>(triggerConfig);
  const [saving, setSaving] = useState(false);

  // Initialize with existing config when dialog opens
  useEffect(() => {
    if (open) {
      setTriggerData(triggerConfig);
    }
  }, [open, triggerConfig]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trigger: {
            config: triggerData,
          },
        }),
      });

      if (!response.ok) {
        toast.error('Failed to save trigger configuration');
      } else {
        toast.success('Trigger configuration saved');
        onUpdated?.();
        onOpenChange(false);
      }
    } catch (error) {
      logger.error({ error }, 'Error saving trigger config');
      toast.error('Error saving trigger configuration');
    } finally {
      setSaving(false);
    }
  };

  const getTriggerDescription = () => {
    switch (triggerType) {
      case 'manual':
        return 'Configure default settings for manual workflow execution.';
      case 'cron':
        return 'Configure the schedule for this workflow to run automatically.';
      case 'webhook':
        return 'Configure webhook URL and test incoming webhook triggers.';
      case 'telegram':
        return 'Set up Telegram bot integration to trigger this workflow via commands.';
      case 'discord':
        return 'Set up Discord bot integration to trigger this workflow via slash commands.';
      case 'chat':
        return 'Configure chat-based workflow settings.';
      case 'chat-input':
        return 'Configure custom input fields for this workflow. Users will fill these fields when triggering the workflow.';
      case 'gmail':
        return 'Configure Gmail email filters and polling settings to automatically trigger this workflow when matching emails arrive.';
      case 'outlook':
        return 'Configure Outlook email filters and polling settings to automatically trigger this workflow when matching emails arrive.';
      default:
        return 'Configure trigger settings for this workflow.';
    }
  };

  const getTriggerLabel = () => {
    switch (triggerType) {
      case 'manual':
        return 'Manual Trigger';
      case 'cron':
        return 'Scheduled Trigger';
      case 'webhook':
        return 'Webhook Trigger';
      case 'telegram':
        return 'Telegram Bot Trigger';
      case 'discord':
        return 'Discord Bot Trigger';
      case 'chat':
        return 'Chat Trigger';
      case 'chat-input':
        return 'Chat Input Trigger';
      case 'gmail':
        return 'Gmail Email Trigger';
      case 'outlook':
        return 'Outlook Email Trigger';
      default:
        return 'Trigger Configuration';
    }
  };

  const renderTriggerConfig = () => {
    switch (triggerType) {
      case 'manual':
        return <ManualTriggerConfig onConfigChange={setTriggerData} />;
      case 'cron':
        return (
          <CronTriggerConfig
            initialConfig={triggerConfig}
            onConfigChange={setTriggerData}
          />
        );
      case 'chat':
        return null; // Chat doesn't need config, it's handled in execution
      case 'webhook':
        return null; // Webhook config is read-only (just shows URL)
      case 'telegram':
        return (
          <TelegramTriggerConfig
            initialConfig={triggerConfig}
            onConfigChange={setTriggerData}
          />
        );
      case 'discord':
        return (
          <DiscordTriggerConfig
            initialConfig={triggerConfig}
            onConfigChange={setTriggerData}
          />
        );
      case 'chat-input':
        return (
          <ChatInputTriggerConfig
            initialConfig={triggerConfig}
            onConfigChange={setTriggerData}
          />
        );
      case 'gmail':
        return (
          <GmailTriggerConfig
            initialConfig={triggerConfig}
            onConfigChange={setTriggerData}
          />
        );
      case 'outlook':
        return (
          <OutlookTriggerConfig
            initialConfig={triggerConfig}
            onConfigChange={setTriggerData}
          />
        );
      default:
        return <ManualTriggerConfig onConfigChange={setTriggerData} />;
    }
  };

  const hasConfig = triggerType !== 'chat' && triggerType !== 'webhook';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">
            {getTriggerLabel()}: {workflowName}
          </DialogTitle>
          <DialogDescription className="text-xs">{getTriggerDescription()}</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto py-3 px-1 -mx-1 flex-1 scrollbar-none">
          {renderTriggerConfig()}

          {(triggerType === 'chat' || triggerType === 'webhook') && (
            <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950 p-3">
              <p className="text-xs text-blue-900 dark:text-blue-100">
                {triggerType === 'chat' && (
                  <>Configured during execution. Click Run to chat.</>
                )}
                {triggerType === 'webhook' && (
                  <>Configured via webhook URL. Test during execution.</>
                )}
              </p>
            </div>
          )}
        </div>

        {hasConfig && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
