"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import { useAuth, useAuthUser } from "@/context/AuthContext";
import { formatDate, formatRupees, walletApi } from "@/lib/api";
import { btnClass, formatOrderStatus, orderStatusClass, ui } from "@/lib/ui";

export default function AccountPage() {
  const router = useRouter();
  const { ready } = useAuth();
  const user = useAuthUser();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (ready && !user) router.replace("/#login");
    if (ready && user?.role === "ADMIN") router.replace("/admin");
    if (ready && user?.profileNeedsPhone) router.replace("/profile");
  }, [ready, user, router]);

  useEffect(() => {
    if (!user) return;
    walletApi.ledger().then((d) => setOrders(d.orders)).catch(() => {});
  }, [user]);

  if (!ready || !user) {
    return <div className={`${ui.page} ${ui.container} ${ui.muted}`}>Loading...</div>;
  }

  return (
    <>
      <SiteHeader user={user} />
      <main className={ui.page}>
        <div className={ui.pageNarrow}>
          <h1 className={ui.h1}>My Orders</h1>
          <p className={ui.muted}>Business: <strong>{user.business}</strong></p>

          <div className={ui.statGrid}>
            <div className={ui.statCard}><span className={`block ${ui.small} ${ui.muted}`}>Balance</span><strong>{formatRupees(user.balance)}</strong></div>
            <div className={ui.statCard}><span className={`block ${ui.small} ${ui.muted}`}>Credit</span><strong>{formatRupees(user.creditLimit)}</strong></div>
            <div className={ui.statCard}><span className={`block ${ui.small} ${ui.muted}`}>Due</span><strong>{formatRupees(user.previousOutstanding)}</strong></div>
          </div>

          <div className={ui.card}>
            <div className={ui.tableWrap}>
              <table className={ui.table}>
                <thead><tr><th className={ui.th}>Order #</th><th className={ui.th}>Date</th><th className={ui.th}>Paper / Size</th><th className={ui.th}>Amount</th><th className={ui.th}>Status</th></tr></thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td className={ui.td} colSpan="5">No orders yet. <Link href="/order" className="text-blue-600 hover:underline">Place your first order</Link></td></tr>
                  ) : orders.map((o) => (
                    <tr key={o.id}>
                      <td className={ui.td}>{o.orderNumber || "—"}</td>
                      <td className={ui.td}>{formatDate(o.createdAt)}</td>
                      <td className={ui.td}>{o.paperGsm}, {o.size}</td>
                      <td className={ui.td}>{formatRupees(o.amount)}</td>
                      <td className={ui.td}>
                        <span className={orderStatusClass(o.status)}>{formatOrderStatus(o.status)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Link href="/order" className={btnClass("primary")}>New Order</Link>
        </div>
      </main>
    </>
  );
}
