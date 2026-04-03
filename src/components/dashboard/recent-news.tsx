"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

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
          <p className="text-sm text-muted-foreground">No news available</p>
        ) : (
          <div className="space-y-3">
            {news.slice(0, 5).map((item, i) => (
              <a
                key={i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2 group-hover:text-primary">
                      {item.headline}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{item.source}</span>
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
                  <ExternalLink className="h-3 w-3 text-muted-foreground mt-1 shrink-0" />
                </div>
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
