import {
  formatLedgerTableDate,
  formatOrderDescription,
  formatOrderDisplayNumber,
} from "@/lib/order-display";

/** Seller details — PIXEL DIGITAL tax invoice (exact reference). */
export const SELLER = {
  gstin: "27BHGPP8249E1Z0",
  name: "PIXEL DIGITAL",
  address: "SHOP NO 953, NEAR RAM COOLER, NEW SHUKRAWARI, MAHAL NAGPUR, MAHARASHTRA- 440032",
  tel: "9552472196",
  email: "pixeldigital1991@gmail.com",
  placeOfSupply: "Maharashtra (27)",
  bank: "AXIS BANK",
  accountNo: "924020026071933",
  ifsc: "UTIB0001044",
  cgstRate: 9,
  sgstRate: 9,
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function qtyFmt(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function financialYearLabel(dateValue) {
  const d = dateValue ? new Date(dateValue) : new Date();
  if (Number.isNaN(d.getTime())) return financialYearLabel(new Date());
  const year = d.getFullYear();
  const month = d.getMonth();
  const start = month >= 3 ? year : year - 1;
  return `${String(start).slice(-2)}-${String(start + 1).slice(-2)}`;
}

/** PD-00128 → PD/128/26-27 (reference style PD/4/26-27) */
function formatInvoiceNumber(order) {
  const raw = formatOrderDisplayNumber(order);
  const match = String(raw).match(/(\d+)/);
  const serial = match ? String(Number(match[1])) : String(raw).replace(/\D/g, "") || "0";
  const fy = financialYearLabel(order.dispatchDate || order.orderDate || order.createdAt);
  return `PD/${serial}/${fy}`;
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n) {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return `${TENS[t]}${o ? ` ${ONES[o]}` : ""}`;
}

function threeDigits(n) {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h && rest) return `${ONES[h]} Hundred ${twoDigits(rest)}`;
  if (h) return `${ONES[h]} Hundred`;
  return twoDigits(rest);
}

export function amountInWords(value) {
  let n = Math.round(Number(value || 0));
  if (!Number.isFinite(n) || n < 0) n = 0;
  if (n === 0) return "Rupees Zero Only";

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = n;

  const parts = [];
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));

  return `Rupees ${parts.join(" ")} Only`;
}

/** Normalize catalog GST % (5 or 18 typical). Defaults to 18. */
export function normalizeGstRate(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 18;
  return Math.round(n * 100) / 100;
}

/**
 * Line amounts are taxable (exclusive); CGST/SGST = half of total GST each.
 */
function splitExclusiveGst(taxableAmount, totalGstRate = 18) {
  const taxRate = normalizeGstRate(totalGstRate);
  const half = taxRate / 2;
  const taxable = Math.round(Number(taxableAmount || 0) * 100) / 100;
  const cgst = Math.round(taxable * (half / 100) * 100) / 100;
  const sgst = Math.round(taxable * (half / 100) * 100) / 100;
  const taxTotal = Math.round((cgst + sgst) * 100) / 100;
  const grand = Math.round((taxable + taxTotal) * 100) / 100;
  return { taxable, cgst, sgst, taxTotal, grand, taxRate, cgstRate: half, sgstRate: half };
}

