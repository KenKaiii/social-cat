'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Key } from 'lucide-react';
import { toast } from 'sonner';

interface CredentialCardProps {
  credential: {
    id: string;
    platform: string;
    name: string;
    type: string;
    createdAt: Date | null;
    lastUsed: Date | null;
  };
  onDeleted: () => void;
}

export function CredentialCard({ credential, onDeleted }: CredentialCardProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    toast(`Delete "${credential.name}"?`, {
      description: 'This cannot be undone.',
      action: {
        label: 'Delete',
        onClick: () => performDelete(),
      },
      cancel: {
        label: 'Cancel',
        onClick: () => {},
      },
    });
  };

  const performDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/credentials/${credential.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete credential');
      }

      toast.success('Credential deleted', {
        description: `"${credential.name}" has been removed.`,
      });
      onDeleted();
    } catch (error) {
      console.error('Failed to delete credential:', error);
      toast.error('Failed to delete credential', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  };

  return (
    <Card className="relative overflow-hidden rounded-lg border-0 bg-gradient-to-br from-primary/5 via-blue-500/3 to-primary/5 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-400 to-primary opacity-80" />
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="card-title">{credential.platform}</CardTitle>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleDelete}
            disabled={deleting}
            className="hover:text-destructive"
            title="Delete credential"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium truncate">{credential.name}</span>
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Type:</span>
            <span className="font-medium">{credential.type}</span>
          </div>
          <div className="flex justify-between">
            <span>Last used:</span>
            <span>{formatDate(credential.lastUsed)}</span>
          </div>
          <div className="flex justify-between">
            <span>Created:</span>
            <span>{formatDate(credential.createdAt)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
