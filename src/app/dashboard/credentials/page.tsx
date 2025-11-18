'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { CredentialsList } from '@/components/credentials/credentials-list';
import { CredentialForm } from '@/components/credentials/credential-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CredentialListItem } from '@/types/workflows';
import { useClient } from '@/components/providers/ClientProvider';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export default function CredentialsPage() {
  const { currentClient } = useClient();
  const searchParams = useSearchParams();
  const [credentials, setCredentials] = useState<CredentialListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const fetchCredentials = useCallback(async () => {
    try {
      // Include organizationId in request if client is selected
      const url = currentClient?.id
        ? `/api/credentials?organizationId=${currentClient.id}`
        : '/api/credentials';
      const response = await fetch(url);
      const data = await response.json();
      setCredentials(data.credentials || []);
    } catch (error) {
      logger.error({ error }, 'Failed to fetch credentials');
    } finally {
      setLoading(false);
    }
  }, [currentClient]);

  useEffect(() => {
    fetchCredentials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentClient]);

  // Handle OAuth callback success/error messages
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'google_connected') {
      toast.success('Google account connected successfully!');
      fetchCredentials();
    } else if (success === 'outlook_connected') {
      toast.success('Outlook account connected successfully!');
      fetchCredentials();
    } else if (error) {
      const errorMessages: Record<string, string> = {
        'invalid_callback': 'OAuth callback failed. Please try again.',
        'invalid_state': 'Invalid OAuth state. Please try again.',
        'config_missing': 'OAuth configuration is missing. Contact support.',
        'token_exchange_failed': 'Failed to exchange OAuth token. Please try again.',
        'missing_tokens': 'OAuth provider did not return required tokens.',
        'callback_failed': 'OAuth callback failed. Please try again.',
      };
      toast.error(errorMessages[error] || 'OAuth connection failed');
    }

    // Clear URL parameters
    if (success || error) {
      window.history.replaceState({}, '', '/dashboard/credentials');
    }
  }, [searchParams, fetchCredentials]);

  const handleCredentialAdded = () => {
    setShowAddDialog(false);
    fetchCredentials();
  };

  const handleCredentialDeleted = () => {
    fetchCredentials();
  };

  const handleCredentialUpdated = () => {
    fetchCredentials();
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* API Credentials Section */}
        <div className="flex justify-end">
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-foreground text-background hover:bg-foreground/90 transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95 group"
          >
            <Plus className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:rotate-90" />
            Add API Credential
          </Button>
        </div>

        <CredentialsList
          credentials={credentials}
          loading={loading}
          onCredentialDeleted={handleCredentialDeleted}
          onCredentialUpdated={handleCredentialUpdated}
        />

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add API Credential</DialogTitle>
              <DialogDescription>
                Store an API key or token securely. All credentials are encrypted at rest.
              </DialogDescription>
            </DialogHeader>
            <CredentialForm onSuccess={handleCredentialAdded} />
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
