import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getUserSettings, getUserPreferences } from "@/services/database";
import { SettingsForm } from "./_components/SettingsForm";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const locale = await getLocale();
  if (!user) redirect(`/${locale}/login`);

  const t = await getTranslations("settings");
  const [settings, preferences] = await Promise.all([
    getUserSettings(user.id),
    getUserPreferences(user.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}`}
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">{t("title")}</h1>
          <p className="text-sm text-zinc-500">{t("subtitle")}</p>
        </div>
      </div>

      <SettingsForm settings={settings} preferences={preferences} />
    </div>
  );
}
