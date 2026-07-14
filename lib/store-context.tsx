"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
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
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [store, setStore] = useState<StoreRow | null>(null);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setProfile(null);
      setStore(null);
      setLoading(false);
      return;
    }
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (profileRow) {
      setProfile(profileRow);
      const { data: storeRow } = await supabase
        .from("stores")
        .select("*")
        .eq("id", profileRow.store_id)
        .single();
      setStore(storeRow ?? null);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!store) return;
    const channel = supabase
      .channel(`store-${store.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "stores", filter: `id=eq.${store.id}` },
        (payload) => setStore(payload.new as StoreRow),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.id]);

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
