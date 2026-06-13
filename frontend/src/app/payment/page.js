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

function PaymentContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh, ready } = useAuth();
  const user = useAuthUser();
  const [submitting, setSubmitting] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState(null);
  const [pendingOrder, setPendingOrder] = useState(null);
  const [amount, setAmount] = useState(0);
  const [allowed, setAllowed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const shortfall = Number(params.get("shortfall") || 0);

  useEffect(() => {
    if (ready && !user) router.replace("/#login");
  }, [ready, user, router]);

  useEffect(() => {
    try {
      const pendingRaw = sessionStorage.getItem("pd_pending_order");
      const reviewRaw = sessionStorage.getItem("pd_order_review");
      if (!pendingRaw || !reviewRaw) {
        router.replace("/order");
        return;
      }
      const pending = JSON.parse(pendingRaw);
      const review = JSON.parse(reviewRaw);
      if (review.success) {
        router.replace("/order");
        return;
      }
      const payAmount = Number(review.shortfall || shortfall || pending.amount);
      if (!payAmount || payAmount <= 0) {
        router.replace("/order/review");
        return;
      }
      setPendingOrder(pending);
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
      setSubmitted(true);
      toast.success("Payment submitted for this order. Send screenshot to 7507543214. Admin will confirm.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready || !user || !allowed) {
    return <div className={`${ui.page} ${ui.container} ${ui.muted}`}>Loading...</div>;
  }

  return (
    <>
      <SiteHeader user={user} />
      <main className={ui.page}>
        <div className={ui.pageNarrow}>
          <h1 className={ui.h1}>Order Payment</h1>
          <p className={ui.muted}>Pay only for your placed order. Amount is fixed from order review.</p>

          <div className={ui.card}>
            <div className="grid gap-2 text-sm">
              <div className="flex items-baseline justify-between gap-4">
                <span className={ui.muted}>Paper</span>
                <strong>{pendingOrder?.paperGsm}</strong>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className={ui.muted}>Size / Qty</span>
                <strong>{pendingOrder?.size} · {pendingOrder?.quantity}</strong>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className={ui.muted}>Amount to pay</span>
                <strong>{formatRupees(amount)}</strong>
              </div>
            </div>
          </div>

          <form className={ui.card} onSubmit={handleSubmit}>
            <TapToRevealQr imageUrl={qrImageUrl} />
            <p>Paying: <strong>{formatRupees(amount)}</strong></p>
            <button className={btnClass("primary")} type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Payment for Order"}
            </button>
            {submitted && (
              <Link href="/account" className={btnClass("ghost")}>View My Orders</Link>
            )}
            <Link href="/order/review" className={btnClass("ghost")}>Back to Review</Link>
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
