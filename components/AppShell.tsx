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
          <div className="font-display text-lg font-bold mb-2">No store profile found</div>
          <div className="text-sm text-muted-2 max-w-sm">
            Your account isn&apos;t linked to a store yet. Ask your manager to run the bootstrap SQL
            script to link your login to EMIRZ stoRe.
          </div>
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
