import { getTranslations } from "next-intl/server";
import { LoginForm } from "./_components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const t = await getTranslations("auth");

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-yellow-500/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-purple-500/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-500/10 ring-1 ring-yellow-500/20">
            <span className="text-3xl">📊</span>
          </div>
          <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t("subtitle")}</p>
        </div>

        <LoginForm next={next} hasError={error === "auth_failed"} />

        <p className="mt-6 text-center text-xs text-zinc-700">{t("disclaimer")}</p>
      </div>
    </div>
  );
}
