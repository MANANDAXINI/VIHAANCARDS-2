"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import OrderHistoryLedger from "@/components/OrderHistoryLedger";
import SiteHeader from "@/components/SiteHeader";
import { useAuth, useAuthUser } from "@/context/AuthContext";
import { mergeLedgerEntries, mergeOrderHistory } from "@/lib/order-display";
import { btnClass, ui } from "@/lib/ui";
import { walletApi } from "@/lib/api";

export default function AccountPage() {
  const router = useRouter();
  const { ready } = useAuth();
  const user = useAuthUser();
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ready && !user) router.replace("/?auth=login");
    if (ready && user?.role === "ADMIN") router.replace("/admin");
    if (ready && user?.profileNeedsPhone) router.replace("/profile");
  }, [ready, user, router]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    walletApi
      .ledger()
      .then((data) => {
        setLedgerEntries(mergeLedgerEntries(data.ledgerEntries || [], data.pendingPayments || []));
        setOrders(mergeOrderHistory(data.orders || [], data.pendingPayments || []));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const orderCount = useMemo(() => orders.length, [orders]);

  if (!ready || !user) {
    return <div className={`${ui.page} ${ui.container} ${ui.muted}`}>Loading...</div>;
  }

  return (
    <>
      <SiteHeader user={user} />
      <main className={ui.page}>
        <div className={ui.container}>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className={ui.h1}>Order History and Ledger</h1>
              <p className={ui.muted}>
                Your previous orders and payment ledger are listed here.
                {orderCount > 0 ? ` (${orderCount} order${orderCount === 1 ? "" : "s"})` : ""}
              </p>
            </div>
            <Link href="/" className={btnClass("primary")}>Back to Home</Link>
          </div>

          {loading ? (
            <p className={ui.muted}>Loading ledger...</p>
          ) : (
            <OrderHistoryLedger ledgerEntries={ledgerEntries} orders={orders} />
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/order" className={btnClass("primary")}>New Order</Link>
            <Link href="/payment" className={btnClass("ghost")}>Make Payment</Link>
          </div>
        </div>
      </main>
    </>
  );
}
