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

  useEffect(() => {
    if (ready && !user) router.replace("/#login");
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

  if (!ready || !user || !review) {
    return <div className={`${ui.page} ${ui.container} ${ui.muted}`}>Loading...</div>;
  }

  const isSuccess = Boolean(review.success);
  const order = review.order || pendingOrder;

  function goToPayment() {
    if (!review.shortfall) return;
    router.push(`/payment?shortfall=${review.shortfall}`);
  }

  return (
    <>
      <SiteHeader user={user} />
      <main className={ui.page}>
        <div className={ui.pageNarrow}>
          <h1 className={ui.h1}>{isSuccess ? "Order Confirmed" : "Review Your Order"}</h1>
          <p className={ui.muted}>
            {isSuccess
              ? "Your order was placed successfully using available credit."
              : "Check details below. Payment is only for this order."}
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
                  ["Artwork", order.artworkName || "Uploaded"],
                  ["Order Amount", formatRupees(order.amount || review.orderAmount)],
                  ...(!isSuccess
                    ? [
                        ["Available Credit", formatRupees(review.availableCredit || 0)],
                        ["Payment Required", formatRupees(review.shortfall)],
                      ]
                    : []),
                  ...(isSuccess && review.order?.orderNumber
                    ? [["Order #", review.order.orderNumber]]
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
              {isSuccess ? (
                <>
                  <Link href="/account" className={btnClass("primary")}>View My Orders</Link>
                  <Link href="/order" className={btnClass("ghost")}>Place Another Order</Link>
                </>
              ) : (
                <>
                  <button className={btnClass("primary")} type="button" onClick={goToPayment}>
                    Proceed to Payment — {formatRupees(review.shortfall)}
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
