import { formatRupees } from "@/lib/api";
import { formatLedgerTableDate, formatOrderDescription } from "@/lib/order-display";

export function normalizeWhatsAppPhone(phone) {
  const raw = String(phone || "").trim();
  if (!raw || raw.startsWith("g-")) return null;

  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length > 10) return digits;
  return null;
}

export function buildDispatchWhatsAppMessage(order, overrides = {}) {
  const lrNumber = overrides.lrNumber ?? order.lrNumber;
  const transportDetails = overrides.transportDetails ?? order.transportDetails;
  const dispatchDate = overrides.dispatchDate ?? order.dispatchDate;
  const fileName =
    overrides.fileName ??
    order.fileName ??
    order.title ??
    order.artworkName ??
    order.artworkFrontName ??
    "";

  const lines = [
    "*PIXEL DIGITAL - Dispatch Update*",
    "",
    `Order No: ${order.orderNumber || "—"}`,
    `Customer: ${order.business || order.customerName || "—"}`,
    `Specs: ${formatOrderDescription(order)}`,
    `File Name : ${fileName}`,
    "",
    `LR No: ${lrNumber || "—"}`,
    `Transport: ${transportDetails || "—"}`,
    `Dispatch Date: ${formatLedgerTableDate(dispatchDate)}`,
    "",
    "Thank you for your order.",
  ];

  return lines.join("\n");
}

export function buildJobCompletedWhatsAppMessage(order) {
  const customer = order.business || order.customerName || "Customer";
  const orderNo = order.orderNumber || "—";
  return [
    "Dear",
    `*${customer}*`,
    "Your Order No.",
    `*${orderNo}*`,
    "is Completed and ready for Despatch.",
    "",
    "Thank you for Your Order.",
  ].join("\n");
}

export function openWhatsAppToCustomer(phone, message) {
  const waPhone = normalizeWhatsAppPhone(phone);
  if (!waPhone || !message) return false;
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  const url = `whatsapp://send?phone=${waPhone}&text=${encodeURIComponent(message)}`;
  const link = document.createElement("a");
  link.href = url;
  link.style.display = "none";
  link.setAttribute("aria-hidden", "true");
  document.body.appendChild(link);
  link.click();
  link.remove();

  return true;
}

export async function notifyCustomerDispatch(order, overrides = {}) {
  const message = buildDispatchWhatsAppMessage(order, overrides);
  const opened = openWhatsAppToCustomer(order.customerPhone, message);
  return { opened, message };
}

export function notifyCustomerJobCompleted(order) {
  const message = buildJobCompletedWhatsAppMessage(order);
  const opened = openWhatsAppToCustomer(order.customerPhone, message);
  return { opened, message };
}

export function buildReceiptWhatsAppMessage({
  business,
  customerName,
  amount,
  receiptNumber,
  remainingOutstanding,
}) {
  const customer = business || customerName || "Customer";
  const lines = [
    "*PIXEL DIGITAL - Payment Receipt*",
    "",
    `Dear *${customer}*`,
    "",
    `We have received payment of *${formatRupees(amount)}*.`,
  ];
  if (receiptNumber) {
    lines.push(`Receipt No: *${receiptNumber}*`);
  }
  lines.push(
    "",
    `Your remaining outstanding balance is *${formatRupees(remainingOutstanding)}*.`,
    "",
    "Thank you."
  );
  return lines.join("\n");
}

export function notifyCustomerReceipt({
  phone,
  business,
  customerName,
  amount,
  receiptNumber,
  remainingOutstanding,
}) {
  const message = buildReceiptWhatsAppMessage({
    business,
    customerName,
    amount,
    receiptNumber,
    remainingOutstanding,
  });
  const opened = openWhatsAppToCustomer(phone, message);
  return { opened, message };
}
