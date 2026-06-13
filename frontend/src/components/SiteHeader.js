"use client";

import Link from "next/link";
import CustomerNav from "@/components/CustomerNav";
import { useLogout } from "@/hooks/useLogout";
import { btnClass } from "@/lib/ui";
import { isAdmin, isCustomer } from "@/lib/redirect";

export default function SiteHeader({ user }) {
  const handleLogout = useLogout();
  const adminAccess = isAdmin(user);
  const customerAccess = isCustomer(user);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-3 md:px-6 max-[900px]:grid-cols-[1fr_auto] max-[900px]:[grid-template-areas:'brand_actions'_'nav_nav']">
        <Link href="/" className="inline-flex items-center gap-2.5 font-bold whitespace-nowrap max-[900px]:[grid-area:brand]">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-600 text-xs text-white">PD</span>
          <span className="text-sm max-[560px]:hidden">PIXEL DIGITAL</span>
        </Link>

        <div className="flex min-w-0 justify-center max-[900px]:[grid-area:nav] max-[900px]:justify-start max-[900px]:overflow-x-auto">
          <CustomerNav user={user} />
        </div>

        <div className="flex justify-end gap-2 max-[900px]:[grid-area:actions]">
          {user ? (
            <>
              {adminAccess && (
                <Link href="/admin" className={btnClass("ghost", true)}>Admin</Link>
              )}
              <button type="button" className={btnClass("ghost", true)} onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <Link href="/admin" className={btnClass("ghost", true)}>Admin</Link>
          )}
        </div>
      </div>

      {user && customerAccess && (
        <div className="hidden gap-2 overflow-x-auto border-t border-slate-200 bg-slate-50 px-4 py-2 max-[560px]:flex">
          <Link href="/order" className={btnClass("primary", true)}>Order</Link>
          <Link href="/account" className={btnClass("ghost", true)}>Orders</Link>
          <Link href="/profile" className={btnClass("ghost", true)}>Profile</Link>
        </div>
      )}
    </header>
  );
}
