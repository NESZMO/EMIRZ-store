"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store-context";
import { useRealtimeTable } from "@/lib/hooks/useRealtimeTable";
import { useSalesWithItems, type SaleWithItems } from "@/lib/hooks/useSalesWithItems";
import { completeSale } from "@/lib/actions/sales";
import { PageHeader } from "@/components/PageHeader";
import { ReceiptModal } from "@/components/modals/ReceiptModal";
import { CrateConfirmModal } from "@/components/modals/CrateConfirmModal";
import { SalesHistoryModal } from "@/components/modals/SalesHistoryModal";
import { EditSaleModal } from "@/components/modals/EditSaleModal";
import { fieldClass, primaryBtnClass, ghostBtnClass, cardClass } from "@/lib/ui";
import { buildReceipt, type ReceiptData } from "@/lib/receipt";
import type { ProductRow } from "@/lib/database.types";

interface CartLine {
  id: string;
  qty: number;
}

export default function SalesPage() {
  const { store, tt, fmt } = useStore();
  const storeId = store?.id;
  const { rows: products } = useRealtimeTable<ProductRow>("products", storeId);
  const { sales } = useSalesWithItems(storeId);

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [discountPct, setDiscountPct] = useState("0");
  const [amountPaid, setAmountPaid] = useState("");
  const [saleJustCompleted, setSaleJustCompleted] = useState(false);
  const [crateModal, setCrateModal] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [editingSale, setEditingSale] = useState<SaleWithItems | null>(null);
  const [busy, setBusy] = useState(false);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const sellable = useMemo(
    () =>
      products.filter(
        (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase()),
      ),
    [products, search],
  );

  function addToCart(p: ProductRow) {
    if (p.qty <= 0) return;
    setCart((c) => {
      const existing = c.find((x) => x.id === p.id);
      const inCartQty = existing ? existing.qty : 0;
      if (inCartQty >= p.qty) return c;
      if (existing) return c.map((x) => (x.id === p.id ? { ...x, qty: x.qty + 1 } : x));
      return [...c, { id: p.id, qty: 1 }];
    });
    setSaleJustCompleted(false);
  }

  function changeQty(id: string, delta: number) {
    setCart((c) =>
      c.map((x) => {
        if (x.id !== id) return x;
        const cap = productMap.get(id)?.qty ?? 9999;
        return { ...x, qty: Math.max(1, Math.min(x.qty + delta, cap)) };
      }),
    );
  }

  function setQty(id: string, raw: string) {
    const parsed = parseInt(raw, 10);
    setCart((c) =>
      c.map((x) => {
        if (x.id !== id) return x;
        const cap = productMap.get(id)?.qty ?? 9999;
        if (Number.isNaN(parsed)) return x;
        return { ...x, qty: Math.max(1, Math.min(parsed, cap)) };
      }),
    );
  }

  const cartLines = cart
    .map((c) => {
      const p = productMap.get(c.id);
      if (!p) return null;
      return { ...c, product: p, lineTotal: p.sell_price * c.qty };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const subtotal = cartLines.reduce((a, l) => a + l.lineTotal, 0);
  const discountAmt = (subtotal * (Number(discountPct) || 0)) / 100;
  const grandTotalPreview = subtotal - discountAmt;
  const paidNum = Number(amountPaid) || 0;
  const balancePreview = grandTotalPreview - paidNum;
  const cratedUnitsInCart = cartLines.reduce((a, l) => a + (l.product.category === "Crated" ? l.qty : 0), 0);

  function clearCart() {
    setCart([]);
    setAmountPaid("");
    setDiscountPct("0");
    setCustomerName("");
    setSaleJustCompleted(false);
  }

  function onCompleteSaleClick() {
    if (cartLines.length === 0) return;
    if (cratedUnitsInCart > 0) {
      setCrateModal(true);
    } else {
      finalizeSale(0);
    }
  }

  async function finalizeSale(crateUnits: number) {
    if (cartLines.length === 0 || !storeId) return;
    setBusy(true);
    setCrateModal(false);

    const completedSale: SaleWithItems = await completeSale({
      customerName,
      discountPct: Number(discountPct) || 0,
      amountPaid: paidNum,
      crateUnits,
      cartLines: cartLines.map((l) => ({
        productId: l.product.id,
        name: l.product.name,
        category: l.product.category,
        unitPrice: l.product.sell_price,
        buyPrice: l.product.buy_price,
        qty: l.qty,
        lineTotal: l.lineTotal,
      })),
    });

    setReceipt(buildReceipt(completedSale, fmt));
    clearCart();
    setSaleJustCompleted(true);
    setBusy(false);
  }

  return (
    <div>
      <PageHeader title={tt("titleSales")} subtitle={tt("subSales")} />

      <div className="flex justify-end mb-3">
        <button onClick={() => setShowHistory(true)} className={ghostBtnClass}>
          {tt("salesHistoryTitle")}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4.5 items-start">
        <div>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tt("searchToAdd")} className={`${fieldClass} mb-3.5`} />
          <div className="grid grid-cols-2 gap-2.5">
            {sellable.map((p) => {
              const inStock = p.qty > 0;
              return (
                <div
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className={`${cardClass} p-3.5`}
                  style={{ cursor: inStock ? "pointer" : "not-allowed", opacity: inStock ? 1 : 0.5 }}
                >
                  <div className="text-[13.5px] font-semibold mb-0.5">{p.name}</div>
                  {inStock ? (
                    <div className="text-[11.5px] text-muted-3 mb-2">
                      {p.category} · {p.qty} in stock
                    </div>
                  ) : (
                    <div className="text-[11.5px] font-semibold mb-2" style={{ color: "var(--color-danger-soft)" }}>
                      {p.category} · Out of stock
                    </div>
                  )}
                  <div className="text-[14.5px] font-bold text-primary">{fmt(p.sell_price)}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`${cardClass} p-5 lg:sticky lg:top-0`}>
          <div className="font-bold text-sm mb-3.5">{tt("cart")}</div>
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder={tt("phCustomerOptional")}
            className={`${fieldClass} mb-3.5`}
          />

          {cartLines.length === 0 ? (
            <div className="py-5 text-center text-muted-5 text-[12.5px]">{tt("cartEmpty")}</div>
          ) : (
            cartLines.map((l) => (
              <div key={l.id} className="flex items-center justify-between py-2.5 border-b border-line-soft">
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate">{l.product.name}</div>
                  <div className="text-[11px] text-muted-3">{fmt(l.product.sell_price)} each</div>
                </div>
                <div className="flex items-center gap-1.5 mr-2.5">
                  <button onClick={() => changeQty(l.id, -1)} className="w-5 h-5 rounded-[5px] bg-hover text-xs cursor-pointer">
                    −
                  </button>
                  <input
                    value={l.qty}
                    onChange={(e) => setQty(l.id, e.target.value)}
                    className="text-xs font-bold w-[34px] text-center bg-field border border-line-strong rounded-[5px] outline-none py-0.5"
                  />
                  <button onClick={() => changeQty(l.id, 1)} className="w-5 h-5 rounded-[5px] bg-hover text-xs cursor-pointer">
                    +
                  </button>
                </div>
                <div className="text-[13px] font-bold w-16 text-right">{fmt(l.lineTotal)}</div>
              </div>
            ))
          )}

          <div className="h-px bg-line my-3.5" />

          {cratedUnitsInCart > 0 && (
            <div className="mb-3 bg-field border border-line-strong rounded-[9px] px-3 py-2.5 text-xs text-muted-2">
              {tt("crateInfoPrefix")} {cratedUnitsInCart} {tt("crateInfoSuffix")}
            </div>
          )}

          <div className="flex items-center justify-between mb-1.5 text-[12.5px] text-muted">
            <div>{tt("discountPctLabel")}</div>
            <input
              value={discountPct}
              onChange={(e) => setDiscountPct(e.target.value)}
              className="w-[60px] bg-field border border-line-strong rounded-[7px] px-2 py-1 text-[12.5px] text-right outline-none"
            />
          </div>

          <SummaryRow label={tt("subtotal")} value={fmt(subtotal)} />
          <SummaryRow label={tt("crateCharges")} value={cratedUnitsInCart > 0 ? tt("decidedAtCheckout") : fmt(0)} />
          <SummaryRow label={tt("discount")} value={`−${fmt(discountAmt)}`} />
          <div className="flex justify-between text-[17px] font-bold mb-3.5 pt-2.5 border-t border-line">
            <div>{tt("grandTotal")}</div>
            <div>{fmt(grandTotalPreview)}</div>
          </div>

          <div className="text-[12.5px] text-muted mb-1.5">{tt("paymentReceived")}</div>
          <input value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="0" className={`${fieldClass} mb-2`} />
          <div className="flex justify-between text-[13px] font-semibold mb-4" style={{ color: balancePreview > 0 ? "var(--color-warning)" : "var(--color-primary)" }}>
            <div>{tt("balance")}</div>
            <div>{fmt(balancePreview)}</div>
          </div>

          <button onClick={onCompleteSaleClick} disabled={busy || cartLines.length === 0} className={`${primaryBtnClass} w-full mb-2`}>
            {tt("completeSale")}
          </button>
          <button onClick={clearCart} className={`${ghostBtnClass} w-full`}>
            {tt("clearCart")}
          </button>

          {saleJustCompleted && (
            <div className="mt-3.5 p-3 rounded-[10px] text-[12.5px]" style={{ background: "var(--color-primary-soft)", border: "1px solid var(--color-primary)" }}>
              {tt("saleCompletedMsg")}
            </div>
          )}
        </div>
      </div>

      {crateModal && (
        <CrateConfirmModal
          suggestedQty={cratedUnitsInCart}
          cratePricePerUnit={store?.crate_deposit_per_unit ?? 500}
          onConfirm={(qty) => finalizeSale(qty)}
          onSkip={() => finalizeSale(0)}
          onCancel={() => setCrateModal(false)}
        />
      )}

      {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}

      {showHistory && (
        <SalesHistoryModal
          sales={sales}
          onClose={() => setShowHistory(false)}
          onViewReceipt={(sale) => setReceipt(buildReceipt(sale, fmt))}
          onEditSale={(sale) => setEditingSale(sale)}
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[13px] text-muted mb-1.5">
      <div>{label}</div>
      <div>{value}</div>
    </div>
  );
}
