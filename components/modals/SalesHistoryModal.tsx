"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store-context";
import { isSameDay, itemsSummary, weekdayShortLabels } from "@/lib/domain";
import { fmtTime } from "@/lib/format";
import { ghostBtnClass, cardClass } from "@/lib/ui";
import type { SaleWithItems } from "@/lib/hooks/useSalesWithItems";

export function SalesHistoryModal({
  sales,
  onClose,
  onViewReceipt,
  onEditSale,
}: {
  sales: SaleWithItems[];
  onClose: () => void;
  onViewReceipt: (sale: SaleWithItems) => void;
  onEditSale?: (sale: SaleWithItems) => void;
}) {
  const { tt, fmt, store } = useStore();
  const today = useMemo(() => new Date(), []);
  const [monthCursor, setMonthCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today);

  const weekdayLabels = weekdayShortLabels(store?.language ?? "en");

  const cells = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const mondayOffset = (firstDay.getDay() + 6) % 7;
    const items: { date: Date | null; count: number }[] = [];
    for (let i = 0; i < mondayOffset; i++) items.push({ date: null, count: 0 });
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const count = sales.filter((s) => isSameDay(s.created_at, d)).length;
      items.push({ date: d, count });
    }
    return items;
  }, [monthCursor, sales]);

  const dayTxs = useMemo(() => sales.filter((s) => isSameDay(s.created_at, selectedDate)), [sales, selectedDate]);
  const dayTotal = dayTxs.reduce((a, s) => a + s.grand_total, 0);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[55] p-4">
      <div className="w-[920px] max-w-[94vw] max-h-[92vh] overflow-y-auto bg-sidebar border border-line rounded-2xl p-6">
        <div className="flex items-start justify-between mb-4.5">
          <div>
            <div className="font-display text-[19px] font-bold">{tt("salesHistoryTitle")}</div>
            <div className="text-xs text-muted-3 mt-0.5">{tt("salesHistorySub")}</div>
          </div>
          <button onClick={onClose} className={ghostBtnClass}>
            {tt("close")}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.1fr] gap-4.5">
          <div className={`${cardClass} p-4`}>
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}
                className="w-[30px] h-[30px] rounded-lg border border-line-strong bg-field cursor-pointer"
              >
                ‹
              </button>
              <div className="font-bold text-sm">{monthCursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</div>
              <button
                onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}
                className="w-[30px] h-[30px] rounded-lg border border-line-strong bg-field cursor-pointer"
              >
                ›
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {weekdayLabels.map((wd) => (
                <div key={wd} className="text-center text-[10.5px] text-muted-4 font-bold py-1">
                  {wd}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((c, i) =>
                c.date ? (
                  <div
                    key={i}
                    onClick={() => setSelectedDate(c.date as Date)}
                    className="rounded-lg py-1.5 text-center cursor-pointer"
                    style={{
                      background: isSameDay(selectedDate.toISOString(), c.date) ? "var(--color-primary-soft)" : "transparent",
                      border: isSameDay(new Date().toISOString(), c.date) ? "1px solid var(--color-gold)" : "1px solid transparent",
                    }}
                  >
                    <div className="text-xs font-semibold">{c.date.getDate()}</div>
                    <div className="text-[9.5px] font-bold min-h-[12px]" style={{ color: "var(--color-primary)" }}>
                      {c.count > 0 ? c.count : ""}
                    </div>
                  </div>
                ) : (
                  <div key={i} />
                ),
              )}
            </div>
          </div>

          <div className={`${cardClass} p-4 flex flex-col min-h-0`}>
            <div className="font-bold text-sm">{selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div>
            <div className="text-xs font-bold mt-1 mb-3" style={{ color: "var(--color-gold)" }}>
              {dayTxs.length} {tt("txCount")} · {tt("dayTotal")} {fmt(dayTotal)}
            </div>
            {dayTxs.length === 0 ? (
              <div className="py-9 text-center text-muted-5 text-[12.5px]">{tt("noSalesOnDay")}</div>
            ) : (
              <div className="overflow-y-auto max-h-[400px]">
                {dayTxs.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between gap-2.5 py-2.5 border-b border-line-soft last:border-0">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold truncate">{tx.customer_name || "Walk-in Customer"}</div>
                      <div className="text-[11px] text-muted-3">
                        {itemsSummary(tx)} · {fmtTime(tx.created_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-[13.5px] font-bold">{fmt(tx.grand_total)}</div>
                        <div className="text-[10.5px]" style={{ color: tx.balance > 0 ? "var(--color-warning)" : "var(--color-primary)" }}>
                          {tx.balance > 0 ? `${fmt(tx.balance)} ${tt("dueSuffix")}` : tt("paidInFull")}
                        </div>
                      </div>
                      <button onClick={() => onViewReceipt(tx)} className="text-[11.5px] font-bold text-gold cursor-pointer">
                        {tt("receiptLink")}
                      </button>
                      {onEditSale && (
                        <button onClick={() => onEditSale(tx)} className="text-[11.5px] font-bold text-primary cursor-pointer">
                          {tt("edit")}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
