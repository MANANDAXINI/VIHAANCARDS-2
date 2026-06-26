"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import MakePaymentPanel, { WHATSAPP_NUMBER } from "@/components/MakePaymentPanel";
import SiteHeader from "@/components/SiteHeader";
import { useAuth, useAuthUser } from "@/context/AuthContext";
import { catalogApi, walletApi } from "@/lib/api";
import { computePayableOutstanding } from "@/lib/outstanding";
import { toast } from "@/lib/toast";
import { btnClass, ui } from "@/lib/ui";

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
  const [pendingSubmitted, setPendingSubmitted] = useState(0);

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
        setTotalOutstanding(Number(account?.previousOutstanding || 0));
        setMaxPayable(payable);
        setPayAmount(payable);
        setPendingSubmitted(
          Number(account?.previousOutstanding || 0) - payable
        );
        setQrImageUrl(catalogData.qrImageUrl || null);
      })
      .catch((error) => {
        toast.error(error.message || "Could not load outstanding balance.");
        const payable = computePayableOutstanding(user, []);
        setTotalOutstanding(Number(user?.previousOutstanding || 0));
        setMaxPayable(payable);
        setPayAmount(payable);
      })
      .finally(() => setLoading(false));
  }, [ready, user]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (payAmount <= 0) {
      toast.error("Enter a valid payment amount.");
      return;
    }
    if (payAmount > maxPayable) {
      toast.error(`Payment cannot exceed remaining outstanding of Rs. ${maxPayable.toLocaleString("en-IN")}.`);
      return;
    }

    setSubmitting(true);
    try {
      await walletApi.request({
        amount: payAmount,
        type: "outstanding",
        note: payAmount < totalOutstanding
          ? `Partial outstanding payment (${payAmount} of ${totalOutstanding})`
          : "Outstanding balance payment",
      }, { silent: true });
      await refresh();
      toast.success(`Payment submitted. Send screenshot to ${WHATSAPP_NUMBER}. Status will show Pending until admin approves.`);
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

  if (maxPayable <= 0) {
    return (
      <>
        <SiteHeader user={user} />
        <main className={ui.page}>
          <div className={`${ui.container} grid max-w-lg gap-4`}>
            <h1 className={ui.h1}>Make Payment</h1>
            {pendingSubmitted > 0 ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                You already submitted a payment of Rs. {pendingSubmitted.toLocaleString("en-IN")} for approval.
                It will reflect in your ledger after admin confirms.
              </p>
            ) : (
              <p className={ui.muted}>You have no remaining outstanding balance to pay right now.</p>
            )}
            <div className="flex flex-wrap gap-3">
              <Link href="/account" className={btnClass("primary")}>Back to Account</Link>
              <Link href="/order" className={btnClass("ghost")}>New Order</Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader user={user} />
      <main className={ui.page}>
        <MakePaymentPanel
          user={user}
          amount={payAmount}
          maxAmount={maxPayable}
          outstandingTotal={totalOutstanding}
          amountEditable
          onAmountChange={setPayAmount}
          amountLabel="Outstanding Amount to Pay"
          eyebrow="Outstanding"
          title="Make Payment"
          paymentNote={`Pay any amount up to your remaining outstanding balance. Send your payment screenshot to ${WHATSAPP_NUMBER} for admin approval.`}
          amountHint="You can pay part now (e.g. Rs. 2,500) and the rest later after your job is completed."
          backHref="/account?tab=ledger"
          backLabel="Back to Account"
          submitting={submitting}
          onSubmit={handleSubmit}
          qrImageUrl={qrImageUrl}
        />
      </main>
    </>
  );
}
