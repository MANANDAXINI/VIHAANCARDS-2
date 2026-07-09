"use client";

import { formatRupees } from "@/lib/api";
import { OrderArtworkCell } from "@/components/OrderArtworkThumb";
import {
  formatDespatchLabel,
  formatJobProcessForOrder,
  formatLedgerBalance,
  formatLedgerCredit,
  formatLedgerDebit,
  formatLedgerTableDate,
  formatOrderDescription,
  formatOrderDisplayNumber,
  formatTransportLine,
  isPendingPaymentOrder,
  jobProcessClassForOrder,
} from "@/lib/order-display";
import { ui } from "@/lib/ui";

function CustomerPaymentsTable({ ledgerEntries = [] }) {
  const payments = ledgerEntries.filter((entry) => Number(entry.credit || 0) > 0);

  return (
    <section className={ui.cardFlat}>
      <h2 className={`${ui.h3} border-b border-slate-200 px-4 py-3`}>Payments</h2>
      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th className={ui.th}>AMOUNT</th>
              <th className={ui.th}>DATE</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr><td className={ui.td} colSpan="2">No payments yet.</td></tr>
            ) : (
              payments.map((entry) => (
                <tr key={entry.id}>
                  <td className={`${ui.td} font-semibold`}>{formatRupees(entry.credit)}</td>
                  <td className={ui.td}>{formatLedgerTableDate(entry.entryDate)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PaymentLedgerTable({ ledgerEntries = [], offset = 0 }) {
  return (
    <section className={ui.cardFlat}>
      <h2 className={`${ui.h3} border-b border-slate-200 px-4 py-3`}>Ledger</h2>
      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th className={ui.th}>SR NO.</th>
              <th className={ui.th}>DATE</th>
              <th className={ui.th}>NARRATION</th>
              <th className={ui.th}>JOB / OUTSTANDING AMOUNT</th>
              <th className={ui.th}>PAYMENT RECEIVED</th>
              <th className={ui.th}>OUTSTANDING BALANCE</th>
            </tr>
          </thead>
          <tbody>
            {ledgerEntries.length === 0 ? (
              <tr><td className={ui.td} colSpan="6">No ledger entries yet.</td></tr>
            ) : (
              ledgerEntries.map((entry, index) => (
                <tr key={entry.id} className={entry.pending ? "bg-amber-50/60" : ""}>
                  <td className={ui.td}>{offset + index + 1}</td>
                  <td className={ui.td}>{formatLedgerTableDate(entry.entryDate)}</td>
                  <td className={ui.td}>{entry.label}</td>
                  <td className={ui.td}>{formatLedgerDebit(entry)}</td>
                  <td className={ui.td}>{formatLedgerCredit(entry)}</td>
                  <td className={ui.td}>{formatLedgerBalance(entry)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function OrderHistoryTable({ orders = [] }) {
  return (
    <section className={ui.cardFlat}>
      <h2 className={`${ui.h3} border-b border-slate-200 px-4 py-3`}>Order History</h2>
      <div className={`${ui.tableWrap} hidden md:block`}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th className={ui.th}>ORDER NO.</th>
              <th className={ui.th}>DATE</th>
              <th className={ui.th}>ITEM</th>
              <th className={ui.th}>DESCRIPTION</th>
              <th className={ui.th}>ARTWORK</th>
              <th className={ui.th}>AMOUNT</th>
              <th className={ui.th}>JOB PROCESS</th>
              <th className={ui.th}>DESPATCH</th>
              <th className={ui.th}>LR / BILTY / BUS / TRANSPORT</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr><td className={ui.td} colSpan="9">No orders yet.</td></tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className={isPendingPaymentOrder(order) ? "bg-amber-50/60" : ""}>
                  <td className={ui.td}>{formatOrderDisplayNumber(order)}</td>
                  <td className={ui.td}>{formatLedgerTableDate(order.createdAt)}</td>
                  <td className={ui.td}>{order.product || "LEAFLET / PAMPLET"}</td>
                  <td className={ui.td}>{formatOrderDescription(order)}</td>
                  <td className={ui.td}><OrderArtworkCell order={order} /></td>
                  <td className={`${ui.td} font-semibold`}>{formatRupees(order.amount)}</td>
                  <td className={ui.td}>
                    <span className={jobProcessClassForOrder(order)}>{formatJobProcessForOrder(order)}</span>
                  </td>
                  <td className={ui.td}>{formatDespatchLabel(order)}</td>
                  <td className={ui.td}>{formatTransportLine(order)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ul className={`${ui.mobileCardList} p-4 md:hidden`}>
        {orders.length === 0 ? (
          <li className={`${ui.mobileCard} ${ui.muted}`}>No orders yet.</li>
        ) : (
          orders.map((order) => (
            <li key={`m-${order.id}`} className={`${ui.mobileCard} ${isPendingPaymentOrder(order) ? "border-amber-200 bg-amber-50/60" : ""}`}>
              <div className={ui.mobileCardRow}>
                <strong>{formatOrderDisplayNumber(order)}</strong>
                <span className={jobProcessClassForOrder(order)}>{formatJobProcessForOrder(order)}</span>
              </div>
              <p className={ui.muted}>{formatLedgerTableDate(order.createdAt)} · {order.product}</p>
              <p>{formatOrderDescription(order)}</p>
              <OrderArtworkCell order={order} />
              <div className={ui.mobileCardRow}>
                <span className={ui.muted}>Amount</span>
                <strong>{formatRupees(order.amount)}</strong>
              </div>
              <div className={ui.mobileCardRow}>
                <span className={ui.muted}>Despatch</span>
                <span>{formatDespatchLabel(order)}</span>
              </div>
              <div className={ui.mobileCardRow}>
                <span className={ui.muted}>Transport</span>
                <span>{formatTransportLine(order)}</span>
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

export default function OrderHistoryLedger({ ledgerEntries = [], orders = [], activeTab = "orders", offset = 0 }) {
  if (activeTab === "payments") {
    return <CustomerPaymentsTable ledgerEntries={ledgerEntries} />;
  }
  if (activeTab === "ledger") {
    return <PaymentLedgerTable ledgerEntries={ledgerEntries} offset={offset} />;
  }
  if (activeTab === "orders") {
    return <OrderHistoryTable orders={orders} />;
  }
  return (
    <div className="grid gap-6">
      <CustomerPaymentsTable ledgerEntries={ledgerEntries} />
      <PaymentLedgerTable ledgerEntries={ledgerEntries} />
      <OrderHistoryTable orders={orders} />
    </div>
  );
}

export { PaymentLedgerTable, OrderHistoryTable, CustomerPaymentsTable };
