"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import OrderArtworkThumb, { OrderMetaLine } from "@/components/OrderArtworkThumb";
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
    if (ready && !user) router.replace("/?auth=login");
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
          <p className={ui.muted}>
            Customer name: <strong>{user.name}</strong> · Business: <strong>{user.business}</strong>
          </p>

          <div className={ui.statGrid}>
            <div className={ui.statCard}><span className={`block ${ui.small} ${ui.muted}`}>Balance</span><strong>{formatRupees(user.balance)}</strong></div>
            <div className={ui.statCard}><span className={`block ${ui.small} ${ui.muted}`}>Credit</span><strong>{formatRupees(user.creditLimit)}</strong></div>
            <div className={ui.statCard}><span className={`block ${ui.small} ${ui.muted}`}>Due</span><strong>{formatRupees(user.previousOutstanding)}</strong></div>
          </div>

          <div className={ui.card}>
            {orders.length === 0 ? (
              <p className={ui.muted}>
                No orders yet. <Link href="/order" className="text-blue-600 hover:underline">Place your first order</Link>
              </p>
            ) : (
              <>
                <div className={ui.mobileCardList}>
                  {orders.map((o) => (
                    <article key={o.id} className={ui.mobileCard}>
                      <div className="flex gap-3">
                        <OrderArtworkThumb order={o} />
                        <div className="min-w-0 flex-1 grid gap-1">
                          <div className={ui.mobileCardRow}>
                            <strong>{o.orderNumber || "—"}</strong>
                            <span className={orderStatusClass(o.status)}>{formatOrderStatus(o.status)}</span>
                          </div>
                          <OrderMetaLine label="Customer" value={user.name} />
                          <OrderMetaLine label="Quantity" value={o.quantity} />
                          <p className={ui.muted}>{formatDate(o.createdAt)}</p>
                          <p>{o.paperGsm}, {o.size} · {o.printingSide}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <div className={`${ui.tableWrap} hidden md:block`}>
                  <table className={ui.table}>
                    <thead>
                      <tr>
                        <th className={ui.th}>Artwork</th>
                        <th className={ui.th}>Order #</th>
                        <th className={ui.th}>Customer</th>
                        <th className={ui.th}>Date</th>
                        <th className={ui.th}>Paper / Size</th>
                        <th className={ui.th}>Quantity</th>
                        <th className={ui.th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.id}>
                          <td className={ui.td}>
                            <OrderArtworkThumb order={o} className="h-14 w-14" />
                          </td>
                          <td className={ui.td}>{o.orderNumber || "—"}</td>
                          <td className={ui.td}>{user.name}</td>
                          <td className={ui.td}>{formatDate(o.createdAt)}</td>
                          <td className={ui.td}>{o.paperGsm}, {o.size}</td>
                          <td className={ui.td}>{o.quantity || "—"}</td>
                          <td className={ui.td}>
                            <span className={orderStatusClass(o.status)}>{formatOrderStatus(o.status)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <Link href="/order" className={btnClass("primary")}>New Order</Link>
        </div>
      </main>
    </>
  );
}
