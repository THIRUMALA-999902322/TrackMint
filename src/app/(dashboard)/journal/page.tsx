"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatPercentage, formatDate, getChangeColor, cn } from "@/lib/utils";
import { Plus, BookOpen, TrendingUp, TrendingDown, Target, Award, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function JournalPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [range, setRange] = useState("month");
  const [form, setForm] = useState({
    entryDate: new Date().toISOString().split("T")[0],
    pnlAmount: "",
    strategyTag: "",
    notes: "",
  });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["journal", range],
    queryFn: async () => {
      const res = await fetch(`/api/journal?range=${range}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal"] });
      setAddOpen(false);
      setForm({ entryDate: new Date().toISOString().split("T")[0], pnlAmount: "", strategyTag: "", notes: "" });
      toast({ title: "Entry added", variant: "success" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/journal/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal"] });
    },
  });

  const entries = data?.data?.entries || [];
  const summary = data?.data?.summary || {};

  // Calendar heatmap data
  const calendarData: Record<string, number> = {};
  entries.forEach((e: any) => {
    const d = formatDate(e.entry_date, "yyyy-MM-dd");
    calendarData[d] = (calendarData[d] || 0) + parseFloat(e.pnl_amount);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" /> Trading Journal
          </h1>
          <p className="text-muted-foreground text-sm">Track your daily P/L</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Entry</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Journal Entry</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={form.entryDate} onChange={(e) => setForm({ ...form, entryDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>P/L Amount ($)</Label>
                  <Input type="number" step="any" placeholder="150.00 or -50.00" value={form.pnlAmount} onChange={(e) => setForm({ ...form, pnlAmount: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Strategy Tag (optional)</Label>
                <Input placeholder="Scalping, Swing, Options..." value={form.strategyTag} onChange={(e) => setForm({ ...form, strategyTag: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea placeholder="What went well? What to improve?" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button
                loading={addMutation.isPending}
                onClick={() => addMutation.mutate({
                  entry_date: form.entryDate,
                  pnl_amount: parseFloat(form.pnlAmount),
                  strategy_tag: form.strategyTag || undefined,
                  notes: form.notes || undefined,
                })}
              >
                Add Entry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card glass><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-profit" /><span className="text-xs text-muted-foreground">Total Profit</span></div>
          <p className="text-lg font-bold text-profit">{formatCurrency(summary.total_profit || 0)}</p>
        </CardContent></Card>
        <Card glass><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingDown className="h-4 w-4 text-loss" /><span className="text-xs text-muted-foreground">Total Loss</span></div>
          <p className="text-lg font-bold text-loss">{formatCurrency(Math.abs(summary.total_loss || 0))}</p>
        </CardContent></Card>
        <Card glass><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Target className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Net P/L</span></div>
          <p className={cn("text-lg font-bold", getChangeColor(summary.net_pnl || 0))}>{formatCurrency(summary.net_pnl || 0)}</p>
        </CardContent></Card>
        <Card glass><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Award className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Win Rate</span></div>
          <p className="text-lg font-bold">{(summary.win_rate || 0).toFixed(1)}%</p>
        </CardContent></Card>
        <Card glass><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Calendar className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Streak</span></div>
          <p className={cn("text-lg font-bold", getChangeColor(summary.streak || 0))}>{summary.streak || 0} days</p>
        </CardContent></Card>
      </div>

      {/* Calendar Heatmap */}
      <Card glass>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" /> P/L Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: 90 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (89 - i));
              const key = d.toISOString().split("T")[0];
              const pnl = calendarData[key];
              let bg = "bg-muted/30";
              if (pnl !== undefined) {
                bg = pnl > 0 ? (pnl > 100 ? "bg-profit" : "bg-profit/50") : (pnl < -100 ? "bg-loss" : "bg-loss/50");
              }
              return (
                <div
                  key={key}
                  className={cn("h-4 w-4 rounded-sm cursor-default", bg)}
                  title={`${key}: ${pnl !== undefined ? formatCurrency(pnl) : "No entry"}`}
                />
              );
            })}
          </div>
          <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1"><div className="h-3 w-3 rounded-sm bg-loss" /> Loss</div>
            <div className="flex items-center gap-1"><div className="h-3 w-3 rounded-sm bg-muted/30" /> No entry</div>
            <div className="flex items-center gap-1"><div className="h-3 w-3 rounded-sm bg-profit" /> Profit</div>
          </div>
        </CardContent>
      </Card>

      {/* Range filter */}
      <Tabs defaultValue="month" value={range} onValueChange={setRange}>
        <TabsList>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="year">Year</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Entries list */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : entries.length === 0 ? (
        <Card glass>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No journal entries yet. Start tracking your daily P/L.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map((e: any) => (
            <Card key={e.id} glass>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", parseFloat(e.pnl_amount) >= 0 ? "bg-profit/10" : "bg-loss/10")}>
                      {parseFloat(e.pnl_amount) >= 0 ? <TrendingUp className="h-5 w-5 text-profit" /> : <TrendingDown className="h-5 w-5 text-loss" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{formatDate(e.entry_date, "MMM dd, yyyy")}</p>
                      <div className="flex items-center gap-2">
                        {e.strategy_tag && <Badge variant="secondary" className="text-[10px]">{e.strategy_tag}</Badge>}
                        {e.notes && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{e.notes}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className={cn("text-lg font-bold", getChangeColor(parseFloat(e.pnl_amount)))}>
                      {parseFloat(e.pnl_amount) >= 0 ? "+" : ""}{formatCurrency(parseFloat(e.pnl_amount))}
                    </p>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => deleteMutation.mutate(e.id)}>
                      <span className="text-xs text-muted-foreground">&times;</span>
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
