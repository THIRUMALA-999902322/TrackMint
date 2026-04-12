"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, cn } from "@/lib/utils";
import {
  Shield, Users, Briefcase, Bell, BarChart3, Trash2, Search, ShieldAlert, UserX,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function AdminPage() {
  const [searchFilter, setSearchFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; email: string } | null>(null);
  const queryClient = useQueryClient();

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats");
      if (res.status === 403) throw new Error("FORBIDDEN");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: usersData, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      if (res.status === 403) throw new Error("FORBIDDEN");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setDeleteTarget(null);
      toast({ title: "User removed", variant: "default" });
    },
  });

  // Access denied
  if (usersError?.message === "FORBIDDEN" || statsData?.error === "Unauthorized") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-20 w-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <ShieldAlert className="h-10 w-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground text-sm">You don&apos;t have admin privileges to view this page.</p>
      </div>
    );
  }

  const stats = statsData?.data || {};
  const users = (usersData?.data || []) as any[];
  const filtered = searchFilter
    ? users.filter(
        (u: any) =>
          u.email?.toLowerCase().includes(searchFilter.toLowerCase()) ||
          u.name?.toLowerCase().includes(searchFilter.toLowerCase())
      )
    : users;

  const statTiles = [
    { label: "Total Users", value: stats.total_users || 0, icon: Users, gradient: "from-blue-500/30 to-indigo-500/30 text-blue-400" },
    { label: "Total Holdings", value: stats.total_holdings || 0, icon: Briefcase, gradient: "from-purple-500/30 to-fuchsia-500/30 text-purple-400" },
    { label: "Active Alerts", value: stats.total_alerts || 0, icon: Bell, gradient: "from-orange-500/30 to-amber-500/30 text-orange-400" },
    { label: "Assets Tracked", value: stats.total_assets || 0, icon: BarChart3, gradient: "from-green-500/30 to-emerald-500/30 text-green-400" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" /> Admin Panel
        </h1>
        <p className="text-muted-foreground text-sm">Manage users and monitor the platform</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statTiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Card key={tile.label} glass>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("rounded-full border bg-gradient-to-br flex items-center justify-center h-11 w-11 shrink-0", tile.gradient)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{tile.label}</p>
                  {statsLoading ? (
                    <Skeleton className="h-6 w-12" />
                  ) : (
                    <p className="text-xl font-bold">{tile.value}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Users Table */}
      <Card glass>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                className="pl-9"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>
            <Badge variant="secondary">{users.length} users</Badge>
          </div>

          {usersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((u: any) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card/50 hover:bg-accent/30 transition-colors"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs">
                      {u.email?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{u.email}</p>
                      {u.is_admin && (
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                          Admin
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {u.name || "No name"} · Joined {formatDate(u.created_at, "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0 hidden sm:flex">
                    <span>{u.holding_count} holdings</span>
                    <span>{u.alert_count} alerts</span>
                  </div>
                  {!u.is_admin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-loss shrink-0"
                      onClick={() => setDeleteTarget({ id: u.id, email: u.email })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No users found
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-loss" /> Remove User
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove <strong>{deleteTarget?.email}</strong> and all
            their data (holdings, watchlists, alerts, journal entries)? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              loading={deleteMutation.isPending}
            >
              Remove User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="text-xs text-muted-foreground text-center">
        New users last 7 days: {stats.new_users_last_7_days ?? "—"}
      </p>
    </div>
  );
}
