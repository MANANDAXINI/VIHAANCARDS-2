import {
  formatLedgerBalance,
  formatLedgerCredit,
  formatLedgerDebit,
  formatLedgerNarration,
  formatLedgerTableDate,
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
 * Opens a print-ready ledger statement in a new window and triggers the browser
 * print dialog, where the user can "Save as PDF". No external dependency needed.
 */
export function downloadLedgerPdf({ account, ledgerEntries = [] }) {
  const business = account?.business || account?.name || "Customer";
  const contact = [account?.address, account?.phone].filter(Boolean).join(" · ");
  const fileTitle = `Ledger - ${business} - ${todayLabel()}`;

  const rows = ledgerEntries.length
    ? ledgerEntries
        .map(
          (entry, index) => `
      <tr class="${entry.pending ? "pending" : ""}">
        <td class="c">${index + 1}</td>
        <td>${escapeHtml(formatLedgerTableDate(entry.entryDate))}</td>
        <td>${escapeHtml(formatLedgerNarration(entry.label))}</td>
        <td class="r">${escapeHtml(formatLedgerDebit(entry))}</td>
        <td class="r">${escapeHtml(formatLedgerCredit(entry))}</td>
        <td class="r">${escapeHtml(formatLedgerBalance(entry))}</td>
      </tr>`
        )
        .join("")
    : `<tr><td colspan="6" class="empty">No ledger entries yet.</td></tr>`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(fileTitle)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 24px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #b91c1c; padding-bottom: 12px; margin-bottom: 16px; }
  .brand { font-size: 20px; font-weight: 800; }
  .biz { font-size: 18px; font-weight: 700; margin-top: 2px; }
  .muted { color: #64748b; font-size: 12px; }
  .meta { text-align: right; font-size: 12px; color: #64748b; }
  h2 { font-size: 14px; margin: 18px 0 8px; text-transform: uppercase; letter-spacing: .04em; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f8fafc; text-transform: uppercase; font-size: 10px; letter-spacing: .04em; color: #475569; }
  td.r { text-align: right; white-space: nowrap; }
  td.c { text-align: center; }
  tr.pending td { background: #fffbeb; }
  td.empty { text-align: center; color: #64748b; padding: 18px; }
  .foot { margin-top: 20px; font-size: 11px; color: #94a3b8; text-align: center; }
  @media print { body { margin: 0; } @page { margin: 14mm; } }
</style>
</head>
<body>
  <div class="head">
    <div>
      <div class="biz">${escapeHtml(business)}</div>
      ${contact ? `<div class="muted">${escapeHtml(contact)}</div>` : ""}
    </div>
    <div class="meta">
      <div><strong>Ledger</strong></div>
      <div>Generated: ${escapeHtml(todayLabel())}</div>
    </div>
  </div>

  <h2>Ledger</h2>
  <table>
    <thead>
      <tr>
        <th>Sr No.</th>
        <th>Date</th>
        <th>Narration</th>
        <th>Job / Outstanding Amount</th>
        <th>Payment Received</th>
        <th>Outstanding Balance</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="foot">This is a computer-generated statement.</div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) {
    throw new Error("Popup blocked. Please allow popups to download the ledger PDF.");
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
