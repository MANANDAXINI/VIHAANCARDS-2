"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatPhone } from "@/components/AdminCatalogPanel";
import { adminApi, formatRupees } from "@/lib/api";
import {
  formatLedgerBalance,
  formatLedgerCredit,
  formatLedgerDebit,
  formatLedgerNarration,
  formatLedgerTableDate,
} from "@/lib/order-display";
import { toast } from "@/lib/toast";
import { btnClass, ui } from "@/lib/ui";

const EMPTY_SUMMARY = {
  totalBilled: 0,
  totalReceived: 0,
  currentOutstanding: 0,
  receivableBalance: 0,
  previousOutstanding: 0,
  pendingOrderAmount: 0,
};

function toDateInputValue(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

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

export default function AdminCustomerLedgerSection({ accounts = [], onDataChange }) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);

  const [showChargeForm, setShowChargeForm] = useState(false);
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeLabel, setChargeLabel] = useState("");
  const [chargeDate, setChargeDate] = useState("");
  const [savingCharge, setSavingCharge] = useState(false);

  const [editingId, setEditingId] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editDebit, setEditDebit] = useState("");
  const [editCredit, setEditCredit] = useState("");
  const [rowBusy, setRowBusy] = useState("");

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

  const loadLedger = useCallback(() => {
    if (!selectedId) {
      setLedgerEntries([]);
      setSummary(EMPTY_SUMMARY);
      return;
    }

    setLoading(true);
    adminApi
      .customerLedger(selectedId, { fromDate: fromDate || undefined, toDate: toDate || undefined })
      .then((data) => {
        setLedgerEntries(data.ledgerEntries || []);
        setSummary(data.summary || EMPTY_SUMMARY);
      })
      .catch((error) => {
        toast.error(error.message);
        setLedgerEntries([]);
      })
      .finally(() => setLoading(false));
  }, [selectedId, fromDate, toDate]);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  const selectedCustomer = filteredCustomers.find((a) => a.id === selectedId);

  function clearDates() {
    setFromDate("");
    setToDate("");
  }

  async function handleAddCharge() {
    const amount = Number(chargeAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid charge amount.");
      return;
    }
    setSavingCharge(true);
    try {
      await adminApi.addOtherCharge(
        selectedId,
        { amount, label: chargeLabel.trim(), date: chargeDate || undefined },
        { silent: true }
      );
      toast.success("Other charge added to customer ledger.");
      setChargeAmount("");
      setChargeLabel("");
      setChargeDate("");
      setShowChargeForm(false);
      loadLedger();
      onDataChange?.();
    } catch (error) {
      toast.error(error.message || "Could not add charge.");
    } finally {
      setSavingCharge(false);
    }
  }

  function startEdit(entry) {
    setEditingId(entry.id);
    setEditLabel(formatLedgerNarration(entry.label));
    setEditDate(toDateInputValue(entry.entryDate));
    setEditDebit(entry.debit ? String(entry.debit) : "");
    setEditCredit(entry.credit ? String(entry.credit) : "");
  }

  function cancelEdit() {
    setEditingId("");
  }

  async function handleSaveEdit(entry) {
    const debit = Number(editDebit || 0);
    const credit = Number(editCredit || 0);
    if (!Number.isFinite(debit) || debit < 0 || !Number.isFinite(credit) || credit < 0) {
      toast.error("Amounts must be valid non-negative numbers.");
      return;
    }
    setRowBusy(entry.id);
    try {
      await adminApi.updateLedgerEntry(
        entry.id,
        { label: editLabel.trim(), entryDate: editDate || undefined, debit, credit },
        { silent: true }
      );
      toast.success("Ledger entry updated.");
      setEditingId("");
      loadLedger();
      onDataChange?.();
    } catch (error) {
      toast.error(error.message || "Could not update entry.");
    } finally {
      setRowBusy("");
    }
  }

  async function handleDelete(entry) {
    if (!window.confirm(`Delete this ledger entry?\n\n${entry.label || ""}`)) return;
    setRowBusy(entry.id);
    try {
      await adminApi.deleteLedgerEntry(entry.id, { silent: true });
      toast.success("Ledger entry deleted.");
      if (editingId === entry.id) setEditingId("");
      loadLedger();
      onDataChange?.();
    } catch (error) {
      toast.error(error.message || "Could not delete entry.");
    } finally {
      setRowBusy("");
    }
  }

  return (
    <div className="grid gap-4">
      <div>
        <h2 className={ui.adminH1}>Customer Ledger</h2>
        <p className={ui.muted}>
          View, edit, delete ledger entries and add other charges for any approved customer.
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <LedgerSummaryCard
          label="Current Outstanding"
          value={formatRupees(summary.previousOutstanding ?? summary.currentOutstanding)}
        />
        <LedgerSummaryCard
          label="Total Billed (All Jobs)"
          value={formatRupees(summary.totalBilled ?? summary.totalJobOutstanding)}
        />
        <LedgerSummaryCard
          label="Total Payments Received"
          value={formatRupees(summary.totalReceived ?? summary.totalPaymentReceived)}
        />
        <LedgerSummaryCard
          label="Ledger Balance"
          value={formatRupees(summary.ledgerNetOutstanding ?? summary.finalBalance)}
        />
      </div>

      {selectedId ? (
        <section className={`${ui.adminCard} grid gap-3`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className={ui.adminH3}>Add Other Charges</h3>
            <button
              type="button"
              className={btnClass(showChargeForm ? "secondary" : "amber")}
              onClick={() => setShowChargeForm((v) => !v)}
            >
              {showChargeForm ? "Cancel" : "+ Other Charges"}
            </button>
          </div>

          {showChargeForm ? (
            <div className="grid gap-3 sm:grid-cols-[1fr_1.5fr_1fr_auto] sm:items-end">
              <label className={ui.field}>
                <span className={ui.label}>Amount</span>
                <input
                  className={ui.input}
                  type="number"
                  min="0"
                  value={chargeAmount}
                  onChange={(e) => setChargeAmount(e.target.value)}
                  placeholder="e.g. 500"
                />
              </label>
              <label className={ui.field}>
                <span className={ui.label}>Description (optional)</span>
                <input
                  className={ui.input}
                  value={chargeLabel}
                  onChange={(e) => setChargeLabel(e.target.value)}
                  placeholder="e.g. Courier, Design, Lamination"
                />
              </label>
              <label className={ui.field}>
                <span className={ui.label}>Date (optional)</span>
                <input
                  className={ui.input}
                  type="date"
                  value={chargeDate}
                  onChange={(e) => setChargeDate(e.target.value)}
                />
              </label>
              <button
                type="button"
                className={btnClass("primary")}
                onClick={handleAddCharge}
                disabled={savingCharge}
              >
                {savingCharge ? "Adding..." : "Add Charge"}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

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
                <th className={ui.th}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className={ui.td} colSpan="7">Loading ledger...</td></tr>
              ) : ledgerEntries.length === 0 ? (
                <tr><td className={ui.td} colSpan="7">No ledger entries for this customer.</td></tr>
              ) : (
                ledgerEntries.map((entry, index) => {
                  const isEditing = editingId === entry.id;
                  const busy = rowBusy === entry.id;
                  return (
                    <tr key={entry.id} className={index % 2 === 1 ? "bg-slate-50/80" : ""}>
                      <td className={ui.td}>{index + 1}</td>
                      {isEditing ? (
                        <>
                          <td className={ui.td}>
                            <input
                              className={ui.inputCompact}
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                            />
                          </td>
                          <td className={ui.td}>
                            <input
                              className={ui.inputCompact}
                              value={editLabel}
                              onChange={(e) => setEditLabel(e.target.value)}
                            />
                          </td>
                          <td className={ui.td}>
                            <input
                              className={ui.inputCompact}
                              type="number"
                              min="0"
                              value={editDebit}
                              onChange={(e) => setEditDebit(e.target.value)}
                              placeholder="0"
                            />
                          </td>
                          <td className={ui.td}>
                            <input
                              className={ui.inputCompact}
                              type="number"
                              min="0"
                              value={editCredit}
                              onChange={(e) => setEditCredit(e.target.value)}
                              placeholder="0"
                            />
                          </td>
                          <td className={ui.td}>{formatLedgerBalance(entry)}</td>
                          <td className={ui.td}>
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                className={btnClass("primary", true)}
                                onClick={() => handleSaveEdit(entry)}
                                disabled={busy}
                              >
                                {busy ? "Saving..." : "Save"}
                              </button>
                              <button
                                type="button"
                                className={btnClass("ghost", true)}
                                onClick={cancelEdit}
                                disabled={busy}
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className={ui.td}>{formatLedgerTableDate(entry.entryDate)}</td>
                          <td className={ui.td}>{formatLedgerNarration(entry.label)}</td>
                          <td className={ui.td}>{formatLedgerDebit(entry)}</td>
                          <td className={ui.td}>{formatLedgerCredit(entry)}</td>
                          <td className={ui.td}>{formatLedgerBalance(entry)}</td>
                          <td className={ui.td}>
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                className={btnClass("secondary", true)}
                                onClick={() => startEdit(entry)}
                                disabled={busy}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className={btnClass("danger", true)}
                                onClick={() => handleDelete(entry)}
                                disabled={busy}
                              >
                                {busy ? "..." : "Delete"}
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
