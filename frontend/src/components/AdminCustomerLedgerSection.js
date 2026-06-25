"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPhone } from "@/components/AdminCatalogPanel";
import { adminApi, formatRupees } from "@/lib/api";
import {
  formatLedgerBalance,
  formatLedgerCredit,
  formatLedgerDebit,
  formatLedgerTableDate,
} from "@/lib/order-display";
import { toast } from "@/lib/toast";
import { btnClass, ui } from "@/lib/ui";

function customerLabel(account) {
  if (!account) return "";
  const city = account.address?.trim();
  const phone = formatPhone(account.phone);
  return [account.business, city, phone].filter(Boolean).join(" ");
}

function matchesCustomerSearch(account, query) {
  if (!query.trim()) return true;
  const haystack = [
    account.name,
    account.business,
    account.address,
    account.phone,
    formatPhone(account.phone),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

function LedgerSummaryCard({ label, value }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="text-[0.7rem] font-bold uppercase tracking-wide text-slate-600">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}

export default function AdminCustomerLedgerSection({ accounts = [] }) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [summary, setSummary] = useState({
    totalJobOutstanding: 0,
    totalPaymentReceived: 0,
    finalBalance: 0,
  });

  const approvedCustomers = useMemo(
    () => accounts.filter((a) => String(a.status || "").toUpperCase() === "APPROVED"),
    [accounts]
  );

  const filteredCustomers = useMemo(
    () => approvedCustomers.filter((a) => matchesCustomerSearch(a, search)),
    [approvedCustomers, search]
  );

  useEffect(() => {
    if (!selectedId && filteredCustomers.length > 0) {
      setSelectedId(filteredCustomers[0].id);
      return;
    }
    if (selectedId && !filteredCustomers.some((a) => a.id === selectedId)) {
      setSelectedId(filteredCustomers[0]?.id || "");
    }
  }, [filteredCustomers, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setLedgerEntries([]);
      setSummary({ totalJobOutstanding: 0, totalPaymentReceived: 0, finalBalance: 0 });
      return;
    }

    setLoading(true);
    adminApi
      .customerLedger(selectedId, { fromDate: fromDate || undefined, toDate: toDate || undefined })
      .then((data) => {
        setLedgerEntries(data.ledgerEntries || []);
        setSummary(data.summary || {
          totalJobOutstanding: 0,
          totalPaymentReceived: 0,
          finalBalance: 0,
        });
      })
      .catch((error) => {
        toast.error(error.message);
        setLedgerEntries([]);
      })
      .finally(() => setLoading(false));
  }, [selectedId, fromDate, toDate]);

  const selectedCustomer = filteredCustomers.find((a) => a.id === selectedId);

  function clearDates() {
    setFromDate("");
    setToDate("");
  }

  return (
    <div className="grid gap-4">
      <div>
        <h2 className={ui.adminH1}>Customer Ledger</h2>
        <p className={ui.muted}>
          View and search any approved customer&apos;s payment ledger from here.
        </p>
      </div>

      <section className={ui.adminCard}>
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="grid gap-4 md:grid-cols-2">
            <label className={ui.field}>
              <span className={ui.label}>Customer Search Name + City</span>
              <input
                className={ui.input}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by customer name, city, or mobile"
              />
            </label>
            <label className={ui.field}>
              <span className={ui.label}>Customer Select</span>
              <select
                className={ui.input}
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {filteredCustomers.length === 0 ? (
                  <option value="">No customer found</option>
                ) : (
                  filteredCustomers.map((account) => (
                    <option key={account.id} value={account.id}>
                      {customerLabel(account)}
                    </option>
                  ))
                )}
              </select>
              <span className={`${ui.small} ${ui.muted}`}>
                {filteredCustomers.length} customer{filteredCustomers.length === 1 ? "" : "s"} found
              </span>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
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
              Clear Date
            </button>
          </div>
        </div>

        {selectedCustomer ? (
          <p className={`${ui.small} ${ui.muted}`}>
            Showing ledger for <strong>{selectedCustomer.business}</strong>
            {selectedCustomer.address ? ` · ${selectedCustomer.address}` : ""}
            {selectedCustomer.phone ? ` · ${formatPhone(selectedCustomer.phone)}` : ""}
          </p>
        ) : null}
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <LedgerSummaryCard
          label="Total Job / Outstanding"
          value={formatRupees(summary.totalJobOutstanding)}
        />
        <LedgerSummaryCard
          label="Total Payment Received"
          value={formatRupees(summary.totalPaymentReceived)}
        />
        <LedgerSummaryCard
          label="Final Balance"
          value={formatRupees(summary.finalBalance)}
        />
      </div>

      <section className={ui.cardFlat}>
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th className={ui.th}>SR NO.</th>
                <th className={ui.th}>DATE</th>
                <th className={ui.th}>NARRATION</th>
                <th className={ui.th}>JOB / OUTSTANDING AMOUNT</th>
                <th className={ui.th}>PAYMENT RECEIVED</th>
                <th className={ui.th}>OUTSTANDING BALANCE</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className={ui.td} colSpan="6">Loading ledger...</td></tr>
              ) : ledgerEntries.length === 0 ? (
                <tr><td className={ui.td} colSpan="6">No ledger entries for this customer.</td></tr>
              ) : (
                ledgerEntries.map((entry, index) => (
                  <tr key={entry.id} className={index % 2 === 1 ? "bg-slate-50/80" : ""}>
                    <td className={ui.td}>{index + 1}</td>
                    <td className={ui.td}>{formatLedgerTableDate(entry.entryDate)}</td>
                    <td className={ui.td}>{entry.label}</td>
                    <td className={ui.td}>{formatLedgerDebit(entry)}</td>
                    <td className={ui.td}>{formatLedgerCredit(entry)}</td>
                    <td className={ui.td}>{formatLedgerBalance(entry)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
