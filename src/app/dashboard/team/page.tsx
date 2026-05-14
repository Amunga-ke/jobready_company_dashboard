"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  UserCheck,
  Shield,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  joinedAt: string;
  avatarUrl?: string | null;
}

interface TeamData {
  members: TeamMember[];
  currentUserId: string;
  currentUserRole: string;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  RECRUITER: "Recruiter",
  MEMBER: "Member",
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "text-red-700 bg-red-100",
  RECRUITER: "text-violet-700 bg-violet-100",
  MEMBER: "text-gray-700 bg-gray-100",
};

export default function TeamPage() {
  const [data, setData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviting, setInviting] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [togglingActive, setTogglingActive] = useState<string | null>(null);

  const isAdmin = data?.currentUserRole === "ADMIN";

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/employer/team");
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      // API returns { members: [{ companyId, userId, role, isActive, createdAt, user: { id, name, email, avatarUrl } }], currentRole }
      // Flatten to match frontend interface
      const flatMembers: TeamMember[] = (json.members || []).map((m: any) => ({
        id: m.user?.id || m.userId,
        name: m.user?.name || m.userId,
        email: m.user?.email || "",
        role: m.role || "MEMBER",
        isActive: m.isActive ?? true,
        joinedAt: m.createdAt,
        avatarUrl: m.user?.avatarUrl || null,
      }));
      setData({
        members: flatMembers,
        currentUserId: json.currentUserId || "",
        currentUserRole: json.currentRole || json.currentUserRole || "OWNER",
      });
    } catch {
      toast.error("Failed to load team");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email");
      return;
    }
    setInviting(true);
    try {
      const res = await fetch("/api/employer/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Failed to invite");
      }
      toast.success("Invitation sent!");
      setInviteEmail("");
      setInviteRole("MEMBER");
      setInviteOpen(false);
      fetchTeam();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async () => {
    if (!removeId) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/employer/team/${removeId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Member removed");
      setRemoveId(null);
      fetchTeam();
    } catch {
      toast.error("Failed to remove member");
    } finally {
      setRemoving(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setUpdatingRole(memberId);
    try {
      const res = await fetch(`/api/employer/team/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Role updated");
      fetchTeam();
    } catch {
      toast.error("Failed to update role");
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleToggleActive = async (memberId: string, active: boolean) => {
    setTogglingActive(memberId);
    try {
      const res = await fetch(`/api/employer/team/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: active }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(active ? "Member activated" : "Member deactivated");
      fetchTeam();
    } catch {
      toast.error("Failed to update member");
    } finally {
      setTogglingActive(null);
    }
  };

  const totalMembers = data?.members.length ?? 0;
  const activeMembers = data?.members.filter((m) => m.isActive).length ?? 0;
  const admins = data?.members.filter((m) => m.role === "ADMIN").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your team members and roles.
          </p>
        </div>
        {isAdmin && (
          <Button
            className="bg-violet-600 hover:bg-violet-700 text-white"
            onClick={() => setInviteOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-blue-50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl p-3 bg-blue-100">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              {loading ? (
                <Skeleton className="h-6 w-12" />
              ) : (
                <p className="text-xl font-bold text-blue-700">{totalMembers}</p>
              )}
              <p className="text-xs text-blue-600">Total Members</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl p-3 bg-green-100">
              <UserCheck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              {loading ? (
                <Skeleton className="h-6 w-12" />
              ) : (
                <p className="text-xl font-bold text-green-700">{activeMembers}</p>
              )}
              <p className="text-xs text-green-600">Active Members</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-violet-50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl p-3 bg-violet-100">
              <Shield className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              {loading ? (
                <Skeleton className="h-6 w-12" />
              ) : (
                <p className="text-xl font-bold text-violet-700">{admins}</p>
              )}
              <p className="text-xs text-violet-600">Admins</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-5 w-10" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : data?.members.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-violet-100 text-violet-700 text-xs font-medium">
                              {getInitials(member.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{member.name}</span>
                          {member.id === data.currentUserId && (
                            <Badge variant="secondary" className="text-[10px]">
                              You
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {member.email}
                      </TableCell>
                      <TableCell>
                        {isAdmin && member.id !== data.currentUserId ? (
                          updatingRole === member.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Select
                              value={member.role}
                              onValueChange={(v) => handleRoleChange(member.id, v)}
                            >
                              <SelectTrigger className="w-[130px] h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MEMBER">Member</SelectItem>
                                <SelectItem value="RECRUITER">Recruiter</SelectItem>
                                <SelectItem value="ADMIN">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          )
                        ) : (
                          <Badge
                            variant="outline"
                            className={`${ROLE_COLORS[member.role] || ""} border-0`}
                          >
                            {ROLE_LABELS[member.role] || member.role}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {isAdmin && member.id !== data.currentUserId ? (
                          togglingActive === member.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                          ) : (
                            <Switch
                              checked={member.isActive}
                              onCheckedChange={(v) => handleToggleActive(member.id, v)}
                            />
                          )
                        ) : (
                          <Switch checked={member.isActive} disabled />
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {format(new Date(member.joinedAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        {isAdmin && member.id !== data.currentUserId && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setRemoveId(member.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-16 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500">No team members yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="RECRUITER">Recruiter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-violet-600 hover:bg-violet-700 text-white"
              disabled={inviting}
              onClick={handleInvite}
            >
              {inviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <AlertDialog open={!!removeId} onOpenChange={() => setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this team member? They will lose access
              to the company dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removing}
              className="bg-red-600 hover:bg-red-700"
            >
              {removing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
