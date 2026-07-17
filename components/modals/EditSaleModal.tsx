"use client";

import { useState } from "react";
import { useStore } from "@/lib/store-context";
import { editSale } from "@/lib/actions/sales";
import { CrateConfirmModal } from "@/components/modals/CrateConfirmModal";
import { primaryBtnClass, ghostBtnClass } from "@/lib/ui";
import type { Category, ProductRow } from "@/lib/database.types";
import type { SaleWithItems } from "@/lib/hooks/useSalesWithItems";

interface DraftItem {
  saleItemId: string;
  productId: string | null;
  name: string;
  category: string;
  unitPrice: number;
  originalQty: number;
  qty: string;
}

export function EditSaleModal({
  sale,
  cratePerUnit,
  onClose,
}: {
  sale: SaleWithItems;
  products?: ProductRow[];
  cratePerUnit: number;
  onClose: () => void;
}) {
  const { tt, fmt } = useStore();

  const [customerName, setCustomerName] = useState(sale.customer_name);
  const [items, setItems] = useState<DraftItem[]>(
    sale.sale_items.map((i) => ({
      saleItemId: i.id,
      productId: i.product_id,
      name: i.name_snapshot,
      category: i.category_snapshot,
      unitPrice: i.unit_price,
      originalQty: i.qty,
      qty: String(i.qty),
    })),
  );
  const [discountPct, setDiscountPct] = useState(String(sale.discount_pct));
  const [paid, setPaid] = useState(String(sale.amount_paid));
  const [showCrateConfirm, setShowCrateConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  function setItemQty(saleItemId: string, qty: string) {
    setItems((cur) => cur.map((i) => (i.saleItemId === saleItemId ? { ...i, qty } : i)));
  }

  const activeItems = items.filter((i) => (Number(i.qty) || 0) > 0);
  const subtotal = activeItems.reduce((a, i) => a + i.unitPrice * (Number(i.qty) || 0), 0);
  const discountAmt = (subtotal * (Number(discountPct) || 0)) / 100;
  const grandTotalPreview = subtotal - discountAmt + sale.crate_charge;
  const paidNum = Number(paid) || 0;
  const balancePreview = grandTotalPreview - paidNum;

  function onSaveClick() {
    const cratedQty = activeItems.reduce((a, i) => a + (i.category === "Crated" ? Number(i.qty) || 0 : 0), 0);
    if (cratedQty > 0) {
      setShowCrateConfirm(true);
    } else {
      finalizeEdit(0);
    }
  }

  async function finalizeEdit(crateUnits: number) {
    setBusy(true);
    setShowCrateConfirm(false);

    await editSale({
      saleId: sale.id,
      customerName,
      discountPct: Number(discountPct) || 0,
      paid: paidNum,
      crateUnits,
      items: items.map((i) => ({
        saleItemId: i.saleItemId,
        productId: i.productId,
        name: i.name,
        unitPrice: i.unitPrice,
        category: i.category as Category,
        originalQty: i.originalQty,
        newQty: Number(i.qty) || 0,
      })),
    });

    setBusy(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="w-[500px] max-w-[94vw] max-h-[90vh] overflow-y-auto bg-sidebar border border-line rounded-xl p-6 text-text font-sans">
        <div className="font-bold text-base mb-4.5">{tt("editProductForm")}</div>
        <input
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder={tt("phCustomerOptional")}
          className="w-full bg-field border border-line-strong rounded-[9px] px-3 py-2.5 text-sm outline-none mb-3.5"
        />
        <div className="text-xs font-semibold text-muted mb-2">Items</div>
        {items.map((i) => (
          <div key={i.saleItemId} className="grid grid-cols-[2fr_0.8fr_0.8fr] gap-2 mb-2.5">
            <div className="px-2.5 py-2 bg-field rounded-md text-[13px]">{i.name}</div>
            <div className="px-2.5 py-2 bg-field border border-line-strong rounded-md text-xs text-text-dim text-right">{fmt(i.unitPrice)}</div>
            <input
              value={i.qty}
              onChange={(e) => setItemQty(i.saleItemId, e.target.value)}
              className="px-2.5 py-2 bg-field border border-line-strong rounded-md text-[13px] text-center outline-none"
            />
          </div>
        ))}

        <div className="h-px bg-line my-3.5" />
        <div className="grid grid-cols-2 gap-3 mb-3.5">
          <div>
            <div className="text-[11px] text-muted-2 mb-1.5">{tt("discountPctLabel")}</div>
            <input
              value={discountPct}
              onChange={(e) => setDiscountPct(e.target.value)}
              className="w-full bg-field border border-line-strong rounded-md px-2 py-1.5 text-xs text-right outline-none"
            />
          </div>
          <div>
            <div className="text-[11px] text-muted-2 mb-1.5">{tt("crateCharges")}</div>
            <div className="w-full bg-panel border border-line-strong rounded-md px-2 py-1.5 text-xs text-text-dim text-right">{fmt(sale.crate_charge)}</div>
          </div>
        </div>

        <div className="flex justify-between text-[13px] text-muted mb-2.5">
          <div>{tt("grandTotal")}</div>
          <div className="font-bold text-text">{fmt(grandTotalPreview)}</div>
        </div>
        <div className="flex justify-between items-center text-[13px] text-muted mb-3.5">
          <div>{tt("paymentReceived")}</div>
          <input
            value={paid}
            onChange={(e) => setPaid(e.target.value)}
            className="w-[100px] bg-field border border-line-strong rounded-md px-2 py-1.5 text-xs text-right outline-none"
          />
        </div>
        <div className="flex justify-between text-[13px] font-semibold mb-4.5" style={{ color: balancePreview > 0 ? "var(--color-warning)" : "var(--color-primary)" }}>
          <div>{tt("balance")}</div>
          <div>{fmt(balancePreview)}</div>
        </div>

        <div className="flex gap-2.5">
          <button onClick={onSaveClick} disabled={busy} className={`${primaryBtnClass} flex-1`}>
            {tt("save")}
          </button>
          <button onClick={onClose} className={`${ghostBtnClass} flex-1`}>
            {tt("cancel")}
          </button>
        </div>
      </div>

      {showCrateConfirm && (
        <CrateConfirmModal
          suggestedQty={Math.round(sale.crate_charge / cratePerUnit) || activeItems.reduce((a, i) => a + (i.category === "Crated" ? Number(i.qty) || 0 : 0), 0)}
          cratePricePerUnit={cratePerUnit}
          onConfirm={(qty) => finalizeEdit(qty)}
          onSkip={() => finalizeEdit(0)}
          onCancel={() => setShowCrateConfirm(false)}
        />
      )}
    </div>
  );
}
