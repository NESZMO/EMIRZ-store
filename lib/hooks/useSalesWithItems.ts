"use client";

import { useCallback, useEffect, useState } from "react";
import { subscribeToChanges } from "@/lib/client-events";
import type { SaleItemRow, SaleRow } from "@/lib/database.types";

export type SaleWithItems = SaleRow & { sale_items: SaleItemRow[] };

/** Sales + their line items, live-synced across tabs via the local SSE bridge. */
export function useSalesWithItems(storeId: string | null | undefined) {
  const [sales, setSales] = useState<SaleWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!storeId) return;
    const res = await fetch("/api/sales", { cache: "no-store" });
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = (await res.json()) as SaleWithItems[];
    setSales(data);
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    setLoading(true);
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!storeId) return;
    return subscribeToChanges((changedTable) => {
      if (changedTable === "sales" || changedTable === "sale_items") refetch();
    });
  }, [storeId, refetch]);

  return { sales, setSales, loading, refetch };
}
