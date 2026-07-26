"use client";

import Link from "next/link";
import { btnClass } from "@/lib/ui";

export const CREDIT_REMINDER_IMAGE = "/images/credit-reminder.png";

/** Outstanding has reached / crossed the admin reminder credit limit. */
export function isCreditReminderDue(account) {
  const reminder = Number(account?.reminderCreditLimit || 0);
  if (!Number.isFinite(reminder) || reminder <= 0) return false;
  const outstanding = Number(account?.previousOutstanding || 0);
  return outstanding >= reminder;
}

/**
 * Full-screen reminder shown on Place Order when outstanding crosses reminder limit.
 */
export default function CreditReminderModal({
  open,
  onClose,
  imageSrc = CREDIT_REMINDER_IMAGE,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Credit reminder"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <button
          type="button"
          className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-lg font-bold text-slate-700 shadow"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <img
          src={imageSrc}
          alt="Aapka Credit Limit khatam hone aya hai — Part Payment ya Full Payment kare"
          className="block w-full object-contain"
        />
        <div className="grid gap-2 border-t border-slate-100 px-4 py-3">
          <Link href="/payment/outstanding" className={`${btnClass("primary")} w-full text-center`}>
            Make Payment
          </Link>
          <button
            type="button"
            className={`${btnClass("ghost")} w-full border border-amber-400`}
            onClick={onClose}
          >
            Skip this and continue to Order
          </button>
        </div>
      </div>
    </div>
  );
}
