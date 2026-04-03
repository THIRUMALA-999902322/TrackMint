"use client";

import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { X, CheckCircle, AlertCircle, AlertTriangle } from "lucide-react";

const variantStyles = {
  default: "border-border bg-card",
  success: "border-profit/30 bg-profit/10",
  error: "border-loss/30 bg-loss/10",
  warning: "border-yellow-500/30 bg-yellow-500/10",
};

const variantIcons = {
  default: null,
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
};

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => {
        const Icon = variantIcons[t.variant || "default"];
        return (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-4 shadow-lg animate-slide-in",
              variantStyles[t.variant || "default"]
            )}
          >
            {Icon && <Icon className="h-5 w-5 shrink-0 mt-0.5" />}
            <div className="flex-1">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.description && <p className="text-sm text-muted-foreground mt-1">{t.description}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} className="shrink-0 opacity-70 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
