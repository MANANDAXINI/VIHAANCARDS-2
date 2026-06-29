"use client";

import { useEffect, useState } from "react";
import { AdminPagination, AdminSearchBar } from "@/components/AdminTableTools";
import { formatPhone } from "@/components/AdminCatalogPanel";
import { ArtworkThumb } from "@/components/OrderArtworkThumb";
import { adminApi, formatRupees } from "@/lib/api";
import { saveArtworkToBusinessFolder } from "@/lib/artwork-save";
import { formatLedgerTableDate, formatOrderDescription } from "@/lib/order-display";
import { toast } from "@/lib/toast";
import { btnClass, pendingRowClass, pendingSectionTitleClass, ui } from "@/lib/ui";

const PROCESSING_COLUMNS = [
  "Order",
  "Customer",
  "Product",
  "Amount",
  "Payment",
  "Job Process",
  "Dispatch",
  "Artwork",
];

function toDateInputValue(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function isPaymentVerified(order) {
  return String(order?.paymentStatus || "").toUpperCase() === "VERIFIED"
    || ["PAYMENT_VERIFIED", "IN_PRINTING", "PRINTING_PROCESS_STARTED", "DISPATCHED", "COMPLETED"].includes(String(order?.status || "").toUpperCase());
}

function hasProceededToPrinting(status) {
  const s = String(status || "").toUpperCase();
  return s === "IN_PRINTING" || s === "PRINTING_PROCESS_STARTED" || s === "DISPATCHED" || s === "COMPLETED";
}

function SectionLabel({ children }) {
  return (
    <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-wide text-slate-500 xl:hidden">
      {children}
    </p>
  );
}

function ArtworkFileRow({ label, url, name, mime, downloaded, onDownload, busy }) {
  return (
    <div className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2">
      <p className={`${ui.small} mb-1.5 font-semibold text-slate-700`}>{label}</p>
      <button
        type="button"
        className={`${btnClass(downloaded ? "teal" : "amber", true)} mb-2 w-full`}
        disabled={!url || busy}
        onClick={onDownload}
      >
        {downloaded ? "Download Completed" : busy ? "Saving..." : "Download Pending"}
      </button>
      {url ? (
        <ArtworkThumb
          url={url}
          mime={mime}
          name={name}
          className="h-14 w-14"
          secure
        />
      ) : null}
      <p className={`${ui.small} break-all text-slate-700`}>{name || "—"}</p>
    </div>
  );
}

function DispatchForm({ order, onSaved }) {
  const [lrNumber, setLrNumber] = useState(order.lrNumber || "");
  const [transportDetails, setTransportDetails] = useState(order.transportDetails || "");
  const [dispatchDate, setDispatchDate] = useState(toDateInputValue(order.dispatchDate));
  const [saving, setSaving] = useState(false);
  const dispatched = ["DISPATCHED", "PRINTING_PROCESS_STARTED", "COMPLETED"].includes(String(order.status || "").toUpperCase());

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
    <div className="grid w-full gap-2">
      <label className="grid gap-1">
        <span className={`${ui.small} font-semibold text-slate-700`}>LR Number</span>
        <input
          className={ui.inputCompact}
          value={lrNumber}
          onChange={(e) => setLrNumber(e.target.value)}
          placeholder="LR / Bilty no."
        />
      </label>
      <label className="grid gap-1">
        <span className={`${ui.small} font-semibold text-slate-700`}>Transport / Bus Details</span>
        <textarea
          className={`${ui.inputCompact} min-h-[3.5rem] resize-y`}
          value={transportDetails}
          onChange={(e) => setTransportDetails(e.target.value)}
          placeholder="Courier, bus, transport..."
        />
      </label>
      <label className="grid gap-1">
        <span className={`${ui.small} font-semibold text-slate-700`}>Date</span>
        <input
          className={ui.inputCompact}
          type="date"
          value={dispatchDate}
          onChange={(e) => setDispatchDate(e.target.value)}
        />
      </label>
      <button
        type="button"
        className={`${btnClass("amber", true)} w-full`}
        disabled={saving}
        onClick={handleSave}
      >
        {saving ? "Saving..." : dispatched ? "Update" : "Save"}
      </button>
    </div>
  );
}

