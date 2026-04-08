"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, cn, getCategoryLabel } from "@/lib/utils";
import { Plus, Bell, BellOff, ArrowUp, ArrowDown, Trash2, Search, X, Loader2, TrendingUp, Pencil } from "lucide-react";
import { toast } from "@/hooks/use-toast";

function getCategoryBadgeClass(cat: string) {
  if (cat === "STOCK") return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  if (cat === "CRYPTO") return "bg-orange-500/20 text-orange-400 border-orange-500/30";
  if (cat === "METAL") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  return "";
}

export default function AlertsPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [conditionType, setConditionType] = useState("ABOVE");
  const [targetPrice, setTargetPrice] = useState("");
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/assets/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(data.data || []);
      } catch { setSearchResults([]); }
      setSearching(false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  // Fetch current price when asset is selected
  useEffect(() => {
    if (!selectedAsset) { setCurrentPrice(null); return; }
    setLoadingPrice(true);
    fetch(`/api/assets/${selectedAsset.symbol}/price`)
      .then(r => r.json())
      .then(d => { if (d.data?.price) setCurrentPrice(d.data.price); })
      .catch(() => {})
      .finally(() => setLoadingPrice(false));
  }, [selectedAsset]);

  function selectAsset(asset: any) {
    setSelectedAsset(asset);
    setSearchQuery("");
    setSearchResults(null);
  }

  function clearAsset() {
    setSelectedAsset(null);
    setCurrentPrice(null);
    setTargetPrice("");
  }

  function resetForm() {
    clearAsset();
    setConditionType("ABOVE");
    setTargetPrice("");
    setSearchQuery("");
    setSearchResults(null);
    setEmailEnabled(true);
    setNotifyEmail("");
    setEditingId(null);
  }

  function openEdit(a: any) {
    setEditingId(a.id);
    setSelectedAsset({ symbol: a.symbol, name: a.name, category: a.category });
    setConditionType(a.condition_type);
    setTargetPrice(String(a.target_price));
    setEmailEnabled(a.email_enabled !== false);
    setNotifyEmail(a.notify_email || "");
    setAddOpen(true);
  }

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
      resetForm();
      toast({ title: "Alert created", variant: "success" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await fetch(`/api/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      setAddOpen(false);
      resetForm();
      toast({ title: "Alert updated", variant: "success" });
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

  function handleSave() {
    if (!selectedAsset || !targetPrice) {
      toast({ title: "Please select an asset and set a target price", variant: "error" });
      return;
    }
    if (notifyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyEmail)) {
      toast({ title: "Please enter a valid email address", variant: "error" });
      return;
    }
    if (editingId) {
      editMutation.mutate({
        id: editingId,
        payload: {
          condition_type: conditionType,
          target_price: parseFloat(targetPrice),
          email_enabled: emailEnabled,
          notify_email: notifyEmail || null,
        },
      });
    } else {
      addMutation.mutate({
        symbol: selectedAsset.symbol,
        name: selectedAsset.name,
        category: selectedAsset.category,
        condition_type: conditionType,
        target_price: parseFloat(targetPrice),
        cooldown_minutes: 60,
        email_enabled: emailEnabled,
        notify_email: notifyEmail || null,
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="h-6 w-6" /> Price Alerts</h1>
          <p className="text-muted-foreground text-sm">{activeCount} active alerts</p>
        </div>
        <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New Alert</Button></DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>{editingId ? "Edit Price Alert" : "Create Price Alert"}</DialogTitle></DialogHeader>
            <div className="space-y-5 py-4">

              {/* Step 1: Search asset */}
              {!selectedAsset ? (
                <div className="space-y-2">
                  <Label>Search Asset</Label>
                  <div className="relative">
                    {searching ? (
                      <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                    ) : (
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    )}
                    <Input
                      placeholder="Search stocks, crypto, metals..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                    />
                  </div>
                  {searchResults !== null && (
                    <div className="max-h-48 overflow-y-auto rounded-lg border bg-popover shadow-lg">
                      {searchResults.length === 0 ? (
                        <p className="p-3 text-sm text-muted-foreground text-center">No results found</p>
                      ) : searchResults.map((r: any) => (
                        <button
                          key={`${r.symbol}-${r.category}`}
                          className="flex items-center gap-3 w-full p-3 hover:bg-accent/50 text-left transition-colors"
                          onClick={() => selectAsset(r)}
                        >
                          <Badge className={cn("text-[10px] shrink-0", getCategoryBadgeClass(r.category))}>{getCategoryLabel(r.category)}</Badge>
                          <span className="text-sm font-medium">{r.symbol}</span>
                          <span className="text-xs text-muted-foreground truncate">{r.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Selected asset chip */}
                  <div className="space-y-2">
                    <Label>Asset</Label>
                    <div className="flex items-center gap-2 p-3 rounded-lg border bg-accent/30">
                      <Badge className={cn("text-[10px]", getCategoryBadgeClass(selectedAsset.category))}>{getCategoryLabel(selectedAsset.category)}</Badge>
                      <span className="font-semibold text-sm">{selectedAsset.symbol}</span>
                      <span className="text-xs text-muted-foreground flex-1">{selectedAsset.name}</span>
                      <button onClick={clearAsset} className="text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    {/* Current price display */}
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="text-muted-foreground">Current Price:</span>
                      {loadingPrice ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : currentPrice ? (
                        <span className="font-bold text-primary">{formatCurrency(currentPrice)}</span>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </div>
                  </div>

                  {/* Step 2: Condition toggle buttons */}
                  <div className="space-y-2">
                    <Label>Alert Condition</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        className={cn(
                          "flex items-center justify-center gap-2 p-3 rounded-lg border-2 font-medium text-sm transition-all",
                          conditionType === "ABOVE"
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                            : "border-border hover:border-muted-foreground text-muted-foreground"
                        )}
                        onClick={() => setConditionType("ABOVE")}
                      >
                        <ArrowUp className="h-4 w-4" /> Price goes ABOVE
                      </button>
                      <button
                        className={cn(
                          "flex items-center justify-center gap-2 p-3 rounded-lg border-2 font-medium text-sm transition-all",
                          conditionType === "BELOW"
                            ? "border-red-500 bg-red-500/10 text-red-400"
                            : "border-border hover:border-muted-foreground text-muted-foreground"
                        )}
                        onClick={() => setConditionType("BELOW")}
                      >
                        <ArrowDown className="h-4 w-4" /> Price goes BELOW
                      </button>
                    </div>
                  </div>

                  {/* Step 3: Target price */}
                  <div className="space-y-2">
                    <Label>Target Price ($)</Label>
                    <Input
                      type="number"
                      step="any"
                      placeholder={currentPrice ? currentPrice.toFixed(2) : "Enter target price"}
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(e.target.value)}
                      className="text-lg font-semibold"
                    />
                    {currentPrice && targetPrice && (
                      <p className="text-xs text-muted-foreground">
                        {((Math.abs(parseFloat(targetPrice) - currentPrice) / currentPrice) * 100).toFixed(1)}% {conditionType === "ABOVE" ? "above" : "below"} current price
                      </p>
                    )}
                  </div>

                  {/* Step 4: Email notification settings */}
                  <div className="space-y-2">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm font-medium">Email me when triggered</span>
                      <input
                        type="checkbox"
                        checked={emailEnabled}
                        onChange={(e) => setEmailEnabled(e.target.checked)}
                        className="h-4 w-4 accent-primary cursor-pointer"
                      />
                    </label>
                    {emailEnabled && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Send to (optional)</Label>
                        <Input
                          type="email"
                          placeholder="Leave blank to use your account email"
                          value={notifyEmail}
                          onChange={(e) => setNotifyEmail(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setAddOpen(false); resetForm(); }}>Cancel</Button>
              <Button
                loading={addMutation.isPending || editMutation.isPending}
                onClick={handleSave}
                disabled={!selectedAsset || !targetPrice}
              >
                {editingId ? "Save Changes" : "Create Alert"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : alerts.length === 0 ? (
        <Card glass>
          <CardContent className="p-8 text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Bell className="h-8 w-8 text-primary" />
            </div>
            <p className="font-medium mb-1">Get notified when prices hit your targets</p>
            <p className="text-sm text-muted-foreground mb-4">Create alerts for stocks, crypto, or metals and we'll notify you.</p>
            <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-2" /> Create Your First Alert</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {alerts.map((a: any) => (
            <Card key={a.id} glass className={cn("transition-all", !a.is_active && "opacity-50")}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center",
                      a.condition_type === "ABOVE" ? "bg-emerald-500/10" : "bg-red-500/10"
                    )}>
                      {a.condition_type === "ABOVE" ? <ArrowUp className="h-5 w-5 text-emerald-400" /> : <ArrowDown className="h-5 w-5 text-red-400" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{a.symbol}</p>
                        <Badge className={cn("text-[10px]", getCategoryBadgeClass(a.category))}>{getCategoryLabel(a.category)}</Badge>
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
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(a)}>
                      <Pencil className="h-4 w-4" />
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
