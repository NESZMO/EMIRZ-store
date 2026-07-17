"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { subscribeToChanges } from "@/lib/client-events";
import { t, type TranslationKey } from "@/lib/i18n";
import type { ProfileRow, StoreRow } from "@/lib/database.types";

interface StoreContextValue {
  loading: boolean;
  profile: ProfileRow | null;
  store: StoreRow | null;
  tt: (key: TranslationKey) => string;
  fmt: (amount: number) => string;
  refetchStore: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [store, setStore] = useState<StoreRow | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/session", { cache: "no-store" });
    if (!res.ok) {
      setProfile(null);
      setStore(null);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setProfile({ ...data.user, created_at: "" });
    setStore(data.store);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return subscribeToChanges(async (table) => {
      if (table !== "stores") return;
      const res = await fetch("/api/stores", { cache: "no-store" });
      if (res.ok) setStore(await res.json());
    });
  }, []);

  const value = useMemo<StoreContextValue>(
    () => ({
      loading,
      profile,
      store,
      tt: (key: TranslationKey) => t(store?.language ?? "en", key),
      fmt: (amount: number) => {
        const sym = store?.currency_symbol ?? "TSh";
        const num = Number(amount) || 0;
        return `${sym} ${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
      },
      refetchStore: load,
    }),
    [loading, profile, store, load],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within a StoreProvider");
  return ctx;
}
