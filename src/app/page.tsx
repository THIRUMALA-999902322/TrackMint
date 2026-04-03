import Link from "next/link";
import { TrendingUp, Layers, Zap, Heart } from "lucide-react";

const tickers = [
  { symbol: "BTC", price: "$67,432", change: "+2.4%" },
  { symbol: "ETH", price: "$3,521", change: "+1.8%" },
  { symbol: "AAPL", price: "$189.24", change: "+0.6%" },
  { symbol: "GOLD", price: "$2,341", change: "+0.3%" },
  { symbol: "TSLA", price: "$248.50", change: "-1.2%" },
  { symbol: "SOL", price: "$142.80", change: "+5.1%" },
  { symbol: "MSFT", price: "$428.70", change: "+0.9%" },
  { symbol: "SILVER", price: "$27.85", change: "+0.7%" },
  { symbol: "NVDA", price: "$875.30", change: "+3.2%" },
  { symbol: "AMZN", price: "$185.60", change: "+1.1%" },
];

const features = [
  {
    icon: Layers,
    title: "Multi-Asset",
    desc: "Stocks, crypto, gold, silver — all in one unified dashboard. No more switching between apps.",
  },
  {
    icon: Zap,
    title: "Real-Time",
    desc: "Live prices, instant P/L calculations, smart price alerts, and daily email digests.",
  },
  {
    icon: Heart,
    title: "Free Forever",
    desc: "No credit card, no hidden fees, no premium tier. Track unlimited assets at zero cost.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Floating orbs */}
      <div className="orb w-[500px] h-[500px] bg-blue-500 top-[-150px] left-[-100px]" />
      <div
        className="orb w-[400px] h-[400px] bg-emerald-500 bottom-[-100px] right-[-80px]"
        style={{ animationDelay: "-7s" }}
      />
      <div
        className="orb w-[300px] h-[300px] bg-amber-500 top-[40%] left-[60%]"
        style={{ animationDelay: "-13s" }}
      />

      {/* Ticker strip */}
      <div className="relative z-10 border-b border-white/5 bg-card/40 backdrop-blur-sm overflow-hidden">
        <div className="ticker-scroll flex items-center gap-8 py-2.5 whitespace-nowrap w-max">
          {[...tickers, ...tickers].map((t, i) => (
            <span key={i} className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-foreground">{t.symbol}</span>
              <span className="text-muted-foreground">{t.price}</span>
              <span
                className={
                  t.change.startsWith("+")
                    ? "text-profit font-medium"
                    : "text-loss font-medium"
                }
              >
                {t.change}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center px-4 pt-24 pb-16 md:pt-36 md:pb-24">
        <div className="text-center max-w-4xl mx-auto">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 mb-8">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center glow-pulse">
                <TrendingUp className="h-7 w-7 text-primary" />
              </div>
              <span className="text-2xl font-bold">TrackMint</span>
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.1] mb-8 animate-fade-in-up">
            <span className="gradient-text">Track Every Asset.</span>
            <br />
            <span className="gradient-text" style={{ animationDelay: "0.5s" }}>
              One Dashboard.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 animate-fade-in-up-delay-1">
            Stocks, crypto, gold, silver — real-time P/L tracking, smart alerts, and a trading journal.
            All free, forever.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up-delay-2">
            <Link
              href="/register"
              className="h-14 px-10 rounded-xl bg-primary text-primary-foreground font-semibold text-lg flex items-center gap-2 hover:bg-primary/90 transition-all hover:scale-105 glow-pulse"
            >
              Get Started Free
              <TrendingUp className="h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="h-14 px-10 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm text-foreground font-semibold text-lg flex items-center hover:bg-white/10 transition-all hover:scale-105"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="relative z-10 px-4 pb-24">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`glass-card rounded-2xl p-8 hover:border-primary/20 transition-all hover:scale-[1.02] hover:-translate-y-1 ${
                i === 0
                  ? "animate-fade-in-up"
                  : i === 1
                  ? "animate-fade-in-up-delay-1"
                  : "animate-fade-in-up-delay-2"
              }`}
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">{f.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8 px-4">
        <p className="text-center text-sm text-muted-foreground">
          Built with Next.js, Supabase & love
        </p>
      </footer>
    </div>
  );
}
