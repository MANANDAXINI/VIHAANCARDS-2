"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AdminAlertWatcher from "@/components/AdminAlertWatcher";
import AdminDashboard from "@/components/AdminDashboard";
import AdminDayBook from "@/components/AdminDayBook";
import { AdminHeader } from "@/components/AdminHeader";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import AdminNav from "@/components/AdminNav";
import { AdminPagination, AdminSearchBar, useAdminTableState } from "@/components/AdminTableTools";
import BusinessPickList from "@/components/BusinessPickList";
import AdminCustomerCreditWallet from "@/components/AdminCustomerCreditWallet";
import AdminCustomerCreditOverview from "@/components/AdminCustomerCreditOverview";
import AdminReceivePaymentSection from "@/components/AdminReceivePaymentSection";
import AdminOutstandingSection from "@/components/AdminOutstandingSection";
import AdminCustomerLedgerSection from "@/components/AdminCustomerLedgerSection";
import AdminOtherChargesSection from "@/components/AdminOtherChargesSection";
import AdminOrderCatalogSection from "@/components/AdminOrderCatalogSection";
import AdminOrderProcessingSection from "@/components/AdminOrderProcessingSection";
import AdminRatesSection from "@/components/AdminRatesSection";
import AdminParcelUpdateSection from "@/components/AdminParcelUpdateSection";
import AdminJobUpdateSection from "@/components/AdminJobUpdateSection";
import {
  AdminQrSection,
  formatPhone,
} from "@/components/AdminCatalogPanel";
import { useAuth, useAuthUser } from "@/context/AuthContext";
import { useLogout } from "@/hooks/useLogout";
import { adminApi, formatRupees } from "@/lib/api";
import { filterItems, paginateItems } from "@/lib/admin-table";
import { isAdmin, roleLabel } from "@/lib/redirect";
import { toast } from "@/lib/toast";
import {
  accountStatusClass,
  btnClass,
  isOrderCompleted,
  isOrderPending,
  pendingCountClass,
  pendingRowClass,
  pendingSectionTitleClass,
  tabClass,
  ui,
} from "@/lib/ui";

function walletRequestTypeLabel(type) {
  if (type === "ORDER_PAYMENT") return "Order Payment";
  if (type === "OUTSTANDING_PAYMENT") return "Outstanding Payment";
  return "Wallet Top-up";
}

