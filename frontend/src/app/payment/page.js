"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import MakePaymentPanel, { WHATSAPP_NUMBER } from "@/components/MakePaymentPanel";
import SiteHeader from "@/components/SiteHeader";
import { useAuth, useAuthUser } from "@/context/AuthContext";
import { catalogApi, walletApi } from "@/lib/api";
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
    if (amount <= 0) {
      toast.error("Enter a valid payment amount.");
      return;
    }
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
      toast.success(
        `Payment request submitted. Send screenshot to ${WHATSAPP_NUMBER}. Admin Payment Requests mein dikhega.`
      );
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
          amount={amount}
          amountEditable
          onAmountChange={setAmount}
          submitting={submitting}
          onSubmit={handleSubmit}
          qrImageUrl={qrImageUrl}
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
