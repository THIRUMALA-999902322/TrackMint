import Link from "next/link";
import {
  TrendingUp, BarChart3, Bell, Newspaper, Clock, Shield, Eye, BookOpen,
} from "lucide-react";

const features = [
  { icon: Eye, title: "Multi-Asset Watchlist", desc: "Track stocks, crypto, gold, and silver in one place with live prices." },
  { icon: BarChart3, title: "Real-Time P/L", desc: "See your unrealized gains/losses update as markets move." },
  { icon: BookOpen, title: "Trading Journal", desc: "Log daily P/L with strategy tags. Calendar heatmap and win rate tracking." },
  { icon: Bell, title: "Smart Price Alerts", desc: "Set above/below targets. Get email notifications with cooldown protection." },
  { icon: Newspaper, title: "Market News", desc: "Asset-specific news with sentiment analysis. Stay informed." },
  { icon: Clock, title: "Daily Digest", desc: "Morning email with portfolio snapshot, top movers, and alerts summary." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold text-lg">TrackMint</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Shield className="h-4 w-4" /> 100% Free - No credit card required
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Track Your Investments
            <br />
            <span className="bg-gradient-to-r from-primary to-[#00d68f] bg-clip-text text-transparent">
              Like a Pro
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Stocks, crypto, gold, silver — all in one dashboard. Real-time P/L tracking,
            price alerts, daily digests, and a trading journal to improve your strategy.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="h-12 px-8 rounded-lg bg-primary text-primary-foreground font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors text-lg"
            >
              Start Tracking Free <TrendingUp className="h-5 w-5" />
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            No credit card. No hidden fees. Track unlimited assets.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 border-t">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Everything You Need</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
            Built for retail traders and investors who want professional-grade tracking without the Wall Street price tag.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="glass-card rounded-xl p-6 group hover:border-primary/20 transition-colors">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 px-4 border-t">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">All Asset Classes. One Dashboard.</h2>
          <div className="grid grid-cols-3 gap-6 mt-12">
            <div className="glass-card rounded-xl p-8">
              <p className="text-4xl mb-3">📈</p>
              <h3 className="font-semibold text-lg">Stocks</h3>
              <p className="text-sm text-muted-foreground mt-1">AAPL, TSLA, MSFT, and thousands more via Finnhub</p>
            </div>
            <div className="glass-card rounded-xl p-8">
              <p className="text-4xl mb-3">₿</p>
              <h3 className="font-semibold text-lg">Crypto</h3>
              <p className="text-sm text-muted-foreground mt-1">BTC, ETH, SOL, and 10,000+ coins via CoinGecko</p>
            </div>
            <div className="glass-card rounded-xl p-8">
              <p className="text-4xl mb-3">🥇</p>
              <h3 className="font-semibold text-lg">Metals</h3>
              <p className="text-sm text-muted-foreground mt-1">Gold, Silver, Platinum, Palladium via GoldAPI</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 border-t">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Track Smarter?</h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of traders tracking their investments with TrackMint.
          </p>
          <Link
            href="/register"
            className="inline-flex h-12 px-8 rounded-lg bg-primary text-primary-foreground font-medium items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="font-semibold">TrackMint</span>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            For informational purposes only. Not financial advice. Data from Finnhub, CoinGecko, GoldAPI, and MarketAux.
          </p>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} TrackMint</p>
        </div>
      </footer>
    </div>
  );
}
