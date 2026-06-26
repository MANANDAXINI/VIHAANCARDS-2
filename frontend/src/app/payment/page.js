"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import MakePaymentPanel, { WHATSAPP_NUMBER } from "@/components/MakePaymentPanel";
import SiteHeader from "@/components/SiteHeader";
import { useAuth, useAuthUser } from "@/context/AuthContext";
import { catalogApi, formatRupees, walletApi } from "@/lib/api";
import { toast } from "@/lib/toast";
import { ui } from "@/lib/ui";

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

  return (
    <>
      <SiteHeader user={user} />
      <main className={ui.page}>
        <MakePaymentPanel
          user={user}
          amount={amount}
          amountLabel="Short Amount"
          paymentNote={`Pay the amount below and send your payment screenshot to ${WHATSAPP_NUMBER} for admin approval.`}
          amountHint="This amount is fixed for your current order."
          backHref="/order/review"
          backLabel="Back to Review"
          submitting={submitting}
          onSubmit={handleSubmit}
          qrImageUrl={qrImageUrl}
          orderSummary={(
            <>
              <p className={ui.muted}>{pendingOrder.paperGsm} · {pendingOrder.size} · Qty {pendingOrder.quantity}</p>
              <p className="mt-1 font-semibold">Order total: {formatRupees(pendingOrder.amount || review?.orderAmount)}</p>
            </>
          )}
        />
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
