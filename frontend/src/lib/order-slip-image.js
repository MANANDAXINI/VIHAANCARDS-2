import { fetchArtworkBlob } from "@/lib/artwork-save";

const MAROON = "#8B1A1A";
const ORDER_BOX_FILL = "#ececec";
const EXPORT_SCALE = 2;

const FONTS = {
  mainTitle: '700 36px "Times New Roman", Times, Georgia, serif',
  jobOrder: "700 30px Arial, Helvetica, sans-serif",
  section: "700 19px Arial, Helvetica, sans-serif",
  label: "700 15px Arial, Helvetica, sans-serif",
  orderNoValue: "700 38px Arial, Helvetica, sans-serif",
  customerValue: "700 26px Arial, Helvetica, sans-serif",
  sideLabel: "700 15px Arial, Helvetica, sans-serif",
  footer: "700 22px Arial, Helvetica, sans-serif",
};

function upper(value) {
  return String(value || "—").trim().toUpperCase() || "—";
}

function buildProductLine(order) {
  const product = String(order.product || "LEAFLET / PAMPLET").trim();
  const paperGsm = String(order.paperGsm || "").trim();
  const size = String(order.size || "").trim();
  const side = String(order.printingSide || "").trim();
  const qty = Number(order.quantity || 0);

  const parts = [];
  if (paperGsm && paperGsm.toUpperCase() !== product.toUpperCase()) {
    parts.push(paperGsm);
  }
  if (size) parts.push(size);
  if (side) parts.push(side);
  if (qty > 0) parts.push(`QTY: ${qty.toLocaleString("en-IN")}`);

  const specs = parts.join(", ");
  return specs ? `${product} - ${specs}` : product;
}

async function loadArtworkImage(url) {
  if (!url) return null;
  try {
    const blob = await fetchArtworkBlob(url);
    const objectUrl = URL.createObjectURL(blob);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      };
      img.src = objectUrl;
    });
  } catch {
    return null;
  }
}

function fitFont(ctx, text, font, maxWidth) {
  const match = font.match(/(\d+(?:\.\d+)?)px/);
  if (!match) return font;
  let size = parseFloat(match[1]);
  const minSize = 8;
  let current = font;
  ctx.font = current;
  while (ctx.measureText(text).width > maxWidth && size > minSize) {
    size -= 1;
    current = font.replace(/\d+(?:\.\d+)?px/, `${size}px`);
    ctx.font = current;
  }
  return current;
}

function drawCenteredText(ctx, text, x, y, width, font, color = MAROON) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const padding = 12;
  ctx.font = fitFont(ctx, String(text), font, Math.max(10, width - padding));
  ctx.fillText(text, x + width / 2, y);
  ctx.restore();
}

function drawImageContain(ctx, img, x, y, width, height) {
  const scale = Math.min(width / img.width, height / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const drawX = x + (width - drawW) / 2;
  const drawY = y + (height - drawH) / 2;
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
}

function drawArtworkPlaceholder(ctx, x, y, width, height) {
  const colors = ["#b8d4e8", "#f5e6a8", "#f8c8dc", "#c8e6c9", "#ffe0b2", "#d1c4e9"];
  const cols = 2;
  const rows = 3;
  const cellW = width / cols;
  const cellH = height / rows;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      ctx.fillStyle = colors[(row * cols + col) % colors.length];
      ctx.fillRect(x + col * cellW + 2, y + row * cellH + 2, cellW - 4, cellH - 4);
    }
  }
}

function strokeRect(ctx, x, y, width, height, lineWidth = 1.5) {
  ctx.save();
  ctx.strokeStyle = MAROON;
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(x, y, width, height);
  ctx.restore();
}

function fillRoundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
  ctx.fill();
}

