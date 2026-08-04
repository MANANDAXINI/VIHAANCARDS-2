"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatPhone } from "@/components/AdminCatalogPanel";
import OrderHistoryLedger from "@/components/OrderHistoryLedger";
import { adminApi } from "@/lib/api";
import { mergeOrderHistory } from "@/lib/order-display";
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

function orderDayIst(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function orderInDateRange(order, fromDate, toDate) {
  if (!fromDate && !toDate) return true;
  const day = orderDayIst(order.createdAt || order.dispatchDate);
  if (!day) return false;
  if (fromDate && day < fromDate) return false;
  if (toDate && day > toDate) return false;
  return true;
}

export default function AdminCustomerOrderHistorySection({ accounts = [] }) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [account, setAccount] = useState(null);

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

  const loadOrders = useCallback(() => {
    if (!selectedId) {
      setOrders([]);
      setAccount(null);
      return;
    }

    setLoading(true);
    adminApi
      .customerAccountDetails(selectedId)
      .then((data) => {
        setAccount(data.account || null);
        setOrders(mergeOrderHistory(data.orders || [], data.pendingPayments || []));
      })
      .catch((error) => {
        toast.error(error.message || "Could not load order history.");
        setOrders([]);
        setAccount(null);
      })
      .finally(() => setLoading(false));
  }, [selectedId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // When Job Completed is clicked on Orders tab, refresh this history view.
  useEffect(() => {
    function onJobCompleted(event) {
      const accountId = event?.detail?.accountId;
      if (accountId && selectedId && accountId !== selectedId) return;
      loadOrders();
    }
    window.addEventListener("pd-job-completed", onJobCompleted);
    return () => window.removeEventListener("pd-job-completed", onJobCompleted);
  }, [loadOrders, selectedId]);

  const selectedCustomer = filteredCustomers.find((a) => a.id === selectedId);
  const hasCreditLimit = Number(account?.creditLimit || selectedCustomer?.creditLimit || 0) > 0;

  const filteredOrders = useMemo(
    () => orders.filter((order) => orderInDateRange(order, fromDate, toDate)),
    [orders, fromDate, toDate]
  );

  const dateFilterActive = Boolean(fromDate || toDate);

  function clearDates() {
    setFromDate("");
    setToDate("");
  }

  return (
    <div className="grid gap-4">
      <div>
        <h2 className={ui.adminH1}>Customer Order History</h2>
        <p className={ui.muted}>
          Same Order History view as the customer panel — pick a customer to see their jobs, artwork, and status.
        </p>
      </div>

      <section className={ui.adminCard}>
        <div className="grid gap-3 md:grid-cols-[1fr_minmax(0,2fr)] md:items-end">
          <div className={ui.field}>
            <label className={ui.label} htmlFor="order-history-search">
              Search customer
            </label>
            <input
              id="order-history-search"
              className={ui.input}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Business, city, or mobile..."
            />
          </div>
          <div className={ui.field}>
            <label className={ui.label} htmlFor="order-history-customer">
              Customer
            </label>
            <select
              id="order-history-customer"
              className={ui.input}
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {filteredCustomers.length === 0 ? (
                <option value="">No customers found</option>
              ) : (
                filteredCustomers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customerLabel(customer)}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className={ui.field}>
            <label className={ui.label} htmlFor="order-history-from">
              From Date
            </label>
            <input
              id="order-history-from"
              className={ui.input}
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className={ui.field}>
            <label className={ui.label} htmlFor="order-history-to">
              To Date
            </label>
            <input
              id="order-history-to"
              className={ui.input}
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <button
            type="button"
            className={btnClass("ghost")}
            onClick={clearDates}
            disabled={!dateFilterActive}
          >
            Clear Dates
          </button>
        </div>

        {selectedCustomer ? (
          <p className={`mt-2 ${ui.small} ${ui.muted}`}>
            Showing orders for <strong>{selectedCustomer.business || selectedCustomer.name}</strong>
            {selectedCustomer.address ? ` · ${selectedCustomer.address}` : ""}
            {selectedCustomer.phone ? ` · ${formatPhone(selectedCustomer.phone)}` : ""}
            {dateFilterActive
              ? ` · ${filteredOrders.length} of ${orders.length} order${orders.length === 1 ? "" : "s"}`
              : ` · ${orders.length} order${orders.length === 1 ? "" : "s"}`}
            {fromDate || toDate
              ? ` (${fromDate || "…"} to ${toDate || "…"})`
              : ""}
          </p>
        ) : null}
      </section>

      {loading ? (
        <p className={ui.muted}>Loading order history...</p>
      ) : !selectedId ? (
        <p className={`rounded-lg border border-slate-200 bg-white px-4 py-8 text-center ${ui.muted}`}>
          Select a customer to view order history.
        </p>
      ) : (
        <OrderHistoryLedger
          orders={filteredOrders}
          activeTab="orders"
          account={account}
          hasCreditLimit={hasCreditLimit}
        />
      )}
    </div>
  );
}
