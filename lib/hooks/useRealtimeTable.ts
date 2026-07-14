"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type StoreScopedTable = "products" | "incoming_stock" | "sales" | "crate_records" | "pending_payments";

interface Options {
  orderBy?: string;
  ascending?: boolean;
}

/**
 * Fetches all rows of a store-scoped table and keeps them live-synced via
 * Supabase Realtime — any INSERT/UPDATE/DELETE from any connected device
 * (this browser or another) is merged into local state within ~1s.
 */
export function useRealtimeTable<Row extends { id: string }>(
  table: StoreScopedTable,
  storeId: string | null | undefined,
  options: Options = {},
) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const { orderBy = "created_at", ascending = false } = options;

  const refetch = useCallback(async () => {
    if (!storeId) return;
    const { data } = await supabase
      .from(table)
      .select("*")
      .eq("store_id", storeId)
      .order(orderBy, { ascending });
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }, [supabase, table, storeId, orderBy, ascending]);

  useEffect(() => {
    setLoading(true);
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!storeId) return;
    const channel = supabase
      .channel(`${table}-${storeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `store_id=eq.${storeId}` },
        (payload) => {
          setRows((current) => {
            if (payload.eventType === "INSERT") {
              const newRow = payload.new as Row;
              if (current.some((r) => r.id === newRow.id)) return current;
              return ascending ? [...current, newRow] : [newRow, ...current];
            }
            if (payload.eventType === "UPDATE") {
              const updated = payload.new as Row;
              return current.map((r) => (r.id === updated.id ? updated : r));
            }
            if (payload.eventType === "DELETE") {
              const deletedId = (payload.old as Row).id;
              return current.filter((r) => r.id !== deletedId);
            }
            return current;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, table, storeId, ascending]);

  return { rows, setRows, loading, refetch };
}
