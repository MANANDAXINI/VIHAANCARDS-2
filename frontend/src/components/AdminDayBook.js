"use client";

import { useEffect, useState } from "react";
import { adminApi, formatDate, formatRupees } from "@/lib/api";
import { toast } from "@/lib/toast";
import { formatOrderStatus, orderStatusClass, ui } from "@/lib/ui";

function todayIst() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export default function AdminDayBook() {
  const [date, setDate] = useState(todayIst);
  const [loading, setLoading] = useState(true);
  const [book, setBook] = useState(null);

  useEffect(() => {
    setLoading(true);
    adminApi
      .dayBook(date)
      .then(setBook)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [date]);

  return (
    <div className="grid gap-4">
      <section className={ui.adminCard}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className={ui.adminH3}>Day Book</h3>
            <p className={`mt-1 ${ui.small} ${ui.muted}`}>
              Today&apos;s total orders and who placed them (IST).
            </p>
          </div>
          <div className={ui.field}>
            <label className={ui.label} htmlFor="day-book-date">Date</label>
            <input
              id="day-book-date"
              className={`${ui.input} w-full sm:w-44`}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <p className={`mt-4 ${ui.muted}`}>Loading day book...</p>
        ) : book ? (
          <>
            <div className={`${ui.statGrid} mt-4`}>
              <div className={ui.statCard}>
                <span className={`block ${ui.small} ${ui.muted}`}>Total orders</span>
                <strong className="text-lg font-semibold text-slate-900">{book.orderCount}</strong>
              </div>
              <div className={ui.statCard}>
                <span className={`block ${ui.small} ${ui.muted}`}>Total quantity</span>
                <strong className="text-lg font-semibold text-slate-900">
                  {Number(book.totalQuantity || 0).toLocaleString("en-IN")}
                </strong>
              </div>
              <div className={ui.statCard}>
                <span className={`block ${ui.small} ${ui.muted}`}>Total amount</span>
                <strong className="text-lg font-semibold text-slate-900">{formatRupees(book.totalAmount)}</strong>
              </div>
            </div>

            <div className={`${ui.tableWrap} mt-4`}>
              <table className={ui.table}>
                <thead>
                  <tr>
                    <th className={ui.th}>Order #</th>
                    <th className={ui.th}>Customer</th>
                    <th className={ui.th}>Business</th>
                    <th className={ui.th}>Paper / Size</th>
                    <th className={ui.th}>Qty</th>
                    <th className={ui.th}>Amount</th>
                    <th className={ui.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {book.orders.length === 0 ? (
                    <tr>
                      <td className={ui.td} colSpan="7">No orders on this date.</td>
                    </tr>
                  ) : (
                    book.orders.map((o) => (
                      <tr key={o.id}>
                        <td className={ui.td}>{o.orderNumber || "—"}</td>
                        <td className={ui.td}>{o.customerName}</td>
                        <td className={ui.td}>{o.business}</td>
                        <td className={ui.td}>{o.paperGsm}, {o.size}</td>
                        <td className={ui.td}>{o.quantity || "—"}</td>
                        <td className={ui.td}>{formatRupees(o.amount)}</td>
                        <td className={ui.td}>
                          <span className={orderStatusClass(o.status)}>{formatOrderStatus(o.status)}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}

export { todayIst };
