"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";
import { ExternalLink, Newspaper } from "lucide-react";

interface NewsItem {
  headline: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment?: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  summary?: string;
  imageUrl?: string | null;
  faviconUrl?: string | null;
}

function sentimentVariant(s?: string) {
  if (s === "POSITIVE") return "profit";
  if (s === "NEGATIVE") return "loss";
  return "neutral";
}

function NewsImage({ item }: { item: NewsItem }) {
  const [stage, setStage] = useState<"primary" | "favicon" | "placeholder">(
    item.imageUrl ? "primary" : item.faviconUrl ? "favicon" : "placeholder"
  );

  if (stage === "placeholder") {
    return (
      <div className="h-24 w-24 shrink-0 rounded-xl bg-gradient-to-br from-primary/30 via-primary/10 to-accent/20 flex items-center justify-center border border-border/40">
        <Newspaper className="h-8 w-8 text-primary/60" />
      </div>
    );
  }

  if (stage === "favicon") {
    return (
      <div className="h-24 w-24 shrink-0 rounded-xl bg-gradient-to-br from-muted/60 to-muted/20 flex items-center justify-center border border-border/40 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.faviconUrl!}
          alt={item.source}
          className="h-10 w-10 object-contain"
          onError={() => setStage("placeholder")}
        />
      </div>
    );
  }

  return (
    <div className="h-24 w-24 shrink-0 rounded-xl overflow-hidden border border-border/40 bg-muted/30 relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.imageUrl!}
        alt={item.headline}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        onError={() => setStage(item.faviconUrl ? "favicon" : "placeholder")}
      />
    </div>
  );
}

export function RecentNews({ news }: { news: NewsItem[] }) {
  return (
    <Card glass>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-primary" />
          Market News
        </CardTitle>
      </CardHeader>
      <CardContent>
        {news.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-3">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center border border-border/40">
              <Newspaper className="h-8 w-8 opacity-50" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Market news will appear here</p>
              <p className="text-xs mt-1 opacity-70">Stay updated with the latest headlines</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {news.slice(0, 5).map((item, i) => (
              <a
                key={i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block group relative"
              >
                <div className="flex items-start gap-3 p-3 rounded-xl border border-border/30 bg-card/40 hover:bg-accent/40 hover:border-primary/40 hover:shadow-[0_0_0_1px_rgba(var(--primary-rgb,99,102,241),0.15),0_4px_20px_-8px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 transition-all duration-200">
                  <NewsImage item={item} />
                  <div className="flex-1 min-w-0 pr-5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-primary/80 truncate max-w-[140px]">
                        {item.source}
                      </span>
                      <span className="text-[10px] text-muted-foreground/50">•</span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatRelativeTime(item.publishedAt)}
                      </span>
                      {item.sentiment && item.sentiment !== "NEUTRAL" && (
                        <Badge
                          variant={sentimentVariant(item.sentiment)}
                          className="text-[9px] px-1.5 py-0 h-4"
                        >
                          {item.sentiment}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-200">
                      {item.headline}
                    </p>
                    {item.summary && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                        {item.summary}
                      </p>
                    )}
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground absolute top-3 right-3 opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all duration-200" />
                </div>
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
