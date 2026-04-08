"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercentage, cn, getCategoryLabel } from "@/lib/utils";
import { Search, Plus, X, TrendingUp, TrendingDown, Eye, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AssetLogo } from "@/components/asset-logo";

const categoryBadgeColors: Record<string, string> = {
  STOCK: "bg-blue-500/15 text-blue-500 border-blue-500/20",
  CRYPTO: "bg-orange-500/15 text-orange-500 border-orange-500/20",
  METAL: "bg-yellow-500/15 text-yellow-500 border-yellow-500/20",
};

function getCategoryBadgeClass(category: string) {
  return categoryBadgeColors[category] || "bg-muted text-muted-foreground";
}

interface WatchlistItem {
  id: string;
  assetId: string;
  symbol: string;
  name: string;
  category: string;
  price: number;
  changePercent: number;
  createdAt: string;
  logo?: string | null;
}

function Sparkline({ symbol, category, positive }: { symbol: string; category: string; positive: boolean }) {
  const { data, isLoading } = useQuery({
    queryKey: ["sparkline", symbol, category],
    queryFn: async () => {
      const res = await fetch(`/api/assets/${encodeURIComponent(symbol)}?range=1M&category=${category}`);
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      const hist = (json?.data?.historical || []) as Array<{ time: number; close: number }>;
      return hist.map((h) => ({ t: h.time, v: h.close }));
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return <Skeleton className="h-12 w-full" />;
  }

  if (!data || data.length === 0) {
    return <div className="h-12 w-full flex items-center justify-center text-[10px] text-muted-foreground">No chart data</div>;
  }

  const color = positive ? "hsl(142 71% 45%)" : "hsl(0 84% 60%)";

  return (
    <div className="h-12 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function TickerCard({
  item,
  index,
  onRemove,
  onClick,
}: {
  item: WatchlistItem;
  index: number;
  onRemove: (id: string) => void;
  onClick: () => void;
}) {
  const positive = (item.changePercent || 0) >= 0;
  const TrendIcon = positive ? TrendingUp : TrendingDown;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      className={cn(
        "group relative rounded-xl border bg-card/40 backdrop-blur-md p-4 cursor-pointer",
        "transition-all duration-300 hover:-translate-y-1 hover:border-primary/50",
        "hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.35)]",
        "animate-fade-in-up opacity-0"
      )}
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: "forwards" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <AssetLogo symbol={item.symbol} category={item.category} logo={item.logo} size={36} />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base font-bold tracking-tight truncate">{item.symbol}</span>
              <Badge
                variant="outline"
                className={cn("text-[9px] shrink-0 border", getCategoryBadgeClass(item.category))}
              >
                {getCategoryLabel(item.category)}
              </Badge>
            </div>
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 -mr-1 -mt-1 text-muted-foreground opacity-60 hover:opacity-100 hover:text-loss"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(item.id);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <p className="mt-1 text-xs text-muted-foreground truncate">{item.name}</p>

      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="text-2xl font-bold tracking-tight">{formatCurrency(item.price || 0)}</div>
        <div
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
            positive
              ? "bg-green-500/15 text-green-500"
              : "bg-red-500/15 text-red-500"
          )}
        >
          <TrendIcon className="h-3 w-3" />
          {formatPercentage(item.changePercent || 0)}
        </div>
      </div>

      <div className="mt-3">
        <Sparkline symbol={item.symbol} category={item.category} positive={positive} />
      </div>
    </div>
  );
}

export default function WatchlistPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const queryClient = useQueryClient();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: watchlistData, isLoading } = useQuery({
    queryKey: ["watchlist"],
    queryFn: async () => {
      const res = await fetch("/api/watchlists");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const addMutation = useMutation({
    mutationFn: async (asset: any) => {
      const res = await fetch("/api/watchlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(asset),
      });
      if (!res.ok) throw new Error("Failed to add");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      toast({ title: "Added to watchlist", variant: "success" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(`/api/watchlists/${itemId}/items`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      toast({ title: "Removed from watchlist", variant: "default" });
    },
  });

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchQuery.trim().length < 2) {
      setSearchResults(null);
      setDropdownOpen(false);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/assets/search?q=${encodeURIComponent(searchQuery.trim())}`);
        const data = await res.json();
        setSearchResults(data.data || []);
        setDropdownOpen(true);
      } catch {
        setSearchResults([]);
        setDropdownOpen(true);
      }
      setSearching(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const items: WatchlistItem[] = watchlistData?.data?.items || [];
  const filtered = activeCategory === "ALL" ? items : items.filter((i) => i.category === activeCategory);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Eye className="h-6 w-6" /> Watchlist
          </h1>
          <p className="text-muted-foreground text-sm">{items.length} assets tracked</p>
        </div>
      </div>

      {/* Search */}
      <Card glass>
        <CardContent className="p-4">
          <div ref={dropdownRef} className="relative">
            <div className="relative">
              {searching ? (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
              ) : (
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              )}
              <Input
                ref={searchInputRef}
                placeholder="Search stocks, crypto, metals..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchResults !== null && searchQuery.trim().length >= 2) {
                    setDropdownOpen(true);
                  }
                }}
              />
            </div>

            {dropdownOpen && searchResults !== null && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border bg-popover shadow-lg max-h-72 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">No results found</div>
                ) : (
                  <div className="py-1">
                    {searchResults.map((r: any) => (
                      <div
                        key={`${r.symbol}-${r.category}`}
                        className="flex items-center justify-between px-3 py-2 hover:bg-accent/50 cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <AssetLogo symbol={r.symbol} category={r.category} logo={r.logo || r.logoUrl} size={28} />
                          <Badge
                            variant="outline"
                            className={cn("text-xs shrink-0 border", getCategoryBadgeClass(r.category))}
                          >
                            {getCategoryLabel(r.category)}
                          </Badge>
                          <div className="min-w-0">
                            <span className="text-sm font-bold">{r.symbol}</span>
                            <span className="text-xs text-muted-foreground ml-2 truncate">{r.name}</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 ml-2 h-7 px-2"
                          onClick={() => {
                            addMutation.mutate(r);
                            setSearchResults(null);
                            setSearchQuery("");
                            setDropdownOpen(false);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filter tabs */}
      <Tabs defaultValue="ALL" value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList>
          <TabsTrigger value="ALL">All</TabsTrigger>
          <TabsTrigger value="STOCK">Stocks</TabsTrigger>
          <TabsTrigger value="CRYPTO">Crypto</TabsTrigger>
          <TabsTrigger value="METAL">Metals</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Watchlist grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card glass>
          <CardContent className="p-12 text-center flex flex-col items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl" />
              <div className="relative rounded-full bg-primary/10 border border-primary/20 p-6">
                <Eye className="h-12 w-12 text-primary" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Your watchlist is empty</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Track the assets you care about. Search for stocks, crypto, or metals to get started.
              </p>
            </div>
            <Button onClick={() => searchInputRef.current?.focus()} className="mt-2">
              <Search className="h-4 w-4 mr-2" /> Search assets
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item, idx) => (
            <TickerCard
              key={item.id}
              item={item}
              index={idx}
              onRemove={(id) => removeMutation.mutate(id)}
              onClick={() => router.push(`/asset/${item.symbol}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
