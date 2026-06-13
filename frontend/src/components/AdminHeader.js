"use client";

import Link from "next/link";
import { btnClass } from "@/lib/ui";
import { roleLabel } from "@/lib/redirect";

export function AdminHeader({ user, onLogout }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white pt-safe">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:gap-4 md:px-6">
        <Link href="/admin" className="inline-flex min-w-0 items-center gap-2.5 font-bold text-slate-900">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-600 text-xs text-white">PD</span>
          <span className="min-w-0">
            <span className="block truncate text-sm leading-tight max-[400px]:max-w-[7.5rem] sm:max-w-none">PIXEL DIGITAL</span>
            <span className="block text-[0.65rem] font-medium uppercase tracking-wider text-slate-500">Admin</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden text-sm text-slate-600 sm:inline">
                {user.business} · {roleLabel(user.role)}
              </span>
              <button type="button" className={btnClass("ghost", true)} onClick={onLogout}>
                Logout
              </button>
            </>
          ) : (
            <span className="text-sm text-slate-500">Admin sign in</span>
          )}
        </div>
      </div>
    </header>
  );
}

export default AdminHeader;
