"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import { useAuth, useAuthUser } from "@/context/AuthContext";
import { feedbackApi } from "@/lib/api";
import { toast } from "@/lib/toast";
import { btnClass, ui } from "@/lib/ui";

export default function ComplaintPage() {
  const router = useRouter();
  const { ready } = useAuth();
  const user = useAuthUser();
  const [type, setType] = useState("complaint");
  const [jobDetails, setJobDetails] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/?auth=login");
    if (user?.role === "ADMIN") router.replace("/admin");
  }, [ready, user, router]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!message.trim()) {
      toast.error("Please write your complaint or suggestion.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await feedbackApi.submit(
        {
          type,
          jobDetails: jobDetails.trim(),
          message: message.trim(),
        },
        { silent: true }
      );
      toast.success(data.message || "Sent successfully.");
      setJobDetails("");
      setMessage("");
      setType("complaint");
      router.push("/account");
    } catch (error) {
      toast.error(error.message || "Could not send. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready || !user) {
    return <div className={`${ui.page} ${ui.container} ${ui.muted}`}>Loading...</div>;
  }

  return (
    <>
      <SiteHeader user={user} />
      <main className={ui.page}>
        <div className={`${ui.pageNarrow} max-w-2xl`}>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className={ui.h1}>Register Complaint / Suggestion</h1>
              <p className={ui.muted}>
                Write your job/order details and message. It will be emailed to PIXEL DIGITAL.
              </p>
            </div>
            <Link href="/account" className={btnClass("secondary")}>
              Back to Orders
            </Link>
          </div>

          <form className={`${ui.card} grid gap-4`} onSubmit={handleSubmit}>
            <div className={ui.field}>
              <label className={ui.label} htmlFor="feedback-type">
                Type
              </label>
              <select
                id="feedback-type"
                className={ui.input}
                value={type}
                onChange={(e) => setType(e.target.value)}
                disabled={submitting}
              >
                <option value="complaint">Complaint</option>
                <option value="suggestion">Suggestion</option>
              </select>
            </div>

            <div className={ui.field}>
              <label className={ui.label} htmlFor="feedback-job">
                Job / Order details
              </label>
              <input
                id="feedback-job"
                className={ui.input}
                value={jobDetails}
                onChange={(e) => setJobDetails(e.target.value)}
                placeholder="e.g. PD-00108, Visiting card, date..."
                disabled={submitting}
                maxLength={500}
              />
              <p className={`${ui.small} ${ui.muted}`}>
                Order number, product, or any job reference you want us to check.
              </p>
            </div>

            <div className={ui.field}>
              <label className={ui.label} htmlFor="feedback-message">
                Your message
              </label>
              <textarea
                id="feedback-message"
                className={`${ui.input} min-h-[10rem] resize-y`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your complaint or suggestion..."
                required
                disabled={submitting}
                maxLength={4000}
              />
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Sending as <strong>{user.business || user.name}</strong>
              {user.phone ? ` · ${user.phone}` : ""}
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="submit" className={btnClass("primary")} disabled={submitting}>
                {submitting ? "Sending..." : "Submit"}
              </button>
              <Link href="/account" className={btnClass("ghost")}>
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
