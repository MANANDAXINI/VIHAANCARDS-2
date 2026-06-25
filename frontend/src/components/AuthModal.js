"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BusinessPickList from "@/components/BusinessPickList";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/lib/api";
import { validateLogin, validateRegister } from "@/lib/auth-validation";
import { getHomeForUser } from "@/lib/redirect";
import { toast } from "@/lib/toast";
import { btnClass, ui } from "@/lib/ui";

export default function AuthModal({ open, mode = "login", onClose, onModeChange }) {
  const router = useRouter();
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [businessOptions, setBusinessOptions] = useState([]);
  const [registerForm, setRegisterForm] = useState({
    name: "",
    business: "",
    phone: "",
    password: "",
    address: "",
  });
  const [registerErrors, setRegisterErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  function goAfterLogin(account) {
    onClose();
    router.push(getHomeForUser(account));
  }

  function clearLoginError(key) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function updateRegister(key, value) {
    setRegisterForm((f) => ({ ...f, [key]: value }));
    setRegisterErrors((prev) => {
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
        onClose();
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
        onClose();
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
      onClose();
      return;
    }
    goAfterLogin(data.account);
  }

  async function handleRegister(event) {
    event.preventDefault();
    const validation = validateRegister(registerForm);
    if (!validation.valid) {
      setRegisterErrors(validation.errors);
      toast.error("Please fix the errors below.");
      return;
    }

    setRegisterErrors({});
    setSubmitting(true);
    try {
      const data = await authApi.register({
        name: validation.name,
        business: validation.business,
        phone: validation.mobile,
        password: registerForm.password,
        address: registerForm.address.trim(),
      }, { silent: true });
      toast.success(data.message);
      onModeChange("login");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 pt-[max(5.5rem,env(safe-area-inset-top))] sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="relative z-10 w-full max-w-md animate-[hero-fade-up_0.35s_ease-out] rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
              PIXEL DIGITAL
            </p>
            <h2 id="auth-modal-title" className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
              {mode === "register" ? "Create account" : "Login"}
            </h2>
            <p className={`mt-1 text-sm ${ui.muted}`}>
              {mode === "register"
                ? "Register your business. Admin will approve your account."
                : "Customers and admin use the same login."}
            </p>
          </div>
          <button
            type="button"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex gap-1 border-b border-slate-100 px-5 pt-3 sm:px-6">
          <button
            type="button"
            className={mode === "login" ? tabBtnActive() : tabBtn()}
            onClick={() => onModeChange("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === "register" ? tabBtnActive() : tabBtn()}
            onClick={() => onModeChange("register")}
          >
            Register
          </button>
        </div>

        <div className="max-h-[min(70vh,640px)] overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          {mode === "login" ? (
            businessOptions.length > 0 ? (
              <BusinessPickList
                accounts={businessOptions}
                onSelect={handleBusinessSelect}
                onBack={() => setBusinessOptions([])}
              />
            ) : (
              <div className="grid gap-4">
                <GoogleSignInButton onSuccess={handleGoogleSuccess} onError={() => {}} />
                <div className={ui.divider}>or mobile login</div>
                <form className="grid gap-4" onSubmit={handleLogin} noValidate>
                  <div className={ui.field}>
                    <label className={ui.label} htmlFor="modal-login-phone">Mobile Number</label>
                    <input
                      id="modal-login-phone"
                      className={`${ui.input} ${fieldErrors.phone ? ui.inputError : ""}`}
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                        clearLoginError("phone");
                      }}
                      placeholder="10-digit mobile number"
                      inputMode="numeric"
                      maxLength={10}
                      autoComplete="tel"
                    />
                    {fieldErrors.phone && <p className={ui.fieldError}>{fieldErrors.phone}</p>}
                  </div>
                  <div className={ui.field}>
                    <label className={ui.label} htmlFor="modal-login-password">Password</label>
                    <input
                      id="modal-login-password"
                      className={`${ui.input} ${fieldErrors.password ? ui.inputError : ""}`}
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearLoginError("password");
                      }}
                      placeholder="Your password"
                      autoComplete="current-password"
                    />
                    {fieldErrors.password && <p className={ui.fieldError}>{fieldErrors.password}</p>}
                  </div>
                  <button className={`${btnClass("primary")} w-full`} type="submit" disabled={submitting}>
                    {submitting ? "Please wait..." : "Login"}
                  </button>
                </form>
              </div>
            )
          ) : (
            <div className="grid gap-4">
              <GoogleSignInButton
                label="Sign up with Google"
                onSuccess={(data) => goAfterLogin(data.account)}
                onError={() => {}}
              />
              <div className={ui.divider}>or register with mobile</div>
              <form className="grid gap-4" onSubmit={handleRegister} noValidate>
                <div className={ui.field}>
                  <label className={ui.label}>Name</label>
                  <input className={`${ui.input} ${registerErrors.name ? ui.inputError : ""}`} value={registerForm.name} onChange={(e) => updateRegister("name", e.target.value)} />
                  {registerErrors.name && <p className={ui.fieldError}>{registerErrors.name}</p>}
                </div>
                <div className={ui.field}>
                  <label className={ui.label}>Business Name</label>
                  <input className={`${ui.input} ${registerErrors.business ? ui.inputError : ""}`} value={registerForm.business} onChange={(e) => updateRegister("business", e.target.value)} />
                  {registerErrors.business && <p className={ui.fieldError}>{registerErrors.business}</p>}
                </div>
                <div className={ui.field}>
                  <label className={ui.label}>Mobile (10 digits)</label>
                  <input
                    className={`${ui.input} ${registerErrors.phone ? ui.inputError : ""}`}
                    value={registerForm.phone}
                    onChange={(e) => updateRegister("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="9876543210"
                  />
                  {registerErrors.phone && <p className={ui.fieldError}>{registerErrors.phone}</p>}
                </div>
                <div className={ui.field}>
                  <label className={ui.label}>City</label>
                  <input className={ui.input} value={registerForm.address} onChange={(e) => updateRegister("address", e.target.value)} />
                </div>
                <div className={ui.field}>
                  <label className={ui.label}>Password</label>
                  <input className={`${ui.input} ${registerErrors.password ? ui.inputError : ""}`} type="password" value={registerForm.password} onChange={(e) => updateRegister("password", e.target.value)} />
                  {registerErrors.password && <p className={ui.fieldError}>{registerErrors.password}</p>}
                </div>
                <button className={`${btnClass("primary")} w-full`} type="submit" disabled={submitting}>
                  {submitting ? "Please wait..." : "Register"}
                </button>
              </form>
            </div>
          )}

          <p className={`mt-5 text-center ${ui.small} ${ui.muted}`}>
            {mode === "login" ? (
              <>
                New customer?{" "}
                <button type="button" className="font-semibold text-blue-600 hover:underline" onClick={() => onModeChange("register")}>
                  Register here
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button type="button" className="font-semibold text-blue-600 hover:underline" onClick={() => onModeChange("login")}>
                  Login
                </button>
              </>
            )}
            <br />
            Admin? <Link href="/admin" className="font-semibold text-blue-600 hover:underline" onClick={onClose}>Go to Admin Panel</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function tabBtn() {
  return "flex-1 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900";
}

function tabBtnActive() {
  return "flex-1 rounded-lg bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700 ring-1 ring-blue-100";
}
