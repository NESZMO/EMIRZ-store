"use client";

import { useCallback, useEffect, useState } from "react";
import { subscribeToChanges } from "@/lib/client-events";

type StoreScopedTable = "products" | "incoming_stock" | "sales" | "crate_records" | "pending_payments";

/**
 * Fetches all rows of a table (scoped and sorted server-side for the
 * signed-in store) and keeps them live-synced across browser tabs via the
 * local SSE bridge (/api/events) — any write from any tab is reflected
 * within ~1s.
 */
export function useRealtimeTable<Row extends { id: string }>(
  table: StoreScopedTable,
  storeId: string | null | undefined,
) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!storeId) return;
    const res = await fetch(`/api/${table}`, { cache: "no-store" });
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = (await res.json()) as Row[];
    setRows(data);
    setLoading(false);
  }, [table, storeId]);

  useEffect(() => {
    setLoading(true);
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!storeId) return;
    return subscribeToChanges((changedTable) => {
      if (changedTable === table) refetch();
    });
  }, [table, storeId, refetch]);

  return { rows, setRows, loading, refetch };
}
