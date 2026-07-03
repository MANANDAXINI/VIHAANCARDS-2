"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatPhone } from "@/components/AdminCatalogPanel";
import { adminApi } from "@/lib/api";
import { toast } from "@/lib/toast";
import { btnClass, ui } from "@/lib/ui";

function customerLabel(account) {
  if (!account) return "";
  const phone = formatPhone(account.phone);
  return [account.business || account.name, phone].filter(Boolean).join(" — ");
}

export default function AdminOtherChargesSection({ accounts = [], onRefresh }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [open, setOpen] = useState(false);
  const [narration, setNarration] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const boxRef = useRef(null);

  const customers = useMemo(
    () =>
      accounts
        .filter(
          (account) =>
            account.status === "APPROVED"
            && (account.role === "CUSTOMER" || account.role === "BOTH")
        )
        .sort((a, b) => String(a.business || a.name).localeCompare(String(b.business || b.name))),
    [accounts]
  );

  const selected = customers.find((c) => c.id === selectedId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers.slice(0, 50);
    return customers
      .filter((c) =>
        [c.business, c.name, c.address, c.phone, formatPhone(c.phone)]
          .join(" ")
          .toLowerCase()
          .includes(q)
      )
      .slice(0, 50);
  }, [customers, query]);

  useEffect(() => {
    function onDocClick(event) {
      if (boxRef.current && !boxRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pickCustomer(account) {
    setSelectedId(account.id);
    setQuery(customerLabel(account));
    setOpen(false);
  }

  function handleQueryChange(value) {
    setQuery(value);
    setSelectedId("");
    setOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedId) {
      toast.error("Select a customer from the list.");
      return;
    }
    if (!narration.trim()) {
      toast.error("Enter the narration / reason for this charge.");
      return;
    }
    const chargeAmount = Number(amount);
    if (!Number.isFinite(chargeAmount) || chargeAmount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }

    setSaving(true);
    try {
      await adminApi.addOtherCharge(
        selectedId,
        { amount: chargeAmount, label: narration.trim() },
        { silent: true }
      );
      toast.success(`Charge of Rs. ${chargeAmount} added to ${selected?.business || selected?.name || "customer"}.`);
      setNarration("");
      setAmount("");
      await onRefresh?.();
    } catch (error) {
      toast.error(error.message || "Could not add charge.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div>
        <h2 className={ui.adminH1}>Other Charges</h2>
        <p className={ui.muted}>
          Add extra charges (courier, design, lamination, etc.) directly to a customer&apos;s ledger.
        </p>
      </div>

      <section className={ui.adminCard}>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="relative" ref={boxRef}>
            <label className={ui.field}>
              <span className={ui.label}>Customer Name</span>
              <input
                className={ui.input}
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onFocus={() => setOpen(true)}
                placeholder="Search customer by name, business, or mobile"
                autoComplete="off"
              />
            </label>
            {open && (
              <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                {filtered.length === 0 ? (
                  <p className={`px-3 py-2 ${ui.small} ${ui.muted}`}>No customer found.</p>
                ) : (
                  filtered.map((account) => (
                    <button
                      key={account.id}
                      type="button"
                      className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                        account.id === selectedId ? "bg-blue-50 font-semibold text-blue-800" : "text-slate-800"
                      }`}
                      onClick={() => pickCustomer(account)}
                    >
                      <span className="block">{account.business || account.name}</span>
                      <span className={`${ui.small} ${ui.muted}`}>
                        {account.address ? `${account.address} · ` : ""}
                        {formatPhone(account.phone)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
            {selected ? (
              <p className={`mt-1 ${ui.small} text-emerald-700`}>
                Selected: <strong>{selected.business || selected.name}</strong>
              </p>
            ) : null}
          </div>

          <label className={ui.field}>
            <span className={ui.label}>Narration / Reason</span>
            <input
              className={ui.input}
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              placeholder="e.g. Courier charges, Design charges, Lamination"
            />
          </label>

          <label className={`${ui.field} sm:max-w-[16rem]`}>
            <span className={ui.label}>Amount</span>
            <input
              className={ui.input}
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Rs."
            />
          </label>

          <div>
            <button
              type="submit"
              className={btnClass("primary")}
              disabled={saving}
            >
              {saving ? "Adding..." : "Add Charge"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
