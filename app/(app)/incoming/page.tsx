"use client";

import { useState } from "react";
import { useStore } from "@/lib/store-context";
import { useRealtimeTable } from "@/lib/hooks/useRealtimeTable";
import { receiveStock } from "@/lib/actions/incoming";
import { PageHeader } from "@/components/PageHeader";
import { fieldClass, primaryBtnClass, ghostBtnClass, cardClass } from "@/lib/ui";
import { todayISO } from "@/lib/format";
import type { Category, IncomingStockRow, ProductRow } from "@/lib/database.types";

const EMPTY_FORM = { supplier: "", invoiceNo: "", product: "", category: "Crated" as Category, qty: "", buyPrice: "", deliveryDate: todayISO(), notes: "" };

export default function IncomingPage() {
  const { store, tt, fmt } = useStore();
  const storeId = store?.id;
  const { rows: incoming } = useRealtimeTable<IncomingStockRow>("incoming_stock", storeId);
  const { rows: products } = useRealtimeTable<ProductRow>("products", storeId);

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(EMPTY_FORM);

  function openAdd() {
    setDraft({ ...EMPTY_FORM, product: products[0]?.name ?? "", deliveryDate: todayISO() });
    setShowForm(true);
  }

  function onProductChange(name: string) {
    const p = products.find((x) => x.name === name);
    setDraft((d) => ({ ...d, product: name, category: p?.category ?? d.category }));
  }

  async function onReceiveStock() {
    const qty = Number(draft.qty) || 0;
    if (!draft.product || !draft.supplier.trim() || qty <= 0 || !storeId) return;
    const product = products.find((p) => p.name === draft.product);
    if (!product) return;

    await receiveStock({
      supplier: draft.supplier,
      invoice_no: draft.invoiceNo,
      product_id: product.id,
      product_name_snapshot: product.name,
      category: draft.category,
      qty,
      buy_price: Number(draft.buyPrice) || 0,
      delivery_date: draft.deliveryDate || todayISO(),
      notes: draft.notes,
    });
    setShowForm(false);
  }

  return (
    <div>
      <PageHeader title={tt("titleIncoming")} subtitle={tt("subIncoming")} />

      <div className="flex justify-end mb-3.5">
        <button onClick={openAdd} className={primaryBtnClass}>
          {tt("receiveStock")}
        </button>
      </div>

      {showForm && (
        <div className={`${cardClass} p-5 mb-4.5`} style={{ borderColor: "var(--color-gold)" }}>
          <div className="font-bold text-sm mb-3.5">{tt("receiveStock")}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3.5">
            <input className={fieldClass} placeholder={tt("phSupplierName")} value={draft.supplier} onChange={(e) => setDraft({ ...draft, supplier: e.target.value })} />
            <input className={fieldClass} placeholder={tt("phInvoiceNo")} value={draft.invoiceNo} onChange={(e) => setDraft({ ...draft, invoiceNo: e.target.value })} />
            <select className={fieldClass} value={draft.product} onChange={(e) => onProductChange(e.target.value)}>
              {products.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
            <input className={fieldClass} placeholder={tt("phQuantity")} value={draft.qty} onChange={(e) => setDraft({ ...draft, qty: e.target.value })} />
            <input className={fieldClass} placeholder={tt("phBuyPrice")} value={draft.buyPrice} onChange={(e) => setDraft({ ...draft, buyPrice: e.target.value })} />
            <input type="date" className={fieldClass} value={draft.deliveryDate} onChange={(e) => setDraft({ ...draft, deliveryDate: e.target.value })} />
            <input className={`${fieldClass} col-span-2`} placeholder={tt("phNotes")} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </div>
          <div className="flex gap-2.5">
            <button onClick={onReceiveStock} className={primaryBtnClass}>
              {tt("save")}
            </button>
            <button onClick={() => setShowForm(false)} className={ghostBtnClass}>
              {tt("cancel")}
            </button>
          </div>
        </div>
      )}

      <div className={`${cardClass} overflow-hidden overflow-x-auto`}>
        <div className="min-w-[950px]">
          <div className="grid grid-cols-[1.3fr_1fr_1.4fr_0.9fr_0.8fr_1fr_1fr_1.3fr] gap-3.5 px-4.5 py-3 text-[11.5px] font-bold text-muted-4 tracking-wide border-b border-line">
            <div>{tt("phSupplierName")}</div>
            <div>{tt("colInvoice")}</div>
            <div>{tt("colProductCol")}</div>
            <div>{tt("colCategory")}</div>
            <div>{tt("colQty")}</div>
            <div>{tt("colBuyPrice")}</div>
            <div>{tt("colDelivered")}</div>
            <div>{tt("colNotes")}</div>
          </div>
          {incoming.map((h) => (
            <div key={h.id} className="grid grid-cols-[1.3fr_1fr_1.4fr_0.9fr_0.8fr_1fr_1fr_1.3fr] gap-3.5 px-4.5 py-3.5 items-center border-b border-line-soft text-[12.5px]">
              <div className="font-semibold">{h.supplier}</div>
              <div className="text-muted">{h.invoice_no}</div>
              <div>{h.product_name_snapshot}</div>
              <div className="text-muted">{h.category}</div>
              <div className="font-bold text-primary">+{h.qty}</div>
              <div>{fmt(h.buy_price)}</div>
              <div className="text-muted-3">{h.delivery_date}</div>
              <div className="text-muted-3">{h.notes}</div>
            </div>
          ))}
          {incoming.length === 0 && <div className="p-8 text-center text-muted-5 text-[13px]">{tt("noIncomingMsg")}</div>}
        </div>
      </div>
    </div>
  );
}
