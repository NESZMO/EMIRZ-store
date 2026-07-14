"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store-context";
import { useRealtimeTable } from "@/lib/hooks/useRealtimeTable";
import { useSalesWithItems } from "@/lib/hooks/useSalesWithItems";
import { PageHeader } from "@/components/PageHeader";
import { cardClass, ghostBtnClass, primaryBtnClass } from "@/lib/ui";
import { crateOutstanding, isSameDay, lastNDays } from "@/lib/domain";
import { downloadCSV } from "@/lib/csv";
import { exportReportPDF } from "@/lib/pdf";
import type { CrateRecordRow, PendingPaymentRow, ProductRow } from "@/lib/database.types";

export default function ReportsPage() {
  const { store, tt, fmt } = useStore();
  const storeId = store?.id;
  const { rows: products } = useRealtimeTable<ProductRow>("products", storeId);
  const { sales } = useSalesWithItems(storeId);
  const { rows: crates } = useRealtimeTable<CrateRecordRow>("crate_records", storeId);
  const { rows: payments } = useRealtimeTable<PendingPaymentRow>("pending_payments", storeId);
  const cratePerUnit = store?.crate_deposit_per_unit ?? 500;

  const totalRevenue = useMemo(() => sales.reduce((a, s) => a + s.grand_total, 0), [sales]);
  const totalOrders = sales.length;
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const inventoryValue = useMemo(() => products.reduce((a, p) => a + p.qty * p.buy_price, 0), [products]);
  const pendingTotal = useMemo(() => payments.filter((p) => p.status !== "Paid").reduce((a, p) => a + p.balance, 0), [payments]);
  const outstandingCrateValue = useMemo(() => crates.reduce((a, c) => a + crateOutstanding(c), 0) * cratePerUnit, [crates, cratePerUnit]);

  const weekDays = useMemo(() => lastNDays(7), []);
  const weeklyTotals = useMemo(
    () => weekDays.map((d) => sales.filter((s) => isSameDay(s.created_at, d)).reduce((a, s) => a + s.grand_total, 0)),
    [weekDays, sales],
  );
  const maxWeekly = Math.max(1, ...weeklyTotals);

  const salesByProduct = useMemo(() => {
    const map = new Map<string, number>();
    sales.forEach((s) => s.sale_items.forEach((i) => map.set(i.name_snapshot, (map.get(i.name_snapshot) ?? 0) + i.qty)));
    return Array.from(map.entries()).map(([name, qty]) => ({ name, qty }));
  }, [sales]);
  const bestSelling = useMemo(() => [...salesByProduct].sort((a, b) => b.qty - a.qty).slice(0, 5), [salesByProduct]);
  const leastSelling = useMemo(() => [...salesByProduct].sort((a, b) => a.qty - b.qty).slice(0, 5), [salesByProduct]);

  function exportSalesCSV() {
    const rows = sales.map((s) => [
      new Date(s.created_at).toLocaleString(),
      s.customer_name,
      s.sale_items.map((i) => `${i.qty}x ${i.name_snapshot}`).join("; "),
      s.subtotal,
      s.crate_charge,
      s.discount_amount,
      s.grand_total,
      s.amount_paid,
      s.balance,
    ]);
    downloadCSV("sales_report.csv", ["Time", "Customer", "Items", "Subtotal", "Crate Charge", "Discount", "Grand Total", "Paid", "Balance"], rows);
  }

  function exportInventoryCSV() {
    const rows = products.map((p) => [p.name, p.brand, p.category, p.buy_price, p.sell_price, p.qty, p.min_stock, p.supplier, p.date_added]);
    downloadCSV("inventory_report.csv", ["Product", "Brand", "Category", "Buy Price", "Sell Price", "Qty", "Min Stock", "Supplier", "Date Added"], rows);
  }

  function exportPaymentsCSV() {
    const rows = payments.map((r) => [r.customer, r.phone, r.products_text, r.total, r.paid, r.balance, r.status, r.due_date ?? ""]);
    downloadCSV("pending_payments_report.csv", ["Customer", "Phone", "Products", "Total", "Paid", "Balance", "Status", "Due Date"], rows);
  }

  function exportCratesCSV() {
    const rows = crates.map((r) => [r.customer, r.product_name_snapshot, r.taken, r.returned, crateOutstanding(r)]);
    downloadCSV("crate_report.csv", ["Customer", "Product", "Taken", "Returned", "Outstanding"], rows);
  }

  function exportPDF() {
    exportReportPDF(
      store?.name ?? "EMIRZ stoRe",
      "Sales Report",
      [
        { label: tt("repTotalRevenue"), value: fmt(totalRevenue) },
        { label: tt("repTotalOrders"), value: String(totalOrders) },
        { label: tt("repAvgOrder"), value: fmt(avgOrder) },
        { label: tt("repInventoryValue"), value: fmt(inventoryValue) },
      ],
      ["Day", "Total"],
      weekDays.map((d, i) => [d.toLocaleDateString(), fmt(weeklyTotals[i])]),
    );
  }

  return (
    <div>
      <PageHeader title={tt("titleReports")} subtitle={tt("subReports")} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <Stat label={tt("repTotalRevenue")} value={fmt(totalRevenue)} color="var(--color-primary)" />
        <Stat label={tt("repTotalOrders")} value={String(totalOrders)} color="var(--color-text)" />
        <Stat label={tt("repAvgOrder")} value={fmt(avgOrder)} color="var(--color-text)" />
        <Stat label={tt("repInventoryValue")} value={fmt(inventoryValue)} color="var(--color-gold)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4 mb-4">
        <div className={`${cardClass} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <div className="font-bold text-sm">{tt("repSalesReportTitle")}</div>
            <div className="flex gap-2">
              <button onClick={exportSalesCSV} className={`${ghostBtnClass} py-1.5 px-3 text-xs`}>
                {tt("exportExcel")}
              </button>
              <button onClick={exportPDF} className={`${primaryBtnClass} py-1.5 px-3 text-xs`}>
                {tt("exportPDF")}
              </button>
            </div>
          </div>
          <div className="flex items-end gap-3.5 h-[150px]">
            {weekDays.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1.5">
                <div className="text-[10.5px] text-muted-2">{fmt(weeklyTotals[i])}</div>
                <div
                  className="w-full rounded-t-md bg-primary"
                  style={{ height: `${(weeklyTotals[i] / maxWeekly) * 100}%`, minHeight: 2 }}
                />
                <div className="text-[11px] text-muted-4 font-medium">{d.toLocaleDateString(undefined, { weekday: "short" })}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={`${cardClass} p-5`}>
          <div className="font-bold text-sm mb-3.5">{tt("repRevenueReportTitle")}</div>
          <RevenueRow label={tt("repTotalRevenue")} value={fmt(totalRevenue)} />
          <RevenueRow label={tt("repPendingPaymentsRow")} value={fmt(pendingTotal)} color="var(--color-warning)" />
          <RevenueRow label={tt("repCrateDepositsRow")} value={fmt(outstandingCrateValue)} color="var(--color-gold)" last />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className={`${cardClass} p-5`}>
          <div className="font-bold text-sm mb-3.5">{tt("bestSellingTitle")}</div>
          {bestSelling.length === 0 ? (
            <div className="py-5 text-center text-muted-5 text-[12.5px]">{tt("noSalesYet")}</div>
          ) : (
            bestSelling.map((b) => (
              <div key={b.name} className="flex justify-between py-2.5 border-b border-line-soft last:border-0 text-[13px]">
                <div>{b.name}</div>
                <div className="font-bold text-primary">
                  {b.qty} {tt("soldSuffix")}
                </div>
              </div>
            ))
          )}
        </div>
        <div className={`${cardClass} p-5`}>
          <div className="font-bold text-sm mb-3.5">{tt("leastSellingTitle")}</div>
          {leastSelling.map((b) => (
            <div key={b.name} className="flex justify-between py-2.5 border-b border-line-soft last:border-0 text-[13px]">
              <div>{b.name}</div>
              <div className="font-bold text-muted">
                {b.qty} {tt("soldSuffix")}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <button onClick={exportInventoryCSV} className={`${cardClass} py-3.5 font-semibold text-[13px] cursor-pointer`}>
          {tt("exportInventoryReport")}
        </button>
        <button onClick={exportPaymentsCSV} className={`${cardClass} py-3.5 font-semibold text-[13px] cursor-pointer`}>
          {tt("exportPaymentsReport")}
        </button>
        <button onClick={exportCratesCSV} className={`${cardClass} py-3.5 font-semibold text-[13px] cursor-pointer`}>
          {tt("exportCratesReport")}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`${cardClass} p-4.5`}>
      <div className="text-xs text-muted-2 font-semibold mb-2">{label}</div>
      <div className="font-display text-[22px] font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function RevenueRow({ label, value, color, last }: { label: string; value: string; color?: string; last?: boolean }) {
  return (
    <div className={`flex justify-between text-[13.5px] text-muted mb-2.5 pb-2.5 ${last ? "" : "border-b border-line-soft"}`}>
      <div>{label}</div>
      <div className="font-bold" style={color ? { color } : undefined}>
        {value}
      </div>
    </div>
  );
}
