import { redirect } from "next/navigation";

// next-intl middleware handles / → /en redirect, this is a fallback.
export default function RootPage() {
  redirect("/en");
}
