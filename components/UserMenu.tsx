"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, LogOut, History } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export function UserMenu({ user, locale }: { user: User; locale: string }) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const initials =
    user.user_metadata?.full_name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? user.email?.[0]?.toUpperCase() ?? "U";

  async function signOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push(`/${locale}/login`);
  }

  const isVi = locale === "vi";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/10 transition hover:ring-white/30"
      >
        {user.user_metadata?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.user_metadata.avatar_url} alt="avatar" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-yellow-500 to-orange-500 text-xs font-bold text-white">
            {initials}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-20 w-52 overflow-hidden rounded-xl border border-white/10 bg-zinc-900 shadow-xl">
            <div className="border-b border-white/5 px-4 py-3">
              <p className="truncate text-sm font-medium text-white">
                {user.user_metadata?.full_name ?? "User"}
              </p>
              <p className="truncate text-xs text-zinc-500">{user.email}</p>
            </div>
            <div className="p-1">
              <MenuItem
                icon={History}
                label={isVi ? "Lịch sử" : "History"}
                onClick={() => { setOpen(false); router.push(`/${locale}/history`); }}
              />
              <MenuItem
                icon={Settings}
                label={isVi ? "Cài đặt" : "Settings"}
                onClick={() => { setOpen(false); router.push(`/${locale}/settings`); }}
              />
              <button
                onClick={signOut}
                disabled={signingOut}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-white/5 disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
                {signingOut ? "..." : isVi ? "Đăng xuất" : "Sign out"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick }: {
  icon: React.ElementType; label: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
