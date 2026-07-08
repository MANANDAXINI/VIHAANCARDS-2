"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BusinessPickList from "@/components/BusinessPickList";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/lib/api";
import {
  validateForgotPassword,
  validateLogin,
  validateRegister,
  validateResetPassword,
} from "@/lib/auth-validation";
import { getHomeForUser } from "@/lib/redirect";
import { toast } from "@/lib/toast";
import { btnClass, ui } from "@/lib/ui";

const AUTH_VIEWS = {
  LOGIN: "login",
  REGISTER: "register",
  FORGOT_REQUEST: "forgot-request",
  FORGOT_RESET: "forgot-reset",
};

export default function AuthModal({ open, mode = "login", onClose, onModeChange }) {
  const router = useRouter();
  const { login } = useAuth();
  const [authView, setAuthView] = useState(AUTH_VIEWS.LOGIN);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [businessOptions, setBusinessOptions] = useState([]);
  const [forgotBusinessOptions, setForgotBusinessOptions] = useState([]);
  const [forgotAccountId, setForgotAccountId] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [resetCodeHint, setResetCodeHint] = useState("");
  const [registerForm, setRegisterForm] = useState({
    name: "",
    business: "",
    phone: "",
    email: "",
    password: "",
    address: "",
    courierName: "",
    gstNumber: "",
  });
  const [registerErrors, setRegisterErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setAuthView(mode === "register" ? AUTH_VIEWS.REGISTER : AUTH_VIEWS.LOGIN);
  }, [open, mode]);

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

  function switchMode(nextMode) {
    setAuthView(nextMode === "register" ? AUTH_VIEWS.REGISTER : AUTH_VIEWS.LOGIN);
    setFieldErrors({});
    setRegisterErrors({});
    setBusinessOptions([]);
    setForgotBusinessOptions([]);
    onModeChange(nextMode);
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

  function applyForgotResponse(data) {
    setForgotBusinessOptions([]);
    if (data.code) {
      setResetCode(data.code);
      setResetCodeHint(data.code);
      setForgotMessage(
        data.message || `Your reset code is shown below. It expires in ${data.expiresInMinutes || 30} minutes.`
      );
      setAuthView(AUTH_VIEWS.FORGOT_RESET);
      toast.success("Reset code generated.");
      return;
    }
    setResetCode("");
    setResetCodeHint("");
    setForgotMessage(data.message || "If this mobile is registered, enter the reset code you received.");
    setAuthView(AUTH_VIEWS.FORGOT_RESET);
    toast.info(data.message || "If this mobile is registered, a reset code has been generated.");
  }

  async function handleForgotRequest(event) {
    event.preventDefault();
    const validation = validateForgotPassword({ phone });
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      toast.error("Please fix the errors below.");
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      const data = await authApi.forgotPassword(
        {
          phone: validation.mobile,
          ...(forgotAccountId ? { accountId: forgotAccountId } : {}),
        },
        { silent: true }
      );
      if (data.needsBusinessPick) {
        setForgotBusinessOptions(data.accounts || []);
        toast.info(data.message || "Select your business to continue.");
        return;
      }
      applyForgotResponse(data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotBusinessSelect(accountId) {
    setForgotAccountId(accountId);
    setSubmitting(true);
    try {
      const validation = validateForgotPassword({ phone });
      const data = await authApi.forgotPassword(
        { phone: validation.mobile, accountId },
        { silent: true }
      );
      setForgotBusinessOptions([]);
      applyForgotResponse(data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    const validation = validateResetPassword({
      phone,
      code: resetCode,
      password: newPassword,
      confirmPassword,
    });
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      toast.error("Please fix the errors below.");
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      const data = await authApi.resetPassword(
        {
          phone: validation.mobile,
          code: validation.code,
          password: validation.password,
          ...(forgotAccountId ? { accountId: forgotAccountId } : {}),
        },
        { silent: true }
      );
      toast.success(data.message || "Password updated.");
      setResetCode("");
      setNewPassword("");
      setConfirmPassword("");
      setForgotAccountId("");
      setForgotMessage("");
      setResetCodeHint("");
      switchMode("login");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
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
        email: validation.email,
        password: registerForm.password,
        address: registerForm.address.trim(),
        courierName: registerForm.courierName.trim(),
        gstNumber: registerForm.gstNumber.trim(),
      }, { silent: true });
      toast.success(data.message);
      switchMode("login");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  const title = authView === AUTH_VIEWS.REGISTER
    ? "Create account"
    : authView === AUTH_VIEWS.FORGOT_REQUEST
      ? "Forgot password"
      : authView === AUTH_VIEWS.FORGOT_RESET
        ? "Reset password"
        : "Login";

  const subtitle = authView === AUTH_VIEWS.REGISTER
    ? "Register your business. Admin will approve your account."
    : authView === AUTH_VIEWS.FORGOT_REQUEST
      ? "Enter your registered mobile number to get a reset code."
      : authView === AUTH_VIEWS.FORGOT_RESET
        ? "Enter the reset code and choose a new password."
        : "Customers and admin use the same login.";

  const showAuthTabs = authView === AUTH_VIEWS.LOGIN || authView === AUTH_VIEWS.REGISTER;

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
              {title}
            </h2>
            <p className={`mt-1 text-sm ${ui.muted}`}>{subtitle}</p>
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

        {showAuthTabs ? (
          <div className="flex gap-1 border-b border-slate-100 px-5 pt-3 sm:px-6">
            <button
              type="button"
              className={authView === AUTH_VIEWS.LOGIN ? tabBtnActive() : tabBtn()}
              onClick={() => switchMode("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={authView === AUTH_VIEWS.REGISTER ? tabBtnActive() : tabBtn()}
              onClick={() => switchMode("register")}
            >
              Register
            </button>
          </div>
        ) : null}

        <div className="max-h-[min(70vh,640px)] overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          {authView === AUTH_VIEWS.LOGIN ? (
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
                    <div className="flex items-center justify-between gap-2">
                      <label className={ui.label} htmlFor="modal-login-password">Password</label>
                      <button
                        type="button"
                        className="text-xs font-semibold text-blue-600 hover:underline"
                        onClick={() => {
                          setFieldErrors({});
                          setForgotBusinessOptions([]);
                          setForgotAccountId("");
                          setAuthView(AUTH_VIEWS.FORGOT_REQUEST);
                        }}
                      >
                        Forgot password?
                      </button>
                    </div>
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
          ) : authView === AUTH_VIEWS.REGISTER ? (
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
                  <label className={ui.label}>Email</label>
                  <input
                    className={`${ui.input} ${registerErrors.email ? ui.inputError : ""}`}
                    type="email"
                    value={registerForm.email}
                    onChange={(e) => updateRegister("email", e.target.value)}
                    placeholder="you@example.com"
                  />
                  {registerErrors.email
                    ? <p className={ui.fieldError}>{registerErrors.email}</p>
                    : <p className={`${ui.small} ${ui.muted}`}>Use the same email as your Google sign-in to keep one account.</p>}
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
                  <label className={ui.label}>Courier / Garaj Name</label>
                  <input className={ui.input} value={registerForm.courierName} onChange={(e) => updateRegister("courierName", e.target.value)} placeholder="e.g. VRL, Gati, local garaj" />
                </div>
                <div className={ui.field}>
                  <label className={ui.label}>GST No.</label>
                  <input className={ui.input} value={registerForm.gstNumber} onChange={(e) => updateRegister("gstNumber", e.target.value)} placeholder="e.g. 27ABCDE1234F1Z5" />
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
              <p className={`${ui.small} ${ui.muted}`}>
                Already registered?{" "}
                <button type="button" className="font-semibold text-blue-600 hover:underline" onClick={() => switchMode("login")}>
                  Login
                </button>
                {" "}or{" "}
                <button
                  type="button"
                  className="font-semibold text-blue-600 hover:underline"
                  onClick={() => {
                    setPhone(registerForm.phone);
                    setAuthView(AUTH_VIEWS.FORGOT_REQUEST);
                  }}
                >
                  Forgot password
                </button>
              </p>
            </div>
          ) : authView === AUTH_VIEWS.FORGOT_REQUEST ? (
            forgotBusinessOptions.length > 0 ? (
              <BusinessPickList
                accounts={forgotBusinessOptions}
                onSelect={handleForgotBusinessSelect}
                onBack={() => setForgotBusinessOptions([])}
              />
            ) : (
              <form className="grid gap-4" onSubmit={handleForgotRequest} noValidate>
                <div className={ui.field}>
                  <label className={ui.label}>Mobile Number</label>
                  <input
                    className={`${ui.input} ${fieldErrors.phone ? ui.inputError : ""}`}
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                      clearLoginError("phone");
                    }}
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="10-digit mobile number"
                  />
                  {fieldErrors.phone && <p className={ui.fieldError}>{fieldErrors.phone}</p>}
                </div>
                <p className={`${ui.small} ${ui.muted}`}>
                  A 6-digit reset code will be shown on the next step if this mobile is registered.
                </p>
                <button className={`${btnClass("primary")} w-full`} type="submit" disabled={submitting}>
                  {submitting ? "Please wait..." : "Send Reset Code"}
                </button>
                <button
                  type="button"
                  className={`${btnClass("ghost")} w-full`}
                  onClick={() => switchMode("login")}
                >
                  Back to Login
                </button>
              </form>
            )
          ) : (
            <form className="grid gap-4" onSubmit={handleResetPassword} noValidate>
              {forgotMessage ? (
                <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                  {forgotMessage}
                </p>
              ) : null}
              {resetCodeHint ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-center">
                  <p className={`${ui.small} font-medium text-emerald-900`}>Your reset code</p>
                  <p className="mt-1 text-2xl font-bold tracking-[0.35em] text-emerald-950">{resetCodeHint}</p>
                </div>
              ) : null}
              <div className={ui.field}>
                <label className={ui.label}>Mobile Number</label>
                <input className={ui.input} value={phone} readOnly />
              </div>
              <div className={ui.field}>
                <label className={ui.label}>Reset Code</label>
                <input
                  className={`${ui.input} ${fieldErrors.code ? ui.inputError : ""}`}
                  value={resetCode}
                  onChange={(e) => {
                    setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    clearLoginError("code");
                  }}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6-digit code"
                />
                {fieldErrors.code && <p className={ui.fieldError}>{fieldErrors.code}</p>}
              </div>
              <div className={ui.field}>
                <label className={ui.label}>New Password</label>
                <input
                  className={`${ui.input} ${fieldErrors.password ? ui.inputError : ""}`}
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    clearLoginError("password");
                  }}
                />
                {fieldErrors.password && <p className={ui.fieldError}>{fieldErrors.password}</p>}
              </div>
              <div className={ui.field}>
                <label className={ui.label}>Confirm Password</label>
                <input
                  className={`${ui.input} ${fieldErrors.confirmPassword ? ui.inputError : ""}`}
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    clearLoginError("confirmPassword");
                  }}
                />
                {fieldErrors.confirmPassword && <p className={ui.fieldError}>{fieldErrors.confirmPassword}</p>}
              </div>
              <button className={`${btnClass("primary")} w-full`} type="submit" disabled={submitting}>
                {submitting ? "Please wait..." : "Update Password"}
              </button>
              <button
                type="button"
                className={`${btnClass("ghost")} w-full`}
                onClick={() => setAuthView(AUTH_VIEWS.FORGOT_REQUEST)}
              >
                Request New Code
              </button>
            </form>
          )}

          {showAuthTabs ? (
            <p className={`mt-5 text-center ${ui.small} ${ui.muted}`}>
              {authView === AUTH_VIEWS.LOGIN ? (
                <>
                  New customer?{" "}
                  <button type="button" className="font-semibold text-blue-600 hover:underline" onClick={() => switchMode("register")}>
                    Register here
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button type="button" className="font-semibold text-blue-600 hover:underline" onClick={() => switchMode("login")}>
                    Login
                  </button>
                </>
              )}
            </p>
          ) : null}
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
