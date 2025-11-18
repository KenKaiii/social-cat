'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, ExternalLink, Key, Unplug, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
import { toast } from 'sonner';
import { getIcon } from '@/lib/icon-map';
import { logger } from '@/lib/logger';

interface OAuthAccount {
  id: string;
  accountName: string;
  isExpired: boolean;
}

interface ApiKey {
  id: string;
  name: string;
}

interface CredentialStatus {
  platform: string;
  type: 'oauth' | 'api_key' | 'both' | 'optional';
  displayName: string;
  icon: string;
  connected: boolean;
  accounts: OAuthAccount[];
  keys: ApiKey[];
  preferredType?: 'oauth' | 'api_key'; // For 'both' and 'optional' types
  oauthPlatform?: string; // Mapped OAuth endpoint name (e.g., 'twitter' for 'twitter-oauth')
}

interface WorkflowCredentialsStatusProps {
  workflowId: string;
}

export function WorkflowCredentialsStatus({ workflowId }: WorkflowCredentialsStatusProps) {
  const router = useRouter();
  const [credentials, setCredentials] = useState<CredentialStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCredentials, setSelectedCredentials] = useState<Record<string, string>>({});
  const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({});

  const fetchCredentials = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/workflows/${workflowId}/credentials`);
      if (response.ok) {
        const data = await response.json();
        setCredentials(data.credentials || []);

        // Load saved selections from API or localStorage
        const savedSelections = localStorage.getItem(`workflow-${workflowId}-credentials`);
        if (savedSelections) {
          setSelectedCredentials(JSON.parse(savedSelections));
        } else {
          // Auto-select first credential for each platform
          const autoSelections: Record<string, string> = {};
          data.credentials?.forEach((cred: CredentialStatus) => {
            if (cred.type === 'oauth' && cred.accounts.length > 0) {
              autoSelections[cred.platform] = cred.accounts[0].id;
            } else if (cred.type === 'api_key' && cred.keys.length > 0) {
              autoSelections[cred.platform] = cred.keys[0].id;
            }
          });
          setSelectedCredentials(autoSelections);
        }
      }
    } catch (error) {
      logger.error({ error }, 'Failed to fetch workflow credentials');
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  useEffect(() => {
    fetchCredentials();

    // Listen for OAuth success messages from popup
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type?.endsWith('-auth-success')) {
        // Refresh credentials when OAuth completes
        fetchCredentials();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fetchCredentials]);

  const handleCredentialSelect = useCallback((platform: string, credentialId: string) => {
    setSelectedCredentials(prev => {
      const updated = { ...prev, [platform]: credentialId };
      // Save to localStorage
      localStorage.setItem(`workflow-${workflowId}-credentials`, JSON.stringify(updated));
      return updated;
    });
  }, [workflowId]);

  const handleOAuthConnect = (cred: CredentialStatus) => {
    // Open OAuth popup
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    // Use oauthPlatform if available (for mapped platforms like twitter-oauth -> twitter)
    const authPlatform = cred.oauthPlatform || cred.platform;

    window.open(
      `/api/auth/${authPlatform}/authorize`,
      `${authPlatform}-auth`,
      `width=${width},height=${height},left=${left},top=${top}`
    );
  };

  const handleAddApiKey = (platform: string) => {
    // Navigate to credentials page with platform pre-selected (client-side navigation)
    router.push(`/dashboard/credentials?platform=${platform}`);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground">Required Credentials:</div>
        <div className="space-y-1.5">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>
    );
  }

  if (credentials.length === 0) {
    return null;
  }

  const handleDisconnect = async (accountId: string, platform: string) => {
    const platformDisplay = platform.charAt(0).toUpperCase() + platform.slice(1);

    try {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Account disconnected', {
          description: `${platformDisplay} account has been disconnected successfully.`,
        });
        // Refresh credentials
        fetchCredentials();
      } else {
        const data = await response.json();
        toast.error('Failed to disconnect', {
          description: data.error || 'Could not disconnect the account. Please try again.',
        });
      }
    } catch (error) {
      logger.error({ error }, 'Failed to disconnect account');
      toast.error('Connection error', {
        description: 'Failed to disconnect account. Please check your connection.',
      });
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">Required Credentials:</div>
      <div className="space-y-1.5">
        {credentials.map((cred) => {
          const IconComponent = getIcon(cred.icon);

          // 'both' or 'optional' type - show both OAuth and API key options
          if ((cred.type === 'both' || cred.type === 'optional') && (cred.accounts.length > 0 || cred.keys.length > 0)) {
            const hasOAuth = cred.accounts.length > 0;
            const hasApiKey = cred.keys.length > 0;

            return (
              <div
                key={cred.platform}
                className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/30 px-3 py-2 transition-all duration-200 hover:bg-muted/40 hover:border-border"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <IconComponent className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs font-medium truncate text-foreground">{cred.displayName}</span>
                  <div className="flex items-center gap-1 text-xs">
                    {hasOAuth && (
                      <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        OAuth
                      </span>
                    )}
                    {hasOAuth && hasApiKey && <span className="text-muted-foreground">or</span>}
                    {hasApiKey && (
                      <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        API Key
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!hasOAuth && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-xs flex-shrink-0 transition-all duration-200 hover:scale-105 active:scale-95"
                      onClick={() => handleOAuthConnect(cred)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      OAuth
                    </Button>
                  )}
                  {!hasApiKey && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-xs flex-shrink-0 transition-all duration-200 hover:scale-105 active:scale-95"
                      onClick={() => handleAddApiKey(cred.platform)}
                    >
                      <Key className="h-3 w-3 mr-1" />
                      API Key
                    </Button>
                  )}
                </div>
              </div>
            );
          }

          // 'both' or 'optional' type - no credentials yet, show both options
          if ((cred.type === 'both' || cred.type === 'optional') && cred.accounts.length === 0 && cred.keys.length === 0) {
            const preferred = cred.preferredType || 'api_key';

            return (
              <div
                key={cred.platform}
                className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/30 px-3 py-2 transition-all duration-200 hover:bg-muted/40 hover:border-border"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <IconComponent className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs font-medium truncate text-foreground">{cred.displayName}</span>
                  {cred.type === 'optional' && (
                    <span className="text-[10px] text-muted-foreground">(optional)</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant={preferred === 'oauth' ? 'default' : 'outline'}
                    className="h-6 px-2 text-xs flex-shrink-0 transition-all duration-200 hover:scale-105 active:scale-95"
                    onClick={() => handleOAuthConnect(cred)}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    OAuth
                  </Button>
                  <span className="text-xs text-muted-foreground">or</span>
                  <Button
                    size="sm"
                    variant={preferred === 'api_key' ? 'default' : 'outline'}
                    className="h-6 px-2 text-xs flex-shrink-0 transition-all duration-200 hover:scale-105 active:scale-95"
                    onClick={() => handleAddApiKey(cred.platform)}
                  >
                    <Key className="h-3 w-3 mr-1" />
                    API Key
                  </Button>
                </div>
              </div>
            );
          }

          // OAuth platform with multiple accounts
          if (cred.type === 'oauth' && cred.accounts.length > 1) {
            const selectedValue = selectedCredentials[cred.platform] || cred.accounts[0]?.id;
            const selectedAccount = cred.accounts.find(acc => acc.id === selectedValue);

            return (
              <div
                key={cred.platform}
                className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/30 px-3 py-2 transition-all duration-200 hover:bg-muted/40 hover:border-border"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <IconComponent className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs font-medium truncate text-foreground">{cred.displayName}</span>
                  <Popover open={openPopovers[`oauth-${cred.platform}`]} onOpenChange={(open) => setOpenPopovers({ ...openPopovers, [`oauth-${cred.platform}`]: open })} modal={true}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openPopovers[`oauth-${cred.platform}`]}
                        className="h-6 text-xs w-auto min-w-[120px] py-0 text-foreground transition-all duration-200 hover:bg-muted font-normal"
                      >
                        {selectedAccount ? (
                          <span className="flex items-center gap-1">
                            {selectedAccount.accountName}
                            {selectedAccount.isExpired && (
                              <span className="text-red-500 text-[10px]">(Expired)</span>
                            )}
                          </span>
                        ) : 'Select account'}
                        <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                      <Command>
                        <CommandList className="max-h-[300px]">
                          <CommandGroup>
                            {cred.accounts.map((account) => (
                              <CommandItem
                                key={account.id}
                                value={account.id}
                                onSelect={() => {
                                  handleCredentialSelect(cred.platform, account.id);
                                  setOpenPopovers({ ...openPopovers, [`oauth-${cred.platform}`]: false });
                                }}
                                className="text-xs py-1 min-h-0"
                              >
                                <Check className={`mr-2 h-3 w-3 ${selectedValue === account.id ? 'opacity-100' : 'opacity-0'}`} />
                                <div className="flex items-center gap-1">
                                  {account.accountName}
                                  {account.isExpired && (
                                    <span className="text-red-500 text-[10px]">(Expired)</span>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-xs flex-shrink-0 transition-all duration-200 hover:scale-105 active:scale-95 group"
                    onClick={() => handleOAuthConnect(cred)}
                  >
                    <ExternalLink className="h-3 w-3 mr-1 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    Add
                  </Button>
                </div>
              </div>
            );
          }

          // OAuth platform with single account
          if (cred.type === 'oauth' && cred.accounts.length === 1) {
            const account = cred.accounts[0];
            return (
              <div
                key={cred.platform}
                className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/30 px-3 py-2 transition-all duration-200 hover:bg-muted/40 hover:border-border"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <IconComponent className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs font-medium truncate text-foreground">{cred.displayName}</span>
                  <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <Check className="h-3 w-3" />
                    <span className="text-muted-foreground">({account.accountName})</span>
                    {account.isExpired && (
                      <span className="text-red-500 text-[10px] ml-1">(Expired)</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900/30 flex-shrink-0 transition-all duration-200 hover:scale-110 active:scale-95 group"
                    onClick={() => handleDisconnect(account.id, cred.platform)}
                    title="Disconnect account"
                  >
                    <Unplug className="h-3 w-3 text-muted-foreground group-hover:text-red-600 dark:group-hover:text-red-400 transition-all duration-200 group-hover:rotate-12" />
                  </Button>
                </div>
              </div>
            );
          }

          // OAuth platform with no accounts
          if (cred.type === 'oauth' && cred.accounts.length === 0) {
            return (
              <div
                key={cred.platform}
                className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/30 px-3 py-2 transition-all duration-200 hover:bg-muted/40 hover:border-border"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <IconComponent className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs font-medium truncate text-foreground">{cred.displayName}</span>
                  <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                    <X className="h-3 w-3" />
                    <span>Not connected</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-xs flex-shrink-0 transition-all duration-200 hover:scale-105 active:scale-95 group"
                  onClick={() => handleOAuthConnect(cred)}
                >
                  <ExternalLink className="h-3 w-3 mr-1 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  Connect
                </Button>
              </div>
            );
          }

          // API key platform with multiple keys
          if (cred.type === 'api_key' && cred.keys.length > 1) {
            const selectedValue = selectedCredentials[cred.platform] || cred.keys[0]?.id;
            const selectedKey = cred.keys.find(key => key.id === selectedValue);

            return (
              <div
                key={cred.platform}
                className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/30 px-3 py-2 transition-all duration-200 hover:bg-muted/40 hover:border-border"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <IconComponent className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs font-medium truncate text-foreground">{cred.displayName}</span>
                  <Popover open={openPopovers[`apikey-${cred.platform}`]} onOpenChange={(open) => setOpenPopovers({ ...openPopovers, [`apikey-${cred.platform}`]: open })} modal={true}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openPopovers[`apikey-${cred.platform}`]}
                        className="h-6 text-xs w-auto min-w-[120px] py-0 text-foreground transition-all duration-200 hover:bg-muted font-normal"
                      >
                        {selectedKey?.name || 'Select key'}
                        <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                      <Command>
                        <CommandList className="max-h-[300px]">
                          <CommandGroup>
                            {cred.keys.map((key) => (
                              <CommandItem
                                key={key.id}
                                value={key.id}
                                onSelect={() => {
                                  handleCredentialSelect(cred.platform, key.id);
                                  setOpenPopovers({ ...openPopovers, [`apikey-${cred.platform}`]: false });
                                }}
                                className="text-xs py-1 min-h-0"
                              >
                                <Check className={`mr-2 h-3 w-3 ${selectedValue === key.id ? 'opacity-100' : 'opacity-0'}`} />
                                {key.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-xs flex-shrink-0 transition-all duration-200 hover:scale-105 active:scale-95 group"
                    onClick={() => handleAddApiKey(cred.platform)}
                  >
                    <Key className="h-3 w-3 mr-1 transition-transform duration-200 group-hover:-rotate-12" />
                    Add
                  </Button>
                </div>
              </div>
            );
          }

          // API key platform with single key
          if (cred.type === 'api_key' && cred.keys.length === 1) {
            const key = cred.keys[0];
            return (
              <div
                key={cred.platform}
                className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/30 px-3 py-2 transition-all duration-200 hover:bg-muted/40 hover:border-border"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <IconComponent className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs font-medium truncate text-foreground">{cred.displayName}</span>
                  <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <Check className="h-3 w-3" />
                    <span className="text-muted-foreground">({key.name})</span>
                  </div>
                </div>
              </div>
            );
          }

          // API key platform with no keys
          return (
            <div
              key={cred.platform}
              className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/30 px-3 py-2 transition-all duration-200 hover:bg-muted/40 hover:border-border"
            >
              <div className="flex items-center gap-2 min-w-0">
                <IconComponent className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-xs font-medium truncate text-foreground">{cred.displayName}</span>
                <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                  <X className="h-3 w-3" />
                  <span>Not added</span>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-xs flex-shrink-0 transition-all duration-200 hover:scale-105 active:scale-95 group"
                onClick={() => handleAddApiKey(cred.platform)}
              >
                <Key className="h-3 w-3 mr-1 transition-transform duration-200 group-hover:-rotate-12" />
                Add Key
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
