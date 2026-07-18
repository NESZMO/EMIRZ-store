"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store-context";
import { useRealtimeTable } from "@/lib/hooks/useRealtimeTable";
import { useSalesWithItems } from "@/lib/hooks/useSalesWithItems";
import { PageHeader } from "@/components/PageHeader";
import { ReceiptModal } from "@/components/modals/ReceiptModal";
import { SalesHistoryModal } from "@/components/modals/SalesHistoryModal";
import { EditSaleModal } from "@/components/modals/EditSaleModal";
import { deleteSale } from "@/lib/actions/sales";
import { buildReceipt, type ReceiptData } from "@/lib/receipt";
import { isLowStock, crateOutstanding, isToday, lastNDays, isSameDay, saleProfit, itemsSummary } from "@/lib/domain";
import { fmtTime } from "@/lib/format";
import type { ProductRow, CrateRecordRow, PendingPaymentRow, IncomingStockRow } from "@/lib/database.types";
import type { SaleWithItems } from "@/lib/hooks/useSalesWithItems";
import { cardClass, primaryBtnClass, ghostBtnClass } from "@/lib/ui";

function StatCard({ label, value, color, onClick }: { label: string; value: string; color: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`${cardClass} p-4.5 ${onClick ? "cursor-pointer hover:border-line-strong" : ""}`}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <span className="w-2 h-2 rounded-[2px]" style={{ background: color }} />
        <span className="text-xs text-muted-2 font-semibold">{label}</span>
      </div>
      <div className="font-display text-2xl font-bold">{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { store, profile, tt, fmt } = useStore();
  const storeId = store?.id;
  const isManager = profile?.role === "manager";

  const { rows: products } = useRealtimeTable<ProductRow>("products", storeId);
  const { sales } = useSalesWithItems(storeId);
  const { rows: crates } = useRealtimeTable<CrateRecordRow>("crate_records", storeId);
  const { rows: payments } = useRealtimeTable<PendingPaymentRow>("pending_payments", storeId);
  const { rows: incoming } = useRealtimeTable<IncomingStockRow>("incoming_stock", storeId);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [editingSale, setEditingSale] = useState<SaleWithItems | null>(null);

  const todaySales = useMemo(() => sales.filter((s) => isToday(s.created_at)), [sales]);
  const totalRevenueToday = useMemo(() => todaySales.reduce((a, s) => a + s.grand_total, 0), [todaySales]);
  const totalProfitToday = useMemo(() => todaySales.reduce((a, s) => a + saleProfit(s), 0), [todaySales]);
  const lowStockCount = useMemo(() => products.filter(isLowStock).length, [products]);
  const outstandingCrateCount = useMemo(
    () => crates.reduce((a, c) => a + crateOutstanding(c), 0),
    [crates],
  );
  const pendingBalance = useMemo(
    () => payments.filter((p) => p.status !== "Paid").reduce((a, p) => a + p.balance, 0),
    [payments],
  );
  const totalCratedQty = useMemo(
    () => products.filter((p) => p.category === "Crated").reduce((a, p) => a + p.qty, 0),
    [products],
  );
  const totalBoxedQty = useMemo(
    () => products.filter((p) => p.category === "Boxed").reduce((a, p) => a + p.qty, 0),
    [products],
  );

  const statCards = [
    { label: tt("statTotalProducts"), value: String(products.length), color: "var(--color-primary)", onClick: () => router.push("/inventory") },
    { label: tt("statTotalCrates"), value: String(totalCratedQty), color: "var(--color-gold)", onClick: () => router.push("/inventory") },
    { label: tt("statTotalBoxedCans"), value: String(totalBoxedQty), color: "var(--color-primary)", onClick: () => router.push("/inventory") },
    { label: tt("statTodaysSales"), value: String(todaySales.length), color: "var(--color-gold)", onClick: () => setShowHistory(true) },
    { label: tt("statPendingPayments"), value: fmt(pendingBalance), color: "var(--color-warning)", onClick: () => router.push("/payments") },
    { label: tt("statOutstandingCrates"), value: String(outstandingCrateCount), color: "var(--color-gold)", onClick: () => router.push("/crates") },
    { label: tt("statLowStock"), value: String(lowStockCount), color: "var(--color-danger)", onClick: () => router.push("/inventory") },
    { label: tt("statTotalRevenue"), value: fmt(totalRevenueToday), color: "var(--color-primary)" },
  ];

  const weekDays = useMemo(() => lastNDays(7), []);
  const weeklyTotals = useMemo(
    () => weekDays.map((d) => sales.filter((s) => isSameDay(s.created_at, d)).reduce((a, s) => a + s.grand_total, 0)),
    [weekDays, sales],
  );
  const maxWeekly = Math.max(1, ...weeklyTotals);

  const stockDays = useMemo(() => lastNDays(6), []);
  const stockMovement = useMemo(
    () =>
      stockDays.map((d) => {
        const inQty = incoming.filter((h) => isSameDay(h.created_at, d)).reduce((a, h) => a + h.qty, 0);
        const outQty = sales
          .filter((s) => isSameDay(s.created_at, d))
          .reduce((a, s) => a + s.sale_items.reduce((b, i) => b + i.qty, 0), 0);
        return { inQty, outQty };
      }),
    [stockDays, incoming, sales],
  );
  const maxStock = Math.max(1, ...stockMovement.flatMap((s) => [s.inQty, s.outQty]));

  const recentTx = sales.slice(0, 3);

  async function onDeleteSale(saleId: string) {
    if (!window.confirm(tt("deleteSaleConfirm"))) return;
    await deleteSale(saleId);
  }

  return (
    <div>
      <PageHeader title={tt("titleDashboard")} subtitle={tt("subDashboard")} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5.5">
        {statCards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4 mb-4">
        <div className={`${cardClass} p-5`}>
          <div className="font-bold text-sm mb-4">{tt("weeklySales")}</div>
          <div className="flex items-end gap-3.5 h-[150px]">
            {weekDays.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1.5">
                <div className="text-[10.5px] text-muted-2">{fmt(weeklyTotals[i])}</div>
                <div
                  className="w-full rounded-t-md"
                  style={{
                    background: isSameDay(new Date().toISOString(), d) ? "var(--color-gold)" : "var(--color-primary)",
                    height: `${(weeklyTotals[i] / maxWeekly) * 100}%`,
                    minHeight: 2,
                  }}
                />
                <div className="text-[11px] text-muted-4 font-medium">
                  {d.toLocaleDateString(undefined, { weekday: "short" })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`${cardClass} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <div className="font-bold text-sm">{tt("stockMovement")}</div>
            <div className="flex gap-3 text-[11px] text-muted-2">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-[2px] bg-primary" />
                {tt("inLabel")}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-[2px] bg-gold" />
                {tt("outLabel")}
              </div>
            </div>
          </div>
          <div className="flex items-end gap-2.5 h-[140px]">
            {stockDays.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                <div className="w-full flex gap-0.5 items-end h-[110px]">
                  <div
                    className="flex-1 rounded-t"
                    style={{ background: "var(--color-primary)", height: `${(stockMovement[i].inQty / maxStock) * 100}%`, minHeight: 2 }}
                  />
                  <div
                    className="flex-1 rounded-t"
                    style={{ background: "var(--color-gold)", height: `${(stockMovement[i].outQty / maxStock) * 100}%`, minHeight: 2 }}
                  />
                </div>
                <div className="text-[10.5px] text-muted-4">{d.toLocaleDateString(undefined, { weekday: "short" })}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4">
        <div className={`${cardClass} p-5 lg:row-span-2`}>
          <div className="font-bold text-sm mb-3.5">{tt("recentTransactions")}</div>
          {recentTx.length === 0 ? (
            <div className="py-8 text-center text-muted-5 text-[13px]">{tt("noSalesToday")}</div>
          ) : (
            recentTx.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2.5 border-b border-line-soft last:border-0">
                <div>
                  <div className="text-[13.5px] font-semibold">{tx.customer_name || "Walk-in customer"}</div>
                  <div className="text-[11.5px] text-muted-3">
                    {itemsSummary(tx)} · {fmtTime(tx.created_at)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{fmt(tx.grand_total)}</div>
                  <div className="text-[11px]" style={{ color: tx.balance > 0 ? "var(--color-warning)" : "var(--color-primary)" }}>
                    {tx.balance > 0 ? `${fmt(tx.balance)} ${tt("dueSuffix")}` : tt("paidInFull")}
                  </div>
                </div>
                <div className="flex gap-2.5 ml-4 shrink-0">
                  <button onClick={() => setReceipt(buildReceipt(tx, fmt))} className="text-xs font-bold text-gold cursor-pointer">
                    {tt("receiptLink")}
                  </button>
                  <button onClick={() => setEditingSale(tx)} className="text-xs font-bold text-primary cursor-pointer">
                    {tt("edit")}
                  </button>
                  {isManager && (
                    <button onClick={() => onDeleteSale(tx.id)} className="text-xs font-bold text-danger cursor-pointer">
                      {tt("delete")}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className={`${cardClass} p-5`}>
          <div className="font-bold text-sm mb-3.5">Today&apos;s Profit</div>
          <div className="bg-field rounded-[10px] p-4 text-center">
            <div className="text-xs text-muted-2 mb-2">Total Profit Earned</div>
            <div className="font-display text-[28px] font-bold text-gold">{fmt(totalProfitToday)}</div>
          </div>
        </div>

        <div className={`${cardClass} p-5 flex flex-col gap-2.5`}>
          <div className="font-bold text-sm mb-1">{tt("quickActions")}</div>
          <button onClick={() => router.push("/sales")} className={`${primaryBtnClass} text-left py-3`}>
            {tt("btnNewSale")}
          </button>
          <button onClick={() => router.push("/inventory")} className={`${ghostBtnClass} text-left py-3`}>
            {tt("btnAddProduct")}
          </button>
          <button onClick={() => router.push("/crates")} className={`${ghostBtnClass} text-left py-3`}>
            {tt("btnRecordCrateReturn")}
          </button>
          <button onClick={() => router.push("/inventory")} className={`${ghostBtnClass} text-left py-3`}>
            {tt("btnViewLowStock")}
          </button>
        </div>
      </div>

      {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}

      {showHistory && (
        <SalesHistoryModal
          sales={sales}
          onClose={() => setShowHistory(false)}
          onViewReceipt={(sale) => setReceipt(buildReceipt(sale, fmt))}
          onEditSale={(sale) => setEditingSale(sale)}
          onDeleteSale={isManager ? (sale) => onDeleteSale(sale.id) : undefined}
        />
      )}

      {editingSale && (
        <EditSaleModal
          sale={editingSale}
          products={products}
          cratePerUnit={store?.crate_deposit_per_unit ?? 500}
          onClose={() => setEditingSale(null)}
        />
      )}
    </div>
  );
}
