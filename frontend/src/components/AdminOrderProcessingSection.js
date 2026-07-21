"use client";

import { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { AdminPagination, AdminSearchBar, useAdminTableState } from "@/components/AdminTableTools";
import { formatPhone } from "@/components/AdminCatalogPanel";
import { ArtworkThumb } from "@/components/OrderArtworkThumb";
import { adminApi, formatRupees } from "@/lib/api";
import {
  sanitizeBusinessFolderName,
  saveArtworkToBusinessFolder,
  writeFileToDir,
} from "@/lib/artwork-save";
import { buildOrderSlipBlob, downloadOrderSlipImage } from "@/lib/order-slip-image";
import { notifyCustomerDispatch, notifyCustomerJobCompleted } from "@/lib/dispatch-notify";
import { filterItems, paginateItems } from "@/lib/admin-table";
import { formatLedgerTableDate, formatOrderDescription } from "@/lib/order-display";
import { toast } from "@/lib/toast";
import {
  btnClass,
  isOrderCompleted,
  pendingRowClass,
  pendingSectionTitleClass,
  ui,
} from "@/lib/ui";

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

const ORDER_SEARCH_KEYS = [
  "orderNumber",
  "business",
  "customerName",
  "paperGsm",
  "size",
  "quantity",
  "status",
  "amount",
  "product",
  "cutting",
  "finish",
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

/** Credit-limit checkout vs direct/wallet payment approval */
function isPaidWithCredit(order) {
  if (order?.paidWithCredit === true) return true;
  if (order?.paidWithCredit === false) return false;
  // Legacy orders (before paidWithCredit): only treat as credit if account has a limit
  return Number(order?.accountCreditLimit || 0) > 0;
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

function ArtworkFileRow({ label, url, name, mime, downloaded }) {
  return (
    <div className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className={`${ui.small} font-semibold text-slate-700`}>{label}</p>
        <span className={`${ui.small} font-medium ${downloaded ? "text-emerald-600" : "text-amber-600"}`}>
          {downloaded ? "Downloaded" : "Pending"}
        </span>
      </div>
      {url ? (
        <ArtworkThumb
          url={url}
          mime={mime}
          name={name}
          className="h-14 w-14"
          secure
        />
      ) : (
        <p className={`${ui.small} break-all text-slate-700`}>{name || "—"}</p>
      )}
    </div>
  );
}

function DispatchForm({ order, onSaved, onOrderDispatched }) {
  // Uncontrolled inputs: keystrokes stay in the DOM and never re-render the heavy order card.
  const formRef = useRef(null);
  const lrRef = useRef(null);
  const transportRef = useRef(null);
  const dateRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const dispatched = ["DISPATCHED", "PRINTING_PROCESS_STARTED", "COMPLETED"].includes(String(order.status || "").toUpperCase());

  // Tell admin alert refresh to wait while dispatch fields are focused.
  useEffect(() => {
    const root = formRef.current;
    if (!root) return undefined;
    const mark = () => {
      window.__pdAdminTyping = true;
    };
    const clear = () => {
      window.__pdAdminTyping = false;
    };
    root.addEventListener("focusin", mark);
    root.addEventListener("focusout", clear);
    return () => {
      root.removeEventListener("focusin", mark);
      root.removeEventListener("focusout", clear);
      window.__pdAdminTyping = false;
    };
  }, []);

  function readOverrides() {
    return {
      lrNumber: (lrRef.current?.value || "").trim(),
      transportDetails: (transportRef.current?.value || "").trim(),
      dispatchDate: dateRef.current?.value || new Date().toISOString().slice(0, 10),
      cutting: order.cutting || "",
      finish: order.finish || "",
    };
  }

  async function handleSave() {
    const overrides = readOverrides();
    if (!overrides.lrNumber) {
      toast.error("LR number is required.");
      return;
    }
    setSaving(true);
    try {
      const response = await adminApi.dispatch(order.id, overrides, { silent: true });
      const updatedOrder = { ...order, ...response.order, ...overrides };

      // No automatic packing-slip download on Save / job completion —
      // use Artwork → Download when a slip is needed.
      const { opened } = notifyCustomerDispatch(updatedOrder, overrides);

      if (opened) {
        toast.success("Dispatch saved — WhatsApp opened. Order moved to Completed Orders.");
      } else {
        toast.success("Dispatch saved. Order moved to Completed Orders.");
      }

      const newStatus = String(response.order?.status || "").toUpperCase();
      await Promise.resolve(onSaved?.());
      if (newStatus === "DISPATCHED" || newStatus === "COMPLETED") {
        onOrderDispatched?.();
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleJobCompleted() {
    // WhatsApp notify only — do NOT mark completed / move to Completed Orders.
    // Order moves to Completed only after Save/Update with dispatch (LR) details.
    setCompleting(true);
    try {
      const { opened } = notifyCustomerJobCompleted(order);
      toast.success(
        opened
          ? "Job-completed WhatsApp message opened for customer."
          : "Customer phone not available for WhatsApp."
      );
    } catch (error) {
      toast.error(error.message || "Could not open WhatsApp.");
    } finally {
      setCompleting(false);
    }
  }

  return (
    <div ref={formRef} className="grid w-full gap-2">
      <label className="grid gap-1">
        <span className={`${ui.small} font-semibold text-slate-700`}>LR Number</span>
        <input
          ref={lrRef}
          className={ui.inputCompact}
          defaultValue={order.lrNumber || ""}
          placeholder="LR / Bilty no."
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <label className="grid gap-1">
        <span className={`${ui.small} font-semibold text-slate-700`}>Transport / Bus Details</span>
        <textarea
          ref={transportRef}
          className={`${ui.inputCompact} min-h-[3.5rem] resize-y`}
          defaultValue={order.transportDetails || ""}
          placeholder="Courier, bus, transport..."
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <label className="grid gap-1">
        <span className={`${ui.small} font-semibold text-slate-700`}>Date</span>
        <input
          ref={dateRef}
          className={ui.inputCompact}
          type="date"
          defaultValue={toDateInputValue(order.dispatchDate)}
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
      <button
        type="button"
        className={`${btnClass("success", true)} w-full`}
        disabled={completing}
        onClick={handleJobCompleted}
      >
        {completing ? "Opening..." : "Job Completed (WhatsApp)"}
      </button>
    </div>
  );
}

const OrderProcessingCard = memo(function OrderProcessingCard({ order, onRefresh, onOrderDispatched }) {
  const [printingBusy, setPrintingBusy] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);

  const verified = isPaymentVerified(order);
  const proceeded = hasProceededToPrinting(order.status);

  const hasFront = Boolean(order.artworkUrl);
  const hasBack = Boolean(order.artworkBackUrl || order.artworkBackName);
  const allArtworkDownloaded =
    (hasFront || hasBack) &&
    (!hasFront || order.artworkDownloaded) &&
    (!hasBack || order.artworkBackDownloaded);

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

  async function saveArtworkSide(side, businessDir = null) {
    const url = side === "back" ? order.artworkBackUrl : order.artworkUrl;
    const name = side === "back" ? order.artworkBackName : order.artworkName;
    const mime = side === "back" ? order.artworkBackMime : order.artworkMime;
    if (!url) return;

    const result = await saveArtworkToBusinessFolder({
      order,
      side,
      url,
      originalName: name,
      mime,
      businessDir,
    });
    await adminApi.markArtworkDownloaded(order.id, side, { silent: true });
    return result;
  }

  async function handleDownloadAll() {
    const overrides = {
      lrNumber: order.lrNumber || "",
      transportDetails: order.transportDetails || "",
      dispatchDate: toDateInputValue(order.dispatchDate) || new Date().toISOString().slice(0, 10),
      cutting: order.cutting || "",
      finish: order.finish || "",
    };

    // Ask for the destination folder FIRST, while we still have the user gesture
    // (calling showDirectoryPicker after awaits throws a gesture error).
    let rootDir = null;
    if (typeof window !== "undefined" && typeof window.showDirectoryPicker === "function") {
      try {
        rootDir = await window.showDirectoryPicker({ mode: "readwrite" });
      } catch (error) {
        if (error?.name === "AbortError") return; // user cancelled the picker
        rootDir = null; // API blocked — fall back to plain downloads
      }
    }

    setDownloadBusy(true);
    try {
      if (rootDir) {
        // Save everything into a per-business subfolder inside the chosen folder.
        const businessFolder = sanitizeBusinessFolderName(order.business || order.customerName);
        const businessDir = await rootDir.getDirectoryHandle(businessFolder, { create: true });

        const slip = await buildOrderSlipBlob(order, overrides);
        if (slip?.blob) await writeFileToDir(businessDir, slip.filename, slip.blob);

        if (order.artworkUrl) await saveArtworkSide("front", businessDir);
        if (order.artworkBackUrl) await saveArtworkSide("back", businessDir);

        await onRefresh();
        toast.success(`Saved to folder "${businessFolder}".`);
      } else {
        await downloadOrderSlipImage(order, overrides);
        if (order.artworkUrl) await saveArtworkSide("front");
        if (order.artworkBackUrl) await saveArtworkSide("back");

        await onRefresh();
        toast.success("Order image and artwork downloaded.");
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
      toast.error(error.message || "Could not download.");
    } finally {
      setDownloadBusy(false);
    }
  }

  async function handleCancelOrder() {
    if (!window.confirm(
      `Cancel order ${order.orderNumber || ""}?\n\nThis removes the order, restores stock, and reverses its ledger charge. This cannot be undone.`
    )) {
      return;
    }
    setCancelBusy(true);
    try {
      await adminApi.cancelOrder(order.id, { silent: true });
      toast.success(`Order ${order.orderNumber || ""} cancelled.`);
      await onRefresh();
    } catch (error) {
      toast.error(error.message || "Could not cancel order.");
    } finally {
      setCancelBusy(false);
    }
  }

  return (
    <article className={`rounded-lg border border-slate-200 bg-white p-3 sm:p-4 ${pendingRowClass(!isOrderCompleted(order.status))}`}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 xl:items-start xl:gap-3">
        <div className="min-w-0">
          <SectionLabel>Order</SectionLabel>
          <strong className="block text-slate-900">{order.orderNumber || "—"}</strong>
          <span className={`${ui.small} ${ui.muted}`}>{formatLedgerTableDate(order.createdAt)}</span>
          <button
            type="button"
            className={`${btnClass("danger", true)} mt-2 w-full`}
            onClick={handleCancelOrder}
            disabled={cancelBusy}
          >
            {cancelBusy ? "Cancelling..." : "Cancel Order"}
          </button>
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
          {order.cutting ? (
            <div className="mt-2">
              <span className={`block ${ui.small} font-semibold uppercase tracking-wide text-slate-500`}>
                Cutting
              </span>
              <strong className="block text-sm text-slate-900">{order.cutting}</strong>
            </div>
          ) : null}
        </div>

        <div className="min-w-0">
          <SectionLabel>Amount</SectionLabel>
          <strong className="text-slate-900">{formatRupees(order.amount)}</strong>
        </div>

        <div className="min-w-0">
          <SectionLabel>Payment</SectionLabel>
          {verified ? (
            isPaidWithCredit(order) ? (
              <div className="grid gap-1">
                <span className="text-sm font-semibold uppercase tracking-wide text-slate-800">
                  Limit Used
                </span>
                <span className={`${ui.pill} w-fit bg-emerald-100 text-emerald-800`}>Verified</span>
              </div>
            ) : (
              <span className={`${ui.pill} w-fit bg-emerald-100 text-emerald-800`}>
                Payment Verified
              </span>
            )
          ) : (
            <span className={`${ui.pill} bg-amber-100 text-amber-800`}>Pending</span>
          )}
        </div>

        <div className="min-w-0">
          <SectionLabel>Job Process</SectionLabel>
          {isOrderCompleted(order.status) ? (
            <button type="button" className={`${btnClass("success", true)} w-full whitespace-normal leading-tight`} disabled>
              Order Completed
            </button>
          ) : proceeded ? (
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
          <DispatchForm
            key={order.id}
            order={order}
            onSaved={onRefresh}
            onOrderDispatched={onOrderDispatched}
          />
        </div>

        <div className="min-w-0 sm:col-span-2 lg:col-span-2 xl:col-span-1">
          <SectionLabel>Artwork</SectionLabel>
          {!order.artworkUrl && !order.artworkBackUrl ? (
            <span className={ui.muted}>—</span>
          ) : (
            <div className="grid w-full gap-2">
              <button
                type="button"
                className={`${btnClass(allArtworkDownloaded ? "success" : "amber", true)} w-full`}
                disabled={downloadBusy}
                onClick={handleDownloadAll}
              >
                {downloadBusy
                  ? "Downloading..."
                  : allArtworkDownloaded
                    ? "Downloaded ✓ (Download again)"
                    : "Download"}
              </button>
              <p className={`${ui.small} ${ui.muted}`}>Order image + front & back artwork</p>
              {order.artworkUrl ? (
                <ArtworkFileRow
                  label="Front"
                  url={order.artworkUrl}
                  name={order.artworkName}
                  mime={order.artworkMime}
                  downloaded={order.artworkDownloaded}
                />
              ) : null}
              {order.artworkBackUrl || order.artworkBackName ? (
                <ArtworkFileRow
                  label="Back"
                  url={order.artworkBackUrl}
                  name={order.artworkBackName}
                  mime={order.artworkBackMime}
                  downloaded={order.artworkBackDownloaded}
                />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}, (prev, next) => (
  prev.onRefresh === next.onRefresh
  && prev.onOrderDispatched === next.onOrderDispatched
  && prev.order.id === next.order.id
  && prev.order.status === next.order.status
  && prev.order.paymentStatus === next.order.paymentStatus
  && prev.order.lrNumber === next.order.lrNumber
  && prev.order.transportDetails === next.order.transportDetails
  && prev.order.dispatchDate === next.order.dispatchDate
  && prev.order.artworkDownloaded === next.order.artworkDownloaded
  && prev.order.artworkBackDownloaded === next.order.artworkBackDownloaded
  && prev.order.artworkUrl === next.order.artworkUrl
  && prev.order.artworkBackUrl === next.order.artworkBackUrl
  && prev.order.amount === next.order.amount
  && prev.order.cutting === next.order.cutting
  && prev.order.paidWithCredit === next.order.paidWithCredit
));

export default function AdminOrderProcessingSection({
  orders = [],
  view = "pending",
  onRefresh,
  onOrderDispatched,
}) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [page, setPage] = useState(1);

  useAdminTableState(deferredSearch, setPage);

  useEffect(() => {
    setPage(1);
  }, [view]);

  const pendingOrders = useMemo(
    () => orders.filter((order) => !isOrderCompleted(order.status)),
    [orders]
  );
  const completedOrders = useMemo(
    () => orders.filter((order) => isOrderCompleted(order.status)),
    [orders]
  );

  const activeOrders = view === "completed" ? completedOrders : pendingOrders;
  const filtered = useMemo(
    () => filterItems(activeOrders, deferredSearch, ORDER_SEARCH_KEYS),
    [activeOrders, deferredSearch]
  );
  const paged = useMemo(() => paginateItems(filtered, page), [filtered, page]);

  const isPendingView = view !== "completed";
  const title = isPendingView ? "Pending Orders" : "Completed Orders";
  const count = activeOrders.length;

  return (
    <section className={`${ui.adminCard} w-full ${isPendingView && count > 0 ? "border-red-200" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
        <h3 className={isPendingView && count > 0 ? pendingSectionTitleClass(true) : ui.adminH3}>
          {title} ({count})
        </h3>
        <div className="w-full sm:max-w-xs" onFocusCapture={() => { window.__pdAdminTyping = true; }} onBlurCapture={() => { window.__pdAdminTyping = false; }}>
          <AdminSearchBar value={search} onChange={setSearch} placeholder="Search orders..." />
        </div>
      </div>

      <div className="hidden w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 xl:grid xl:grid-cols-8 xl:gap-3">
        {PROCESSING_COLUMNS.map((label) => (
          <p key={label} className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-500">
            {label}
          </p>
        ))}
      </div>

      <div className="grid w-full gap-3 px-4 pb-4">
        {paged.items.length === 0 ? (
          <p className={`rounded-lg border border-slate-200 bg-white px-4 py-8 text-center ${ui.muted}`}>
            {view === "completed" ? "No completed orders." : "No pending orders."}
          </p>
        ) : (
          paged.items.map((order) => (
            <OrderProcessingCard
              key={order.id}
              order={order}
              onRefresh={onRefresh}
              onOrderDispatched={onOrderDispatched}
            />
          ))
        )}
      </div>

      <div className="px-4 pb-4">
        <AdminPagination
          page={paged.page}
          totalPages={paged.totalPages}
          total={paged.total}
          onPageChange={setPage}
        />
      </div>
    </section>
  );
}
