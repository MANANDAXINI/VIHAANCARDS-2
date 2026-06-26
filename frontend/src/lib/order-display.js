import { ui } from "@/lib/ui";

export function formatLedgerTableDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export function formatOrderDisplayNumber(order) {
  if (order?.orderNumber) return order.orderNumber;
  if (order?.pendingApproval) return "After Approval";
  return "Pending";
}

export function formatOrderDescription(order) {
  if (!order) return "—";
  return `${order.paperGsm || "—"}, ${order.size || "—"}, ${order.printingSide || "—"}`;
}

export const JOB_VERIFIED_LABEL = "PAYMENT VERIFIED AND JOB MOVED TO NEXT PROCESS";
export const JOB_PRINTING_LABEL = "PROCEEDED TO PRINTING";

export function formatJobProcess(status) {
  const s = String(status || "").toUpperCase();
  if (s === "DISPATCHED" || s === "COMPLETED") return "JOB COMPLETED";
  if (s === "IN_PRINTING") return JOB_PRINTING_LABEL;
  if (s === "PAYMENT_VERIFIED") return JOB_VERIFIED_LABEL;
  if (s === "PENDING" || s === "PAYMENT_SUBMITTED" || s === "PAYMENT_PENDING") return "Pending";
  return "Pending";
}

export function isPendingPaymentOrder(order) {
  return Boolean(order?.pendingApproval || order?.pendingPayment);
}

export function formatJobProcessForOrder(order) {
  if (isPendingPaymentOrder(order)) return "Pending";
  return formatJobProcess(order?.status);
}

export function jobProcessClassForOrder(order) {
  if (isPendingPaymentOrder(order)) {
    return `${ui.pill} bg-amber-100 text-amber-800`;
  }
  return jobProcessClass(order?.status);
}

export function jobProcessClass(status) {
  const s = String(status || "").toUpperCase();
  if (s === "DISPATCHED" || s === "COMPLETED") {
    return "inline-block max-w-[12rem] rounded px-2 py-1.5 text-center text-[0.65rem] font-bold uppercase leading-tight tracking-wide text-white bg-teal-600 sm:text-xs";
  }
  if (s === "IN_PRINTING") {
    return "inline-block max-w-[12rem] rounded px-2 py-1.5 text-center text-[0.65rem] font-bold uppercase leading-tight tracking-wide text-white bg-teal-600 sm:text-xs";
  }
  if (s === "PAYMENT_VERIFIED") {
    return "inline-block max-w-[12rem] rounded px-2 py-1.5 text-center text-[0.65rem] font-bold uppercase leading-tight tracking-wide text-white bg-teal-700 sm:text-xs";
  }
  if (s === "PENDING" || s === "PAYMENT_SUBMITTED" || s === "PAYMENT_PENDING") {
    return `${ui.pill} bg-amber-100 text-amber-800`;
  }
  return `${ui.pill} bg-amber-100 text-amber-800`;
}

export function formatDespatchLabel(order) {
  if (isPendingPaymentOrder(order)) return "Pending";
  const s = String(order?.status || "").toUpperCase();
  if (s === "DISPATCHED" || s === "COMPLETED") {
    const date = order.dispatchDate ? formatLedgerTableDate(order.dispatchDate) : "";
    return date ? `Despatched ${date}` : "Despatched";
  }
  return "Pending";
}

export function formatTransportLine(order) {
  const parts = [order?.lrNumber, order?.transportDetails].filter(Boolean);
  return parts.length ? parts.join(" ") : "—";
}

export function formatLedgerDebit(entry) {
  const debit = Number(entry?.debit || 0);
  return debit > 0 ? `Rs. ${debit.toLocaleString("en-IN")}` : "—";
}

export function formatLedgerCredit(entry) {
  const credit = Number(entry?.credit || 0);
  return credit > 0 ? `Payment Received Rs. ${credit.toLocaleString("en-IN")}` : "—";
}

export function formatLedgerBalance(entry) {
  const balance = Number(entry?.outstandingAfter ?? 0);
  return `Rs. ${balance.toLocaleString("en-IN")}`;
}

export function formatReceivableAmount(value) {
  const amount = Number(value || 0);
  return amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatReceivableDate(value) {
  return formatLedgerTableDate(value);
}

function sortLedgerEntries(a, b) {
  const dateDelta = new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime();
  if (dateDelta !== 0) return dateDelta;
  return String(a.createdAt || a.id).localeCompare(String(b.createdAt || b.id));
}

export function buildLedgerDisplayRows(entries = [], pendingRequests = [], account = null) {
  const sorted = [...entries].sort(sortLedgerEntries);
  let running = sorted.length > 0
    ? Number(sorted[0].oldOutstandingBefore || 0)
    : Number(account?.previousOutstanding || 0);

  const displayRows = sorted.map((entry) => {
    const debit = Number(entry.debit || 0);
    const credit = Number(entry.credit || 0);
    running = Math.max(0, running + debit - credit);
    return {
      ...entry,
      outstandingAfter: running,
    };
  });

  const pendingRows = pendingRequests
    .filter((req) => req.type === "ORDER_PAYMENT" && req.status === "PENDING" && req.pendingOrderData)
    .map((req) => {
      const d = req.pendingOrderData;
      const amount = Number(d.amount) || Number(req.amount) || 0;
      running += amount;
      return {
        id: `pending-ledger-${req.id}`,
        entryDate: req.createdAt,
        createdAt: req.createdAt,
        label: `AfterApproval - ${d.product || "LEAFLET / PAMPLET"}`,
        debit: amount,
        credit: 0,
        outstandingAfter: running,
        pending: true,
      };
    });

  return [...displayRows, ...pendingRows].sort(sortLedgerEntries);
}

export function mergeLedgerEntries(entries = [], pendingRequests = [], account = null) {
  return buildLedgerDisplayRows(entries, pendingRequests, account);
}

export function mergeOrderHistory(orders = [], pendingRequests = []) {
  const pendingRows = pendingRequests
    .filter((req) => req.type === "ORDER_PAYMENT" && req.status === "PENDING" && req.pendingOrderData)
    .map((req) => {
      const d = req.pendingOrderData;
      return {
        id: `pending-${req.id}`,
        pendingApproval: true,
        pendingPayment: true,
        orderNumber: null,
        product: d.product || "LEAFLET / PAMPLET",
        paperGsm: d.paperGsm,
        size: d.size,
        quantity: d.quantity,
        printingSide: d.printingSide,
        amount: Number(d.amount) || Number(req.amount) || 0,
        artworkName: d.artworkName,
        artworkPath: d.artworkPath,
        artworkMime: d.artworkMime,
        artworkBackName: d.artworkBackName,
        artworkBackPath: d.artworkBackPath,
        artworkBackMime: d.artworkBackMime,
        artworkUrl: d.artworkPath ? `/api/files/${d.artworkPath}` : null,
        artworkBackUrl: d.artworkBackPath ? `/api/files/${d.artworkBackPath}` : null,
        status: "PENDING",
        paymentStatus: "PENDING",
        lrNumber: "",
        transportDetails: "",
        dispatchDate: null,
        createdAt: req.createdAt,
      };
    });

  return [...orders, ...pendingRows].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
