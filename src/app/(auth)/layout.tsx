import { TrendingUp } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Left decorative panel - hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-emerald-500/10 to-amber-500/10" />
        {/* Orbs */}
        <div className="orb w-[400px] h-[400px] bg-blue-500 top-[10%] left-[10%]" />
        <div
          className="orb w-[300px] h-[300px] bg-emerald-500 bottom-[15%] right-[10%]"
          style={{ animationDelay: "-7s" }}
        />
        <div
          className="orb w-[200px] h-[200px] bg-amber-500 top-[50%] left-[50%]"
          style={{ animationDelay: "-13s" }}
        />
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          <div className="max-w-md text-center">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-white/10 flex items-center justify-center glow-pulse">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold">TrackMint</h1>
            </div>
            <p className="text-xl font-medium gradient-text mb-4">
              Track Every Asset. One Dashboard.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Stocks, crypto, gold, silver — real-time P/L tracking, smart alerts, and a trading journal.
              All free, forever.
            </p>
          </div>
        </div>
      </div>

      {/* Right side - form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">TrackMint</h1>
            </div>
            <p className="text-muted-foreground text-sm">Smart Portfolio Tracker</p>
          </div>
          <div className="glass-card rounded-2xl p-8 animate-fade-in-up">{children}</div>
        </div>
      </div>
    </div>
  );
}
