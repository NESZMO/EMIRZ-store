"use client";

import { useState } from "react";
import { useStore } from "@/lib/store-context";
import { primaryBtnClass, ghostBtnClass, cardClass } from "@/lib/ui";

export function CrateConfirmModal({
  suggestedQty,
  cratePricePerUnit,
  onConfirm,
  onSkip,
  onCancel,
}: {
  suggestedQty: number;
  cratePricePerUnit: number;
  onConfirm: (qty: number) => void;
  onSkip: () => void;
  onCancel: () => void;
}) {
  const { tt, fmt } = useStore();
  const [stage, setStage] = useState<"ask" | "enterQty">("ask");
  const [qty, setQty] = useState(String(suggestedQty));

  const qtyNum = Number(qty) || 0;

  return (
    <div className="fixed inset-0 bg-black/55 flex items-center justify-center z-[70] p-4">
      <div className={`${cardClass} w-[380px] p-6.5`} style={{ borderColor: "var(--color-gold)" }}>
        {stage === "ask" ? (
          <>
            <div className="font-display text-[17px] font-bold mb-3.5">{tt("crateAskTitle")}</div>
            <div className="flex gap-2.5">
              <button onClick={() => setStage("enterQty")} className={`${primaryBtnClass} flex-1`}>
                {tt("yes")}
              </button>
              <button onClick={onSkip} className={`${ghostBtnClass} flex-1`}>
                {tt("no")}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="font-display text-[17px] font-bold mb-3">{tt("howManyCrates")}</div>
            <div className="text-[12.5px] text-muted-2 mb-3.5">
              {tt("cratePriceEach")} {fmt(cratePricePerUnit)} {tt("eachSuffix")}
            </div>
            <input
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full bg-field border border-line-strong rounded-[9px] px-3.5 py-2.5 text-[15px] font-bold text-center outline-none mb-2.5"
            />
            <div className="text-[13px] text-muted-2 mb-5">
              {tt("crateChargeTotalLabel")} <b className="text-text">{fmt(qtyNum * cratePricePerUnit)}</b>
            </div>
            <button onClick={() => onConfirm(qtyNum)} className={`${primaryBtnClass} w-full`}>
              {tt("confirmCompleteSale")}
            </button>
          </>
        )}
        <div onClick={onCancel} className="text-center mt-3.5 text-xs text-muted-4 cursor-pointer">
          {tt("cancel")}
        </div>
      </div>
    </div>
  );
}
