"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, cn, getCategoryLabel } from "@/lib/utils";
import { Plus, Bell, BellOff, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function AlertsPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ symbol: "", name: "", category: "STOCK", conditionType: "ABOVE", targetPrice: "", cooldown: "60" });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      const res = await fetch("/api/alerts");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const addMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      setAddOpen(false);
      setForm({ symbol: "", name: "", category: "STOCK", conditionType: "ABOVE", targetPrice: "", cooldown: "60" });
      toast({ title: "Alert created", variant: "success" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await fetch(`/api/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/alerts/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      toast({ title: "Alert deleted", variant: "default" });
    },
  });

  const alerts = data?.data || [];
  const activeCount = alerts.filter((a: any) => a.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="h-6 w-6" /> Price Alerts</h1>
          <p className="text-muted-foreground text-sm">{activeCount} active alerts</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New Alert</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Price Alert</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Symbol</Label>
                  <Input placeholder="AAPL, BTC, XAU..." value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input placeholder="Apple Inc." value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <option value="STOCK">Stock</option>
                    <option value="CRYPTO">Crypto</option>
                    <option value="METAL">Metal</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Condition</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.conditionType} onChange={(e) => setForm({ ...form, conditionType: e.target.value })}>
                    <option value="ABOVE">Price goes above</option>
                    <option value="BELOW">Price goes below</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Price ($)</Label>
                  <Input type="number" step="any" placeholder="200.00" value={form.targetPrice} onChange={(e) => setForm({ ...form, targetPrice: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Cooldown (minutes)</Label>
                  <Input type="number" placeholder="60" value={form.cooldown} onChange={(e) => setForm({ ...form, cooldown: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button loading={addMutation.isPending} onClick={() => addMutation.mutate({
                symbol: form.symbol, name: form.name, category: form.category,
                condition_type: form.conditionType, target_price: parseFloat(form.targetPrice),
                cooldown_minutes: parseInt(form.cooldown),
              })}>Create Alert</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : alerts.length === 0 ? (
        <Card glass>
          <CardContent className="p-8 text-center">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No alerts set. Create one to get notified when prices move.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {alerts.map((a: any) => (
            <Card key={a.id} glass className={!a.is_active ? "opacity-50" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center",
                      a.condition_type === "ABOVE" ? "bg-profit/10" : "bg-loss/10"
                    )}>
                      {a.condition_type === "ABOVE" ? <ArrowUp className="h-5 w-5 text-profit" /> : <ArrowDown className="h-5 w-5 text-loss" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{a.symbol}</p>
                        <Badge variant="secondary" className="text-[10px]">{getCategoryLabel(a.category)}</Badge>
                        <Badge variant={a.is_active ? "default" : "neutral"} className="text-[10px]">
                          {a.is_active ? "Active" : "Paused"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Alert when price goes {a.condition_type === "ABOVE" ? "above" : "below"}{" "}
                        <strong>{formatCurrency(parseFloat(a.target_price))}</strong>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.last_triggered_at && (
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        Last: {formatDate(a.last_triggered_at, "MMM dd, h:mm a")}
                      </span>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleMutation.mutate({ id: a.id, isActive: a.is_active })}>
                      {a.is_active ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-loss" onClick={() => deleteMutation.mutate(a.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
