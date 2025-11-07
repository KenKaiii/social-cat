'use client';

import { useState, useEffect } from 'react';
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

export default function CredentialsPage() {
  const { currentClient } = useClient();
  const [credentials, setCredentials] = useState<CredentialListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const fetchCredentials = async () => {
    try {
      // Include organizationId in request if client is selected
      const url = currentClient?.id
        ? `/api/credentials?organizationId=${currentClient.id}`
        : '/api/credentials';
      const response = await fetch(url);
      const data = await response.json();
      setCredentials(data.credentials || []);
    } catch (error) {
      console.error('Failed to fetch credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredentials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentClient]);

  const handleCredentialAdded = () => {
    setShowAddDialog(false);
    fetchCredentials();
  };

  const handleCredentialDeleted = () => {
    fetchCredentials();
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <div className="flex justify-end">
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-foreground text-background hover:bg-foreground/90 transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95 group"
          >
            <Plus className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:rotate-90" />
            Add Credential
          </Button>
        </div>

        <CredentialsList
          credentials={credentials}
          loading={loading}
          onCredentialDeleted={handleCredentialDeleted}
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
