"use client";

import { formatRupees } from "@/lib/api";
import { btnClass, formatOrderStatus, orderStatusClass, pendingCountClass, ui } from "@/lib/ui";
import { todayIst } from "@/components/AdminDayBook";

const QUICK_LINKS = [
  { id: "day-book", label: "Day Book", desc: "Today total orders and amount" },
  { id: "accounts", label: "Users & Accounts", desc: "Approve registrations and manage roles", countKey: "accounts" },
  { id: "payments", label: "Payment Requests", desc: "Review and approve UPI payments", countKey: "payments" },
  { id: "payment", label: "Payment", desc: "Add payment for a customer" },
  { id: "orders", label: "Orders", desc: "Dispatch and mark orders delivered", countKey: "orders" },
  { id: "catalog", label: "Order Catalog", desc: "Paper GSM, sizes, quantities & rates" },
  { id: "rates", label: "Rates", desc: "View all saved combination prices" },
  { id: "qr", label: "Payment QR", desc: "UPI QR for customer payments" },
];

export default function AdminDashboard({
  user,
  pending,
  accounts,
  payments,
  orders,
  counts,
  onNavigate,
  onApproveAccount,
  approvingId,
}) {
  const hasAlerts = counts.accounts > 0 || counts.payments > 0 || counts.orders > 0;
  const recentOrders = orders.slice(0, 5);
  const recentPayments = payments.slice(0, 5);
  const today = todayIst();
  const todayOrders = orders.filter((o) => {
    const orderDay = new Date(o.createdAt).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    return orderDay === today;
  });
  const todayTotalAmount = todayOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const todayTotalQty = todayOrders.reduce((sum, o) => sum + (Number(o.quantity) || 0), 0);

  return (
    <div className="grid gap-4">
      <section className={ui.adminCard}>
        <p className="text-xs text-slate-500">Welcome back</p>
        <h2 className="mt-0.5 text-lg font-semibold text-slate-900">{user.business}</h2>
        <p className="mt-1 text-sm text-slate-500">Here is what needs your attention today.</p>
      </section>

      <section className={`${ui.adminCard} border-blue-200 bg-blue-50/40`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className={ui.adminH3}>Today&apos;s Day Book</h3>
            <p className={`mt-1 ${ui.small} ${ui.muted}`}>{today} (IST)</p>
          </div>
          <button type="button" className={btnClass("primary", true)} onClick={() => onNavigate("day-book")}>
            Open Day Book
          </button>
        </div>
        <div className={`${ui.statGrid} mt-3`}>
          <div className={ui.statCard}>
            <span className={`block ${ui.small} ${ui.muted}`}>Orders today</span>
            <strong className="text-lg font-semibold text-slate-900">{todayOrders.length}</strong>
          </div>
          <div className={ui.statCard}>
            <span className={`block ${ui.small} ${ui.muted}`}>Qty today</span>
            <strong className="text-lg font-semibold text-slate-900">{todayTotalQty.toLocaleString("en-IN")}</strong>
          </div>
          <div className={ui.statCard}>
            <span className={`block ${ui.small} ${ui.muted}`}>Amount today</span>
            <strong className="text-lg font-semibold text-slate-900">{formatRupees(todayTotalAmount)}</strong>
          </div>
        </div>
      </section>

      {hasAlerts && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong>Action required:</strong>
          {counts.accounts > 0 && ` ${counts.accounts} user approval${counts.accounts === 1 ? "" : "s"}`}
          {counts.payments > 0 && `${counts.accounts > 0 ? "," : ""} ${counts.payments} pending payment${counts.payments === 1 ? "" : "s"}`}
          {counts.orders > 0 && `${counts.accounts > 0 || counts.payments > 0 ? "," : ""} ${counts.orders} active order${counts.orders === 1 ? "" : "s"}`}
          .
        </div>
      )}

      <div className={ui.statGrid}>
        <button type="button" className={`${ui.statCard} text-left transition hover:border-blue-300 hover:shadow-sm`} onClick={() => onNavigate("accounts")}>
          <span className={`block ${ui.small} ${ui.muted}`}>Pending approvals</span>
          <strong className={counts.accounts > 0 ? pendingCountClass() : "text-lg font-semibold text-slate-900"}>{counts.accounts}</strong>
        </button>
        <button type="button" className={`${ui.statCard} text-left transition hover:border-blue-300 hover:shadow-sm`} onClick={() => onNavigate("payments")}>
          <span className={`block ${ui.small} ${ui.muted}`}>Pending payments</span>
          <strong className={counts.payments > 0 ? pendingCountClass() : "text-lg font-semibold text-slate-900"}>{counts.payments}</strong>
        </button>
        <button type="button" className={`${ui.statCard} text-left transition hover:border-blue-300 hover:shadow-sm`} onClick={() => onNavigate("orders")}>
          <span className={`block ${ui.small} ${ui.muted}`}>Active orders</span>
          <strong className={counts.orders > 0 ? pendingCountClass() : "text-lg font-semibold text-slate-900"}>{counts.orders}</strong>
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className={ui.statCard}>
          <span className={`block ${ui.small} ${ui.muted}`}>Total accounts</span>
          <strong className="text-lg font-semibold text-slate-900">{accounts.length}</strong>
        </div>
        <div className={ui.statCard}>
          <span className={`block ${ui.small} ${ui.muted}`}>Total orders</span>
          <strong className="text-lg font-semibold text-slate-900">{orders.length}</strong>
        </div>
      </div>

      <section className={ui.adminCard}>
        <h3 className={ui.adminH3}>Quick links</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {QUICK_LINKS.map((link) => {
            const count = link.countKey ? counts[link.countKey] : 0;
            return (
              <button
                key={link.id}
                type="button"
                className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50/50"
                onClick={() => onNavigate(link.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900">{link.label}</span>
                  {count > 0 && <span className={pendingCountClass()}>({count})</span>}
                </div>
                <p className={`mt-1 ${ui.small} ${ui.muted}`}>{link.desc}</p>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={ui.adminCard}>
          <div className="flex items-center justify-between gap-2">
            <h3 className={ui.adminH3}>Recent orders</h3>
            <button type="button" className="text-sm font-semibold text-blue-600 hover:underline" onClick={() => onNavigate("orders")}>
              View all
            </button>
          </div>
          {recentOrders.length === 0 ? (
            <p className={ui.muted}>No orders yet.</p>
          ) : (
            <ul className="grid gap-2">
              {recentOrders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <div>
                    <strong>{o.orderNumber || "—"}</strong>
                    <span className={`ml-2 ${ui.muted}`}>{o.business}</span>
                  </div>
                  <span className={orderStatusClass(o.status)}>{formatOrderStatus(o.status)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={ui.adminCard}>
          <div className="flex items-center justify-between gap-2">
            <h3 className={ui.adminH3}>Pending payments</h3>
            <button type="button" className="text-sm font-semibold text-blue-600 hover:underline" onClick={() => onNavigate("payments")}>
              View all
            </button>
          </div>
          {recentPayments.length === 0 ? (
            <p className={ui.muted}>No pending payments.</p>
          ) : (
            <ul className="grid gap-2">
              {recentPayments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-100 bg-red-50/50 px-3 py-2 text-sm">
                  <span>{p.account?.business || "—"}</span>
                  <strong className={pendingCountClass()}>{formatRupees(p.amount)}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {pending.length > 0 && (
        <section className={`${ui.adminCard} border-red-200`}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-red-600">Users awaiting approval</h3>
            <button type="button" className="text-sm font-semibold text-blue-600 hover:underline" onClick={() => onNavigate("accounts")}>
              Review
            </button>
          </div>
          <ul className="grid gap-2">
            {pending.slice(0, 5).map((a) => (
              <li key={a.id} className="grid gap-2 rounded-lg border border-red-100 bg-red-50/50 px-3 py-3 text-sm sm:flex sm:flex-wrap sm:items-center sm:justify-between">
                <div>
                  <strong>{a.business}</strong>
                  <span className={`ml-2 ${ui.muted}`}>{a.name}</span>
                  <p className={`mt-0.5 ${ui.muted}`}>{a.phone}</p>
                </div>
                <button
                  type="button"
                  className={`${btnClass("primary", true)} w-full sm:w-auto`}
                  disabled={approvingId === a.id}
                  onClick={() => onApproveAccount?.(a.id)}
                >
                  {approvingId === a.id ? "Approving..." : "Approve"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
