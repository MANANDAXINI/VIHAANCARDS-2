"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPhone } from "@/components/AdminCatalogPanel";
import OrderHistoryLedger from "@/components/OrderHistoryLedger";
import { adminApi, formatRupees } from "@/lib/api";
import { mergeLedgerEntries, mergeOrderHistory, formatLedgerTableDate } from "@/lib/order-display";
import { downloadLedgerPdf } from "@/lib/ledger-pdf";
import { toast } from "@/lib/toast";
import { btnClass, tabClass, ui } from "@/lib/ui";

const DETAIL_TABS = [
  { id: "both", label: "Ledger & Orders" },
  { id: "ledger", label: "Ledger" },
  { id: "orders", label: "Order History" },
  { id: "payments", label: "Payment Requests" },
];

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-slate-900 sm:text-base">{value}</p>
    </div>
  );
}

function formatRequestType(type) {
  const value = String(type || "").toUpperCase();
  if (value === "ORDER_PAYMENT") return "Order Payment";
  if (value === "OUTSTANDING_PAYMENT") return "Outstanding Payment";
  if (value === "WALLET_TOPUP") return "Wallet Top-up";
  return type || "—";
}

function formatRequestStatus(status) {
  const value = String(status || "").toUpperCase();
  if (value === "PENDING") return "Pending";
  if (value === "APPROVED") return "Approved";
  if (value === "REJECTED") return "Rejected";
  return status || "—";
}

function PaymentRequestsTable({ requests = [] }) {
  return (
    <section className={ui.cardFlat}>
      <h3 className={`${ui.h3} border-b border-slate-200 px-4 py-3`}>Payment Requests</h3>
      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th className={ui.th}>Date</th>
              <th className={ui.th}>Type</th>
              <th className={ui.th}>Amount</th>
              <th className={ui.th}>Status</th>
              <th className={ui.th}>Note</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr><td className={ui.td} colSpan="5">No payment requests for this customer.</td></tr>
            ) : (
              requests.map((request) => (
                <tr key={request.id} className={request.status === "PENDING" ? "bg-amber-50/60" : ""}>
                  <td className={ui.td}>{formatLedgerTableDate(request.createdAt)}</td>
                  <td className={ui.td}>{formatRequestType(request.type)}</td>
                  <td className={`${ui.td} font-semibold`}>{formatRupees(request.amount)}</td>
                  <td className={ui.td}>{formatRequestStatus(request.status)}</td>
                  <td className={ui.td}>{request.note || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function AdminOutstandingCustomerDetails({ open, accountId, accountName, onClose }) {
  const [activeTab, setActiveTab] = useState("both");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !accountId) {
      setData(null);
      return;
    }

    setLoading(true);
    setActiveTab("both");
    adminApi
      .customerAccountDetails(accountId)
      .then(setData)
      .catch((error) => {
        toast.error(error.message || "Could not load customer details.");
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [open, accountId]);

  const account = data?.account;
  const ledgerEntries = useMemo(
    () => mergeLedgerEntries(data?.ledgerEntries || [], data?.pendingPayments || [], account),
    [data, account]
  );
  const orders = useMemo(
    () => mergeOrderHistory(data?.orders || [], data?.pendingPayments || []),
    [data]
  );
  const summary = data?.summary || {};

  function handleDownloadPdf() {
    try {
      downloadLedgerPdf({ account, summary, ledgerEntries });
    } catch (error) {
      toast.error(error.message || "Could not generate ledger PDF.");
    }
  }

  if (!open) return null;

  const title = account?.business || accountName || "Customer";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        aria-label="Close customer details"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="outstanding-details-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-red-600">Customer Details</p>
            <h2 id="outstanding-details-title" className="mt-1 truncate text-lg font-bold text-slate-900 sm:text-xl">
              {title}
            </h2>
            <p className={`${ui.small} ${ui.muted}`}>
              {account?.address ? `${account.address} · ` : ""}
              {account?.phone ? formatPhone(account.phone) : "—"}
            </p>
          </div>
          <button
            type="button"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {loading ? (
            <p className={ui.muted}>Loading customer ledger, orders, and payments...</p>
          ) : !data ? (
            <p className={ui.muted}>Could not load customer details.</p>
          ) : (
            <div className="grid gap-4">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <SummaryCard label="Credit Limit" value={formatRupees(account?.creditLimit)} />
                <SummaryCard label="Used Credit" value={formatRupees(account?.usedCredit)} />
                <SummaryCard label="Available Credit" value={formatRupees(account?.availableCredit)} />
                <SummaryCard label="Current Outstanding" value={formatRupees(summary.previousOutstanding)} />
                <SummaryCard label="Pending Orders" value={formatRupees(summary.pendingOrderAmount)} />
                <SummaryCard label="Receivable Balance" value={formatRupees(summary.receivableBalance)} />
                <SummaryCard label="Total Billed (All Jobs)" value={formatRupees(summary.totalBilled)} />
                <SummaryCard label="Total Payments Received" value={formatRupees(summary.totalReceived)} />
              </div>

              <div className={`${ui.navTabsScroll} w-full`}>
                {DETAIL_TABS.map((tab) => (
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

              {activeTab === "payments" ? (
                <PaymentRequestsTable requests={data.walletRequests || []} />
              ) : (
                <OrderHistoryLedger
                  ledgerEntries={ledgerEntries}
                  orders={orders}
                  activeTab={activeTab}
                  hasCreditLimit={Number(account?.creditLimit || 0) > 0}
                />
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3 sm:px-6">
          <button
            type="button"
            className={btnClass("primary")}
            onClick={handleDownloadPdf}
            disabled={loading || !data}
          >
            Download Ledger PDF
          </button>
          <button type="button" className={btnClass("secondary")} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
