"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AdminDashboard from "@/components/AdminDashboard";
import AdminDayBook from "@/components/AdminDayBook";
import { AdminHeader } from "@/components/AdminHeader";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import AdminNav from "@/components/AdminNav";
import { AdminPagination, AdminSearchBar, useAdminTableState } from "@/components/AdminTableTools";
import BusinessPickList from "@/components/BusinessPickList";
import AdminOrderCatalogSection from "@/components/AdminOrderCatalogSection";
import {
  AdminQrSection,
  formatPhone,
} from "@/components/AdminCatalogPanel";
import { useAuth, useAuthUser } from "@/context/AuthContext";
import { useLogout } from "@/hooks/useLogout";
import { adminApi, API_URL, formatRupees } from "@/lib/api";
import { filterItems, paginateItems } from "@/lib/admin-table";
import { isAdmin, roleLabel } from "@/lib/redirect";
import { toast } from "@/lib/toast";
import {
  accountStatusClass,
  btnClass,
  formatOrderStatus,
  isOrderPending,
  orderStatusClass,
  pendingRowClass,
  pendingSectionTitleClass,
  ui,
} from "@/lib/ui";

export default function AdminPage() {
  const router = useRouter();
  const { login, ready } = useAuth();
  const handleLogout = useLogout();
  const user = useAuthUser();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [businessOptions, setBusinessOptions] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [pending, setPending] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [pendingSearch, setPendingSearch] = useState("");
  const [accountsSearch, setAccountsSearch] = useState("");
  const [paymentsSearch, setPaymentsSearch] = useState("");
  const [ordersSearch, setOrdersSearch] = useState("");
  const [pendingPage, setPendingPage] = useState(1);
  const [accountsPage, setAccountsPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const [approvingId, setApprovingId] = useState(null);
  const [orderActionId, setOrderActionId] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useAdminTableState(pendingSearch, setPendingPage);
  useAdminTableState(accountsSearch, setAccountsPage);
  useAdminTableState(paymentsSearch, setPaymentsPage);
  useAdminTableState(ordersSearch, setOrdersPage);

  useEffect(() => {
    if (isAdmin(user)) load();
  }, [user]);

  async function load() {
    try {
      const [p, a, w, o] = await Promise.all([
        adminApi.pendingAccounts(),
        adminApi.accounts(),
        adminApi.walletRequests(),
        adminApi.orders(),
      ]);
      setPending(p.accounts);
      setAccounts(a.accounts);
      setPayments(w.requests.filter((r) => r.status === "PENDING"));
      setOrders(o.orders);
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function handleAdminLogin(event) {
    event.preventDefault();
    setLoginLoading(true);
    try {
      const data = await login(phone.replace(/\D/g, "").slice(0, 10), password);
      if (data.needsBusinessPick) {
        setBusinessOptions(data.accounts || []);
        toast.info(data.message || "Select your business to continue.");
        return;
      }
      if (!isAdmin(data.account)) {
        toast.error("This account does not have admin access.");
        return;
      }
      setBusinessOptions([]);
      router.push("/admin");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleAdminBusinessSelect(accountId) {
    setLoginLoading(true);
    try {
      const data = await login(phone.replace(/\D/g, "").slice(0, 10), password, accountId);
      if (!isAdmin(data.account)) {
        toast.error("This account does not have admin access.");
        return;
      }
      setBusinessOptions([]);
      router.push("/admin");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoginLoading(false);
    }
  }

  function handleGoogleSuccess(data) {
    if (!isAdmin(data.account)) {
      toast.error("This account does not have admin access.");
      return;
    }
    router.push("/admin");
  }

  async function changeRole(accountId, role) {
    try {
      await adminApi.updateRole(accountId, role);
      toast.success("Role updated.");
      load();
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function approveAccount(accountId) {
    if (approvingId) return;
    setApprovingId(accountId);
    try {
      await adminApi.approveAccount(accountId, { silent: true });
      toast.success("Account approved.");
      await load();
    } catch (error) {
      toast.error(error.message || "Could not approve account.");
    } finally {
      setApprovingId(null);
    }
  }

  async function dispatchOrder(orderId) {
    const lr = prompt("Enter LR number");
    if (!lr?.trim()) return;
    if (orderActionId) return;

    setOrderActionId(`dispatch-${orderId}`);
    try {
      await adminApi.dispatch(orderId, {
        lrNumber: lr.trim(),
        transportDetails: "",
        dispatchDate: new Date().toISOString().slice(0, 10),
      }, { silent: true });
      toast.success("Order dispatched. Click Delivered when the customer receives it.");
      await load();
    } catch (error) {
      toast.error(error.message || "Could not dispatch order.");
    } finally {
      setOrderActionId(null);
    }
  }

  async function deliverOrder(orderId) {
    if (orderActionId) return;
    if (!window.confirm("Mark this order as delivered?")) return;

    setOrderActionId(`deliver-${orderId}`);
    try {
      await adminApi.deliver(orderId, { silent: true });
      toast.success("Order marked as delivered.");
      await load();
    } catch (error) {
      toast.error(error.message || "Could not mark order as delivered.");
    } finally {
      setOrderActionId(null);
    }
  }

  const showLoginShell = !mounted || !ready || !user || !isAdmin(user);

  if (showLoginShell) {
    return (
      <>
        <AdminHeader user={mounted && ready ? user : null} onLogout={handleLogout} />
        <main className={`${ui.pageAdminShell} text-sm`}>
          <div className="mx-auto w-full max-w-md px-4">
            <div className="mb-5 text-center">
              <h1 className={ui.adminH1}>Admin Dashboard</h1>
              <p className={`mt-1.5 text-sm ${ui.muted}`}>Sign in to manage orders, payments, and catalog.</p>
            </div>

            {mounted && ready && user && !isAdmin(user) && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Logged in as <strong>{user.business}</strong> ({roleLabel(user.role)}).
                Use an admin account to continue.
                <button type="button" className={`${btnClass("ghost")} mt-2`} onClick={handleLogout}>Logout</button>
              </div>
            )}

            <div className={ui.adminCard}>
              {!mounted || !ready ? (
                <p className={`text-center ${ui.muted}`}>Loading...</p>
              ) : (
                <>
                  {businessOptions.length > 0 ? (
                    <BusinessPickList
                      accounts={businessOptions}
                      onSelect={handleAdminBusinessSelect}
                      onBack={() => setBusinessOptions([])}
                    />
                  ) : (
                    <>
                      <GoogleSignInButton label="Login with Google" onSuccess={handleGoogleSuccess} onError={() => {}} />
                      <div className={ui.divider}>or mobile login</div>

                      <form className="grid gap-4" onSubmit={handleAdminLogin}>
                        <div className={ui.field}>
                          <label className={ui.label}>Mobile Number</label>
                          <input className={ui.input} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile" maxLength={10} />
                        </div>
                        <div className={ui.field}>
                          <label className={ui.label}>Password</label>
                          <input className={ui.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                        </div>
                        <button className={btnClass("primary")} type="submit" disabled={loginLoading}>
                          {loginLoading ? "Please wait..." : "Sign in"}
                        </button>
                      </form>
                    </>
                  )}

                  <p className={`text-center ${ui.small} ${ui.muted}`}>
                    Customer? <Link href="/" className="font-semibold text-blue-600 hover:underline">Go to storefront</Link>
                  </p>
                </>
              )}
            </div>
          </div>
        </main>
      </>
    );
  }

  const navCounts = {
    accounts: pending.length,
    payments: payments.length,
    orders: orders.filter((o) => isOrderPending(o.status)).length,
  };

  const pendingFiltered = filterItems(pending, pendingSearch, ["name", "business", "phone", "role"]);
  const pendingPaged = paginateItems(pendingFiltered, pendingPage);

  const accountsFiltered = filterItems(accounts, accountsSearch, ["business", "phone", "status", "role"]);
  const accountsPaged = paginateItems(accountsFiltered, accountsPage);

  const paymentsFiltered = filterItems(payments, paymentsSearch, ["account.business", "amount", "type"]);
  const paymentsPaged = paginateItems(paymentsFiltered, paymentsPage);

  const ordersFiltered = filterItems(orders, ordersSearch, ["orderNumber", "business", "customerName", "paperGsm", "size", "quantity", "status", "amount"]);
  const ordersPaged = paginateItems(ordersFiltered, ordersPage);

  return (
    <>
      <AdminHeader user={user} onLogout={handleLogout} />
      <main className={`${ui.pageAdminShell} text-sm`}>
        <div className={ui.pageAdmin}>
          <div>
            <h1 className={ui.adminH1}>Admin Dashboard</h1>
            <p className={`text-sm ${ui.muted}`}>Logged in as <strong>{user.business}</strong> — {roleLabel(user.role)}</p>
          </div>

          <AdminNav active={activeTab} onChange={setActiveTab} counts={navCounts} />

          {activeTab === "dashboard" && (
            <AdminDashboard
              user={user}
              pending={pending}
              accounts={accounts}
              payments={payments}
              orders={orders}
              counts={navCounts}
              onNavigate={setActiveTab}
              onApproveAccount={approveAccount}
              approvingId={approvingId}
            />
          )}

          {activeTab === "day-book" && <AdminDayBook />}

          {activeTab === "accounts" && (
            <div className="grid gap-4">
              <section className={`${ui.adminCard} ${pending.length > 0 ? "border-red-200" : ""}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className={pendingSectionTitleClass(pending.length > 0)}>
                    Pending Approvals ({pending.length})
                  </h3>
                  <div className="w-full sm:w-64">
                    <AdminSearchBar value={pendingSearch} onChange={setPendingSearch} placeholder="Search pending users..." />
                  </div>
                </div>
                {pendingPaged.items.length === 0 ? (
                  <p className={ui.muted}>No pending users</p>
                ) : (
                  <>
                    <div className={ui.mobileCardList}>
                      {pendingPaged.items.map((a) => (
                        <article key={a.id} className={`${ui.mobileCard} border-red-100 bg-red-50/40`}>
                          <div className={ui.mobileCardRow}>
                            <strong>{a.business}</strong>
                            <span className={accountStatusClass("PENDING")}>PENDING</span>
                          </div>
                          <p>{a.name}</p>
                          <p className={ui.muted}>{formatPhone(a.phone)}</p>
                          <select className={ui.input} value={a.role || "CUSTOMER"} onChange={(e) => changeRole(a.id, e.target.value)}>
                            <option value="CUSTOMER">Customer</option>
                            <option value="ADMIN">Admin</option>
                            <option value="BOTH">Customer + Admin</option>
                          </select>
                          <button
                            className={`${btnClass("primary")} w-full`}
                            type="button"
                            disabled={approvingId === a.id}
                            onClick={() => approveAccount(a.id)}
                          >
                            {approvingId === a.id ? "Approving..." : "Approve Account"}
                          </button>
                        </article>
                      ))}
                    </div>

                    <div className={`${ui.tableWrap} hidden md:block`}>
                      <table className={ui.table}>
                        <thead><tr><th className={ui.th}>Name</th><th className={ui.th}>Business</th><th className={ui.th}>Phone</th><th className={ui.th}>Role</th><th className={ui.th}>Action</th></tr></thead>
                        <tbody>
                          {pendingPaged.items.map((a) => (
                            <tr key={a.id} className={pendingRowClass(true)}>
                              <td className={ui.td}>{a.name}</td>
                              <td className={ui.td}>{a.business}</td>
                              <td className={ui.td}>{formatPhone(a.phone)}</td>
                              <td className={ui.td}>
                                <select className={ui.input} value={a.role || "CUSTOMER"} onChange={(e) => changeRole(a.id, e.target.value)}>
                                  <option value="CUSTOMER">Customer</option>
                                  <option value="ADMIN">Admin</option>
                                  <option value="BOTH">Customer + Admin</option>
                                </select>
                              </td>
                              <td className={ui.td}>
                                <button
                                  className={btnClass("primary", true)}
                                  type="button"
                                  disabled={approvingId === a.id}
                                  onClick={() => approveAccount(a.id)}
                                >
                                  {approvingId === a.id ? "..." : "Approve"}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
                <AdminPagination page={pendingPaged.page} totalPages={pendingPaged.totalPages} total={pendingPaged.total} onPageChange={setPendingPage} />
              </section>

              <section className={ui.adminCard}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className={ui.adminH3}>All Accounts ({accounts.length})</h3>
                  <div className="w-full sm:w-64">
                    <AdminSearchBar value={accountsSearch} onChange={setAccountsSearch} placeholder="Search accounts..." />
                  </div>
                </div>
                <div className={ui.tableWrap}>
                  <table className={ui.table}>
                    <thead><tr><th className={ui.th}>Business</th><th className={ui.th}>Phone</th><th className={ui.th}>Status</th><th className={ui.th}>Role</th><th className={ui.th}>Action</th></tr></thead>
                    <tbody>
                      {accountsPaged.items.length === 0 ? <tr><td className={ui.td} colSpan="5">No accounts</td></tr> : accountsPaged.items.map((a) => (
                        <tr key={a.id} className={pendingRowClass(a.status === "PENDING")}>
                          <td className={ui.td}>{a.business}</td>
                          <td className={ui.td}>{formatPhone(a.phone)}</td>
                          <td className={ui.td}>
                            <span className={accountStatusClass(a.status)}>{a.status}</span>
                          </td>
                          <td className={ui.td}>
                            <select className={ui.input} value={a.role || "CUSTOMER"} onChange={(e) => changeRole(a.id, e.target.value)}>
                              <option value="CUSTOMER">Customer</option>
                              <option value="ADMIN">Admin</option>
                              <option value="BOTH">Customer + Admin</option>
                            </select>
                          </td>
                          <td className={ui.td}>
                            {a.status === "PENDING" ? (
                              <button
                                className={btnClass("primary", true)}
                                type="button"
                                disabled={approvingId === a.id}
                                onClick={() => approveAccount(a.id)}
                              >
                                {approvingId === a.id ? "..." : "Approve"}
                              </button>
                            ) : (
                              <span className={ui.muted}>—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <AdminPagination page={accountsPaged.page} totalPages={accountsPaged.totalPages} total={accountsPaged.total} onPageChange={setAccountsPage} />
              </section>
            </div>
          )}

          {activeTab === "catalog" && <AdminOrderCatalogSection />}

          {activeTab === "payments" && (
            <section className={`${ui.adminCard} ${payments.length > 0 ? "border-red-200" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className={pendingSectionTitleClass(payments.length > 0)}>
                  Pending Payments ({payments.length})
                </h3>
                <div className="w-full sm:w-64">
                  <AdminSearchBar value={paymentsSearch} onChange={setPaymentsSearch} placeholder="Search payments..." />
                </div>
              </div>
              <div className={ui.tableWrap}>
                <table className={ui.table}>
                  <thead><tr><th className={ui.th}>Business</th><th className={ui.th}>Amount</th><th className={ui.th}></th></tr></thead>
                  <tbody>
                    {paymentsPaged.items.length === 0 ? <tr><td className={ui.td} colSpan="3">No pending payments</td></tr> : paymentsPaged.items.map((p) => (
                      <tr key={p.id} className={pendingRowClass(true)}>
                        <td className={ui.td}>{p.account?.business}</td>
                        <td className={`${ui.td} font-semibold text-red-600`}>{formatRupees(p.amount)}</td>
                        <td className={ui.td}>
                          <div className="flex flex-wrap gap-2">
                            <button className={btnClass("primary", true)} type="button" onClick={async () => {
                              try {
                                await adminApi.approveWallet(p.id);
                                toast.success("Payment approved.");
                                load();
                              } catch (error) {
                                toast.error(error.message);
                              }
                            }}>Approve</button>
                            <button className={btnClass("ghost", true)} type="button" onClick={async () => {
                              try {
                                await adminApi.rejectWallet(p.id);
                                toast.success("Payment rejected.");
                                load();
                              } catch (error) {
                                toast.error(error.message);
                              }
                            }}>Reject</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <AdminPagination page={paymentsPaged.page} totalPages={paymentsPaged.totalPages} total={paymentsPaged.total} onPageChange={setPaymentsPage} />
            </section>
          )}

          {activeTab === "orders" && (
            <section className={`${ui.adminCard} ${navCounts.orders > 0 ? "border-red-200" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className={pendingSectionTitleClass(navCounts.orders > 0)}>
                  Orders ({orders.length})
                  {navCounts.orders > 0 && (
                    <span className="ml-2 text-sm font-normal">— {navCounts.orders} remaining</span>
                  )}
                </h3>
                <div className="w-full sm:w-64">
                  <AdminSearchBar value={ordersSearch} onChange={setOrdersSearch} placeholder="Search orders..." />
                </div>
              </div>
              <div className={ui.tableWrap}>
                <table className={ui.table}>
                  <thead><tr><th className={ui.th}>Order #</th><th className={ui.th}>Customer</th><th className={ui.th}>Paper / Size</th><th className={ui.th}>Qty</th><th className={ui.th}>Amount</th><th className={ui.th}>Status</th><th className={ui.th}>File</th><th className={ui.th}></th></tr></thead>
                  <tbody>
                    {ordersPaged.items.length === 0 ? <tr><td className={ui.td} colSpan="8">No orders</td></tr> : ordersPaged.items.map((o) => {
                      const status = String(o.status || "").toUpperCase();
                      const canDispatch = status !== "DISPATCHED" && status !== "COMPLETED";
                      const canDeliver = status === "DISPATCHED";
                      const isPending = isOrderPending(o.status);
                      const isDispatching = orderActionId === `dispatch-${o.id}`;
                      const isDelivering = orderActionId === `deliver-${o.id}`;

                      return (
                        <tr key={o.id} className={pendingRowClass(isPending)}>
                          <td className={ui.td}>{o.orderNumber || "—"}</td>
                          <td className={ui.td}>
                            <strong className="block">{o.customerName || o.business}</strong>
                            <span className={`${ui.small} ${ui.muted}`}>{o.business}</span>
                          </td>
                          <td className={ui.td}>{o.paperGsm}, {o.size}</td>
                          <td className={ui.td}>{o.quantity || "—"}</td>
                          <td className={ui.td}>{formatRupees(o.amount)}</td>
                          <td className={ui.td}>
                            <span className={orderStatusClass(o.status)}>{formatOrderStatus(o.status)}</span>
                            {o.lrNumber ? (
                              <span className={`mt-1 block ${ui.small} ${ui.muted}`}>LR: {o.lrNumber}</span>
                            ) : null}
                          </td>
                          <td className={ui.td}>{o.artworkUrl ? <a href={`${API_URL}${o.artworkUrl}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Download</a> : "—"}</td>
                          <td className={ui.td}>
                            {status === "COMPLETED" ? (
                              <span className={ui.muted}>Done</span>
                            ) : (
                              <div className="flex min-w-[11rem] flex-col gap-2 sm:min-w-0 sm:flex-row sm:flex-wrap">
                                <button
                                  className={btnClass(canDispatch ? "primary" : "ghost", true)}
                                  type="button"
                                  disabled={!canDispatch || isDispatching || isDelivering}
                                  onClick={() => dispatchOrder(o.id)}
                                >
                                  {isDispatching ? "Dispatching..." : "Dispatch"}
                                </button>
                                <button
                                  className={btnClass(canDeliver ? "secondary" : "ghost", true)}
                                  type="button"
                                  disabled={!canDeliver || isDispatching || isDelivering}
                                  onClick={() => deliverOrder(o.id)}
                                >
                                  {isDelivering ? "Saving..." : "Delivered"}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <AdminPagination page={ordersPaged.page} totalPages={ordersPaged.totalPages} total={ordersPaged.total} onPageChange={setOrdersPage} />
            </section>
          )}

          {activeTab === "qr" && <AdminQrSection />}
        </div>
      </main>
    </>
  );
}
