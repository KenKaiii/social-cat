'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { PLATFORM_CONFIGS, getPlatformsByCategory } from '@/lib/workflows/platform-configs';
import { useClient } from '@/components/providers/ClientProvider';
import { getOAuthCallbackUrl, getOAuthCallbackConfig } from '@/lib/oauth-callback-urls';
import { Copy, Check, ExternalLink, ChevronsUpDown } from 'lucide-react';

interface CredentialFormProps {
  onSuccess: () => void;
}

export function CredentialForm({ onSuccess }: CredentialFormProps) {
  const { currentClient } = useClient();
  const [platform, setPlatform] = useState('');
  const [name, setName] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const platformConfig = platform ? PLATFORM_CONFIGS[platform] : null;
  const platformsByCategory = getPlatformsByCategory();
  const oauthConfig = platform ? getOAuthCallbackConfig(platform) : null;
  const callbackUrl = platform ? getOAuthCallbackUrl(platform) : null;

  const handleCopyCallback = async () => {
    if (callbackUrl) {
      await navigator.clipboard.writeText(callbackUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!platformConfig) {
      setError('Please select a platform');
      return;
    }

    setLoading(true);

    try {
      // Determine if single or multi-field based on platform config
      const isSingleField = platformConfig.fields.length === 1;
      const type = isSingleField ? 'api_key' : 'multi_field';

      const payload: {
        platform: string;
        name: string;
        type: string;
        organizationId?: string;
        value?: string;
        fields?: Record<string, string>;
      } = {
        platform,
        name: name || `${platformConfig.name} Credential`,
        type,
      };

      // Include organizationId if a client is selected
      if (currentClient?.id) {
        payload.organizationId = currentClient.id;
      }

      if (isSingleField) {
        // Single field - send as 'value'
        payload.value = fields[platformConfig.fields[0].key];
      } else {
        // Multi-field - send as 'fields' object
        payload.fields = fields;
      }

      const response = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add credential');
      }

      // Reset form
      setFields({});
      setName('');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add credential');
    } finally {
      setLoading(false);
    }
  };

  const handlePlatformChange = (newPlatform: string) => {
    setPlatform(newPlatform);
    setFields({}); // Reset fields when platform changes
    setName('');
    setOpen(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="platform">Platform</Label>
        <Popover open={open} onOpenChange={setOpen} modal={true}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between font-normal"
            >
              {platform
                ? PLATFORM_CONFIGS[platform]?.name
                : <span className="text-muted-foreground">Search for your platform...</span>}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
            <Command loop>
              <CommandInput placeholder="Search platforms..." className="h-9" />
              <CommandList className="max-h-[300px] overflow-y-scroll">
                <CommandEmpty>No platform found.</CommandEmpty>
                {Object.entries(platformsByCategory).map(([category, platforms]) => (
                  <CommandGroup key={category} heading={category}>
                    {platforms.map((config) => (
                      <CommandItem
                        key={config.id}
                        value={config.name}
                        onSelect={() => handlePlatformChange(config.id)}
                      >
                        {config.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {platformConfig && (
          <p className="text-xs text-muted-foreground">
            {platformConfig.category} • {platformConfig.fields.length} field{platformConfig.fields.length > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {platformConfig && (
        <div className="space-y-2">
          <Label htmlFor="name">Name (Optional)</Label>
          <Input
            id="name"
            placeholder={`My ${platformConfig.name} Credential`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Friendly name to identify this credential
          </p>
        </div>
      )}

      {/* OAuth Callback URL - shown for platforms that need it */}
      {oauthConfig && callbackUrl && (
        <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Redirect URI for {oauthConfig.providerName}</Label>
            {oauthConfig.setupUrl && (
              <a
                href={oauthConfig.setupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                Setup <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-background px-3 py-2 rounded border font-mono overflow-x-auto">
              {callbackUrl}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyCallback}
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Add this redirect URI to your OAuth app settings
          </p>
        </div>
      )}

      {/* Dynamic fields based on platform configuration */}
      {platformConfig && platformConfig.fields.map((fieldConfig) => (
        <div key={fieldConfig.key} className="space-y-2">
          <Label htmlFor={fieldConfig.key}>
            {fieldConfig.label}
            {fieldConfig.required && <span className="text-destructive ml-1">*</span>}
          </Label>

          {fieldConfig.type === 'textarea' ? (
            <Textarea
              id={fieldConfig.key}
              placeholder={fieldConfig.placeholder}
              value={fields[fieldConfig.key] || ''}
              onChange={(e) => setFields(prev => ({ ...prev, [fieldConfig.key]: e.target.value }))}
              required={fieldConfig.required}
              rows={4}
              className="font-mono text-sm"
            />
          ) : (
            <Input
              id={fieldConfig.key}
              type={fieldConfig.type}
              placeholder={fieldConfig.placeholder}
              value={fields[fieldConfig.key] || ''}
              onChange={(e) => setFields(prev => ({ ...prev, [fieldConfig.key]: e.target.value }))}
              required={fieldConfig.required}
            />
          )}

          {fieldConfig.description && (
            <p className="text-xs text-muted-foreground">
              {fieldConfig.description}
            </p>
          )}
        </div>
      ))}

      {platformConfig && (
        <>
          <div className="pt-2">
            <p className="text-xs text-muted-foreground mb-3">
              All credentials are encrypted and stored securely
            </p>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Adding...' : 'Add Credential'}
          </Button>
        </>
      )}
    </form>
  );
}
