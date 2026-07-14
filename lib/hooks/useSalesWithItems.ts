"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SaleItemRow, SaleRow } from "@/lib/database.types";

export type SaleWithItems = SaleRow & { sale_items: SaleItemRow[] };

/**
 * Sales + their line items, live-synced across devices. Sale rows are scoped
 * by store_id (server-enforced by RLS too); sale_items have no store_id
 * column of their own so we merge them in by matching sale_id against sales
 * we already know about.
 */
export function useSalesWithItems(storeId: string | null | undefined) {
  const supabase = useMemo(() => createClient(), []);
  const [sales, setSales] = useState<SaleWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!storeId) return;
    const { data } = await supabase
      .from("sales")
      .select("*, sale_items(*)")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    setSales((data ?? []) as SaleWithItems[]);
    setLoading(false);
  }, [supabase, storeId]);

  useEffect(() => {
    setLoading(true);
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!storeId) return;

    const channel = supabase
      .channel(`sales-with-items-${storeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales", filter: `store_id=eq.${storeId}` },
        async (payload) => {
          if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as SaleRow).id;
            setSales((current) => current.filter((s) => s.id !== deletedId));
            return;
          }
          const row = payload.new as SaleRow;
          const { data: items } = await supabase.from("sale_items").select("*").eq("sale_id", row.id);
          setSales((current) => {
            const withItems: SaleWithItems = { ...row, sale_items: items ?? [] };
            const exists = current.some((s) => s.id === row.id);
            if (exists) return current.map((s) => (s.id === row.id ? withItems : s));
            return [withItems, ...current];
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sale_items" },
        (payload) => {
          const item = (payload.eventType === "DELETE" ? payload.old : payload.new) as SaleItemRow;
          setSales((current) =>
            current.map((s) => {
              if (s.id !== item.sale_id) return s;
              if (payload.eventType === "DELETE") {
                return { ...s, sale_items: s.sale_items.filter((i) => i.id !== item.id) };
              }
              const exists = s.sale_items.some((i) => i.id === item.id);
              return {
                ...s,
                sale_items: exists
                  ? s.sale_items.map((i) => (i.id === item.id ? item : i))
                  : [...s.sale_items, item],
              };
            }),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, storeId]);

  return { sales, setSales, loading, refetch };
}
