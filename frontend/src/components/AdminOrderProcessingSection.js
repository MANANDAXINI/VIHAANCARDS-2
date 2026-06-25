"use client";

import { useEffect, useState } from "react";
import { AdminPagination, AdminSearchBar } from "@/components/AdminTableTools";
import { formatPhone } from "@/components/AdminCatalogPanel";
import { adminApi, API_URL, formatRupees } from "@/lib/api";
import { formatLedgerTableDate, formatOrderDescription } from "@/lib/order-display";
import { toast } from "@/lib/toast";
import { btnClass, pendingRowClass, pendingSectionTitleClass, ui } from "@/lib/ui";

function toDateInputValue(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function isPaymentVerified(order) {
  return String(order?.paymentStatus || "").toUpperCase() === "VERIFIED"
    || ["PAYMENT_VERIFIED", "IN_PRINTING", "DISPATCHED", "COMPLETED"].includes(String(order?.status || "").toUpperCase());
}

function hasProceededToPrinting(status) {
  const s = String(status || "").toUpperCase();
  return s === "IN_PRINTING" || s === "DISPATCHED" || s === "COMPLETED";
}

function ArtworkFileRow({ label, url, name, mime, downloaded, onDownload, busy }) {
  const fullUrl = url ? `${API_URL}${url}` : null;
  const showThumb = fullUrl && (mime?.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)/i.test(name || ""));

  return (
    <div className="flex min-w-[10rem] flex-col gap-2 border-b border-slate-100 py-2 last:border-0">
      <button
        type="button"
        className={btnClass(downloaded ? "teal" : "amber", true)}
        disabled={!fullUrl || busy}
        onClick={onDownload}
      >
        {downloaded ? "Download Completed" : "Download Pending"}
      </button>
      {showThumb ? (
        <a href={fullUrl} target="_blank" rel="noreferrer" className="block">
          <img
            src={fullUrl}
            alt={name || "Artwork"}
            className="h-14 w-14 rounded border border-slate-200 object-cover"
          />
        </a>
      ) : null}
      <p className={`${ui.small} break-all text-slate-700`}>
        {label ? `${label}: ` : ""}{name || "—"}
      </p>
    </div>
  );
}

