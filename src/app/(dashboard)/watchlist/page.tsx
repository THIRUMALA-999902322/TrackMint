"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercentage, getChangeColor, cn, getCategoryLabel } from "@/lib/utils";
import { Search, Plus, X, TrendingUp, TrendingDown, Eye, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";

const categoryBadgeColors: Record<string, string> = {
  STOCK: "bg-blue-500/15 text-blue-500 border-blue-500/20",
  CRYPTO: "bg-orange-500/15 text-orange-500 border-orange-500/20",
  METAL: "bg-yellow-500/15 text-yellow-500 border-yellow-500/20",
};

function getCategoryBadgeClass(category: string) {
  return categoryBadgeColors[category] || "bg-muted text-muted-foreground";
}

export default function WatchlistPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const queryClient = useQueryClient();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Debounced search as user types
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

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
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const items = watchlistData?.data?.items || [];
  const filtered = activeCategory === "ALL" ? items : items.filter((i: any) => i.category === activeCategory);

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
                placeholder="Type to search..."
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
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No results found
                  </div>
                ) : (
                  <div className="py-1">
                    {searchResults.map((r: any) => (
                      <div
                        key={`${r.symbol}-${r.category}`}
                        className="flex items-center justify-between px-3 py-2 hover:bg-accent/50 cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
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

      {/* Watchlist items */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : filtered.length === 0 ? (
        <Card glass>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No assets in your watchlist. Search above to add some.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((item: any) => (
            <Card key={item.id} glass>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Link href={`/asset/${item.symbol}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] shrink-0 border", getCategoryBadgeClass(item.category))}
                    >
                      {getCategoryLabel(item.category)}
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{item.symbol}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.name}</p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(item.price || 0)}</p>
                      <p className={cn("text-xs", getChangeColor(item.changePercent || 0))}>
                        {formatPercentage(item.changePercent || 0)}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-loss"
                      onClick={() => removeMutation.mutate(item.id)}
                    >
                      <X className="h-4 w-4" />
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
