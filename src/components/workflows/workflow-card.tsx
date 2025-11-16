'use client';

import { useState, useCallback, useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Download, Trash2, Play, Key, MessageSquare, Sliders, BarChart3, Pencil, Clock, Webhook, Send, FormInput, Mail } from 'lucide-react';
import { WorkflowListItem } from '@/types/workflows';
import { WorkflowExecutionDialog } from './workflow-execution-dialog';
import { CredentialsConfigDialog } from './credentials-config-dialog';
import { WorkflowSettingsDialog } from './workflow-settings-dialog';
import { WorkflowOutputsDialog } from './workflow-outputs-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface WorkflowCardProps {
  workflow: WorkflowListItem;
  onDeleted: () => void;
  onExport: (id: string) => void;
  onUpdated?: () => void;
}

export const WorkflowCard = memo(function WorkflowCard({ workflow, onDeleted, onExport, onUpdated }: WorkflowCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [optimisticStatus, setOptimisticStatus] = useState<string | null>(null);
  const [executionDialogOpen, setExecutionDialogOpen] = useState(false);
  const [credentialsConfigOpen, setCredentialsConfigOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [outputsDialogOpen, setOutputsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState(workflow.name);
  const [editDescription, setEditDescription] = useState(workflow.description || '');
  const [saving, setSaving] = useState(false);

  const performDelete = useCallback(async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/workflows/${workflow.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete workflow');
      }

      toast.success('Workflow deleted');
      onDeleted();
    } catch (error) {
      console.error('Error deleting workflow:', error);
      toast.error('Failed to delete workflow');
    } finally {
      setDeleting(false);
    }
  }, [workflow.id, onDeleted]);

  const handleDelete = useCallback(async () => {
    toast(`Delete "${workflow.name}"?`, {
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
  }, [workflow.name, performDelete]);

  const handleToggleStatus = useCallback(async (checked: boolean) => {
    const newStatus = checked ? 'active' : 'draft';
    setToggling(true);
    setOptimisticStatus(newStatus);

    try {
      const response = await fetch(`/api/workflows/${workflow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update workflow status');
      }

      toast.success(`Workflow ${checked ? 'activated' : 'deactivated'}`);
      onUpdated?.();
    } catch (error) {
      console.error('Error updating workflow status:', error);
      toast.error('Failed to update workflow status');
      setOptimisticStatus(null);
    } finally {
      setToggling(false);
    }
  }, [workflow.id, onUpdated]);

  const handleRunClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    setExecutionDialogOpen(true);
  }, []);

  const handleEditClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    setEditDialogOpen(true);
  }, []);

  const handleExportClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    onExport(workflow.id);
  }, [onExport, workflow.id]);

  const handleSettingsClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    setSettingsDialogOpen(true);
  }, []);

  const handleCredentialsClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    setCredentialsConfigOpen(true);
  }, []);

  const handleOutputsClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    setOutputsDialogOpen(true);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editName.trim()) {
      toast.error('Workflow name is required');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/workflows/${workflow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          description: editDescription || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update workflow');
      }

      toast.success('Workflow updated');
      setEditDialogOpen(false);
      onUpdated?.();
    } catch (error) {
      console.error('Error updating workflow:', error);
      toast.error('Failed to update workflow');
    } finally {
      setSaving(false);
    }
  }, [workflow.id, editName, editDescription, onUpdated]);

  const getStatusBadgeVariant = (status: string): 'gradient-success' | 'gradient-warning' | 'gradient-error' | 'outline' => {
    switch (status) {
      case 'active':
        return 'gradient-success';
      case 'paused':
        return 'gradient-warning';
      case 'error':
        return 'gradient-error';
      case 'draft':
      default:
        return 'outline';
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'Never';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const TriggerIcon = useMemo(() => {
    switch (workflow.trigger.type) {
      case 'chat':
        return MessageSquare;
      case 'chat-input':
        return FormInput;
      case 'cron':
        return Clock;
      case 'webhook':
        return Webhook;
      case 'gmail':
      case 'outlook':
        return Mail;
      case 'telegram':
      case 'discord':
        return Send;
      default:
        return Play;
    }
  }, [workflow.trigger.type]);

  const runButtonConfig = useMemo(() => {
    switch (workflow.trigger.type) {
      case 'chat':
        return { label: 'Chat', icon: MessageSquare };
      case 'chat-input':
        return { label: 'Run', icon: FormInput };
      case 'cron':
        return { label: 'Run Now', icon: Play };
      case 'webhook':
        return { label: 'Test', icon: Play };
      case 'gmail':
        return { label: 'Gmail', icon: Mail };
      case 'outlook':
        return { label: 'Outlook', icon: Mail };
      case 'telegram':
        return { label: 'Telegram', icon: Send };
      case 'discord':
        return { label: 'Discord', icon: Send };
      default:
        return { label: 'Run', icon: Play };
    }
  }, [workflow.trigger.type]);

  const RunIcon = runButtonConfig.icon;

  const isActive = (optimisticStatus || workflow.status) === 'active';

  return (
    <Card className="group relative overflow-hidden rounded-lg border-0 bg-gradient-to-br from-primary/5 via-blue-500/3 to-primary/5 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
      {/* Gradient top border - green when active, blue when inactive */}
      <div className={`absolute top-0 left-0 w-full h-1 transition-all duration-300 ${
        isActive
          ? 'bg-gradient-to-r from-green-500 via-emerald-400 to-green-500 opacity-90'
          : 'bg-gradient-to-r from-primary via-blue-400 to-primary opacity-80'
      }`} />
      <CardHeader className="space-y-2 pt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Switch
              checked={(optimisticStatus || workflow.status) === 'active'}
              onCheckedChange={handleToggleStatus}
              disabled={toggling}
              className="data-[state=checked]:!bg-green-500 dark:data-[state=checked]:!bg-green-600 data-[state=unchecked]:!bg-gray-300 dark:data-[state=unchecked]:!bg-gray-600"
            />
            <span className={`text-xs font-medium ${(optimisticStatus || workflow.status) === 'active' ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
              {(optimisticStatus || workflow.status) === 'active' ? 'Active' : 'Inactive'}
            </span>
          </div>
          <Badge variant={getStatusBadgeVariant(optimisticStatus || workflow.status)}>
            {optimisticStatus || workflow.status}
          </Badge>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <TriggerIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <CardTitle className="card-title truncate" title={workflow.name}>
              {workflow.name.length > 35 ? `${workflow.name.slice(0, 35)}...` : workflow.name}
            </CardTitle>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleEditClick}
              title="Edit workflow"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleExportClick}
              title="Export workflow"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleDelete}
              disabled={deleting}
              title="Delete workflow"
              className="hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {workflow.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {workflow.description}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Created:</span>
            <span>{formatDate(workflow.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span>Last run:</span>
            <span>{formatDate(workflow.lastRun)}</span>
          </div>
          <div className="flex justify-between">
            <span>{workflow.trigger.type === 'chat' ? 'Chats:' : 'Runs:'}</span>
            <span className="font-medium">
              {workflow.trigger.type === 'chat' ? (workflow.conversationCount ?? 0) : workflow.runCount}
            </span>
          </div>
        </div>

        <div className="flex gap-1 flex-wrap pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRunClick}
            className="h-7 px-2 transition-all duration-200 hover:scale-105 active:scale-95 group"
            title={`Execute workflow via ${runButtonConfig.label.toLowerCase()}`}
          >
            <RunIcon className="h-3.5 w-3.5 mr-1 transition-transform duration-200 group-hover:scale-110" />
            <span className="text-xs">{runButtonConfig.label}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSettingsClick}
            className="h-7 px-2 transition-all duration-200 hover:scale-105 active:scale-95 group"
            title="Configure workflow settings"
          >
            <Sliders className="h-3.5 w-3.5 mr-1 transition-transform duration-200 group-hover:rotate-90" />
            <span className="text-xs">Settings</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCredentialsClick}
            className="h-7 px-2 transition-all duration-200 hover:scale-105 active:scale-95 group"
            title="Configure credentials"
          >
            <Key className="h-3.5 w-3.5 mr-1 transition-transform duration-200 group-hover:-rotate-12" />
            <span className="text-xs">Credentials</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOutputsClick}
            className="h-7 px-2 transition-all duration-200 hover:scale-105 active:scale-95 group"
            title="View workflow execution history"
          >
            <BarChart3 className="h-3.5 w-3.5 mr-1 transition-transform duration-200 group-hover:scale-110" />
            <span className="text-xs">Outputs</span>
          </Button>
        </div>
      </CardContent>

      <WorkflowExecutionDialog
        workflowId={workflow.id}
        workflowName={workflow.name}
        workflowDescription={workflow.description || undefined}
        workflowConfig={workflow.config}
        triggerType={workflow.trigger.type}
        triggerConfig={workflow.trigger.config}
        open={executionDialogOpen}
        onOpenChange={setExecutionDialogOpen}
        onExecuted={onUpdated}
      />

      <CredentialsConfigDialog
        workflowId={workflow.id}
        workflowName={workflow.name}
        open={credentialsConfigOpen}
        onOpenChange={setCredentialsConfigOpen}
      />

      <WorkflowSettingsDialog
        workflowId={workflow.id}
        workflowName={workflow.name}
        workflowConfig={workflow.config}
        workflowTrigger={workflow.trigger}
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        onUpdated={onUpdated}
      />

      <WorkflowOutputsDialog
        workflowId={workflow.id}
        workflowName={workflow.name}
        workflowConfig={workflow.config}
        triggerType={workflow.trigger?.type}
        open={outputsDialogOpen}
        onOpenChange={setOutputsDialogOpen}
      />

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Workflow</DialogTitle>
            <DialogDescription>
              Update the name and description of this workflow.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Workflow name"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Describe what this workflow does"
                rows={3}
                disabled={saving}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving || !editName.trim()}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
});
