import { formatRupees } from "@/lib/api";
import { formatLedgerTableDate, formatOrderDescription } from "@/lib/order-display";

function wrapText(ctx, text, maxWidth) {
  const words = String(text || "—").split(/\s+/).filter(Boolean);
  if (!words.length) return ["—"];

  const lines = [];
  let line = "";

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }

  if (line) lines.push(line);
  return lines;
}

function buildSlipRows(order, overrides = {}) {
  const lrNumber = overrides.lrNumber ?? order.lrNumber;
  const transportDetails = overrides.transportDetails ?? order.transportDetails;
  const dispatchDate = overrides.dispatchDate ?? order.dispatchDate;

  return [
    ["Order No.", order.orderNumber || "—"],
    ["Order Date", formatLedgerTableDate(order.createdAt)],
    ["Customer", order.business || order.customerName || "—"],
    ["Phone", order.customerPhone?.startsWith("g-") ? "—" : order.customerPhone || "—"],
    ["City", order.customerCity || "—"],
    ["Product", order.product || "LEAFLET / PAMPLET"],
    ["Specs", formatOrderDescription(order)],
    ["Quantity", order.quantity || "—"],
    ["Amount", formatRupees(order.amount)],
    ["LR No.", lrNumber || "—"],
    ["Transport", transportDetails || "—"],
    ["Dispatch Date", formatLedgerTableDate(dispatchDate)],
  ];
}

export function downloadOrderSlipImage(order, overrides = {}) {
  if (typeof document === "undefined") return;

  const width = 820;
  const padding = 36;
  const labelWidth = 170;
  const valueWidth = width - padding * 2 - labelWidth - 16;
  const lineHeight = 30;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.font = "15px Arial, sans-serif";

  const rows = buildSlipRows(order, overrides);
  const wrappedRows = rows.map(([label, value]) => ({
    label,
    lines: wrapText(ctx, value, valueWidth),
  }));

  const bodyHeight = wrappedRows.reduce((sum, row) => sum + row.lines.length * lineHeight, 0);
  const height = padding * 2 + 88 + bodyHeight + 24;
  canvas.width = width;
  canvas.height = height;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, width, 72);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px Arial, sans-serif";
  ctx.fillText("PIXEL DIGITAL", padding, 46);

  ctx.fillStyle = "#dc2626";
  ctx.font = "bold 18px Arial, sans-serif";
  ctx.fillText("ORDER DISPATCH SLIP", padding, 108);

  let y = 140;
  ctx.font = "15px Arial, sans-serif";

  for (const row of wrappedRows) {
    ctx.fillStyle = "#64748b";
    ctx.font = "bold 15px Arial, sans-serif";
    ctx.fillText(row.label, padding, y);

    ctx.fillStyle = "#0f172a";
    ctx.font = "15px Arial, sans-serif";
    for (const line of row.lines) {
      ctx.fillText(line, padding + labelWidth, y);
      y += lineHeight;
    }
  }

  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 2;
  ctx.strokeRect(12, 12, width - 24, height - 24);

  const filename = `${order.orderNumber || "order"}_dispatch_slip.png`;
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function downloadDispatchSlipAndNotify(order, overrides = {}) {
  downloadOrderSlipImage(order, overrides);

  const { notifyCustomerDispatch } = await import("@/lib/dispatch-notify");
  return notifyCustomerDispatch(order, overrides);
}
