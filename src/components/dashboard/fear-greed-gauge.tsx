"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface FearGreedData {
  value: number;
  classification: string;
}

function getColor(value: number): string {
  if (value <= 25) return "#ef4444"; // red - extreme fear
  if (value <= 45) return "#f97316"; // orange - fear
  if (value <= 55) return "#eab308"; // yellow - neutral
  if (value <= 75) return "#84cc16"; // lime - greed
  return "#22c55e"; // green - extreme greed
}

function getTextColor(value: number): string {
  if (value <= 25) return "text-red-500";
  if (value <= 45) return "text-orange-500";
  if (value <= 55) return "text-yellow-500";
  if (value <= 75) return "text-lime-500";
  return "text-green-500";
}

function GaugeMeter({ value }: { value: number }) {
  // SVG semicircle gauge
  const radius = 70;
  const strokeWidth = 12;
  const cx = 80;
  const cy = 80;

  // Arc from 180deg (left) to 0deg (right) = semicircle
  const startAngle = Math.PI; // 180 deg
  const endAngle = 0;
  const valueAngle = startAngle - (value / 100) * Math.PI;

  // Gradient arc background (full semicircle)
  const bgArcStart = {
    x: cx + radius * Math.cos(startAngle),
    y: cy - radius * Math.sin(startAngle),
  };
  const bgArcEnd = {
    x: cx + radius * Math.cos(endAngle),
    y: cy - radius * Math.sin(endAngle),
  };

  // Needle endpoint
  const needleLength = radius - 20;
  const needleX = cx + needleLength * Math.cos(valueAngle);
  const needleY = cy - needleLength * Math.sin(valueAngle);

  const color = getColor(value);

  return (
    <svg viewBox="0 0 160 100" className="w-full max-w-[200px] mx-auto">
      <defs>
        <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="25%" stopColor="#f97316" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="75%" stopColor="#84cc16" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
      </defs>
      {/* Background arc */}
      <path
        d={`M ${bgArcStart.x} ${bgArcStart.y} A ${radius} ${radius} 0 0 1 ${bgArcEnd.x} ${bgArcEnd.y}`}
        fill="none"
        stroke="url(#gaugeGradient)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity={0.25}
      />
      {/* Value arc */}
      <path
        d={`M ${bgArcStart.x} ${bgArcStart.y} A ${radius} ${radius} 0 ${value > 50 ? 1 : 0} 1 ${cx + radius * Math.cos(valueAngle)} ${cy - radius * Math.sin(valueAngle)}`}
        fill="none"
        stroke="url(#gaugeGradient)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Needle */}
      <line
        x1={cx}
        y1={cy}
        x2={needleX}
        y2={needleY}
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      {/* Center dot */}
      <circle cx={cx} cy={cy} r={4} fill={color} />
      {/* Labels */}
      <text x="10" y="95" fill="currentColor" fontSize="8" className="fill-muted-foreground">
        Fear
      </text>
      <text x="130" y="95" fill="currentColor" fontSize="8" className="fill-muted-foreground">
        Greed
      </text>
    </svg>
  );
}

export function FearGreedGauge() {
  const { data, isLoading } = useQuery<FearGreedData>({
    queryKey: ["fear-greed"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/fear-greed");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      return json.data;
    },
    refetchInterval: 3600000, // 1 hour
  });

  if (isLoading) {
    return (
      <Card glass className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <Activity className="h-3.5 w-3.5 text-yellow-500" />
            </div>
            Fear &amp; Greed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[120px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const fng = data || { value: 50, classification: "Neutral" };

  return (
    <Card glass className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-yellow-500/10 flex items-center justify-center">
            <Activity className="h-3.5 w-3.5 text-yellow-500" />
          </div>
          Fear &amp; Greed
        </CardTitle>
      </CardHeader>
      <CardContent>
        <GaugeMeter value={fng.value} />
        <div className="text-center mt-2">
          <span className={cn("text-2xl font-bold", getTextColor(fng.value))}>
            {fng.value}
          </span>
          <p className={cn("text-sm font-medium mt-0.5", getTextColor(fng.value))}>
            {fng.classification}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
