"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Coins, Gem, TrendingUp } from "lucide-react";

interface AssetLogoProps {
  symbol: string;
  category: string;
  logo?: string | null;
  size?: number;
  className?: string;
}

const GRADIENTS: Record<string, string> = {
  STOCK: "from-blue-500/30 to-indigo-500/30 text-blue-400 border-blue-500/30",
  CRYPTO: "from-orange-500/30 to-amber-500/30 text-orange-400 border-orange-500/30",
  METAL: "from-yellow-500/30 to-amber-500/30 text-yellow-400 border-yellow-500/30",
};

export function AssetLogo({ symbol, category, logo, size = 40, className }: AssetLogoProps) {
  const [err, setErr] = useState(false);
  const gradient = GRADIENTS[category] || GRADIENTS.STOCK;
  const Icon = category === "CRYPTO" ? Coins : category === "METAL" ? Gem : TrendingUp;

  if (logo && !err) {
    return (
      <div
        className={cn(
          "relative rounded-full overflow-hidden bg-white shrink-0 border shadow-sm",
          className
        )}
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt={symbol}
          width={size}
          height={size}
          className="w-full h-full object-contain"
          onError={() => setErr(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative rounded-full flex items-center justify-center shrink-0 border bg-gradient-to-br",
        gradient,
        className
      )}
      style={{ width: size, height: size }}
    >
      <Icon className="h-1/2 w-1/2" />
    </div>
  );
}
