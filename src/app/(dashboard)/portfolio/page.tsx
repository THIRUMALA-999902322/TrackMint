"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatCurrency,
  formatPercentage,
  getChangeColor,
  getPLBgColor,
  cn,
  getCategoryLabel,
} from "@/lib/utils";
import {
  Plus,
  Briefcase,
  Trash2,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AssetLogo } from "@/components/asset-logo";
import { PortfolioDashboard } from "@/components/portfolio-dashboard";
import { DollarSign, Wallet, Percent } from "lucide-react";

interface AssetSearchResult {
  symbol: string;
  name: string;
  category: "STOCK" | "CRYPTO" | "METAL";
  exchange?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  STOCK: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  CRYPTO: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  METAL: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
};

function useAssetSearch(query: string) {
  const [results, setResults] = useState<AssetSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(
          `/api/assets/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error("Search failed");
        const json = await res.json();
        setResults(json.data || []);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setResults([]);
        }
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [query]);

  return { results, isSearching };
}

interface FormState {
  assetSymbol: string;
  assetName: string;
  category: string;
  quantity: string;
  buyPrice: string;
  fees: string;
  buyDate: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  assetSymbol: "",
  assetName: "",
  category: "STOCK",
  quantity: "",
  buyPrice: "",
  fees: "0",
  buyDate: new Date().toISOString().split("T")[0],
  notes: "",
};

export default function PortfolioPage() {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<AssetSearchResult | null>(
    null
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { results: searchResults, isSearching } = useAssetSearch(searchQuery);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Show dropdown when search results arrive
  useEffect(() => {
    if (searchResults.length > 0 && searchQuery.length >= 2) {
      setShowDropdown(true);
    }
  }, [searchResults, searchQuery]);

  const selectAsset = useCallback((asset: AssetSearchResult) => {
    setSelectedAsset(asset);
    setForm((prev) => ({
      ...prev,
      assetSymbol: asset.symbol,
      assetName: asset.name,
      category: asset.category,
    }));
    setSearchQuery("");
    setShowDropdown(false);
  }, []);

  const clearAsset = useCallback(() => {
    setSelectedAsset(null);
    setForm((prev) => ({
      ...prev,
      assetSymbol: "",
      assetName: "",
      category: "STOCK",
    }));
    setSearchQuery("");
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, []);

  const resetDialog = useCallback(() => {
    setForm({ ...EMPTY_FORM });
    setSearchQuery("");
    setSelectedAsset(null);
    setShowAdvanced(false);
    setShowDropdown(false);
  }, []);

  // --- Data fetching ---
  const { data, isLoading } = useQuery({
    queryKey: ["holdings"],
    queryFn: async () => {
      const res = await fetch("/api/holdings");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 60000,
  });

  // --- Mutations ---
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setAddOpen(false);
      resetDialog();
      toast({ title: "Holding added", variant: "success" });

      // Trigger a price fetch so P/L updates immediately
      fetch(`/api/assets/${encodeURIComponent(variables.symbol)}/price`).catch(
        () => {}
      );
      // Refetch holdings after a short delay to pick up the price
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["holdings"] });
      }, 2000);
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
  const totalValue = holdings.reduce(
    (sum: number, h: any) => sum + (h.currentValue || 0),
    0
  );
  const totalCost = holdings.reduce(
    (sum: number, h: any) => sum + h.quantity * h.avg_buy_price,
    0
  );
  const totalPL = totalValue - totalCost;
  const totalPLPct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;
  const isEmpty = !isLoading && holdings.length === 0;

  const handleSubmit = () => {
    if (!form.assetSymbol || !form.quantity || !form.buyPrice) {
      toast({
        title: "Please fill in all required fields",
        variant: "error",
      });
      return;
    }
    addMutation.mutate({
      symbol: form.assetSymbol,
      name: form.assetName,
      category: form.category,
      quantity: parseFloat(form.quantity),
      avg_buy_price: parseFloat(form.buyPrice),
      fees: parseFloat(form.fees || "0"),
      buy_date: form.buyDate,
      notes: form.notes || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="h-6 w-6" /> Portfolio
          </h1>
          <p className="text-muted-foreground text-sm">
            {holdings.length} holding{holdings.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Dialog
          open={addOpen}
          onOpenChange={(open) => {
            setAddOpen(open);
            if (!open) resetDialog();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Add Holding
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Add Holding</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Asset Search */}
              <div className="space-y-2">
                <Label>Asset</Label>
                {selectedAsset ? (
                  <div className="flex items-center gap-2 p-3 rounded-md border bg-muted/50">
                    <Badge
                      className={cn(
                        "text-[10px] border",
                        CATEGORY_COLORS[selectedAsset.category]
                      )}
                    >
                      {getCategoryLabel(selectedAsset.category)}
                    </Badge>
                    <span className="font-semibold text-sm">
                      {selectedAsset.symbol}
                    </span>
                    <span className="text-sm text-muted-foreground truncate">
                      {selectedAsset.name}
                    </span>
                    <button
                      type="button"
                      onClick={clearAsset}
                      className="ml-auto p-1 rounded-full hover:bg-muted transition-colors"
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <div className="relative" ref={dropdownRef}>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      ref={searchInputRef}
                      placeholder="Search stocks, crypto, metals..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => {
                        if (searchResults.length > 0) setShowDropdown(true);
                      }}
                      autoComplete="off"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {showDropdown && searchResults.length > 0 && (
                      <div className="absolute z-50 top-full mt-1 w-full rounded-md border bg-popover shadow-lg max-h-[240px] overflow-y-auto">
                        {searchResults.map((asset) => (
                          <button
                            key={`${asset.category}-${asset.symbol}`}
                            type="button"
                            className="flex items-center gap-2 w-full px-3 py-2.5 text-left hover:bg-accent transition-colors text-sm"
                            onClick={() => selectAsset(asset)}
                          >
                            <Badge
                              className={cn(
                                "text-[9px] border shrink-0",
                                CATEGORY_COLORS[asset.category]
                              )}
                            >
                              {getCategoryLabel(asset.category)}
                            </Badge>
                            <span className="font-semibold shrink-0">
                              {asset.symbol}
                            </span>
                            <span className="text-muted-foreground truncate">
                              {asset.name}
                            </span>
                            {asset.exchange && (
                              <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                                {asset.exchange}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    {showDropdown &&
                      !isSearching &&
                      searchQuery.length >= 2 &&
                      searchResults.length === 0 && (
                        <div className="absolute z-50 top-full mt-1 w-full rounded-md border bg-popover shadow-lg p-4 text-center text-sm text-muted-foreground">
                          No assets found for &ldquo;{searchQuery}&rdquo;
                        </div>
                      )}
                  </div>
                )}
              </div>

              {/* Quantity + Buy Price */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    Quantity <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="10"
                    value={form.quantity}
                    onChange={(e) =>
                      setForm({ ...form, quantity: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Buy Price ($) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="150.00"
                    value={form.buyPrice}
                    onChange={(e) =>
                      setForm({ ...form, buyPrice: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Buy Date */}
              <div className="space-y-2">
                <Label>Buy Date</Label>
                <Input
                  type="date"
                  value={form.buyDate}
                  onChange={(e) =>
                    setForm({ ...form, buyDate: e.target.value })
                  }
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="Why I bought this..."
                  value={form.notes}
                  rows={2}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              {/* Advanced (Fees) */}
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                Advanced
              </button>
              {showAdvanced && (
                <div className="space-y-2">
                  <Label>Fees ($)</Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={form.fees}
                    onChange={(e) =>
                      setForm({ ...form, fees: e.target.value })
                    }
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button
                loading={addMutation.isPending}
                disabled={!selectedAsset && !form.assetSymbol}
                onClick={handleSubmit}
              >
                Add Holding
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Value",
            value: isEmpty ? "Add your first holding" : formatCurrency(totalValue),
            icon: DollarSign,
            gradient: "from-blue-500/30 to-indigo-500/30 text-blue-400 border-blue-500/30",
            color: "",
          },
          {
            label: "Total Invested",
            value: isEmpty ? "--" : formatCurrency(totalCost),
            icon: Wallet,
            gradient: "from-purple-500/30 to-fuchsia-500/30 text-purple-400 border-purple-500/30",
            color: "",
          },
          {
            label: "Unrealized P/L",
            value: isEmpty ? "--" : formatCurrency(totalPL),
            icon: TrendingUp,
            gradient: "from-green-500/30 to-emerald-500/30 text-green-400 border-green-500/30",
            color: isEmpty ? "" : getChangeColor(totalPL),
          },
          {
            label: "Return",
            value: isEmpty ? "--" : formatPercentage(totalPLPct),
            icon: Percent,
            gradient: "from-orange-500/30 to-amber-500/30 text-orange-400 border-orange-500/30",
            color: isEmpty ? "" : getChangeColor(totalPLPct),
          },
        ].map((tile) => {
          const Icon = tile.icon;
          return (
            <Card key={tile.label} glass>
              <CardContent className="p-4 flex items-center gap-3">
                <div
                  className={cn(
                    "rounded-full border bg-gradient-to-br flex items-center justify-center h-11 w-11 shrink-0",
                    tile.gradient
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{tile.label}</p>
                  <p className={cn("text-xl font-bold truncate", tile.color)}>{tile.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Portfolio Dashboard (pie + performance + movers) */}
      {holdings.length > 0 && <PortfolioDashboard holdings={holdings} />}

      {/* Holdings List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : holdings.length === 0 ? (
        <Card glass>
          <CardContent className="p-8 text-center">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-1">Add your first holding</p>
            <p className="text-muted-foreground text-sm mb-4">
              Search for any stock, crypto, or metal and start tracking your
              portfolio.
            </p>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Holding
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {holdings.map((h: any, idx: number) => {
            const priceLoaded = h.currentPrice && h.currentPrice > 0;
            const pl = priceLoaded
              ? (h.currentPrice - h.avg_buy_price) * h.quantity
              : 0;
            const plPct =
              priceLoaded && h.avg_buy_price > 0
                ? ((h.currentPrice - h.avg_buy_price) / h.avg_buy_price) * 100
                : 0;

            return (
              <Card
                key={h.id}
                glass
                className="group animate-fade-in-up opacity-0"
                style={{ animationDelay: `${idx * 40}ms`, animationFillMode: "forwards" } as any}
              >
                <CardContent className="p-0">
                  <div className="flex items-center">
                    {/* Clickable main area */}
                    <button
                      type="button"
                      className="flex-1 flex items-center justify-between p-4 text-left hover:bg-accent/50 transition-colors rounded-l-lg"
                      onClick={() => router.push(`/asset/${h.symbol}`)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <AssetLogo
                          symbol={h.symbol}
                          category={h.category}
                          logo={h.logo}
                          size={40}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">{h.symbol}</p>
                            <Badge
                              className={cn(
                                "text-[9px] border shrink-0",
                                CATEGORY_COLORS[h.category] || ""
                              )}
                            >
                              {getCategoryLabel(h.category)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {h.name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                        {/* Qty - hidden on very small screens */}
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-muted-foreground">Qty</p>
                          <p className="text-sm">{h.quantity}</p>
                        </div>

                        {/* Avg Price - hidden on small screens */}
                        <div className="text-right hidden md:block">
                          <p className="text-xs text-muted-foreground">
                            Avg Price
                          </p>
                          <p className="text-sm">
                            {formatCurrency(h.avg_buy_price)}
                          </p>
                        </div>

                        {/* Current Price */}
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            Current
                          </p>
                          {priceLoaded ? (
                            <p className="text-sm font-medium">
                              {formatCurrency(h.currentPrice)}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Loading
                            </p>
                          )}
                        </div>

                        {/* P/L with colored indicator */}
                        <div className="text-right min-w-[90px]">
                          <p className="text-xs text-muted-foreground">P/L</p>
                          {priceLoaded ? (
                            <div className="flex items-center justify-end gap-1">
                              {pl > 0 ? (
                                <TrendingUp className="h-3 w-3 text-profit" />
                              ) : pl < 0 ? (
                                <TrendingDown className="h-3 w-3 text-loss" />
                              ) : null}
                              <p
                                className={cn(
                                  "text-sm font-semibold",
                                  getChangeColor(pl)
                                )}
                              >
                                {formatCurrency(pl)}
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">--</p>
                          )}
                          {priceLoaded && (
                            <p
                              className={cn(
                                "text-[10px]",
                                getChangeColor(plPct)
                              )}
                            >
                              {formatPercentage(plPct)}
                            </p>
                          )}
                        </div>

                        {/* Arrow indicator on hover */}
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
                      </div>
                    </button>

                    {/* Delete button - separate from clickable area */}
                    <div className="pr-3">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-loss shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(h.id);
                        }}
                      >
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
