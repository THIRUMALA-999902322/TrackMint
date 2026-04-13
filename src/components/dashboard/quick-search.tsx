"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, X, TrendingUp, Coins, CircleDollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { AssetLogo } from "@/components/asset-logo";

interface SearchResult {
  symbol: string;
  name: string;
  category: string;
  exchange?: string;
}

const categoryIcon: Record<string, React.ElementType> = {
  STOCK: TrendingUp,
  CRYPTO: Coins,
  METAL: CircleDollarSign,
};

export function QuickSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const debounceRef = useRef<NodeJS.Timeout>();

  const searchAssets = useCallback(async (q: string) => {
    if (q.length < 1) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/assets/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults((data.data || data.results || []).slice(0, 8));
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    setSelectedIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchAssets(value), 300);
  };

  const navigateToAsset = (result: SearchResult) => {
    setIsOpen(false);
    setQuery("");
    setResults([]);
    router.push(`/asset/${encodeURIComponent(result.symbol)}?category=${result.category}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter" && selectedIndex >= 0 && results[selectedIndex]) {
      e.preventDefault();
      navigateToAsset(results[selectedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Keyboard shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            handleChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search stocks, crypto, metals... (Ctrl+K)"
          className="w-full h-9 pl-9 pr-8 rounded-lg border bg-card/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-accent"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (query.length > 0 || results.length > 0) && (
        <div className="absolute top-full mt-1.5 left-0 right-0 bg-card border rounded-lg shadow-xl z-50 overflow-hidden max-h-[360px] overflow-y-auto">
          {isLoading && results.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Searching...
            </div>
          )}
          {!isLoading && query.length > 0 && results.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No results for "{query}"
            </div>
          )}
          {results.map((r, i) => {
            const CatIcon = categoryIcon[r.category] || TrendingUp;
            return (
              <button
                key={`${r.symbol}-${r.category}-${i}`}
                onClick={() => navigateToAsset(r)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent/60 transition-colors",
                  i === selectedIndex && "bg-accent/60"
                )}
              >
                <AssetLogo symbol={r.symbol} category={r.category} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{r.symbol}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium uppercase">
                      {r.category}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{r.name}</p>
                </div>
                {r.exchange && (
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">{r.exchange}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
