"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatPhone } from "@/components/AdminCatalogPanel";
import { adminApi, formatRupees } from "@/lib/api";
import { notifyCustomerReceipt } from "@/lib/dispatch-notify";
import { formatLedgerTableDate } from "@/lib/order-display";
import { toast } from "@/lib/toast";
import { btnClass, ui } from "@/lib/ui";

function todayIst() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export default function AdminReceivePaymentSection({ accounts = [], onRefresh }) {
  const [selectedId, setSelectedId] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const [fromDate, setFromDate] = useState(todayIst);
  const [toDate, setToDate] = useState(todayIst);
  const [loadingList, setLoadingList] = useState(true);
  const [receiptData, setReceiptData] = useState(null);

  const customers = useMemo(
    () => accounts
      .filter((account) => account.status === "APPROVED"
        && (account.role === "CUSTOMER" || account.role === "BOTH"))
      .sort((a, b) => String(a.business || a.name).localeCompare(String(b.business || b.name))),
    [accounts]
  );

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedId) || null,
    [customers, selectedId]
  );

  useEffect(() => {
    if (!selectedId && customers.length > 0) {
      setSelectedId(customers[0].id);
    }
  }, [customers, selectedId]);

  const loadReceipts = useCallback(() => {
    setLoadingList(true);
    adminApi
      .receipts({ fromDate: fromDate || undefined, toDate: toDate || undefined })
      .then(setReceiptData)
      .catch((error) => toast.error(error.message || "Could not load receipts."))
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

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedId) {
      toast.error("Select a customer.");
      return;
    }

    const paymentAmount = Number(amount);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }

    setSaving(true);
    try {
      const result = await adminApi.receivePayment(
        selectedId,
        { amount: paymentAmount, label: "Payment Received" },
        { silent: true }
      );
      setAmount("");

      const remaining = Number(
        result?.account?.previousOutstanding
          ?? result?.entry?.outstandingAfter
          ?? 0
      );
      const receiptNumber = result?.entry?.receiptNumber || "";
      const phone = selectedCustomer?.phone || result?.account?.phone || "";
      const { opened } = notifyCustomerReceipt({
        phone,
        business: selectedCustomer?.business || result?.account?.business,
        customerName: selectedCustomer?.name || result?.account?.name,
        amount: paymentAmount,
        receiptNumber,
        remainingOutstanding: remaining,
      });

      toast.success(
        opened
          ? "Receipt saved — WhatsApp opened with remaining outstanding."
          : "Receipt saved."
      );
      await onRefresh?.();
      loadReceipts();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  const todayTotal = Number(receiptData?.todayTotal || 0);
  const todayCount = Number(receiptData?.todayCount || 0);
  const rangeTotal = Number(receiptData?.rangeTotal || 0);
  const rangeCount = Number(receiptData?.rangeCount || 0);
  const receipts = receiptData?.receipts || [];

  return (
    <div className="grid gap-4">
      <section className={ui.adminCard}>
        <h2 className={`${ui.adminH3} border-b border-slate-200 px-4 py-3`}>Receipt</h2>
        <form className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-end" onSubmit={handleSubmit}>
          <label className={`${ui.field} min-w-[9rem] flex-1 sm:max-w-[12rem]`}>
            <span className={ui.label}>Amount</span>
            <input
              className={ui.input}
              type="number"
              min="1"
              step="1"
              placeholder="Rs."
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>
          <label className={`${ui.field} min-w-[12rem] flex-[2]`}>
            <span className={ui.label}>Customer</span>
            <select
              className={ui.input}
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              {customers.length === 0 ? (
                <option value="">No customer</option>
              ) : (
                customers.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.business || account.name} — {formatPhone(account.phone)}
                  </option>
                ))
              )}
            </select>
          </label>
          <button
            type="submit"
            className={`${btnClass("amber")} w-full sm:w-auto`}
            disabled={saving || !selectedId}
          >
            {saving ? "..." : "Save Receipt"}
          </button>
        </form>
        {selectedCustomer ? (
          <p className={`border-t border-slate-100 px-4 py-3 ${ui.small} ${ui.muted}`}>
            Current outstanding for{" "}
            <strong className="text-slate-800">{selectedCustomer.business || selectedCustomer.name}</strong>
            :{" "}
            <strong className="text-slate-900">
              {formatRupees(selectedCustomer.previousOutstanding || 0)}
            </strong>
          </p>
        ) : null}
      </section>

      <section className={ui.adminCard}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className={ui.adminH3}>Day Receipts</h3>
            <p className={`mt-1 ${ui.small} ${ui.muted}`}>
              Today&apos;s total and past receipts by date range (IST).
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
            <span className={`block ${ui.small} ${ui.muted}`}>Today&apos;s total receipt</span>
            <strong className="text-lg font-semibold text-slate-900">{formatRupees(todayTotal)}</strong>
            <span className={`mt-1 block ${ui.small} ${ui.muted}`}>
              {todayCount} receipt{todayCount === 1 ? "" : "s"} today
            </span>
          </div>
          <div className={ui.statCard}>
            <span className={`block ${ui.small} ${ui.muted}`}>Selected period total</span>
            <strong className="text-lg font-semibold text-slate-900">{formatRupees(rangeTotal)}</strong>
            <span className={`mt-1 block ${ui.small} ${ui.muted}`}>
              {rangeCount} receipt{rangeCount === 1 ? "" : "s"} in range
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
          <p className={`mt-4 ${ui.muted}`}>Loading receipts...</p>
        ) : (
          <>
            <div className={`${ui.tableWrap} mt-4 hidden md:block`}>
              <table className={ui.table}>
                <thead>
                  <tr>
                    <th className={ui.th}>Date</th>
                    <th className={ui.th}>Receipt No.</th>
                    <th className={ui.th}>Customer</th>
                    <th className={ui.th}>Phone</th>
                    <th className={ui.th}>Amount</th>
                    <th className={ui.th}>Outstanding After</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.length === 0 ? (
                    <tr>
                      <td className={ui.td} colSpan="6">
                        No receipts in this date range.
                      </td>
                    </tr>
                  ) : (
                    receipts.map((entry) => (
                      <tr key={entry.id}>
                        <td className={ui.td}>{formatLedgerTableDate(entry.entryDate)}</td>
                        <td className={ui.td}>{entry.receiptNumber || "—"}</td>
                        <td className={ui.td}>{entry.business || entry.customerName || "—"}</td>
                        <td className={ui.td}>{formatPhone(entry.phone) || "—"}</td>
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
                <li className={`${ui.mobileCard} ${ui.muted}`}>No receipts in this date range.</li>
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
