"use client";

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
}

function sentimentVariant(s?: string) {
  if (s === "POSITIVE") return "profit";
  if (s === "NEGATIVE") return "loss";
  return "neutral";
}

export function RecentNews({ news }: { news: NewsItem[] }) {
  return (
    <Card glass>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Market News</CardTitle>
      </CardHeader>
      <CardContent>
        {news.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-3">
            <div className="h-14 w-14 rounded-full bg-muted/30 flex items-center justify-center">
              <Newspaper className="h-7 w-7 opacity-40" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Market news will appear here</p>
              <p className="text-xs mt-1 opacity-70">Stay updated with the latest market headlines</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {news.slice(0, 5).map((item, i) => (
              <a
                key={i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                <div className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-all duration-200 hover:shadow-sm border border-transparent hover:border-border/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors duration-200">
                      {item.headline}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-muted-foreground font-medium">{item.source}</span>
                      <span className="text-[10px] text-muted-foreground/60">|</span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(item.publishedAt)}
                      </span>
                      {item.sentiment && (
                        <Badge variant={sentimentVariant(item.sentiment)} className="text-[10px] px-1.5 py-0">
                          {item.sentiment}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground mt-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </div>
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
