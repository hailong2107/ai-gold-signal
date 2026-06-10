import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const handleI18n = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pass API routes and OAuth callback straight through
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // ── Supabase session refresh ─────────────────────────────
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Auth guard on locale-prefixed paths ──────────────────
  const localeMatch = pathname.match(/^\/(en|vi)(\/.*)?$/);
  if (localeMatch) {
    const locale = localeMatch[1];
    const rest = localeMatch[2] ?? "/";

    const isPublic =
      rest === "/" ||
      rest.startsWith("/login") ||
      rest.startsWith("/auth");

    if (!isPublic && !user) {
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set("next", pathname);
      const res = NextResponse.redirect(loginUrl);
      supabaseResponse.cookies
        .getAll()
        .forEach((c) => res.cookies.set(c.name, c.value));
      return res;
    }

    if (rest.startsWith("/login") && user) {
      const next = request.nextUrl.searchParams.get("next") ?? `/${locale}`;
      const res = NextResponse.redirect(new URL(next, request.url));
      supabaseResponse.cookies
        .getAll()
        .forEach((c) => res.cookies.set(c.name, c.value));
      return res;
    }
  }

  // ── next-intl locale routing ──────────────────────────────
  const i18nResponse = handleI18n(request);

  // Copy Supabase session cookies into the i18n response
  supabaseResponse.cookies
    .getAll()
    .forEach((c) => i18nResponse.cookies.set(c.name, c.value));

  return i18nResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
