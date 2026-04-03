"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Settings, Bell, Globe, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { user } = useUser();
  const [settings, setSettings] = useState({
    name: "",
    timezone: "UTC",
    base_currency: "USD",
    digest_time: "07:00",
    digest_enabled: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/digests/preferences")
      .then((r) => r.json())
      .then((d) => {
        if (d.data) setSettings(d.data);
      })
      .catch(() => {});
  }, []);

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch("/api/digests/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast({ title: "Settings saved", variant: "success" });
      } else {
        toast({ title: "Failed to save", variant: "error" });
      }
    } catch {
      toast({ title: "Error saving settings", variant: "error" });
    }
    setLoading(false);
  }

  async function handleTestDigest() {
    try {
      const res = await fetch("/api/digests/test-send", { method: "POST" });
      if (res.ok) {
        toast({ title: "Test digest sent!", description: "Check your email", variant: "success" });
      } else {
        toast({ title: "Failed to send test", variant: "error" });
      }
    } catch {
      toast({ title: "Error sending test", variant: "error" });
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" /> Settings
        </h1>
        <p className="text-muted-foreground text-sm">Manage your account preferences</p>
      </div>

      {/* Profile */}
      <Card glass>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" /> Profile</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} placeholder="Your name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={settings.base_currency} onChange={(e) => setSettings({ ...settings, base_currency: e.target.value })}>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="AUD">AUD (A$)</option>
                <option value="CAD">CAD (C$)</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select value={settings.timezone} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}>
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern (ET)</option>
                <option value="America/Chicago">Central (CT)</option>
                <option value="America/Denver">Mountain (MT)</option>
                <option value="America/Los_Angeles">Pacific (PT)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Europe/Berlin">Berlin (CET)</option>
                <option value="Asia/Kolkata">India (IST)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
                <option value="Australia/Sydney">Sydney (AEST)</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Digest */}
      <Card glass>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" /> Daily Digest</CardTitle>
          <CardDescription>Receive a daily portfolio summary via email</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Enable daily digest</p>
              <p className="text-xs text-muted-foreground">Get a portfolio summary every morning</p>
            </div>
            <button
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.digest_enabled ? "bg-primary" : "bg-muted"}`}
              onClick={() => setSettings({ ...settings, digest_enabled: !settings.digest_enabled })}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.digest_enabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          {settings.digest_enabled && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Clock className="h-4 w-4" /> Delivery Time</Label>
              <Input type="time" value={settings.digest_time} onChange={(e) => setSettings({ ...settings, digest_time: e.target.value })} className="w-40" />
              <p className="text-xs text-muted-foreground">Based on your timezone ({settings.timezone})</p>
            </div>
          )}

          <Separator />
          <Button variant="outline" size="sm" onClick={handleTestDigest}>
            Send Test Digest
          </Button>
        </CardContent>
      </Card>

      <Button onClick={handleSave} loading={loading} className="w-full">
        Save Settings
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        TrackMint is for informational purposes only. Not financial advice.
      </p>
    </div>
  );
}
