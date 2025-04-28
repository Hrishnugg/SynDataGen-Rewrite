'use client';

import React, { useState } from 'react';
import {
  useInviteMemberMutation,
  useUpdateMemberRoleMutation,
  useRemoveMemberMutation,
} from '@/features/projects/projectApiSlice';
import { useGetSessionQuery } from '@/features/auth/authApiSlice'; // To get current user ID
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shadcn/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shadcn/table";
import { toast } from "sonner";
import { IconUserPlus, IconTrash, IconLoader, IconEdit } from "@tabler/icons-react";

// TODO: Import Project and Role types from a shared location
type Role = 'owner' | 'admin' | 'member' | 'viewer';
interface Project {
  id: string;
  teamMembers: { [userId: string]: Role };
  // ... other fields
}

interface TeamManagementProps {
  project: Project;
}

// Helper to determine user capabilities based on role
const canManageTeam = (userRole: Role | undefined) => {
  return userRole === 'owner' || userRole === 'admin';
};

export function TeamManagement({ project }: TeamManagementProps) {
  const { data: session } = useGetSessionQuery(); // Get current user session
  const currentUserId = session?.id;
  const currentUserRole = currentUserId ? project.teamMembers[currentUserId] : undefined;

  const [inviteUserId, setInviteUserId] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('viewer');

  const [inviteMember, { isLoading: isInviting }] = useInviteMemberMutation();
  const [updateMemberRole, { isLoading: isUpdatingRole }] = useUpdateMemberRoleMutation();
  const [removeMember, { isLoading: isRemoving }] = useRemoveMemberMutation();

  // --- Handlers ---
  const handleInvite = async () => {
    if (!inviteUserId) {
      toast.error("Please enter a User ID to invite.");
      return;
    }
    try {
      await inviteMember({ 
        projectId: project.id, 
        invite: { userId: inviteUserId, role: inviteRole }
      }).unwrap();
      toast.success(`User ${inviteUserId} invited as ${inviteRole}.`);
      setInviteUserId(''); // Clear input
    } catch (err: any) {
      console.error("Invite failed:", err);
      toast.error(err?.data?.message || "Failed to invite user.");
    }
  };

  const handleRoleChange = async (memberId: string, newRole: Role) => {
    if (newRole === 'owner' || (newRole !== 'admin' && newRole !== 'member' && newRole !== 'viewer')) {
         toast.error("Invalid role selected for update.");
         return;
    }
    try {
      await updateMemberRole({
        projectId: project.id,
        memberId: memberId,
        update: { role: newRole }
      }).unwrap();
      toast.success(`Role updated for user ${memberId}.`);
    } catch (err: any) {
      console.error("Role update failed:", err);
      toast.error(err?.data?.message || "Failed to update role.");
    }
  };

  const handleRemove = async (memberId: string, memberRole: Role) => {
    if (memberRole === 'owner') {
      toast.error("Cannot remove the project owner.");
      return;
    }
    // Basic confirmation
    if (!confirm(`Are you sure you want to remove user ${memberId}?`)) {
      return;
    }
    try {
      await removeMember({ projectId: project.id, memberId }).unwrap();
      toast.success(`User ${memberId} removed.`);
    } catch (err: any) {
      console.error("Remove failed:", err);
      toast.error(err?.data?.message || "Failed to remove user.");
    }
  };

  // Determine if current user can manage the team
  const canManage = canManageTeam(currentUserRole);

  return (
    <div className="space-y-6">
      {/* --- Invite Member Form (Only for Admins/Owners) --- */}
      {canManage && (
        <div className="space-y-4 rounded-md border p-4">
          <h4 className="font-medium">Invite New Member</h4>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="invite-user-id">User ID</Label>
              <Input 
                id="invite-user-id" 
                placeholder="Enter User ID to invite" 
                value={inviteUserId}
                onChange={(e) => setInviteUserId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select 
                value={inviteRole} 
                onValueChange={(value: 'admin' | 'member' | 'viewer') => setInviteRole(value)}
              >
                <SelectTrigger id="invite-role" className="w-[180px]">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleInvite} disabled={isInviting || !inviteUserId} className="w-full sm:w-auto">
              {isInviting ? <IconLoader className="mr-2 h-4 w-4 animate-spin" /> : <IconUserPlus className="mr-2 h-4 w-4" />}
              Invite Member
            </Button>
          </div>
        </div>
      )}

      {/* --- Team Members Table --- */}
      <div>
        <h4 className="mb-2 font-medium">Current Team</h4>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(project.teamMembers).map(([userId, role]) => (
                <TableRow key={userId}>
                  <TableCell className="font-medium">{userId}</TableCell>
                  <TableCell>
                    {canManage && role !== 'owner' && userId !== currentUserId ? (
                      // Editable role for non-owners/non-self if user is admin/owner
                       <Select 
                         defaultValue={role} 
                         onValueChange={(newRole: Role) => handleRoleChange(userId, newRole)}
                         disabled={isUpdatingRole}
                        >
                         <SelectTrigger className="w-[120px] h-8 text-xs">
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                    ) : (
                      // Non-editable display
                      <span className="capitalize">{role}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                     {/* Allow removing non-owners if admin/owner, or allow self-removal if not owner */}
                     {(canManage && role !== 'owner') || (userId === currentUserId && role !== 'owner') ? (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleRemove(userId, role)}
                          disabled={isRemoving}
                          className="text-destructive hover:text-destructive"
                        >
                           {isRemoving ? <IconLoader className="h-4 w-4 animate-spin" /> : <IconTrash className="h-4 w-4" />}
                           <span className="sr-only">Remove User</span>
                        </Button>
                     ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
} 