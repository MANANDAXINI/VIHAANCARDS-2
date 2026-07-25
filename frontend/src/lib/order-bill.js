import { formatRupees } from "@/lib/api";
import {
  formatLedgerTableDate,
  formatOrderDescription,
  formatOrderDisplayNumber,
  formatTransportLine,
} from "@/lib/order-display";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function todayLabel() {
  const d = new Date();
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Opens a print-ready tax bill / invoice for one order and triggers the browser
 * print dialog (Save as PDF). Shown only after dispatch in Order History.
 */
export function downloadOrderBill({ order, account, hsnCode = "" }) {
  if (!order) throw new Error("Order not found.");

  const orderNo = formatOrderDisplayNumber(order);
  const business = account?.business || account?.name || "Customer";
  const buyerLines = [
    account?.name && account.name !== business ? account.name : null,
    account?.address || null,
    account?.phone ? `Phone: ${account.phone}` : null,
    account?.gstNumber ? `GSTIN: ${account.gstNumber}` : null,
  ].filter(Boolean);

  const product = String(order.product || "LEAFLET / PAMPLET").trim();
  const description = formatOrderDescription(order);
  const qty = Number(order.quantity || 0);
  const amount = Number(order.amount || 0);
  const hsn = String(hsnCode || order.hsnCode || "").trim();
  const transport = formatTransportLine(order);
  const billDate = formatLedgerTableDate(order.dispatchDate || order.orderDate || order.createdAt);
  const orderDate = formatLedgerTableDate(order.orderDate || order.createdAt);
  const fileTitle = `Bill - ${orderNo} - ${business}`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(fileTitle)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 24px; }
  .head { display: flex; justify-content: space-between; gap: 16px; border-bottom: 2px solid #b91c1c; padding-bottom: 14px; margin-bottom: 18px; }
  .brand { font-size: 22px; font-weight: 800; letter-spacing: .02em; color: #b91c1c; }
  .sub { font-size: 12px; color: #64748b; margin-top: 4px; }
  .doc { text-align: right; }
  .doc h1 { margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: .06em; }
  .meta { font-size: 12px; color: #475569; margin-top: 6px; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 18px; }
  .box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 14px; min-height: 96px; }
  .box h2 { margin: 0 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #64748b; }
  .box .name { font-size: 15px; font-weight: 700; }
  .box p { margin: 3px 0 0; font-size: 12px; color: #334155; white-space: pre-line; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 14px; }
  th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; vertical-align: top; }
  th { background: #f8fafc; text-transform: uppercase; font-size: 10px; letter-spacing: .04em; color: #475569; }
  td.r, th.r { text-align: right; white-space: nowrap; }
  td.c, th.c { text-align: center; }
  .totals { width: 280px; margin-left: auto; }
  .totals td { border: none; padding: 4px 0; font-size: 13px; }
  .totals .grand td { border-top: 2px solid #0f172a; padding-top: 8px; font-weight: 800; font-size: 15px; }
  .notes { margin-top: 16px; font-size: 12px; color: #475569; }
  .foot { margin-top: 28px; font-size: 11px; color: #94a3b8; text-align: center; }
  @media print { body { margin: 0; } @page { margin: 12mm; } }
</style>
</head>
<body>
  <div class="head">
    <div>
      <div class="brand">PIXEL DIGITAL</div>
      <div class="sub">B2B Printing Solutions</div>
      <div class="sub">www.pixel-digital.in</div>
    </div>
    <div class="doc">
      <h1>Tax Invoice / Bill</h1>
      <div class="meta">Bill No: <strong>${escapeHtml(orderNo)}</strong></div>
      <div class="meta">Bill Date: <strong>${escapeHtml(billDate)}</strong></div>
      <div class="meta">Order Date: ${escapeHtml(orderDate)}</div>
    </div>
  </div>

  <div class="parties">
    <div class="box">
      <h2>Bill From</h2>
      <div class="name">PIXEL DIGITAL</div>
      <p>B2B Printing Solutions<br/>www.pixel-digital.in</p>
    </div>
    <div class="box">
      <h2>Bill To</h2>
      <div class="name">${escapeHtml(business)}</div>
      ${buyerLines.length ? `<p>${buyerLines.map(escapeHtml).join("<br/>")}</p>` : ""}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="c" style="width:3rem">#</th>
        <th>Item / Description</th>
        <th class="c" style="width:7rem">HSN Code</th>
        <th class="r" style="width:6rem">Qty</th>
        <th class="r" style="width:8rem">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="c">1</td>
        <td>
          <strong>${escapeHtml(product)}</strong><br/>
          <span style="color:#475569">${escapeHtml(description)}</span>
          ${order.cutting ? `<br/><span style="color:#475569">Cutting: ${escapeHtml(order.cutting)}</span>` : ""}
        </td>
        <td class="c">${escapeHtml(hsn || "—")}</td>
        <td class="r">${qty > 0 ? escapeHtml(qty.toLocaleString("en-IN")) : "—"}</td>
        <td class="r">${escapeHtml(formatRupees(amount))}</td>
      </tr>
    </tbody>
  </table>

  <table class="totals">
    <tr>
      <td>Total Amount</td>
      <td class="r"><strong>${escapeHtml(formatRupees(amount))}</strong></td>
    </tr>
    <tr class="grand">
      <td>Grand Total</td>
      <td class="r">${escapeHtml(formatRupees(amount))}</td>
    </tr>
  </table>

  <div class="notes">
    <div><strong>Despatch:</strong> ${escapeHtml(formatLedgerTableDate(order.dispatchDate) !== "—" ? formatLedgerTableDate(order.dispatchDate) : "Despatched")}</div>
    <div><strong>Transport / LR:</strong> ${escapeHtml(transport || "None")}</div>
  </div>

  <div class="foot">This is a computer-generated bill. Generated on ${escapeHtml(todayLabel())}.</div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) {
    throw new Error("Popup blocked. Please allow popups to download the bill.");
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();

  const triggerPrint = () => {
    win.print();
  };

  if (win.document.readyState === "complete") {
    setTimeout(triggerPrint, 300);
  } else {
    win.onload = () => setTimeout(triggerPrint, 300);
  }
}

/** Resolve HSN from public catalog by matching order paperGsm to paper type name. */
export function resolveHsnFromCatalog(catalog, order) {
  const paperName = String(order?.paperGsm || "").trim().toLowerCase();
  if (!paperName || !catalog?.paperTypes?.length) return "";
  const match = catalog.paperTypes.find(
    (p) => String(p.name || "").trim().toLowerCase() === paperName
  );
  return String(match?.hsnCode || "").trim();
}
