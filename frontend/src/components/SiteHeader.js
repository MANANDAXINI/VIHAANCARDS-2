"use client";

import Link from "next/link";
import CustomerNav from "@/components/CustomerNav";
import { useLogout } from "@/hooks/useLogout";
import { btnClass } from "@/lib/ui";
import { isCustomer } from "@/lib/redirect";

export default function SiteHeader({ user }) {
  const handleLogout = useLogout();
  const customerAccess = isCustomer(user);
  const hideNavOnMobile = Boolean(user && customerAccess);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white pt-safe">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 md:gap-4 md:px-6 max-[900px]:grid-cols-[1fr_auto] max-[900px]:[grid-template-areas:'brand_actions'_'nav_nav']">
        <Link href="/" className="inline-flex min-w-0 items-center gap-2.5 font-bold max-[900px]:[grid-area:brand]">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-600 text-xs text-white">PD</span>
          <span className="truncate text-sm max-[560px]:hidden">PIXEL DIGITAL</span>
        </Link>

        <div
          className={`flex min-w-0 justify-center max-[900px]:[grid-area:nav] max-[900px]:justify-start max-[900px]:overflow-x-auto max-[900px]:scrollbar-none ${hideNavOnMobile ? "max-[560px]:hidden" : ""}`}
        >
          <CustomerNav user={user} />
        </div>

        <div className="flex shrink-0 justify-end gap-2 max-[900px]:[grid-area:actions]">
          {user ? (
            <button type="button" className={btnClass("ghost", true)} onClick={handleLogout}>Logout</button>
          ) : null}
        </div>
      </div>

      {user && customerAccess && (
        <div className="hidden gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2 max-[560px]:flex">
          <Link href="/order" className={`${btnClass("primary", true)} flex-1`}>Order</Link>
          <Link href="/payment/outstanding" className={`${btnClass("amber", true)} flex-1`}>Pay</Link>
          <Link href="/account" className={`${btnClass("ghost", true)} flex-1`}>Orders</Link>
          <Link href="/profile" className={`${btnClass("ghost", true)} flex-1`}>Profile</Link>
        </div>
      )}
    </header>
  );
}
