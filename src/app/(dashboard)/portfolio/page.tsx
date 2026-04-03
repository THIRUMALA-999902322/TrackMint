"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercentage, getChangeColor, cn, getCategoryLabel } from "@/lib/utils";
import { Plus, Briefcase, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function PortfolioPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ assetSymbol: "", assetName: "", category: "STOCK", quantity: "", buyPrice: "", fees: "0", buyDate: new Date().toISOString().split("T")[0], notes: "" });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["holdings"],
    queryFn: async () => {
      const res = await fetch("/api/holdings");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const addMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to add");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setAddOpen(false);
      setForm({ assetSymbol: "", assetName: "", category: "STOCK", quantity: "", buyPrice: "", fees: "0", buyDate: new Date().toISOString().split("T")[0], notes: "" });
      toast({ title: "Holding added", variant: "success" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/holdings/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({ title: "Holding removed", variant: "default" });
    },
  });

  const holdings = data?.data || [];
  const totalValue = holdings.reduce((sum: number, h: any) => sum + (h.currentValue || 0), 0);
  const totalCost = holdings.reduce((sum: number, h: any) => sum + (h.quantity * h.avg_buy_price), 0);
  const totalPL = totalValue - totalCost;
  const totalPLPct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="h-6 w-6" /> Portfolio
          </h1>
          <p className="text-muted-foreground text-sm">{holdings.length} holdings</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Holding</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Holding</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Symbol</Label>
                  <Input placeholder="AAPL, BTC, XAU..." value={form.assetSymbol} onChange={(e) => setForm({ ...form, assetSymbol: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input placeholder="Apple Inc." value={form.assetName} onChange={(e) => setForm({ ...form, assetName: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="STOCK">Stock</option>
                  <option value="CRYPTO">Crypto</option>
                  <option value="METAL">Metal</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input type="number" step="any" placeholder="10" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Buy Price ($)</Label>
                  <Input type="number" step="any" placeholder="150.00" value={form.buyPrice} onChange={(e) => setForm({ ...form, buyPrice: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fees ($)</Label>
                  <Input type="number" step="any" placeholder="0" value={form.fees} onChange={(e) => setForm({ ...form, fees: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Buy Date</Label>
                  <Input type="date" value={form.buyDate} onChange={(e) => setForm({ ...form, buyDate: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea placeholder="Why I bought this..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button
                loading={addMutation.isPending}
                onClick={() => addMutation.mutate({
                  symbol: form.assetSymbol,
                  name: form.assetName,
                  category: form.category,
                  quantity: parseFloat(form.quantity),
                  avg_buy_price: parseFloat(form.buyPrice),
                  fees: parseFloat(form.fees || "0"),
                  buy_date: form.buyDate,
                  notes: form.notes || undefined,
                })}
              >
                Add Holding
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card glass><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Value</p>
          <p className="text-xl font-bold">{formatCurrency(totalValue)}</p>
        </CardContent></Card>
        <Card glass><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Invested</p>
          <p className="text-xl font-bold">{formatCurrency(totalCost)}</p>
        </CardContent></Card>
        <Card glass><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Unrealized P/L</p>
          <p className={cn("text-xl font-bold", getChangeColor(totalPL))}>{formatCurrency(totalPL)}</p>
        </CardContent></Card>
        <Card glass><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Return</p>
          <p className={cn("text-xl font-bold", getChangeColor(totalPLPct))}>{formatPercentage(totalPLPct)}</p>
        </CardContent></Card>
      </div>

      {/* Holdings list */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : holdings.length === 0 ? (
        <Card glass>
          <CardContent className="p-8 text-center">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No holdings yet. Add your first investment above.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {holdings.map((h: any) => {
            const pl = (h.currentPrice - h.avg_buy_price) * h.quantity;
            const plPct = h.avg_buy_price > 0 ? ((h.currentPrice - h.avg_buy_price) / h.avg_buy_price) * 100 : 0;
            return (
              <Card key={h.id} glass>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-[10px]">{getCategoryLabel(h.category)}</Badge>
                      <div>
                        <p className="text-sm font-semibold">{h.symbol}</p>
                        <p className="text-xs text-muted-foreground">{h.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-muted-foreground">Qty</p>
                        <p className="text-sm">{h.quantity}</p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-muted-foreground">Avg Price</p>
                        <p className="text-sm">{formatCurrency(h.avg_buy_price)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Current</p>
                        <p className="text-sm font-medium">{formatCurrency(h.currentPrice || 0)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">P/L</p>
                        <p className={cn("text-sm font-semibold", getChangeColor(pl))}>
                          {formatCurrency(pl)} <span className="text-xs">({formatPercentage(plPct)})</span>
                        </p>
                      </div>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-loss" onClick={() => deleteMutation.mutate(h.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
