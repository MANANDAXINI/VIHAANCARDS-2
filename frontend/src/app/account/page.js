"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import OrderHistoryLedger from "@/components/OrderHistoryLedger";
import SiteHeader from "@/components/SiteHeader";
import { useAuth, useAuthUser } from "@/context/AuthContext";
import { mergeLedgerEntries, mergeOrderHistory } from "@/lib/order-display";
import { btnClass, tabClass, ui } from "@/lib/ui";
import { walletApi } from "@/lib/api";

const ACCOUNT_TABS = [
  { id: "both", label: "Ledger & Orders" },
  { id: "ledger", label: "Payment Ledger" },
  { id: "orders", label: "Order History" },
];

function AccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready } = useAuth();
  const user = useAuthUser();
  const [activeTab, setActiveTab] = useState("both");
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "ledger" || tab === "orders" || tab === "both") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (ready && !user) router.replace("/?auth=login");
    if (ready && user?.role === "ADMIN") router.replace("/admin");
    if (ready && user?.profileNeedsPhone) router.replace("/profile");
  }, [ready, user, router]);

  const loadAccountData = useCallback(() => {
    if (!user) return;
    setLoading(true);
    walletApi
      .ledger()
      .then((data) => {
        const account = data.account || user;
        setLedgerEntries(mergeLedgerEntries(data.ledgerEntries || [], data.pendingPayments || [], account));
        setOrders(mergeOrderHistory(data.orders || [], data.pendingPayments || []));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    loadAccountData();
  }, [loadAccountData]);

  useEffect(() => {
    const onFocus = () => loadAccountData();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadAccountData]);

  const orderCount = useMemo(() => orders.length, [orders]);
  const ledgerCount = useMemo(() => ledgerEntries.length, [ledgerEntries]);
  const pendingOrderCount = useMemo(
    () => orders.filter((order) => order.pendingApproval || order.pendingPayment).length,
    [orders]
  );

  const pageTitle = activeTab === "ledger"
    ? "Payment Ledger"
    : activeTab === "orders"
      ? "Order History"
      : "Account Ledger";
  const pageDescription =
    activeTab === "ledger"
      ? `Your payment and outstanding balance history.${ledgerCount > 0 ? ` (${ledgerCount} entries)` : ""}`
      : activeTab === "orders"
        ? `Track your orders, artwork, and job status.${orderCount > 0 ? ` (${orderCount} order${orderCount === 1 ? "" : "s"})` : ""}`
        : `Payment ledger and order history.${pendingOrderCount > 0 ? ` ${pendingOrderCount} order${pendingOrderCount === 1 ? "" : "s"} awaiting admin approval.` : ""}`;

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
              <h1 className={ui.h1}>{pageTitle}</h1>
              <p className={ui.muted}>{pageDescription}</p>
            </div>
            <Link href="/" className={btnClass("primary")}>Back to Home</Link>
          </div>

          <div className={`${ui.navTabsScroll} mb-4 w-full`}>
            {ACCOUNT_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={tabClass(activeTab === tab.id)}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <p className={ui.muted}>Loading...</p>
          ) : (
            <OrderHistoryLedger
              ledgerEntries={ledgerEntries}
              orders={orders}
              activeTab={activeTab}
            />
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/order" className={btnClass("primary")}>New Order</Link>
          </div>
        </div>
      </main>
    </>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div className={`${ui.page} ${ui.container} ${ui.muted}`}>Loading...</div>}>
      <AccountContent />
    </Suspense>
  );
}
