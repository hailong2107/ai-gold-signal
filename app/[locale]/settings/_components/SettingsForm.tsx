"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Save, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { UserSettingsRow, UserPreferencesRow } from "@/types/database";

const TRADING_MODES = ["conservative", "balanced", "aggressive"] as const;

export function SettingsForm({
  settings,
  preferences,
}: {
  settings: UserSettingsRow | null;
  preferences: UserPreferencesRow | null;
}) {
  const t = useTranslations("settings");

  const [form, setForm] = useState({
    language: preferences?.language ?? "en",
    tradingMode: preferences?.trading_mode ?? "balanced",
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
      await Promise.all([
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            telegram_bot_token: form.telegram_bot_token || null,
            telegram_chat_id: form.telegram_chat_id || null,
            alerts_enabled: form.alerts_enabled,
            min_confidence: form.min_confidence,
            alert_on_crossover: form.alert_on_crossover,
            alert_on_rsi_breakout: form.alert_on_rsi_breakout,
          }),
        }),
        fetch("/api/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language: form.language,
            trading_mode: form.tradingMode,
          }),
        }),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Preferences */}
      <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
        <CardContent className="p-6">
          <h2 className="mb-4 font-semibold text-white">{t("sections.preferences")}</h2>
          <div className="space-y-4">
            {/* Language */}
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">{t("language")}</label>
              <div className="flex gap-2">
                {(["en", "vi"] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setForm((f) => ({ ...f, language: lang }))}
                    className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                      form.language === lang
                        ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-400"
                        : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10"
                    }`}
                  >
                    {lang === "en" ? "🇺🇸 English" : "🇻🇳 Tiếng Việt"}
                  </button>
                ))}
              </div>
            </div>

            {/* Trading mode */}
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">{t("tradingMode")}</label>
              <div className="space-y-2">
                {TRADING_MODES.map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setForm((f) => ({ ...f, tradingMode: mode }))}
                    className={`w-full rounded-lg border p-3 text-left transition ${
                      form.tradingMode === mode
                        ? "border-yellow-500/50 bg-yellow-500/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <p className={`text-sm font-medium ${form.tradingMode === mode ? "text-yellow-400" : "text-zinc-300"}`}>
                      {t(`modes.${mode}`)}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">{t(`modes.${mode}Desc`)}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Telegram */}
      <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
        <CardContent className="p-6">
          <h2 className="mb-4 font-semibold text-white">{t("sections.telegram")}</h2>
          <div className="space-y-4">
            <Field
              label={t("telegramToken")}
              hint={t("telegramTokenHint")}
              type="password"
              value={form.telegram_bot_token}
              onChange={(v) => setForm((f) => ({ ...f, telegram_bot_token: v }))}
              placeholder="123456:ABC-DEF..."
            />
            <Field
              label={t("telegramChatId")}
              hint={t("telegramChatIdHint")}
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
          <h2 className="mb-4 font-semibold text-white">{t("sections.alerts")}</h2>
          <div className="space-y-4">
            <Toggle
              label={t("alertsEnabled")}
              description={t("alertsEnabledDesc")}
              checked={form.alerts_enabled}
              onChange={() => setForm((f) => ({ ...f, alerts_enabled: !f.alerts_enabled }))}
            />
            <Toggle
              label={t("crossoverAlerts")}
              description={t("crossoverAlertsDesc")}
              checked={form.alert_on_crossover}
              onChange={() => setForm((f) => ({ ...f, alert_on_crossover: !f.alert_on_crossover }))}
            />
            <Toggle
              label={t("rsiAlerts")}
              description={t("rsiAlertsDesc")}
              checked={form.alert_on_rsi_breakout}
              onChange={() => setForm((f) => ({ ...f, alert_on_rsi_breakout: !f.alert_on_rsi_breakout }))}
            />
            <div>
              <label className="block text-sm font-medium text-zinc-300">
                {t("minConfidence")}: {form.min_confidence}%
              </label>
              <p className="mb-2 text-xs text-zinc-500">{t("minConfidenceDesc")}</p>
              <input
                type="range" min={50} max={95} step={5}
                value={form.min_confidence}
                onChange={(e) => setForm((f) => ({ ...f, min_confidence: Number(e.target.value) }))}
                className="w-full accent-yellow-500"
              />
              <div className="flex justify-between text-xs text-zinc-600">
                <span>50%</span><span>95%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-500 py-3 font-semibold text-zinc-950 transition hover:bg-yellow-400 disabled:opacity-60"
      >
        {saved ? <><Check className="h-4 w-4" /> {t("saved")}</> :
         saving ? t("saving") :
         <><Save className="h-4 w-4" /> {t("save")}</>}
      </button>
    </div>
  );
}

function Field({ label, hint, type, value, onChange, placeholder }: {
  label: string; hint: string; type: string;
  value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-zinc-300">{label}</label>
      <p className="mb-1.5 text-xs text-zinc-500">{hint}</p>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-yellow-500/50 focus:outline-none focus:ring-1 focus:ring-yellow-500/30"
      />
    </div>
  );
}

function Toggle({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-zinc-300">{label}</p>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
      <button
        role="switch" aria-checked={checked} onClick={onChange}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-yellow-500" : "bg-zinc-700"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}
