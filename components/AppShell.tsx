"use client";

import { StoreProvider, useStore } from "@/lib/store-context";
import { UndoProvider } from "@/lib/undo-context";
import { Sidebar } from "@/components/Sidebar";

function Shell({ children }: { children: React.ReactNode }) {
  const { loading, profile } = useStore();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center text-muted-2 text-sm">
        Loading…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center text-center px-6">
        <div>
          <div className="font-display text-lg font-bold mb-2">Signed out</div>
          <div className="text-sm text-muted-2 max-w-sm mb-4">
            Your session is no longer valid. Redirecting to login…
          </div>
          <a href="/login" className="text-sm text-primary font-semibold underline">
            Click here if you&apos;re not redirected automatically
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-bg text-text font-sans">
      <Sidebar />
      <main className="flex-1 p-7 md:p-8.5 overflow-y-auto max-h-screen">{children}</main>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <UndoProvider>
        <Shell>{children}</Shell>
      </UndoProvider>
    </StoreProvider>
  );
}
