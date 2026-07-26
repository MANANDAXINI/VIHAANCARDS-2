"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi, formatRupees } from "@/lib/api";
import { downloadOrderBillsBulk } from "@/lib/order-bill";
import { formatLedgerTableDate, formatOrderDisplayNumber } from "@/lib/order-display";
import { toast } from "@/lib/toast";
import { btnClass, ui } from "@/lib/ui";

function todayIst() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export default function AdminDownloadBillsSection() {
  const [fromDate, setFromDate] = useState(todayIst);
  const [toDate, setToDate] = useState(todayIst);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [bills, setBills] = useState([]);
  const [meta, setMeta] = useState(null);

  const loadBills = useCallback(() => {
    if (!fromDate || !toDate) {
      toast.error("Select from and to dates.");
      return;
    }
    if (fromDate > toDate) {
      toast.error("From date must be on or before To date.");
      return;
    }
    setLoading(true);
    adminApi
      .bills({ fromDate, toDate })
      .then((data) => {
        setBills(data.bills || []);
        setMeta({ fromDate: data.fromDate, toDate: data.toDate, count: data.count });
      })
      .catch((error) => toast.error(error.message || "Could not load bills."))
      .finally(() => setLoading(false));
  }, [fromDate, toDate]);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  function handleDownload() {
    if (!bills.length) {
      toast.error("No dispatched bills in this date range.");
      return;
    }
    setDownloading(true);
    try {
      downloadOrderBillsBulk(
        bills.map((row) => ({
          order: row.order,
          account: row.account,
          hsnCode: row.hsnCode,
          gstRate: row.gstRate,
        }))
      );
      toast.success(`Opening ${bills.length} bill(s) — use Save as PDF / Print.`);
    } catch (error) {
      toast.error(error.message || "Could not generate bills.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="grid gap-4">
      <section className={ui.adminCard}>
        <h2 className={ui.adminH1}>Download Bills</h2>
        <p className={`mt-1 ${ui.muted}`}>
          Download tax invoices for all <strong>Despatched</strong> orders between two dates
          (by dispatch date, IST).
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
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
          <button
            type="button"
            className={btnClass("secondary")}
            onClick={loadBills}
            disabled={loading}
          >
            {loading ? "Loading..." : "Show Bills"}
          </button>
          <button
            type="button"
            className={btnClass("amber")}
            onClick={handleDownload}
            disabled={downloading || loading || bills.length === 0}
          >
            {downloading ? "Preparing..." : "Download Bills"}
          </button>
        </div>

        {meta ? (
          <p className={`mt-3 ${ui.small} ${ui.muted}`}>
            {meta.fromDate} → {meta.toDate} ·{" "}
            <strong className="text-slate-800">{meta.count}</strong> bill
            {meta.count === 1 ? "" : "s"}
          </p>
        ) : null}
      </section>

      <section className={ui.adminCard}>
        <h3 className={ui.adminH3}>Bills in range</h3>
        {loading ? (
          <p className={`mt-3 ${ui.muted}`}>Loading...</p>
        ) : (
          <div className={`${ui.tableWrap} mt-3`}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th className={ui.th}>Invoice / Order</th>
                  <th className={ui.th}>Dispatch date</th>
                  <th className={ui.th}>Customer</th>
                  <th className={ui.th}>HSN</th>
                  <th className={ui.th}>GST</th>
                  <th className={ui.th}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {bills.length === 0 ? (
                  <tr>
                    <td className={ui.td} colSpan="6">
                      No dispatched orders in this date range.
                    </td>
                  </tr>
                ) : (
                  bills.map((row) => (
                    <tr key={row.order.id}>
                      <td className={ui.td}>{formatOrderDisplayNumber(row.order)}</td>
                      <td className={ui.td}>
                        {formatLedgerTableDate(row.order.dispatchDate || row.order.updatedAt)}
                      </td>
                      <td className={ui.td}>
                        {row.account?.business || row.account?.name || "—"}
                      </td>
                      <td className={ui.td}>{row.hsnCode || "—"}</td>
                      <td className={ui.td}>{row.gstRate}%</td>
                      <td className={`${ui.td} font-semibold`}>
                        {formatRupees(row.order.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
