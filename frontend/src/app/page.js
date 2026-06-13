"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import BusinessPickList from "@/components/BusinessPickList";
import { useAuth, useAuthUser } from "@/context/AuthContext";
import { validateLogin } from "@/lib/auth-validation";
import { getHomeForUser } from "@/lib/redirect";
import { toast } from "@/lib/toast";
import { btnClass, heroBtnPrimary, heroBtnSecondary, ui } from "@/lib/ui";

const HIGHLIGHTS = [
  { title: "Leaflets & Pamphlets", desc: "Upload artwork, pick paper & size, order online." },
  { title: "Visiting Cards", desc: "Premium finishes with fast turnaround." },
  { title: "Track & Pay", desc: "UPI payment, wallet credit, order status in one place." },
];

function HomeContent() {
  const { login } = useAuth();
  const user = useAuthUser();
  const router = useRouter();
  const params = useSearchParams();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [businessOptions, setBusinessOptions] = useState([]);

  const showPending = params.get("pending") === "1" || user?.status === "PENDING";
  const isApprovedCustomer = user && user.role === "CUSTOMER" && user.status === "APPROVED";

  function goAfterLogin(account) {
    router.push(getHomeForUser(account));
  }

  function clearFieldError(key) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function handleLogin(event) {
    event.preventDefault();

    const validation = validateLogin({ phone, password });
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      toast.error("Please fix the errors below.");
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      const data = await login(validation.mobile, password);
      if (data.needsBusinessPick) {
        setBusinessOptions(data.accounts || []);
        toast.info(data.message || "Select your business to continue.");
        return;
      }
      if (data.pendingApproval || data.account?.status === "PENDING") {
        toast.info("Logged in. Waiting for admin to approve your account.");
        return;
      }
      toast.success("Logged in successfully.");
      goAfterLogin(data.account);
    } catch (error) {
      toast.error(error.message || "Login failed. Check mobile and password.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBusinessSelect(accountId) {
    setSubmitting(true);
    try {
      const validation = validateLogin({ phone, password });
      const data = await login(validation.mobile, password, accountId);
      if (data.pendingApproval || data.account?.status === "PENDING") {
        toast.info("Logged in. Waiting for admin to approve your account.");
        setBusinessOptions([]);
        return;
      }
      setBusinessOptions([]);
      toast.success("Logged in successfully.");
      goAfterLogin(data.account);
    } catch (error) {
      toast.error(error.message || "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleGoogleSuccess(data) {
    setFieldErrors({});
    if (data.pendingApproval || data.account?.status === "PENDING") {
      toast.info("Logged in. Waiting for admin to approve your account.");
      return;
    }
    goAfterLogin(data.account);
  }

  function handleGoogleError() {
    // GoogleSignInButton already shows toast
  }

  return (
    <>
      <SiteHeader user={user} />

      <main className="min-h-screen bg-slate-50 text-slate-900">
        <section
          className="bg-gradient-to-br from-blue-900 via-blue-600 to-blue-500 px-4 pb-14 pt-32 text-center text-white max-[900px]:pt-40 max-[560px]:pt-44"
          id="home"
        >
          <div className={`${ui.container} grid gap-6`}>
            <span className="mx-auto inline-block rounded-full border border-white/20 bg-white/15 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide">
              B2B Printing Portal
            </span>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">PIXEL DIGITAL</h1>
            <p className="mx-auto max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">
              Professional print orders for your business — leaflets, visiting cards, and more.
              Register once, get approved, and place orders online.
            </p>

            {isApprovedCustomer ? (
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/order" className={heroBtnPrimary()}>Place Order</Link>
                <Link href="/account" className={heroBtnSecondary()}>My Orders</Link>
              </div>
            ) : !user ? (
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/register" className={heroBtnPrimary()}>Create Account</Link>
                <a href="#login" className={heroBtnSecondary()}>Login</a>
              </div>
            ) : (
              <p className="text-white/95">Welcome back, <strong>{user.business || user.name}</strong></p>
            )}

            <div className="mx-auto grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { label: "Online", sub: "Order placement" },
                { label: "UPI", sub: "Easy payments" },
                { label: "Track", sub: "Order status" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-white/20 bg-white/10 px-3 py-3">
                  <strong className="block text-sm">{item.label}</strong>
                  <span className="text-xs text-white/80">{item.sub}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-10">
          <div className={`${ui.container} grid gap-4 sm:grid-cols-3`}>
            {HIGHLIGHTS.map((item) => (
              <article key={item.title} className={ui.card}>
                <h3 className={ui.h3}>{item.title}</h3>
                <p className={ui.muted}>{item.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="py-10">
          <div className={`${ui.container}`}>
            <div className={ui.card}>
              <h2 className="text-xl font-bold">How it works</h2>
              <ol className="grid list-decimal gap-2 pl-5 text-sm leading-relaxed">
                <li><strong>Register</strong> — fill your business details</li>
                <li><strong>Admin approves</strong> — you get access</li>
                <li><strong>Place order</strong> — pick paper, upload file, pay</li>
                <li><strong>Track</strong> — see status in My Account</li>
              </ol>
            </div>
          </div>
        </section>

        {showPending && user && (
          <section className="py-4">
            <div className={ui.container}>
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Your account is waiting for admin approval. You cannot place orders yet.
              </p>
            </div>
          </section>
        )}

        {!user && (
          <section className="py-10" id="login">
            <div className={`${ui.pageNarrow} max-w-lg`}>
              <h2 className={ui.h1}>Login</h2>
              <p className={ui.muted}>Customers and admin use the same login page.</p>

              <div className={`${ui.card} mt-4`}>
                {businessOptions.length > 0 ? (
                  <BusinessPickList
                    accounts={businessOptions}
                    onSelect={handleBusinessSelect}
                    onBack={() => setBusinessOptions([])}
                  />
                ) : (
                  <>
                    <GoogleSignInButton onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
                    <div className={ui.divider}>or mobile login</div>

                    <form className="grid gap-4" onSubmit={handleLogin} noValidate>
                      <div className={ui.field}>
                        <label className={ui.label} htmlFor="login-phone">Mobile Number</label>
                        <input
                          id="login-phone"
                          className={`${ui.input} ${fieldErrors.phone ? ui.inputError : ""}`}
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                            clearFieldError("phone");
                          }}
                          placeholder="10-digit mobile number"
                          inputMode="numeric"
                          maxLength={10}
                          autoComplete="tel"
                        />
                        {fieldErrors.phone && <p className={ui.fieldError}>{fieldErrors.phone}</p>}
                      </div>
                      <div className={ui.field}>
                        <label className={ui.label} htmlFor="login-password">Password</label>
                        <input
                          id="login-password"
                          className={`${ui.input} ${fieldErrors.password ? ui.inputError : ""}`}
                          type="password"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            clearFieldError("password");
                          }}
                          placeholder="Your password"
                          autoComplete="current-password"
                        />
                        {fieldErrors.password && <p className={ui.fieldError}>{fieldErrors.password}</p>}
                      </div>
                      <button className={btnClass("primary")} type="submit" disabled={submitting}>
                        {submitting ? "Please wait..." : "Login"}
                      </button>
                    </form>
                  </>
                )}

                <p className={`${ui.muted} ${ui.small}`}>
                  New customer? <Link href="/register" className="text-blue-600 hover:underline">Register here</Link>
                  <br />
                  Same mobile for multiple businesses? Register each business separately.
                  <br />
                  Admin? <Link href="/admin" className="text-blue-600 hover:underline">Go to Admin Panel</Link>
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="py-10">
          <div className={ui.container}>
            <div className={ui.card}>
              <p>Payment screenshot send to: <strong>7507543214</strong></p>
              <p className={`${ui.muted} ${ui.small}`}>Need help? Register first — admin will approve your account.</p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
