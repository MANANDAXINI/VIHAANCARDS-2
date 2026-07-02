import { formatOrderDescription } from "@/lib/order-display";
import { fetchArtworkBlob } from "@/lib/artwork-save";

const MAROON = "#8B1A1A";
const BORDER = "#1f2937";
const ORDER_BOX_FILL = "#f3f4f6";
const EXPORT_SCALE = 2;
const FONT_LINK_ID = "pd-job-order-fonts";

const FONTS = {
  mainTitle: '700 27px Oswald, "Segoe UI", Arial, sans-serif',
  jobOrder: '700 23px Oswald, "Segoe UI", Arial, sans-serif',
  section: '600 14px Oswald, "Segoe UI", Arial, sans-serif',
  label: '600 12px "Open Sans", "Segoe UI", Arial, sans-serif',
  orderNoValue: '700 30px Oswald, "Segoe UI", Arial, sans-serif',
  customerValue: '700 20px "Open Sans", "Segoe UI", Arial, sans-serif',
  sideLabel: '600 12px Oswald, "Segoe UI", Arial, sans-serif',
  footer: '700 16px "Open Sans", "Segoe UI", Arial, sans-serif',
};

function upper(value) {
  return String(value || "—").trim().toUpperCase() || "—";
}

function buildProductLine(order) {
  const product = order.product || "LEAFLET / PAMPLET";
  const specs = formatOrderDescription(order);
  return `${product} - ${specs}`;
}

async function ensureJobOrderFonts() {
  if (typeof document === "undefined") return;

  if (!document.getElementById(FONT_LINK_ID)) {
    const link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Open+Sans:wght@600;700&display=swap";
    document.head.appendChild(link);
  }

  await Promise.all([
    document.fonts.load('700 27px Oswald'),
    document.fonts.load('700 23px Oswald'),
    document.fonts.load('600 14px Oswald'),
    document.fonts.load('600 12px Oswald'),
    document.fonts.load('700 30px Oswald'),
    document.fonts.load('600 12px "Open Sans"'),
    document.fonts.load('700 20px "Open Sans"'),
    document.fonts.load('700 16px "Open Sans"'),
  ]).catch(() => {});
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

function drawCenteredText(ctx, text, x, y, width, font, color = MAROON, letterSpacing = 0) {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (letterSpacing > 0 && "letterSpacing" in ctx) {
    ctx.letterSpacing = `${letterSpacing}px`;
  }
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

  await ensureJobOrderFonts();

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
  if (!ctx) return;

  ctx.scale(EXPORT_SCALE, EXPORT_SCALE);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.textRendering = "optimizeLegibility";

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const titleH = 46;
  const jobOrderH = 42;
  const footerH = 48;
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
    FONTS.mainTitle,
    MAROON,
    1.2
  );
  strokeRect(ctx, innerX, innerY + titleH, innerW, jobOrderH);
  drawCenteredText(
    ctx,
    "JOB ORDER",
    innerX,
    innerY + titleH + jobOrderH / 2,
    innerW,
    FONTS.jobOrder,
    MAROON,
    0.8
  );

  strokeRect(ctx, leftX, bodyY, leftW, bodyH);
  strokeRect(ctx, rightX, bodyY, rightW, bodyH);

  const orderInfoH = 152;

  drawCenteredText(ctx, "ORDER INFORMATION", leftX, bodyY + 24, leftW, FONTS.section, MAROON, 0.6);
  strokeRect(ctx, leftX, bodyY + orderInfoH, leftW, 1, 1);

  const orderBoxW = leftW - 48;
  const orderBoxH = 62;
  const orderBoxX = leftX + (leftW - orderBoxW) / 2;
  const orderBoxY = bodyY + 42;
  ctx.fillStyle = ORDER_BOX_FILL;
  ctx.fillRect(orderBoxX, orderBoxY, orderBoxW, orderBoxH);
  strokeRect(ctx, orderBoxX, orderBoxY, orderBoxW, orderBoxH, 1.2);

  drawCenteredText(ctx, "ORDER NO.", orderBoxX, orderBoxY + 19, orderBoxW, FONTS.label, MAROON, 0.5);
  drawCenteredText(
    ctx,
    upper(overrides.orderNumber || order.orderNumber),
    orderBoxX,
    orderBoxY + 42,
    orderBoxW,
    FONTS.orderNoValue,
    MAROON,
    0.4
  );

  const customerY = bodyY + orderInfoH;
  drawCenteredText(ctx, "CUSTOMER INFORMATION", leftX, customerY + 24, leftW, FONTS.section, MAROON, 0.6);
  drawCenteredText(ctx, "CUSTOMER NAME", leftX, customerY + 54, leftW, FONTS.label, MAROON, 0.5);

  const customerName = upper(order.business || order.customerName);
  const customerCity = upper(order.customerCity);
  drawCenteredText(ctx, customerName, leftX, customerY + 86, leftW, FONTS.customerValue);
  if (customerCity && customerCity !== "—") {
    drawCenteredText(ctx, customerCity, leftX, customerY + 116, leftW, FONTS.customerValue);
  }

  drawCenteredText(ctx, "JOB DETAILS", rightX, bodyY + 24, rightW, FONTS.section, MAROON, 0.6);

  const hasBack = Boolean(order.artworkBackUrl || order.artworkBackName);
  const previewTop = bodyY + 44;
  const previewH = bodyH - 54;
  const previewPad = 14;

  if (hasBack) {
    const halfW = (rightW - previewPad * 3) / 2;
    const frontX = rightX + previewPad;
    const backX = rightX + previewPad * 2 + halfW;

    drawCenteredText(ctx, "FRONT", frontX, previewTop, halfW, FONTS.sideLabel, MAROON, 0.5);
    drawCenteredText(ctx, "BACK", backX, previewTop, halfW, FONTS.sideLabel, MAROON, 0.5);

    const artY = previewTop + 20;
    const artH = previewH - 26;
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
    drawCenteredText(ctx, "FRONT", artX, previewTop, artW, FONTS.sideLabel, MAROON, 0.5);
    const artY = previewTop + 20;
    const artH = previewH - 26;
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
    FONTS.footer,
    "#111827",
    0.3
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
