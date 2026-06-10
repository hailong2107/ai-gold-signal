import Link from "next/link";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { UserMenu } from "./UserMenu";
import { LanguageSwitcher } from "./LanguageSwitcher";

export async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const locale = await getLocale();

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-6">
          <Link href={`/${locale}`} className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="text-lg">📊</span>
            <span className="hidden sm:block">AI Gold Signal</span>
          </Link>

          {user && (
            <nav className="hidden items-center gap-1 md:flex">
              {[
                { href: `/${locale}`, label: locale === "vi" ? "Bảng điều khiển" : "Dashboard" },
                { href: `/${locale}/history`, label: locale === "vi" ? "Lịch sử" : "History" },
                { href: `/${locale}/settings`, label: locale === "vi" ? "Cài đặt" : "Settings" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:bg-white/5 hover:text-white transition"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {user && <UserMenu user={user} locale={locale} />}
        </div>
      </div>
    </header>
  );
}
