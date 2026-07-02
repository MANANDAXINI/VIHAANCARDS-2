"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPhone } from "@/components/AdminCatalogPanel";
import { adminApi } from "@/lib/api";
import { toast } from "@/lib/toast";
import { btnClass, ui } from "@/lib/ui";

export default function AdminReceivePaymentSection({ accounts = [], onRefresh }) {
  const [selectedId, setSelectedId] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const customers = useMemo(
    () => accounts
      .filter((account) => account.status === "APPROVED"
        && (account.role === "CUSTOMER" || account.role === "BOTH"))
      .sort((a, b) => String(a.business || a.name).localeCompare(String(b.business || b.name))),
    [accounts]
  );

  useEffect(() => {
    if (!selectedId && customers.length > 0) {
      setSelectedId(customers[0].id);
    }
  }, [customers, selectedId]);

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
      await adminApi.receivePayment(
        selectedId,
        { amount: paymentAmount, label: "Payment Received" },
        { silent: true }
      );
      setAmount("");
      toast.success("Payment saved.");
      await onRefresh?.();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
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
    </section>
  );
}
