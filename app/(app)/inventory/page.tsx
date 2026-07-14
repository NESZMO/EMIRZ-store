"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store-context";
import { useUndo } from "@/lib/undo-context";
import { useRealtimeTable } from "@/lib/hooks/useRealtimeTable";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { fieldClass, primaryBtnClass, ghostBtnClass, cardClass } from "@/lib/ui";
import { isLowStock } from "@/lib/domain";
import { todayISO } from "@/lib/format";
import type { Category, ProductRow } from "@/lib/database.types";

const EMPTY_FORM = { name: "", brand: "", category: "Crated" as Category, supplier: "", buyPrice: "", sellPrice: "", qty: "", minStock: "" };

export default function InventoryPage() {
  const { store, profile, tt, fmt } = useStore();
  const { push } = useUndo();
  const storeId = store?.id;
  const { rows: products } = useRealtimeTable<ProductRow>("products", storeId, { orderBy: "date_added", ascending: false });
  const supabase = useMemo(() => createClient(), []);
  const isManager = profile?.role === "manager";

  const [tab, setTab] = useState<Category>("Crated");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<"add" | "edit">("add");
  const [targetId, setTargetId] = useState<string | null>(null);
  const [draft, setDraft] = useState(EMPTY_FORM);

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          p.category === tab &&
          (p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase())),
      ),
    [products, tab, search],
  );

  function openAdd() {
    setMode("add");
    setTargetId(null);
    setDraft({ ...EMPTY_FORM, category: tab });
    setShowForm(true);
  }

  function openEdit(p: ProductRow) {
    setMode("edit");
    setTargetId(p.id);
    setDraft({
      name: p.name,
      brand: p.brand,
      category: p.category,
      supplier: p.supplier,
      buyPrice: String(p.buy_price),
      sellPrice: String(p.sell_price),
      qty: String(p.qty),
      minStock: String(p.min_stock),
    });
    setShowForm(true);
  }

  async function onSave() {
    if (!draft.name.trim() || !storeId) return;
    const payload = {
      name: draft.name,
      brand: draft.brand,
      category: draft.category,
      supplier: draft.supplier,
      buy_price: Number(draft.buyPrice) || 0,
      sell_price: Number(draft.sellPrice) || 0,
      qty: Number(draft.qty) || 0,
      min_stock: Number(draft.minStock) || 0,
    };
    if (mode === "edit" && targetId) {
      await supabase.from("products").update(payload).eq("id", targetId);
    } else {
      await supabase.from("products").insert({ ...payload, store_id: storeId, date_added: todayISO() });
    }
    setShowForm(false);
  }

  async function adjustQty(p: ProductRow, delta: number) {
    const prevQty = p.qty;
    const nextQty = Math.max(0, p.qty + delta);
    await supabase.from("products").update({ qty: nextQty }).eq("id", p.id);
    push({
      label: `qty ${p.name}`,
      undo: () => supabase.from("products").update({ qty: prevQty }).eq("id", p.id),
      redo: () => supabase.from("products").update({ qty: nextQty }).eq("id", p.id),
    });
  }

  async function deleteProduct(p: ProductRow) {
    await supabase.from("products").delete().eq("id", p.id);
    push({
      label: `delete ${p.name}`,
      undo: () =>
        supabase.from("products").insert({
          id: p.id,
          store_id: p.store_id,
          name: p.name,
          brand: p.brand,
          category: p.category,
          supplier: p.supplier,
          buy_price: p.buy_price,
          sell_price: p.sell_price,
          qty: p.qty,
          min_stock: p.min_stock,
          date_added: p.date_added,
        }),
      redo: () => supabase.from("products").delete().eq("id", p.id),
    });
  }

  return (
    <div>
      <PageHeader title={tt("titleInventory")} subtitle={tt("subInventory")} />

      <div className="flex items-center gap-2.5 mb-4.5 flex-wrap">
        <button
          onClick={() => setTab("Crated")}
          className="px-4.5 py-2.5 rounded-[10px] text-[13.5px] font-bold cursor-pointer"
          style={{
            background: tab === "Crated" ? "var(--color-primary)" : "var(--color-panel)",
            color: tab === "Crated" ? "var(--color-bg)" : "var(--color-text-dim)",
          }}
        >
          {tt("tabCrated")}
        </button>
        <button
          onClick={() => setTab("Boxed")}
          className="px-4.5 py-2.5 rounded-[10px] text-[13.5px] font-bold cursor-pointer"
          style={{
            background: tab === "Boxed" ? "var(--color-primary)" : "var(--color-panel)",
            color: tab === "Boxed" ? "var(--color-bg)" : "var(--color-text-dim)",
          }}
        >
          {tt("tabBoxed")}
        </button>
        <div className="flex-1" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tt("searchProduct")}
          className={`${fieldClass} w-[230px]`}
        />
        <button onClick={openAdd} className={primaryBtnClass}>
          {tt("addProduct")}
        </button>
      </div>

      {showForm && (
        <div className={`${cardClass} p-5 mb-4.5`} style={{ borderColor: "var(--color-gold)" }}>
          <div className="font-bold text-sm mb-3.5">{mode === "edit" ? tt("editProductForm") : tt("addProductForm")}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3.5">
            <input className={fieldClass} placeholder={tt("phName")} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <input className={fieldClass} placeholder={tt("phBrand")} value={draft.brand} onChange={(e) => setDraft({ ...draft, brand: e.target.value })} />
            <select className={fieldClass} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as Category })}>
              <option value="Crated">{tt("tabCrated")}</option>
              <option value="Boxed">{tt("tabBoxed")}</option>
            </select>
            <input className={fieldClass} placeholder={tt("phSupplier")} value={draft.supplier} onChange={(e) => setDraft({ ...draft, supplier: e.target.value })} />
            <input className={fieldClass} placeholder={tt("phBuyPrice")} value={draft.buyPrice} onChange={(e) => setDraft({ ...draft, buyPrice: e.target.value })} />
            <input className={fieldClass} placeholder={tt("phSellPrice")} value={draft.sellPrice} onChange={(e) => setDraft({ ...draft, sellPrice: e.target.value })} />
            <input className={fieldClass} placeholder={tt("phQty")} value={draft.qty} onChange={(e) => setDraft({ ...draft, qty: e.target.value })} />
            <input className={fieldClass} placeholder={tt("phMinStock")} value={draft.minStock} onChange={(e) => setDraft({ ...draft, minStock: e.target.value })} />
          </div>
          <div className="flex gap-2.5">
            <button onClick={onSave} className={primaryBtnClass}>
              {tt("save")}
            </button>
            <button onClick={() => setShowForm(false)} className={ghostBtnClass}>
              {tt("cancel")}
            </button>
          </div>
        </div>
      )}

      <div className={`${cardClass} overflow-hidden overflow-x-auto`}>
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_0.8fr_1.3fr_1fr_1.4fr] gap-3.5 px-4.5 py-3 text-[11.5px] font-bold text-muted-4 tracking-wide border-b border-line">
            <div>{tt("colProduct")}</div>
            <div>{tt("colBuyPrice")}</div>
            <div>{tt("colSellPrice")}</div>
            <div>{tt("colQty")}</div>
            <div>{tt("colMin")}</div>
            <div>{tt("colSupplier")}</div>
            <div>{tt("colAdded")}</div>
            <div>{tt("colActions")}</div>
          </div>
          {filtered.map((p) => (
            <div key={p.id} className="grid grid-cols-[1.6fr_1fr_1fr_1fr_0.8fr_1.3fr_1fr_1.4fr] gap-3.5 px-4.5 py-3.5 items-center border-b border-line-soft">
              <div>
                <div className="text-[13.5px] font-semibold">{p.name}</div>
                <div className="text-[11.5px] text-muted-3">{p.brand}</div>
              </div>
              <div className="text-[13px]">{fmt(p.buy_price)}</div>
              <div className="text-[13px] font-semibold">{fmt(p.sell_price)}</div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => adjustQty(p, -1)} className="w-[22px] h-[22px] rounded-md bg-hover flex items-center justify-center cursor-pointer text-sm">
                  −
                </button>
                <div className="text-[13.5px] font-bold w-[22px] text-center" style={{ color: isLowStock(p) ? "var(--color-danger)" : "var(--color-text)" }}>
                  {p.qty}
                </div>
                <button onClick={() => adjustQty(p, 1)} className="w-[22px] h-[22px] rounded-md bg-hover flex items-center justify-center cursor-pointer text-sm">
                  +
                </button>
              </div>
              <div className="text-[12.5px] text-muted-3">{p.min_stock}</div>
              <div className="text-[12.5px] text-muted">{p.supplier}</div>
              <div className="text-xs text-muted-4">{p.date_added}</div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(p)} className="text-xs font-bold text-gold cursor-pointer">
                  {tt("edit")}
                </button>
                {isManager && (
                  <button onClick={() => deleteProduct(p)} className="text-xs font-bold text-danger cursor-pointer">
                    {tt("delete")}
                  </button>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="p-8 text-center text-muted-5 text-[13px]">{tt("noProductsMsg")}</div>}
        </div>
      </div>
    </div>
  );
}
