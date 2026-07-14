import { AppShell } from "@/components/AppShell";

// Every page under this layout needs a live Supabase session and realtime
// subscriptions — there is nothing useful to statically prerender.
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
