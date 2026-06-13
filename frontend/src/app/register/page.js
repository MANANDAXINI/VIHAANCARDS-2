"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { authApi } from "@/lib/api";
import { validateRegister } from "@/lib/auth-validation";
import { useAuthUser } from "@/context/AuthContext";
import { getHomeForUser } from "@/lib/redirect";
import { toast } from "@/lib/toast";
import { btnClass, ui } from "@/lib/ui";

export default function RegisterPage() {
  const router = useRouter();
  const user = useAuthUser();
  const [form, setForm] = useState({ name: "", business: "", phone: "", password: "", address: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validation = validateRegister(form);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      toast.error("Please fix the errors below.");
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      const data = await authApi.register({
        name: validation.name,
        business: validation.business,
        phone: validation.mobile,
        password: form.password,
        address: form.address.trim(),
      }, { silent: true });
      toast.success(data.message);
      setTimeout(() => router.push("/#login"), 2000);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <SiteHeader user={user} />
      <main className={ui.page}>
        <div className={ui.pageNarrow}>
          <h1 className={ui.h1}>Register</h1>
          <p className={ui.muted}>Fill details. Admin will approve your account. Same mobile can register multiple businesses — use a different business name each time.</p>

          <div className={ui.card}>
            <GoogleSignInButton
              label="Sign up with Google"
              onSuccess={(data) => router.push(getHomeForUser(data.account))}
              onError={() => {}}
            />
            <div className={ui.divider}>or register with mobile</div>

            <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
              <div className={ui.field}>
                <label className={ui.label}>Name</label>
                <input className={`${ui.input} ${fieldErrors.name ? ui.inputError : ""}`} value={form.name} onChange={(e) => update("name", e.target.value)} />
                {fieldErrors.name && <p className={ui.fieldError}>{fieldErrors.name}</p>}
              </div>
              <div className={ui.field}>
                <label className={ui.label}>Business Name</label>
                <input className={`${ui.input} ${fieldErrors.business ? ui.inputError : ""}`} value={form.business} onChange={(e) => update("business", e.target.value)} />
                {fieldErrors.business && <p className={ui.fieldError}>{fieldErrors.business}</p>}
              </div>
              <div className={ui.field}>
                <label className={ui.label}>Mobile (10 digits)</label>
                <input
                  className={`${ui.input} ${fieldErrors.phone ? ui.inputError : ""}`}
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="9876543210"
                />
                {fieldErrors.phone && <p className={ui.fieldError}>{fieldErrors.phone}</p>}
              </div>
              <div className={ui.field}>
                <label className={ui.label}>City</label>
                <input className={ui.input} value={form.address} onChange={(e) => update("address", e.target.value)} />
              </div>
              <div className={ui.field}>
                <label className={ui.label}>Password</label>
                <input className={`${ui.input} ${fieldErrors.password ? ui.inputError : ""}`} type="password" value={form.password} onChange={(e) => update("password", e.target.value)} />
                {fieldErrors.password && <p className={ui.fieldError}>{fieldErrors.password}</p>}
              </div>
              <button className={btnClass("primary")} type="submit" disabled={submitting}>
                {submitting ? "Please wait..." : "Register"}
              </button>
            </form>

            <p className={`${ui.muted} ${ui.small}`}><Link href="/#login" className="text-blue-600 hover:underline">Already have account? Login</Link></p>
          </div>
        </div>
      </main>
    </>
  );
}
