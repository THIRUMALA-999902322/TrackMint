import { TrendingUp } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">TrackMint</h1>
          </div>
          <p className="text-muted-foreground text-sm">Smart Portfolio Tracker</p>
        </div>
        <div className="glass-card rounded-xl p-8">{children}</div>
      </div>
    </div>
  );
}
