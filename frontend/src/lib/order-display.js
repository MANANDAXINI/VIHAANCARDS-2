import { ui } from "@/lib/ui";

export function formatLedgerTableDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/** Strip legacy "Other Charges:" prefix from ledger narration for display. */
export function formatLedgerNarration(label) {
  const text = String(label || "").trim();
  if (!text) return "—";
  return text.replace(/^Other Charges:\s*/i, "").trim() || text;
}

export function formatOrderDisplayNumber(order) {
  if (order?.orderNumber) return order.orderNumber;
  if (order?.pendingApproval) return "After Approval";
  return "Pending";
}

export function formatOrderDescription(order) {
  if (!order) return "—";
  // Cutting is shown separately (label + value) on admin / slip — keep specs clean.
  const parts = [
    order.paperGsm || "—",
    order.size || "—",
    order.printingSide || "—",
  ];
  if (order.finish) parts.push(order.finish);
  return parts.join(", ");
}

export const JOB_VERIFIED_LABEL = "PAYMENT VERIFIED AND JOB MOVED TO NEXT PROCESS";
export const JOB_LIMIT_USED_LABEL = "LIMIT USED AND JOB MOVED TO NEXT PROCESS";
export const JOB_PRINTING_LABEL = "PRINTING AND OTHER PROCESS STARTED";
export const JOB_PROCESS_STARTED_LABEL = "PRINTING & OTHER PROCESS STARTED";

export const ORDER_COMPLETED_LABEL = "ORDER COMPLETED";
/** Shown after admin clicks Job Completed (before despatch). */
export const JOB_COMPLETED_LABEL = "ORDER COMPLETED";
const ORDER_COMPLETED_CLASS =
  "inline-block max-w-[12rem] rounded px-2 py-1.5 text-center text-[0.65rem] font-bold uppercase leading-tight tracking-wide text-white bg-emerald-600 sm:text-xs";

export function isOrderCompletedStatus(status) {
  const s = String(status || "").toUpperCase();
  return s === "DISPATCHED" || s === "COMPLETED";
}

/** Job Completed button / Job Update folder — ready for despatch, not yet LR-saved. */
export function isJobCompletedStatus(status) {
  return String(status || "").toUpperCase() === "PRINTING_PROCESS_STARTED";
}

export function formatJobProcess(status, options = {}) {
  const s = String(status || "").toUpperCase();
  // Job Completed → PRINTING_PROCESS_STARTED → green ORDER COMPLETED on customer + admin history.
  // Dispatch Save → DISPATCHED / COMPLETED → same label.
  if (isOrderCompletedStatus(s) || isJobCompletedStatus(s)) return JOB_COMPLETED_LABEL;
  if (s === "IN_PRINTING") return JOB_PRINTING_LABEL;
  if (s === "PAYMENT_VERIFIED") {
    return options.hasCreditLimit ? JOB_LIMIT_USED_LABEL : JOB_VERIFIED_LABEL;
  }
  if (s === "PENDING" || s === "PAYMENT_SUBMITTED" || s === "PAYMENT_PENDING") return "Pending";
  return "Pending";
}

export function isPendingPaymentOrder(order) {
  return Boolean(order?.pendingApproval || order?.pendingPayment);
}

export function accountHasCreditLimit(accountOrOrder) {
  return Number(accountOrOrder?.creditLimit || accountOrOrder?.accountCreditLimit || 0) > 0;
}

export function formatJobProcessForOrder(order, options = {}) {
  if (isPendingPaymentOrder(order)) return "Pending";
  // Per-order payment mode wins; otherwise fall back to account credit limit.
  let usedCredit;
  if (order?.paidWithCredit === true) {
    usedCredit = true;
  } else if (order?.paidWithCredit === false) {
    usedCredit = false;
  } else if (options.hasCreditLimit !== undefined) {
    usedCredit = Boolean(options.hasCreditLimit);
  } else {
    usedCredit = accountHasCreditLimit(options.account) || accountHasCreditLimit(order);
  }
  return formatJobProcess(order?.status, { hasCreditLimit: usedCredit });
}

