import { uploadAssetUrl } from "@/lib/api";

const INVALID_CHARS = /[\\/:*?"<>|]/g;

function sanitizePart(value, maxLen = 96) {
  return String(value || "")
    .trim()
    .replace(INVALID_CHARS, "_")
    .replace(/\s+/g, " ")
    .slice(0, maxLen);
}

export function sanitizeBusinessFolderName(businessName) {
  return sanitizePart(businessName, 120) || "Customer";
}

function fileExtension(originalName, mime) {
  const fromName = String(originalName || "").match(/(\.[a-z0-9]+)$/i)?.[1];
  if (fromName) return fromName.toLowerCase();
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "image/gif") return ".gif";
  if (mime === "image/webp") return ".webp";
  if (mime === "application/pdf") return ".pdf";
  return ".file";
}

export function buildArtworkSaveFilename(order, side, originalName, mime) {
  const parts = [
    order?.orderNumber || "ORDER",
    order?.business || order?.customerName || "Customer",
  ];

  const lr = String(order?.lrNumber || "").trim();
  if (lr) parts.push(lr);

  parts.push(
    order?.paperGsm,
    order?.size,
    order?.quantity,
    String(order?.printingSide || "").toUpperCase(),
  );

  if (side === "back") parts.push("BACK");

  const baseName = String(originalName || "artwork").replace(/\.[^.]+$/, "");
  parts.push(baseName);

  const ext = fileExtension(originalName, mime);
  const filename = parts
    .map((part) => sanitizePart(part))
    .filter(Boolean)
    .join("_");

  return `${filename}${ext}`;
}

export async function fetchArtworkBlob(url) {
  const fullUrl = uploadAssetUrl(url);
  if (!fullUrl) throw new Error("Artwork file URL missing.");

  const token = typeof window !== "undefined" ? localStorage.getItem("pd_token") : null;
  const response = await fetch(fullUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error("Could not load artwork file.");
  }

  return response.blob();
}

function triggerBrowserDownload(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function saveArtworkToBusinessFolder({ order, side, url, originalName, mime }) {
  const blob = await fetchArtworkBlob(url);
  const businessFolder = sanitizeBusinessFolderName(order?.business || order?.customerName);
  const filename = buildArtworkSaveFilename(order, side, originalName, mime);

  if (typeof window !== "undefined" && typeof window.showDirectoryPicker === "function") {
    const rootDir = await window.showDirectoryPicker({ mode: "readwrite" });
    const businessDir = await rootDir.getDirectoryHandle(businessFolder, { create: true });
    const fileHandle = await businessDir.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();

    return {
      method: "folder",
      businessFolder,
      filename,
      displayPath: `${businessFolder}\\${filename}`,
    };
  }

  triggerBrowserDownload(blob, `${businessFolder}_${filename}`);
  return {
    method: "download",
    businessFolder,
    filename,
    displayPath: filename,
  };
}
