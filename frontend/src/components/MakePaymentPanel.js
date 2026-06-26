"use client";

import Link from "next/link";
import TapToRevealQr from "@/components/TapToRevealQr";
import { formatRupees } from "@/lib/api";
import { btnClass, ui } from "@/lib/ui";

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
  amountLabel = "Amount to Pay",
  title = "Make Payment",
  eyebrow = "Wallet",
  paymentNote,
  amountHint,
  orderSummary = null,
  backHref = "/account",
  backLabel = "Back to Account",
  submitting = false,
  onSubmit,
  submitDisabled = false,
  qrImageUrl = null,
}) {
  const note = paymentNote || `Pay the amount below and send your payment screenshot to ${WHATSAPP_NUMBER} for admin approval.`;

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
            value={formatRupees(amount)}
            highlight
          />
        </div>

        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-4 sm:px-5">
          <p className="text-sm font-bold uppercase tracking-wide text-amber-900">{amountLabel}</p>
          <p className="mt-1 text-3xl font-bold text-amber-950">{formatRupees(amount)}</p>
          <p className={`${ui.small} mt-2 text-slate-700`}>{note}</p>
        </div>

        {orderSummary ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
            <p className="mb-2 font-semibold text-slate-800">Order Summary</p>
            {orderSummary}
          </div>
        ) : null}

        <Link href={backHref} className={`${btnClass("ghost")} w-fit`}>{backLabel}</Link>
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
          <span className={ui.label}>Amount</span>
          <input
            className={`${ui.input} border-amber-300 bg-amber-50 font-bold text-amber-950`}
            type="number"
            min="0"
            value={amount}
            readOnly
          />
        </label>

        {amountHint ? (
          <p className={`${ui.small} ${ui.muted}`}>{amountHint}</p>
        ) : null}

        <div className="grid gap-3">
          <TapToRevealQr imageUrl={qrImageUrl} defaultRevealed />
          <p className={`${ui.small} text-center ${ui.muted}`}>Scan and pay with any UPI app.</p>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-bold uppercase tracking-wide text-red-700">
          Please send screenshot of payment to {WHATSAPP_NUMBER} for confirmation
        </div>

        <button
          className={`${btnClass("amber")} w-full`}
          type="submit"
          disabled={submitting || submitDisabled || amount <= 0}
        >
          {submitting ? "Submitting..." : "Submit Payment Request"}
        </button>
      </form>
    </div>
  );
}

export { WHATSAPP_NUMBER };
