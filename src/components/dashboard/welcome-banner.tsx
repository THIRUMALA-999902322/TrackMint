"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Briefcase, Bell, Eye, ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function WelcomeBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const quickActions = [
    {
      icon: Briefcase,
      label: "Add Holding",
      description: "Track your investments",
      href: "/portfolio",
      color: "text-primary bg-primary/10",
    },
    {
      icon: Eye,
      label: "Create Watchlist",
      description: "Monitor assets",
      href: "/watchlist",
      color: "text-emerald-500 bg-emerald-500/10",
    },
    {
      icon: Bell,
      label: "Set Alert",
      description: "Get price notifications",
      href: "/alerts",
      color: "text-amber-500 bg-amber-500/10",
    },
  ];

  return (
    <Card glass className="relative overflow-hidden border-primary/20">
      {/* Gradient background accent */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-emerald-500/5 pointer-events-none" />

      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-accent transition-colors z-10"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>

      <CardContent className="p-6 relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Welcome to TrackMint!</h2>
            <p className="text-sm text-muted-foreground">
              Get started by tracking your first investment
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-card/50 hover:bg-accent/50 transition-colors group cursor-pointer">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${action.color}`}>
                  <action.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
