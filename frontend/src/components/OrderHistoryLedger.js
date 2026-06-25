"use client";

import { formatRupees } from "@/lib/api";
import { OrderArtworkCell } from "@/components/OrderArtworkThumb";
import {
  formatDespatchLabel,
  formatJobProcess,
  formatLedgerBalance,
  formatLedgerCredit,
  formatLedgerDebit,
  formatLedgerTableDate,
  formatOrderDescription,
  formatOrderDisplayNumber,
  formatTransportLine,
  jobProcessClass,
} from "@/lib/order-display";
import { ui } from "@/lib/ui";

export default function OrderHistoryLedger({ ledgerEntries = [], orders = [] }) {
  const ledgerRows = ledgerEntries;

  return (
    <div className="grid gap-6">
      <section className={ui.cardFlat}>
        <h2 className={`${ui.h3} border-b border-slate-200 px-4 py-3`}>Payment Ledger</h2>
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
              {ledgerRows.length === 0 ? (
                <tr><td className={ui.td} colSpan="6">No ledger entries yet.</td></tr>
              ) : (
                ledgerRows.map((entry, index) => (
                  <tr key={entry.id}>
                    <td className={ui.td}>{index + 1}</td>
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

      <section className={ui.cardFlat}>
        <h2 className={`${ui.h3} border-b border-slate-200 px-4 py-3`}>Order History</h2>
        <div className={ui.tableWrap}>
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
                  <tr key={order.id}>
                    <td className={ui.td}>{formatOrderDisplayNumber(order)}</td>
                    <td className={ui.td}>{formatLedgerTableDate(order.createdAt)}</td>
                    <td className={ui.td}>{order.product || "LEAFLET / PAMPLET"}</td>
                    <td className={ui.td}>{formatOrderDescription(order)}</td>
                    <td className={ui.td}><OrderArtworkCell order={order} /></td>
                    <td className={`${ui.td} font-semibold`}>{formatRupees(order.amount)}</td>
                    <td className={ui.td}>
                      <span className={jobProcessClass(order.status)}>{formatJobProcess(order.status)}</span>
                    </td>
                    <td className={ui.td}>{formatDespatchLabel(order)}</td>
                    <td className={ui.td}>{formatTransportLine(order)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <ul className={`${ui.mobileCardList} p-4`}>
          {orders.map((order) => (
            <li key={`m-${order.id}`} className={ui.mobileCard}>
              <div className={ui.mobileCardRow}>
                <strong>{formatOrderDisplayNumber(order)}</strong>
                <span className={jobProcessClass(order.status)}>{formatJobProcess(order.status)}</span>
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
          ))}
        </ul>
      </section>
    </div>
  );
}
