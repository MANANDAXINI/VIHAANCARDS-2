"use client";

import { useMemo, useState } from "react";
import { AdminPagination, AdminSearchBar, useAdminTableState } from "@/components/AdminTableTools";
import { formatPhone } from "@/components/AdminCatalogPanel";
import { formatRupees } from "@/lib/api";
import { filterItems, paginateItems } from "@/lib/admin-table";
import { ui } from "@/lib/ui";

function formatAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "Rs. —";
  return formatRupees(amount);
}

export default function AdminCustomerCreditOverview({ accounts = [] }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useAdminTableState(search, setPage);

  const customers = useMemo(
    () => accounts.filter(
      (a) => a.status === "APPROVED" && (a.role === "CUSTOMER" || a.role === "BOTH")
    ),
    [accounts]
  );

  const filtered = filterItems(customers, search, ["business", "name", "phone", "address"]);
  const paged = paginateItems(filtered, page);
  const withCredit = customers.filter((a) => Number(a.creditLimit) > 0).length;

  return (
    <section className={ui.adminCard}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className={ui.adminH3}>All Customer Credit Limits</h3>
          <p className={`${ui.small} ${ui.muted}`}>
            {withCredit} of {customers.length} approved customer{customers.length === 1 ? "" : "s"} have credit assigned.
          </p>
        </div>
        <div className="w-full sm:w-72">
          <AdminSearchBar value={search} onChange={setSearch} placeholder="Search customers..." />
        </div>
      </div>

      <div className={ui.tableWrap}>
        <table className={`${ui.table} min-w-[56rem]`}>
          <thead>
            <tr>
              <th className={ui.th}>Customer</th>
              <th className={ui.th}>Mobile</th>
              <th className={ui.th}>Credit Limit</th>
              <th className={ui.th}>Used Credit</th>
              <th className={ui.th}>Available Credit</th>
              <th className={ui.th}>Previous Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {paged.items.length === 0 ? (
              <tr><td className={ui.td} colSpan="6">No approved customers found.</td></tr>
            ) : (
              paged.items.map((account) => (
                <tr key={account.id}>
                  <td className={`${ui.td} font-semibold`}>{account.business || account.name}</td>
                  <td className={ui.td}>{formatPhone(account.phone)}</td>
                  <td className={ui.td}>{formatAmount(account.creditLimit)}</td>
                  <td className={ui.td}>{formatAmount(account.usedCredit)}</td>
                  <td className={ui.td}>{formatAmount(account.availableCredit)}</td>
                  <td className={ui.td}>{formatAmount(account.previousOutstanding)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination
        page={paged.page}
        totalPages={paged.totalPages}
        total={paged.total}
        onPageChange={setPage}
      />
    </section>
  );
}
