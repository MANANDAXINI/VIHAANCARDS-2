import { formatReceivableAmount, formatReceivableDate } from "@/lib/order-display";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMobileNo(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits || digits.startsWith("g")) return "—";
  return digits;
}

function todayLabel() {
  return new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Opens a print-ready Outstanding Balance Report in a new window and triggers
 * the browser print dialog (where the user can also "Save as PDF").
 */
export function printOutstandingReport({ rows = [], asOn, total = 0 }) {
  const grandTotal = Number.isFinite(Number(total))
    ? Number(total)
    : rows.reduce((sum, row) => sum + Number(row.balance || 0), 0);

  const asOnLabel = asOn ? formatReceivableDate(asOn) : todayLabel();

  const bodyRows = rows.length
    ? rows
        .map(
          (row, index) => `
      <tr>
        <td class="c">${index + 1}</td>
        <td>${escapeHtml(row.account)}</td>
        <td>${escapeHtml(formatMobileNo(row.mobile))}</td>
        <td class="r">${escapeHtml(formatReceivableAmount(row.balance))}</td>
      </tr>`
        )
        .join("")
    : `<tr><td colspan="4" class="empty">No accounts found.</td></tr>`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Outstanding Balance Report - ${escapeHtml(asOnLabel)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 24px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #b91c1c; padding-bottom: 12px; margin-bottom: 16px; }
  .title { font-size: 20px; font-weight: 800; }
  .muted { color: #64748b; font-size: 12px; margin-top: 2px; }
  .meta { text-align: right; font-size: 12px; color: #64748b; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f8fafc; text-transform: uppercase; font-size: 10px; letter-spacing: .04em; color: #475569; }
  td.r, th.r { text-align: right; white-space: nowrap; }
  td.c, th.c { text-align: center; }
  td.empty { text-align: center; color: #64748b; padding: 18px; }
  tfoot td { border-top: 2px solid #cbd5e1; background: #f8fafc; font-weight: 800; }
  .foot { margin-top: 20px; font-size: 11px; color: #94a3b8; text-align: center; }
  @media print { body { margin: 0; } @page { margin: 14mm; } }
</style>
</head>
<body>
  <div class="head">
    <div>
      <div class="title">Outstanding Balance Report</div>
      <div class="muted">Amount Receivable · ${escapeHtml(String(rows.length))} account${rows.length === 1 ? "" : "s"}</div>
    </div>
    <div class="meta">
      <div><strong>As On: ${escapeHtml(asOnLabel)}</strong></div>
      <div>Generated: ${escapeHtml(todayLabel())}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="c">Sr No.</th>
        <th>Account</th>
        <th>Mobile No.</th>
        <th class="r">Balance</th>
      </tr>
    </thead>
    <tbody>${bodyRows}</tbody>
    <tfoot>
      <tr>
        <td colspan="3">Total Outstanding</td>
        <td class="r">${escapeHtml(formatReceivableAmount(grandTotal))}</td>
      </tr>
    </tfoot>
  </table>

  <div class="foot">This is a computer-generated report.</div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) {
    throw new Error("Popup blocked. Please allow popups to print the report.");
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();

  const triggerPrint = () => win.print();
  if (win.document.readyState === "complete") {
    setTimeout(triggerPrint, 300);
  } else {
    win.onload = () => setTimeout(triggerPrint, 300);
  }
}
