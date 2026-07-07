"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import { useAuth, useAuthUser } from "@/context/AuthContext";
import { authApi } from "@/lib/api";
import { isValidIndianMobile } from "@/lib/catalog";
import { toast } from "@/lib/toast";
import { btnClass, ui } from "@/lib/ui";

export default function ProfilePage() {
  const router = useRouter();
  const { setUser, ready } = useAuth();
  const user = useAuthUser();
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (ready && !user) router.replace("/?auth=login");
    if (ready && user?.role === "ADMIN") router.replace("/admin");
  }, [ready, user, router]);

  useEffect(() => {
    if (user) setPhone(user.phone || "");
  }, [user]);

  async function saveProfile(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    const mobile = String(form.get("phone") || "").replace(/\D/g, "");

    if (!isValidIndianMobile(mobile)) {
      toast.error("Enter a valid 10-digit mobile number.");
      return;
    }

    try {
      const data = await authApi.updateAccount({
        name: form.get("name"),
        business: form.get("business"),
        phone: mobile,
        address: form.get("address"),
        courierName: form.get("courierName"),
      }, { silent: true });
      setUser(data.account);
      setPhone(data.account.phone || "");
      toast.success("Profile saved.");
    } catch (error) {
      toast.error(error.message);
    }
  }

  if (!ready || !user) {
    return <div className={`${ui.page} ${ui.container} ${ui.muted}`}>Loading...</div>;
  }

  const needsProfile = user.profileNeedsPhone;

  return (
    <>
      <SiteHeader user={user} />
      <main className={ui.page}>
        <div className={ui.pageNarrow}>
          <h1 className={ui.h1}>My Profile</h1>
          <p className={ui.muted}>Your contact and business details for this account.</p>

          {needsProfile && (
            <p className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Add your mobile number and complete your profile, then save.
            </p>
          )}

          <form className={ui.card} onSubmit={saveProfile}>
            <div className={ui.grid2}>
              <div className={ui.field}>
                <label className={ui.label}>Name</label>
                <input className={ui.input} name="name" defaultValue={user.name} required />
              </div>
              <div className={ui.field}>
                <label className={ui.label}>Business</label>
                <input className={ui.input} name="business" defaultValue={user.business} required />
              </div>
              <div className={ui.field}>
                <label className={ui.label}>Mobile (10 digits)</label>
                <input
                  className={ui.input}
                  name="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="9876543210"
                  maxLength={10}
                  inputMode="numeric"
                  required
                />
              </div>
              <div className={ui.field}>
                <label className={ui.label}>City</label>
                <input className={ui.input} name="address" defaultValue={user.address} />
              </div>
              <div className={ui.field}>
                <label className={ui.label}>Courier / Garaj Name</label>
                <input className={ui.input} name="courierName" defaultValue={user.courierName} placeholder="e.g. VRL, Gati, local garaj" />
              </div>
            </div>
            <button className={btnClass("primary")} type="submit">Save Profile</button>
          </form>

          {!needsProfile && user.status === "APPROVED" && (
            <Link href="/order" className={btnClass("ghost")}>Go to Place Order</Link>
          )}
        </div>
      </main>
    </>
  );
}
