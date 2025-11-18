'use client';

import { useState, useMemo, lazy, Suspense } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Building2, Plus, Trash2, Pencil, UserPlus, Users, CheckCircle2, Search, ChevronsUpDown, Check } from 'lucide-react';
import { useClient, type Client } from '@/components/providers/ClientProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

// Lazy load heavy components
const ClientMembersDialog = lazy(() => import('@/components/clients/client-members-dialog').then(mod => ({ default: mod.ClientMembersDialog })));
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

const getStatusBadgeVariant = (status: string): 'gradient-success' | 'outline' => {
  return status === 'active' ? 'gradient-success' : 'outline';
};

export default function ClientsPage() {
  const { clients, setCurrentClient, isLoading, refetchClients } = useClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState<Record<string, boolean>>({});
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);

  const handleCreateClient = async () => {
    if (!newClientName.trim()) {
      toast.error('Please enter a client name');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newClientName }),
      });

      if (response.ok) {
        toast.success('Client created successfully');
        setIsAddDialogOpen(false);
        setNewClientName('');
        // Refresh clients list
        await refetchClients();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create client');
      }
    } catch (error) {
      logger.error({ error }, 'Failed to create client');
      toast.error('An error occurred');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setEditName(client.name);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      toast.error('Client name is required');
      return;
    }

    if (!editingClient) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/clients/${editingClient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName }),
      });

      if (response.ok) {
        toast.success('Client updated successfully');
        setEditDialogOpen(false);
        await refetchClients();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update client');
      }
    } catch (error) {
      logger.error({ error }, 'Failed to update client');
      toast.error('An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (clientId: string, checked: boolean) => {
    const newStatus = checked ? 'active' : 'inactive';
    setTogglingStatus((prev) => ({ ...prev, [clientId]: true }));

    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update client status');
      }

      toast.success(`Client ${checked ? 'activated' : 'deactivated'}`);
      await refetchClients();
    } catch (error) {
      logger.error({ error }, 'Error updating client status');
      toast.error('Failed to update client status');
    } finally {
      setTogglingStatus((prev) => ({ ...prev, [clientId]: false }));
    }
  };

  const handleDeleteClient = async (client: Client) => {
    toast(`Delete "${client.name}"?`, {
      description: 'This cannot be undone. All workflows and credentials for this client will be deleted.',
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            const response = await fetch(`/api/clients/${client.id}`, {
              method: 'DELETE',
            });

            if (response.ok) {
              toast.success('Client deleted successfully');
              await refetchClients();
            } else {
              const error = await response.json();
              toast.error(error.error || 'Failed to delete client');
            }
          } catch (error) {
            logger.error({ error }, 'Failed to delete client');
            toast.error('An error occurred');
          }
        },
      },
      cancel: {
        label: 'Cancel',
        onClick: () => {},
      },
    });
  };

  // Filter clients
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        client.name.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const clientStatus = client.status || 'active';
      const matchesStatus = statusFilter === 'all' || clientStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [clients, searchQuery, statusFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = clients.length;
    const active = clients.filter((c) => (c.status || 'active') === 'active').length;
    const totalMembers = clients.reduce((sum, c) => sum + (c.memberCount || 1), 0);

    return { total, active, totalMembers };
  }, [clients]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        {!isLoading && clients.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Total Clients */}
            <Card className="relative overflow-hidden rounded-lg border-0 bg-gradient-to-br from-primary/5 via-blue-500/3 to-primary/5 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-400 to-primary opacity-80" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500">
                  <Building2 className="h-3 w-3 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.active} active
                </p>
              </CardContent>
            </Card>

            {/* Active Clients */}
            <Card className="relative overflow-hidden rounded-lg border-0 bg-gradient-to-br from-green-500/30 via-emerald-500/20 to-green-600/30 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-emerald-400 to-green-500" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4">
                <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500">
                  <CheckCircle2 className="h-3 w-3 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.active}</div>
                <p className="text-xs text-muted-foreground">
                  currently active
                </p>
              </CardContent>
            </Card>

            {/* Total Members */}
            <Card className="relative overflow-hidden rounded-lg border-0 bg-gradient-to-br from-purple-500/30 via-violet-500/20 to-purple-600/30 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-violet-400 to-purple-500" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4">
                <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-400 to-violet-500">
                  <Users className="h-3 w-3 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalMembers}</div>
                <p className="text-xs text-muted-foreground">
                  across all clients
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Filters */}
        {!isLoading && clients.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-1 gap-4 w-full sm:w-auto">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>

              <Popover open={statusFilterOpen} onOpenChange={setStatusFilterOpen} modal={true}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={statusFilterOpen}
                    className="w-[140px] justify-between font-normal"
                  >
                    {statusFilter === 'all' ? 'All statuses' : statusFilter === 'active' ? 'Active' : 'Inactive'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[140px] p-0" align="start">
                  <Command>
                    <CommandList className="max-h-[300px]">
                      <CommandGroup>
                        <CommandItem
                          value="all"
                          onSelect={() => {
                            setStatusFilter('all');
                            setStatusFilterOpen(false);
                          }}
                        >
                          <Check className={`mr-2 h-4 w-4 ${statusFilter === 'all' ? 'opacity-100' : 'opacity-0'}`} />
                          All statuses
                        </CommandItem>
                        <CommandItem
                          value="active"
                          onSelect={() => {
                            setStatusFilter('active');
                            setStatusFilterOpen(false);
                          }}
                        >
                          <Check className={`mr-2 h-4 w-4 ${statusFilter === 'active' ? 'opacity-100' : 'opacity-0'}`} />
                          Active
                        </CommandItem>
                        <CommandItem
                          value="inactive"
                          onSelect={() => {
                            setStatusFilter('inactive');
                            setStatusFilterOpen(false);
                          }}
                        >
                          <Check className={`mr-2 h-4 w-4 ${statusFilter === 'inactive' ? 'opacity-100' : 'opacity-0'}`} />
                          Inactive
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default" className="group">
                  <Plus className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:rotate-90" />
                  Add Client
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Client</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Client Name
                    </Label>
                    <Input
                      id="name"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="Acme Corp"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateClient();
                        }
                      }}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateClient}
                      disabled={isCreating}
                    >
                      {isCreating ? 'Creating...' : 'Create Client'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Add Client Button (when no clients) */}
        {!isLoading && clients.length === 0 && (
          <div className="flex justify-end">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default" className="group">
                  <Plus className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:rotate-90" />
                  Add Client
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Client</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Client Name
                    </Label>
                    <Input
                      id="name"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="Acme Corp"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateClient();
                        }
                      }}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateClient}
                      disabled={isCreating}
                    >
                      {isCreating ? 'Creating...' : 'Create Client'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-6">
            {/* Stats Cards Skeleton */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={`stat-${i}`}
                  className="rounded-lg border border-border/50 bg-surface/80 backdrop-blur-sm shadow-sm p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-4 rounded" />
                  </div>
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>

            {/* Search and Filters Skeleton */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-1 gap-4 w-full sm:w-auto">
                <Skeleton className="h-10 flex-1 max-w-sm" />
                <Skeleton className="h-10 w-[140px]" />
              </div>
              <Skeleton className="h-10 w-32" />
            </div>

            {/* Client Cards Skeleton */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={`client-${i}`}
                  className="rounded-lg border border-border/50 bg-surface/80 backdrop-blur-sm shadow-sm p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-5 w-3/4" />
                    <div className="flex gap-1">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Clients Grid */}
        {!isLoading && clients.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map((client) => {
              const clientId = client.id;
              const clientStatus = client.status || 'active';
              const isActive = clientStatus === 'active';

              return (
            <Card
              key={`client-${clientId}`}
              className="group relative overflow-hidden rounded-lg border-0 bg-gradient-to-br from-primary/5 via-blue-500/3 to-primary/5 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
            >
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
                      checked={isActive}
                      onCheckedChange={(checked) => handleToggleStatus(clientId, checked)}
                      disabled={togglingStatus[clientId]}
                      className="data-[state=checked]:!bg-green-500 dark:data-[state=checked]:!bg-green-600 data-[state=unchecked]:!bg-gray-300 dark:data-[state=unchecked]:!bg-gray-600"
                    />
                    <span className={`text-xs font-medium ${isActive ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <Badge variant={getStatusBadgeVariant(clientStatus)}>
                    {clientStatus}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <CardTitle className="card-title truncate" title={client.name}>
                      {client.name.length > 35 ? `${client.name.slice(0, 35)}...` : client.name}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClient(client);
                        setMembersDialogOpen(true);
                      }}
                      title="Manage members"
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClient(client);
                      }}
                      title="Edit client"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClient(client);
                      }}
                      title="Delete client"
                      className="hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  <span className="capitalize">{client.plan || 'free'} plan</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  <span>{client.memberCount || 1} member(s)</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  <span>
                    Created{' '}
                    {client.createdAt
                      ? new Date(client.createdAt).toLocaleDateString()
                      : 'recently'}
                  </span>
                </div>
                <Button
                  onClick={() => setCurrentClient(client)}
                  className="w-full mt-2"
                  size="sm"
                >
                  View Client
                </Button>
              </CardContent>
            </Card>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && clients.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">
              No clients yet. Add one to get started.
            </p>
          </div>
        )}

        {/* Edit Client Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Client</DialogTitle>
              <DialogDescription>
                Update the client name below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">
                  Client Name
                </Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Acme Corp"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveEdit();
                    }
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Members Dialog */}
        {selectedClient && (
          <Suspense fallback={null}>
            <ClientMembersDialog
              clientId={selectedClient.id}
              clientName={selectedClient.name}
              open={membersDialogOpen}
              onOpenChange={setMembersDialogOpen}
            />
          </Suspense>
        )}
      </div>
    </DashboardLayout>
  );
}
