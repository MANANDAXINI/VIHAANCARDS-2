"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { toast } from "@/lib/toast";
import { btnClass, ui } from "@/lib/ui";

export default function AdminEditUserModal({ account, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: "",
    business: "",
    phone: "",
    email: "",
    address: "",
    courierName: "",
    courierName2: "",
    courierName3: "",
    gstNumber: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!account) return;
    setForm({
      name: account.name || "",
      business: account.business || "",
      phone: account.phone || "",
      email: account.email || "",
      address: account.address || "",
      courierName: account.courierName || "",
      courierName2: account.courierName2 || "",
      courierName3: account.courierName3 || "",
      gstNumber: account.gstNumber || "",
    });
  }, [account]);

  if (!account) return null;

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await adminApi.updateAccountProfile(
        account.id,
        {
          name: form.name.trim(),
          business: form.business.trim(),
          phone: form.phone.replace(/\D/g, ""),
          email: form.email.trim(),
          address: form.address.trim(),
          courierName: form.courierName.trim(),
          courierName2: form.courierName2.trim(),
          courierName3: form.courierName3.trim(),
          gstNumber: form.gstNumber.trim(),
        },
        { silent: true }
      );
      toast.success("User profile updated.");
      onSaved?.();
      onClose?.();
    } catch (error) {
      toast.error(error.message || "Could not update user.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className={ui.adminH3}>Edit User Profile</h3>
          <button type="button" className={btnClass("ghost", true)} onClick={onClose}>Close</button>
        </div>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleSave}>
          <label className={ui.field}>
            <span className={ui.label}>Name</span>
            <input className={ui.input} value={form.name} onChange={(e) => update("name", e.target.value)} required />
          </label>
          <label className={ui.field}>
            <span className={ui.label}>Business</span>
            <input className={ui.input} value={form.business} onChange={(e) => update("business", e.target.value)} required />
          </label>
          <label className={ui.field}>
            <span className={ui.label}>Mobile (10 digits)</span>
            <input
              className={ui.input}
              value={form.phone}
              onChange={(e) => update("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
              maxLength={10}
              inputMode="numeric"
              required
            />
          </label>
          <label className={ui.field}>
            <span className={ui.label}>Email</span>
            <input className={ui.input} type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </label>
          <label className={ui.field}>
            <span className={ui.label}>City</span>
            <input className={ui.input} value={form.address} onChange={(e) => update("address", e.target.value)} />
          </label>
          <label className={ui.field}>
            <span className={ui.label}>GST No.</span>
            <input className={ui.input} value={form.gstNumber} onChange={(e) => update("gstNumber", e.target.value)} />
          </label>
          <label className={ui.field}>
            <span className={ui.label}>Courier / Garaj Name 1</span>
            <input className={ui.input} value={form.courierName} onChange={(e) => update("courierName", e.target.value)} placeholder="e.g. VRL, Gati" />
          </label>
          <label className={ui.field}>
            <span className={ui.label}>Courier / Garaj Name 2</span>
            <input className={ui.input} value={form.courierName2} onChange={(e) => update("courierName2", e.target.value)} placeholder="Optional" />
          </label>
          <label className={`${ui.field} sm:col-span-2`}>
            <span className={ui.label}>Courier / Garaj Name 3</span>
            <input className={ui.input} value={form.courierName3} onChange={(e) => update("courierName3", e.target.value)} placeholder="Optional" />
          </label>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" className={btnClass("secondary")} onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className={btnClass("primary")} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
