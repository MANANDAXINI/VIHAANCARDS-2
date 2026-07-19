"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatPhone } from "@/components/AdminCatalogPanel";
import OrderHistoryLedger from "@/components/OrderHistoryLedger";
import { adminApi } from "@/lib/api";
import { mergeOrderHistory } from "@/lib/order-display";
import { toast } from "@/lib/toast";
import { ui } from "@/lib/ui";

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

export default function AdminCustomerOrderHistorySection({ accounts = [] }) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
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

  const selectedCustomer = filteredCustomers.find((a) => a.id === selectedId);
  const hasCreditLimit = Number(account?.creditLimit || selectedCustomer?.creditLimit || 0) > 0;

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

        {selectedCustomer ? (
          <p className={`mt-2 ${ui.small} ${ui.muted}`}>
            Showing orders for <strong>{selectedCustomer.business || selectedCustomer.name}</strong>
            {selectedCustomer.address ? ` · ${selectedCustomer.address}` : ""}
            {selectedCustomer.phone ? ` · ${formatPhone(selectedCustomer.phone)}` : ""}
            {` · ${orders.length} order${orders.length === 1 ? "" : "s"}`}
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
          orders={orders}
          activeTab="orders"
          hasCreditLimit={hasCreditLimit}
        />
      )}
    </div>
  );
}
