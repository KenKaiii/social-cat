'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronsUpDown, Check } from 'lucide-react';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface GmailTriggerConfigProps {
  initialConfig?: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => void;
}

export function GmailTriggerConfig({ initialConfig, onConfigChange }: GmailTriggerConfigProps) {
  const initialFilters = (initialConfig?.filters as Record<string, unknown>) || {};

  const [label, setLabel] = useState((initialFilters.label as string) || '');
  const [isUnread, setIsUnread] = useState((initialFilters.isUnread as boolean) || false);
  const [hasNoLabels, setHasNoLabels] = useState((initialFilters.hasNoLabels as boolean) || false);
  const [from, setFrom] = useState((initialFilters.from as string) || '');
  const [to, setTo] = useState((initialFilters.to as string) || '');
  const [subject, setSubject] = useState((initialFilters.subject as string) || '');
  const [pollInterval, setPollInterval] = useState(
    (initialConfig?.pollInterval as number) || 60
  );
  const [labelOpen, setLabelOpen] = useState(false);
  const [intervalOpen, setIntervalOpen] = useState(false);

  useEffect(() => {
    const filters: Record<string, unknown> = {};

    if (label) filters.label = label;
    if (isUnread) filters.isUnread = true;
    if (hasNoLabels) filters.hasNoLabels = true;
    if (from) filters.from = from;
    if (to) filters.to = to;
    if (subject) filters.subject = subject;

    onConfigChange({
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      pollInterval,
    });
  }, [label, isUnread, hasNoLabels, from, to, subject, pollInterval, onConfigChange]);

  const commonLabels = [
    { value: '', label: 'Any label' },
    { value: 'inbox', label: 'INBOX' },
    { value: 'sent', label: 'SENT' },
    { value: 'draft', label: 'DRAFT' },
    { value: 'spam', label: 'SPAM' },
    { value: 'trash', label: 'TRASH' },
    { value: 'important', label: 'IMPORTANT' },
    { value: 'starred', label: 'STARRED' },
  ];

  const pollIntervals = [
    { value: 30, label: 'Every 30 seconds' },
    { value: 60, label: 'Every minute (recommended)' },
    { value: 300, label: 'Every 5 minutes' },
    { value: 600, label: 'Every 10 minutes' },
    { value: 900, label: 'Every 15 minutes' },
    { value: 1800, label: 'Every 30 minutes' },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-3">
        <h4 className="text-sm font-medium">Email Filters</h4>
        <p className="text-xs text-muted-foreground">
          Configure which emails should trigger this workflow
        </p>

        <div className="space-y-2">
          <Label htmlFor="gmail-label" className="text-sm">Gmail Label</Label>
          <Popover open={labelOpen} onOpenChange={setLabelOpen} modal={true}>
            <PopoverTrigger asChild>
              <Button
                id="gmail-label"
                variant="outline"
                role="combobox"
                aria-expanded={labelOpen}
                className="w-full justify-between font-normal text-sm"
              >
                {commonLabels.find(l => l.value === label)?.label || 'Select label'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
              <Command>
                <CommandList className="max-h-[300px]">
                  <CommandGroup>
                    {commonLabels.map((l) => (
                      <CommandItem
                        key={l.value}
                        value={l.value}
                        onSelect={() => {
                          setLabel(l.value);
                          setLabelOpen(false);
                        }}
                        className="text-sm"
                      >
                        <Check className={`mr-2 h-4 w-4 ${label === l.value ? 'opacity-100' : 'opacity-0'}`} />
                        {l.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="gmail-unread"
              checked={isUnread}
              onChange={(e) => setIsUnread(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <Label
              htmlFor="gmail-unread"
              className="text-sm font-normal cursor-pointer"
            >
              Only unread emails
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="gmail-no-labels"
              checked={hasNoLabels}
              onChange={(e) => setHasNoLabels(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <Label
              htmlFor="gmail-no-labels"
              className="text-sm font-normal cursor-pointer"
            >
              Only emails without user labels
            </Label>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gmail-from" className="text-sm">From (sender email)</Label>
          <Input
            id="gmail-from"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="sender@example.com"
            className="text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gmail-to" className="text-sm">To (recipient email)</Label>
          <Input
            id="gmail-to"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com"
            className="text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gmail-subject" className="text-sm">Subject contains</Label>
          <Input
            id="gmail-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g., Invoice, Newsletter"
            className="text-sm"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-3">
        <h4 className="text-sm font-medium">Polling Settings</h4>

        <div className="space-y-2">
          <Label htmlFor="gmail-interval" className="text-sm">Check for new emails</Label>
          <Popover open={intervalOpen} onOpenChange={setIntervalOpen} modal={true}>
            <PopoverTrigger asChild>
              <Button
                id="gmail-interval"
                variant="outline"
                role="combobox"
                aria-expanded={intervalOpen}
                className="w-full justify-between font-normal text-sm"
              >
                {pollIntervals.find(i => i.value === pollInterval)?.label || 'Select interval'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
              <Command>
                <CommandList className="max-h-[300px]">
                  <CommandGroup>
                    {pollIntervals.map((interval) => (
                      <CommandItem
                        key={interval.value}
                        value={interval.value.toString()}
                        onSelect={() => {
                          setPollInterval(interval.value);
                          setIntervalOpen(false);
                        }}
                        className="text-sm"
                      >
                        <Check className={`mr-2 h-4 w-4 ${pollInterval === interval.value ? 'opacity-100' : 'opacity-0'}`} />
                        {interval.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <p className="text-xs text-muted-foreground">
            How often to check Gmail for matching emails
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950 p-3">
        <p className="text-xs text-blue-900 dark:text-blue-100">
          <strong>Note:</strong> Requires Google OAuth connection. Go to Settings → Credentials to connect your Gmail account.
        </p>
      </div>

      <div className="rounded-lg border border-border/50 bg-muted/50 p-3 space-y-2">
        <h4 className="text-sm font-medium">Available Trigger Data</h4>
        <div className="text-xs text-muted-foreground space-y-1">
          <div><code className="bg-muted px-1 rounded">{'{{trigger.email.id}}'}</code> - Email ID</div>
          <div><code className="bg-muted px-1 rounded">{'{{trigger.email.from}}'}</code> - Sender address</div>
          <div><code className="bg-muted px-1 rounded">{'{{trigger.email.to}}'}</code> - Recipient address</div>
          <div><code className="bg-muted px-1 rounded">{'{{trigger.email.subject}}'}</code> - Email subject</div>
          <div><code className="bg-muted px-1 rounded">{'{{trigger.email.body.text}}'}</code> - Plain text body</div>
          <div><code className="bg-muted px-1 rounded">{'{{trigger.email.body.html}}'}</code> - HTML body</div>
          <div><code className="bg-muted px-1 rounded">{'{{trigger.email.labels}}'}</code> - Array of labels</div>
          <div><code className="bg-muted px-1 rounded">{'{{trigger.email.date}}'}</code> - Email date</div>
          <div><code className="bg-muted px-1 rounded">{'{{trigger.email.isUnread}}'}</code> - Read status</div>
        </div>
      </div>
    </div>
  );
}
