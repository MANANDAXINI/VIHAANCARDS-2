"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPhone } from "@/components/AdminCatalogPanel";
import { adminApi, formatRupees } from "@/lib/api";
import { formatLedgerTableDate } from "@/lib/order-display";
import { toast } from "@/lib/toast";
import { btnClass, ui } from "@/lib/ui";

function todayIst() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export default function AdminPaymentReceivedHistorySection({ showTitle = true }) {
  const [fromDate, setFromDate] = useState(todayIst);
  const [toDate, setToDate] = useState(todayIst);
  const [loadingList, setLoadingList] = useState(true);
  const [receiptData, setReceiptData] = useState(null);

  const loadReceipts = useCallback(() => {
    setLoadingList(true);
    adminApi
      .receipts({ fromDate: fromDate || undefined, toDate: toDate || undefined })
      .then(setReceiptData)
      .catch((error) => toast.error(error.message || "Could not load payment history."))
      .finally(() => setLoadingList(false));
  }, [fromDate, toDate]);

  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  function clearDates() {
    const today = todayIst();
    setFromDate(today);
    setToDate(today);
  }

  const todayTotal = Number(receiptData?.todayTotal || 0);
  const todayCount = Number(receiptData?.todayCount || 0);
  const rangeTotal = Number(receiptData?.rangeTotal || 0);
  const rangeCount = Number(receiptData?.rangeCount || 0);
  const receipts = receiptData?.receipts || [];

  return (
    <div className="grid gap-4">
      {showTitle ? (
        <div>
          <h2 className={ui.adminH1}>Payment Received History</h2>
          <p className={ui.muted}>
            Saari payment / receipt entries — date range se filter karke dekho (IST).
          </p>
        </div>
      ) : null}

      <section className={ui.adminCard}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {!showTitle ? <h3 className={ui.adminH3}>Payment Received History</h3> : null}
            <p className={`${showTitle ? "" : "mt-1"} ${ui.small} ${ui.muted}`}>
              Receipt, order payment approve, outstanding payment — sab yahan dikhenge.
            </p>
          </div>
          <button
            type="button"
            className={btnClass("ghost", true)}
            onClick={loadReceipts}
            disabled={loadingList}
          >
            {loadingList ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className={`${ui.statGrid} mt-4`}>
          <div className={ui.statCard}>
            <span className={`block ${ui.small} ${ui.muted}`}>Today&apos;s total</span>
            <strong className="text-lg font-semibold text-slate-900">{formatRupees(todayTotal)}</strong>
            <span className={`mt-1 block ${ui.small} ${ui.muted}`}>
              {todayCount} payment{todayCount === 1 ? "" : "s"} today
            </span>
          </div>
          <div className={ui.statCard}>
            <span className={`block ${ui.small} ${ui.muted}`}>Selected period total</span>
            <strong className="text-lg font-semibold text-slate-900">{formatRupees(rangeTotal)}</strong>
            <span className={`mt-1 block ${ui.small} ${ui.muted}`}>
              {rangeCount} payment{rangeCount === 1 ? "" : "s"} in range
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className={ui.field}>
            <span className={ui.label}>From Date</span>
            <input
              className={ui.input}
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </label>
          <label className={ui.field}>
            <span className={ui.label}>To Date</span>
            <input
              className={ui.input}
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </label>
          <button type="button" className={btnClass("secondary")} onClick={clearDates}>
            Today
          </button>
        </div>

        {loadingList ? (
          <p className={`mt-4 ${ui.muted}`}>Loading payment history...</p>
        ) : (
          <>
            <div className={`${ui.tableWrap} mt-4 hidden md:block`}>
              <table className={`${ui.table} min-w-[56rem]`}>
                <thead>
                  <tr>
                    <th className={ui.th}>Date</th>
                    <th className={ui.th}>Receipt No.</th>
                    <th className={ui.th}>Customer</th>
                    <th className={ui.th}>Phone</th>
                    <th className={ui.th}>Particulars</th>
                    <th className={ui.th}>Amount</th>
                    <th className={ui.th}>Outstanding After</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.length === 0 ? (
                    <tr>
                      <td className={ui.td} colSpan="7">
                        No payments received in this date range.
                      </td>
                    </tr>
                  ) : (
                    receipts.map((entry) => (
                      <tr key={entry.id}>
                        <td className={ui.td}>{formatLedgerTableDate(entry.entryDate)}</td>
                        <td className={ui.td}>{entry.receiptNumber || "—"}</td>
                        <td className={ui.td}>{entry.business || entry.customerName || "—"}</td>
                        <td className={ui.td}>{formatPhone(entry.phone) || "—"}</td>
                        <td className={ui.td}>{entry.label || "Payment Received"}</td>
                        <td className={`${ui.td} font-semibold`}>{formatRupees(entry.amount)}</td>
                        <td className={ui.td}>{formatRupees(entry.outstandingAfter)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <ul className={`${ui.mobileCardList} mt-4 md:hidden`}>
              {receipts.length === 0 ? (
                <li className={`${ui.mobileCard} ${ui.muted}`}>
                  No payments received in this date range.
                </li>
              ) : (
                receipts.map((entry) => (
                  <li key={`m-${entry.id}`} className={ui.mobileCard}>
                    <div className={ui.mobileCardRow}>
                      <strong>{entry.business || entry.customerName || "—"}</strong>
                      <strong>{formatRupees(entry.amount)}</strong>
                    </div>
                    <p className={ui.muted}>
                      {formatLedgerTableDate(entry.entryDate)}
                      {entry.receiptNumber ? ` · ${entry.receiptNumber}` : ""}
                    </p>
                    <p className={`${ui.small} text-slate-700`}>
                      {entry.label || "Payment Received"}
                    </p>
                    <div className={ui.mobileCardRow}>
                      <span className={ui.muted}>Phone</span>
                      <span>{formatPhone(entry.phone) || "—"}</span>
                    </div>
                    <div className={ui.mobileCardRow}>
                      <span className={ui.muted}>Outstanding after</span>
                      <span>{formatRupees(entry.outstandingAfter)}</span>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
