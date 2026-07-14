"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/lib/store-context";
import { createClient } from "@/lib/supabase/client";
import type { TranslationKey } from "@/lib/i18n";

const NAV_ITEMS: { href: string; labelKey: TranslationKey }[] = [
  { href: "/dashboard", labelKey: "navDashboard" },
  { href: "/inventory", labelKey: "navInventory" },
  { href: "/incoming", labelKey: "navIncoming" },
  { href: "/sales", labelKey: "navSales" },
  { href: "/crates", labelKey: "navCrates" },
  { href: "/payments", labelKey: "navPayments" },
  { href: "/reports", labelKey: "navReports" },
  { href: "/settings", labelKey: "navSettings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, tt } = useStore();

  async function onLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initial = (profile?.display_name || profile?.username || "?").slice(0, 1).toUpperCase();

  return (
    <div className="w-[248px] shrink-0 bg-sidebar border-r border-line flex flex-col p-4 pt-5.5 h-screen sticky top-0">
      <div className="flex items-center gap-2.5 px-2 pb-5.5 border-b border-line mb-4.5">
        <div className="w-8 h-8 rounded-lg bg-gold flex items-center justify-center font-display font-bold text-bg text-[15px]">
          E
        </div>
        <div>
          <div className="font-display text-[15px] font-bold leading-tight">EMIRZ stoRe</div>
          <div className="text-[10.5px] text-muted-4">{tt("sidebarTag")}</div>
        </div>
      </div>

      <div className="text-[11px] font-bold text-muted-6 tracking-wide px-2 mb-2">{tt("sidebarMain")}</div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13.5px] transition-colors"
              style={{
                background: active ? "var(--color-primary-soft)" : "transparent",
                color: active ? "var(--color-primary)" : "var(--color-text-dim)",
                fontWeight: active ? 700 : 500,
              }}
            >
              <span
                className="w-2 h-2 rounded-[2px] shrink-0"
                style={{ background: active ? "var(--color-primary)" : "var(--color-muted-4)" }}
              />
              {tt(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />
      <div className="border-t border-line pt-3.5 flex items-center gap-2.5 pl-2">
        <div className="w-[30px] h-[30px] rounded-full bg-primary flex items-center justify-center text-xs font-bold text-bg shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] font-semibold truncate">{profile?.display_name || profile?.username}</div>
          <div className="text-[10.5px] text-muted-4">
            {profile?.role === "manager" ? tt("sidebarManager") : tt("cashierRole")}
          </div>
        </div>
        <button onClick={onLogout} className="text-[11px] text-muted cursor-pointer shrink-0">
          {tt("sidebarExit")}
        </button>
      </div>
    </div>
  );
}
