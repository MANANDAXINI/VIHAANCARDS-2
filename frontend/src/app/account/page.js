"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import OrderHistoryLedger from "@/components/OrderHistoryLedger";
import SiteHeader from "@/components/SiteHeader";
import { AdminPagination, AdminSearchBar } from "@/components/AdminTableTools";
import { useAuth, useAuthUser } from "@/context/AuthContext";
import { filterItems, paginateItems } from "@/lib/admin-table";
import { mergeLedgerEntries, mergeOrderHistory } from "@/lib/order-display";
import { downloadLedgerPdf } from "@/lib/ledger-pdf";
import { toast } from "@/lib/toast";
import { btnClass, tabClass, ui } from "@/lib/ui";
import { walletApi } from "@/lib/api";

const ACCOUNT_TABS = [
  { id: "orders", label: "Order History" },
  { id: "payments", label: "Payments" },
  { id: "ledger", label: "Payment Ledger" },
];

const ORDER_SEARCH_KEYS = [
  "orderNumber",
  "product",
  "paperGsm",
  "size",
  "quantity",
  "status",
  "amount",
  "lrNumber",
  "transportDetails",
];
const LEDGER_SEARCH_KEYS = ["label"];

function AccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready } = useAuth();
  const user = useAuthUser();
  const [activeTab, setActiveTab] = useState("orders");
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [orders, setOrders] = useState([]);
  const [account, setAccount] = useState(null);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "ledger" || tab === "orders" || tab === "payments") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    setSearch("");
    setPage(1);
  }, [activeTab]);

  useEffect(() => {
    setPage(1);
  }, [search]);

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
        const acct = data.account || user;
        setAccount(acct);
        setSummary(data.summary || {});
        setLedgerEntries(mergeLedgerEntries(data.ledgerEntries || [], data.pendingPayments || [], acct));
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

  const paymentsAll = useMemo(
    () => ledgerEntries.filter((entry) => Number(entry.credit || 0) > 0),
    [ledgerEntries]
  );

  const activeData = activeTab === "orders"
    ? orders
    : activeTab === "payments"
      ? paymentsAll
      : ledgerEntries;
  const searchKeys = activeTab === "orders" ? ORDER_SEARCH_KEYS : LEDGER_SEARCH_KEYS;

  const filtered = useMemo(
    () => filterItems(activeData, search, searchKeys),
    [activeData, search, searchKeys]
  );
  const paged = useMemo(() => paginateItems(filtered, page), [filtered, page]);
  const pageOffset = (paged.page - 1) * paged.pageSize;

  const searchPlaceholder = activeTab === "orders"
    ? "Search orders..."
    : activeTab === "payments"
      ? "Search payments..."
      : "Search ledger...";

  const pageTitle = activeTab === "payments"
    ? "Payments"
    : activeTab === "ledger"
    ? "Payment Ledger"
    : "Order History";
  const pageDescription =
    activeTab === "payments"
      ? "Payments recorded on your account."
      : activeTab === "ledger"
      ? `Your payment and outstanding balance history.${ledgerCount > 0 ? ` (${ledgerCount} entries)` : ""}`
      : `Track your orders, artwork, and job status.${orderCount > 0 ? ` (${orderCount} order${orderCount === 1 ? "" : "s"})` : ""}`;

  function handleDownloadPdf() {
    try {
      downloadLedgerPdf({ account: account || user, summary, ledgerEntries });
    } catch (error) {
      toast.error(error.message || "Could not generate ledger PDF.");
    }
  }

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
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={btnClass("secondary")}
                onClick={handleDownloadPdf}
                disabled={loading}
              >
                Download Ledger PDF
              </button>
              <Link href="/" className={btnClass("primary")}>Back to Home</Link>
            </div>
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
            <div className="grid gap-3">
              <div className="w-full sm:max-w-xs">
                <AdminSearchBar value={search} onChange={setSearch} placeholder={searchPlaceholder} />
              </div>

              {activeTab === "orders" ? (
                <OrderHistoryLedger orders={paged.items} activeTab="orders" />
              ) : activeTab === "payments" ? (
                <OrderHistoryLedger ledgerEntries={paged.items} activeTab="payments" />
              ) : (
                <OrderHistoryLedger ledgerEntries={paged.items} activeTab="ledger" offset={pageOffset} />
              )}

              <AdminPagination
                page={paged.page}
                totalPages={paged.totalPages}
                total={paged.total}
                onPageChange={setPage}
              />
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/order" className={btnClass("primary")}>New Order</Link>
            <Link href="/payment/outstanding" className={btnClass("amber")}>Make Payment</Link>
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