async function renderOrderSlipCanvas(order, overrides = {}) {
  if (typeof document === "undefined") return null;

  const [frontImg, backImg] = await Promise.all([
    loadArtworkImage(order.artworkUrl),
    loadArtworkImage(order.artworkBackUrl),
  ]);

  const width = 920;
  const height = 620;
  const margin = 16;
  const innerX = margin;
  const innerY = margin;
  const innerW = width - margin * 2;
  const innerH = height - margin * 2;

  const canvas = document.createElement("canvas");
  canvas.width = width * EXPORT_SCALE;
  canvas.height = height * EXPORT_SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.scale(EXPORT_SCALE, EXPORT_SCALE);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const titleH = 50;
  const jobOrderH = 38;
  const footerH = 44;
  const bodyH = innerH - titleH - jobOrderH - footerH;

  const leftW = Math.round(innerW * 0.38);
  const rightW = innerW - leftW;
  const leftX = innerX;
  const rightX = innerX + leftW;
  const bodyY = innerY + titleH + jobOrderH;

  strokeRect(ctx, innerX, innerY, innerW, innerH, 2);

  drawCenteredText(
    ctx,
    "PRODUCTION ORDER DETAILS",
    innerX,
    innerY + titleH / 2,
    innerW,
    FONTS.mainTitle
  );
  strokeRect(ctx, innerX, innerY + titleH, innerW, jobOrderH);
  drawCenteredText(
    ctx,
    "JOB ORDER",
    innerX,
    innerY + titleH + jobOrderH / 2,
    innerW,
    FONTS.jobOrder
  );

  strokeRect(ctx, leftX, bodyY, leftW, bodyH);
  strokeRect(ctx, rightX, bodyY, rightW, bodyH);

  const orderInfoH = 148;

  drawCenteredText(ctx, "ORDER INFORMATION", leftX, bodyY + 22, leftW, FONTS.section);
  strokeRect(ctx, leftX, bodyY + orderInfoH, leftW, 1, 1);

  const orderBoxW = leftW - 52;
  const orderBoxH = 70;
  const orderBoxX = leftX + (leftW - orderBoxW) / 2;
  const orderBoxY = bodyY + 40;
  ctx.fillStyle = ORDER_BOX_FILL;
  fillRoundRect(ctx, orderBoxX, orderBoxY, orderBoxW, orderBoxH, 10);
  strokeRect(ctx, orderBoxX, orderBoxY, orderBoxW, orderBoxH, 1.2);

  drawCenteredText(ctx, "ORDER NO.", orderBoxX, orderBoxY + 20, orderBoxW, FONTS.label);
  drawCenteredText(
    ctx,
    upper(overrides.orderNumber || order.orderNumber),
    orderBoxX,
    orderBoxY + 47,
    orderBoxW,
    FONTS.orderNoValue
  );

  const customerY = bodyY + orderInfoH;
  drawCenteredText(ctx, "CUSTOMER INFORMATION", leftX, customerY + 26, leftW, FONTS.section);
  drawCenteredText(ctx, "CUSTOMER NAME", leftX, customerY + 56, leftW, FONTS.label);

  const customerName = upper(order.business || order.customerName);
  const customerCity = upper(order.customerCity);
  const transportName = upper(
    overrides.transportDetails || order.transportDetails || ""
  );
  drawCenteredText(ctx, customerName, leftX, customerY + 86, leftW, FONTS.customerValue);

  let nextY = customerY + 114;
  if (customerCity && customerCity !== "—") {
    drawCenteredText(ctx, customerCity, leftX, nextY, leftW, FONTS.customerValue);
    nextY += 28;
  }

  drawCenteredText(ctx, "TRANSPORTATION DETAILS", leftX, nextY, leftW, FONTS.label);
  nextY += 28;
  drawCenteredText(
    ctx,
    transportName && transportName !== "—" ? transportName : "—",
    leftX,
    nextY,
    leftW,
    FONTS.customerValue
  );

  drawCenteredText(ctx, "JOB DETAILS", rightX, bodyY + 22, rightW, FONTS.section);

  const hasBack = Boolean(order.artworkBackUrl || order.artworkBackName);
  const previewTop = bodyY + 40;
  const previewH = bodyH - 48;
  const previewPad = 12;

  if (hasBack) {
    const halfW = (rightW - previewPad * 3) / 2;
    const frontX = rightX + previewPad;
    const backX = rightX + previewPad * 2 + halfW;

    drawCenteredText(ctx, "FRONT", frontX, previewTop, halfW, FONTS.sideLabel);
    drawCenteredText(ctx, "BACK", backX, previewTop, halfW, FONTS.sideLabel);

    const artY = previewTop + 16;
    const artH = previewH - 20;
    strokeRect(ctx, frontX, artY, halfW, artH, 1);
    strokeRect(ctx, backX, artY, halfW, artH, 1);

    if (frontImg) {
      drawImageContain(ctx, frontImg, frontX + 4, artY + 4, halfW - 8, artH - 8);
    } else {
      drawArtworkPlaceholder(ctx, frontX + 4, artY + 4, halfW - 8, artH - 8);
    }

    if (backImg) {
      drawImageContain(ctx, backImg, backX + 4, artY + 4, halfW - 8, artH - 8);
    } else {
      drawArtworkPlaceholder(ctx, backX + 4, artY + 4, halfW - 8, artH - 8);
    }
  } else {
    const artX = rightX + previewPad;
    const artW = rightW - previewPad * 2;
    drawCenteredText(ctx, "FRONT", artX, previewTop, artW, FONTS.sideLabel);
    const artY = previewTop + 16;
    const artH = previewH - 20;
    strokeRect(ctx, artX, artY, artW, artH, 1);
    if (frontImg) {
      drawImageContain(ctx, frontImg, artX + 4, artY + 4, artW - 8, artH - 8);
    } else {
      drawArtworkPlaceholder(ctx, artX + 4, artY + 4, artW - 8, artH - 8);
    }
  }

  const footerY = innerY + titleH + jobOrderH + bodyH;
  strokeRect(ctx, innerX, footerY, innerW, footerH, 2.5);
  drawCenteredText(
    ctx,
    upper(buildProductLine(order)),
    innerX,
    footerY + footerH / 2,
    innerW,
    FONTS.footer,
    "#000000"
  );

  return canvas;
}

function orderSlipFilename(order) {
  const parts = [
    order?.orderNumber || "ORDER",
    order?.paperGsm,
    order?.size,
    order?.quantity,
    String(order?.printingSide || "").toUpperCase(),
  ]
    .map((part) => String(part || "").trim().replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " "))
    .filter(Boolean);
  return `${parts.join("_")}.png`;
}

// Renders the order slip and returns it as a PNG blob (for saving into a folder).
export async function buildOrderSlipBlob(order, overrides = {}) {
  const canvas = await renderOrderSlipCanvas(order, overrides);
  if (!canvas) return null;
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  return { blob, filename: orderSlipFilename(order) };
}

export async function downloadOrderSlipImage(order, overrides = {}) {
  const canvas = await renderOrderSlipCanvas(order, overrides);
  if (!canvas) return;

  const link = document.createElement("a");
  link.download = orderSlipFilename(order);
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function downloadDispatchSlipAndNotify(order, overrides = {}) {
  await downloadOrderSlipImage(order, overrides);

  const { notifyCustomerDispatch } = await import("@/lib/dispatch-notify");
  return notifyCustomerDispatch(order, overrides);
}
