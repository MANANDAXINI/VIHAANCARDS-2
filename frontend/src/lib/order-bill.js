import {
  formatLedgerTableDate,
  formatOrderDescription,
  formatOrderDisplayNumber,
} from "@/lib/order-display";

/** Seller details — PIXEL DIGITAL tax invoice (reference format). */
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

/** Indian financial year label from a date, e.g. 26-27 */
function financialYearLabel(dateValue) {
  const d = dateValue ? new Date(dateValue) : new Date();
  if (Number.isNaN(d.getTime())) return financialYearLabel(new Date());
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-based; Apr = 3
  const start = month >= 3 ? year : year - 1;
  const a = String(start).slice(-2);
  const b = String(start + 1).slice(-2);
  return `${a}-${b}`;
}

/** PD-00128 → PD/128/26-27 */
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

/** Amount in words (Indian: Crore / Lakh / Thousand). */
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

/**
 * Order amount is treated as GST-inclusive grand total (matches portal amount).
 * Taxable + CGST + SGST = order.amount.
 */
function splitInclusiveGst(grandTotal, cgstRate = SELLER.cgstRate, sgstRate = SELLER.sgstRate) {
  const rate = (Number(cgstRate) + Number(sgstRate)) / 100;
  const grand = Math.round(Number(grandTotal || 0) * 100) / 100;
  const taxable = Math.round((grand / (1 + rate)) * 100) / 100;
  const taxTotal = Math.round((grand - taxable) * 100) / 100;
  const cgst = Math.round((taxTotal / 2) * 100) / 100;
  const sgst = Math.round((taxTotal - cgst) * 100) / 100;
  return { taxable, cgst, sgst, taxTotal, grand };
}

/**
 * Opens a print-ready TAX INVOICE matching the PIXEL DIGITAL reference format.
 */
