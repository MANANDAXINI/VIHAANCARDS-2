"use client";

import { useEffect } from "react";
import { btnClass, ui } from "@/lib/ui";

export function AdminSearchBar({ value, onChange, placeholder = "Search..." }) {
  return (
    <div className={ui.field}>
      <label className="sr-only" htmlFor="admin-search">Search</label>
      <input
        id="admin-search"
        type="search"
        className={ui.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

export function AdminPagination({ page, totalPages, total, onPageChange }) {
  if (total <= 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <span className={ui.muted}>{total} item{total === 1 ? "" : "s"}</span>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={btnClass("ghost", true)}
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </button>
          <span className={ui.muted}>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className={btnClass("ghost", true)}
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export function useAdminTableState(searchQuery, setPage) {
  useEffect(() => {
    setPage(1);
  }, [searchQuery, setPage]);
}
