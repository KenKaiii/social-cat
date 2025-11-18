'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Trash2, Mail, ChevronsUpDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface Member {
  id: string;
  userId: string;
  email?: string;
  name?: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: string;
}

interface ClientMembersDialogProps {
  clientId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getRoleBadgeVariant = (role: string): 'gradient-active' | 'gradient-warning' | 'gradient-success' | 'outline' => {
  switch (role) {
    case 'owner':
      return 'gradient-active';
    case 'admin':
      return 'gradient-warning';
    case 'member':
      return 'gradient-success';
    default:
      return 'outline';
  }
};

const getRoleDisplayName = (role: string) => {
  // Display "Admin" for owner role to simplify the UI
  return role === 'owner' ? 'Admin' : role;
};

export function ClientMembersDialog({ clientId, clientName, open, onOpenChange }: ClientMembersDialogProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [isInviting, setIsInviting] = useState(false);
  const [roleSelectOpen, setRoleSelectOpen] = useState(false);

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/clients/${clientId}/members`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      } else {
        toast.error('Failed to load members');
      }
    } catch (error) {
      logger.error({ error }, 'Failed to fetch members');
      toast.error('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, clientId]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setIsInviting(true);
    try {
      const response = await fetch(`/api/clients/${clientId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (response.ok) {
        toast.success('Invitation sent successfully');
        setInviteEmail('');
        setInviteRole('member');
        await fetchMembers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to send invitation');
      }
    } catch (error) {
      logger.error({ error }, 'Failed to invite member');
      toast.error('An error occurred');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    toast(`Remove "${memberName}"?`, {
      description: 'This user will lose access to this client organization.',
      action: {
        label: 'Remove',
        onClick: async () => {
          try {
            const response = await fetch(`/api/clients/${clientId}/members/${memberId}`, {
              method: 'DELETE',
            });

            if (response.ok) {
              toast.success('Member removed successfully');
              await fetchMembers();
            } else {
              const error = await response.json();
              toast.error(error.error || 'Failed to remove member');
            }
          } catch (error) {
            logger.error({ error }, 'Failed to remove member');
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {clientName} - Members
          </DialogTitle>
          <DialogDescription>
            Manage users who have access to this client organization
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-4 scrollbar-none">
          {/* Invite Section */}
          <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Invite New Member</h3>
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <Label htmlFor="email" className="mb-2 block">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleInvite();
                  }
                }}
              />
            </div>
            <div>
              <Label htmlFor="role" className="mb-2 block">Role</Label>
              <Popover open={roleSelectOpen} onOpenChange={setRoleSelectOpen} modal={true}>
                <PopoverTrigger asChild>
                  <Button
                    id="role"
                    variant="outline"
                    role="combobox"
                    aria-expanded={roleSelectOpen}
                    className="w-full justify-between font-normal"
                  >
                    {inviteRole === 'admin' ? 'Admin - Full access' :
                     inviteRole === 'member' ? 'Member - Can create and edit workflows' :
                     'Viewer - Read-only access'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                  <Command>
                    <CommandList className="max-h-[300px]">
                      <CommandGroup>
                        <CommandItem
                          value="admin"
                          onSelect={() => {
                            setInviteRole('admin');
                            setRoleSelectOpen(false);
                          }}
                        >
                          <Check className={`mr-2 h-4 w-4 ${inviteRole === 'admin' ? 'opacity-100' : 'opacity-0'}`} />
                          Admin - Full access
                        </CommandItem>
                        <CommandItem
                          value="member"
                          onSelect={() => {
                            setInviteRole('member');
                            setRoleSelectOpen(false);
                          }}
                        >
                          <Check className={`mr-2 h-4 w-4 ${inviteRole === 'member' ? 'opacity-100' : 'opacity-0'}`} />
                          Member - Can create and edit workflows
                        </CommandItem>
                        <CommandItem
                          value="viewer"
                          onSelect={() => {
                            setInviteRole('viewer');
                            setRoleSelectOpen(false);
                          }}
                        >
                          <Check className={`mr-2 h-4 w-4 ${inviteRole === 'viewer' ? 'opacity-100' : 'opacity-0'}`} />
                          Viewer - Read-only access
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <Button onClick={handleInvite} disabled={isInviting} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              {isInviting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </div>

        {/* Members List */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Current Members ({isLoading ? '...' : members.length})</h3>
          {isLoading ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 border rounded-lg animate-pulse">
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/4"></div>
                </div>
              </div>
            </div>
          ) : members.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">No members yet</div>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{member.name || member.email || 'Unknown User'}</p>
                      <Badge variant={getRoleBadgeVariant(member.role)}>{getRoleDisplayName(member.role)}</Badge>
                    </div>
                    {member.email && member.name && (
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(member.joinedAt).toLocaleDateString()}
                    </p>
                  </div>
                  {member.role !== 'owner' && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemoveMember(member.id, member.name || member.email || 'User')}
                      className="hover:text-destructive flex-shrink-0"
                      title="Remove member"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
