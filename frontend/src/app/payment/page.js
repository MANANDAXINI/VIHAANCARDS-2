"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import TapToRevealQr from "@/components/TapToRevealQr";
import { useAuth, useAuthUser } from "@/context/AuthContext";
import { catalogApi, formatRupees, walletApi } from "@/lib/api";
import { toast } from "@/lib/toast";
import { btnClass, ui } from "@/lib/ui";

const WHATSAPP_NUMBER = "7507543214";

function WalletStat({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-slate-200 py-3 text-sm last:border-0">
      <span className="font-semibold uppercase tracking-wide text-slate-700">{label}</span>
      <span className="font-bold text-slate-900">{value}</span>
    </div>
  );
}

function PaymentContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh, ready } = useAuth();
  const user = useAuthUser();
  const [submitting, setSubmitting] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState(null);
  const [pendingOrder, setPendingOrder] = useState(null);
  const [review, setReview] = useState(null);
  const [amount, setAmount] = useState(0);
  const [allowed, setAllowed] = useState(false);

  const shortfall = Number(params.get("shortfall") || 0);

  useEffect(() => {
    if (ready && !user) router.replace("/?auth=login");
  }, [ready, user, router]);

  useEffect(() => {
    if (ready && user) refresh().catch(() => {});
  }, [ready, user, refresh]);

  useEffect(() => {
    try {
      const pendingRaw = sessionStorage.getItem("pd_pending_order");
      const reviewRaw = sessionStorage.getItem("pd_order_review");
      if (!pendingRaw || !reviewRaw) {
        router.replace("/order");
        return;
      }
      const pending = JSON.parse(pendingRaw);
      const reviewData = JSON.parse(reviewRaw);
      if (reviewData.success || reviewData.paymentSubmitted) {
        router.replace("/account");
        return;
      }
      const payAmount = Number(reviewData.shortfall || shortfall || pending.amount);
      if (!payAmount || payAmount <= 0) {
        router.replace("/order/review");
        return;
      }
      setPendingOrder(pending);
      setReview(reviewData);
      setAmount(payAmount);
      setAllowed(true);
    } catch {
      router.replace("/order");
    }
  }, [router, shortfall]);

  useEffect(() => {
    catalogApi.get()
      .then((data) => setQrImageUrl(data.qrImageUrl || null))
      .catch(() => {});
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!pendingOrder) return;
    setSubmitting(true);

    try {
      await walletApi.request({
        amount,
        type: "order",
        pendingOrderData: pendingOrder,
      }, { silent: true });
      sessionStorage.removeItem("pd_pending_order");
      sessionStorage.removeItem("pd_order_review");
      await refresh();
      toast.success(`Payment submitted. Send screenshot to ${WHATSAPP_NUMBER}. Status will show Pending until admin approves.`);
      router.push("/account?tab=both");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready || !user || !allowed) {
    return <div className={`${ui.page} ${ui.container} ${ui.muted}`}>Loading...</div>;
  }

  const paymentNote = "Pay the amount below and send your payment screenshot to 7507543214 for admin approval.";

  return (
    <>
      <SiteHeader user={user} />
      <main className={ui.page}>
        <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
          <section className="grid gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-red-600">Wallet</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Make Payment</h1>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <WalletStat label="Customer" value={user.business || user.name || "—"} />
              <WalletStat label="Previous Outstanding" value={formatRupees(user.previousOutstanding || 0)} />
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 sm:px-5">
              <p className="text-sm font-bold uppercase tracking-wide text-slate-800">Short Amount</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{formatRupees(amount)}</p>
              <p className={`${ui.small} mt-2 text-slate-600`}>{paymentNote}</p>
            </div>

            {pendingOrder ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
                <p className="mb-2 font-semibold text-slate-800">Order Summary</p>
                <p className={ui.muted}>{pendingOrder.paperGsm} · {pendingOrder.size} · Qty {pendingOrder.quantity}</p>
                <p className="mt-1 font-semibold">Order total: {formatRupees(pendingOrder.amount || review?.orderAmount)}</p>
              </div>
            ) : null}

            <Link href="/order/review" className={`${btnClass("ghost")} w-fit`}>Back to Review</Link>
          </section>

          <form
            className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
            onSubmit={handleSubmit}
          >
            <div>
              <h2 className="text-xl font-bold text-slate-900">Short Amount Payment</h2>
              <p className={`${ui.small} ${ui.muted} mt-1`}>
                Scan the QR code and pay the short amount for your order.
              </p>
            </div>

            <label className={ui.field}>
              <span className={ui.label}>Amount</span>
              <input
                className={`${ui.input} bg-slate-50 font-semibold`}
                type="number"
                min="0"
                value={amount}
                readOnly
              />
            </label>

            <p className={`${ui.small} ${ui.muted}`}>
              This amount is fixed for your current order.
            </p>

            <div className="grid gap-3">
              <TapToRevealQr imageUrl={qrImageUrl} defaultRevealed />
              <p className={`${ui.small} text-center ${ui.muted}`}>Scan and pay with any UPI app.</p>
            </div>

            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-bold uppercase tracking-wide text-red-700">
              Please send screenshot of payment to {WHATSAPP_NUMBER} for confirmation
            </div>

            <button className={`${btnClass("amber")} w-full`} type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Payment Request"}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className={`${ui.page} ${ui.container} ${ui.muted}`}>Loading...</div>}>
      <PaymentContent />
    </Suspense>
  );
}
