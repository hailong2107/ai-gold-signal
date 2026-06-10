"use client";

import { useState } from "react";
import { Save, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { UserSettingsRow } from "@/types/database";

export function SettingsForm({
  settings,
}: {
  settings: UserSettingsRow | null;
}) {
  const [form, setForm] = useState({
    telegram_bot_token: settings?.telegram_bot_token ?? "",
    telegram_chat_id: settings?.telegram_chat_id ?? "",
    alerts_enabled: settings?.alerts_enabled ?? true,
    min_confidence: settings?.min_confidence ?? 75,
    alert_on_crossover: settings?.alert_on_crossover ?? true,
    alert_on_rsi_breakout: settings?.alert_on_rsi_breakout ?? true,
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save settings. Try again.");
    } finally {
      setSaving(false);
    }
  }

  function toggle(key: keyof typeof form) {
    setForm((f) => ({ ...f, [key]: !f[key] }));
  }

  return (
    <div className="space-y-4">
      {/* Telegram credentials */}
      <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
        <CardContent className="p-6">
          <h2 className="mb-4 font-semibold text-white">Telegram Alerts</h2>
          <div className="space-y-4">
            <Field
              label="Bot Token"
              hint="From @BotFather — looks like 123456:ABC-DEF..."
              type="password"
              value={form.telegram_bot_token}
              onChange={(v) => setForm((f) => ({ ...f, telegram_bot_token: v }))}
              placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
            />
            <Field
              label="Chat ID"
              hint="Your Telegram chat ID from @userinfobot"
              type="text"
              value={form.telegram_chat_id}
              onChange={(v) => setForm((f) => ({ ...f, telegram_chat_id: v }))}
              placeholder="-100123456789"
            />
          </div>
        </CardContent>
      </Card>

      {/* Alert preferences */}
      <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
        <CardContent className="p-6">
          <h2 className="mb-4 font-semibold text-white">Alert Preferences</h2>
          <div className="space-y-4">
            <Toggle
              label="Enable Telegram alerts"
              description="Receive alerts when signals are generated"
              checked={form.alerts_enabled}
              onChange={() => toggle("alerts_enabled")}
            />
            <Toggle
              label="MACD crossover alerts"
              description="Alert when bullish or bearish MACD crossover occurs"
              checked={form.alert_on_crossover}
              onChange={() => toggle("alert_on_crossover")}
            />
            <Toggle
              label="RSI breakout alerts"
              description="Alert when RSI enters overbought (>70) or oversold (<30)"
              checked={form.alert_on_rsi_breakout}
              onChange={() => toggle("alert_on_rsi_breakout")}
            />
            <div>
              <label className="block text-sm font-medium text-zinc-300">
                Minimum confidence to alert: {form.min_confidence}%
              </label>
              <p className="mb-2 text-xs text-zinc-500">
                Only send alerts when AI confidence exceeds this threshold
              </p>
              <input
                type="range"
                min={50}
                max={95}
                step={5}
                value={form.min_confidence}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    min_confidence: Number(e.target.value),
                  }))
                }
                className="w-full accent-yellow-500"
              />
              <div className="flex justify-between text-xs text-zinc-600">
                <span>50%</span>
                <span>95%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-500 py-3 font-semibold text-zinc-950 transition hover:bg-yellow-400 disabled:opacity-60"
      >
        {saved ? (
          <>
            <Check className="h-4 w-4" /> Saved!
          </>
        ) : saving ? (
          "Saving…"
        ) : (
          <>
            <Save className="h-4 w-4" /> Save Settings
          </>
        )}
      </button>
    </div>
  );
}

function Field({
  label,
  hint,
  type,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-zinc-300">
        {label}
      </label>
      <p className="mb-1.5 text-xs text-zinc-500">{hint}</p>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-yellow-500/50 focus:outline-none focus:ring-1 focus:ring-yellow-500/30"
      />
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-zinc-300">{label}</p>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-yellow-500" : "bg-zinc-700"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
