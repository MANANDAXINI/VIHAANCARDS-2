"use client";

import { tabClass, pendingCountClass, ui } from "@/lib/ui";

const ADMIN_TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "day-book", label: "Day Book" },
  { id: "accounts", label: "Users & Accounts", countKey: "accounts" },
  { id: "catalog", label: "Order Catalog" },
  { id: "rates", label: "Rates" },
  { id: "payments", label: "Payment Requests", countKey: "payments" },
  { id: "payment", label: "Receipt" },
  { id: "outstanding", label: "Outstanding" },
  { id: "customer-credit", label: "Customer Credit" },
  { id: "orders", label: "Orders", countKey: "orders" },
  { id: "qr", label: "Payment QR" },
  { id: "parcel", label: "Parcel Update" },
  { id: "job-update", label: "Job Update" },
];

export default function AdminNav({ active, onChange, counts = {} }) {
  return (
    <nav className="sticky top-[60px] z-20 -mx-1 border-b border-slate-200 bg-slate-50 py-2 sm:top-[72px]" aria-label="Admin sections">
      <div className={`${ui.navTabsScroll} w-full`}>
        {ADMIN_TABS.map((tab) => {
          const count = tab.countKey ? counts[tab.countKey] : null;
          const hasPending = count != null && count > 0;
          return (
            <button
              key={tab.id}
              type="button"
              className={tabClass(active === tab.id)}
              onClick={() => onChange(tab.id)}
            >
              {tab.label}
              {hasPending && (
                <span className={`ml-1.5 ${pendingCountClass()}`}>({count})</span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export { ADMIN_TABS };