function OrderProcessingCard({ order, onRefresh }) {
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
    const name = side === "back" ? order.artworkBackName : order.artworkName;
    const mime = side === "back" ? order.artworkBackMime : order.artworkMime;
    if (!url) return;

    setArtworkBusy(side);
    try {
      const result = await saveArtworkToBusinessFolder({
        order,
        side,
        url,
        originalName: name,
        mime,
      });

      await adminApi.markArtworkDownloaded(order.id, side, { silent: true });
      await onRefresh();

      if (result.method === "folder") {
        toast.success(`Saved to ${result.displayPath}`);
      } else {
        toast.success(`Downloaded ${result.filename}. Use Chrome or Edge to pick a folder next time.`);
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
      toast.error(error.message || "Could not save artwork.");
    } finally {
      setArtworkBusy(null);
    }
  }

  return (
    <article className={`rounded-lg border border-slate-200 bg-white p-3 sm:p-4 ${pendingRowClass(order.status !== "COMPLETED")}`}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 xl:items-start xl:gap-3">
        <div className="min-w-0">
          <SectionLabel>Order</SectionLabel>
          <strong className="block text-slate-900">{order.orderNumber || "—"}</strong>
          <span className={`${ui.small} ${ui.muted}`}>{formatLedgerTableDate(order.createdAt)}</span>
        </div>

        <div className="min-w-0">
          <SectionLabel>Customer</SectionLabel>
          <strong className="block break-words">{order.business || order.customerName}</strong>
          {order.customerCity ? <span className={`block ${ui.small} ${ui.muted}`}>{order.customerCity}</span> : null}
          <span className={`block ${ui.small} text-slate-700`}>{formatPhone(order.customerPhone)}</span>
        </div>

        <div className="min-w-0">
          <SectionLabel>Product</SectionLabel>
          <strong className="block break-words">{order.product || "LEAFLET / PAMPLET"}</strong>
          <span className={`${ui.small} ${ui.muted}`}>{formatOrderDescription(order)}</span>
        </div>

        <div className="min-w-0">
          <SectionLabel>Amount</SectionLabel>
          <strong className="text-slate-900">{formatRupees(order.amount)}</strong>
        </div>

        <div className="min-w-0">
          <SectionLabel>Payment</SectionLabel>
          {verified ? (
            <div className="grid gap-1">
              <span className="text-sm font-medium text-slate-800">Payment Verified</span>
              <span className={`${ui.pill} w-fit bg-emerald-100 text-emerald-800`}>Verified</span>
            </div>
          ) : (
            <span className={`${ui.pill} bg-amber-100 text-amber-800`}>Pending</span>
          )}
        </div>

        <div className="min-w-0">
          <SectionLabel>Job Process</SectionLabel>
          {proceeded ? (
            <button type="button" className={`${btnClass("teal", true)} w-full whitespace-normal leading-tight`} disabled>
              Proceeded to Printing
            </button>
          ) : (
            <button
              type="button"
              className={`${btnClass("amber", true)} w-full whitespace-normal leading-tight`}
              disabled={!verified || printingBusy}
              onClick={handleProceedPrinting}
            >
              {printingBusy ? "Saving..." : "Proceed to Printing"}
            </button>
          )}
        </div>

        <div className="min-w-0 sm:col-span-2 lg:col-span-2 xl:col-span-1">
          <SectionLabel>Dispatch</SectionLabel>
          <DispatchForm order={order} onSaved={onRefresh} />
        </div>

        <div className="min-w-0 sm:col-span-2 lg:col-span-2 xl:col-span-1">
          <SectionLabel>Artwork</SectionLabel>
          {!order.artworkUrl && !order.artworkBackUrl ? (
            <span className={ui.muted}>—</span>
          ) : (
            <div className="grid w-full gap-2">
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
        </div>
      </div>
    </article>
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
    <section className={`${ui.adminCard} w-full ${pendingCount > 0 ? "border-red-200" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className={pendingSectionTitleClass(pendingCount > 0)}>
          Order Processing ({orders.length})
        </h3>
        <div className="w-full sm:max-w-xs">
          <AdminSearchBar value={ordersSearch} onChange={onOrdersSearchChange} placeholder="Search orders..." />
        </div>
      </div>

      <div className="hidden w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 xl:grid xl:grid-cols-8 xl:gap-3">
        {PROCESSING_COLUMNS.map((label) => (
          <p key={label} className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-500">
            {label}
          </p>
        ))}
      </div>

      <div className="grid w-full gap-3">
        {ordersPaged.items.length === 0 ? (
          <p className={`rounded-lg border border-slate-200 bg-white px-4 py-8 text-center ${ui.muted}`}>
            No orders
          </p>
        ) : (
          ordersPaged.items.map((order) => (
            <OrderProcessingCard key={order.id} order={order} onRefresh={onRefresh} />
          ))
        )}
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
