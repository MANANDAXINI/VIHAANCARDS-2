"use client";

import { useEffect, useRef, useState } from "react";
import { uploadAssetUrl } from "@/lib/api";
import { BANK_TRANSFER, buildUpiLink, buildUpiQrImageUrl } from "@/lib/upi";
import { btnClass, ui } from "@/lib/ui";

const WHATSAPP_NUMBER = "7507543214";
const GUIDE_IMAGE = "/images/payment-options-guide.png";

function qrUrlForAmount(amount, fallbackUrl) {
  const dynamic = buildUpiQrImageUrl(amount);
  if (dynamic) return dynamic;
  if (fallbackUrl) return uploadAssetUrl(fallbackUrl);
  const link = buildUpiLink(0);
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}`;
}

export default function MakePaymentPanel({
  amount = 0,
  maxAmount,
  amountEditable = true,
  onAmountChange,
  submitting = false,
  onSubmit,
  submitDisabled = false,
  qrImageUrl = null,
}) {
  const hasPayCap = maxAmount !== undefined && maxAmount !== null && Number.isFinite(Number(maxAmount));
  const payCap = hasPayCap ? Math.max(0, Number(maxAmount) || 0) : 0;
  const payAmount = Number(amount) || 0;
  const qrToShow = qrUrlForAmount(payAmount, qrImageUrl);
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const [guideHeight, setGuideHeight] = useState(0);

  useEffect(() => {
    const left = leftRef.current;
    const right = rightRef.current;
    if (!left || !right || typeof ResizeObserver === "undefined") return undefined;

    const sync = () => {
      const desktop = window.matchMedia("(min-width: 768px)").matches;
      if (!desktop) {
        setGuideHeight((prev) => (prev === 0 ? prev : 0));
        return;
      }
      const next = Math.round(
        Math.max(left.getBoundingClientRect().height, right.getBoundingClientRect().height)
      );
      setGuideHeight((prev) => (prev === next ? prev : next));
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(left);
    observer.observe(right);
    window.addEventListener("resize", sync);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [qrToShow]);

  function handleAmountInput(event) {
    const next = Number(event.target.value);
    if (!onAmountChange) return;
    if (!Number.isFinite(next)) {
      onAmountChange(0);
      return;
    }
    const clamped = Math.max(0, next);
    onAmountChange(hasPayCap ? Math.min(clamped, payCap) : clamped);
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-5">
      <form className="mx-auto grid w-full gap-4" onSubmit={onSubmit}>
        <label className={ui.field}>
          <span className={ui.label}>Enter Amount To Pay Now</span>
          <input
            className={ui.input}
            type="number"
            min="1"
            max={hasPayCap ? payCap || undefined : undefined}
            step="1"
            value={payAmount || ""}
            readOnly={!amountEditable}
            onChange={amountEditable ? handleAmountInput : undefined}
            placeholder=""
          />
        </label>

        <p className={`${ui.small} ${ui.muted}`}>
          Enter the amount you want to pay and submit for admin approval.
        </p>

        <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
          <div className="flex flex-col items-center gap-4 md:flex-row md:items-stretch">
            <div ref={leftRef} className="flex w-full min-w-0 flex-1 flex-col p-1 sm:p-2">
              <p className="text-center text-xs font-bold uppercase tracking-wide text-slate-800">
                1. UPI QR Code
              </p>
              <div className="mt-3 flex flex-1 flex-col items-center justify-center">
                <img
                  src={qrToShow}
                  alt="UPI payment QR"
                  className="mx-auto w-full max-w-[220px] rounded-lg"
                />
                <p className={`${ui.small} mt-2 text-center ${ui.muted}`}>
                  Scan and pay with any UPI app.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-center">
              <img
                src={GUIDE_IMAGE}
                alt="Choose UPI QR or Account Transfer"
                className="w-auto object-contain"
                style={{
                  height: guideHeight > 0 ? `${guideHeight}px` : "10rem",
                  width: "auto",
                }}
              />
            </div>

            <div ref={rightRef} className="flex w-full min-w-0 flex-1 flex-col p-1 sm:p-2">
              <p className="text-center text-xs font-bold uppercase tracking-wide text-slate-800">
                2. Account Transfer
              </p>
              <dl className="mt-3 flex flex-1 flex-col justify-center gap-2.5 text-sm">
                <div>
                  <dt className={`${ui.small} ${ui.muted}`}>Account Name</dt>
                  <dd className="font-bold text-slate-900">{BANK_TRANSFER.accountName}</dd>
                </div>
                <div>
                  <dt className={`${ui.small} ${ui.muted}`}>Account Number</dt>
                  <dd className="font-semibold tracking-wide text-slate-900">
                    {BANK_TRANSFER.accountNumber}
                  </dd>
                </div>
                <div>
                  <dt className={`${ui.small} ${ui.muted}`}>IFSC Code</dt>
                  <dd className="font-semibold tracking-wide text-slate-900">{BANK_TRANSFER.ifsc}</dd>
                </div>
                <div>
                  <dt className={`${ui.small} ${ui.muted}`}>Bank and Branch</dt>
                  <dd className="font-medium text-slate-900">{BANK_TRANSFER.bankAndBranch}</dd>
                </div>
                <div>
                  <dt className={`${ui.small} ${ui.muted}`}>City</dt>
                  <dd className="font-medium text-slate-900">{BANK_TRANSFER.city}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-bold uppercase tracking-wide text-red-700">
          PAYMENT KARNE KE BAAD CONFIRMATION BUTTON DABAYE
        </div>

        <button
          className={`${btnClass("amber")} w-full`}
          type="submit"
          disabled={submitting || submitDisabled || payAmount <= 0}
        >
          {submitting ? "Submitting..." : "Confirmation"}
        </button>
      </form>
    </div>
  );
}

export { WHATSAPP_NUMBER };
