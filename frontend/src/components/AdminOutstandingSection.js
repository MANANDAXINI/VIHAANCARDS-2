"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminPagination, AdminSearchBar, useAdminTableState } from "@/components/AdminTableTools";
import { adminApi } from "@/lib/api";
import { formatReceivableAmount, formatReceivableDate } from "@/lib/order-display";
import { filterItems, paginateItems } from "@/lib/admin-table";
import { printOutstandingReport } from "@/lib/outstanding-print";
import { toast } from "@/lib/toast";
import AdminOutstandingCustomerDetails from "@/components/AdminOutstandingCustomerDetails";
import { btnClass, ui } from "@/lib/ui";

function formatMobileNo(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits || digits.startsWith("g")) return "—";
  return digits;
}

export default function AdminOutstandingSection() {
  const [rows, setRows] = useState([]);
  const [asOn, setAsOn] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [detailsRow, setDetailsRow] = useState(null);
  const [showAll, setShowAll] = useState(true);

  useAdminTableState(search, setPage);

  const loadReceivable = useCallback(() => {
    setLoading(true);
    adminApi
      .outstandingReceivable()
      .then((data) => {
        setRows(data.rows || []);
        setAsOn(data.asOn || new Date().toISOString());
      })
      .catch((error) => {
        toast.error(error.message || "Could not load outstanding report.");
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadReceivable();
  }, [loadReceivable]);

  const visibleRows = useMemo(
    () => (showAll ? rows : rows.filter((row) => row.balance > 0)),
    [rows, showAll]
  );

  const filtered = filterItems(visibleRows, search, ["account", "mobile"]);
  const paged = paginateItems(filtered, page);

  const displayTotal = useMemo(
    () => filtered.reduce((sum, row) => sum + Number(row.balance || 0), 0),
    [filtered]
  );

  function handlePrint() {
    if (filtered.length === 0) {
      toast.error("No accounts to print.");
      return;
    }
    try {
      printOutstandingReport({ rows: filtered, asOn, total: displayTotal });
    } catch (error) {
      toast.error(error.message || "Could not open print view.");
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-red-600">Amount Receivable</p>
          <h2 className={ui.adminH1}>Outstanding</h2>
          <p className={ui.muted}>
            As On : {asOn ? formatReceivableDate(asOn) : "—"} · {filtered.length} account{filtered.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={btnClass("primary")} onClick={handlePrint} disabled={loading || filtered.length === 0}>
            Print Total Outstanding
          </button>
          <button type="button" className={btnClass("ghost")} onClick={loadReceivable} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
            />
            All Accounts
          </label>
        </div>
      </div>

      <section className={ui.adminCard}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className={ui.adminH3}>Outstanding Balance Report</h3>
          <div className="w-full sm:max-w-xs">
            <AdminSearchBar value={search} onChange={setSearch} placeholder="Search account or mobile..." />
          </div>
        </div>

        <div className={ui.tableWrap}>
          <table className={`${ui.table} min-w-[40rem]`}>
            <thead>
              <tr className="bg-slate-100">
                <th className={`${ui.th} w-24`} />
                <th className={ui.th}>Account</th>
                <th className={ui.th}>Mobile No.</th>
                <th className={`${ui.th} text-right`}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className={ui.td} colSpan="4">Loading outstanding report...</td></tr>
              ) : paged.items.length === 0 ? (
                <tr><td className={ui.td} colSpan="4">No accounts found.</td></tr>
              ) : (
                paged.items.map((row) => {
                  const selected = selectedId === row.accountId;
                  const rowClass = selected ? "bg-slate-800 text-white" : "hover:bg-slate-50";
                  return (
                    <tr
                      key={row.accountId}
                      className={rowClass}
                      onClick={() => setSelectedId(row.accountId)}
                    >
                      <td className={ui.td}>
                        <button
                          type="button"
                          className={
                            selected
                              ? `${btnClass("secondary")} !min-h-8 !px-2.5 !py-1 !text-xs`
                              : `${btnClass("ghost")} !min-h-8 !px-2.5 !py-1 !text-xs`
                          }
                          onClick={(event) => {
                            event.stopPropagation();
                            setDetailsRow(row);
                          }}
                        >
                          Details
                        </button>
                      </td>
                      <td className={`${ui.td} font-semibold uppercase tracking-wide`}>{row.account}</td>
                      <td className={ui.td}>{formatMobileNo(row.mobile)}</td>
                      <td className={`${ui.td} text-right font-semibold tabular-nums`}>
                        {formatReceivableAmount(row.balance)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {!loading && filtered.length > 0 ? (
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                  <td className={ui.td} colSpan="3">Grand Total</td>
                  <td className={`${ui.td} text-right tabular-nums`}>
                    {formatReceivableAmount(displayTotal)}
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>

        <AdminPagination
          page={paged.page}
          totalPages={paged.totalPages}
          total={paged.total}
          onPageChange={setPage}
        />
      </section>

      <AdminOutstandingCustomerDetails
        open={Boolean(detailsRow)}
        accountId={detailsRow?.accountId}
        accountName={detailsRow?.account}
        onClose={() => setDetailsRow(null)}
      />
    </div>
  );
}
