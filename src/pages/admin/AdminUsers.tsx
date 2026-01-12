import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Search, Loader2, Shield, User, Ban, CheckCircle, Settings } from "lucide-react";
import { format } from "date-fns";

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  status: "active" | "suspended";
  role: string;
  created_at: string;
  artist_id: string | null;
}

interface UserRole {
  id: string;
  user_id: string;
  role: "admin" | "artist" | "moderator" | "user";
}

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  // Fetch profiles
  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Profile[];
    },
  });

  // Fetch all user roles
  const { data: allRoles } = useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data as UserRole[];
    },
  });

  // Get roles for a specific user
  const getUserRoles = (userId: string) => {
    return allRoles?.filter((r) => r.user_id === userId).map((r) => r.role) || [];
  };

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: "active" | "suspended" }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ status })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast.success("User status updated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Update roles mutation
  const updateRolesMutation = useMutation({
    mutationFn: async ({ userId, roles }: { userId: string; roles: string[] }) => {
      // Get current roles
      const currentRoles = allRoles?.filter((r) => r.user_id === userId) || [];

      // Roles to add
      const rolesToAdd = roles.filter(
        (r) => !currentRoles.some((cr) => cr.role === r)
      );

      // Roles to remove
      const rolesToRemove = currentRoles.filter(
        (cr) => !roles.includes(cr.role)
      );

      // Add new roles
      if (rolesToAdd.length > 0) {
        const { error } = await supabase.from("user_roles").insert(
          rolesToAdd.map((role) => ({
            user_id: userId,
            role: role as "admin" | "artist" | "moderator" | "user",
          }))
        );
        if (error) throw error;
      }

      // Remove old roles
      for (const roleToRemove of rolesToRemove) {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("id", roleToRemove.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      toast.success("User roles updated");
      setEditingUser(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleEditUser = (profile: Profile) => {
    setEditingUser(profile);
    setUserRoles(getUserRoles(profile.user_id));
  };

  const handleSaveRoles = () => {
    if (!editingUser) return;
    updateRolesMutation.mutate({
      userId: editingUser.user_id,
      roles: userRoles,
    });
  };

  const toggleRole = (role: string) => {
    setUserRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  // Filter profiles
  const filteredProfiles = profiles?.filter((p) => {
    const matchesSearch =
      !search ||
      p.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.user_id.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "artist":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "moderator":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold">Users</h1>
          <p className="mt-1 text-muted-foreground">
            Manage users, roles, and permissions
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-xl overflow-hidden"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles?.map((profile) => {
                  const roles = getUserRoles(profile.user_id);
                  return (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <User className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {profile.display_name || "Anonymous"}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {profile.user_id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {roles.length > 0 ? (
                            roles.map((role) => (
                              <Badge
                                key={role}
                                variant="outline"
                                className={`text-xs ${getRoleBadgeColor(role)}`}
                              >
                                {role}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              No roles
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            profile.status === "active"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {profile.status === "active" ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <Ban className="w-3 h-3" />
                          )}
                          {profile.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(profile.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditUser(profile)}
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const newStatus =
                                profile.status === "active" ? "suspended" : "active";
                              if (
                                confirm(
                                  `${newStatus === "suspended" ? "Suspend" : "Activate"} this user?`
                                )
                              ) {
                                updateStatusMutation.mutate({
                                  userId: profile.user_id,
                                  status: newStatus,
                                });
                              }
                            }}
                          >
                            {profile.status === "active" ? (
                              <Ban className="w-4 h-4 text-destructive" />
                            ) : (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!filteredProfiles?.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </motion.div>

        {/* Edit User Dialog */}
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage User Roles</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">User</p>
                <p className="font-medium">
                  {editingUser?.display_name || "Anonymous"}
                </p>
              </div>

              <div>
                <Label className="mb-3 block">Roles</Label>
                <div className="grid grid-cols-2 gap-3">
                  {["admin", "artist", "moderator", "user"].map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                        userRoles.includes(role)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        <span className="capitalize">{role}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setEditingUser(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveRoles}
                  className="flex-1"
                  disabled={updateRolesMutation.isPending}
                >
                  {updateRolesMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Save Roles"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