export function downloadOrderBill({ order, account, hsnCode = "" }) {
  if (!order) throw new Error("Order not found.");

  const invoiceNo = formatInvoiceNumber(order);
  const dated = formatLedgerTableDate(order.dispatchDate || order.orderDate || order.createdAt);
  const business = account?.business || account?.name || "Customer";
  const buyerAddress = String(account?.address || "").trim();
  const buyerGstin = String(account?.gstNumber || "").trim();
  const product = String(order.product || "LEAFLET / PAMPLET").trim();
  const description = formatOrderDescription(order);
  const cutting = String(order.cutting || "").trim();
  const qty = Number(order.quantity || 0) || 0;
  const hsn = String(hsnCode || order.hsnCode || "").trim();
  const lrNumber = String(order.lrNumber || "").trim();
  const transport = String(order.transportDetails || "").trim();
  const taxRate = SELLER.cgstRate + SELLER.sgstRate;

  const { taxable, cgst, sgst, taxTotal, grand } = splitInclusiveGst(order.amount);
  const unitPrice = qty > 0 ? Math.round((taxable / qty) * 100) / 100 : taxable;

  const descHtml = [
    escapeHtml(product),
    description ? `<br/><i>${escapeHtml(description)}</i>` : "",
    cutting ? `<br/><i>Cutting: ${escapeHtml(cutting)}</i>` : "",
  ].join("");

  const fileTitle = `Tax Invoice - ${invoiceNo} - ${business}`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(fileTitle)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #111;
    margin: 12px;
    font-size: 11px;
    line-height: 1.35;
  }
  .sheet { border: 1.5px solid #222; max-width: 210mm; margin: 0 auto; }
  .pad { padding: 8px 10px; }
  .row { display: flex; justify-content: space-between; gap: 8px; }
  .gstin { font-size: 11px; font-weight: 700; }
  .copy { font-size: 11px; font-weight: 700; }
  .center { text-align: center; }
  .title { font-size: 16px; font-weight: 800; letter-spacing: .04em; margin: 2px 0; }
  .brand { font-size: 20px; font-weight: 800; margin: 2px 0 4px; }
  .addr { font-size: 11px; }
  .contact { font-size: 11px; margin-top: 2px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid #222; }
  .cell { padding: 6px 8px; font-size: 11px; }
  .cell + .cell { border-left: 1px solid #222; }
  .kv { margin: 1px 0; }
  .kv b { font-weight: 700; }
  .party-head { font-weight: 700; margin-bottom: 4px; }
  .party-name { font-weight: 700; font-size: 12px; }
  table.items { width: 100%; border-collapse: collapse; border-top: 1px solid #222; }
  table.items th, table.items td {
    border: 1px solid #222;
    padding: 5px 6px;
    vertical-align: top;
  }
  table.items th {
    font-size: 10px;
    font-weight: 700;
    background: #f3f3f3;
    text-align: center;
  }
  table.items td.c { text-align: center; }
  table.items td.r { text-align: right; white-space: nowrap; }
  table.items td.desc { text-align: left; }
  .totals-row td { font-weight: 700; }
  .words { padding: 6px 8px; border-top: 1px solid #222; font-size: 11px; }
  .tax-wrap { padding: 0; border-top: 1px solid #222; }
  table.tax { width: 100%; border-collapse: collapse; }
  table.tax th, table.tax td {
    border: 1px solid #222;
    padding: 4px 6px;
    font-size: 10px;
    text-align: center;
  }
  table.tax th { background: #f3f3f3; }
  table.tax td.r { text-align: right; }
  .decl { padding: 6px 8px; border-top: 1px solid #222; font-size: 10px; }
  .bank { padding: 6px 8px; border-top: 1px solid #222; font-size: 11px; font-weight: 700; }
  .foot { display: grid; grid-template-columns: 1.2fr 0.9fr 0.9fr; border-top: 1px solid #222; }
  .foot > div { padding: 6px 8px; min-height: 88px; }
  .foot > div + div { border-left: 1px solid #222; }
  .terms-title { font-weight: 700; margin-bottom: 4px; }
  .terms ol { margin: 0; padding-left: 16px; font-size: 10px; }
  .sign-label { font-weight: 700; margin-bottom: 48px; }
  .sign-for { font-weight: 700; text-align: right; }
  .muted { color: #444; font-weight: 400; }
  @media print {
    body { margin: 0; }
    @page { margin: 8mm; size: A4; }
    .sheet { border-width: 1px; }
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="pad">
      <div class="row">
        <div class="gstin">GSTIN: ${escapeHtml(SELLER.gstin)}</div>
        <div class="copy">Original Copy</div>
      </div>
      <div class="center">
        <div class="title">TAX INVOICE</div>
        <div class="brand">${escapeHtml(SELLER.name)}</div>
        <div class="addr">${escapeHtml(SELLER.address)}</div>
        <div class="contact">Tel.: ${escapeHtml(SELLER.tel)} &nbsp; email: ${escapeHtml(SELLER.email)}</div>
      </div>
    </div>

    <div class="grid2">
      <div class="cell">
        <div class="kv"><b>Invoice No. :</b> ${escapeHtml(invoiceNo)}</div>
        <div class="kv"><b>Dated :</b> ${escapeHtml(dated)}</div>
        <div class="kv"><b>Place of Supply :</b> ${escapeHtml(SELLER.placeOfSupply)}</div>
        <div class="kv"><b>Reverse Charge :</b> N</div>
        <div class="kv"><b>GR/RR No. :</b> ${escapeHtml(lrNumber)}</div>
      </div>
      <div class="cell">
        <div class="kv"><b>Transport :</b> ${escapeHtml(transport)}</div>
        <div class="kv"><b>Vehicle No. :</b></div>
        <div class="kv"><b>Station :</b></div>
        <div class="kv"><b>Buyer's Order No. :</b> ${escapeHtml(formatOrderDisplayNumber(order))}</div>
        <div class="kv"><b>Date :</b> ${escapeHtml(formatLedgerTableDate(order.orderDate || order.createdAt))}</div>
      </div>
    </div>

    <div class="grid2">
      <div class="cell">
        <div class="party-head">Billed to :</div>
        <div class="party-name">${escapeHtml(business)}</div>
        ${buyerAddress ? `<div>${escapeHtml(buyerAddress)}</div>` : ""}
        <div style="margin-top:4px"><b>GSTIN / UIN :</b> ${escapeHtml(buyerGstin || "—")}</div>
      </div>
      <div class="cell">
        <div class="party-head">Shipped to :</div>
        <div class="party-name">${escapeHtml(business)}</div>
        ${buyerAddress ? `<div>${escapeHtml(buyerAddress)}</div>` : ""}
        <div style="margin-top:4px"><b>GSTIN / UIN :</b> ${escapeHtml(buyerGstin || "—")}</div>
      </div>
    </div>

    <table class="items">
      <thead>
        <tr>
          <th style="width:2.2rem">S.N.</th>
          <th>Description of Goods</th>
          <th style="width:6.5rem">HSN/SAC<br/>Code</th>
          <th style="width:4.5rem">Qty.</th>
          <th style="width:3.5rem">Unit</th>
          <th style="width:5.5rem">Price</th>
          <th style="width:6.5rem">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="c">1</td>
          <td class="desc">${descHtml}</td>
          <td class="c">${escapeHtml(hsn || "—")}</td>
          <td class="r">${escapeHtml(qtyFmt(qty))}</td>
          <td class="c">Pcs.</td>
          <td class="r">${escapeHtml(money(unitPrice))}</td>
          <td class="r">${escapeHtml(money(taxable))}</td>
        </tr>
        <tr class="totals-row">
          <td colspan="3" class="r">Subtotal</td>
          <td class="r">${escapeHtml(qtyFmt(qty))}</td>
          <td></td>
          <td></td>
          <td class="r">${escapeHtml(money(taxable))}</td>
        </tr>
        <tr>
          <td colspan="6" class="r">Add: CGST @ ${SELLER.cgstRate.toFixed(2)}%</td>
          <td class="r">${escapeHtml(money(cgst))}</td>
        </tr>
        <tr>
          <td colspan="6" class="r">Add: SGST @ ${SELLER.sgstRate.toFixed(2)}%</td>
          <td class="r">${escapeHtml(money(sgst))}</td>
        </tr>
        <tr class="totals-row">
          <td colspan="3"><span class="muted">Grand Total</span> &nbsp; ${escapeHtml(qtyFmt(qty))} Pcs.</td>
          <td colspan="3" class="r">Grand Total</td>
          <td class="r">₹ ${escapeHtml(money(grand))}</td>
        </tr>
      </tbody>
    </table>

    <div class="words"><b>Amount in Words :</b> ${escapeHtml(amountInWords(grand))}</div>

    <div class="tax-wrap">
      <table class="tax">
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
            <td>${escapeHtml(hsn || "—")}</td>
            <td>${taxRate}%</td>
            <td class="r">${escapeHtml(money(taxable))}</td>
            <td class="r">${escapeHtml(money(cgst))}</td>
            <td class="r">${escapeHtml(money(sgst))}</td>
            <td class="r">${escapeHtml(money(taxTotal))}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="decl">
      <b>Declaration :</b> We declare that this invoice shows the actual price of the goods Described and that all particulars are true and correct.
    </div>

    <div class="bank">
      BANK DETAILS : ${escapeHtml(SELLER.bank)} &nbsp;|&nbsp; A/C NO: ${escapeHtml(SELLER.accountNo)} &nbsp;|&nbsp; IFSC: ${escapeHtml(SELLER.ifsc)}
    </div>

    <div class="foot">
      <div>
        <div class="terms-title">Terms &amp; Conditions :</div>
        <ol>
          <li>E.&amp; O.E.</li>
          <li>Goods once sold will not be taken back.</li>
          <li>Interest @ 18% p.a. will be charged if the payment is not made within the stipulated time.</li>
          <li>Subject to 'NAGPUR' Jurisdiction only.</li>
        </ol>
      </div>
      <div>
        <div class="sign-label">Receiver's Signature :</div>
      </div>
      <div>
        <div class="sign-for">For ${escapeHtml(SELLER.name)}</div>
      </div>
    </div>
  </div>
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
