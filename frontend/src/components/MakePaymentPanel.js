"use client";

import Link from "next/link";
import TapToRevealQr from "@/components/TapToRevealQr";
import { formatRupees } from "@/lib/api";
import { btnClass, ui } from "@/lib/ui";
import { buildUpiQrImageUrl } from "@/lib/upi";

const WHATSAPP_NUMBER = "7507543214";

function WalletStat({ label, value, highlight = false }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 border-b border-slate-200 py-3 text-sm last:border-0 ${highlight ? "bg-amber-50/80 -mx-1 px-1 rounded" : ""}`}>
      <span className="font-semibold uppercase tracking-wide text-slate-700">{label}</span>
      <span className={`font-bold ${highlight ? "text-lg text-amber-900" : "text-slate-900"}`}>{value}</span>
    </div>
  );
}

export default function MakePaymentPanel({
  user,
  amount = 0,
  maxAmount,
  amountEditable = false,
  onAmountChange,
  outstandingTotal,
  amountLabel = "Amount to Pay",
  title = "Make Payment",
  eyebrow = "Wallet",
  paymentNote,
  amountHint,
  orderSummary = null,
  backHref = "/account",
  backLabel = "Back to Account",
  showBack = true,
  submitting = false,
  onSubmit,
  submitDisabled = false,
  qrImageUrl = null,
}) {
  const note = paymentNote || `Pay the amount below and send your payment screenshot to ${WHATSAPP_NUMBER} for admin approval.`;
  const totalOutstanding = Number(outstandingTotal ?? maxAmount ?? amount) || 0;
  const hasPayCap = maxAmount !== undefined && maxAmount !== null && Number.isFinite(Number(maxAmount));
  const payCap = hasPayCap ? Math.max(0, Number(maxAmount) || 0) : 0;
  const payAmount = Number(amount) || 0;

  // Amount-wise UPI QR: regenerates whenever the pay amount changes so the
  // customer scans and pays the exact amount. Falls back to an admin-uploaded
  // static QR only if a dynamic amount is not available.
  const dynamicQrUrl = buildUpiQrImageUrl(payAmount);
  const qrToShow = dynamicQrUrl || qrImageUrl;

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

  function payFullAmount() {
    if (onAmountChange && hasPayCap) onAmountChange(payCap);
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
      <section className="grid gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-red-600">{eyebrow}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <WalletStat label="Customer" value={user?.business || user?.name || "—"} />
          <WalletStat
            label="Remaining Outstanding"
            value={formatRupees(totalOutstanding)}
            highlight
          />
        </div>

        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-4 sm:px-5">
          <p className="text-sm font-bold uppercase tracking-wide text-amber-900">
            {amountEditable ? "Pay Now (you choose amount)" : amountLabel}
          </p>
          <p className="mt-1 text-3xl font-bold text-amber-950">{formatRupees(payAmount)}</p>
          {amountEditable && payCap > payAmount ? (
            <p className={`${ui.small} mt-1 text-amber-900`}>
              Balance after this payment: {formatRupees(Math.max(0, payCap - payAmount))}
            </p>
          ) : null}
          <p className={`${ui.small} mt-2 text-slate-700`}>{note}</p>
        </div>

        {orderSummary ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
            <p className="mb-2 font-semibold text-slate-800">Order Summary</p>
            {orderSummary}
          </div>
        ) : null}

        {showBack ? (
          <Link href={backHref} className={`${btnClass("ghost")} w-fit`}>{backLabel}</Link>
        ) : null}
      </section>

      <form
        className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
        onSubmit={onSubmit}
      >
        <div>
          <h2 className="text-xl font-bold text-slate-900">Submit Payment</h2>
          <p className={`${ui.small} ${ui.muted} mt-1`}>
            Scan the QR code and pay the amount shown on the left.
          </p>
        </div>

        <label className={ui.field}>
          <span className={ui.label}>
            {amountEditable ? "Enter amount to pay now" : "Amount"}
          </span>
          <input
            className={`${ui.input} border-amber-300 bg-amber-50 font-bold text-amber-950`}
            type="number"
            min="1"
            max={hasPayCap ? payCap || undefined : undefined}
            step="1"
            value={payAmount || ""}
            readOnly={!amountEditable}
            onChange={amountEditable ? handleAmountInput : undefined}
          />
        </label>

        {amountEditable && hasPayCap && payCap > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={btnClass("ghost", true)} onClick={payFullAmount}>
              Pay full {formatRupees(payCap)}
            </button>
            <span className={`${ui.small} ${ui.muted}`}>Max: {formatRupees(payCap)}</span>
          </div>
        ) : null}

        {amountHint ? (
          <p className={`${ui.small} ${ui.muted}`}>{amountHint}</p>
        ) : null}

        <div className="grid gap-3">
          <TapToRevealQr imageUrl={qrToShow} defaultRevealed />
          <p className={`${ui.small} text-center ${ui.muted}`}>
            {dynamicQrUrl
              ? `Scan and pay ${formatRupees(payAmount)} with any UPI app.`
              : "Scan and pay with any UPI app."}
          </p>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-bold uppercase tracking-wide text-red-700">
          Please send screenshot of payment to {WHATSAPP_NUMBER} for confirmation
        </div>

        <button
          className={`${btnClass("amber")} w-full`}
          type="submit"
          disabled={submitting || submitDisabled || payAmount <= 0}
        >
          {submitting ? "Submitting..." : "Submit Payment Request"}
        </button>
      </form>
    </div>
  );
}

export { WHATSAPP_NUMBER };
