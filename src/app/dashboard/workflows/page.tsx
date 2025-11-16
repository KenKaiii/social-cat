'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Upload, Search, Workflow, CheckCircle2, XCircle } from 'lucide-react';
import { WorkflowsList } from '@/components/workflows/workflows-list';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { WorkflowListItem } from '@/types/workflows';
import { toast } from 'sonner';
import { useClient } from '@/components/providers/ClientProvider';

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [triggerFilter, setTriggerFilter] = useState('all');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentClient } = useClient();

  const fetchWorkflows = async () => {
    try {
      // Include organizationId in request if client is selected
      const url = currentClient?.id
        ? `/api/workflows?organizationId=${currentClient.id}`
        : '/api/workflows';
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      const data = await response.json();
      setWorkflows(data.workflows || []);
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentClient]);

  // Poll for new workflows every 60 seconds when page is visible
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchWorkflows();
      }
    }, 60000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentClient]);

  const handleWorkflowDeleted = () => {
    fetchWorkflows();
  };

  const handleWorkflowExport = async (id: string) => {
    try {
      const response = await fetch(`/api/workflows/${id}/export`);
      if (!response.ok) {
        throw new Error('Failed to export workflow');
      }

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workflow-${data.name.toLowerCase().replace(/\s+/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Workflow exported', {
        description: 'Workflow has been downloaded successfully.',
      });
    } catch (error) {
      console.error('Failed to export workflow:', error);
      toast.error('Failed to export workflow', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  const handleImportClick = () => {
    setShowImportDialog(true);
    setImportError('');
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportError('');

    try {
      const text = await file.text();

      const response = await fetch('/api/workflows/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowJson: text }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to import workflow');
      }

      const result = await response.json();

      // Show success message with required credentials if any
      if (result.requiredCredentials && result.requiredCredentials.length > 0) {
        toast.success(`Workflow imported successfully!`, {
          description: `"${result.name}" was imported. Required credentials: ${result.requiredCredentials.join(', ')}. Please add these in the Credentials page.`,
          duration: 5000,
        });
      } else {
        toast.success('Workflow imported successfully!', {
          description: `"${result.name}" has been added to your workflows.`,
          duration: 3000,
        });
      }

      // Close dialog
      setShowImportDialog(false);

      // Hard reload the page to show the new workflow
      window.location.reload();
    } catch (error) {
      console.error('Failed to import workflow:', error);
      setImportError(
        error instanceof Error ? error.message : 'Failed to import workflow'
      );
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Filter and search workflows
  const filteredWorkflows = useMemo(() => {
    return workflows.filter((workflow) => {
      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        workflow.description?.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === 'all' || workflow.status === statusFilter;

      // Trigger filter
      const matchesTrigger = triggerFilter === 'all' || workflow.trigger.type === triggerFilter;

      return matchesSearch && matchesStatus && matchesTrigger;
    });
  }, [workflows, searchQuery, statusFilter, triggerFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = workflows.length;
    const active = workflows.filter((w) => w.status === 'active').length;
    const successful = workflows.filter((w) => w.lastRunStatus === 'success').length;
    const failed = workflows.filter((w) => w.lastRunStatus === 'error').length;

    return { total, active, successful, failed };
  }, [workflows]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        {!loading && workflows.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Workflows */}
            <Card className="relative overflow-hidden rounded-lg border-0 bg-gradient-to-br from-primary/5 via-blue-500/3 to-primary/5 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-400 to-primary opacity-80" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4">
                <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
                <Workflow className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.active} active
                </p>
              </CardContent>
            </Card>

            {/* Active Workflows */}
            <Card className="relative overflow-hidden rounded-lg border-0 bg-gradient-to-br from-blue-500/30 via-cyan-500/20 to-blue-600/30 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4">
                <CardTitle className="text-sm font-medium">Active</CardTitle>
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500">
                  <CheckCircle2 className="h-3 w-3 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.active}</div>
                <p className="text-xs text-muted-foreground">
                  Running workflows
                </p>
              </CardContent>
            </Card>

            {/* Last Run Success */}
            <Card className="relative overflow-hidden rounded-lg border-0 bg-gradient-to-br from-green-500/30 via-emerald-500/20 to-green-600/30 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-emerald-400 to-green-500" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4">
                <CardTitle className="text-sm font-medium">Last Run Success</CardTitle>
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500">
                  <CheckCircle2 className="h-3 w-3 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.successful}</div>
                <p className="text-xs text-muted-foreground">
                  Successful executions
                </p>
              </CardContent>
            </Card>

            {/* Last Run Failed */}
            <Card className="relative overflow-hidden rounded-lg border-0 bg-gradient-to-br from-red-500/30 via-rose-500/20 to-red-600/30 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-rose-400 to-red-500" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4">
                <CardTitle className="text-sm font-medium">Last Run Failed</CardTitle>
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-red-400 to-rose-500">
                  <XCircle className="h-3 w-3 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.failed}</div>
                <p className="text-xs text-muted-foreground">
                  Needs attention
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-1 gap-4 w-full sm:w-auto">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter workflows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>

            <Select value={triggerFilter} onValueChange={setTriggerFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All triggers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All triggers</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="cron">Scheduled</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
                <SelectItem value="chat">Chat</SelectItem>
                <SelectItem value="gmail">Gmail</SelectItem>
                <SelectItem value="outlook">Outlook</SelectItem>
                <SelectItem value="telegram">Telegram</SelectItem>
                <SelectItem value="discord">Discord</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleImportClick}
            className="bg-foreground text-background hover:bg-foreground/90 transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95 group"
          >
            <Upload className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:-translate-y-0.5" />
            Import
          </Button>
        </div>

        <WorkflowsList
          workflows={filteredWorkflows}
          loading={loading}
          onWorkflowDeleted={handleWorkflowDeleted}
          onWorkflowExport={handleWorkflowExport}
          onWorkflowUpdated={fetchWorkflows}
        />

        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Import Workflow</DialogTitle>
              <DialogDescription>
                Upload a workflow JSON file to import it into your account.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workflow-file">Workflow File</Label>
                <Input
                  id="workflow-file"
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  disabled={importing}
                  className="transition-all duration-200 file:transition-all file:duration-200 file:hover:bg-accent"
                />
                <p className="text-xs text-muted-foreground">
                  Select a workflow JSON file to import
                </p>
              </div>

              {importError && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive animate-in fade-in slide-in-from-top-2 duration-300">
                  {importError}
                </div>
              )}

              {importing && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Importing workflow...
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
