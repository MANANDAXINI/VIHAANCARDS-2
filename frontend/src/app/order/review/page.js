"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import { useAuth, useAuthUser } from "@/context/AuthContext";
import { formatRupees } from "@/lib/api";
import { btnClass, ui } from "@/lib/ui";

function ReviewContent() {
  const router = useRouter();
  const { ready } = useAuth();
  const user = useAuthUser();
  const [review, setReview] = useState(null);
  const [pendingOrder, setPendingOrder] = useState(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (ready && !user) router.replace("/?auth=login");
    if (ready && user?.role === "ADMIN") router.replace("/admin");
  }, [ready, user, router]);

  useEffect(() => {
    try {
      const reviewRaw = sessionStorage.getItem("pd_order_review");
      const pendingRaw = sessionStorage.getItem("pd_pending_order");
      if (!reviewRaw) {
        router.replace("/order");
        return;
      }
      setReview(JSON.parse(reviewRaw));
      if (pendingRaw) setPendingOrder(JSON.parse(pendingRaw));
    } catch {
      router.replace("/order");
    }
  }, [router]);

  useEffect(() => {
    if (!review?.success || review?.paymentSubmitted) return undefined;

    setRedirecting(true);
    const timer = setTimeout(() => {
      sessionStorage.removeItem("pd_pending_order");
      sessionStorage.removeItem("pd_order_review");
      router.replace("/account?tab=both");
    }, 1500);

    return () => clearTimeout(timer);
  }, [review, router]);

  if (!ready || !user || !review) {
    return <div className={`${ui.page} ${ui.container} ${ui.muted}`}>Loading...</div>;
  }

  const isSuccess = Boolean(review.success);
  const isPaymentSubmitted = Boolean(review.paymentSubmitted);
  const order = review.order || pendingOrder;
  const needsPayment = !isSuccess && !isPaymentSubmitted;

  function goToPayment() {
    const payAmount = review.shortfall || review.orderAmount || pendingOrder?.amount;
    if (!payAmount) return;
    router.push(`/payment?shortfall=${payAmount}`);
  }

  return (
    <>
      <SiteHeader user={user} />
      <main className={ui.page}>
        <div className={ui.pageNarrow}>
          <h1 className={ui.h1}>
            {isPaymentSubmitted
              ? "Payment Submitted"
              : isSuccess
                ? "Order Confirmed"
                : "Review Your Order"}
          </h1>
          <p className={ui.muted}>
            {isPaymentSubmitted
              ? "Your payment is pending admin verification. Your order will appear after approval."
              : isSuccess
                ? redirecting
                  ? "Order placed successfully. Redirecting to your ledger..."
                  : "Your order was placed successfully."
                : "Review your order details. Proceed to payment and send payment screenshot to 7507543214 for admin approval."}
          </p>

          <div className={ui.card}>
            <h3 className={ui.h3}>Order Summary</h3>
            {order ? (
              <dl className="grid gap-3 text-sm">
                {[
                  ["Business", user.business],
                  ["Paper", order.paperGsm],
                  ["Size", order.size],
                  ["Quantity", order.quantity],
                  ["Printing Side", order.printingSide],
                  ...(order.cutting ? [["Cutting", order.cutting]] : []),
                  ...(order.finish ? [["Other Requirements", order.finish]] : []),
                  ["Artwork", order.artworkName || "Uploaded"],
                  ["Order Amount", formatRupees(order.amount || review.orderAmount)],
                  ...(needsPayment
                    ? [["Payment Required", formatRupees(review.shortfall || review.orderAmount)]]
                    : []),
                  ...(isSuccess && review.order?.orderNumber
                    ? [["Order #", review.order.orderNumber]]
                    : []),
                  ...(isPaymentSubmitted
                    ? [["Status", "Payment Pending — Awaiting Admin Approval"]]
                    : []),
                ].map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-4 border-b border-slate-100 pb-2 last:border-0">
                    <dt className={ui.muted}>{label}</dt>
                    <dd className="font-medium text-right">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className={ui.muted}>Order details not found.</p>
            )}

            <div className="flex flex-wrap gap-3">
              {isPaymentSubmitted ? (
                <>
                  <Link href="/account?tab=both" className={btnClass("primary")}>View Ledger</Link>
                  <Link href="/order" className={btnClass("ghost")}>Place Another Order</Link>
                </>
              ) : isSuccess ? (
                <>
                  <Link href="/account?tab=both" className={btnClass("primary")}>View Ledger Now</Link>
                  <Link href="/order" className={btnClass("ghost")}>Place Another Order</Link>
                </>
              ) : (
                <>
                  <button className={`${btnClass("primary")} w-full sm:w-auto`} type="button" onClick={goToPayment}>
                    <span className="sm:hidden">Pay &amp; Send SS</span>
                    <span className="hidden sm:inline">
                      {`Proceed to Payment — ${formatRupees(review.shortfall || review.orderAmount || pendingOrder?.amount)}`}
                    </span>
                  </button>
                  <Link href="/order" className={btnClass("ghost")}>Edit Order</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default function OrderReviewPage() {
  return (
    <Suspense fallback={<div className={`${ui.page} ${ui.container} ${ui.muted}`}>Loading...</div>}>
      <ReviewContent />
    </Suspense>
  );
}