function DispatchForm({ order, onSaved }) {
  const [lrNumber, setLrNumber] = useState(order.lrNumber || "");
  const [transportDetails, setTransportDetails] = useState(order.transportDetails || "");
  const [dispatchDate, setDispatchDate] = useState(toDateInputValue(order.dispatchDate));
  const [saving, setSaving] = useState(false);
  const dispatched = ["DISPATCHED", "COMPLETED"].includes(String(order.status || "").toUpperCase());

  useEffect(() => {
    setLrNumber(order.lrNumber || "");
    setTransportDetails(order.transportDetails || "");
    setDispatchDate(toDateInputValue(order.dispatchDate));
  }, [order.id, order.lrNumber, order.transportDetails, order.dispatchDate]);

  async function handleSave() {
    if (!lrNumber.trim()) {
      toast.error("LR number is required.");
      return;
    }
    setSaving(true);
    try {
      await adminApi.dispatch(order.id, {
        lrNumber: lrNumber.trim(),
        transportDetails: transportDetails.trim(),
        dispatchDate: dispatchDate || new Date().toISOString().slice(0, 10),
      }, { silent: true });
      toast.success("Dispatch details saved.");
      onSaved();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid min-w-[11rem] gap-2">
      <label className="grid gap-1">
        <span className={`${ui.small} font-semibold text-slate-700`}>LR Number</span>
        <input
          className={ui.input}
          value={lrNumber}
          onChange={(e) => setLrNumber(e.target.value)}
          placeholder="LR / Bilty no."
        />
      </label>
      <label className="grid gap-1">
        <span className={`${ui.small} font-semibold text-slate-700`}>Transport / Bus Details</span>
        <textarea
          className={`${ui.input} min-h-[4.5rem] resize-y py-2`}
          value={transportDetails}
          onChange={(e) => setTransportDetails(e.target.value)}
          placeholder="Courier, bus, transport name..."
        />
      </label>
      <label className="grid gap-1">
        <span className={`${ui.small} font-semibold text-slate-700`}>Date</span>
        <input
          className={ui.input}
          type="date"
          value={dispatchDate}
          onChange={(e) => setDispatchDate(e.target.value)}
        />
      </label>
      <button
        type="button"
        className={btnClass("amber", true)}
        disabled={saving || order.status === "COMPLETED"}
        onClick={handleSave}
      >
        {saving ? "Saving..." : dispatched ? "Update" : "Save"}
      </button>
    </div>
  );
}

function OrderProcessingRow({ order, onRefresh }) {
  const [printingBusy, setPrintingBusy] = useState(false);
  const [artworkBusy, setArtworkBusy] = useState(null);

  const verified = isPaymentVerified(order);
  const proceeded = hasProceededToPrinting(order.status);

  async function handleProceedPrinting() {
    setPrintingBusy(true);
    try {
      await adminApi.proceedPrinting(order.id, { silent: true });
      toast.success("Order proceeded to printing.");
      await onRefresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setPrintingBusy(false);
    }
  }

  async function handleArtworkDownload(side) {
    const url = side === "back" ? order.artworkBackUrl : order.artworkUrl;
    if (!url) return;
    setArtworkBusy(side);
    try {
      window.open(`${API_URL}${url}`, "_blank", "noopener,noreferrer");
      await adminApi.markArtworkDownloaded(order.id, side, { silent: true });
      await onRefresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setArtworkBusy(null);
    }
  }

  return (
    <tr className={pendingRowClass(order.status !== "COMPLETED")}>
      <td className={`${ui.td} align-top`}>
        <strong className="block text-slate-900">{order.orderNumber || "—"}</strong>
        <span className={`${ui.small} ${ui.muted}`}>{formatLedgerTableDate(order.createdAt)}</span>
      </td>
      <td className={`${ui.td} align-top`}>
        <strong className="block">{order.business || order.customerName}</strong>
        {order.customerCity ? <span className={`block ${ui.small} ${ui.muted}`}>{order.customerCity}</span> : null}
        <span className={`block ${ui.small} text-slate-700`}>{formatPhone(order.customerPhone)}</span>
      </td>
      <td className={`${ui.td} align-top`}>
        <strong className="block">{order.product || "LEAFLET / PAMPLET"}</strong>
        <span className={`${ui.small} ${ui.muted}`}>{formatOrderDescription(order)}</span>
      </td>
      <td className={`${ui.td} align-top font-semibold`}>{formatRupees(order.amount)}</td>
      <td className={`${ui.td} align-top`}>
        {verified ? (
          <div className="grid gap-1">
            <span className="text-sm font-medium text-slate-800">Payment Verified</span>
            <span className={`${ui.pill} w-fit bg-emerald-100 text-emerald-800`}>Verified</span>
          </div>
        ) : (
          <span className={`${ui.pill} bg-amber-100 text-amber-800`}>Pending</span>
        )}
      </td>
      <td className={`${ui.td} align-top`}>
        {proceeded ? (
          <button type="button" className={`${btnClass("teal", true)} whitespace-normal text-center leading-tight`} disabled>
            Proceeded to Printing
          </button>
        ) : (
          <button
            type="button"
            className={`${btnClass("amber", true)} whitespace-normal text-center leading-tight`}
            disabled={!verified || printingBusy}
            onClick={handleProceedPrinting}
          >
            {printingBusy ? "Saving..." : "Proceed to Printing"}
          </button>
        )}
      </td>
      <td className={`${ui.td} align-top`}>
        <DispatchForm order={order} onSaved={onRefresh} />
      </td>
      <td className={`${ui.td} align-top`}>
        {!order.artworkUrl && !order.artworkBackUrl ? (
          <span className={ui.muted}>—</span>
        ) : (
          <div>
            {order.artworkUrl ? (
              <ArtworkFileRow
                label="Front"
                url={order.artworkUrl}
                name={order.artworkName}
                mime={order.artworkMime}
                downloaded={order.artworkDownloaded}
                busy={artworkBusy === "front"}
                onDownload={() => handleArtworkDownload("front")}
              />
            ) : null}
            {order.artworkBackUrl || order.artworkBackName ? (
              <ArtworkFileRow
                label="Back"
                url={order.artworkBackUrl}
                name={order.artworkBackName}
                mime={order.artworkBackMime}
                downloaded={order.artworkBackDownloaded}
                busy={artworkBusy === "back"}
                onDownload={() => handleArtworkDownload("back")}
              />
            ) : null}
          </div>
        )}
      </td>
    </tr>
  );
}

export default function AdminOrderProcessingSection({
  orders = [],
  ordersSearch,
  onOrdersSearchChange,
  ordersPaged,
  onOrdersPageChange,
  onRefresh,
  pendingCount = 0,
}) {
  return (
    <section className={`${ui.adminCard} ${pendingCount > 0 ? "border-red-200" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className={pendingSectionTitleClass(pendingCount > 0)}>
          Order Processing ({orders.length})
        </h3>
        <div className="w-full sm:w-64">
          <AdminSearchBar value={ordersSearch} onChange={onOrdersSearchChange} placeholder="Search orders..." />
        </div>
      </div>

      <div className={ui.tableWrap}>
        <table className={`${ui.table} min-w-[72rem]`}>
          <thead>
            <tr>
              <th className={ui.th}>Order</th>
              <th className={ui.th}>Customer</th>
              <th className={ui.th}>Product</th>
              <th className={ui.th}>Amount</th>
              <th className={ui.th}>Payment</th>
              <th className={ui.th}>Job Process</th>
              <th className={ui.th}>Dispatch</th>
              <th className={ui.th}>Artwork</th>
            </tr>
          </thead>
          <tbody>
            {ordersPaged.items.length === 0 ? (
              <tr><td className={ui.td} colSpan="8">No orders</td></tr>
            ) : (
              ordersPaged.items.map((order) => (
                <OrderProcessingRow key={order.id} order={order} onRefresh={onRefresh} />
              ))
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination
        page={ordersPaged.page}
        totalPages={ordersPaged.totalPages}
        total={ordersPaged.total}
        onPageChange={onOrdersPageChange}
      />
    </section>
  );
}
