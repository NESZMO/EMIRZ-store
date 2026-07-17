"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store-context";
import { useUndo } from "@/lib/undo-context";
import { useRealtimeTable } from "@/lib/hooks/useRealtimeTable";
import { createCrateRecord, updateCrateRecord } from "@/lib/actions/crates";
import { PageHeader } from "@/components/PageHeader";
import { fieldClass, primaryBtnClass, ghostBtnClass, cardClass } from "@/lib/ui";
import { crateOutstanding } from "@/lib/domain";
import type { CrateRecordRow, CrateStatus, ProductRow } from "@/lib/database.types";

const EMPTY_FORM = { customer: "", product: "", taken: "", returned: "0" };

export default function CratesPage() {
  const { store, tt, fmt } = useStore();
  const { push } = useUndo();
  const storeId = store?.id;
  const { rows: crates } = useRealtimeTable<CrateRecordRow>("crate_records", storeId);
  const { rows: products } = useRealtimeTable<ProductRow>("products", storeId);
  const cratedProducts = useMemo(() => products.filter((p) => p.category === "Crated"), [products]);
  const cratePerUnit = store?.crate_deposit_per_unit ?? 500;

  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<"add" | "edit">("add");
  const [targetId, setTargetId] = useState<string | null>(null);
  const [draft, setDraft] = useState(EMPTY_FORM);

  const [returnTarget, setReturnTarget] = useState<CrateRecordRow | null>(null);
  const [returnQty, setReturnQty] = useState("");

  const totalOutstanding = crates.reduce((a, c) => a + crateOutstanding(c), 0);
  const totalReturned = crates.reduce((a, c) => a + c.returned, 0);
  const depositAtRisk = totalOutstanding * cratePerUnit;

  function openAdd() {
    setMode("add");
    setTargetId(null);
    setDraft({ ...EMPTY_FORM, product: cratedProducts[0]?.name ?? "" });
    setShowForm(true);
  }

  function openEdit(r: CrateRecordRow) {
    setMode("edit");
    setTargetId(r.id);
    setDraft({ customer: r.customer, product: r.product_name_snapshot, taken: String(r.taken), returned: String(r.returned) });
    setShowForm(true);
  }

  async function onSave() {
    if (!draft.customer.trim() || !draft.product || !storeId) return;
    const taken = Number(draft.taken) || 0;
    const returned = Number(draft.returned) || 0;
    const status: CrateStatus = Math.max(0, taken - returned) === 0 ? "Cleared" : "Outstanding";
    const product = cratedProducts.find((p) => p.name === draft.product);
    if (mode === "edit" && targetId) {
      await updateCrateRecord(targetId, {
        customer: draft.customer,
        product_name_snapshot: draft.product,
        product_id: product?.id ?? null,
        taken,
        returned,
        status,
      });
    } else {
      await createCrateRecord({
        customer: draft.customer,
        product_name_snapshot: draft.product,
        product_id: product?.id ?? null,
        taken,
        returned,
        status,
      });
    }
    setShowForm(false);
  }

  async function onSaveReturn() {
    if (!returnTarget) return;
    const qty = parseInt(returnQty, 10) || 0;
    if (qty <= 0) return;
    const prevReturned = returnTarget.returned;
    const nextReturned = Math.min(returnTarget.taken, returnTarget.returned + qty);
    const status: CrateStatus = Math.max(0, returnTarget.taken - nextReturned) === 0 ? "Cleared" : "Outstanding";
    await updateCrateRecord(returnTarget.id, { returned: nextReturned, status });
    push({
      label: `return ${returnTarget.customer}`,
      undo: () => updateCrateRecord(returnTarget.id, { returned: prevReturned, status: "Outstanding" }),
      redo: () => updateCrateRecord(returnTarget.id, { returned: nextReturned, status }),
    });
    setReturnTarget(null);
    setReturnQty("");
  }

  return (
    <div>
      <PageHeader title={tt("titleCrates")} subtitle={tt("subCrates")} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className={`${cardClass} p-4.5`}>
          <div className="text-xs text-muted-2 font-semibold mb-2">{tt("outstandingCrates")}</div>
          <div className="font-display text-2xl font-bold text-gold">{totalOutstanding}</div>
        </div>
        <div className={`${cardClass} p-4.5`}>
          <div className="text-xs text-muted-2 font-semibold mb-2">{tt("returnedCrates")}</div>
          <div className="font-display text-2xl font-bold text-primary">{totalReturned}</div>
        </div>
        <div className={`${cardClass} p-4.5`}>
          <div className="text-xs text-muted-2 font-semibold mb-2">{tt("depositAtRisk")}</div>
          <div className="font-display text-2xl font-bold">{fmt(depositAtRisk)}</div>
        </div>
      </div>

      <div className="flex justify-end mb-3.5">
        <button onClick={openAdd} className={primaryBtnClass}>
          {tt("addCrateRecord")}
        </button>
      </div>

      {showForm && (
        <div className={`${cardClass} p-5 mb-4.5`} style={{ borderColor: "var(--color-gold)" }}>
          <div className="font-bold text-sm mb-3.5">{tt("recordCratesIssued")}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3.5">
            <input className={fieldClass} placeholder={tt("phCustomerName")} value={draft.customer} onChange={(e) => setDraft({ ...draft, customer: e.target.value })} />
            <select className={fieldClass} value={draft.product} onChange={(e) => setDraft({ ...draft, product: e.target.value })}>
              {cratedProducts.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
            <input className={fieldClass} placeholder={tt("phCratesTaken")} value={draft.taken} onChange={(e) => setDraft({ ...draft, taken: e.target.value })} />
            <input className={fieldClass} placeholder={tt("phCratesReturned")} value={draft.returned} onChange={(e) => setDraft({ ...draft, returned: e.target.value })} />
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
        <div className="min-w-[880px]">
          <div className="grid grid-cols-[1.4fr_1.4fr_0.8fr_0.8fr_0.8fr_1fr_1fr_1fr] gap-3.5 px-4.5 py-3 text-[11.5px] font-bold text-muted-4 tracking-wide border-b border-line">
            <div>{tt("colCustomer")}</div>
            <div>{tt("colProductCol")}</div>
            <div>{tt("colTaken")}</div>
            <div>{tt("colReturned")}</div>
            <div>{tt("colOutstanding")}</div>
            <div>{tt("colDeposit")}</div>
            <div>{tt("colStatus")}</div>
            <div>{tt("colAction")}</div>
          </div>
          {crates.map((r) => {
            const outstanding = crateOutstanding(r);
            const cleared = outstanding === 0;
            return (
              <div key={r.id} className="grid grid-cols-[1.4fr_1.4fr_0.8fr_0.8fr_0.8fr_1fr_1fr_1fr] gap-3.5 px-4.5 py-3.5 items-center border-b border-line-soft">
                <div className="text-[13.5px] font-semibold">{r.customer}</div>
                <div className="text-[12.5px] text-muted">{r.product_name_snapshot}</div>
                <div className="text-[13px]">{r.taken}</div>
                <div className="text-[13px]">{r.returned}</div>
                <div className="text-[13px] font-bold" style={{ color: outstanding > 0 ? "var(--color-gold)" : "var(--color-text)" }}>
                  {outstanding}
                </div>
                <div className="text-[12.5px]">{fmt(outstanding * cratePerUnit)}</div>
                <div>
                  <span
                    className="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold"
                    style={{
                      background: cleared ? "var(--color-primary-soft)" : "oklch(32% 0.06 55)",
                      color: cleared ? "var(--color-primary)" : "var(--color-warning)",
                    }}
                  >
                    {cleared ? tt("cleared") : tt("outstandingStatus")}
                  </span>
                </div>
                <div className="flex gap-3 items-center flex-wrap">
                  <button onClick={() => openEdit(r)} className="text-xs font-bold text-gold cursor-pointer">
                    {tt("edit")}
                  </button>
                  {!cleared && (
                    <button
                      onClick={() => {
                        setReturnTarget(r);
                        setReturnQty("");
                      }}
                      className="text-xs font-bold text-primary cursor-pointer"
                    >
                      {tt("recordReturn")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {returnTarget && (
        <div className="fixed inset-0 bg-black/55 flex items-center justify-center z-[70] p-4">
          <div className={`${cardClass} w-[400px] p-6.5`} style={{ borderColor: "var(--color-gold)" }}>
            <div className="font-display text-[17px] font-bold mb-1.5">{tt("recordReturnTitle")}</div>
            <div className="text-xs text-muted-2 mb-3.5">
              {returnTarget.customer} · {returnTarget.product_name_snapshot}
            </div>
            <div className="flex justify-between bg-field rounded-[9px] px-3.5 py-2.5 text-xs mb-3.5">
              <div className="text-muted-2">{tt("outstandingLabel")}</div>
              <div className="font-bold text-gold">{crateOutstanding(returnTarget)}</div>
            </div>
            <div className="text-xs text-muted mb-2">{tt("returnHowMany")}</div>
            <input
              value={returnQty}
              onChange={(e) => setReturnQty(e.target.value)}
              className="w-full bg-field border border-line-strong rounded-[9px] px-3.5 py-2.5 text-[15px] font-bold text-center outline-none mb-2"
            />
            <div
              onClick={() => setReturnQty(String(crateOutstanding(returnTarget)))}
              className="text-xs font-bold text-primary cursor-pointer text-right mb-4"
            >
              {tt("returnAllBtn")} ({crateOutstanding(returnTarget)})
            </div>
            <div className="flex gap-2.5">
              <button onClick={onSaveReturn} className={`${primaryBtnClass} flex-1`}>
                {tt("save")}
              </button>
              <button onClick={() => setReturnTarget(null)} className={`${ghostBtnClass} flex-1`}>
                {tt("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