function openPrintHtml(html, fileTitle) {
  const win = window.open("", "_blank");
  if (!win) {
    throw new Error("Popup blocked. Please allow popups to download the bill.");
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  try {
    win.document.title = fileTitle;
  } catch {
    // ignore
  }
  win.focus();
  const triggerPrint = () => {
    win.print();
  };
  if (win.document.readyState === "complete") {
    setTimeout(triggerPrint, 350);
  } else {
    win.onload = () => setTimeout(triggerPrint, 350);
  }
}

/** Single invoice sheet (inner table) for one order. */
export function buildOrderBillSheetHtml({ order, account, hsnCode = "", gstRate = 18 }) {
  if (!order) throw new Error("Order not found.");

  const invoiceNo = formatInvoiceNumber(order);
  const dated = formatLedgerTableDate(order.dispatchDate || order.orderDate || order.createdAt);
  const orderDate = formatLedgerTableDate(order.orderDate || order.createdAt);
  const business = account?.business || account?.name || "Customer";
  const buyerAddress = String(account?.address || "").trim();
  const buyerGstin = String(account?.gstNumber || "").trim();
  const product = String(order.product || "LEAFLET / PAMPLET").trim();
  const description = formatOrderDescription(order);
  const cutting = String(order.cutting || "").trim();
  const qty = Number(order.quantity || 0) || 0;
  const hsn = String(hsnCode || order.hsnCode || "").trim() || "—";
  const lrNumber = String(order.lrNumber || "").trim();
  const transport = String(order.transportDetails || "").trim();

  const { taxable, cgst, sgst, taxTotal, grand, taxRate, cgstRate, sgstRate } = splitExclusiveGst(
    order.amount,
    gstRate
  );
  const unitPrice = qty > 0 ? Math.round((taxable / qty) * 100) / 100 : taxable;

  const descLines = [
    `<div class="item-name">${escapeHtml(product)}</div>`,
    description ? `<div class="item-sub">${escapeHtml(description)}</div>` : "",
    cutting ? `<div class="item-sub">Cutting: ${escapeHtml(cutting)}</div>` : "",
  ].join("");

  const buyerBlock = `
    <div class="party-title">Billed to :</div>
    <div class="party-name">${escapeHtml(business)}</div>
    ${buyerAddress ? `<div class="party-addr">${escapeHtml(buyerAddress)}</div>` : ""}
    <div class="party-gst"><b>GSTIN / UIN :</b> ${escapeHtml(buyerGstin || "")}</div>
  `;
  const shipBlock = `
    <div class="party-title">Shipped to :</div>
    <div class="party-name">${escapeHtml(business)}</div>
    ${buyerAddress ? `<div class="party-addr">${escapeHtml(buyerAddress)}</div>` : ""}
    <div class="party-gst"><b>GSTIN / UIN :</b> ${escapeHtml(buyerGstin || "")}</div>
  `;

  // Blank rows so item table has height like the reference invoice
  const blankRows = Array.from({ length: 6 })
    .map(
      () => `
      <tr class="blank">
        <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td>
      </tr>`
    )
    .join("");

  const fileTitle = `Tax Invoice - ${invoiceNo} - ${business}`;

  const sheet = `<table class="invoice outer page-break" cellspacing="0" cellpadding="0">
    <tr>
      <td>
        <div class="head-wrap">
          <div class="top-line">
            <span>GSTIN : ${escapeHtml(SELLER.gstin)}</span>
            <span>Original Copy</span>
          </div>
          <div class="center">
            <div class="tax-title">TAX INVOICE</div>
            <div class="brand">${escapeHtml(SELLER.name)}</div>
            <div class="addr">${escapeHtml(SELLER.address)}</div>
            <div class="contact">Tel. : ${escapeHtml(SELLER.tel)} &nbsp;|&nbsp; email: ${escapeHtml(SELLER.email)}</div>
          </div>
        </div>

        <table class="meta" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <div class="kv"><span class="lbl">Invoice No. :</span> ${escapeHtml(invoiceNo)}</div>
              <div class="kv"><span class="lbl">Dated :</span> ${escapeHtml(dated)}</div>
              <div class="kv"><span class="lbl">Place of Supply :</span> ${escapeHtml(SELLER.placeOfSupply)}</div>
              <div class="kv"><span class="lbl">Reverse Charge :</span> N</div>
              <div class="kv"><span class="lbl">GR/RR No. :</span> ${escapeHtml(lrNumber)}</div>
            </td>
            <td>
              <div class="kv"><span class="lbl">Transport :</span> ${escapeHtml(transport)}</div>
              <div class="kv"><span class="lbl">Vehicle No. :</span></div>
              <div class="kv"><span class="lbl">Station :</span></div>
              <div class="kv"><span class="lbl">Buyer's Order No. :</span> ${escapeHtml(formatOrderDisplayNumber(order))}</div>
              <div class="kv"><span class="lbl">Date :</span> ${escapeHtml(orderDate)}</div>
            </td>
          </tr>
          <tr>
            <td>${buyerBlock}</td>
            <td>${shipBlock}</td>
          </tr>
        </table>

        <table class="items" cellspacing="0" cellpadding="0">
          <thead>
            <tr>
              <th style="width:6%">S.N.</th>
              <th style="width:34%">Description of Goods</th>
              <th style="width:12%">HSN/SAC Code</th>
              <th style="width:10%">Qty.</th>
              <th style="width:8%">Unit</th>
              <th style="width:12%">Price</th>
              <th style="width:18%">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="c">1</td>
              <td>${descLines}</td>
              <td class="c">${escapeHtml(hsn)}</td>
              <td class="r">${escapeHtml(qtyFmt(qty))}</td>
              <td class="c">Pcs.</td>
              <td class="r">${escapeHtml(money(unitPrice))}</td>
              <td class="r">${escapeHtml(money(taxable))}</td>
            </tr>
            ${blankRows}
            <tr>
              <td colspan="3" class="tot-label">Subtotal</td>
              <td class="r">${escapeHtml(qtyFmt(qty))}</td>
              <td></td>
              <td></td>
              <td class="r">${escapeHtml(money(taxable))}</td>
            </tr>
            <tr>
              <td colspan="6" class="tot-label">Add : CGST @ ${cgstRate.toFixed(2)} %</td>
              <td class="r">${escapeHtml(money(cgst))}</td>
            </tr>
            <tr>
              <td colspan="6" class="tot-label">Add : SGST @ ${sgstRate.toFixed(2)} %</td>
              <td class="r">${escapeHtml(money(sgst))}</td>
            </tr>
            <tr class="grand">
              <td colspan="3">${escapeHtml(qtyFmt(qty))} Pcs.</td>
              <td colspan="3" class="tot-label">Grand Total</td>
              <td class="r">₹ ${escapeHtml(money(grand))}</td>
            </tr>
          </tbody>
        </table>

        <table class="taxsum" cellspacing="0" cellpadding="0">
          <thead>
            <tr>
              <th>HSN/SAC</th>
              <th>Tax Rate</th>
              <th>Taxable Amt.</th>
              <th>CGST Amt.</th>
              <th>SGST Amt.</th>
              <th>Total Tax</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${escapeHtml(hsn)}</td>
              <td>${taxRate}%</td>
              <td class="r">${escapeHtml(money(taxable))}</td>
              <td class="r">${escapeHtml(money(cgst))}</td>
              <td class="r">${escapeHtml(money(sgst))}</td>
              <td class="r">${escapeHtml(money(taxTotal))}</td>
            </tr>
          </tbody>
        </table>

        <div class="words">${escapeHtml(amountInWords(grand))}</div>

        <div class="decl">
          We declare that this invoice shows the actual price of the goods Described and that all particulars are true and correct.
        </div>

        <div class="bank">
          Bank Details : ${escapeHtml(SELLER.bank)} &nbsp;|&nbsp; A/C NO: ${escapeHtml(SELLER.accountNo)} &nbsp;|&nbsp; IFSC: ${escapeHtml(SELLER.ifsc)}
        </div>

        <table class="foot" cellspacing="0" cellpadding="0">
          <tr>
            <td style="width:40%">
              <div class="terms-title">Terms &amp; Conditions</div>
              <ol class="terms">
                <li>E. &amp; O.E.</li>
                <li>Goods once sold will not be taken back.</li>
                <li>Interest @ 18% p.a. will be charged if the payment is not made within the stipulated time.</li>
                <li>Subject to 'NAGPUR' Jurisdiction only.</li>
              </ol>
            </td>
            <td style="width:30%">
              <div class="sign-title">Receiver's Signature :</div>
            </td>
            <td style="width:30%">
              <div class="sign-for">For ${escapeHtml(SELLER.name)}</div>
              <div class="auth">Authorised Signatory</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;

  return { sheet, fileTitle, invoiceNo, business };
}

const BILL_DOCUMENT_STYLES = `
  @page { size: A4; margin: 8mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #000;
    font-size: 11px;
    line-height: 1.3;
    background: #fff;
  }
  .invoice {
    width: 100%;
    max-width: 190mm;
    margin: 0 auto;
    border: 1px solid #000;
    border-collapse: collapse;
  }
  .invoice td, .invoice th {
    border: 1px solid #000;
    padding: 4px 6px;
    vertical-align: top;
  }
  .outer > tbody > tr > td { padding: 0; border: none; }
  .head-wrap { padding: 6px 8px 8px; }
  .top-line {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    font-weight: 700;
    margin-bottom: 2px;
  }
  .center { text-align: center; }
  .tax-title {
    font-size: 15px;
    font-weight: 800;
    letter-spacing: 0.5px;
    margin: 2px 0 0;
  }
  .brand {
    font-size: 22px;
    font-weight: 800;
    margin: 2px 0 4px;
    letter-spacing: 0.3px;
  }
  .addr, .contact { font-size: 11px; }
  .contact { margin-top: 2px; }
  table.meta { width: 100%; border-collapse: collapse; }
  table.meta td {
    width: 50%;
    border: 1px solid #000;
    padding: 5px 8px;
    font-size: 11px;
    vertical-align: top;
  }
  .kv { margin: 1px 0; }
  .kv .lbl { font-weight: 700; }
  .party-title { font-weight: 700; margin-bottom: 3px; }
  .party-name { font-weight: 700; font-size: 12px; }
  .party-addr { margin-top: 2px; white-space: pre-wrap; }
  .party-gst { margin-top: 6px; }
  table.items { width: 100%; border-collapse: collapse; }
  table.items th {
    font-size: 10px;
    font-weight: 700;
    text-align: center;
    background: #fff;
    padding: 5px 4px;
    border: 1px solid #000;
  }
  table.items td {
    border: 1px solid #000;
    padding: 4px 5px;
    font-size: 11px;
  }
  table.items td.c { text-align: center; }
  table.items td.r { text-align: right; white-space: nowrap; }
  table.items tr.blank td { height: 18px; border-left: 1px solid #000; border-right: 1px solid #000; border-top: none; border-bottom: none; }
  table.items tr.blank:last-of-type td { border-bottom: 1px solid #000; }
  .item-name { font-weight: 700; }
  .item-sub { font-style: italic; font-size: 10px; margin-top: 1px; }
  .tot-label { text-align: right; font-weight: 700; }
  .grand td { font-weight: 800; }
  .words {
    padding: 6px 8px;
    font-size: 12px;
    font-weight: 700;
    border-top: 1px solid #000;
  }
  table.taxsum { width: 100%; border-collapse: collapse; }
  table.taxsum th, table.taxsum td {
    border: 1px solid #000;
    padding: 4px 5px;
    font-size: 10px;
    text-align: center;
  }
  table.taxsum td.r { text-align: right; }
  .decl {
    padding: 8px;
    text-align: center;
    font-size: 10px;
    border-top: 1px solid #000;
  }
  .bank {
    padding: 6px 8px;
    text-align: center;
    font-size: 11px;
    font-weight: 700;
    border-top: 1px solid #000;
  }
  table.foot { width: 100%; border-collapse: collapse; }
  table.foot td {
    border: 1px solid #000;
    padding: 6px 8px;
    vertical-align: top;
    height: 100px;
  }
  .terms-title { font-weight: 700; margin-bottom: 4px; }
  .terms ol { margin: 0; padding-left: 16px; font-size: 10px; }
  .terms li { margin: 2px 0; }
  .sign-title { font-weight: 700; }
  .sign-for {
    font-weight: 800;
    text-align: right;
    margin-top: 4px;
  }
  .auth {
    text-align: right;
    margin-top: 52px;
    font-size: 10px;
  }
  .page-break { page-break-after: always; margin-bottom: 16px; }
  .page-break:last-child { page-break-after: auto; }
  @media print {
    body { margin: 0; }
    .invoice { max-width: none; }
  }
`;

function wrapBillDocument(title, bodyHtml) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
${BILL_DOCUMENT_STYLES}
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

/**
 * Opens print-ready TAX INVOICE matching the PIXEL DIGITAL reference layout.
 */
export function downloadOrderBill({ order, account, hsnCode = "", gstRate = 18 }) {
  const { sheet, fileTitle } = buildOrderBillSheetHtml({ order, account, hsnCode, gstRate });
  openPrintHtml(wrapBillDocument(fileTitle, sheet), fileTitle);
}

/**
 * Print / save multiple tax invoices (one page each) for a date range.
 */
export function downloadOrderBillsBulk(items = []) {
  if (!items.length) throw new Error("No bills found for the selected dates.");
  const sheets = items
    .map((item) => buildOrderBillSheetHtml(item).sheet)
    .join("\n");
  const title = `Tax Invoices (${items.length})`;
  openPrintHtml(wrapBillDocument(title, sheets), title);
}

/** Resolve HSN + GST % from public catalog by matching order paperGsm. */
export function resolveBillMetaFromCatalog(catalog, order) {
  const paperName = String(order?.paperGsm || "").trim().toLowerCase();
  if (!paperName || !catalog?.paperTypes?.length) {
    return { hsnCode: "", gstRate: 18 };
  }
  const match = catalog.paperTypes.find(
    (p) => String(p.name || "").trim().toLowerCase() === paperName
  );
  return {
    hsnCode: String(match?.hsnCode || "").trim(),
    gstRate: normalizeGstRate(match?.gstRate ?? 18),
  };
}

/** @deprecated use resolveBillMetaFromCatalog */
export function resolveHsnFromCatalog(catalog, order) {
  return resolveBillMetaFromCatalog(catalog, order).hsnCode;
}
