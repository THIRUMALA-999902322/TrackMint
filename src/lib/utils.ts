import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercentage(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatNumber(value: number): string {
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(2);
}

export function formatDate(date: Date | string, fmt = "MMM dd, yyyy"): string {
  return format(new Date(date), fmt);
}

export function formatRelativeTime(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function getChangeColor(value: number): string {
  if (value > 0) return "text-profit";
  if (value < 0) return "text-loss";
  return "text-muted-foreground";
}

export function getPLBgColor(value: number): string {
  if (value > 0) return "bg-profit/10 text-profit";
  if (value < 0) return "bg-loss/10 text-loss";
  return "bg-muted text-muted-foreground";
}

export function calculatePL(
  currentPrice: number,
  buyPrice: number,
  quantity: number
) {
  const amount = (currentPrice - buyPrice) * quantity;
  const percentage = buyPrice > 0 ? ((currentPrice - buyPrice) / buyPrice) * 100 : 0;
  return { amount, percentage };
}

export function generateSparklineData(length = 20): number[] {
  const data: number[] = [];
  let value = 50 + Math.random() * 50;
  for (let i = 0; i < length; i++) {
    value += (Math.random() - 0.48) * 5;
    value = Math.max(10, Math.min(100, value));
    data.push(value);
  }
  return data;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function getCategoryIcon(category: string): string {
  switch (category) {
    case "STOCK": return "📈";
    case "CRYPTO": return "₿";
    case "METAL": return "🥇";
    default: return "💹";
  }
}

export function getCategoryLabel(category: string): string {
  switch (category) {
    case "STOCK": return "Stocks";
    case "CRYPTO": return "Crypto";
    case "METAL": return "Metals";
    default: return category;
  }
}