export function jobProcessClassForOrder(order) {
  if (isPendingPaymentOrder(order)) {
    return `${ui.pill} bg-amber-100 text-amber-800`;
  }
  const s = String(order?.status || "").toUpperCase();
  if (isOrderCompletedStatus(s) || isJobCompletedStatus(s)) return ORDER_COMPLETED_CLASS;
  return jobProcessClass(order?.status);
}

export function jobProcessClass(status) {
  const s = String(status || "").toUpperCase();
  if (s === "COMPLETED" || isJobCompletedStatus(s)) {
    return "inline-block max-w-[12rem] rounded px-2 py-1.5 text-center text-[0.65rem] font-bold uppercase leading-tight tracking-wide text-white bg-emerald-600 sm:text-xs";
  }
  if (s === "DISPATCHED") {
    return "inline-block max-w-[12rem] rounded px-2 py-1.5 text-center text-[0.65rem] font-bold uppercase leading-tight tracking-wide text-white bg-indigo-600 sm:text-xs";
  }
  if (s === "IN_PRINTING") {
    return "inline-block max-w-[12rem] rounded px-2 py-1.5 text-center text-[0.65rem] font-bold uppercase leading-tight tracking-wide text-white bg-blue-600 sm:text-xs";
  }
  if (s === "PAYMENT_VERIFIED") {
    return "inline-block max-w-[12rem] rounded px-2 py-1.5 text-center text-[0.65rem] font-bold uppercase leading-tight tracking-wide text-white bg-amber-500 sm:text-xs";
  }
  if (s === "PENDING" || s === "PAYMENT_SUBMITTED" || s === "PAYMENT_PENDING") {
    return `${ui.pill} bg-amber-100 text-amber-800`;
  }
  return `${ui.pill} bg-amber-100 text-amber-800`;
}

export function formatDespatchLabel(order) {
  if (isPendingPaymentOrder(order)) return "Pending";
  const s = String(order?.status || "").toUpperCase();
  // Only after dispatch Save (LR) — not when Job Completed alone.
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
  if (balance < 0) {
    return `Advance Rs. ${Math.abs(balance).toLocaleString("en-IN")}`;
  }
  return `Rs. ${balance.toLocaleString("en-IN")}`;
}

export function formatOutstandingOrAdvance(value) {
  const amount = Number(value || 0);
  if (amount < 0) {
    return `Advance ${formatRupeesSafe(Math.abs(amount))}`;
  }
  return formatRupeesSafe(amount);
}

function formatRupeesSafe(amount) {
  return `Rs. ${Number(amount || 0).toLocaleString("en-IN")}`;
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
    // Allow negative running balance = advance credit on account.
    running = running + debit - credit;
    return {
      ...entry,
      outstandingAfter: running,
    };
  });

  const pendingOrderRows = pendingRequests
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

  // Pending advance / outstanding payment requests (show until admin approves).
  let pendingRunning = displayRows.length
    ? Number(displayRows[displayRows.length - 1].outstandingAfter || 0)
    : Number(account?.previousOutstanding || 0);
  const pendingPaymentRows = pendingRequests
    .filter(
      (req) =>
        (req.type === "WALLET_TOPUP" || req.type === "OUTSTANDING_PAYMENT")
        && req.status === "PENDING"
    )
    .map((req) => {
      const amount = Number(req.amount) || 0;
      pendingRunning -= amount;
      return {
        id: `pending-payment-${req.id}`,
        entryDate: req.createdAt,
        createdAt: req.createdAt,
        label:
          req.type === "WALLET_TOPUP"
            ? "Advance Payment (Pending Approval)"
            : "Outstanding Payment (Pending Approval)",
        debit: 0,
        credit: amount,
        outstandingAfter: pendingRunning,
        pending: true,
      };
    });

  return [...displayRows, ...pendingOrderRows, ...pendingPaymentRows].sort(sortLedgerEntries);
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
        finish: d.finish || "",
        cutting: d.cutting || "",
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
