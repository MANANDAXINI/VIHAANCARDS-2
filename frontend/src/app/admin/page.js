"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AdminDashboard from "@/components/AdminDashboard";
import { AdminHeader } from "@/components/AdminHeader";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import AdminNav from "@/components/AdminNav";
import { AdminPagination, AdminSearchBar, useAdminTableState } from "@/components/AdminTableTools";
import BusinessPickList from "@/components/BusinessPickList";
import {
  AdminPaperTypesSection,
  AdminPrintingSidesSection,
  AdminQrSection,
  AdminSizesSection,
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

  if (!ready || !user || !isAdmin(user)) {
    return (
      <>
        <AdminHeader user={user} onLogout={handleLogout} />
        <main className={`${ui.page} text-sm`}>
          <div className="mx-auto w-full max-w-md px-4">
            {!ready ? (
              <p className={`text-center ${ui.muted}`}>Loading...</p>
            ) : (
              <>
                <div className="mb-5 text-center">
                  <h1 className={ui.adminH1}>Admin Dashboard</h1>
                  <p className={`mt-1.5 text-sm ${ui.muted}`}>Sign in to manage orders, payments, and catalog.</p>
                </div>

                {user && !isAdmin(user) && (
                  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Logged in as <strong>{user.business}</strong> ({roleLabel(user.role)}).
                    Use an admin account to continue.
                    <button type="button" className={`${btnClass("ghost")} mt-2`} onClick={handleLogout}>Logout</button>
                  </div>
                )}

                <div className={ui.adminCard}>
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
                </div>
              </>
            )}
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

  const ordersFiltered = filterItems(orders, ordersSearch, ["orderNumber", "business", "paperGsm", "size", "status", "amount"]);
  const ordersPaged = paginateItems(ordersFiltered, ordersPage);

  return (
    <>
      <AdminHeader user={user} onLogout={handleLogout} />
      <main className={`${ui.page} text-sm`}>
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
            />
          )}

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
                <div className={ui.tableWrap}>
                  <table className={ui.table}>
                    <thead><tr><th className={ui.th}>Name</th><th className={ui.th}>Business</th><th className={ui.th}>Phone</th><th className={ui.th}>Role</th><th className={ui.th}></th></tr></thead>
                    <tbody>
                      {pendingPaged.items.length === 0 ? <tr><td className={ui.td} colSpan="5">No pending users</td></tr> : pendingPaged.items.map((a) => (
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
                            <button className={btnClass("primary", true)} type="button" onClick={async () => {
                              try {
                                await adminApi.approveAccount(a.id);
                                toast.success("Account approved.");
                                load();
                              } catch (error) {
                                toast.error(error.message);
                              }
                            }}>Approve</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                    <thead><tr><th className={ui.th}>Business</th><th className={ui.th}>Phone</th><th className={ui.th}>Status</th><th className={ui.th}>Role</th></tr></thead>
                    <tbody>
                      {accountsPaged.items.length === 0 ? <tr><td className={ui.td} colSpan="4">No accounts</td></tr> : accountsPaged.items.map((a) => (
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <AdminPagination page={accountsPaged.page} totalPages={accountsPaged.totalPages} total={accountsPaged.total} onPageChange={setAccountsPage} />
              </section>
            </div>
          )}

          {activeTab === "paper-types" && <AdminPaperTypesSection />}
          {activeTab === "sizes" && <AdminSizesSection />}
          {activeTab === "printing-sides" && <AdminPrintingSidesSection />}

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
                  <thead><tr><th className={ui.th}>Order #</th><th className={ui.th}>Customer</th><th className={ui.th}>Paper / Size</th><th className={ui.th}>Amount</th><th className={ui.th}>Status</th><th className={ui.th}>File</th><th className={ui.th}></th></tr></thead>
                  <tbody>
                    {ordersPaged.items.length === 0 ? <tr><td className={ui.td} colSpan="7">No orders</td></tr> : ordersPaged.items.map((o) => {
                      const status = String(o.status || "").toUpperCase();
                      const canDispatch = status !== "DISPATCHED" && status !== "COMPLETED";
                      const canDeliver = status === "DISPATCHED";
                      const isPending = isOrderPending(o.status);

                      return (
                        <tr key={o.id} className={pendingRowClass(isPending)}>
                          <td className={ui.td}>{o.orderNumber || "—"}</td>
                          <td className={ui.td}>{o.business}</td>
                          <td className={ui.td}>{o.paperGsm}, {o.size}</td>
                          <td className={ui.td}>{formatRupees(o.amount)}</td>
                          <td className={ui.td}>
                            <span className={orderStatusClass(o.status)}>{formatOrderStatus(o.status)}</span>
                          </td>
                          <td className={ui.td}>{o.artworkUrl ? <a href={`${API_URL}${o.artworkUrl}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Download</a> : "—"}</td>
                          <td className={ui.td}>
                            <div className="flex flex-wrap gap-2">
                              {canDispatch && (
                                <button className={btnClass("primary", true)} type="button" onClick={async () => {
                                  const lr = prompt("Enter LR number");
                                  if (!lr) return;
                                  try {
                                    await adminApi.dispatch(o.id, { lrNumber: lr, transportDetails: "", dispatchDate: new Date().toISOString().slice(0, 10) });
                                    toast.success("Order dispatched.");
                                    load();
                                  } catch (error) {
                                    toast.error(error.message);
                                  }
                                }}>Dispatch</button>
                              )}
                              {canDeliver && (
                                <button className={btnClass("secondary", true)} type="button" onClick={async () => {
                                  try {
                                    await adminApi.deliver(o.id);
                                    toast.success("Order marked as delivered.");
                                    load();
                                  } catch (error) {
                                    toast.error(error.message);
                                  }
                                }}>Delivered</button>
                              )}
                            </div>
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
