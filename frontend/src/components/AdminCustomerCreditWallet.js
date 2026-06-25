"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPhone } from "@/components/AdminCatalogPanel";
import { adminApi, formatRupees } from "@/lib/api";
import { toast } from "@/lib/toast";
import { btnClass, ui } from "@/lib/ui";

function formatWalletAmount(value) {
  const amount = Number(value || 0);
  if (!amount) return "Rs. —";
  return formatRupees(amount);
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
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

function StatLine({ label, value, hint }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 py-2.5 last:border-0">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {hint ? <p className={`${ui.small} ${ui.muted}`}>{hint}</p> : null}
      </div>
      <p className="text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

function CreditWalletPanel({ account, onUpdated }) {
  const [creditLimit, setCreditLimit] = useState(String(account.creditLimit || ""));
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayInputValue());
  const [savingLimit, setSavingLimit] = useState(false);
  const [receivingPayment, setReceivingPayment] = useState(false);

  useEffect(() => {
    setCreditLimit(String(account.creditLimit || ""));
    setPaymentAmount("");
    setPaymentDate(todayInputValue());
  }, [account.id, account.creditLimit]);

  async function saveLimit() {
    const limit = Number(creditLimit);
    if (!Number.isFinite(limit) || limit < 0) {
      toast.error("Enter a valid credit limit.");
      return;
    }
    setSavingLimit(true);
    try {
      await adminApi.updateCredit(account.id, { creditLimit: limit }, { silent: true });
      toast.success("Credit limit saved.");
      await onUpdated();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingLimit(false);
    }
  }

  async function receivePayment() {
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid payment amount.");
      return;
    }
    setReceivingPayment(true);
    try {
      await adminApi.receivePayment(
        account.id,
        { amount, receivedDate: paymentDate },
        { silent: true }
      );
      toast.success("Payment recorded.");
      setPaymentAmount("");
      await onUpdated();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setReceivingPayment(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h4 className="mb-2 text-sm font-bold text-slate-800">Account Summary</h4>
        <p className={`${ui.small} ${ui.muted} mb-3`}>
          Outstanding updates automatically when orders are placed or payments are received.
        </p>
        <StatLine label="Wallet Balance" value={formatWalletAmount(account.balance)} />
        <StatLine
          label="Credit Limit"
          value={formatWalletAmount(account.creditLimit)}
          hint={`Available: ${formatWalletAmount(account.availableCredit)}`}
        />
        <StatLine
          label="Previous Outstanding"
          value={formatWalletAmount(account.previousOutstanding)}
        />
      </section>

      <div className="grid gap-4">
        <section className="rounded-lg border border-slate-200 p-4">
          <h4 className="mb-1 text-sm font-bold text-slate-800">Set Credit Limit</h4>
          <p className={`${ui.small} ${ui.muted} mb-3`}>
            Customer can place orders up to this limit without upfront payment.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              className={`${ui.input} min-w-[10rem] flex-1`}
              type="number"
              min="0"
              placeholder="Credit limit"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
            />
            <button
              type="button"
              className={btnClass("amber")}
              disabled={savingLimit}
              onClick={saveLimit}
            >
              {savingLimit ? "Saving..." : "Save"}
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 p-4">
          <h4 className="mb-1 text-sm font-bold text-slate-800">Receive Payment</h4>
          <p className={`${ui.small} ${ui.muted} mb-3`}>
            Record cash or UPI received. This reduces previous outstanding.
          </p>
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className={ui.field}>
              <span className={ui.label}>Amount</span>
              <input
                className={ui.input}
                type="number"
                min="0"
                placeholder="Payment amount"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </label>
            <label className={ui.field}>
              <span className={ui.label}>Date</span>
              <input
                className={ui.input}
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </label>
            <button
              type="button"
              className={btnClass("amber")}
              disabled={receivingPayment}
              onClick={receivePayment}
            >
              {receivingPayment ? "Saving..." : "Receive"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function AdminCustomerCreditWallet({ accounts = [], onRefresh }) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");

  const customers = useMemo(
    () => accounts.filter(
      (a) => a.status === "APPROVED" && (a.role === "CUSTOMER" || a.role === "BOTH")
    ),
    [accounts]
  );

  const filteredCustomers = useMemo(
    () => customers.filter((a) => matchesCustomerSearch(a, search)),
    [customers, search]
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

  const selectedCustomer = filteredCustomers.find((a) => a.id === selectedId);

  return (
    <section className={ui.adminCard}>
      <h3 className={`${ui.adminH3} rounded-t-lg bg-slate-800 px-4 py-2.5 text-white`}>
        Customer Credit Wallet
      </h3>

      <div className="grid gap-4 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className={ui.field}>
            <span className={ui.label}>Search Customer</span>
            <input
              className={ui.input}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, city, or mobile"
            />
          </label>
          <label className={ui.field}>
            <span className={ui.label}>Select Customer</span>
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
          </label>
        </div>

        {selectedCustomer ? (
          <CreditWalletPanel account={selectedCustomer} onUpdated={onRefresh} />
        ) : (
          <p className={ui.muted}>Select a customer to view wallet and credit details.</p>
        )}
      </div>
    </section>
  );
}
