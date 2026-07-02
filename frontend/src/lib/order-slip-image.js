import { formatOrderDescription } from "@/lib/order-display";
import { fetchArtworkBlob } from "@/lib/artwork-save";

const MAROON = "#8B1A1A";
const BORDER = "#1f2937";
const ORDER_BOX_FILL = "#f3f4f6";

function upper(value) {
  return String(value || "—").trim().toUpperCase() || "—";
}

function buildProductLine(order) {
  const product = order.product || "LEAFLET / PAMPLET";
  const specs = formatOrderDescription(order);
  return `${product} - ${specs}`;
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

function drawCenteredText(ctx, text, x, y, width, font, color = MAROON) {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
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
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(x, y, width, height);
  ctx.restore();
}

export async function downloadOrderSlipImage(order, overrides = {}) {
  if (typeof document === "undefined") return;

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
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const titleH = 44;
  const jobOrderH = 40;
  const footerH = 46;
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
    "bold 22px Arial, sans-serif"
  );
  strokeRect(ctx, innerX, innerY + titleH, innerW, jobOrderH);
  drawCenteredText(
    ctx,
    "JOB ORDER",
    innerX,
    innerY + titleH + jobOrderH / 2,
    innerW,
    "bold 20px Arial, sans-serif"
  );

  strokeRect(ctx, leftX, bodyY, leftW, bodyH);
  strokeRect(ctx, rightX, bodyY, rightW, bodyH);

  const orderInfoH = 150;
  const customerInfoH = bodyH - orderInfoH;

  drawCenteredText(ctx, "ORDER INFORMATION", leftX, bodyY + 22, leftW, "bold 13px Arial, sans-serif");
  strokeRect(ctx, leftX, bodyY + orderInfoH, leftW, 1, 1);

  const orderBoxW = leftW - 48;
  const orderBoxH = 58;
  const orderBoxX = leftX + (leftW - orderBoxW) / 2;
  const orderBoxY = bodyY + 40;
  ctx.fillStyle = ORDER_BOX_FILL;
  ctx.fillRect(orderBoxX, orderBoxY, orderBoxW, orderBoxH);
  strokeRect(ctx, orderBoxX, orderBoxY, orderBoxW, orderBoxH, 1.2);

  drawCenteredText(ctx, "ORDER NO.", orderBoxX, orderBoxY + 18, orderBoxW, "bold 12px Arial, sans-serif");
  drawCenteredText(
    ctx,
    upper(overrides.orderNumber || order.orderNumber),
    orderBoxX,
    orderBoxY + 40,
    orderBoxW,
    "bold 22px Arial, sans-serif"
  );

  const customerY = bodyY + orderInfoH;
  drawCenteredText(ctx, "CUSTOMER INFORMATION", leftX, customerY + 22, leftW, "bold 13px Arial, sans-serif");
  drawCenteredText(ctx, "CUSTOMER NAME", leftX, customerY + 52, leftW, "bold 12px Arial, sans-serif");

  const customerName = upper(order.business || order.customerName);
  const customerCity = upper(order.customerCity);
  drawCenteredText(ctx, customerName, leftX, customerY + 82, leftW, "bold 18px Arial, sans-serif");
  if (customerCity && customerCity !== "—") {
    drawCenteredText(ctx, customerCity, leftX, customerY + 112, leftW, "bold 18px Arial, sans-serif");
  }

  drawCenteredText(ctx, "JOB DETAILS", rightX, bodyY + 22, rightW, "bold 13px Arial, sans-serif");

  const hasBack = Boolean(order.artworkBackUrl || order.artworkBackName);
  const previewTop = bodyY + 42;
  const previewH = bodyH - 52;
  const previewPad = 14;

  if (hasBack) {
    const halfW = (rightW - previewPad * 3) / 2;
    const frontX = rightX + previewPad;
    const backX = rightX + previewPad * 2 + halfW;

    drawCenteredText(ctx, "FRONT", frontX, previewTop, halfW, "bold 12px Arial, sans-serif");
    drawCenteredText(ctx, "BACK", backX, previewTop, halfW, "bold 12px Arial, sans-serif");

    const artY = previewTop + 18;
    const artH = previewH - 24;
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
    drawCenteredText(ctx, "FRONT", artX, previewTop, artW, "bold 12px Arial, sans-serif");
    const artY = previewTop + 18;
    const artH = previewH - 24;
    strokeRect(ctx, artX, artY, artW, artH, 1);
    if (frontImg) {
      drawImageContain(ctx, frontImg, artX + 4, artY + 4, artW - 8, artH - 8);
    } else {
      drawArtworkPlaceholder(ctx, artX + 4, artY + 4, artW - 8, artH - 8);
    }
  }

  const footerY = innerY + titleH + jobOrderH + bodyH;
  strokeRect(ctx, innerX, footerY, innerW, footerH, 1.5);
  drawCenteredText(
    ctx,
    upper(buildProductLine(order)),
    innerX,
    footerY + footerH / 2,
    innerW,
    "bold 15px Arial, sans-serif",
    "#111827"
  );

  const filename = `${order.orderNumber || "order"}_job_order.png`;
  const link = document.createElement("a");
  link.download = filename;
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