function walletRequestSummary(req) {
  if (req.type === "ORDER_PAYMENT" && req.pendingOrderData) {
    const d = req.pendingOrderData;
    return `${d.product || "LEAFLET / PAMPLET"} - ${formatRupees(d.amount || req.amount)}`;
  }
  return walletRequestTypeLabel(req.type);
}

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
  const [pendingPage, setPendingPage] = useState(1);
  const [accountsPage, setAccountsPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [ordersSubTab, setOrdersSubTab] = useState("wallet");
  const [walletRequests, setWalletRequests] = useState([]);
  const [walletSearch, setWalletSearch] = useState("");
  const [walletPage, setWalletPage] = useState(1);
  const [walletActionId, setWalletActionId] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [navCounts, setNavCounts] = useState({
    accounts: 0,
    payments: 0,
    orders: 0,
    completedOrders: 0,
    wallet: 0,
    passwordResets: 0,
  });
  const [passwordResets, setPasswordResets] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useAdminTableState(pendingSearch, setPendingPage);
  useAdminTableState(accountsSearch, setAccountsPage);
  useAdminTableState(paymentsSearch, setPaymentsPage);
  useAdminTableState(walletSearch, setWalletPage);

  useEffect(() => {
    if (isAdmin(user)) load();
  }, [user]);

  async function load() {
    try {
      const [p, a, w, o, countsData, resetData] = await Promise.all([
        adminApi.pendingAccounts(),
        adminApi.accounts(),
        adminApi.walletRequests(),
        adminApi.orders(),
        adminApi.navCounts().catch(() => ({ counts: {} })),
        adminApi.passwordResets().catch(() => ({ resets: [] })),
      ]);
      setPending(p.accounts);
      setAccounts(a.accounts);
      setWalletRequests(w.requests);
      setPayments(w.requests.filter((r) => r.status === "PENDING"));
      setOrders(o.orders);
      setNavCounts(countsData.counts || navCounts);
      setPasswordResets(resetData.resets || []);
    } catch (error) {
      toast.error(error.message);
    }
  }

  const handleAdminAlert = useCallback(() => {
    load();
  }, [user]);

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

  async function approveWalletRequest(id) {
    if (walletActionId) return;
    setWalletActionId(id);
    try {
      await adminApi.approveWallet(id);
      toast.success("Payment verified. Order moved to job process.");
      setActiveTab("orders");
      setOrdersSubTab("pending-orders");
      await load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setWalletActionId(null);
    }
  }

  async function cancelWalletRequest(id) {
    if (walletActionId) return;
    if (!window.confirm("Cancel this payment request?")) return;
    setWalletActionId(id);
    try {
      await adminApi.rejectWallet(id);
      toast.success("Payment request cancelled.");
      await load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setWalletActionId(null);
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

  const pendingOrderCount = orders.filter((o) => isOrderPending(o.status)).length;
  const completedOrderCount = orders.filter((o) => isOrderCompleted(o.status)).length;

  const displayNavCounts = {
    accounts: navCounts.accounts ?? pending.length,
    payments: navCounts.payments ?? payments.length,
    orders: pendingOrderCount,
    completedOrders: completedOrderCount,
    wallet: navCounts.wallet ?? (pending.length + payments.length + (navCounts.passwordResets || 0)),
    passwordResets: navCounts.passwordResets ?? passwordResets.length,
  };

  const pendingFiltered = filterItems(pending, pendingSearch, ["name", "business", "phone", "role"]);
  const pendingPaged = paginateItems(pendingFiltered, pendingPage);

  const accountsFiltered = filterItems(accounts, accountsSearch, ["business", "phone", "status", "role"]);
  const accountsPaged = paginateItems(accountsFiltered, accountsPage);

  const paymentsFiltered = filterItems(payments, paymentsSearch, ["account.business", "amount", "type"]);
  const paymentsPaged = paginateItems(paymentsFiltered, paymentsPage);

  const walletFiltered = filterItems(walletRequests, walletSearch, ["account.business", "account.phone", "amount", "type", "status"]);
  const walletPaged = paginateItems(walletFiltered, walletPage);

  return (
    <>
      <AdminHeader user={user} onLogout={handleLogout} />
      <main className={`${ui.pageAdminShell} text-sm`}>
        <div className={ui.pageAdmin}>
          <div>
            <h1 className={ui.adminH1}>Admin Dashboard</h1>
            <p className={`text-sm ${ui.muted}`}>Logged in as <strong>{user.business}</strong> — {roleLabel(user.role)}</p>
          </div>

          <AdminAlertWatcher enabled={isAdmin(user)} onNewActivity={handleAdminAlert} />

          <AdminNav active={activeTab} onChange={setActiveTab} counts={displayNavCounts} />

          {activeTab === "dashboard" && (
            <AdminDashboard
              user={user}
              pending={pending}
              accounts={accounts}
              payments={payments}
              orders={orders}
              counts={displayNavCounts}
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
          {activeTab === "rates" && <AdminRatesSection />}

          {activeTab === "payments" && (
            <section className={`${ui.adminCard} ${payments.length > 0 ? "border-red-200" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className={pendingSectionTitleClass(payments.length > 0)}>
                  Wallet Top-up Requests ({payments.length} pending)
                </h3>
                <div className="w-full sm:w-64">
                  <AdminSearchBar value={paymentsSearch} onChange={setPaymentsSearch} placeholder="Search payments..." />
                </div>
              </div>
              <div className={ui.tableWrap}>
                <table className={ui.table}>
                  <thead>
                    <tr>
                      <th className={ui.th}>Customer</th>
                      <th className={ui.th}>Mobile</th>
                      <th className={ui.th}>Amount</th>
                      <th className={ui.th}>Status</th>
                      <th className={ui.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentsPaged.items.length === 0 ? (
                      <tr><td className={ui.td} colSpan="5">No pending payments</td></tr>
                    ) : paymentsPaged.items.map((p) => {
                      const isPending = p.status === "PENDING";
                      const busy = walletActionId === p.id;
                      return (
                        <tr key={p.id} className={pendingRowClass(isPending)}>
                          <td className={ui.td}>{p.account?.business || "—"}</td>
                          <td className={ui.td}>{formatPhone(p.account?.phone)}</td>
                          <td className={`${ui.td} font-semibold`}>{formatRupees(p.amount)}</td>
                          <td className={ui.td}>
                            <strong className={isPending ? "text-slate-900" : "text-emerald-700"}>
                              {isPending ? "Pending" : "Approved"}
                            </strong>
                            <span className={`mt-1 block ${ui.small} ${ui.muted}`}>
                              {walletRequestTypeLabel(p.type)}
                            </span>
                            <span className={`block ${ui.small} ${ui.muted}`}>{walletRequestSummary(p)}</span>
                          </td>
                          <td className={ui.td}>
                            {isPending ? (
                              <div className="flex flex-wrap gap-2">
                                <button
                                  className={btnClass("primary", true)}
                                  type="button"
                                  disabled={busy}
                                  onClick={() => approveWalletRequest(p.id)}
                                >
                                  {busy ? "..." : "Approve"}
                                </button>
                                <button
                                  className={`${btnClass("ghost", true)} !text-red-600`}
                                  type="button"
                                  disabled={busy}
                                  onClick={() => cancelWalletRequest(p.id)}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <span className="font-semibold text-emerald-700">Approved</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <AdminPagination page={paymentsPaged.page} totalPages={paymentsPaged.totalPages} total={paymentsPaged.total} onPageChange={setPaymentsPage} />
            </section>
          )}

          {activeTab === "payment" && (
            <AdminReceivePaymentSection accounts={accounts} onRefresh={load} />
          )}

          {activeTab === "customer-credit" && (
            <div className="grid gap-4">
              <div>
                <h2 className={ui.adminH1}>Customer Credit</h2>
                <p className={ui.muted}>View and manage credit limits, outstanding, and wallet for all customers.</p>
              </div>
              <AdminCustomerCreditOverview accounts={accounts} />
              <AdminCustomerCreditWallet accounts={accounts} onRefresh={load} />
            </div>
          )}

          {activeTab === "other-charges" && (
            <AdminOtherChargesSection accounts={accounts} onRefresh={load} />
          )}

          {activeTab === "orders" && (
            <div className="grid gap-4">
              <div>
                <h2 className={ui.adminH1}>Orders</h2>
                <p className={ui.muted}>All customer orders, artwork files, and payment status appear here.</p>
              </div>

              <div className={`${ui.navTabsScroll} w-full`}>
                {[
                  { id: "wallet", label: "Account / Wallet", countKey: "wallet" },
                  { id: "pending-orders", label: "Pending Orders", countKey: "orders", highlight: true },
                  { id: "completed-orders", label: "Completed Orders", countKey: "completedOrders" },
                ].map((tab) => {
                  const count = tab.countKey ? displayNavCounts[tab.countKey] : null;
                  const showCount = count != null;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      className={tabClass(ordersSubTab === tab.id)}
                      onClick={() => setOrdersSubTab(tab.id)}
                    >
                      {tab.label}
                      {showCount ? (
                        <span className={`ml-1.5 ${tab.highlight && count > 0 ? pendingCountClass() : "text-slate-600"}`}>
                          ({count})
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {ordersSubTab === "wallet" && (
                <>
                  <section className={`${ui.adminCard} ${displayNavCounts.wallet > 0 ? "border-red-200" : ""}`}>
                    <h3 className={pendingSectionTitleClass(displayNavCounts.wallet > 0)}>
                      Account / Wallet Overview
                      {displayNavCounts.wallet > 0 ? (
                        <span className={`ml-2 ${pendingCountClass()}`}>({displayNavCounts.wallet} pending)</span>
                      ) : null}
                    </h3>
                    <p className={`${ui.small} ${ui.muted} px-4 pb-3`}>
                      Pending approvals: {displayNavCounts.accounts} account
                      {displayNavCounts.accounts === 1 ? "" : "s"}
                      {" · "}
                      {displayNavCounts.payments} wallet payment
                      {displayNavCounts.payments === 1 ? "" : "s"}
                      {" · "}
                      {displayNavCounts.passwordResets} password reset
                      {displayNavCounts.passwordResets === 1 ? "" : "s"}
                    </p>
                  </section>

                  {passwordResets.length > 0 ? (
                    <section className={`${ui.adminCard} ${displayNavCounts.passwordResets > 0 ? "border-red-200" : ""}`}>
                      <h3 className={pendingSectionTitleClass(displayNavCounts.passwordResets > 0)}>
                        Password Reset Codes
                      </h3>
                      <p className={`${ui.small} ${ui.muted} mb-3`}>
                        Active password reset requests. Codes expire in 30 minutes.
                      </p>
                      <div className={ui.tableWrap}>
                        <table className={ui.table}>
                          <thead>
                            <tr>
                              <th className={ui.th}>Customer</th>
                              <th className={ui.th}>Mobile</th>
                              <th className={ui.th}>Code</th>
                              <th className={ui.th}>Expires</th>
                            </tr>
                          </thead>
                          <tbody>
                            {passwordResets.map((reset) => (
                              <tr key={reset.id} className={pendingRowClass(true)}>
                                <td className={ui.td}>{reset.account?.business || reset.account?.name || "—"}</td>
                                <td className={ui.td}>{formatPhone(reset.account?.phone)}</td>
                                <td className={`${ui.td} font-bold text-red-700`}>{reset.code}</td>
                                <td className={ui.td}>
                                  {reset.expiresAt ? new Date(reset.expiresAt).toLocaleString("en-IN") : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  ) : null}

                  <section className={`${ui.adminCard} ${pending.length > 0 ? "border-red-200" : ""}`}>
                    <h3 className={pendingSectionTitleClass(pending.length > 0)}>Account Approval Requests</h3>
                    <div className={ui.tableWrap}>
                      <table className={ui.table}>
                        <thead>
                          <tr>
                            <th className={ui.th}>Name</th>
                            <th className={ui.th}>Business</th>
                            <th className={ui.th}>Mobile</th>
                            <th className={ui.th}>Email</th>
                            <th className={ui.th}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pending.length === 0 ? (
                            <tr><td className={ui.td} colSpan="5">No pending requests.</td></tr>
                          ) : pending.map((a) => (
                            <tr key={a.id} className={pendingRowClass(true)}>
                              <td className={ui.td}>{a.name}</td>
                              <td className={ui.td}>{a.business}</td>
                              <td className={ui.td}>{formatPhone(a.phone)}</td>
                              <td className={ui.td}>{a.email || "—"}</td>
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
                  </section>

                  <section className={`${ui.adminCard} ${payments.length > 0 ? "border-red-200" : ""}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className={pendingSectionTitleClass(payments.length > 0)}>Wallet Top-up Requests</h3>
                      <div className="w-full sm:w-64">
                        <AdminSearchBar value={walletSearch} onChange={setWalletSearch} placeholder="Search wallet requests..." />
                      </div>
                    </div>
                    <div className={ui.tableWrap}>
                      <table className={ui.table}>
                        <thead>
                          <tr>
                            <th className={ui.th}>Customer</th>
                            <th className={ui.th}>Mobile</th>
                            <th className={ui.th}>Amount</th>
                            <th className={ui.th}>Status</th>
                            <th className={ui.th}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {walletPaged.items.length === 0 ? (
                            <tr><td className={ui.td} colSpan="5">No wallet requests.</td></tr>
                          ) : walletPaged.items.map((p) => {
                            const isPending = p.status === "PENDING";
                            const busy = walletActionId === p.id;
                            return (
                              <tr key={p.id} className={pendingRowClass(isPending)}>
                                <td className={ui.td}>{p.account?.business || "—"}</td>
                                <td className={ui.td}>{formatPhone(p.account?.phone)}</td>
                                <td className={`${ui.td} font-semibold`}>{formatRupees(p.amount)}</td>
                                <td className={ui.td}>
                                  <strong className={isPending ? "text-slate-900" : "text-emerald-700"}>
                                    {isPending ? "Pending" : p.status === "REJECTED" ? "Cancelled" : "Approved"}
                                  </strong>
                                  <span className={`mt-1 block ${ui.small} ${ui.muted}`}>
                                    {walletRequestTypeLabel(p.type)}
                                  </span>
                                  <span className={`block ${ui.small} ${ui.muted}`}>{walletRequestSummary(p)}</span>
                                </td>
                                <td className={ui.td}>
                                  {isPending ? (
                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        className={btnClass("primary", true)}
                                        type="button"
                                        disabled={busy}
                                        onClick={() => approveWalletRequest(p.id)}
                                      >
                                        {busy ? "..." : "Approve"}
                                      </button>
                                      <button
                                        className={`${btnClass("ghost", true)} !text-red-600`}
                                        type="button"
                                        disabled={busy}
                                        onClick={() => cancelWalletRequest(p.id)}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="font-semibold text-emerald-700">
                                      {p.status === "REJECTED" ? "Cancelled" : "Approved"}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <AdminPagination page={walletPaged.page} totalPages={walletPaged.totalPages} total={walletPaged.total} onPageChange={setWalletPage} />
                  </section>
                </>
              )}

              {(ordersSubTab === "pending-orders" || ordersSubTab === "completed-orders") && (
                <AdminOrderProcessingSection
                  orders={orders}
                  view={ordersSubTab === "completed-orders" ? "completed" : "pending"}
                  onRefresh={load}
                  onOrderDispatched={() => setOrdersSubTab("completed-orders")}
                />
              )}

            </div>
          )}

          {activeTab === "customer-ledger" && (
            <AdminCustomerLedgerSection accounts={accounts} onDataChange={load} />
          )}

          {activeTab === "outstanding" && <AdminOutstandingSection />}

          {activeTab === "qr" && <AdminQrSection />}

          {activeTab === "parcel" && (
            <AdminParcelUpdateSection onRefresh={load} />
          )}

          {activeTab === "job-update" && (
            <AdminJobUpdateSection onRefresh={load} />
          )}
        </div>
      </main>
    </>
  );
}
