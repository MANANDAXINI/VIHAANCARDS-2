"use client";

import Link from "next/link";
import TapToRevealQr from "@/components/TapToRevealQr";
import { formatRupees } from "@/lib/api";
import { btnClass, ui } from "@/lib/ui";
import { BANK_TRANSFER, buildUpiQrImageUrl } from "@/lib/upi";

const WHATSAPP_NUMBER = "7507543214";
const GUIDE_IMAGE = "/images/payment-options-guide.png";

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
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-5">
      <div className="mb-5 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-red-600">{eyebrow}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
        {user?.business || user?.name ? (
          <p className={`mt-2 ${ui.small} ${ui.muted}`}>
            Customer: <strong className="text-slate-800">{user.business || user.name}</strong>
          </p>
        ) : null}
      </div>

      <form
        className="mx-auto grid w-full gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
        onSubmit={onSubmit}
      >
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-900">Submit Payment</h2>
          <p className={`${ui.small} ${ui.muted} mt-1`}>
            Pay by UPI QR or Account Transfer / NEFT.
          </p>
        </div>

        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-900">
            Remaining Amount
          </p>
          <p className="mt-1 text-3xl font-bold text-amber-950">
            {formatRupees(hasPayCap ? payCap : totalOutstanding)}
          </p>
          <p className={`${ui.small} mt-1 text-slate-700`}>{note}</p>
        </div>

        <label className={ui.field}>
          <span className={ui.label}>
            {amountEditable ? "Enter Amount To Pay Now" : amountLabel}
          </span>
          <input
            className={`${ui.input} border-amber-300 bg-amber-50 text-center text-lg font-bold text-amber-950`}
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
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button type="button" className={btnClass("ghost", true)} onClick={payFullAmount}>
              Pay full {formatRupees(payCap)}
            </button>
            <span className={`${ui.small} ${ui.muted}`}>Max: {formatRupees(payCap)}</span>
          </div>
        ) : null}

        {amountHint ? (
          <p className={`${ui.small} text-center ${ui.muted}`}>{amountHint}</p>
        ) : null}

        {orderSummary ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <p className="mb-2 font-semibold text-slate-800">Order Summary</p>
            {orderSummary}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(11rem,16rem)_minmax(0,1fr)] md:items-stretch">
          <div className="flex min-h-[18rem] flex-col rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:p-4 md:min-h-[22rem]">
            <p className="text-center text-xs font-bold uppercase tracking-wide text-slate-800">
              1. UPI QR Code
            </p>
            <div className="mt-3 flex flex-1 flex-col justify-center">
              <TapToRevealQr imageUrl={qrToShow} defaultRevealed />
              <p className={`${ui.small} mt-1 text-center ${ui.muted}`}>
                {dynamicQrUrl
                  ? `Scan and pay ${formatRupees(payAmount)} with any UPI app.`
                  : "Scan and pay with any UPI app."}
              </p>
            </div>
          </div>

          <div className="flex min-h-[18rem] items-stretch justify-center self-stretch overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80 p-2 md:min-h-[22rem]">
            <img
              src={GUIDE_IMAGE}
              alt="Choose UPI QR or Account Transfer / NEFT"
              className="h-full w-full object-contain object-center"
            />
          </div>

          <div className="flex min-h-[18rem] flex-col rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:p-4 md:min-h-[22rem]">
            <p className="text-center text-xs font-bold uppercase tracking-wide text-slate-800">
              2. Account Transfer / NEFT
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
            {payAmount > 0 ? (
              <p className={`${ui.small} mt-3 text-center text-amber-900`}>
                Transfer {formatRupees(payAmount)} and keep the receipt / screenshot.
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-bold uppercase tracking-wide text-red-700">
          Payment karne ke baad ye Confirmation button dabaiye
        </div>

        <button
          className={`${btnClass("amber")} w-full`}
          type="submit"
          disabled={submitting || submitDisabled || payAmount <= 0}
        >
          {submitting ? "Submitting..." : "Confirmation"}
        </button>

        <p className={`${ui.small} text-center ${ui.muted}`}>
          Payment screenshot {WHATSAPP_NUMBER} pe bheje — admin approval ke liye.
        </p>

        {showBack ? (
          <div className="text-center">
            <Link href={backHref} className={`${btnClass("ghost")} w-fit`}>{backLabel}</Link>
          </div>
        ) : null}
      </form>
    </div>
  );
}

export { WHATSAPP_NUMBER };
