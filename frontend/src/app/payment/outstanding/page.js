"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import MakePaymentPanel, { WHATSAPP_NUMBER } from "@/components/MakePaymentPanel";
import SiteHeader from "@/components/SiteHeader";
import { useAuth, useAuthUser } from "@/context/AuthContext";
import { catalogApi, walletApi } from "@/lib/api";
import { computePayableOutstanding } from "@/lib/outstanding";
import { toast } from "@/lib/toast";
import { ui } from "@/lib/ui";

export default function OutstandingPaymentPage() {
  const router = useRouter();
  const { refresh, ready } = useAuth();
  const user = useAuthUser();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [qrImageUrl, setQrImageUrl] = useState(null);
  const [maxPayable, setMaxPayable] = useState(0);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [payAmount, setPayAmount] = useState(0);

  const hasOutstanding = maxPayable > 0;

  useEffect(() => {
    if (ready && !user) router.replace("/?auth=login");
    if (ready && user?.role === "ADMIN") router.replace("/admin");
    if (ready && user?.profileNeedsPhone) router.replace("/profile");
  }, [ready, user, router]);

  useEffect(() => {
    if (!ready || !user) return;

    setLoading(true);
    Promise.all([
      walletApi.ledger(),
      catalogApi.get().catch(() => ({})),
    ])
      .then(([ledgerData, catalogData]) => {
        const account = ledgerData.account || user;
        const pending = ledgerData.pendingOutstandingPayments || [];
        const payable = computePayableOutstanding(account, pending);
        const outstanding = Number(account?.previousOutstanding || 0);
        setTotalOutstanding(outstanding);
        setMaxPayable(payable);
        // Match screenshot: start with empty amount field.
        setPayAmount(0);
        setQrImageUrl(catalogData.qrImageUrl || null);
      })
      .catch((error) => {
        toast.error(error.message || "Could not load outstanding balance.");
        const payable = computePayableOutstanding(user, []);
        setTotalOutstanding(Number(user?.previousOutstanding || 0));
        setMaxPayable(payable);
        setPayAmount(0);
      })
      .finally(() => setLoading(false));
  }, [ready, user]);

  function handleAmountChange(next) {
    if (hasOutstanding) {
      setPayAmount(Math.min(Math.max(0, Number(next) || 0), maxPayable));
      return;
    }
    setPayAmount(Math.max(0, Number(next) || 0));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (payAmount <= 0) {
      toast.error("Enter a valid payment amount.");
      return;
    }
    if (hasOutstanding && payAmount > maxPayable) {
      toast.error(
        `Payment cannot exceed remaining outstanding of Rs. ${maxPayable.toLocaleString("en-IN")}.`
      );
      return;
    }

    setSubmitting(true);
    try {
      if (hasOutstanding) {
        await walletApi.request(
          {
            amount: payAmount,
            type: "outstanding",
            note:
              payAmount < totalOutstanding
                ? `Partial outstanding payment (${payAmount} of ${totalOutstanding})`
                : "Outstanding balance payment",
          },
          { silent: true }
        );
      } else {
        await walletApi.request(
          {
            amount: payAmount,
            type: "wallet",
            note: "Advance payment / wallet top-up",
          },
          { silent: true }
        );
      }
      await refresh();
      toast.success(
        `Payment request submitted. Send screenshot to ${WHATSAPP_NUMBER}. Admin Payment Requests mein dikhega.`
      );
      router.push("/account?tab=ledger");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready || !user || loading) {
    return <div className={`${ui.page} ${ui.container} ${ui.muted}`}>Loading...</div>;
  }

  return (
    <>
      <SiteHeader user={user} />
      <main className={ui.page}>
        <MakePaymentPanel
          amount={payAmount}
          maxAmount={hasOutstanding ? maxPayable : undefined}
          amountEditable
          onAmountChange={handleAmountChange}
          submitting={submitting}
          onSubmit={handleSubmit}
          qrImageUrl={qrImageUrl}
        />
      </main>
    </>
  );
}
