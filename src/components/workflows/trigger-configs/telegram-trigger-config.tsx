'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Copy, Check, ExternalLink, ChevronDown } from 'lucide-react';
import { logger } from '@/lib/logger';

interface TelegramTriggerConfigProps {
  initialConfig?: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => void;
}

export function TelegramTriggerConfig({ initialConfig, onConfigChange }: TelegramTriggerConfigProps) {
  const [botToken, setBotToken] = useState((initialConfig?.botToken as string) || '');
  const initialCommands = Array.isArray(initialConfig?.commands)
    ? initialConfig.commands.join(', ')
    : (initialConfig?.commands as string) || '/start, /help';
  const [commands, setCommands] = useState(initialCommands);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    onConfigChange({
      botToken,
      commands: typeof commands === 'string'
        ? commands.split(',').map((c) => c.trim()).filter(Boolean)
        : commands,
    });
  }, [botToken, commands, onConfigChange]);

  const copyToken = async () => {
    if (!botToken) return;
    try {
      await navigator.clipboard.writeText(botToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      logger.error({ error }, 'Failed to copy');
    }
  };

  return (
    <div className="space-y-3">
      <Collapsible>
        <CollapsibleTrigger className="flex items-center justify-between w-full rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
          <span className="font-medium text-foreground">
            Setup Instructions
          </span>
          <ChevronDown className="h-4 w-4 transition-transform duration-200 ui-open:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 rounded-md border border-border/50 bg-muted/30 p-3 space-y-2">
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Search <code className="bg-muted px-1 rounded">@BotFather</code> on Telegram</li>
            <li>Send <code className="bg-muted px-1 rounded">/newbot</code> and follow prompts</li>
            <li>Copy the bot token and paste below</li>
          </ol>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-7 text-xs"
            onClick={() => window.open('https://t.me/BotFather', '_blank')}
          >
            <ExternalLink className="mr-1 h-3 w-3" />
            Open BotFather
          </Button>
        </CollapsibleContent>
      </Collapsible>

      <div className="space-y-2">
        <Label htmlFor="bot-token">Bot Token</Label>
        <div className="flex gap-2">
          <Input
            id="bot-token"
            type="password"
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
            className="font-mono text-xs"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={copyToken}
            disabled={!botToken}
            title="Copy token"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="commands" className="text-sm">Bot Commands</Label>
        <Input
          id="commands"
          value={commands}
          onChange={(e) => setCommands(e.target.value)}
          placeholder="/start, /help, /run"
          className="text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Comma-separated list (e.g., /start, /help)
        </p>
      </div>
    </div>
  );
}
